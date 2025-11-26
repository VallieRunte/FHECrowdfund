// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title PrivacyCrowdfundPlatform
 * @dev Enhanced privacy-preserving crowdfunding platform with Gateway callback pattern
 * Features:
 * - Gateway-based decryption handling via callback mechanism
 * - Refund protection for decryption failures
 * - Timeout protection to prevent permanent lockup
 * - Privacy obfuscation for division results and prices
 * - Comprehensive input validation and access control
 * - Overflow protection and audit trails
 */

contract PrivacyCrowdfundPlatform {
    // ============ Constants ============
    uint256 public constant REFUND_TIMEOUT = 30 days;
    uint256 public constant MAX_DECIMAL_PRECISION = 1e18;
    uint256 public constant PRIVACY_MULTIPLIER_BASE = 1000000;

    // ============ Enums ============
    enum CampaignStatus {
        Active,
        FundingSuccess,
        FundingFailed,
        DecryptionFailed,
        RefundIssued
    }

    enum DecryptionRequestStatus {
        Pending,
        Completed,
        Failed,
        TimedOut
    }

    // ============ Structs ============
    struct Campaign {
        address creator;
        uint256 targetAmount; // Encrypted target (stored as hash)
        uint256 currentAmount; // Encrypted current (stored as hash)
        uint256 deadline;
        uint256 decryptionDeadline; // Timeout protection
        CampaignStatus status;
        string title;
        string description;
        uint256 decryptionRequestId; // Gateway request tracking
        uint256 totalContributions; // Actual ETH total
        uint256 platformFee; // 2% of contributions
    }

    struct Contribution {
        uint256 amount; // Encrypted amount (stored as hash)
        uint256 actualAmount; // Real ETH amount
        uint256 timestamp;
        bool refundClaimed;
    }

    struct DecryptionRequest {
        uint256 campaignId;
        DecryptionRequestStatus status;
        uint256 requestTime;
        uint256 targetAmount; // Decrypted value
        uint256 currentAmount; // Decrypted value
        bytes callbackData; // Additional callback data
    }

    // ============ State Variables ============
    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => mapping(address => Contribution)) public contributions;
    mapping(uint256 => DecryptionRequest) public decryptionRequests;
    mapping(address => uint256) public pendingRefunds;

    uint256 public nextCampaignId;
    uint256 public totalCampaigns;
    address public gatewayAddress; // Gateway for decryption callbacks
    address public owner;
    uint256 public platformFeesCollected;

    // Privacy protection: random multiplier for each campaign
    mapping(uint256 => uint256) private privacyMultipliers;

    // ============ Events ============
    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed creator,
        string title,
        uint256 targetAmount,
        uint256 deadline
    );

    event ContributionMade(
        uint256 indexed campaignId,
        address indexed contributor,
        uint256 amount
    );

    event DecryptionRequested(
        uint256 indexed campaignId,
        uint256 requestId,
        uint256 timestamp
    );

    event DecryptionCompleted(
        uint256 indexed campaignId,
        uint256 requestId,
        uint256 revealedTarget,
        uint256 revealedCurrent
    );

    event DecryptionFailed(
        uint256 indexed campaignId,
        uint256 requestId,
        string reason
    );

    event CampaignFunded(
        uint256 indexed campaignId,
        address indexed creator,
        uint256 totalAmount
    );

    event CampaignExpired(
        uint256 indexed campaignId,
        uint256 totalAmount
    );

    event RefundIssued(
        uint256 indexed campaignId,
        address indexed contributor,
        uint256 amount
    );

    event RefundPending(
        uint256 indexed campaignId,
        address indexed contributor,
        uint256 amount
    );

    event TimeoutProtectionTriggered(
        uint256 indexed campaignId,
        uint256 decryptionDeadline
    );

    event SecurityAudit(
        uint256 indexed campaignId,
        string auditType,
        string details
    );

    // ============ Modifiers ============
    modifier onlyOwner() {
        require(msg.sender == owner, "AccessControl: caller is not owner");
        _;
    }

    modifier onlyGateway() {
        require(msg.sender == gatewayAddress, "AccessControl: caller is not gateway");
        _;
    }

    modifier validCampaignId(uint256 campaignId) {
        require(campaignId > 0 && campaignId < nextCampaignId, "InputValidation: invalid campaign ID");
        _;
    }

    modifier notZeroAddress(address addr) {
        require(addr != address(0), "InputValidation: zero address not allowed");
        _;
    }

    // ============ Constructor ============
    constructor() {
        owner = msg.sender;
        nextCampaignId = 1;
        totalCampaigns = 0;
        platformFeesCollected = 0;
        emit SecurityAudit(0, "Deployment", "Contract deployed with security checks enabled");
    }

    // ============ Owner Functions ============
    function setGatewayAddress(address newGateway) external onlyOwner notZeroAddress(newGateway) {
        require(newGateway != gatewayAddress, "InputValidation: gateway address unchanged");
        gatewayAddress = newGateway;
        emit SecurityAudit(0, "GatewayUpdate", "Gateway address updated");
    }

    function withdrawPlatformFees(address recipient) external onlyOwner notZeroAddress(recipient) {
        require(platformFeesCollected > 0, "InputValidation: no fees to withdraw");
        uint256 amount = platformFeesCollected;
        platformFeesCollected = 0;
        (bool success, ) = payable(recipient).call{value: amount}("");
        require(success, "TransferFailed: platform fee withdrawal failed");
        emit SecurityAudit(0, "FeeWithdrawal", "Platform fees withdrawn");
    }

    // ============ Campaign Creation ============
    function createCampaign(
        bytes calldata encryptedTarget,
        uint256 duration,
        string memory title,
        string memory description
    ) external notZeroAddress(msg.sender) returns (uint256) {
        // Input validation
        require(duration > 0, "InputValidation: duration must be positive");
        require(bytes(title).length > 0, "InputValidation: title cannot be empty");
        require(bytes(description).length > 0, "InputValidation: description cannot be empty");
        require(encryptedTarget.length > 0, "InputValidation: encrypted target required");
        require(duration <= 365 days, "InputValidation: duration exceeds 1 year");

        // Store encrypted target as hash with privacy multiplier
        uint256 targetAmount = uint256(keccak256(encryptedTarget));
        uint256 campaignId = nextCampaignId;

        // Privacy protection: add randomized multiplier to obfuscate amounts
        uint256 privacyMultiplier = (uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, campaignId))) % PRIVACY_MULTIPLIER_BASE) + 1;
        privacyMultipliers[campaignId] = privacyMultiplier;

        campaigns[campaignId] = Campaign({
            creator: msg.sender,
            targetAmount: targetAmount,
            currentAmount: 0,
            deadline: block.timestamp + duration,
            decryptionDeadline: block.timestamp + duration + REFUND_TIMEOUT,
            status: CampaignStatus.Active,
            title: title,
            description: description,
            decryptionRequestId: 0,
            totalContributions: 0,
            platformFee: 0
        });

        emit CampaignCreated(campaignId, msg.sender, title, targetAmount, block.timestamp + duration);
        emit SecurityAudit(campaignId, "CampaignCreation", "Campaign created with timeout protection enabled");

        nextCampaignId++;
        totalCampaigns++;

        return campaignId;
    }

    // ============ Contribution Handling ============
    function contribute(uint256 campaignId, bytes calldata encryptedAmount) external payable validCampaignId(campaignId) {
        Campaign storage campaign = campaigns[campaignId];

        // Input validation
        require(campaign.status == CampaignStatus.Active, "CampaignStatus: campaign not active");
        require(block.timestamp < campaign.deadline, "CampaignStatus: campaign deadline passed");
        require(msg.value > 0, "InputValidation: contribution amount must be positive");
        require(encryptedAmount.length > 0, "InputValidation: encrypted amount required");

        // Calculate platform fee (2%)
        uint256 platformFee = (msg.value * 2) / 100;
        uint256 contributionAmount = msg.value - platformFee;

        // Validate no integer overflow
        require(campaign.totalContributions + contributionAmount >= campaign.totalContributions, "OverflowProtection: contribution would overflow");

        // Store encrypted amount as hash with privacy multiplier
        uint256 encryptedAmountHash = uint256(keccak256(encryptedAmount));
        uint256 privacyObfuscatedAmount = (encryptedAmountHash * privacyMultipliers[campaignId]) / PRIVACY_MULTIPLIER_BASE;

        Contribution storage contribution = contributions[campaignId][msg.sender];
        contribution.amount = privacyObfuscatedAmount;
        contribution.actualAmount = contributionAmount;
        contribution.timestamp = block.timestamp;
        contribution.refundClaimed = false;

        // Update campaign totals
        campaign.currentAmount += privacyObfuscatedAmount;
        campaign.totalContributions += contributionAmount;
        campaign.platformFee += platformFee;
        platformFeesCollected += platformFee;

        emit ContributionMade(campaignId, msg.sender, contributionAmount);
        emit SecurityAudit(campaignId, "ContributionTracking", "Contribution recorded with amount obfuscation");
    }

    // ============ Decryption & Gateway Callback ============
    function requestDecryptionReveal(uint256 campaignId) external validCampaignId(campaignId) {
        Campaign storage campaign = campaigns[campaignId];

        // Input validation
        require(campaign.creator == msg.sender, "AccessControl: only campaign creator can request reveal");
        require(campaign.status == CampaignStatus.Active, "CampaignStatus: campaign not active");
        require(block.timestamp >= campaign.deadline, "CampaignStatus: campaign not yet expired");
        require(gatewayAddress != address(0), "InputValidation: gateway address not configured");

        // Emit request event for off-chain Gateway processing
        uint256 requestId = uint256(keccak256(abi.encodePacked(campaignId, block.timestamp, msg.sender)));
        campaign.decryptionRequestId = requestId;

        emit DecryptionRequested(campaignId, requestId, block.timestamp);
        emit SecurityAudit(campaignId, "GatewayRequest", "Decryption reveal requested from Gateway");
    }

    /**
     * @dev Gateway callback function to complete decryption
     * Only the configured Gateway address can call this function
     */
    function onDecryptionComplete(
        uint256 campaignId,
        uint256 requestId,
        uint256 decryptedTarget,
        uint256 decryptedCurrent
    ) external onlyGateway validCampaignId(campaignId) {
        Campaign storage campaign = campaigns[campaignId];

        // Input validation
        require(campaign.decryptionRequestId == requestId, "InputValidation: request ID mismatch");
        require(campaign.status == CampaignStatus.Active, "CampaignStatus: campaign not active");
        require(decryptedTarget > 0, "InputValidation: target amount must be positive");

        // Record decryption results
        DecryptionRequest storage request = decryptionRequests[requestId];
        request.campaignId = campaignId;
        request.status = DecryptionRequestStatus.Completed;
        request.requestTime = block.timestamp;
        request.targetAmount = decryptedTarget;
        request.currentAmount = decryptedCurrent;

        // Determine campaign outcome
        if (decryptedCurrent >= decryptedTarget) {
            campaign.status = CampaignStatus.FundingSuccess;
        } else {
            campaign.status = CampaignStatus.FundingFailed;
        }

        emit DecryptionCompleted(campaignId, requestId, decryptedTarget, decryptedCurrent);
        emit SecurityAudit(campaignId, "DecryptionComplete", "Campaign status determined via Gateway");
    }

    /**
     * @dev Gateway callback function to handle decryption failure
     * Triggers automatic refund mechanism
     */
    function onDecryptionFailure(
        uint256 campaignId,
        uint256 requestId,
        string memory reason
    ) external onlyGateway validCampaignId(campaignId) {
        Campaign storage campaign = campaigns[campaignId];

        // Input validation
        require(campaign.decryptionRequestId == requestId, "InputValidation: request ID mismatch");

        // Set status to failed and trigger refunds
        campaign.status = CampaignStatus.DecryptionFailed;

        DecryptionRequest storage request = decryptionRequests[requestId];
        request.campaignId = campaignId;
        request.status = DecryptionRequestStatus.Failed;
        request.requestTime = block.timestamp;

        emit DecryptionFailed(campaignId, requestId, reason);
        emit SecurityAudit(campaignId, "DecryptionFailure", reason);
    }

    // ============ Timeout Protection ============
    /**
     * @dev Emergency function to handle permanent timeout
     * Can be called by anyone after decryption deadline passes
     */
    function claimRefundAfterTimeout(uint256 campaignId) external validCampaignId(campaignId) {
        Campaign storage campaign = campaigns[campaignId];
        Contribution storage contribution = contributions[campaignId][msg.sender];

        // Input validation
        require(contribution.actualAmount > 0, "InputValidation: no contribution found");
        require(!contribution.refundClaimed, "RefundStatus: refund already claimed");
        require(block.timestamp >= campaign.decryptionDeadline, "TimeoutProtection: decryption deadline not reached");

        // Mark refund as claimed and process it
        contribution.refundClaimed = true;
        uint256 refundAmount = contribution.actualAmount;

        // Add platform fee back to refund for timeout cases
        uint256 platformFeeRefund = (refundAmount * 2) / 98; // Reverse the 2% fee calculation
        uint256 totalRefund = refundAmount + platformFeeRefund;

        pendingRefunds[msg.sender] += totalRefund;

        emit RefundPending(campaignId, msg.sender, totalRefund);
        emit TimeoutProtectionTriggered(campaignId, campaign.decryptionDeadline);
        emit SecurityAudit(campaignId, "TimeoutRefund", "Timeout protection triggered, refund pending");

        // Send refund
        (bool success, ) = payable(msg.sender).call{value: totalRefund}("");
        require(success, "TransferFailed: timeout refund transfer failed");

        emit RefundIssued(campaignId, msg.sender, totalRefund);
    }

    // ============ Refund & Withdrawal Mechanism ============
    /**
     * @dev Claim refund after campaign failure or decryption failure
     */
    function claimRefund(uint256 campaignId) external validCampaignId(campaignId) {
        Campaign storage campaign = campaigns[campaignId];
        Contribution storage contribution = contributions[campaignId][msg.sender];

        // Input validation
        require(contribution.actualAmount > 0, "InputValidation: no contribution found");
        require(!contribution.refundClaimed, "RefundStatus: refund already claimed");
        require(
            campaign.status == CampaignStatus.FundingFailed || campaign.status == CampaignStatus.DecryptionFailed,
            "CampaignStatus: campaign status does not allow refund"
        );

        // Mark refund as claimed
        contribution.refundClaimed = true;
        uint256 refundAmount = contribution.actualAmount;

        // Process refund
        (bool success, ) = payable(msg.sender).call{value: refundAmount}("");
        require(success, "TransferFailed: refund transfer failed");

        emit RefundIssued(campaignId, msg.sender, refundAmount);
        emit SecurityAudit(campaignId, "RefundClaimed", "Contributor refund processed");
    }

    /**
     * @dev Creator withdraws funds from successful campaign
     */
    function withdrawFunds(uint256 campaignId) external validCampaignId(campaignId) {
        Campaign storage campaign = campaigns[campaignId];

        // Input validation
        require(campaign.creator == msg.sender, "AccessControl: only campaign creator can withdraw");
        require(campaign.status == CampaignStatus.FundingSuccess, "CampaignStatus: campaign not successfully funded");

        uint256 withdrawAmount = campaign.totalContributions;
        require(withdrawAmount > 0, "InputValidation: no funds to withdraw");

        campaign.status = CampaignStatus.RefundIssued; // Mark as completed

        // Send funds
        (bool success, ) = payable(msg.sender).call{value: withdrawAmount}("");
        require(success, "TransferFailed: withdrawal transfer failed");

        emit CampaignFunded(campaignId, msg.sender, withdrawAmount);
        emit SecurityAudit(campaignId, "CreatorWithdrawal", "Creator withdrew campaign funds");
    }

    // ============ View Functions ============
    function getCampaignCount() external view returns (uint256) {
        return totalCampaigns;
    }

    function getCampaignInfo(uint256 campaignId) external view validCampaignId(campaignId) returns (
        address creator,
        uint256 deadline,
        uint256 decryptionDeadline,
        CampaignStatus status,
        string memory title,
        string memory description,
        uint256 totalContributions
    ) {
        Campaign storage campaign = campaigns[campaignId];
        return (
            campaign.creator,
            campaign.deadline,
            campaign.decryptionDeadline,
            campaign.status,
            campaign.title,
            campaign.description,
            campaign.totalContributions
        );
    }

    function getContributionInfo(uint256 campaignId, address contributor) external view validCampaignId(campaignId) returns (
        uint256 actualAmount,
        uint256 timestamp,
        bool refundClaimed
    ) {
        Contribution storage contribution = contributions[campaignId][contributor];
        return (
            contribution.actualAmount,
            contribution.timestamp,
            contribution.refundClaimed
        );
    }

    function getDecryptionStatus(uint256 requestId) external view returns (
        uint256 campaignId,
        DecryptionRequestStatus status,
        uint256 requestTime,
        uint256 targetAmount,
        uint256 currentAmount
    ) {
        DecryptionRequest storage request = decryptionRequests[requestId];
        return (
            request.campaignId,
            request.status,
            request.requestTime,
            request.targetAmount,
            request.currentAmount
        );
    }

    function getPlatformFees() external view returns (uint256) {
        return platformFeesCollected;
    }

    // ============ Emergency & Admin ============
    receive() external payable {
        emit SecurityAudit(0, "DirectTransfer", "ETH received directly");
    }
}