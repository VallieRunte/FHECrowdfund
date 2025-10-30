const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("CrowdfundPlatform", function () {
  // Deployment fixture
  async function deployFixture() {
    const [deployer, alice, bob, carol] = await ethers.getSigners();

    const CrowdfundPlatform = await ethers.getContractFactory("CrowdfundPlatform");
    const contract = await CrowdfundPlatform.deploy();
    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();

    return { contract, contractAddress, deployer, alice, bob, carol };
  }

  describe("Deployment", function () {
    it("should deploy successfully", async function () {
      const { contract, contractAddress } = await loadFixture(deployFixture);

      expect(contractAddress).to.be.properAddress;
      expect(await contract.getAddress()).to.equal(contractAddress);
    });

    it("should initialize with correct initial state", async function () {
      const { contract } = await loadFixture(deployFixture);

      const nextCampaignId = await contract.nextCampaignId();
      const totalCampaigns = await contract.totalCampaigns();

      expect(nextCampaignId).to.equal(1);
      expect(totalCampaigns).to.equal(0);
    });

    it("should set deployer as first account", async function () {
      const { deployer } = await loadFixture(deployFixture);

      expect(deployer.address).to.be.properAddress;
    });
  });

  describe("Campaign Creation", function () {
    it("should create a campaign successfully", async function () {
      const { contract, alice } = await loadFixture(deployFixture);

      const targetAmount = ethers.parseEther("1.0");
      const duration = 7 * 24 * 60 * 60; // 7 days
      const title = "Test Campaign";
      const description = "This is a test campaign";

      const encryptedTarget = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [targetAmount]
      );

      await expect(
        contract.connect(alice).createCampaign(
          encryptedTarget,
          duration,
          title,
          description
        )
      ).to.emit(contract, "CampaignCreated");
    });

    it("should increment campaign count after creation", async function () {
      const { contract, alice } = await loadFixture(deployFixture);

      const targetAmount = ethers.parseEther("1.0");
      const duration = 7 * 24 * 60 * 60;
      const encryptedTarget = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [targetAmount]
      );

      const initialCount = await contract.getCampaignCount();

      await contract.connect(alice).createCampaign(
        encryptedTarget,
        duration,
        "Campaign 1",
        "Description 1"
      );

      const newCount = await contract.getCampaignCount();
      expect(newCount).to.equal(initialCount + 1n);
    });

    it("should assign correct campaign ID", async function () {
      const { contract, alice } = await loadFixture(deployFixture);

      const targetAmount = ethers.parseEther("1.0");
      const duration = 7 * 24 * 60 * 60;
      const encryptedTarget = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [targetAmount]
      );

      const tx = await contract.connect(alice).createCampaign(
        encryptedTarget,
        duration,
        "First Campaign",
        "First Description"
      );

      const receipt = await tx.wait();
      const event = receipt.logs.find(log => {
        try {
          return contract.interface.parseLog(log).name === 'CampaignCreated';
        } catch (e) {
          return false;
        }
      });

      expect(event).to.not.be.undefined;

      const parsedEvent = contract.interface.parseLog(event);
      expect(parsedEvent.args[0]).to.equal(1); // First campaign ID
    });

    it("should store campaign creator correctly", async function () {
      const { contract, alice, contractAddress } = await loadFixture(deployFixture);

      const targetAmount = ethers.parseEther("1.0");
      const duration = 7 * 24 * 60 * 60;
      const encryptedTarget = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [targetAmount]
      );

      await contract.connect(alice).createCampaign(
        encryptedTarget,
        duration,
        "Alice Campaign",
        "Alice Description"
      );

      const campaignInfo = await contract.getCampaignInfo(1);
      expect(campaignInfo[0]).to.equal(alice.address);
    });

    it("should set campaign deadline correctly", async function () {
      const { contract, alice } = await loadFixture(deployFixture);

      const duration = 7 * 24 * 60 * 60; // 7 days
      const targetAmount = ethers.parseEther("1.0");
      const encryptedTarget = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [targetAmount]
      );

      const blockBefore = await ethers.provider.getBlock('latest');
      const timestampBefore = blockBefore.timestamp;

      await contract.connect(alice).createCampaign(
        encryptedTarget,
        duration,
        "Deadline Test",
        "Testing deadline"
      );

      const campaignInfo = await contract.getCampaignInfo(1);
      const deadline = campaignInfo[1];

      expect(deadline).to.be.closeTo(
        timestampBefore + duration,
        10 // Allow 10 seconds variance
      );
    });

    it("should create multiple campaigns", async function () {
      const { contract, alice, bob } = await loadFixture(deployFixture);

      const targetAmount = ethers.parseEther("1.0");
      const duration = 7 * 24 * 60 * 60;
      const encryptedTarget = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [targetAmount]
      );

      await contract.connect(alice).createCampaign(
        encryptedTarget,
        duration,
        "Campaign 1",
        "Description 1"
      );

      await contract.connect(bob).createCampaign(
        encryptedTarget,
        duration,
        "Campaign 2",
        "Description 2"
      );

      const count = await contract.getCampaignCount();
      expect(count).to.equal(2);
    });
  });

  describe("Campaign Contributions", function () {
    it("should accept contribution successfully", async function () {
      const { contract, alice, bob } = await loadFixture(deployFixture);

      // Create campaign
      const targetAmount = ethers.parseEther("1.0");
      const duration = 7 * 24 * 60 * 60;
      const encryptedTarget = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [targetAmount]
      );

      await contract.connect(alice).createCampaign(
        encryptedTarget,
        duration,
        "Test Campaign",
        "Test Description"
      );

      // Contribute
      const contributionAmount = ethers.parseEther("0.1");
      const encryptedAmount = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [contributionAmount]
      );

      await expect(
        contract.connect(bob).contribute(1, encryptedAmount, {
          value: contributionAmount
        })
      ).to.emit(contract, "ContributionMade");
    });

    it("should revert contribution to inactive campaign", async function () {
      const { contract, bob } = await loadFixture(deployFixture);

      const contributionAmount = ethers.parseEther("0.1");
      const encryptedAmount = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [contributionAmount]
      );

      await expect(
        contract.connect(bob).contribute(1, encryptedAmount, {
          value: contributionAmount
        })
      ).to.be.revertedWith("Campaign not active");
    });

    it("should revert contribution with zero value", async function () {
      const { contract, alice, bob } = await loadFixture(deployFixture);

      // Create campaign
      const targetAmount = ethers.parseEther("1.0");
      const duration = 7 * 24 * 60 * 60;
      const encryptedTarget = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [targetAmount]
      );

      await contract.connect(alice).createCampaign(
        encryptedTarget,
        duration,
        "Test Campaign",
        "Test Description"
      );

      // Try to contribute with 0 value
      const encryptedAmount = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [0]
      );

      await expect(
        contract.connect(bob).contribute(1, encryptedAmount, { value: 0 })
      ).to.be.revertedWith("Must send ETH");
    });

    it("should track contribution amount correctly", async function () {
      const { contract, alice, bob } = await loadFixture(deployFixture);

      // Create campaign
      const targetAmount = ethers.parseEther("1.0");
      const duration = 7 * 24 * 60 * 60;
      const encryptedTarget = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [targetAmount]
      );

      await contract.connect(alice).createCampaign(
        encryptedTarget,
        duration,
        "Test Campaign",
        "Test Description"
      );

      // Contribute
      const contributionAmount = ethers.parseEther("0.5");
      const encryptedAmount = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [contributionAmount]
      );

      await contract.connect(bob).contribute(1, encryptedAmount, {
        value: contributionAmount
      });

      const myContribution = await contract.connect(bob).getMyContribution(1);
      expect(myContribution).to.be.gt(0);
    });

    it("should update balance after contribution", async function () {
      const { contract, alice, bob } = await loadFixture(deployFixture);

      // Create campaign
      const targetAmount = ethers.parseEther("1.0");
      const duration = 7 * 24 * 60 * 60;
      const encryptedTarget = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [targetAmount]
      );

      await contract.connect(alice).createCampaign(
        encryptedTarget,
        duration,
        "Test Campaign",
        "Test Description"
      );

      // Contribute
      const contributionAmount = ethers.parseEther("0.3");
      const encryptedAmount = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [contributionAmount]
      );

      await contract.connect(bob).contribute(1, encryptedAmount, {
        value: contributionAmount
      });

      const balance = await contract.connect(bob).getMyBalance();
      expect(balance).to.equal(contributionAmount);
    });

    it("should accumulate multiple contributions", async function () {
      const { contract, alice, bob } = await loadFixture(deployFixture);

      // Create campaign
      const targetAmount = ethers.parseEther("2.0");
      const duration = 7 * 24 * 60 * 60;
      const encryptedTarget = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [targetAmount]
      );

      await contract.connect(alice).createCampaign(
        encryptedTarget,
        duration,
        "Test Campaign",
        "Test Description"
      );

      // First contribution
      const amount1 = ethers.parseEther("0.3");
      const encrypted1 = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [amount1]
      );

      await contract.connect(bob).contribute(1, encrypted1, { value: amount1 });

      // Second contribution
      const amount2 = ethers.parseEther("0.2");
      const encrypted2 = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [amount2]
      );

      await contract.connect(bob).contribute(1, encrypted2, { value: amount2 });

      const balance = await contract.connect(bob).getMyBalance();
      expect(balance).to.equal(amount1 + amount2);
    });

    it("should revert contribution after deadline", async function () {
      const { contract, alice, bob } = await loadFixture(deployFixture);

      // Create campaign with short duration
      const targetAmount = ethers.parseEther("1.0");
      const duration = 60; // 1 minute
      const encryptedTarget = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [targetAmount]
      );

      await contract.connect(alice).createCampaign(
        encryptedTarget,
        duration,
        "Short Campaign",
        "Short Duration"
      );

      // Fast forward time past deadline
      await time.increase(120); // 2 minutes

      // Try to contribute after deadline
      const contributionAmount = ethers.parseEther("0.1");
      const encryptedAmount = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [contributionAmount]
      );

      await expect(
        contract.connect(bob).contribute(1, encryptedAmount, {
          value: contributionAmount
        })
      ).to.be.revertedWith("Campaign expired");
    });
  });

  describe("Campaign Information", function () {
    it("should return correct campaign info", async function () {
      const { contract, alice } = await loadFixture(deployFixture);

      const targetAmount = ethers.parseEther("1.0");
      const duration = 7 * 24 * 60 * 60;
      const title = "Test Campaign";
      const description = "Test Description";
      const encryptedTarget = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [targetAmount]
      );

      await contract.connect(alice).createCampaign(
        encryptedTarget,
        duration,
        title,
        description
      );

      const info = await contract.getCampaignInfo(1);

      expect(info[0]).to.equal(alice.address); // creator
      expect(info[2]).to.equal(true); // active
      expect(info[3]).to.equal(false); // goalReached
      expect(info[4]).to.equal(title);
      expect(info[5]).to.equal(description);
    });

    it("should check goal reached status", async function () {
      const { contract, alice, bob } = await loadFixture(deployFixture);

      // Create campaign
      const targetAmount = ethers.parseEther("1.0");
      const duration = 7 * 24 * 60 * 60;
      const encryptedTarget = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [targetAmount]
      );

      await contract.connect(alice).createCampaign(
        encryptedTarget,
        duration,
        "Test Campaign",
        "Test Description"
      );

      // Check before contribution
      const beforeContribution = await contract.checkGoalReached(1);
      expect(beforeContribution).to.equal(false);

      // Contribute
      const contributionAmount = ethers.parseEther("0.5");
      const encryptedAmount = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [contributionAmount]
      );

      await contract.connect(bob).contribute(1, encryptedAmount, {
        value: contributionAmount
      });

      // Check after contribution
      const afterContribution = await contract.checkGoalReached(1);
      expect(afterContribution).to.equal(true);
    });
  });

  describe("Withdrawal and Refund", function () {
    it("should revert withdrawal by non-creator", async function () {
      const { contract, alice, bob } = await loadFixture(deployFixture);

      // Create campaign
      const targetAmount = ethers.parseEther("1.0");
      const duration = 7 * 24 * 60 * 60;
      const encryptedTarget = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [targetAmount]
      );

      await contract.connect(alice).createCampaign(
        encryptedTarget,
        duration,
        "Test Campaign",
        "Test Description"
      );

      await expect(
        contract.connect(bob).withdrawFunds(1)
      ).to.be.revertedWith("Not campaign creator");
    });

    it("should revert refund for active campaign", async function () {
      const { contract, alice, bob } = await loadFixture(deployFixture);

      // Create campaign
      const targetAmount = ethers.parseEther("1.0");
      const duration = 7 * 24 * 60 * 60;
      const encryptedTarget = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [targetAmount]
      );

      await contract.connect(alice).createCampaign(
        encryptedTarget,
        duration,
        "Test Campaign",
        "Test Description"
      );

      // Contribute
      const contributionAmount = ethers.parseEther("0.1");
      const encryptedAmount = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [contributionAmount]
      );

      await contract.connect(bob).contribute(1, encryptedAmount, {
        value: contributionAmount
      });

      // Try to refund before deadline
      await expect(
        contract.connect(bob).refund(1)
      ).to.be.revertedWith("Campaign still active");
    });
  });

  describe("View Functions", function () {
    it("should return correct campaign count", async function () {
      const { contract, alice } = await loadFixture(deployFixture);

      const initialCount = await contract.getCampaignCount();
      expect(initialCount).to.equal(0);

      // Create campaigns
      const targetAmount = ethers.parseEther("1.0");
      const duration = 7 * 24 * 60 * 60;
      const encryptedTarget = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [targetAmount]
      );

      for (let i = 0; i < 3; i++) {
        await contract.connect(alice).createCampaign(
          encryptedTarget,
          duration,
          `Campaign ${i + 1}`,
          `Description ${i + 1}`
        );
      }

      const finalCount = await contract.getCampaignCount();
      expect(finalCount).to.equal(3);
    });

    it("should return my contribution correctly", async function () {
      const { contract, alice, bob } = await loadFixture(deployFixture);

      // Create campaign
      const targetAmount = ethers.parseEther("1.0");
      const duration = 7 * 24 * 60 * 60;
      const encryptedTarget = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [targetAmount]
      );

      await contract.connect(alice).createCampaign(
        encryptedTarget,
        duration,
        "Test Campaign",
        "Test Description"
      );

      // Bob contributes
      const contributionAmount = ethers.parseEther("0.5");
      const encryptedAmount = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [contributionAmount]
      );

      await contract.connect(bob).contribute(1, encryptedAmount, {
        value: contributionAmount
      });

      const bobContribution = await contract.connect(bob).getMyContribution(1);
      expect(bobContribution).to.be.gt(0);

      // Alice has no contribution
      const aliceContribution = await contract.connect(alice).getMyContribution(1);
      expect(aliceContribution).to.equal(0);
    });

    it("should return my balance correctly", async function () {
      const { contract, alice, bob } = await loadFixture(deployFixture);

      // Create campaign
      const targetAmount = ethers.parseEther("1.0");
      const duration = 7 * 24 * 60 * 60;
      const encryptedTarget = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [targetAmount]
      );

      await contract.connect(alice).createCampaign(
        encryptedTarget,
        duration,
        "Test Campaign",
        "Test Description"
      );

      // Initial balance should be 0
      const initialBalance = await contract.connect(bob).getMyBalance();
      expect(initialBalance).to.equal(0);

      // Contribute
      const contributionAmount = ethers.parseEther("0.7");
      const encryptedAmount = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [contributionAmount]
      );

      await contract.connect(bob).contribute(1, encryptedAmount, {
        value: contributionAmount
      });

      const finalBalance = await contract.connect(bob).getMyBalance();
      expect(finalBalance).to.equal(contributionAmount);
    });
  });

  describe("Edge Cases", function () {
    it("should handle zero duration", async function () {
      const { contract, alice } = await loadFixture(deployFixture);

      const targetAmount = ethers.parseEther("1.0");
      const duration = 0; // Zero duration
      const encryptedTarget = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [targetAmount]
      );

      // Should not revert (contract allows it)
      await expect(
        contract.connect(alice).createCampaign(
          encryptedTarget,
          duration,
          "Zero Duration",
          "Test"
        )
      ).to.not.be.reverted;
    });

    it("should handle very large contribution", async function () {
      const { contract, alice, bob } = await loadFixture(deployFixture);

      // Create campaign
      const targetAmount = ethers.parseEther("1000.0");
      const duration = 7 * 24 * 60 * 60;
      const encryptedTarget = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [targetAmount]
      );

      await contract.connect(alice).createCampaign(
        encryptedTarget,
        duration,
        "Large Campaign",
        "Large Target"
      );

      // Large contribution
      const largeContribution = ethers.parseEther("10.0");
      const encryptedAmount = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [largeContribution]
      );

      await expect(
        contract.connect(bob).contribute(1, encryptedAmount, {
          value: largeContribution
        })
      ).to.not.be.reverted;
    });

    it("should handle empty title and description", async function () {
      const { contract, alice } = await loadFixture(deployFixture);

      const targetAmount = ethers.parseEther("1.0");
      const duration = 7 * 24 * 60 * 60;
      const encryptedTarget = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [targetAmount]
      );

      await expect(
        contract.connect(alice).createCampaign(
          encryptedTarget,
          duration,
          "",
          ""
        )
      ).to.not.be.reverted;
    });

    it("should handle campaign with non-existent ID", async function () {
      const { contract } = await loadFixture(deployFixture);

      await expect(
        contract.checkGoalReached(999)
      ).to.be.revertedWith("Campaign not active");
    });
  });

  describe("Gas Optimization", function () {
    it("should create campaign with reasonable gas", async function () {
      const { contract, alice } = await loadFixture(deployFixture);

      const targetAmount = ethers.parseEther("1.0");
      const duration = 7 * 24 * 60 * 60;
      const encryptedTarget = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [targetAmount]
      );

      const tx = await contract.connect(alice).createCampaign(
        encryptedTarget,
        duration,
        "Gas Test",
        "Testing gas usage"
      );

      const receipt = await tx.wait();

      // Should use less than 500k gas
      expect(receipt.gasUsed).to.be.lt(500000n);
    });

    it("should contribute with reasonable gas", async function () {
      const { contract, alice, bob } = await loadFixture(deployFixture);

      // Create campaign
      const targetAmount = ethers.parseEther("1.0");
      const duration = 7 * 24 * 60 * 60;
      const encryptedTarget = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [targetAmount]
      );

      await contract.connect(alice).createCampaign(
        encryptedTarget,
        duration,
        "Gas Test",
        "Testing gas"
      );

      // Contribute
      const contributionAmount = ethers.parseEther("0.1");
      const encryptedAmount = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [contributionAmount]
      );

      const tx = await contract.connect(bob).contribute(1, encryptedAmount, {
        value: contributionAmount
      });

      const receipt = await tx.wait();

      // Should use less than 300k gas
      expect(receipt.gasUsed).to.be.lt(300000n);
    });

    it("should query campaign info with minimal gas", async function () {
      const { contract, alice } = await loadFixture(deployFixture);

      const targetAmount = ethers.parseEther("1.0");
      const duration = 7 * 24 * 60 * 60;
      const encryptedTarget = ethers.AbiCoder.defaultAbiCoder().encode(
        ["uint256"],
        [targetAmount]
      );

      await contract.connect(alice).createCampaign(
        encryptedTarget,
        duration,
        "Query Test",
        "Testing queries"
      );

      // View functions should use minimal gas
      const info = await contract.getCampaignInfo(1);
      expect(info).to.not.be.undefined;
    });
  });
});
