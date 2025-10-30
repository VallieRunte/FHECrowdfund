const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Starting ZeroFund Optimized deployment to Sepolia...");
    
    const [deployer] = await ethers.getSigners();
    console.log("📝 Deploying with account:", deployer.address);
    
    const balance = await deployer.provider.getBalance(deployer.address);
    console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

    if (balance < ethers.parseEther("0.01")) {
        throw new Error("❌ Insufficient balance for deployment. Need at least 0.01 ETH");
    }

    // Treasury address (using deployer for demo, should be multisig in production)
    const treasuryAddress = deployer.address;

    console.log("⏳ Deploying ZeroFundOptimized contract...");
    
    // Get contract factory
    const ZeroFundOptimized = await ethers.getContractFactory("ZeroFundOptimized");
    
    // Deploy with gas optimization settings
    const contract = await ZeroFundOptimized.deploy(treasuryAddress, {
        gasLimit: 3000000, // Set reasonable gas limit
        gasPrice: ethers.parseUnits("20", "gwei") // 20 gwei gas price for faster inclusion
    });

    console.log("⏳ Waiting for deployment confirmation...");
    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();
    console.log("✅ ZeroFundOptimized deployed successfully!");
    console.log("📍 Contract address:", contractAddress);
    console.log("🏛️ Treasury address:", treasuryAddress);

    // Verify deployment
    console.log("🔍 Verifying deployment...");
    const deployedCode = await deployer.provider.getCode(contractAddress);
    if (deployedCode === "0x") {
        throw new Error("❌ Contract deployment failed - no code at address");
    }

    // Get initial contract state
    const nextCampaignId = await contract.nextCampaignId();
    const platformFeeRate = await contract.platformFeeRate();
    const owner = await contract.owner();

    console.log("\n📊 Contract State:");
    console.log("   Next Campaign ID:", nextCampaignId.toString());
    console.log("   Platform Fee Rate:", platformFeeRate.toString(), "basis points (", (Number(platformFeeRate) / 100), "%)");
    console.log("   Owner:", owner);

    // Calculate deployment cost
    const deploymentTx = contract.deploymentTransaction();
    if (deploymentTx) {
        const receipt = await deploymentTx.wait();
        const gasUsed = receipt.gasUsed;
        const gasPrice = deploymentTx.gasPrice;
        const deploymentCost = gasUsed * gasPrice;
        
        console.log("\n⛽ Gas Usage:");
        console.log("   Gas Used:", gasUsed.toString());
        console.log("   Gas Price:", ethers.formatUnits(gasPrice, "gwei"), "gwei");
        console.log("   Deployment Cost:", ethers.formatEther(deploymentCost), "ETH");
    }

    // Display Etherscan link
    console.log("\n🌐 View on Etherscan:");
    console.log("   https://sepolia.etherscan.io/address/" + contractAddress);

    // Save deployment info to file
    const deploymentInfo = {
        contractName: "ZeroFundOptimized",
        contractAddress: contractAddress,
        network: "sepolia",
        deployer: deployer.address,
        treasury: treasuryAddress,
        deployedAt: new Date().toISOString(),
        transactionHash: deploymentTx ? deploymentTx.hash : "unknown",
        gasUsed: deploymentTx ? (await deploymentTx.wait()).gasUsed.toString() : "unknown"
    };

    const fs = require('fs');
    const path = require('path');
    
    // Create deployments directory if it doesn't exist
    const deploymentsDir = path.join(__dirname, '..', 'deployments');
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }
    
    const deploymentFile = path.join(deploymentsDir, 'sepolia-optimized.json');
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    
    console.log("💾 Deployment info saved to:", deploymentFile);

    console.log("\n✨ Deployment completed successfully!");
    console.log("🔗 Contract ready for interaction at:", contractAddress);
    
    return {
        contract,
        address: contractAddress,
        deploymentInfo
    };
}

// Handle deployment
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error("❌ Deployment failed:", error);
            process.exit(1);
        });
}

module.exports = main;