const hre = require("hardhat");

// Polygon USDC addresses
const USDC_ADDRESSES = {
  polygon: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",  // Native USDC
  polygonAmoy: "0x41E94eB21f52f96F82c0F39D59b4d2268E081474", // Testnet USDC
  localhost: undefined, // Will deploy mock USDC
};

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;

  console.log("=".repeat(60));
  console.log("TRDEFI Smart Contract Deployment");
  console.log("=".repeat(60));
  console.log(`Network: ${network}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Balance: ${hre.ethers.formatEther(await deployer.provider.getBalance(deployer.address))} ETH`);
  console.log("=".repeat(60));

  // ─── 1. Deploy TRDEFIVault ──────────────────────────────────────────
  const usdcAddress = USDC_ADDRESSES[network];

  if (!usdcAddress && network === "localhost") {
    console.log("\n📦 Deploying Mock USDC for local testing...");
    const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();
    console.log(`   Mock USDC: ${await mockUSDC.getAddress()}`);
  }

  console.log("\n🏦 Deploying TRDEFIVault...");
  const TRDEFIVault = await hre.ethers.getContractFactory("TRDEFIVault");
  const vault = await TRDEFIVault.deploy(usdcAddress || "0x5FbDB2315678afecb367f032d93F642f64180aa3");
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log(`   TRDEFIVault: ${vaultAddress}`);

  // ─── 2. Deploy EventResolver ────────────────────────────────────────
  console.log("\n🔮 Deploying EventResolver...");
  const EventResolver = await hre.ethers.getContractFactory("EventResolver");
  const resolver = await EventResolver.deploy();
  await resolver.waitForDeployment();
  const resolverAddress = await resolver.getAddress();
  console.log(`   EventResolver: ${resolverAddress}`);

  // ─── 3. Deploy TRDEFIDepositManager ─────────────────────────────────
  console.log("\n💰 Deploying TRDEFIDepositManager...");
  const DepositManager = await hre.ethers.getContractFactory("TRDEFIDepositManager");
  const depositMgr = await DepositManager.deploy(usdcAddress || "0x5FbDB2315678afecb367f032d93F642f64180aa3");
  await depositMgr.waitForDeployment();
  const depositMgrAddress = await depositMgr.getAddress();
  console.log(`   TRDEFIDepositManager: ${depositMgrAddress}`);

  // ─── 4. Configure Contracts ─────────────────────────────────────────
  console.log("\n⚙️  Configuring contracts...");

  // Set vault in resolver
  await resolver.setVault(vaultAddress);
  console.log("   ✅ Resolver → Vault linked");

  // Set vault in deposit manager
  await depositMgr.setVault(vaultAddress);
  console.log("   ✅ DepositManager → Vault linked");

  // Add signers to resolver (from env or default)
  const signer1 = process.env.SIGNER_1 || deployer.address;
  const signer2 = process.env.SIGNER_2 || deployer.address;

  await resolver.addSigner(signer1);
  console.log(`   ✅ Signer 1 added: ${signer1}`);

  if (signer2 !== signer1) {
    await resolver.addSigner(signer2);
    console.log(`   ✅ Signer 2 added: ${signer2}`);
  }

  // Add LLM resolver address
  const llmResolver = process.env.LLM_RESOLVER_ADDRESS || deployer.address;
  await vault.addResolver(llmResolver);
  console.log(`   ✅ LLM Resolver added: ${llmResolver}`);

  // Add webhook signer to deposit manager
  await depositMgr.addWebhookSigner(deployer.address);
  console.log(`   ✅ Webhook Signer added: ${deployer.address}`);

  // ─── 5. Summary ─────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log(`TRDEFIVault:         ${vaultAddress}`);
  console.log(`EventResolver:       ${resolverAddress}`);
  console.log(`DepositManager:      ${depositMgrAddress}`);
  console.log(`USDC:                ${usdcAddress || "Mock (localhost)"}`);
  console.log(`Owner:               ${deployer.address}`);
  console.log(`LLM Resolver:        ${llmResolver}`);
  console.log(`Signer 1:            ${signer1}`);
  console.log(`Signer 2:            ${signer2}`);
  console.log("=".repeat(60));

  // ─── 6. Verification (mainnet/testnet only) ─────────────────────────
  if (network !== "localhost" && network !== "hardhat") {
    console.log("\n🔍 Waiting for block confirmations before verification...");
    await new Promise(r => setTimeout(r, 30000)); // Wait 30s

    try {
      console.log("   Verifying TRDEFIVault...");
      await hre.run("verify:verify", {
        address: vaultAddress,
        constructorArguments: [usdcAddress],
      });
      console.log("   ✅ TRDEFIVault verified");
    } catch (e) {
      console.log("   ⚠️  TRDEFIVault verification failed:", e.message);
    }

    try {
      console.log("   Verifying EventResolver...");
      await hre.run("verify:verify", {
        address: resolverAddress,
        constructorArguments: [],
      });
      console.log("   ✅ EventResolver verified");
    } catch (e) {
      console.log("   ⚠️  EventResolver verification failed:", e.message);
    }

    try {
      console.log("   Verifying TRDEFIDepositManager...");
      await hre.run("verify:verify", {
        address: depositMgrAddress,
        constructorArguments: [usdcAddress],
      });
      console.log("   ✅ TRDEFIDepositManager verified");
    } catch (e) {
      console.log("   ⚠️  TRDEFIDepositManager verification failed:", e.message);
    }
  }

  // ─── 7. Save deployment info ────────────────────────────────────────
  const fs = require("fs");
  const deploymentInfo = {
    network,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      TRDEFIVault: vaultAddress,
      EventResolver: resolverAddress,
      TRDEFIDepositManager: depositMgrAddress,
      USDC: usdcAddress || "Mock (localhost)",
    },
    config: {
      owner: deployer.address,
      llmResolver,
      signer1,
      signer2,
    },
  };

  const outputPath = `./deployment-${network}.json`;
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\n📄 Deployment info saved to ${outputPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
