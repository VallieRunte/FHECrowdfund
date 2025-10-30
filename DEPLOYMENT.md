# Deployment Guide

## Overview

This document provides comprehensive instructions for deploying and managing the CrowdfundPlatform smart contract using the Hardhat development framework.

## Prerequisites

### Required Tools

- Node.js (v16 or higher)
- npm or yarn package manager
- MetaMask or similar Web3 wallet
- Alchemy or Infura account for RPC access

### Required API Keys

1. **Alchemy/Infura API Key**: For Sepolia testnet RPC access
   - Sign up at https://www.alchemy.com or https://infura.io
   - Create a new project
   - Copy the API key

2. **Etherscan API Key**: For contract verification
   - Sign up at https://etherscan.io
   - Navigate to https://etherscan.io/myapikey
   - Create a new API key

3. **Private Key**: Your wallet's private key
   - Export from MetaMask (Account Details > Export Private Key)
   - **IMPORTANT**: Never commit this to version control

## Installation

### 1. Clone and Install Dependencies

```bash
cd /path/to/project
npm install
```

### 2. Environment Configuration

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit the `.env` file with your credentials:

```env
# Network Configuration
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_API_KEY
PRIVATE_KEY=your_private_key_here_without_0x_prefix

# Etherscan Configuration
ETHERSCAN_API_KEY=your_etherscan_api_key_here

# Optional Configuration
REPORT_GAS=false
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key_here
```

**Security Note**: Ensure `.env` is in your `.gitignore` file.

## Compilation

Compile the smart contracts:

```bash
npx hardhat compile
```

Expected output:
```
Compiled 1 Solidity file successfully
```

## Testing

### Local Testing

Run tests on the Hardhat network:

```bash
npx hardhat test
```

### Test Coverage

Generate coverage report:

```bash
npx hardhat coverage
```

## Deployment

### Deployment to Sepolia Testnet

#### Step 1: Verify Configuration

Ensure your `.env` file is properly configured with:
- Valid Sepolia RPC URL
- Account private key with sufficient SepoliaETH
- Etherscan API key

#### Step 2: Get Test ETH

Obtain SepoliaETH from faucets:
- https://sepoliafaucet.com
- https://www.alchemy.com/faucets/ethereum-sepolia
- https://sepolia-faucet.pk910.de

#### Step 3: Run Deployment

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

Expected output:
```
========================================
Starting Crowdfund Platform Deployment
========================================

Network Information:
  Network Name: sepolia
  Chain ID: 11155111
  Deployer Address: 0x...
  Deployer Balance: X.XXX ETH

Deploying CrowdfundPlatform contract...
Contract deployed successfully in X.XXs
  Contract Address: 0x...

Deployment Transaction:
  Transaction Hash: 0x...
  Block Number: XXXXXX
  Gas Used: XXXXXX

Verifying contract initialization...
  Initial Campaign ID: 1
  Total Campaigns: 0

Deployment information saved to: deployments/sepolia_deployment.json

========================================
Deployment Summary
========================================
Contract: CrowdfundPlatform
Address: 0x...
Network: sepolia (Chain ID: 11155111)
Deployer: 0x...
Etherscan: https://sepolia.etherscan.io/address/0x...
========================================
```

#### Step 4: Save Deployment Information

The deployment script automatically saves deployment information to:
```
deployments/sepolia_deployment.json
```

This file contains:
- Contract address
- Deployer address
- Deployment timestamp
- Transaction hash
- Block number
- Compiler settings

## Contract Verification

Verify the contract on Etherscan:

```bash
npx hardhat run scripts/verify.js --network sepolia
```

Alternative manual verification:

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS>
```

Expected output:
```
========================================
Contract Verification on Etherscan
========================================

Network: sepolia (Chain ID: 11155111)

Deployment Information:
  Contract: CrowdfundPlatform
  Address: 0x...
  Deployer: 0x...
  Deployed At: 2025-XX-XXTXX:XX:XX.XXXZ

Starting verification process...

