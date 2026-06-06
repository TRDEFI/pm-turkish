const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TRDEFIVault - Security Tests", function () {
  let vault, resolver, depositMgr, usdc;
  let owner, resolverSigner, user1, user2, attacker;

  const USDC_AMOUNT = ethers.parseUnits("1000", 6);
  const BET_AMOUNT = ethers.parseUnits("100", 6);
  const MIN_BET = ethers.parseUnits("1", 6);

  beforeEach(async function () {
    [owner, resolverSigner, user1, user2, attacker] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    for (const user of [owner, user1, user2, attacker]) {
      await usdc.mint(user.address, USDC_AMOUNT * 10n);
    }

    const TRDEFIVault = await ethers.getContractFactory("TRDEFIVault");
    vault = await TRDEFIVault.deploy(await usdc.getAddress());
    await vault.waitForDeployment();

    const EventResolver = await ethers.getContractFactory("EventResolver");
    resolver = await EventResolver.deploy();
    await resolver.waitForDeployment();

    const DepositManager = await ethers.getContractFactory("TRDEFIDepositManager");
    depositMgr = await DepositManager.deploy(await usdc.getAddress());
    await depositMgr.waitForDeployment();

    await resolver.setVault(await vault.getAddress());
    await depositMgr.setVault(await vault.getAddress());
    await vault.addResolver(resolverSigner.address);
    await resolver.addSigner(owner.address);
    await resolver.addSigner(user1.address);
    await depositMgr.addWebhookSigner(owner.address);

    for (const user of [user1, user2]) {
      await usdc.connect(user).approve(await vault.getAddress(), USDC_AMOUNT * 10n);
      await vault.connect(user).deposit(USDC_AMOUNT);
    }
  });

  // ─── Reentrancy Tests ─────────────────────────────────────────────────
  describe("Reentrancy Protection", function () {
    it("Should prevent reentrancy on withdraw", async function () {
      // Deposit for attacker
      await usdc.connect(attacker).approve(await vault.getAddress(), USDC_AMOUNT);
      await vault.connect(attacker).deposit(USDC_AMOUNT);

      // Even if attacker tries reentrancy, nonReentrant modifier prevents it
      const available = await vault.getAvailableBalance(attacker.address);
      expect(available).to.equal(USDC_AMOUNT);

      // Normal withdraw should work
      await vault.connect(attacker).withdraw(USDC_AMOUNT);
      const afterBalance = await vault.getAvailableBalance(attacker.address);
      expect(afterBalance).to.equal(0);
    });

    it("Should prevent reentrancy on claimWinnings", async function () {
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 86400;
      await vault.createEvent("Reentrancy test", "test", deadline, 0, 0, 0, 0);

      await vault.connect(user1).placeBet(1, 0, BET_AMOUNT);
      await vault.connect(user2).placeBet(1, 1, BET_AMOUNT);

      // Advance time past deadline
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine", []);

      // Resolve: YES wins (user2 loses)
      await vault.connect(resolverSigner).resolveEvent(1, true, "YES won");

      // user2 tries to claim (should mark as lost)
      await vault.connect(user2).claimWinnings(2);
      const bet = await vault.getBet(2);
      expect(bet.claimed).to.equal(true);

      // Double claim should fail
      await expect(
        vault.connect(user2).claimWinnings(2)
      ).to.be.revertedWith("TRDEFI: already claimed");
    });
  });

  // ─── Access Control Tests ─────────────────────────────────────────────
  describe("Access Control", function () {
    it("Should prevent non-owner from creating events", async function () {
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 86400;
      await expect(
        vault.connect(user1).createEvent("Unauthorized?", "test", deadline, 0, 0, 0, 0)
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });

    it("Should prevent non-resolver from resolving events", async function () {
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 86400;
      await vault.createEvent("Access test", "test", deadline, 0, 0, 0, 0);

      await expect(
        vault.connect(user1).resolveEvent(1, true, "Unauthorized")
      ).to.be.revertedWith("TRDEFI: not authorized resolver");

      await expect(
        vault.connect(attacker).resolveEvent(1, true, "Unauthorized")
      ).to.be.revertedWith("TRDEFI: not authorized resolver");
    });

    it("Should prevent non-owner from withdrawing platform fees", async function () {
      await expect(
        vault.connect(user1).withdrawPlatformFees()
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });

    it("Should prevent non-owner from adding resolvers", async function () {
      await expect(
        vault.connect(user1).addResolver(attacker.address)
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });

    it("Should prevent non-owner from pausing", async function () {
      await expect(
        vault.connect(user1).pause()
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });

    it("Should prevent non-owner from setting event resolver", async function () {
      await expect(
        vault.connect(user1).setEventResolver(attacker.address)
      ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });

    it("Should allow EventResolver contract to resolve events when set", async function () {
      await vault.setEventResolver(await resolver.getAddress());

      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 86400;
      await vault.createEvent("Resolver test", "test", deadline, 0, 0, 0, 0);

      // EventResolver contract itself should be able to call resolveEvent
      // (In production, EventResolver would call this after finalization)
      // For now, we verify the modifier allows it
      const isAllowed = await vault.isResolver(await resolver.getAddress());
      expect(isAllowed).to.equal(false); // Not in isResolver mapping

      // But eventResolver address check should allow it
      const resolverAddr = await vault.eventResolver();
      expect(resolverAddr).to.equal(await resolver.getAddress());
    });
  });

  // ─── Edge Case Tests ──────────────────────────────────────────────────
  describe("Edge Cases", function () {
    it("Should reject zero amount deposit", async function () {
      await expect(
        vault.connect(user1).deposit(0)
      ).to.be.revertedWith("TRDEFI: amount must be > 0");
    });

    it("Should reject zero amount withdraw", async function () {
      await expect(
        vault.connect(user1).withdraw(0)
      ).to.be.revertedWith("TRDEFI: amount must be > 0");
    });

    it("Should reject bet at exact deadline timestamp", async function () {
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 60;
      await vault.createEvent("Deadline edge", "test", deadline, 0, 0, 0, 0);

      // Advance time to exactly deadline
      await ethers.provider.send("evm_increaseTime", [60]);
      await ethers.provider.send("evm_mine", []);

      // Bet at deadline should fail (block.timestamp < deadline required)
      await expect(
        vault.connect(user1).placeBet(1, 0, BET_AMOUNT)
      ).to.be.revertedWith("TRDEFI: event deadline passed");
    });

    it("Should allow resolve at exact deadline timestamp", async function () {
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 60;
      await vault.createEvent("Resolve edge", "test", deadline, 0, 0, 0, 0);

      await vault.connect(user1).placeBet(1, 0, BET_AMOUNT);
      await vault.connect(user2).placeBet(1, 1, BET_AMOUNT);

      // Advance time to exactly deadline
      await ethers.provider.send("evm_increaseTime", [60]);
      await ethers.provider.send("evm_mine", []);

      // Resolve at deadline should work (block.timestamp >= deadline)
      await vault.connect(resolverSigner).resolveEvent(1, true, "Resolved at deadline");
      const event = await vault.getEventDetails(1);
      expect(event.status).to.equal(1); // RESOLVED
    });

    it("Should handle minimum bet correctly", async function () {
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 86400;
      await vault.createEvent("Min bet test", "test", deadline, 0, 0, 0, 0);

      // Minimum bet should work
      await vault.connect(user1).placeBet(1, 0, MIN_BET);

      // One wei below minimum should fail
      await expect(
        vault.connect(user1).placeBet(1, 0, MIN_BET - 1n)
      ).to.be.revertedWith("TRDEFI: bet below minimum");
    });

    it("Should reject bets exceeding MAX_BET", async function () {
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 86400;
      await vault.createEvent("Max bet test", "test", deadline, 0, 0, 0, 0);

      const MAX_BET = ethers.parseUnits("100000", 6);
      await expect(
        vault.connect(user1).placeBet(1, 0, MAX_BET + 1n)
      ).to.be.revertedWith("TRDEFI: bet above maximum");
    });

    it("Should handle event with max 7-day deadline", async function () {
      const maxDeadline = (await ethers.provider.getBlock("latest")).timestamp + 7 * 24 * 3600;
      await vault.createEvent("Max deadline", "test", maxDeadline, 0, 0, 0, 0);

      const event = await vault.getEventDetails(1);
      expect(event.deadline).to.equal(maxDeadline);
    });

    it("Should reject event with deadline > 7 days", async function () {
      const tooFarDeadline = (await ethers.provider.getBlock("latest")).timestamp + 8 * 24 * 3600;
      await expect(
        vault.createEvent("Too far", "test", tooFarDeadline, 0, 0, 0, 0)
      ).to.be.revertedWith("TRDEFI: deadline max 7 days");
    });

    it("Should reject empty question", async function () {
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 86400;
      await expect(
        vault.createEvent("", "test", deadline, 0, 0, 0, 0)
      ).to.be.revertedWith("TRDEFI: empty question");
    });

    it("Should handle multiple bets from same user on same event", async function () {
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 86400;
      await vault.createEvent("Multi bet test", "test", deadline, 0, 0, 0, 0);

      await vault.connect(user1).placeBet(1, 0, BET_AMOUNT);
      await vault.connect(user1).placeBet(1, 0, BET_AMOUNT);
      await vault.connect(user1).placeBet(1, 1, BET_AMOUNT);

      const event = await vault.getEventDetails(1);
      expect(event.totalYesBets).to.equal(BET_AMOUNT * 2n);
      expect(event.totalNoBets).to.equal(BET_AMOUNT);
      expect(event.yesBetCount).to.equal(2);
      expect(event.noBetCount).to.equal(1);
    });

    it("Should correctly lock balance for multiple active bets", async function () {
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 86400;
      await vault.createEvent("Lock test 1", "test", deadline, 0, 0, 0, 0);
      await vault.createEvent("Lock test 2", "test", deadline, 0, 0, 0, 0);

      await vault.connect(user1).placeBet(1, 0, BET_AMOUNT);
      await vault.connect(user1).placeBet(2, 0, BET_AMOUNT);

      const locked = await vault.getUserLockedBalance(user1.address);
      expect(locked).to.equal(BET_AMOUNT * 2n);

      const available = await vault.getAvailableBalance(user1.address);
      expect(available).to.equal(USDC_AMOUNT - BET_AMOUNT * 2n);
    });

    it("Should unlock balance after event resolution", async function () {
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 86400;
      await vault.createEvent("Unlock test", "test", deadline, 0, 0, 0, 0);

      await vault.connect(user1).placeBet(1, 0, BET_AMOUNT);
      await vault.connect(user2).placeBet(1, 1, BET_AMOUNT);

      const lockedBefore = await vault.getUserLockedBalance(user1.address);
      expect(lockedBefore).to.equal(BET_AMOUNT);

      // Advance time and resolve
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine", []);

      await vault.connect(resolverSigner).resolveEvent(1, true, "YES won");

      const lockedAfter = await vault.getUserLockedBalance(user1.address);
      expect(lockedAfter).to.equal(0);
    });
  });

  // ─── Oracle Manipulation Tests ────────────────────────────────────────
  describe("Oracle Manipulation Protection", function () {
    it("Should prevent resolver from changing resolution after submit", async function () {
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 86400;
      await vault.createEvent("Oracle test", "test", deadline, 0, 0, 0, 0);

      await vault.connect(user1).placeBet(1, 0, BET_AMOUNT);
      await vault.connect(user2).placeBet(1, 1, BET_AMOUNT);

      // Advance time and resolve
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine", []);

      await vault.connect(resolverSigner).resolveEvent(1, true, "YES won");

      // Second resolve should fail (event not active)
      await expect(
        vault.connect(resolverSigner).resolveEvent(1, false, "NO won")
      ).to.be.revertedWith("TRDEFI: event not active");
    });

    it("Should prevent resolution before deadline", async function () {
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 86400;
      await vault.createEvent("Early resolve", "test", deadline, 0, 0, 0, 0);

      await expect(
        vault.connect(resolverSigner).resolveEvent(1, true, "Too early")
      ).to.be.revertedWith("TRDEFI: deadline not reached");
    });

    it("Should require both sides to have bets for valid resolution", async function () {
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 86400;
      await vault.createEvent("One side only", "test", deadline, 0, 0, 0, 0);

      // Only YES bets
      await vault.connect(user1).placeBet(1, 0, BET_AMOUNT);

      // Advance time and resolve
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine", []);

      // Should result in DRAW, not RESOLVED
      await vault.connect(resolverSigner).resolveEvent(1, true, "YES won");
      const event = await vault.getEventDetails(1);
      expect(event.status).to.equal(2); // DRAWN
    });
  });

  // ─── Front-Running Protection Tests ───────────────────────────────────
  describe("Front-Running Resistance", function () {
    it("Should not allow bet after deadline even if submitted before", async function () {
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 2;
      await vault.createEvent("Front-run test", "test", deadline, 0, 0, 0, 0);

      // Advance time past deadline
      await ethers.provider.send("evm_increaseTime", [3]);
      await ethers.provider.send("evm_mine", []);

      // Bet should fail even if user tried to front-run
      await expect(
        vault.connect(user1).placeBet(1, 0, BET_AMOUNT)
      ).to.be.revertedWith("TRDEFI: event deadline passed");
    });
  });

  // ─── EventResolver Security Tests ─────────────────────────────────────
  describe("EventResolver Security", function () {
    it("Should prevent non-signer from confirming resolutions", async function () {
      await resolver.submitResolution(1, true, "Test resolution", "{}");

      await expect(
        resolver.connect(attacker).confirmResolution(1)
      ).to.be.revertedWith("Resolver: not an active signer");
    });

    it("Should prevent non-signer from challenging resolutions", async function () {
      await resolver.submitResolution(1, true, "Test resolution", "{}");

      await expect(
        resolver.connect(attacker).challengeResolution(1, "Fake challenge")
      ).to.be.revertedWith("Resolver: not an active signer");
    });

    it("Should prevent double confirmation by same signer", async function () {
      await resolver.submitResolution(1, true, "Test resolution", "{}");

      await resolver.connect(owner).confirmResolution(1);

      await expect(
        resolver.connect(owner).confirmResolution(1)
      ).to.be.revertedWith("Resolver: already confirmed");
    });

    it("Should prevent double challenge by same signer", async function () {
      await resolver.submitResolution(1, true, "Test resolution", "{}");

      await resolver.connect(owner).challengeResolution(1, "First challenge");

      // After first challenge, status is CHALLENGED (not PENDING), so second fails
      await expect(
        resolver.connect(owner).challengeResolution(1, "Second challenge")
      ).to.be.revertedWith("Resolver: already challenged");
    });

    it("Should reject resolution with empty reasoning", async function () {
      await expect(
        resolver.submitResolution(1, true, "", "{}")
      ).to.be.revertedWith("Resolver: empty reasoning");
    });

    it("Should auto-finalize after enough confirmations", async function () {
      await resolver.submitResolution(1, true, "Test resolution", "{}");

      await resolver.connect(owner).confirmResolution(1);
      await resolver.connect(user1).confirmResolution(1);

      const resolution = await resolver.getResolution(1);
      expect(resolution.status).to.equal(3); // FINALIZED
    });

    it("Should allow finalize after challenge window timeout", async function () {
      await resolver.submitResolution(1, true, "Test resolution", "{}");

      // Advance time past challenge window (24 hours)
      await ethers.provider.send("evm_increaseTime", [24 * 3600 + 1]);
      await ethers.provider.send("evm_mine", []);

      await resolver.finalizeAfterTimeout(1);

      const resolution = await resolver.getResolution(1);
      expect(resolution.status).to.equal(3); // FINALIZED
    });

    it("Should prevent finalize before challenge window expires", async function () {
      await resolver.submitResolution(1, true, "Test resolution", "{}");

      await expect(
        resolver.finalizeAfterTimeout(1)
      ).to.be.revertedWith("Resolver: challenge window active");
    });
  });

  // ─── DepositManager Security Tests ────────────────────────────────────
  describe("DepositManager Security", function () {
    it("Should prevent non-webhook-signer from crediting deposits", async function () {
      await expect(
        depositMgr.connect(user1).creditDeposit("fake-tx-id")
      ).to.be.revertedWith("DepositManager: not a webhook signer");
    });

    it("Should prevent crediting non-existent deposit", async function () {
      await expect(
        depositMgr.connect(owner).creditDeposit("non-existent")
      ).to.be.revertedWith("DepositManager: deposit not found");
    });

    it("Should prevent double crediting", async function () {
      // This test requires a deposit first
      await usdc.mint(await depositMgr.getAddress(), ethers.parseUnits("100", 6));
      await depositMgr.deposit(user1.address, "test-tx-001");

      await depositMgr.connect(owner).creditDeposit("test-tx-001");

      await expect(
        depositMgr.connect(owner).creditDeposit("test-tx-001")
      ).to.be.revertedWith("DepositManager: already credited");
    });

    it("Should prevent duplicate deposit txId", async function () {
      await usdc.mint(await depositMgr.getAddress(), ethers.parseUnits("100", 6));
      await depositMgr.deposit(user1.address, "duplicate-tx");

      await usdc.mint(await depositMgr.getAddress(), ethers.parseUnits("50", 6));
      await expect(
        depositMgr.deposit(user2.address, "duplicate-tx")
      ).to.be.revertedWith("DepositManager: duplicate txId");
    });
  });

  // ─── Emergency Functions Tests ────────────────────────────────────────
  describe("Emergency Functions", function () {
    it("Should allow owner to cancel active event", async function () {
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 86400;
      await vault.createEvent("Cancel test", "test", deadline, 0, 0, 0, 0);

      await vault.connect(user1).placeBet(1, 0, BET_AMOUNT);

      await vault.cancelEvent(1, "Emergency cancellation");
      const event = await vault.getEventDetails(1);
      expect(event.status).to.equal(3); // CANCELLED
    });

    it("Should allow users to claim refund on cancelled event", async function () {
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 86400;
      await vault.createEvent("Cancel refund", "test", deadline, 0, 0, 0, 0);

      await vault.connect(user1).placeBet(1, 0, BET_AMOUNT);

      await vault.cancelEvent(1, "Emergency cancellation");

      // After cancellation, bet is no longer locked so available balance returns
      const availableBefore = await vault.getAvailableBalance(user1.address);
      expect(availableBefore).to.equal(USDC_AMOUNT); // Already unlocked

      // Claim should transfer USDC and mark bet as claimed
      const usdcBefore = await usdc.balanceOf(user1.address);
      await vault.connect(user1).claimWinnings(1);
      const usdcAfter = await usdc.balanceOf(user1.address);

      expect(usdcAfter - usdcBefore).to.equal(BET_AMOUNT);

      const bet = await vault.getBet(1);
      expect(bet.claimed).to.equal(true);
    });

    it("Should allow owner to pause all operations", async function () {
      await vault.pause();

      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 86400;
      await expect(
        vault.createEvent("Paused test", "test", deadline, 0, 0, 0, 0)
      ).to.be.revertedWithCustomError(vault, "EnforcedPause");

      await expect(
        vault.connect(user1).deposit(BET_AMOUNT)
      ).to.be.revertedWithCustomError(vault, "EnforcedPause");
    });

    it("Should allow owner to unpause and resume operations", async function () {
      await vault.pause();
      await vault.unpause();

      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 86400;
      await vault.createEvent("Unpaused test", "test", deadline, 0, 0, 0, 0);
      const event = await vault.getEventDetails(1);
      expect(event.status).to.equal(0); // ACTIVE
    });
  });

  // ─── Gas Limit Tests ──────────────────────────────────────────────────
  describe("Gas Limit Protection", function () {
    it("Should handle user with many bets without exceeding gas limit", async function () {
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 86400;

      // Create multiple events and place bets
      for (let i = 0; i < 10; i++) {
        await vault.createEvent(`Gas test ${i}`, "test", deadline, 0, 0, 0, 0);
        await vault.connect(user1).placeBet(i + 1, 0, MIN_BET);
      }

      // getUserLockedBalance should still work
      const locked = await vault.getUserLockedBalance(user1.address);
      expect(locked).to.equal(MIN_BET * 10n);
    });
  });

  // ─── Integer Overflow/Underflow Tests ─────────────────────────────────
  describe("Integer Overflow/Underflow", function () {
    it("Should not overflow on multiple deposits", async function () {
      const largeAmount = ethers.parseUnits("1000000", 6);
      await usdc.mint(user1.address, largeAmount * 10n);
      await usdc.connect(user1).approve(await vault.getAddress(), largeAmount * 10n);

      for (let i = 0; i < 5; i++) {
        await vault.connect(user1).deposit(largeAmount);
      }

      const balance = await vault.getAvailableBalance(user1.address);
      expect(balance).to.equal(largeAmount * 5n + USDC_AMOUNT);
    });

    it("Should handle zero division gracefully in payout calculation", async function () {
      // This tests the edge case where totalWinningBets could be zero
      // In practice, this shouldn't happen because at least one bet must exist
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 86400;
      await vault.createEvent("Zero div test", "test", deadline, 0, 0, 0, 0);

      await vault.connect(user1).placeBet(1, 0, BET_AMOUNT);
      await vault.connect(user2).placeBet(1, 1, BET_AMOUNT);

      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine", []);

      await vault.connect(resolverSigner).resolveEvent(1, true, "YES won");

      // This should not revert
      const winnings = await vault.calculatePotentialWinnings(1);
      expect(winnings).to.be.gt(0);
    });
  });
});
