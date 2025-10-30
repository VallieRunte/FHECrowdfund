const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🚀 Starting ZeroFund Protocol Deployment...\n");

    // Get deployer
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Deploying contracts with account:", deployer.address);
    
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH\n");

    // Deploy PrivacyUtils first
    console.log("🔧 Deploying PrivacyUtils...");
    const PrivacyUtils = await hre.ethers.getContractFactory("PrivacyUtils");
    const privacyUtils = await PrivacyUtils.deploy();
    await privacyUtils.waitForDeployment();
    const privacyUtilsAddress = await privacyUtils.getAddress();
    console.log("✅ PrivacyUtils deployed to:", privacyUtilsAddress);

    // Deploy ZeroToken
    console.log("\n🪙 Deploying ZeroToken...");
    const ZeroToken = await hre.ethers.getContractFactory("ZeroToken");
    const zeroToken = await ZeroToken.deploy();
    await zeroToken.waitForDeployment();
    const zeroTokenAddress = await zeroToken.getAddress();
    console.log("✅ ZeroToken deployed to:", zeroTokenAddress);

    // Deploy ZeroFund (main crowdfunding contract)
    console.log("\n🏛️ Deploying ZeroFund...");
    const ZeroFund = await hre.ethers.getContractFactory("ZeroFund");
    const zeroFund = await ZeroFund.deploy(deployer.address); // Treasury = deployer
    await zeroFund.waitForDeployment();
    const zeroFundAddress = await zeroFund.getAddress();
    console.log("✅ ZeroFund deployed to:", zeroFundAddress);

    // Deploy AnonymousDEX
    console.log("\n💱 Deploying AnonymousDEX...");
    const AnonymousDEX = await hre.ethers.getContractFactory("AnonymousDEX");
    const anonymousDEX = await AnonymousDEX.deploy(deployer.address); // Fee collector = deployer
    await anonymousDEX.waitForDeployment();
    const anonymousDEXAddress = await anonymousDEX.getAddress();
    console.log("✅ AnonymousDEX deployed to:", anonymousDEXAddress);

    // Setup permissions and configurations
    console.log("\n⚙️ Setting up contracts...");
    
    // Authorize ZeroFund contract as minter for ZeroToken
    try {
        const authTx = await zeroToken.authorizeMinter(zeroFundAddress);
        await authTx.wait();
        console.log("✅ ZeroFund authorized as token minter");
    } catch (error) {
        console.log("⚠️ Failed to authorize minter:", error.message);
    }

    // Create deployment summary
    const deploymentInfo = {
        network: hre.network.name,
        chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
        timestamp: new Date().toISOString(),
        deployer: deployer.address,
        contracts: {
            PrivacyUtils: privacyUtilsAddress,
            ZeroToken: zeroTokenAddress,
            ZeroFund: zeroFundAddress,
            AnonymousDEX: anonymousDEXAddress
        },
        gasUsed: "Calculating...",
        constructorArgs: {
            ZeroFund: [deployer.address],
            AnonymousDEX: [deployer.address],
            ZeroToken: [],
            PrivacyUtils: []
        }
    };

    // Save deployment info
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir);
    }

    const deploymentFile = path.join(deploymentsDir, `${hre.network.name}-deployment.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

    // Update frontend contract addresses
    const frontendAppPath = path.join(__dirname, "..", "frontend", "public", "app.js");
    if (fs.existsSync(frontendAppPath)) {
        let appContent = fs.readFileSync(frontendAppPath, 'utf8');
        
        // Update contract addresses in the frontend
        appContent = appContent.replace(
            /ZeroFund: "0x[0-9a-fA-F]{40}"/,
            `ZeroFund: "${zeroFundAddress}"`
        );
        appContent = appContent.replace(
            /AnonymousDEX: "0x[0-9a-fA-F]{40}"/,
            `AnonymousDEX: "${anonymousDEXAddress}"`
        );
        appContent = appContent.replace(
            /ZeroToken: "0x[0-9a-fA-F]{40}"/,
            `ZeroToken: "${zeroTokenAddress}"`
        );
        appContent = appContent.replace(
            /PrivacyUtils: "0x[0-9a-fA-F]{40}"/,
            `PrivacyUtils: "${privacyUtilsAddress}"`
        );

        fs.writeFileSync(frontendAppPath, appContent);
        console.log("✅ Frontend contract addresses updated");
    }

    // Print deployment summary
    console.log("\n🎉 DEPLOYMENT COMPLETED!");
    console.log("=" * 50);
    console.log("📋 Deployment Summary:");
    console.log("- Network:", hre.network.name);
    console.log("- Chain ID:", deploymentInfo.chainId);
    console.log("- Deployer:", deployer.address);
    console.log("\n📜 Contract Addresses:");
    console.log("- PrivacyUtils:", privacyUtilsAddress);
    console.log("- ZeroToken:", zeroTokenAddress);
    console.log("- ZeroFund:", zeroFundAddress);
    console.log("- AnonymousDEX:", anonymousDEXAddress);
    console.log("\n💾 Deployment info saved to:", deploymentFile);

    // Verification commands (for testnets)
    if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
        console.log("\n🔍 Verification Commands:");
        console.log(`npx hardhat verify --network ${hre.network.name} ${privacyUtilsAddress}`);
        console.log(`npx hardhat verify --network ${hre.network.name} ${zeroTokenAddress}`);
        console.log(`npx hardhat verify --network ${hre.network.name} ${zeroFundAddress} "${deployer.address}"`);
        console.log(`npx hardhat verify --network ${hre.network.name} ${anonymousDEXAddress} "${deployer.address}"`);
    }

    return deploymentInfo;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });