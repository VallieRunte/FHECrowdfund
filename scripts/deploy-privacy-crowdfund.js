const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("🚀 Deploying Crowdfund Platform Contract to Sepolia...");

    // Get the ContractFactory and Signers
    const [deployer] = await hre.ethers.getSigners();
    console.log("🔧 Deploying contracts with account:", deployer.address);
    
    // Check deployer balance
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH");

    // Deploy CrowdfundPlatform contract
    console.log("\n📦 Deploying CrowdfundPlatform contract...");
    const CrowdfundPlatform = await hre.ethers.getContractFactory("CrowdfundPlatform");
    const crowdfundPlatform = await CrowdfundPlatform.deploy();
    
    await crowdfundPlatform.waitForDeployment();
    const contractAddress = await crowdfundPlatform.getAddress();
    
    console.log("✅ CrowdfundPlatform deployed to:", contractAddress);

    // Update frontend with contract address
    const configPath = path.join(__dirname, '../frontend/public/app-new.js');
    let appJs = fs.readFileSync(configPath, 'utf8');
    
    // Replace contract address in app-new.js
    const addressRegex = /CrowdfundPlatform: "0x[a-fA-F0-9]{40}"/;
    appJs = appJs.replace(addressRegex, `CrowdfundPlatform: "0x8eC52211B260EA1DAf06264Bcc7C95F24e84559e"`);
    
    fs.writeFileSync(configPath, appJs);
    console.log("✅ Updated frontend with deployed contract address");

    // Save deployment info
    const deploymentInfo = {
        network: hre.network.name,
        contractAddress: contractAddress,
        deployer: deployer.address,
        deployedAt: new Date().toISOString(),
        txHash: crowdfundPlatform.deploymentTransaction()?.hash
    };

    fs.writeFileSync(
        path.join(__dirname, '../deployments/privacy-crowdfund.json'),
        JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("\n🎉 Deployment completed successfully!");
    console.log("📋 Contract Address:", contractAddress);
    console.log("🔍 Etherscan:", `https://sepolia.etherscan.io/address/${contractAddress}`);
    console.log("🌐 Frontend ready at: http://localhost:3000");
    
    // Verification instructions
    console.log("\n📝 To verify on Etherscan:");
    console.log(`npx hardhat verify --network sepolia ${contractAddress}`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });