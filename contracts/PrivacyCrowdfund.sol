// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Simplified version without FHE for basic deployment
// In production, replace with actual FHE imports

contract CrowdfundPlatform {
    struct Campaign {
        address creator;
        uint256 targetAmount; // Simulated encrypted amount (stored as hash)
        uint256 currentAmount; // Simulated encrypted amount (stored as hash) 
        uint256 deadline;
        bool active;
        bool goalReached;
        string title;
        string description;
    }

    struct Contribution {
        uint256 amount; // Simulated encrypted amount (stored as hash)
        uint256 timestamp;
    }

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => Contribution)) public contributions;
    mapping(address => uint256) public balances; // Simulated encrypted balance
    
    uint256 public nextCampaignId;
    uint256 public totalCampaigns;
    
    event CampaignCreated(uint256 indexed campaignId, address indexed creator, string title);
    event ContributionMade(uint256 indexed campaignId, address indexed contributor);
    event CampaignFunded(uint256 indexed campaignId, address indexed creator);
    event RefundIssued(uint256 indexed campaignId, address indexed contributor);

    constructor() {
        nextCampaignId = 1;
        totalCampaigns = 0;
    }

    function createCampaign(
        bytes calldata encryptedTarget,
        uint256 duration,
        string memory title,
        string memory description
    ) external {
        // For demo: store hash of encrypted data as simulated encryption
        uint256 targetAmount = uint256(keccak256(encryptedTarget));
        
        campaigns[nextCampaignId] = Campaign({
            creator: msg.sender,
            targetAmount: targetAmount,
            currentAmount: 0, // Start with 0 contributions
            deadline: block.timestamp + duration,
            active: true,
            goalReached: false,
            title: title,
            description: description
        });
        
        emit CampaignCreated(nextCampaignId, msg.sender, title);
        nextCampaignId++;
        totalCampaigns++;
    }

    function contribute(uint256 campaignId, bytes calldata encryptedAmount) external payable {
        require(campaigns[campaignId].active, "Campaign not active");
        require(block.timestamp < campaigns[campaignId].deadline, "Campaign expired");
        require(msg.value > 0, "Must send ETH");
        
        // For demo: store hash of encrypted amount as simulated encryption
        uint256 amount = uint256(keccak256(encryptedAmount));
        
        // Update contribution
        contributions[campaignId][msg.sender] = Contribution({
            amount: contributions[campaignId][msg.sender].amount + amount,
            timestamp: block.timestamp
        });
        
        // Update campaign total (using actual ETH sent)
        campaigns[campaignId].currentAmount += msg.value;
        
        // Update user balance (using actual ETH sent)  
        balances[msg.sender] += msg.value;
        
        emit ContributionMade(campaignId, msg.sender);
    }

    function checkGoalReached(uint256 campaignId) external view returns (bool) {
        require(campaigns[campaignId].active, "Campaign not active");
        
        // Simplified goal checking (in production would use FHE comparison)
        // For demo: assume goal is reached if we have some contributions
        return campaigns[campaignId].currentAmount > 0;
    }

    function withdrawFunds(uint256 campaignId) external {
        require(campaigns[campaignId].creator == msg.sender, "Not campaign creator");
        require(campaigns[campaignId].goalReached, "Goal not reached");
        require(campaigns[campaignId].active, "Campaign not active");
        
        campaigns[campaignId].active = false;
        emit CampaignFunded(campaignId, msg.sender);
    }

    function refund(uint256 campaignId) external {
        require(block.timestamp > campaigns[campaignId].deadline, "Campaign still active");
        require(!campaigns[campaignId].goalReached, "Goal was reached");
        
        Contribution storage contribution = contributions[campaignId][msg.sender];
        require(contribution.amount > 0, "No contribution found");
        
        uint256 refundAmount = balances[msg.sender];
        require(refundAmount > 0, "No balance to refund");
        
        // Reset contribution and balance
        contribution.amount = 0;
        balances[msg.sender] = 0;
        
        // Send refund (simplified - in production would need more sophisticated logic)
        payable(msg.sender).transfer(refundAmount);
        
        emit RefundIssued(campaignId, msg.sender);
    }

    function getCampaignCount() external view returns (uint256) {
        return totalCampaigns;
    }

    function getCampaignInfo(uint256 campaignId) external view returns (
        address creator,
        uint256 deadline,
        bool active,
        bool goalReached,
        string memory title,
        string memory description
    ) {
        Campaign storage campaign = campaigns[campaignId];
        return (
            campaign.creator,
            campaign.deadline,
            campaign.active,
            campaign.goalReached,
            campaign.title,
            campaign.description
        );
    }

    function getMyContribution(uint256 campaignId) external view returns (uint256) {
        return contributions[campaignId][msg.sender].amount;
    }

    function getMyBalance() external view returns (uint256) {
        return balances[msg.sender];
    }
}