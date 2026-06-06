// TRDEFIVault v2.0 — Reference-Point Resolution Tests
//
// Covers:
//   1. PRICE_DIRECTION: UP wins, DOWN wins, EQUAL → DRAW
//   2. PRICE_THRESHOLD with GT: above threshold → YES, below → NO, mid → DRAW
//   3. PRICE_THRESHOLD with LT: below threshold → YES, above → NO, mid → DRAW
//   4. EIP-712 proof verification: valid / wrong signer / replay protection
//   5. Subjective event path still works (regression check)
//   6. Cross-path rejection: objective event can't use subjective resolver
//   7. EventResolver CHALLENGED bug fix (v2.0)
//
// Run with: npx hardhat test test/TRDEFIVault.v2.test.js

const { expect } = require("chai");
const { ethers } = require("hardhat");

const USDC_DECIMALS = 6;
const toUSDC = (n) => ethers.parseUnits(n.toString(), USDC_DECIMALS);

const EIP712_NAME = "TRDEFIVault";
const EIP712_VERSION = "2";

describe("TRDEFIVault v2.0 — Reference-Point Resolution", function () {
  let vault, resolver, usdc;
  let owner, oracle, user1, user2, user3, attacker;
  let chainId;

  beforeEach(async function () {
    [owner, oracle, user1, user2, user3, attacker] = await ethers.getSigners();
    chainId = (await ethers.provider.getNetwork()).chainId;

    // Mock USDC
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    // Vault
    const Vault = await ethers.getContractFactory("TRDEFIVault");
    vault = await Vault.deploy(await usdc.getAddress());
    await vault.waitForDeployment();

    // EventResolver (for subjective path tests)
    const EventResolver = await ethers.getContractFactory("EventResolver");
    resolver = await EventResolver.deploy();
    await resolver.waitForDeployment();
    await resolver.setVault(await vault.getAddress());
    await resolver.addSigner(owner.address);
    await resolver.addSigner(user1.address);
    await resolver.addSigner(user2.address);

    await vault.setEventResolver(await resolver.getAddress());
    await vault.addResolver(owner.address);
    await vault.addTrustedOracle(oracle.address);

    // Fund users
    for (const u of [user1, user2, user3]) {
      await usdc.mint(u.address, toUSDC(100000));
      await usdc.connect(u).approve(await vault.getAddress(), ethers.MaxUint256);
      await vault.connect(u).deposit(toUSDC(10000));
    }
  });

  // EventStatus enum values:
  // 0: ACTIVE, 1: RESOLVED, 2: DRAWN, 3: CANCELLED
  // EventType enum values:
  // 0: SUBJECTIVE, 1: PRICE_DIRECTION, 2: PRICE_THRESHOLD
  // Comparator enum values: 0: GT, 1: LT

  // Helper: build EIP-712 digest the same way the contract does
  async function signOracleResolution(oracleSigner, eventId, finalValue, deadline) {
    const domain = {
      name: EIP712_NAME,
      version: EIP712_VERSION,
      chainId,
      verifyingContract: await vault.getAddress()
    };
    const types = {
      OracleResolution: [
        { name: "eventId", type: "uint256" },
        { name: "finalValue", type: "uint256" },
        { name: "deadline", type: "uint256" }
      ]
    };
    const value = { eventId, finalValue, deadline };
    return await oracleSigner.signTypedData(domain, types, value);
  }

  // Helper: create an event and place YES/NO bets
  async function setupEvent({
    eventType,
    comparator = 0,
    thresholdBps = 0,
    openingPrice = toUSDC(100),
    betYes = toUSDC(500),
    betNo = toUSDC(300)
  }) {
    const deadline = (await ethers.provider.getBlock("latest")).timestamp + 3600;
    const tx = await vault.createEvent(
      "Test event",
      "crypto",
      deadline,
      openingPrice,
      eventType,
      comparator,
      thresholdBps
    );
    const receipt = await tx.wait();
    const eventId = 1; // first event in this test

    if (betYes > 0n) {
      await vault.connect(user1).placeBet(eventId, 0, betYes); // YES
    }
    if (betNo > 0n) {
      await vault.connect(user2).placeBet(eventId, 1, betNo); // NO
    }
    return { eventId, deadline };
  }

  // ───────────────────────────────────────────────────────────────────
  // 1. PRICE_DIRECTION
  // ───────────────────────────────────────────────────────────────────
  describe("PRICE_DIRECTION", function () {
    it("YES wins when finalValue > openingPrice", async function () {
      const { eventId, deadline } = await setupEvent({
        eventType: 1, // PRICE_DIRECTION
        openingPrice: toUSDC(100),
        betYes: toUSDC(500),
        betNo: toUSDC(300)
      });
      await ethers.provider.send("evm_increaseTime", [3700]);
      await ethers.provider.send("evm_mine", []);

      const finalValue = toUSDC(110);
      const proof = await signOracleResolution(oracle, eventId, finalValue, deadline);
      await vault.connect(oracle).resolveEventWithProof(eventId, finalValue, proof);

      const ev = await vault.events(eventId);
      expect(ev.status).to.equal(1); // RESOLVED
      expect(ev.resolvedYes).to.equal(true);
      expect(ev.finalValue).to.equal(finalValue);
    });

    it("NO wins when finalValue < openingPrice", async function () {
      const { eventId, deadline } = await setupEvent({
        eventType: 1,
        openingPrice: toUSDC(100),
        betYes: toUSDC(500),
        betNo: toUSDC(300)
      });
      await ethers.provider.send("evm_increaseTime", [3700]);
      await ethers.provider.send("evm_mine", []);

      const finalValue = toUSDC(90);
      const proof = await signOracleResolution(oracle, eventId, finalValue, deadline);
      await vault.connect(oracle).resolveEventWithProof(eventId, finalValue, proof);

      const ev = await vault.events(eventId);
      expect(ev.status).to.equal(1); // RESOLVED
      expect(ev.resolvedYes).to.equal(false);
    });

    it("DRAW (refund) when finalValue == openingPrice", async function () {
      const { eventId, deadline } = await setupEvent({
        eventType: 1,
        openingPrice: toUSDC(100),
        betYes: toUSDC(500),
        betNo: toUSDC(300)
      });
      await ethers.provider.send("evm_increaseTime", [3700]);
      await ethers.provider.send("evm_mine", []);

      const finalValue = toUSDC(100);
      const proof = await signOracleResolution(oracle, eventId, finalValue, deadline);
      await vault.connect(oracle).resolveEventWithProof(eventId, finalValue, proof);

      const ev = await vault.events(eventId);
      expect(ev.status).to.equal(2); // DRAWN
    });

    it("previewResolution() reflects the same logic", async function () {
      const { eventId } = await setupEvent({
        eventType: 1,
        openingPrice: toUSDC(100)
      });
      const [yes1, draw1] = await vault.previewResolution(eventId, toUSDC(110));
      expect(yes1).to.equal(true);
      expect(draw1).to.equal(false);

      const [yes2, draw2] = await vault.previewResolution(eventId, toUSDC(90));
      expect(yes2).to.equal(false);
      expect(draw2).to.equal(false);

      const [yes3, draw3] = await vault.previewResolution(eventId, toUSDC(100));
      expect(yes3).to.equal(false);
      expect(draw3).to.equal(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // 2. PRICE_THRESHOLD with GT
  // ───────────────────────────────────────────────────────────────────
  describe("PRICE_THRESHOLD with GT", function () {
    it("YES wins when finalValue >= openingPrice * (1 + 5%)", async function () {
      // 5% threshold = 500 bps
      const { eventId, deadline } = await setupEvent({
        eventType: 2, // PRICE_THRESHOLD
        comparator: 0, // GT
        thresholdBps: 500,
        openingPrice: toUSDC(100)
      });
      await ethers.provider.send("evm_increaseTime", [3700]);
      await ethers.provider.send("evm_mine", []);

      const finalValue = toUSDC(106); // 6% above
      const proof = await signOracleResolution(oracle, eventId, finalValue, deadline);
      await vault.connect(oracle).resolveEventWithProof(eventId, finalValue, proof);

      const ev = await vault.events(eventId);
      expect(ev.resolvedYes).to.equal(true);
    });

    it("NO wins when finalValue <= openingPrice * (1 - 5%)", async function () {
      const { eventId, deadline } = await setupEvent({
        eventType: 2,
        comparator: 0, // GT
        thresholdBps: 500,
        openingPrice: toUSDC(100)
      });
      await ethers.provider.send("evm_increaseTime", [3700]);
      await ethers.provider.send("evm_mine", []);

      const finalValue = toUSDC(94); // 6% below
      const proof = await signOracleResolution(oracle, eventId, finalValue, deadline);
      await vault.connect(oracle).resolveEventWithProof(eventId, finalValue, proof);

      const ev = await vault.events(eventId);
      expect(ev.resolvedYes).to.equal(false);
    });

    it("DRAW (refund) when move is between -5% and +5%", async function () {
      const { eventId, deadline } = await setupEvent({
        eventType: 2,
        comparator: 0,
        thresholdBps: 500,
        openingPrice: toUSDC(100)
      });
      await ethers.provider.send("evm_increaseTime", [3700]);
      await ethers.provider.send("evm_mine", []);

      const finalValue = toUSDC(102); // 2% above, below 5% threshold
      const proof = await signOracleResolution(oracle, eventId, finalValue, deadline);
      await vault.connect(oracle).resolveEventWithProof(eventId, finalValue, proof);

      const ev = await vault.events(eventId);
      expect(ev.status).to.equal(2); // DRAWN
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // 3. PRICE_THRESHOLD with LT
  // ───────────────────────────────────────────────────────────────────
  describe("PRICE_THRESHOLD with LT", function () {
    it("YES wins when finalValue <= openingPrice * (1 - 10%)", async function () {
      const { eventId, deadline } = await setupEvent({
        eventType: 2,
        comparator: 1, // LT
        thresholdBps: 1000, // 10%
        openingPrice: toUSDC(100)
      });
      await ethers.provider.send("evm_increaseTime", [3700]);
      await ethers.provider.send("evm_mine", []);

      const finalValue = toUSDC(85); // 15% below
      const proof = await signOracleResolution(oracle, eventId, finalValue, deadline);
      await vault.connect(oracle).resolveEventWithProof(eventId, finalValue, proof);

      const ev = await vault.events(eventId);
      expect(ev.resolvedYes).to.equal(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // 4. EIP-712 proof security
  // ───────────────────────────────────────────────────────────────────
  describe("EIP-712 proof security", function () {
    it("rejects proof signed by non-trusted address", async function () {
      const { eventId, deadline } = await setupEvent({
        eventType: 1,
        openingPrice: toUSDC(100)
      });
      await ethers.provider.send("evm_increaseTime", [3700]);
      await ethers.provider.send("evm_mine", []);

      const finalValue = toUSDC(110);
      // attacker signs, oracle submits — should fail
      const badProof = await signOracleResolution(attacker, eventId, finalValue, deadline);
      await expect(
        vault.connect(oracle).resolveEventWithProof(eventId, finalValue, badProof)
      ).to.be.revertedWith("TRDEFI: invalid oracle proof");
    });

    it("rejects proof with wrong chainId (replay across networks)", async function () {
      const { eventId, deadline } = await setupEvent({
        eventType: 1,
        openingPrice: toUSDC(100)
      });
      await ethers.provider.send("evm_increaseTime", [3700]);
      await ethers.provider.send("evm_mine", []);

      const finalValue = toUSDC(110);
      // Sign with wrong chainId (137 = Polygon mainnet, when test is 31337)
      const domain = {
        name: EIP712_NAME,
        version: EIP712_VERSION,
        chainId: 137,
        verifyingContract: await vault.getAddress()
      };
      const types = { OracleResolution: [
        { name: "eventId", type: "uint256" },
        { name: "finalValue", type: "uint256" },
        { name: "deadline", type: "uint256" }
      ]};
      const wrongChainProof = await oracle.signTypedData(
        domain, types, { eventId, finalValue, deadline }
      );
      await expect(
        vault.connect(oracle).resolveEventWithProof(eventId, finalValue, wrongChainProof)
      ).to.be.revertedWith("TRDEFI: invalid oracle proof");
    });

    it("rejects proof with tampered finalValue", async function () {
      const { eventId, deadline } = await setupEvent({
        eventType: 1,
        openingPrice: toUSDC(100)
      });
      await ethers.provider.send("evm_increaseTime", [3700]);
      await ethers.provider.send("evm_mine", []);

      // Sign for 110, submit 109
      const signedValue = toUSDC(110);
      const submittedValue = toUSDC(109);
      const proof = await signOracleResolution(oracle, eventId, signedValue, deadline);
      await expect(
        vault.connect(oracle).resolveEventWithProof(eventId, submittedValue, proof)
      ).to.be.revertedWith("TRDEFI: invalid oracle proof");
    });

    it("rejects if deadline not reached", async function () {
      const { eventId, deadline } = await setupEvent({
        eventType: 1,
        openingPrice: toUSDC(100)
      });
      // Don't advance time
      const finalValue = toUSDC(110);
      const proof = await signOracleResolution(oracle, eventId, finalValue, deadline);
      await expect(
        vault.connect(oracle).resolveEventWithProof(eventId, finalValue, proof)
      ).to.be.revertedWith("TRDEFI: deadline not reached");
    });

    it("oracleDigest() view returns the same digest the contract recovers", async function () {
      const { eventId, deadline } = await setupEvent({
        eventType: 1,
        openingPrice: toUSDC(100)
      });
      const finalValue = toUSDC(110);
      const onchainDigest = await vault.oracleDigest(eventId, finalValue, deadline);

      const domain = {
        name: EIP712_NAME,
        version: EIP712_VERSION,
        chainId,
        verifyingContract: await vault.getAddress()
      };
      const types = { OracleResolution: [
        { name: "eventId", type: "uint256" },
        { name: "finalValue", type: "uint256" },
        { name: "deadline", type: "uint256" }
      ]};
      const expectedDigest = ethers.TypedDataEncoder.hash(domain, types, {
        eventId, finalValue, deadline
      });

      expect(onchainDigest).to.equal(expectedDigest);
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // 5. Cross-path rejection
  // ───────────────────────────────────────────────────────────────────
  describe("Cross-path rejection", function () {
    it("resolveEvent (subjective) rejects objective events", async function () {
      const { eventId } = await setupEvent({ eventType: 1 }); // DIRECTION
      await ethers.provider.send("evm_increaseTime", [3700]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        vault.connect(owner).resolveEvent(eventId, true, "trying subjective path")
      ).to.be.revertedWith("TRDEFI: not a subjective event");
    });

    it("resolveEventWithProof (objective) rejects subjective events", async function () {
      const { eventId, deadline } = await setupEvent({
        eventType: 0, // SUBJECTIVE
        openingPrice: toUSDC(100)
      });
      await ethers.provider.send("evm_increaseTime", [3700]);
      await ethers.provider.send("evm_mine", []);

      const finalValue = toUSDC(110);
      const proof = await signOracleResolution(oracle, eventId, finalValue, deadline);
      await expect(
        vault.connect(oracle).resolveEventWithProof(eventId, finalValue, proof)
      ).to.be.revertedWith("TRDEFI: not an objective event");
    });

    it("non-oracle cannot call resolveEventWithProof", async function () {
      const { eventId, deadline } = await setupEvent({ eventType: 1 });
      await ethers.provider.send("evm_increaseTime", [3700]);
      await ethers.provider.send("evm_mine", []);
      const finalValue = toUSDC(110);
      const proof = await signOracleResolution(oracle, eventId, finalValue, deadline);
      await expect(
        vault.connect(attacker).resolveEventWithProof(eventId, finalValue, proof)
      ).to.be.revertedWith("TRDEFI: not a trusted oracle");
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // 6. Payout math (regression for v1.0)
  // ───────────────────────────────────────────────────────────────────
  describe("Payout math (regression)", function () {
    it("distributes winnings correctly for objective YES resolution", async function () {
      const { eventId, deadline } = await setupEvent({
        eventType: 1,
        openingPrice: toUSDC(100),
        betYes: toUSDC(500),
        betNo: toUSDC(300)
      });
      await ethers.provider.send("evm_increaseTime", [3700]);
      await ethers.provider.send("evm_mine", []);

      const finalValue = toUSDC(110);
      const proof = await signOracleResolution(oracle, eventId, finalValue, deadline);
      await vault.connect(oracle).resolveEventWithProof(eventId, finalValue, proof);

      // user1 (YES) bet 500, should win
      // losingPool (NO) = 300, platformFee = 30, net = 270
      // winningPool = 500 + 270 = 770
      // user1 share = (500 * 770) / 500 = 770
      const balBefore = await usdc.balanceOf(user1.address);
      const betId = 1; // first bet
      await vault.connect(user1).claimWinnings(betId);
      const balAfter = await usdc.balanceOf(user1.address);
      expect(balAfter - balBefore).to.equal(toUSDC(770));
    });

    it("refunds on DRAW for objective event", async function () {
      const { eventId, deadline } = await setupEvent({
        eventType: 1,
        openingPrice: toUSDC(100),
        betYes: toUSDC(500),
        betNo: toUSDC(300)
      });
      await ethers.provider.send("evm_increaseTime", [3700]);
      await ethers.provider.send("evm_mine", []);

      const finalValue = toUSDC(100); // equal → DRAW
      const proof = await signOracleResolution(oracle, eventId, finalValue, deadline);
      await vault.connect(oracle).resolveEventWithProof(eventId, finalValue, proof);

      const balBefore = await usdc.balanceOf(user1.address);
      await vault.connect(user1).claimWinnings(1);
      const balAfter = await usdc.balanceOf(user1.address);
      expect(balAfter - balBefore).to.equal(toUSDC(500));
    });
  });

  // ───────────────────────────────────────────────────────────────────
  // 7. EventResolver v2.0 — CHALLENGED bug fix
  // ───────────────────────────────────────────────────────────────────
  describe("EventResolver v2.0 — CHALLENGED state machine", function () {
    it("1 challenge moves PENDING → CHALLENGED, NOT to REJECTED", async function () {
      // Create subjective event
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 3600;
      await vault.createEvent(
        "Best film of the week?",
        "entertainment",
        deadline,
        0,
        0, // SUBJECTIVE
        0,
        0
      );
      const eventId = 1;

      await vault.connect(user1).placeBet(eventId, 0, toUSDC(500));
      await vault.connect(user2).placeBet(eventId, 1, toUSDC(300));

      // LLM submits "YES wins"
      await resolver.connect(owner).submitResolution(eventId, true, "Film A won critics' choice", "[]");
      const resId = 1;

      // 1 challenge from user1
      await resolver.connect(user1).challengeResolution(resId, "Disagree with LLM");

      const res = await resolver.resolutions(resId);
      expect(res.status).to.equal(2); // CHALLENGED (not REJECTED — that was the v1 bug)
    });

    it("CHALLENGED can be recovered to PENDING by majority confirm", async function () {
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 3600;
      await vault.createEvent("Subjective Q", "category", deadline, 0, 0, 0, 0);
      await vault.connect(user1).placeBet(1, 0, toUSDC(500));
      await vault.connect(user2).placeBet(1, 1, toUSDC(300));
      await resolver.connect(owner).submitResolution(1, true, "Yes reasoning", "[]");
      const resId = 1;

      // user1 challenges (status → CHALLENGED)
      await resolver.connect(user1).challengeResolution(resId, "I disagree");
      // owner + user2 confirm (3 signers active, 2 confirms = majority)
      await resolver.connect(owner).confirmResolution(resId);
      await resolver.connect(user2).confirmResolution(resId);

      // After 2 confirms, status should be PENDING (recovered)
      const res = await resolver.resolutions(resId);
      expect(res.status).to.equal(0); // PENDING
    });

    it("majority challenges push to REJECTED", async function () {
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 3600;
      await vault.createEvent("Subjective Q", "cat", deadline, 0, 0, 0, 0);
      await vault.connect(user1).placeBet(1, 0, toUSDC(500));
      await vault.connect(user2).placeBet(1, 1, toUSDC(300));
      await resolver.connect(owner).submitResolution(1, true, "Yes", "[]");
      const resId = 1;

      // 2 of 3 signers challenge → REJECTED
      await resolver.connect(owner).challengeResolution(resId, "nope");
      await resolver.connect(user1).challengeResolution(resId, "nope too");
      // user2 can't challenge after owner+user1 (status would still be PENDING or already REJECTED)
      // Try:
      try {
        await resolver.connect(user2).challengeResolution(resId, "me too");
      } catch (e) {
        // expected — status is REJECTED, can't add more
      }

      const res = await resolver.resolutions(resId);
      expect(res.status).to.equal(4); // REJECTED
    });
  });
});