Successfully submitted source code for contract verification
Contract Address: 0x...
Etherscan Link: https://sepolia.etherscan.io/address/0x...#code

========================================
Verification Complete
========================================
```

## Post-Deployment

### Contract Interaction

Use the interaction script to test contract functionality:

```bash
npx hardhat run scripts/interact.js --network sepolia
```

This script demonstrates:
- Viewing campaign count
- Creating campaigns
- Viewing campaign information
- Contributing to campaigns
- Checking goal status

### Simulation Testing

Run end-to-end simulations:

```bash
npx hardhat run scripts/simulate.js --network sepolia
```

This simulates:
- Campaign creation
- Multiple contributions
- Goal tracking
- Balance management

## Network Information

### Sepolia Testnet

- **Network Name**: Sepolia
- **Chain ID**: 11155111
- **RPC URL**: https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
- **Block Explorer**: https://sepolia.etherscan.io
- **Faucet**: https://sepoliafaucet.com

### Ethereum Mainnet

- **Network Name**: Mainnet
- **Chain ID**: 1
- **RPC URL**: https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
- **Block Explorer**: https://etherscan.io

**Warning**: Deploying to mainnet requires real ETH. Test thoroughly on testnet first.

## Deployment Checklist

- [ ] Install all dependencies
- [ ] Configure `.env` file with valid credentials
- [ ] Compile contracts successfully
- [ ] Run and pass all tests
- [ ] Obtain sufficient testnet ETH
- [ ] Deploy to testnet
- [ ] Verify deployment transaction
- [ ] Verify contract on Etherscan
- [ ] Test contract interaction
- [ ] Run simulation tests
- [ ] Document contract address
- [ ] Update frontend configuration (if applicable)

## Common Issues and Solutions

### Issue: "Insufficient funds"

**Solution**: Ensure your account has enough ETH for gas fees. Use faucets to obtain testnet ETH.

### Issue: "Nonce too high"

**Solution**: Reset your MetaMask account or wait for pending transactions to complete.

### Issue: "Contract verification failed"

**Solution**:
- Wait 1-2 minutes after deployment before verifying
- Ensure Etherscan API key is valid
- Check that you're using the correct network

### Issue: "Invalid private key"

**Solution**:
- Ensure private key is in correct format (64 hex characters)
- Remove any `0x` prefix from the private key
- Verify the private key is from a funded account

## Hardhat Tasks

### Useful Commands

```bash
# Compile contracts
npx hardhat compile

# Run tests
npx hardhat test

# Deploy to network
npx hardhat run scripts/deploy.js --network <network-name>

# Verify contract
npx hardhat verify --network <network-name> <contract-address>

# Start local node
npx hardhat node

# Clean artifacts
npx hardhat clean

# Check contract size
npx hardhat size-contracts

# Generate gas report
REPORT_GAS=true npx hardhat test
```

## Security Considerations

1. **Private Key Security**
   - Never commit private keys to version control
   - Use environment variables for sensitive data
   - Consider using hardware wallets for mainnet

2. **Contract Auditing**
   - Conduct thorough testing before mainnet deployment
   - Consider professional security audits
   - Use established security patterns

3. **Access Control**
   - Verify all access control mechanisms
   - Test authorization logic thoroughly
   - Implement emergency pause mechanisms if needed

## Support and Resources

- **Hardhat Documentation**: https://hardhat.org/docs
- **Ethers.js Documentation**: https://docs.ethers.org
- **Sepolia Faucet**: https://sepoliafaucet.com
- **Etherscan**: https://etherscan.io
- **OpenZeppelin**: https://docs.openzeppelin.com

## Contract Information

### CrowdfundPlatform

**Contract Address**: (To be updated after deployment)

**Network**: Sepolia Testnet

**Etherscan Link**: (To be updated after deployment)

**Deployment Date**: (To be updated after deployment)

**Deployer**: (To be updated after deployment)

**Verification Status**: (To be updated after verification)

---

**Last Updated**: 2025-10-30
