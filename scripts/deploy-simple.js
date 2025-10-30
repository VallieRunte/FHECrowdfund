const hre = require("hardhat");

async function main() {
    console.log("🚀 Deploying CrowdfundPlatform Contract...");

    // Get the ContractFactory and Signers
    const [deployer] = await hre.ethers.getSigners();
    console.log("🔧 Deploying with account:", deployer.address);
    
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
    console.log("🌐 Network:", hre.network.name);
    
    // Test basic functionality
    console.log("\n🧪 Testing contract...");
    const count = await crowdfundPlatform.getCampaignCount();
    console.log("📊 Initial campaign count:", count.toString());

    console.log("\n🎉 Deployment completed successfully!");
    console.log("📋 Contract Address:", contractAddress);
    
    if (hre.network.name === "sepolia") {
        console.log("🔍 Etherscan:", `https://sepolia.etherscan.io/address/${contractAddress}`);
        console.log("\n📝 To verify on Etherscan:");
        console.log(`npx hardhat verify --network sepolia ${contractAddress}`);
    }
    
    console.log("🌐 Frontend ready at: http://localhost:3000");
    console.log("\n💡 Next steps:");
    console.log("1. Update frontend contract address");
    console.log("2. Connect MetaMask wallet");
    console.log("3. Test creating investment funds");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });