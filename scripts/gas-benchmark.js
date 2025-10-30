const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("========================================");
  console.log("Gas Benchmark Analysis");
  console.log("========================================\n");

  // Deploy contract
  console.log("Deploying contract for benchmarking...");
  const CrowdfundPlatform = await hre.ethers.getContractFactory("CrowdfundPlatform");
  const contract = await CrowdfundPlatform.deploy();
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log(`Contract deployed at: ${contractAddress}\n`);

  const [deployer, alice, bob] = await hre.ethers.getSigners();

  // Benchmark data
  const benchmarks = [];

  // 1. Campaign Creation
  console.log("Benchmarking campaign creation...");
  const targetAmount = hre.ethers.parseEther("1.0");
  const duration = 7 * 24 * 60 * 60;
  const encryptedTarget = hre.ethers.AbiCoder.defaultAbiCoder().encode(
    ["uint256"],
    [targetAmount]
  );

  const createTx = await contract.connect(alice).createCampaign(
    encryptedTarget,
    duration,
    "Benchmark Campaign",
    "Testing gas costs"
  );
  const createReceipt = await createTx.wait();

  benchmarks.push({
    operation: "Create Campaign",
    gasUsed: createReceipt.gasUsed.toString(),
    gasPrice: createTx.gasPrice ? createTx.gasPrice.toString() : "N/A",
    cost: createReceipt.gasUsed * (createTx.gasPrice || 0n),
  });

  console.log(`  Gas Used: ${createReceipt.gasUsed.toString()}`);

  // 2. Contribution
  console.log("\nBenchmarking contribution...");
  const contributionAmount = hre.ethers.parseEther("0.1");
  const encryptedAmount = hre.ethers.AbiCoder.defaultAbiCoder().encode(
    ["uint256"],
    [contributionAmount]
  );

  const contributeTx = await contract.connect(bob).contribute(1, encryptedAmount, {
    value: contributionAmount,
  });
  const contributeReceipt = await contributeTx.wait();

  benchmarks.push({
    operation: "Contribute",
    gasUsed: contributeReceipt.gasUsed.toString(),
    gasPrice: contributeTx.gasPrice ? contributeTx.gasPrice.toString() : "N/A",
    cost: contributeReceipt.gasUsed * (contributeTx.gasPrice || 0n),
  });

  console.log(`  Gas Used: ${contributeReceipt.gasUsed.toString()}`);

  // 3. View Functions
  console.log("\nBenchmarking view functions...");
  const campaignInfoGas = await contract.getCampaignInfo.estimateGas(1);
  benchmarks.push({
    operation: "Get Campaign Info (view)",
    gasUsed: campaignInfoGas.toString(),
    gasPrice: "0 (view function)",
    cost: 0n,
  });

  console.log(`  Gas Used: ${campaignInfoGas.toString()}`);

  const campaignCountGas = await contract.getCampaignCount.estimateGas();
  benchmarks.push({
    operation: "Get Campaign Count (view)",
    gasUsed: campaignCountGas.toString(),
    gasPrice: "0 (view function)",
    cost: 0n,
  });

  console.log(`  Gas Used: ${campaignCountGas.toString()}`);

  // Generate report
  console.log("\n========================================");
  console.log("Gas Benchmark Summary");
  console.log("========================================\n");

  let totalGas = 0n;
  let totalCost = 0n;

  for (const benchmark of benchmarks) {
    console.log(`${benchmark.operation}:`);
    console.log(`  Gas Used: ${benchmark.gasUsed}`);
    if (benchmark.cost > 0n) {
      console.log(`  Cost (wei): ${benchmark.cost.toString()}`);
      console.log(`  Cost (ETH): ${hre.ethers.formatEther(benchmark.cost)}`);
      totalGas += BigInt(benchmark.gasUsed);
      totalCost += benchmark.cost;
    }
    console.log("");
  }

  console.log("========================================");
  console.log("Total Statistics:");
  console.log(`  Total Gas (excluding views): ${totalGas.toString()}`);
  if (totalCost > 0n) {
    console.log(`  Total Cost: ${hre.ethers.formatEther(totalCost)} ETH`);
  }
  console.log("========================================\n");

  // Save to file
  const reportPath = path.join(__dirname, "..", "gas-benchmark-report.json");
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        network: hre.network.name,
        benchmarks: benchmarks.map((b) => ({
          ...b,
          cost: b.cost.toString(),
        })),
        totalGas: totalGas.toString(),
        totalCost: totalCost.toString(),
      },
      null,
      2
    )
  );

  console.log(`Report saved to: ${reportPath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nBenchmark failed:");
    console.error(error);
    process.exit(1);
  });
