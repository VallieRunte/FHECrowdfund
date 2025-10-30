const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");
const { ignition, ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Import the deployment module
const ZeroFundProtocolModule = require("../ignition/modules/ZeroFundProtocol");

async function main() {
    console.log("🚀 Starting ZeroFund Protocol Deployment with Hardhat Ignition...\n");

    try {
        // Get network info
        const network = await ethers.provider.getNetwork();
        console.log("📍 Network:", hre.network.name);
        console.log("🔗 Chain ID:", network.chainId.toString());
        
        // Get deployer
        const [deployer] = await ethers.getSigners();
        console.log("📝 Deploying with account:", deployer.address);
        
        const balance = await ethers.provider.getBalance(deployer.address);
        console.log("💰 Account balance:", ethers.formatEther(balance), "ETH\n");

        // Deploy using Ignition
        console.log("🔧 Deploying contracts with Hardhat Ignition...");
        const { privacyUtils, zeroToken, zeroFund, anonymousDEX } = await ignition.deploy(
            ZeroFundProtocolModule,
            {
                parameters: {
                    treasury: deployer.address,
                    feeCollector: deployer.address
                }
            }
        );

        // Get deployed addresses
        const privacyUtilsAddress = await privacyUtils.getAddress();
        const zeroTokenAddress = await zeroToken.getAddress();
        const zeroFundAddress = await zeroFund.getAddress();
        const anonymousDEXAddress = await anonymousDEX.getAddress();

        console.log("✅ Deployment completed successfully!\n");
        
        // Display contract addresses
        console.log("📜 Contract Addresses:");
        console.log("- PrivacyUtils:", privacyUtilsAddress);
        console.log("- ZeroToken:", zeroTokenAddress);
        console.log("- ZeroFund:", zeroFundAddress);
        console.log("- AnonymousDEX:", anonymousDEXAddress);

        // Create deployment info
        const deploymentInfo = {
            network: hre.network.name,
            chainId: network.chainId.toString(),
            timestamp: new Date().toISOString(),
            deployer: deployer.address,
            contracts: {
                PrivacyUtils: privacyUtilsAddress,
                ZeroToken: zeroTokenAddress,
                ZeroFund: zeroFundAddress,
                AnonymousDEX: anonymousDEXAddress
            }
        };

        // Save deployment info
        const deploymentsDir = path.join(__dirname, "..", "deployments");
        if (!fs.existsSync(deploymentsDir)) {
            fs.mkdirSync(deploymentsDir);
        }

        const deploymentFile = path.join(deploymentsDir, `${hre.network.name}-deployment.json`);
        fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
        console.log("\n💾 Deployment info saved to:", deploymentFile);

        // Update frontend contract addresses
        const frontendAppPath = path.join(__dirname, "..", "frontend", "public", "app.js");
        if (fs.existsSync(frontendAppPath)) {
            let appContent = fs.readFileSync(frontendAppPath, 'utf8');
            
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

        // Display next steps
        console.log("\n🚀 Next Steps:");
        console.log("1. Start the frontend: npm run frontend");
        console.log("2. Open http://localhost:3000 in your browser");
        console.log("3. Connect MetaMask wallet");
        console.log("4. Add local network to MetaMask if needed:");
        console.log("   - Network Name: Hardhat Local");
        console.log("   - RPC URL: http://localhost:8545");
        console.log("   - Chain ID: 31337");
        console.log("   - Currency Symbol: ETH");

        return deploymentInfo;

    } catch (error) {
        console.error("❌ Deployment failed:", error);
        throw error;
    }
}

// Handle both direct execution and module export
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { main };