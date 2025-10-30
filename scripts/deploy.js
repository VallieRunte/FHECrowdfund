const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("========================================");
  console.log("Starting Crowdfund Platform Deployment");
  console.log("========================================\n");

  // Get network information
  const network = await hre.ethers.provider.getNetwork();
  const [deployer] = await hre.ethers.getSigners();
  const balance = await hre.ethers.provider.getBalance(deployer.address);

  console.log("Network Information:");
  console.log(`  Network Name: ${network.name}`);
  console.log(`  Chain ID: ${network.chainId}`);
  console.log(`  Deployer Address: ${deployer.address}`);
  console.log(`  Deployer Balance: ${hre.ethers.formatEther(balance)} ETH\n`);

  // Deploy contract
  console.log("Deploying CrowdfundPlatform contract...");
  const CrowdfundPlatform = await hre.ethers.getContractFactory("CrowdfundPlatform");

  const startTime = Date.now();
  const contract = await CrowdfundPlatform.deploy();
  await contract.waitForDeployment();
  const deployTime = ((Date.now() - startTime) / 1000).toFixed(2);

  const contractAddress = await contract.getAddress();
  console.log(`Contract deployed successfully in ${deployTime}s`);
  console.log(`  Contract Address: ${contractAddress}\n`);

  // Get deployment transaction details
  const deployTx = contract.deploymentTransaction();
  if (deployTx) {
    console.log("Deployment Transaction:");
    console.log(`  Transaction Hash: ${deployTx.hash}`);
    console.log(`  Block Number: ${deployTx.blockNumber || 'Pending'}`);
    console.log(`  Gas Used: ${deployTx.gasLimit ? deployTx.gasLimit.toString() : 'N/A'}\n`);
  }

  // Verify contract state
  console.log("Verifying contract initialization...");
  const nextCampaignId = await contract.nextCampaignId();
  const totalCampaigns = await contract.totalCampaigns();
  console.log(`  Initial Campaign ID: ${nextCampaignId}`);
  console.log(`  Total Campaigns: ${totalCampaigns}\n`);

  // Save deployment information
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId.toString(),
    contractAddress: contractAddress,
    contractName: "CrowdfundPlatform",
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
    transactionHash: deployTx ? deployTx.hash : null,
    blockNumber: deployTx ? deployTx.blockNumber : null,
    compiler: {
      version: "0.8.24",
      optimizer: true,
      runs: 200
    }
  };

  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save deployment info to JSON file
  const deploymentFile = path.join(deploymentsDir, `${network.name}_deployment.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`Deployment information saved to: ${deploymentFile}\n`);

  // Generate Etherscan link for verification
  let etherscanUrl = "";
  if (network.chainId === 11155111n) {
    etherscanUrl = `https://sepolia.etherscan.io/address/${contractAddress}`;
  } else if (network.chainId === 1n) {
    etherscanUrl = `https://etherscan.io/address/${contractAddress}`;
  }

  console.log("========================================");
  console.log("Deployment Summary");
  console.log("========================================");
  console.log(`Contract: CrowdfundPlatform`);
  console.log(`Address: ${contractAddress}`);
  console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  if (etherscanUrl) {
    console.log(`Etherscan: ${etherscanUrl}`);
  }
  console.log("========================================\n");

  console.log("Next Steps:");
  console.log("1. Verify contract on Etherscan:");
  console.log(`   npx hardhat run scripts/verify.js --network ${network.name}`);
  console.log("2. Interact with the contract:");
  console.log(`   npx hardhat run scripts/interact.js --network ${network.name}`);
  console.log("3. Run simulation tests:");
  console.log(`   npx hardhat run scripts/simulate.js --network ${network.name}\n`);

  return {
    contract,
    address: contractAddress,
    deployer: deployer.address,
    network: network.name
  };
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nDeployment failed:");
    console.error(error);
    process.exit(1);
  });

module.exports = main;
