const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("========================================");
  console.log("Contract Interaction Script");
  console.log("========================================\n");

  // Get network information
  const network = await hre.ethers.provider.getNetwork();
  const [signer] = await hre.ethers.getSigners();

  console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`Signer Address: ${signer.address}\n`);

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

  console.log("Loading contract...");
  console.log(`  Contract Address: ${contractAddress}\n`);

  // Get contract instance
  const CrowdfundPlatform = await hre.ethers.getContractFactory("CrowdfundPlatform");
  const contract = CrowdfundPlatform.attach(contractAddress);

  // Display menu
  console.log("Available Interactions:");
  console.log("1. View campaign count");
  console.log("2. Create a new campaign");
  console.log("3. View campaign information");
  console.log("4. Contribute to a campaign");
  console.log("5. Check campaign goal status");
  console.log("6. View my contribution");
  console.log("7. View my balance");
  console.log("8. Check all campaigns\n");

  // Example: Get campaign count
  console.log("Fetching campaign count...");
  const campaignCount = await contract.getCampaignCount();
  console.log(`  Total Campaigns: ${campaignCount}\n`);

  // Example: Create a new campaign
  console.log("Creating a test campaign...");
  const campaignTitle = "Test Campaign";
  const campaignDescription = "This is a test campaign for demonstration purposes";
  const targetAmount = hre.ethers.parseEther("1.0"); // 1 ETH target
  const duration = 7 * 24 * 60 * 60; // 7 days in seconds

  // Encode target amount as encrypted data (simulated)
  const encryptedTarget = hre.ethers.AbiCoder.defaultAbiCoder().encode(
    ["uint256"],
    [targetAmount]
  );

  try {
    const tx = await contract.createCampaign(
      encryptedTarget,
      duration,
      campaignTitle,
      campaignDescription
    );

    console.log(`  Transaction Hash: ${tx.hash}`);
    console.log("  Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log(`  Campaign created successfully!`);
    console.log(`  Block Number: ${receipt.blockNumber}`);
    console.log(`  Gas Used: ${receipt.gasUsed.toString()}\n`);

    // Get the new campaign ID from the event
    const event = receipt.logs.find(log => {
      try {
        return contract.interface.parseLog(log).name === 'CampaignCreated';
      } catch (e) {
        return false;
      }
    });

    if (event) {
      const parsedEvent = contract.interface.parseLog(event);
      const campaignId = parsedEvent.args[0];
      console.log(`  New Campaign ID: ${campaignId}\n`);

      // Get campaign information
      console.log("Fetching campaign information...");
      const campaignInfo = await contract.getCampaignInfo(campaignId);
      console.log("  Campaign Details:");
      console.log(`    Creator: ${campaignInfo[0]}`);
      console.log(`    Deadline: ${new Date(Number(campaignInfo[1]) * 1000).toISOString()}`);
      console.log(`    Active: ${campaignInfo[2]}`);
      console.log(`    Goal Reached: ${campaignInfo[3]}`);
      console.log(`    Title: ${campaignInfo[4]}`);
      console.log(`    Description: ${campaignInfo[5]}\n`);
    }

  } catch (error) {
    console.error("  Error creating campaign:", error.message, "\n");
  }

  // Example: View total campaigns again
  console.log("Fetching updated campaign count...");
  const newCampaignCount = await contract.getCampaignCount();
  console.log(`  Total Campaigns: ${newCampaignCount}\n`);

  // Display useful commands
  console.log("========================================");
  console.log("Useful Commands");
  console.log("========================================");
  console.log("View campaign info:");
  console.log(`  const info = await contract.getCampaignInfo(campaignId);\n`);
  console.log("Contribute to campaign:");
  console.log(`  const amount = ethers.parseEther("0.1");`);
  console.log(`  const encrypted = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [amount]);`);
  console.log(`  await contract.contribute(campaignId, encrypted, { value: amount });\n`);
  console.log("Check goal reached:");
  console.log(`  const reached = await contract.checkGoalReached(campaignId);\n`);
  console.log("========================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nInteraction failed:");
    console.error(error);
    process.exit(1);
  });
