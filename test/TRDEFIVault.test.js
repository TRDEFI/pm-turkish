const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TRDEFIVault", function () {
  let vault, resolver, depositMgr, usdc;
  let owner, resolverSigner, user1, user2, user3;

  const USDC_AMOUNT = ethers.parseUnits("1000", 6); // 1000 USDC
  const BET_AMOUNT = ethers.parseUnits("100", 6);    // 100 USDC
  const MIN_BET = ethers.parseUnits("1", 6);          // 1 USDC

  beforeEach(async function () {
    [owner, resolverSigner, user1, user2, user3] = await ethers.getSigners();

    // Deploy Mock USDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    // Mint USDC to users
    for (const user of [owner, user1, user2, user3]) {
      await usdc.mint(user.address, USDC_AMOUNT * 10n);
    }

    // Deploy Vault
    const TRDEFIVault = await ethers.getContractFactory("TRDEFIVault");
    vault = await TRDEFIVault.deploy(await usdc.getAddress());
    await vault.waitForDeployment();

    // Deploy Resolver
    const EventResolver = await ethers.getContractFactory("EventResolver");
    resolver = await EventResolver.deploy();
    await resolver.waitForDeployment();

    // Deploy DepositManager
    const DepositManager = await ethers.getContractFactory("TRDEFIDepositManager");
    depositMgr = await DepositManager.deploy(await usdc.getAddress());
    await depositMgr.waitForDeployment();

    // Configure
    await resolver.setVault(await vault.getAddress());
    await depositMgr.setVault(await vault.getAddress());
    await vault.addResolver(resolverSigner.address);
    await resolver.addSigner(owner.address);
    await resolver.addSigner(user1.address);
    await depositMgr.addWebhookSigner(owner.address);

    // Approve vault for users
    for (const user of [user1, user2, user3]) {
      await usdc.connect(user).approve(await vault.getAddress(), USDC_AMOUNT * 10n);
      await vault.connect(user).deposit(USDC_AMOUNT);
    }
  });

  describe("Deployment", function () {
    it("Should set the correct USDC address", async function () {
      expect(await vault.USDC()).to.equal(await usdc.getAddress());
    });

    it("Should set the correct owner", async function () {
      expect(await vault.owner()).to.equal(owner.address);
    });

    it("Should have correct constants", async function () {
      expect(await vault.PLATFORM_FEE_BPS()).to.equal(1000); // 10%
      expect(await vault.MIN_BET()).to.equal(MIN_BET);
    });
  });

  describe("Deposit / Withdraw", function () {
    it("Should allow users to deposit USDC", async function () {
      const depositAmount = ethers.parseUnits("500", 6);
      await usdc.connect(user1).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user1).deposit(depositAmount);

      const balance = await vault.getAvailableBalance(user1.address);
      expect(balance).to.equal(USDC_AMOUNT + depositAmount);
    });

    it("Should allow users to withdraw available balance", async function () {
      const withdrawAmount = ethers.parseUnits("200", 6);
      const beforeBalance = await usdc.balanceOf(user1.address);

      await vault.connect(user1).withdraw(withdrawAmount);

      const afterBalance = await usdc.balanceOf(user1.address);
      expect(afterBalance - beforeBalance).to.equal(withdrawAmount);
    });

    it("Should not allow withdrawal of locked balance", async function () {
      // Create event and place bet
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 86400;
      await vault.createEvent("Test event?", "test", deadline, 0, 0, 0, 0);
      await vault.connect(user1).placeBet(1, 0, BET_AMOUNT); // YES bet

      const available = await vault.getAvailableBalance(user1.address);
      expect(available).to.equal(USDC_AMOUNT - BET_AMOUNT);

      // Should fail if trying to withdraw more than available
      await expect(
        vault.connect(user1).withdraw(USDC_AMOUNT)
      ).to.be.revertedWith("TRDEFI: insufficient available balance");
    });
  });

  describe("Event Creation", function () {
    it("Should create an event", async function () {
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 86400;
      const tx = await vault.createEvent("BTC > $100k tomorrow?", "kripto-gun", deadline, 95000, 0, 0, 0);
      const receipt = await tx.wait();

      const event = await vault.getEventDetails(1);
      expect(event.question).to.equal("BTC > $100k tomorrow?");
      expect(event.category).to.equal("kripto-gun");
      expect(event.status).to.equal(0); // ACTIVE
    });

    it("Should reject past deadlines", async function () {
      const pastDeadline = (await ethers.provider.getBlock("latest")).timestamp - 100;
      await expect(
        vault.createEvent("Past event?", "test", pastDeadline, 0, 0, 0, 0)
      ).to.be.revertedWith("TRDEFI: deadline must be in future");
    });
  });

  describe("Betting", function () {
    let eventId;

    beforeEach(async function () {
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 86400;
      await vault.createEvent("Test event?", "test", deadline, 0, 0, 0, 0);
      eventId = 1;
    });

    it("Should allow placing a YES bet", async function () {
      await vault.connect(user1).placeBet(eventId, 0, BET_AMOUNT);

      const event = await vault.getEventDetails(eventId);
      expect(event.totalYesBets).to.equal(BET_AMOUNT);
      expect(event.yesBetCount).to.equal(1);
    });

    it("Should allow placing a NO bet", async function () {
      await vault.connect(user1).placeBet(eventId, 1, BET_AMOUNT);

      const event = await vault.getEventDetails(eventId);
      expect(event.totalNoBets).to.equal(BET_AMOUNT);
      expect(event.noBetCount).to.equal(1);
    });

    it("Should reject bets below minimum", async function () {
      await expect(
        vault.connect(user1).placeBet(eventId, 0, MIN_BET - 1n)
      ).to.be.revertedWith("TRDEFI: bet below minimum");
    });

    it("Should reject bets after deadline", async function () {
      // Create event with a short deadline
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 60;
      await vault.createEvent("Short deadline?", "test", deadline, 0, 0, 0, 0);
      const newEventId = 2;

      // Advance time past the deadline
      await ethers.provider.send("evm_increaseTime", [120]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        vault.connect(user1).placeBet(newEventId, 0, BET_AMOUNT)
      ).to.be.revertedWith("TRDEFI: event deadline passed");
    });
  });

  describe("Parimutuel Payout", function () {
    it("Should correctly distribute winnings (YES wins)", async function () {
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 86400;
      await vault.createEvent("BTC > $100k?", "kripto-gun", deadline, 95000, 0, 0, 0);

      // user1 bets 100 USDC YES
      await vault.connect(user1).placeBet(1, 0, BET_AMOUNT);
      // user2 bets 200 USDC NO
      await vault.connect(user2).placeBet(1, 1, BET_AMOUNT * 2n);

      // Advance time past deadline
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine", []);

      // Resolve: YES wins
      await vault.connect(resolverSigner).resolveEvent(1, true, "BTC hit $100k");

      // user1 should win
      const potentialWinnings = await vault.calculatePotentialWinnings(1);

      // Losing pool = 200 USDC (NO bets)
      // Platform fee = 200 * 10% = 20 USDC
      // Net losing pool = 200 - 20 = 180 USDC
      // Winning pool = 100 + 180 = 280 USDC
      // user1 share = (100 / 100) * 280 = 280 USDC
      expect(potentialWinnings).to.equal(ethers.parseUnits("280", 6));

      await vault.connect(user1).claimWinnings(1);
      const balance = await vault.getAvailableBalance(user1.address);
      // deposited (1000) + won (280) - withdrawn (0) - locked (0) = 1280
      expect(balance).to.equal(USDC_AMOUNT + ethers.parseUnits("280", 6));
    });

    it("Should correctly distribute winnings (NO wins)", async function () {
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 86400;
      await vault.createEvent("BTC > $100k?", "kripto-gun", deadline, 95000, 0, 0, 0);

      // user1 bets 100 USDC YES
      await vault.connect(user1).placeBet(1, 0, BET_AMOUNT);
      // user2 bets 200 USDC NO
      await vault.connect(user2).placeBet(1, 1, BET_AMOUNT * 2n);

      // Advance time past deadline
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine", []);

      // Resolve: NO wins
      await vault.connect(resolverSigner).resolveEvent(1, false, "BTC did not hit $100k");

      // user2 should win
      const potentialWinnings = await vault.calculatePotentialWinnings(2);

      // Losing pool = 100 USDC (YES bets)
      // Platform fee = 100 * 10% = 10 USDC
      // Net losing pool = 100 - 10 = 90 USDC
      // Winning pool = 200 + 90 = 290 USDC
      // user2 share = (200 / 200) * 290 = 290 USDC
      expect(potentialWinnings).to.equal(ethers.parseUnits("290", 6));
    });

    it("Should refund on DRAW (only one side)", async function () {
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 86400;
      await vault.createEvent("Only YES bets", "test", deadline, 0, 0, 0, 0);

      // Only YES bets
      await vault.connect(user1).placeBet(1, 0, BET_AMOUNT);

      // Advance time past deadline
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine", []);

      // Resolve: YES wins but no NO bets → DRAW
      await vault.connect(resolverSigner).resolveEvent(1, true, "No opposing bets");

      const event = await vault.getEventDetails(1);
      expect(event.status).to.equal(2); // DRAWN

      // user1 gets full refund
      await vault.connect(user1).claimWinnings(1);
      const balance = await vault.getAvailableBalance(user1.address);
      expect(balance).to.equal(USDC_AMOUNT); // Full refund
    });

    it("Should handle multiple winners correctly", async function () {
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 86400;
      await vault.createEvent("Multi-winner test", "test", deadline, 0, 0, 0, 0);

      // user1 bets 100 YES, user2 bets 100 YES, user3 bets 200 NO
      await vault.connect(user1).placeBet(1, 0, BET_AMOUNT);
      await vault.connect(user2).placeBet(1, 0, BET_AMOUNT);
      await vault.connect(user3).placeBet(1, 1, BET_AMOUNT * 2n);

      // Advance time past deadline
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine", []);

      // Resolve: YES wins
      await vault.connect(resolverSigner).resolveEvent(1, true, "YES won");

      // Both user1 and user2 should win proportional shares
      const winnings1 = await vault.calculatePotentialWinnings(1);
      const winnings2 = await vault.calculatePotentialWinnings(2);

      // Losing pool = 200 (NO)
      // Fee = 20
      // Net losing = 180
      // Winning pool = 200 + 180 = 380
      // Each winner gets (100/200) * 380 = 190
      expect(winnings1).to.equal(ethers.parseUnits("190", 6));
      expect(winnings2).to.equal(ethers.parseUnits("190", 6));
    });
  });

  describe("Platform Fees", function () {
    it("Should accumulate platform fees correctly", async function () {
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 86400;
      await vault.createEvent("Fee test", "test", deadline, 0, 0, 0, 0);

      await vault.connect(user1).placeBet(1, 0, BET_AMOUNT);
      await vault.connect(user2).placeBet(1, 1, BET_AMOUNT);

      // Advance time past deadline
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine", []);

      await vault.connect(resolverSigner).resolveEvent(1, true, "YES won");

      // Platform fee = 100 * 10% = 10 USDC
      expect(await vault.totalPlatformFees()).to.equal(ethers.parseUnits("10", 6));
    });

    it("Should allow owner to withdraw fees", async function () {
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 86400;
      await vault.createEvent("Fee withdrawal test", "test", deadline, 0, 0, 0, 0);

      await vault.connect(user1).placeBet(1, 0, BET_AMOUNT);
      await vault.connect(user2).placeBet(1, 1, BET_AMOUNT);

      // Advance time past deadline
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine", []);

      await vault.connect(resolverSigner).resolveEvent(1, true, "YES won");

      const beforeBalance = await usdc.balanceOf(owner.address);
      await vault.withdrawPlatformFees();
      const afterBalance = await usdc.balanceOf(owner.address);

      expect(afterBalance - beforeBalance).to.equal(ethers.parseUnits("10", 6));
      expect(await vault.totalPlatformFees()).to.equal(0);
    });
  });

  describe("Security", function () {
    it("Should prevent non-resolver from resolving events", async function () {
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 86400;
      await vault.createEvent("Security test", "test", deadline, 0, 0, 0, 0);

      await expect(
        vault.connect(user1).resolveEvent(1, true, "Unauthorized")
      ).to.be.revertedWith("TRDEFI: not authorized resolver");
    });

    it("Should prevent double claiming", async function () {
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 86400;
      await vault.createEvent("Double claim test", "test", deadline, 0, 0, 0, 0);

      await vault.connect(user1).placeBet(1, 0, BET_AMOUNT);
      await vault.connect(user2).placeBet(1, 1, BET_AMOUNT);

      // Advance time past deadline
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine", []);

      await vault.connect(resolverSigner).resolveEvent(1, true, "YES won");

      await vault.connect(user1).claimWinnings(1);

      await expect(
        vault.connect(user1).claimWinnings(1)
      ).to.be.revertedWith("TRDEFI: already claimed");
    });

    it("Should pause and unpause correctly", async function () {
      await vault.pause();

      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 86400;
      await expect(
        vault.createEvent("Paused test", "test", deadline, 0, 0, 0, 0)
      ).to.be.revertedWithCustomError(vault, "EnforcedPause");

      await vault.unpause();
      await vault.createEvent("Unpaused test", "test", deadline, 0, 0, 0, 0);
    });
  });
});

// Mock USDC for testing
describe("MockUSDC", function () {
  it("Should mint and transfer correctly", async function () {
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    const [owner, user] = await ethers.getSigners();
    const amount = ethers.parseUnits("1000", 6);

    await usdc.mint(owner.address, amount);
    expect(await usdc.balanceOf(owner.address)).to.equal(amount);

    await usdc.transfer(user.address, amount);
    expect(await usdc.balanceOf(user.address)).to.equal(amount);
    expect(await usdc.balanceOf(owner.address)).to.equal(0);
  });
});
