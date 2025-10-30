const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🌐 Starting ZeroFund Protocol Deployment on Sepolia Testnet...\n");

    // Ensure we're on Sepolia
    const network = await hre.ethers.provider.getNetwork();
    if (network.chainId !== 11155111n) {
        throw new Error("This script is for Sepolia testnet only. Current chain ID: " + network.chainId);
    }

    // Get deployer
    const [deployer] = await hre.ethers.getSigners();
    console.log("📝 Deploying contracts with account:", deployer.address);
    
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH");
    
    if (balance < hre.ethers.parseEther("0.1")) {
        console.log("⚠️ WARNING: Low balance. Get Sepolia ETH from https://sepoliafaucet.com/");
    }
    console.log("");

    let totalGasUsed = 0n;

    // Deploy PrivacyUtils
    console.log("🔧 Deploying PrivacyUtils...");
    const PrivacyUtils = await hre.ethers.getContractFactory("PrivacyUtils");
    const privacyUtils = await PrivacyUtils.deploy();
    await privacyUtils.waitForDeployment();
    const privacyUtilsAddress = await privacyUtils.getAddress();
    console.log("✅ PrivacyUtils deployed to:", privacyUtilsAddress);
    
    const privacyUtilsReceipt = await hre.ethers.provider.getTransactionReceipt(privacyUtils.deploymentTransaction().hash);
    totalGasUsed += privacyUtilsReceipt.gasUsed;

    // Deploy ZeroToken
    console.log("\n🪙 Deploying ZeroToken...");
    const ZeroToken = await hre.ethers.getContractFactory("ZeroToken");
    const zeroToken = await ZeroToken.deploy();
    await zeroToken.waitForDeployment();
    const zeroTokenAddress = await zeroToken.getAddress();
    console.log("✅ ZeroToken deployed to:", zeroTokenAddress);
    
    const zeroTokenReceipt = await hre.ethers.provider.getTransactionReceipt(zeroToken.deploymentTransaction().hash);
    totalGasUsed += zeroTokenReceipt.gasUsed;

    // Deploy ZeroFund
    console.log("\n🏛️ Deploying ZeroFund...");
    const ZeroFund = await hre.ethers.getContractFactory("ZeroFund");
    const zeroFund = await ZeroFund.deploy(deployer.address);
    await zeroFund.waitForDeployment();
    const zeroFundAddress = await zeroFund.getAddress();
    console.log("✅ ZeroFund deployed to:", zeroFundAddress);
    
    const zeroFundReceipt = await hre.ethers.provider.getTransactionReceipt(zeroFund.deploymentTransaction().hash);
    totalGasUsed += zeroFundReceipt.gasUsed;

    // Deploy AnonymousDEX
    console.log("\n💱 Deploying AnonymousDEX...");
    const AnonymousDEX = await hre.ethers.getContractFactory("AnonymousDEX");
    const anonymousDEX = await AnonymousDEX.deploy(deployer.address);
    await anonymousDEX.waitForDeployment();
    const anonymousDEXAddress = await anonymousDEX.getAddress();
    console.log("✅ AnonymousDEX deployed to:", anonymousDEXAddress);
    
    const anonymousDEXReceipt = await hre.ethers.provider.getTransactionReceipt(anonymousDEX.deploymentTransaction().hash);
    totalGasUsed += anonymousDEXReceipt.gasUsed;

    // Setup contracts
    console.log("\n⚙️ Setting up contracts...");
    
    // Authorize ZeroFund as minter
    console.log("- Authorizing ZeroFund as token minter...");
    const authTx = await zeroToken.authorizeMinter(zeroFundAddress);
    const authReceipt = await authTx.wait();
    totalGasUsed += authReceipt.gasUsed;
    console.log("✅ Authorization complete");

    // Create detailed deployment info
    const deploymentInfo = {
        network: "sepolia",
        chainId: "11155111",
        timestamp: new Date().toISOString(),
        deployer: deployer.address,
        totalGasUsed: totalGasUsed.toString(),
        estimatedCostETH: hre.ethers.formatEther(totalGasUsed * 20000000000n), // Rough estimate
        contracts: {
            PrivacyUtils: {
                address: privacyUtilsAddress,
                txHash: privacyUtils.deploymentTransaction().hash,
                gasUsed: privacyUtilsReceipt.gasUsed.toString()
            },
            ZeroToken: {
                address: zeroTokenAddress,
                txHash: zeroToken.deploymentTransaction().hash,
                gasUsed: zeroTokenReceipt.gasUsed.toString()
            },
            ZeroFund: {
                address: zeroFundAddress,
                txHash: zeroFund.deploymentTransaction().hash,
                gasUsed: zeroFundReceipt.gasUsed.toString()
            },
            AnonymousDEX: {
                address: anonymousDEXAddress,
                txHash: anonymousDEX.deploymentTransaction().hash,
                gasUsed: anonymousDEXReceipt.gasUsed.toString()
            }
        },
        explorerLinks: {
            PrivacyUtils: `https://sepolia.etherscan.io/address/${privacyUtilsAddress}`,
            ZeroToken: `https://sepolia.etherscan.io/address/${zeroTokenAddress}`,
            ZeroFund: `https://sepolia.etherscan.io/address/${zeroFundAddress}`,
            AnonymousDEX: `https://sepolia.etherscan.io/address/${anonymousDEXAddress}`
        },
        zamaIntegration: {
            executorContract: "0x8eC52211B260EA1DAf06264Bcc7C95F24e84559e",
            aclContract: "0x8eC52211B260EA1DAf06264Bcc7C95F24e84559e",
            kmsVerifier: "0x8eC52211B260EA1DAf06264Bcc7C95F24e84559e",
            inputVerifier: "0x8eC52211B260EA1DAf06264Bcc7C95F24e84559e",
            relayerUrl: "https://relayer.testnet.zama.cloud"
        }
    };

    // Save deployment info
    const deploymentsDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir);
    }

    const deploymentFile = path.join(deploymentsDir, "sepolia-deployment.json");
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));

    // Create deployment links file
    const linksContent = `# ZeroFund Protocol - Sepolia Deployment Links

## Contract Addresses

- **PrivacyUtils**: \`${privacyUtilsAddress}\`
- **ZeroToken**: \`${zeroTokenAddress}\`
- **ZeroFund**: \`${zeroFundAddress}\`
- **AnonymousDEX**: \`${anonymousDEXAddress}\`

## Etherscan Links

- [PrivacyUtils](${deploymentInfo.explorerLinks.PrivacyUtils})
- [ZeroToken](${deploymentInfo.explorerLinks.ZeroToken})
- [ZeroFund](${deploymentInfo.explorerLinks.ZeroFund})
- [AnonymousDEX](${deploymentInfo.explorerLinks.AnonymousDEX})

## Zama FHE Integration

- **Executor Contract**: \`${deploymentInfo.zamaIntegration.executorContract}\`
- **ACL Contract**: \`${deploymentInfo.zamaIntegration.aclContract}\`
- **KMS Verifier**: \`${deploymentInfo.zamaIntegration.kmsVerifier}\`
- **Input Verifier**: \`${deploymentInfo.zamaIntegration.inputVerifier}\`
- **Relayer URL**: ${deploymentInfo.zamaIntegration.relayerUrl}

## Deployment Stats

- **Total Gas Used**: ${deploymentInfo.totalGasUsed}
- **Estimated Cost**: ~${deploymentInfo.estimatedCostETH} ETH
- **Deployment Date**: ${deploymentInfo.timestamp}
- **Deployer**: \`${deploymentInfo.deployer}\`
`;

    const linksFile = path.join(__dirname, "..", "DEPLOYMENT_LINKS.md");
    fs.writeFileSync(linksFile, linksContent);

    // Update frontend
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

    // Print comprehensive summary
    console.log("\n🎉 SEPOLIA DEPLOYMENT COMPLETED!");
    console.log("=" * 60);
    console.log("📋 Deployment Summary:");
    console.log("- Network: Sepolia Testnet");
    console.log("- Chain ID: 11155111");
    console.log("- Deployer:", deployer.address);
    console.log("- Total Gas Used:", totalGasUsed.toString());
    console.log("- Estimated Cost:", deploymentInfo.estimatedCostETH, "ETH");
    
    console.log("\n📜 Contract Addresses:");
    console.log("- PrivacyUtils:", privacyUtilsAddress);
    console.log("- ZeroToken:", zeroTokenAddress);
    console.log("- ZeroFund:", zeroFundAddress);
    console.log("- AnonymousDEX:", anonymousDEXAddress);

    console.log("\n🔍 Etherscan Links:");
    Object.entries(deploymentInfo.explorerLinks).forEach(([name, link]) => {
        console.log(`- ${name}: ${link}`);
    });

    console.log("\n💾 Files Created:");
    console.log("- Deployment info:", deploymentFile);
    console.log("- Deployment links:", linksFile);

    console.log("\n🔍 Verification Commands:");
    console.log(`npx hardhat verify --network sepolia ${privacyUtilsAddress}`);
    console.log(`npx hardhat verify --network sepolia ${zeroTokenAddress}`);
    console.log(`npx hardhat verify --network sepolia ${zeroFundAddress} "${deployer.address}"`);
    console.log(`npx hardhat verify --network sepolia ${anonymousDEXAddress} "${deployer.address}"`);

    console.log("\n🚀 Next Steps:");
    console.log("1. Verify contracts on Etherscan using the commands above");
    console.log("2. Start the frontend: cd frontend && npm install && npm start");
    console.log("3. Test the application with MetaMask on Sepolia testnet");
    console.log("4. Get Sepolia ETH from: https://sepoliafaucet.com/");

    return deploymentInfo;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Sepolia deployment failed:", error);
        process.exit(1);
    });