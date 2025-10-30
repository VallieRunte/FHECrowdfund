const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("========================================");
  console.log("Campaign Lifecycle Simulation");
  console.log("========================================\n");

  // Get network information
  const network = await hre.ethers.provider.getNetwork();
  const [creator, contributor1, contributor2, contributor3] = await hre.ethers.getSigners();

  console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`Creator: ${creator.address}`);
  console.log(`Contributor 1: ${contributor1.address}`);
  console.log(`Contributor 2: ${contributor2.address}`);
  console.log(`Contributor 3: ${contributor3.address}\n`);

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

  console.log(`Loading contract at: ${contractAddress}\n`);

  // Get contract instance
  const CrowdfundPlatform = await hre.ethers.getContractFactory("CrowdfundPlatform");
  const contract = CrowdfundPlatform.attach(contractAddress);

  console.log("========================================");
  console.log("Scenario 1: Successful Campaign");
  console.log("========================================\n");

  // Step 1: Create campaign
  console.log("Step 1: Creating campaign...");
  const targetAmount = hre.ethers.parseEther("2.0"); // 2 ETH target
  const duration = 30 * 24 * 60 * 60; // 30 days
  const encryptedTarget = hre.ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [targetAmount]);

  const createTx = await contract.connect(creator).createCampaign(
    encryptedTarget,
    duration,
    "Innovative DeFi Project",
    "Building the next generation decentralized finance platform"
  );

  let receipt = await createTx.wait();
  const event = receipt.logs.find(log => {
    try {
      return contract.interface.parseLog(log).name === 'CampaignCreated';
    } catch (e) {
      return false;
    }
  });

  const campaignId = contract.interface.parseLog(event).args[0];
  console.log(`  Campaign created with ID: ${campaignId}`);
  console.log(`  Gas Used: ${receipt.gasUsed.toString()}\n`);

  // Step 2: First contribution
  console.log("Step 2: First contribution (0.5 ETH)...");
  const contribution1 = hre.ethers.parseEther("0.5");
  const encrypted1 = hre.ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [contribution1]);

  const contrib1Tx = await contract.connect(contributor1).contribute(
    campaignId,
    encrypted1,
    { value: contribution1 }
  );

  receipt = await contrib1Tx.wait();
  console.log(`  Contribution successful`);
  console.log(`  Gas Used: ${receipt.gasUsed.toString()}\n`);

  // Step 3: Second contribution
  console.log("Step 3: Second contribution (0.8 ETH)...");
  const contribution2 = hre.ethers.parseEther("0.8");
  const encrypted2 = hre.ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [contribution2]);

  const contrib2Tx = await contract.connect(contributor2).contribute(
    campaignId,
    encrypted2,
    { value: contribution2 }
  );

  receipt = await contrib2Tx.wait();
  console.log(`  Contribution successful`);
  console.log(`  Gas Used: ${receipt.gasUsed.toString()}\n`);

  // Step 4: Third contribution
  console.log("Step 4: Third contribution (1.2 ETH)...");
  const contribution3 = hre.ethers.parseEther("1.2");
  const encrypted3 = hre.ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [contribution3]);

  const contrib3Tx = await contract.connect(contributor3).contribute(
    campaignId,
    encrypted3,
    { value: contribution3 }
  );

  receipt = await contrib3Tx.wait();
  console.log(`  Contribution successful`);
  console.log(`  Gas Used: ${receipt.gasUsed.toString()}\n`);

  // Step 5: Check goal status
  console.log("Step 5: Checking goal status...");
  const goalReached = await contract.checkGoalReached(campaignId);
  console.log(`  Goal Reached: ${goalReached}\n`);

  // Step 6: View campaign info
  console.log("Step 6: Campaign status...");
  const info = await contract.getCampaignInfo(campaignId);
  console.log(`  Creator: ${info[0]}`);
  console.log(`  Deadline: ${new Date(Number(info[1]) * 1000).toISOString()}`);
  console.log(`  Active: ${info[2]}`);
  console.log(`  Goal Reached: ${info[3]}`);
  console.log(`  Title: ${info[4]}\n`);

  // Step 7: Check individual contributions
  console.log("Step 7: Individual contributions...");
  const contrib1Amount = await contract.connect(contributor1).getMyContribution(campaignId);
  const contrib2Amount = await contract.connect(contributor2).getMyContribution(campaignId);
  const contrib3Amount = await contract.connect(contributor3).getMyContribution(campaignId);

  console.log(`  Contributor 1: ${contrib1Amount} (encrypted hash)`);
  console.log(`  Contributor 2: ${contrib2Amount} (encrypted hash)`);
  console.log(`  Contributor 3: ${contrib3Amount} (encrypted hash)\n`);

  // Step 8: Check balances
  console.log("Step 8: Contributor balances...");
  const balance1 = await contract.connect(contributor1).getMyBalance();
  const balance2 = await contract.connect(contributor2).getMyBalance();
  const balance3 = await contract.connect(contributor3).getMyBalance();

  console.log(`  Contributor 1: ${hre.ethers.formatEther(balance1)} ETH`);
  console.log(`  Contributor 2: ${hre.ethers.formatEther(balance2)} ETH`);
  console.log(`  Contributor 3: ${hre.ethers.formatEther(balance3)} ETH\n`);

  // Summary
  console.log("========================================");
  console.log("Simulation Summary");
  console.log("========================================");
  console.log(`Campaign ID: ${campaignId}`);
  console.log(`Total Contributions: 3`);
  console.log(`Total Amount: ${hre.ethers.formatEther(contribution1 + contribution2 + contribution3)} ETH`);
  console.log(`Goal Status: ${goalReached ? 'Reached' : 'Not Reached'}`);
  console.log(`Campaign Active: ${info[2]}`);
  console.log("========================================\n");

  console.log("Simulation completed successfully!");
  console.log("\nNote: This simulation demonstrates:");
  console.log("- Campaign creation");
  console.log("- Multiple contributions from different users");
  console.log("- Goal tracking");
  console.log("- Balance management");
  console.log("- Event emission and logging\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nSimulation failed:");
    console.error(error);
    process.exit(1);
  });
