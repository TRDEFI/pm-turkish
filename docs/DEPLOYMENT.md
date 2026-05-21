# Deployment Guide

Complete guide for deploying TRDEFI smart contracts to various networks.

---

## Prerequisites

### Software Requirements
- Node.js 20+
- npm or yarn
- Git
- MetaMask wallet

### Blockchain Requirements
- Polygon Amoy testnet MATIC (for testnet deployment)
- Polygon mainnet MATIC (for mainnet deployment)
- USDC tokens for testing

---

## Environment Setup

### 1. Clone Repository
```bash
git clone https://github.com/TRDEFI/pm-turkish.git
cd pm-turkish/contracts
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` file with your values:

```env
# Polygon Amoy RPC URL (from Alchemy/Infura)
POLYGON_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_API_KEY

# Deployer wallet private key (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# Polygonscan API key (for contract verification)
POLYGONSCAN_API_KEY=your_polygonscan_api_key

# Optional: Signer addresses for EventResolver
SIGNER_1=0x...
SIGNER_2=0x...

# Optional: LLM resolver address
LLM_RESOLVER_ADDRESS=0x...
```

---

## Local Deployment

### 1. Start Local Hardhat Network
```bash
npx hardhat node
```

This starts a local blockchain at `http://127.0.0.1:8545` with 20 test accounts.

### 2. Deploy Contracts
In a new terminal:
```bash
npm run deploy:local
```

### 3. Run Tests
```bash
npm test
```

---

## Testnet Deployment (Polygon Amoy)

### 1. Get Testnet MATIC
Visit one of these faucets to get testnet MATIC:
- [Polygon Faucet](https://faucet.polygon.technology/)
- [Alchemy Faucet](https://www.alchemy.com/faucets/polygon-amoy)
- [Google Cloud Web3 Faucet](https://cloud.google.com/application/web3/faucet/polygon/amoy)

### 2. Configure Environment
Ensure `.env` file has correct Polygon Amoy RPC URL and private key.

### 3. Deploy Contracts
```bash
npm run deploy:amoy
```

### 4. Verify Contracts
Contracts are automatically verified on Polygonscan if `POLYGONSCAN_API_KEY` is set.

Manual verification:
```bash
npx hardhat verify --network polygonAmoy <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

---

## Mainnet Deployment (Polygon)

### 1. Prerequisites
- Sufficient MATIC for gas fees (~0.1 MATIC)
- Security audit completed
- All tests passing
- Multisig wallet ready for ownership transfer

### 2. Configure Environment
Update `.env` with mainnet RPC URL:
```env
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

### 3. Deploy Contracts
```bash
npm run deploy:polygon
```

### 4. Verify Contracts
```bash
npx hardhat verify --network polygon <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

### 5. Transfer Ownership
After deployment, transfer ownership to multisig wallet:
```solidity
// In TRDEFIVault
await vault.transferOwnership(MULTISIG_ADDRESS);
// Multisig must accept ownership
```

---

## CI/CD Pipeline

### GitHub Actions Workflows

#### CI Workflow (`.github/workflows/ci.yml`)
Triggers on push/PR to `main` branch:
1. Checkout code
2. Setup Node.js
3. Install dependencies
4. Compile contracts
5. Run tests
6. Run Slither security scan

#### Deploy Workflow (`.github/workflows/deploy.yml`)
Triggers on push to `main` branch:
1. Checkout code
2. Setup Node.js
3. Install dependencies
4. Compile contracts
5. Run tests
6. Deploy to Polygon Amoy
7. Verify on Polygonscan

### Required GitHub Secrets
| Secret | Description |
|--------|-------------|
| `PMTURKISH` | Polygon RPC URL |
| `PMTURKISH01` | Deployer private key |
| `PMTURKISH02` | Polygonscan API key |

---

## Contract Verification

### Manual Verification
```bash
npx hardhat verify --network <NETWORK> <ADDRESS> <ARGS>
```

Example:
```bash
npx hardhat verify --network polygonAmoy 0x50446665620Aa28faeB172A0EA425EcaD92E4503 "0x41e94eb21f52f96f82c0f39d59b4d2268e081474"
```

### Verification Status
Check verification status on:
- [Polygon Amoy Explorer](https://amoy.polygonscan.com/)
- [Polygon Mainnet Explorer](https://polygonscan.com/)

---

## Troubleshooting

### Common Issues

#### "insufficient funds for gas"
- **Cause:** Deployer wallet has insufficient MATIC
- **Solution:** Get more testnet MATIC from faucets

#### "private key too long"
- **Cause:** Private key format issue
- **Solution:** Ensure private key is 64 hex characters (without 0x) or 66 with 0x

#### "Invalid URL"
- **Cause:** RPC URL is incorrect or empty
- **Solution:** Check `POLYGON_RPC_URL` in `.env` or GitHub secrets

#### "bad address checksum"
- **Cause:** USDC address checksum mismatch
- **Solution:** Use correct checksummed address for the network

#### "npm ci" fails
- **Cause:** package-lock.json out of sync
- **Solution:** Run `npm install` to regenerate lock file

---

## Post-Deployment Checklist

### Security
- [ ] All tests passing
- [ ] Security audit completed
- [ ] Slither scan passed
- [ ] Contracts verified on explorer

### Configuration
- [ ] Owner transferred to multisig
- [ ] EventResolver contract linked
- [ ] Signers added to EventResolver
- [ ] Webhook signers added to DepositManager
- [ ] Platform fee percentage set correctly

### Monitoring
- [ ] Event monitoring setup
- [ ] Transaction alerts configured
- [ ] Backup plan documented
- [ ] Emergency pause procedure tested

---

*Last Updated: 2026-05-21*
