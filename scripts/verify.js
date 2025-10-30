const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("========================================");
  console.log("Contract Verification on Etherscan");
  console.log("========================================\n");

  // Get network information
  const network = await hre.ethers.provider.getNetwork();
  console.log(`Network: ${network.name} (Chain ID: ${network.chainId})\n`);

  // Check if running on supported network
  if (network.chainId !== 11155111n && network.chainId !== 1n) {
    console.log("Note: Etherscan verification is only available for Ethereum mainnet and Sepolia testnet.");
    console.log("Current network is not supported for automatic verification.\n");
    return;
  }

  // Load deployment information
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  const deploymentFile = path.join(deploymentsDir, `${network.name}_deployment.json`);

  if (!fs.existsSync(deploymentFile)) {
    console.error(`Error: Deployment file not found at ${deploymentFile}`);
    console.error("Please deploy the contract first using: npx hardhat run scripts/deploy.js --network <network>\n");
    process.exit(1);
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
  const contractAddress = deploymentInfo.contractAddress;

  console.log("Deployment Information:");
  console.log(`  Contract: ${deploymentInfo.contractName}`);
  console.log(`  Address: ${contractAddress}`);
  console.log(`  Deployer: ${deploymentInfo.deployer}`);
  console.log(`  Deployed At: ${deploymentInfo.deploymentTime}\n`);

  // Check if Etherscan API key is configured
  if (!process.env.ETHERSCAN_API_KEY) {
    console.error("Error: ETHERSCAN_API_KEY not found in environment variables.");
    console.error("Please add your Etherscan API key to the .env file:\n");
    console.error("ETHERSCAN_API_KEY=your-api-key-here\n");
    console.error("Get your API key at: https://etherscan.io/myapikey\n");
    process.exit(1);
  }

  console.log("Starting verification process...\n");

  try {
    // Verify the contract
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: [],
      contract: "contracts/PrivacyCrowdfund.sol:CrowdfundPlatform"
    });

    console.log("\nVerification successful!\n");

    // Generate Etherscan link
    let etherscanUrl = "";
    if (network.chainId === 11155111n) {
      etherscanUrl = `https://sepolia.etherscan.io/address/${contractAddress}#code`;
    } else if (network.chainId === 1n) {
      etherscanUrl = `https://etherscan.io/address/${contractAddress}#code`;
    }

    console.log("========================================");
    console.log("Verification Complete");
    console.log("========================================");
    console.log(`Contract Address: ${contractAddress}`);
    console.log(`Etherscan Link: ${etherscanUrl}`);
    console.log("========================================\n");

    // Update deployment info with verification status
    deploymentInfo.verified = true;
    deploymentInfo.verificationTime = new Date().toISOString();
    deploymentInfo.etherscanUrl = etherscanUrl;
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

  } catch (error) {
    if (error.message.includes("Already Verified")) {
      console.log("Contract is already verified on Etherscan!\n");

      let etherscanUrl = "";
      if (network.chainId === 11155111n) {
        etherscanUrl = `https://sepolia.etherscan.io/address/${contractAddress}#code`;
      } else if (network.chainId === 1n) {
        etherscanUrl = `https://etherscan.io/address/${contractAddress}#code`;
      }

      console.log(`View on Etherscan: ${etherscanUrl}\n`);
    } else {
      console.error("\nVerification failed:");
      console.error(error.message);
      console.error("\nTroubleshooting tips:");
      console.error("1. Ensure your Etherscan API key is valid");
      console.error("2. Wait a few moments after deployment before verifying");
      console.error("3. Check that the contract was deployed successfully");
      console.error("4. Verify you're using the correct network\n");
      process.exit(1);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nVerification script failed:");
    console.error(error);
    process.exit(1);
  });
