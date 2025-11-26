# Privacy Crowdfund Platform - API Reference

## Contract: PrivacyCrowdfundPlatform

**Network**: Ethereum (Sepolia Testnet / Mainnet)
**Solidity Version**: ^0.8.24
**License**: MIT

---

## Constants

```solidity
uint256 public constant REFUND_TIMEOUT = 30 days;
uint256 public constant MAX_DECIMAL_PRECISION = 1e18;
uint256 public constant PRIVACY_MULTIPLIER_BASE = 1000000;
```

---

## State Variables

### Public Variables

```solidity
uint256 public nextCampaignId;                    // Next campaign ID counter
uint256 public totalCampaigns;                    // Total campaigns created
address public gatewayAddress;                    // Gateway for decryption callbacks
address public owner;                             // Contract owner
uint256 public platformFeesCollected;             // Total platform fees collected
```

### Mappings

```solidity
mapping(uint256 => Campaign) public campaigns;    // Campaign data by ID
mapping(uint256 => mapping(address => Contribution)) public contributions;  // Contributions by campaign & user
mapping(uint256 => DecryptionRequest) public decryptionRequests;  // Decryption requests by ID
mapping(address => uint256) public pendingRefunds;  // Pending refunds by address
```

---

## Enums

### CampaignStatus

```solidity
enum CampaignStatus {
    Active,              // 0 - Campaign accepting contributions
    FundingSuccess,      // 1 - Goal reached, creator can withdraw
    FundingFailed,       // 2 - Goal not reached, contributors can refund
    DecryptionFailed,    // 3 - Decryption error, automatic refund triggered
    RefundIssued         // 4 - Campaign completed, refunds processed
}
```

### DecryptionRequestStatus

```solidity
enum DecryptionRequestStatus {
    Pending,             // 0 - Awaiting Gateway processing
    Completed,           // 1 - Successfully decrypted
    Failed,              // 2 - Decryption failed
    TimedOut             // 3 - Exceeded timeout period
}
```

---

## Data Structures

### Campaign

```solidity
struct Campaign {
    address creator;                 // Campaign creator address
    uint256 targetAmount;            // Encrypted target (hash-based)
    uint256 currentAmount;           // Encrypted current (hash-based)
    uint256 deadline;                // Campaign funding deadline (timestamp)
    uint256 decryptionDeadline;      // Timeout protection deadline (timestamp)
    CampaignStatus status;           // Current campaign state
    string title;                    // Campaign title
    string description;              // Campaign description
    uint256 decryptionRequestId;     // Gateway request tracking ID
    uint256 totalContributions;      // Total actual ETH contributed
    uint256 platformFee;             // 2% platform fee collected
}
```

### Contribution

```solidity
struct Contribution {
    uint256 amount;                  // Privacy-obfuscated amount
    uint256 actualAmount;            // Real ETH amount (for refunds)
    uint256 timestamp;               // Contribution timestamp
    bool refundClaimed;              // Refund claim status
}
```

### DecryptionRequest

```solidity
struct DecryptionRequest {
    uint256 campaignId;              // Associated campaign ID
    DecryptionRequestStatus status;  // Request status
    uint256 requestTime;             // Request timestamp
    uint256 targetAmount;            // Decrypted target value
    uint256 currentAmount;           // Decrypted current value
    bytes callbackData;              // Additional callback data
}
```

---

## Events

### CampaignCreated

Emitted when a new campaign is created.

```solidity
event CampaignCreated(
    uint256 indexed campaignId,
    address indexed creator,
    string title,
    uint256 targetAmount,
    uint256 deadline
);
```

**Parameters**:
- `campaignId`: Unique campaign identifier
- `creator`: Address of campaign creator
- `title`: Campaign title
- `targetAmount`: Encrypted target amount hash
- `deadline`: Campaign deadline timestamp

### ContributionMade

Emitted when a contribution is made to a campaign.

```solidity
event ContributionMade(
    uint256 indexed campaignId,
    address indexed contributor,
    uint256 amount
);
```

**Parameters**:
- `campaignId`: Campaign receiving contribution
- `contributor`: Address of contributor
- `amount`: Actual ETH contribution amount

### DecryptionRequested

Emitted when decryption reveal is requested.

```solidity
event DecryptionRequested(
    uint256 indexed campaignId,
    uint256 requestId,
    uint256 timestamp
);
```

**Parameters**:
- `campaignId`: Campaign requesting decryption
- `requestId`: Unique request identifier
- `timestamp`: Request timestamp

### DecryptionCompleted

Emitted when decryption completes successfully.

```solidity
event DecryptionCompleted(
    uint256 indexed campaignId,
    uint256 requestId,
    uint256 revealedTarget,
    uint256 revealedCurrent
);
```

**Parameters**:
- `campaignId`: Decrypted campaign ID
- `requestId`: Request identifier
- `revealedTarget`: Decrypted target amount
- `revealedCurrent`: Decrypted current amount

### DecryptionFailed

Emitted when decryption fails.

```solidity
event DecryptionFailed(
    uint256 indexed campaignId,
    uint256 requestId,
    string reason
);
```

**Parameters**:
- `campaignId`: Campaign with failed decryption
- `requestId`: Request identifier
- `reason`: Failure reason description

### CampaignFunded

Emitted when campaign goal is reached and creator withdraws funds.

```solidity
event CampaignFunded(
    uint256 indexed campaignId,
    address indexed creator,
    uint256 totalAmount
);
```

**Parameters**:
- `campaignId`: Funded campaign ID
- `creator`: Creator address
- `totalAmount`: Total funds withdrawn

### CampaignExpired

Emitted when campaign deadline passes.

```solidity
event CampaignExpired(
    uint256 indexed campaignId,
    uint256 totalAmount
);
```

**Parameters**:
- `campaignId`: Expired campaign ID
- `totalAmount`: Total contributions at expiry

### RefundIssued

Emitted when refund is issued to contributor.

```solidity
event RefundIssued(
    uint256 indexed campaignId,
    address indexed contributor,
    uint256 amount
);
```

**Parameters**:
- `campaignId`: Campaign being refunded
- `contributor`: Recipient address
- `amount`: Refund amount

### RefundPending

Emitted when refund is queued but not yet sent.

```solidity
event RefundPending(
    uint256 indexed campaignId,
    address indexed contributor,
    uint256 amount
);
```

**Parameters**:
- `campaignId`: Campaign being refunded
- `contributor`: Recipient address
- `amount`: Pending refund amount

### TimeoutProtectionTriggered

Emitted when timeout protection mechanism is activated.

```solidity
event TimeoutProtectionTriggered(
    uint256 indexed campaignId,
    uint256 decryptionDeadline
);
```

**Parameters**:
- `campaignId`: Campaign with timeout
- `decryptionDeadline`: Deadline timestamp

### SecurityAudit

Emitted for security audit trail.

```solidity
event SecurityAudit(
    uint256 indexed campaignId,
    string auditType,
    string details
);
```

**Parameters**:
- `campaignId`: Associated campaign (0 for contract-level events)
- `auditType`: Type of audit event
- `details`: Detailed description

---

## Functions

### Owner Functions

#### setGatewayAddress

Sets the address of the Gateway service for decryption callbacks.

```solidity
function setGatewayAddress(address newGateway) external onlyOwner notZeroAddress(newGateway)
```

**Parameters**:
- `newGateway`: New Gateway address

**Reverts**:
- `AccessControl: caller is not owner` - Only owner can call
- `InputValidation: zero address not allowed` - Gateway address cannot be zero
- `InputValidation: gateway address unchanged` - Address must be different

**Events**: `SecurityAudit` ("GatewayUpdate")

**Example**:
```javascript
await contract.setGatewayAddress("0x1234...5678");
```

---

#### withdrawPlatformFees

Withdraws accumulated platform fees (2% of all contributions).

```solidity
function withdrawPlatformFees(address recipient) external onlyOwner notZeroAddress(recipient)
```

**Parameters**:
- `recipient`: Address to receive fees

**Reverts**:
- `AccessControl: caller is not owner` - Only owner can call
- `InputValidation: zero address not allowed` - Recipient cannot be zero
- `InputValidation: no fees to withdraw` - No fees collected
- `TransferFailed: platform fee withdrawal failed` - Transfer failed

**Events**: `SecurityAudit` ("FeeWithdrawal")

**Example**:
```javascript
await contract.withdrawPlatformFees(ownerAddress);
```

---

### Campaign Management

#### createCampaign

Creates a new crowdfunding campaign.

```solidity
function createCampaign(
    bytes calldata encryptedTarget,
    uint256 duration,
    string memory title,
    string memory description
) external notZeroAddress(msg.sender) returns (uint256)
```

**Parameters**:
- `encryptedTarget`: Encrypted campaign target amount
- `duration`: Campaign duration in seconds (max 365 days)
- `title`: Campaign title (non-empty)
- `description`: Campaign description (non-empty)

**Returns**: Campaign ID (uint256)

**Reverts**:
- `InputValidation: duration must be positive`
- `InputValidation: title cannot be empty`
- `InputValidation: description cannot be empty`
- `InputValidation: encrypted target required`
- `InputValidation: duration exceeds 1 year`

**Events**: `CampaignCreated`, `SecurityAudit` ("CampaignCreation")

**Example**:
```javascript
const encryptedTarget = ethers.AbiCoder.defaultAbiCoder().encode(
    ["uint256"],
    [ethers.parseEther("10")]
);

const campaignId = await contract.createCampaign(
    encryptedTarget,
    7 * 24 * 60 * 60,  // 7 days
    "My Campaign",
    "Campaign description"
);
```

---

#### contribute

Contributes ETH to an active campaign.

```solidity
function contribute(
    uint256 campaignId,
    bytes calldata encryptedAmount
) external payable validCampaignId(campaignId)
```

**Parameters**:
- `campaignId`: Campaign to contribute to
- `encryptedAmount`: Encrypted contribution amount
- `msg.value`: ETH amount to contribute

**Reverts**:
- `InputValidation: invalid campaign ID`
- `CampaignStatus: campaign not active`
- `CampaignStatus: campaign deadline passed`
- `InputValidation: contribution amount must be positive`
- `InputValidation: encrypted amount required`
- `OverflowProtection: contribution would overflow`

**Events**: `ContributionMade`, `SecurityAudit` ("ContributionTracking")

**Example**:
```javascript
const encryptedAmount = ethers.AbiCoder.defaultAbiCoder().encode(
    ["uint256"],
    [ethers.parseEther("0.5")]
);

await contract.contribute(
    campaignId,
    encryptedAmount,
    { value: ethers.parseEther("0.5") }
);
```

---

### Decryption & Gateway

#### requestDecryptionReveal

Requests decryption reveal from the Gateway after campaign expires.

```solidity
function requestDecryptionReveal(uint256 campaignId) external validCampaignId(campaignId)
```

**Parameters**:
- `campaignId`: Campaign to request decryption for

**Reverts**:
- `InputValidation: invalid campaign ID`
- `AccessControl: only campaign creator can request reveal`
- `CampaignStatus: campaign not active`
- `CampaignStatus: campaign not yet expired`
- `InputValidation: gateway address not configured`

**Events**: `DecryptionRequested`, `SecurityAudit` ("GatewayRequest")

**Example**:
```javascript
await contract.requestDecryptionReveal(campaignId);
```

---

#### onDecryptionComplete

Gateway callback function to report successful decryption.

```solidity
function onDecryptionComplete(
    uint256 campaignId,
    uint256 requestId,
    uint256 decryptedTarget,
    uint256 decryptedCurrent
) external onlyGateway validCampaignId(campaignId)
```

**Parameters**:
- `campaignId`: Campaign being decrypted
- `requestId`: Decryption request ID
- `decryptedTarget`: Decrypted target amount
- `decryptedCurrent`: Decrypted current amount

**Reverts**:
- `AccessControl: caller is not gateway`
- `InputValidation: invalid campaign ID`
- `InputValidation: request ID mismatch`
- `CampaignStatus: campaign not active`
- `InputValidation: target amount must be positive`

**Events**: `DecryptionCompleted`, `SecurityAudit` ("DecryptionComplete")

**Note**: Only callable by configured Gateway address

---

#### onDecryptionFailure

Gateway callback function to report decryption failure.

```solidity
function onDecryptionFailure(
    uint256 campaignId,
    uint256 requestId,
    string memory reason
) external onlyGateway validCampaignId(campaignId)
```

**Parameters**:
- `campaignId`: Campaign with failed decryption
- `requestId`: Decryption request ID
- `reason`: Failure reason description

**Reverts**:
- `AccessControl: caller is not gateway`
- `InputValidation: invalid campaign ID`
- `InputValidation: request ID mismatch`

**Events**: `DecryptionFailed`, `SecurityAudit` ("DecryptionFailure")

**Note**: Automatically enables refunds for all contributors

---

### Refunds & Timeout

#### claimRefund

Claims refund after campaign failure or decryption failure.

```solidity
function claimRefund(uint256 campaignId) external validCampaignId(campaignId)
```

**Parameters**:
- `campaignId`: Campaign to claim refund from

**Reverts**:
- `InputValidation: invalid campaign ID`
- `InputValidation: no contribution found`
- `RefundStatus: refund already claimed`
- `CampaignStatus: campaign status does not allow refund`
- `TransferFailed: refund transfer failed`

**Events**: `RefundIssued`, `SecurityAudit` ("RefundClaimed")

**Example**:
```javascript
await contract.claimRefund(campaignId);
```

---

#### claimRefundAfterTimeout

Emergency refund claim after decryption timeout period.

```solidity
function claimRefundAfterTimeout(uint256 campaignId) external validCampaignId(campaignId)
```

**Parameters**:
- `campaignId`: Campaign to claim timeout refund from

**Reverts**:
- `InputValidation: invalid campaign ID`
- `InputValidation: no contribution found`
- `RefundStatus: refund already claimed`
- `TimeoutProtection: decryption deadline not reached`
- `TransferFailed: timeout refund transfer failed`

**Events**: `RefundPending`, `TimeoutProtectionTriggered`, `RefundIssued`, `SecurityAudit` ("TimeoutRefund")

**Note**:
- Includes platform fee return (2%)
- Can be called by anyone for their own contributions
- Active 30 days after campaign deadline

**Example**:
```javascript
await contract.claimRefundAfterTimeout(campaignId);
```

---

#### withdrawFunds

Creator withdraws funds from successfully funded campaign.

```solidity
function withdrawFunds(uint256 campaignId) external validCampaignId(campaignId)
```

**Parameters**:
- `campaignId`: Campaign to withdraw from

**Reverts**:
- `InputValidation: invalid campaign ID`
- `AccessControl: only campaign creator can withdraw`
- `CampaignStatus: campaign not successfully funded`
- `InputValidation: no funds to withdraw`
- `TransferFailed: withdrawal transfer failed`

**Events**: `CampaignFunded`, `SecurityAudit` ("CreatorWithdrawal")

**Example**:
```javascript
await contract.withdrawFunds(campaignId);
```

---

### View Functions

#### getCampaignCount

Returns total number of campaigns created.

```solidity
function getCampaignCount() external view returns (uint256)
```

**Returns**: Total campaigns count

**Example**:
```javascript
const count = await contract.getCampaignCount();
```

---

#### getCampaignInfo

Returns detailed information about a campaign.

```solidity
function getCampaignInfo(uint256 campaignId) external view validCampaignId(campaignId)
    returns (
        address creator,
        uint256 deadline,
        uint256 decryptionDeadline,
        CampaignStatus status,
        string memory title,
        string memory description,
        uint256 totalContributions
    )
```

**Parameters**:
- `campaignId`: Campaign to query

**Returns**:
- `creator`: Campaign creator address
- `deadline`: Campaign deadline timestamp
- `decryptionDeadline`: Timeout protection deadline
- `status`: Current campaign status
- `title`: Campaign title
- `description`: Campaign description
- `totalContributions`: Total ETH contributed

**Example**:
```javascript
const info = await contract.getCampaignInfo(campaignId);
console.log(`Status: ${info.status}`);  // 0=Active, 1=Success, etc.
console.log(`Contributions: ${ethers.formatEther(info.totalContributions)} ETH`);
```

---

#### getContributionInfo

Returns information about a specific contribution.

```solidity
function getContributionInfo(uint256 campaignId, address contributor)
    external view validCampaignId(campaignId)
    returns (
        uint256 actualAmount,
        uint256 timestamp,
        bool refundClaimed
    )
```

**Parameters**:
- `campaignId`: Campaign to query
- `contributor`: Contributor address

**Returns**:
- `actualAmount`: Real ETH contribution amount
- `timestamp`: Contribution timestamp
- `refundClaimed`: Whether refund was claimed

**Example**:
```javascript
const info = await contract.getContributionInfo(campaignId, userAddress);
console.log(`Contributed: ${ethers.formatEther(info.actualAmount)} ETH`);
```

---

#### getDecryptionStatus

Returns status of a decryption request.

```solidity
function getDecryptionStatus(uint256 requestId) external view
    returns (
        uint256 campaignId,
        DecryptionRequestStatus status,
        uint256 requestTime,
        uint256 targetAmount,
        uint256 currentAmount
    )
```

**Parameters**:
- `requestId`: Decryption request ID

**Returns**:
- `campaignId`: Associated campaign ID
- `status`: Request status (0=Pending, 1=Completed, etc.)
- `requestTime`: Request timestamp
- `targetAmount`: Decrypted target (if completed)
- `currentAmount`: Decrypted current (if completed)

**Example**:
```javascript
const status = await contract.getDecryptionStatus(requestId);
if (status.status === 1) {
    console.log(`Target: ${status.targetAmount}`);
    console.log(`Current: ${status.currentAmount}`);
}
```

---

#### getPlatformFees

Returns total platform fees collected.

```solidity
function getPlatformFees() external view returns (uint256)
```

**Returns**: Total platform fees in wei

**Example**:
```javascript
const fees = await contract.getPlatformFees();
console.log(`Platform fees: ${ethers.formatEther(fees)} ETH`);
```

---

## Modifiers

### onlyOwner

Restricts function to contract owner.

```solidity
modifier onlyOwner() {
    require(msg.sender == owner, "AccessControl: caller is not owner");
    _;
}
```

---

### onlyGateway

Restricts function to configured Gateway address.

```solidity
modifier onlyGateway() {
    require(msg.sender == gatewayAddress, "AccessControl: caller is not gateway");
    _;
}
```

---

### validCampaignId

Validates campaign ID is within valid range.

```solidity
modifier validCampaignId(uint256 campaignId) {
    require(campaignId > 0 && campaignId < nextCampaignId, "InputValidation: invalid campaign ID");
    _;
}
```

---

### notZeroAddress

Validates address is not zero address.

```solidity
modifier notZeroAddress(address addr) {
    require(addr != address(0), "InputValidation: zero address not allowed");
    _;
}
```

---

## Gas Estimates

| Function | Gas Cost | Notes |
|----------|----------|-------|
| createCampaign | ~250,000 | Includes privacy multiplier generation |
| contribute | ~180,000 | Depends on existing contributions |
| requestDecryptionReveal | ~100,000 | Event emission for Gateway |
| onDecryptionComplete | ~150,000 | Status update and storage |
| onDecryptionFailure | ~120,000 | Status update and refund enablement |
| claimRefund | ~80,000 | Simple transfer |
| claimRefundAfterTimeout | ~100,000 | Includes fee calculation |
| withdrawFunds | ~85,000 | Creator withdrawal |
| getCampaignInfo | ~5,000 | View function |
| getContributionInfo | ~5,000 | View function |

---

## Error Codes & Messages

### AccessControl Errors

- `AccessControl: caller is not owner` - Only owner can perform action
- `AccessControl: caller is not gateway` - Only Gateway can perform action
- `AccessControl: only campaign creator can request reveal` - Only creator can request decryption
- `AccessControl: only campaign creator can withdraw` - Only creator can withdraw funds

### InputValidation Errors

- `InputValidation: invalid campaign ID` - Campaign ID out of valid range
- `InputValidation: zero address not allowed` - Address parameter is zero address
- `InputValidation: duration must be positive` - Duration is zero or negative
- `InputValidation: title cannot be empty` - Title string is empty
- `InputValidation: description cannot be empty` - Description string is empty
- `InputValidation: encrypted target required` - Encrypted target is empty
- `InputValidation: duration exceeds 1 year` - Duration longer than 365 days
- `InputValidation: contribution amount must be positive` - msg.value is zero
- `InputValidation: encrypted amount required` - Encrypted amount bytes empty
- `InputValidation: no contribution found` - User has no contribution in campaign
- `InputValidation: no fees to withdraw` - No platform fees to withdraw
- `InputValidation: gateway address not configured` - Gateway address is zero
- `InputValidation: request ID mismatch` - Request ID doesn't match campaign's request
- `InputValidation: target amount must be positive` - Decrypted target is zero

### CampaignStatus Errors

- `CampaignStatus: campaign not active` - Campaign is not in Active status
- `CampaignStatus: campaign deadline passed` - Campaign funding deadline has passed
- `CampaignStatus: campaign not yet expired` - Campaign deadline has not passed
- `CampaignStatus: campaign does not allow refund` - Campaign status doesn't permit refunds
- `CampaignStatus: campaign not successfully funded` - Campaign goal not reached

### RefundStatus Errors

- `RefundStatus: refund already claimed` - Contributor already claimed refund

### TimeoutProtection Errors

- `TimeoutProtection: decryption deadline not reached` - Timeout period not elapsed

### Transfer Errors

- `TransferFailed: refund transfer failed` - ETH transfer to recipient failed
- `TransferFailed: timeout refund transfer failed` - Timeout refund transfer failed
- `TransferFailed: withdrawal transfer failed` - Creator withdrawal failed
- `TransferFailed: platform fee withdrawal failed` - Fee withdrawal failed

### OverflowProtection Errors

- `OverflowProtection: contribution would overflow` - Contribution sum would overflow

---

## Integration Examples

### Complete Campaign Lifecycle

```javascript
// 1. Create campaign
const encryptedTarget = ethers.AbiCoder.defaultAbiCoder().encode(
    ["uint256"],
    [ethers.parseEther("10")]
);

const tx1 = await contract.createCampaign(
    encryptedTarget,
    7 * 24 * 60 * 60,  // 7 days
    "Fund My Project",
    "This is a test campaign"
);

const receipt1 = await tx1.wait();
const campaignId = receipt1.logs[0].args.campaignId;

// 2. Contribute to campaign
const encryptedAmount = ethers.AbiCoder.defaultAbiCoder().encode(
    ["uint256"],
    [ethers.parseEther("2")]
);

await contract.contribute(
    campaignId,
    encryptedAmount,
    { value: ethers.parseEther("2") }
);

// 3. Wait for deadline
await ethers.provider.send("hardhat_mine", ["0x15180"]);  // +7 days

// 4. Request decryption
await contract.requestDecryptionReveal(campaignId);

// 5. Gateway processes and calls back
await contract.onDecryptionComplete(
    campaignId,
    requestId,
    ethers.parseEther("10"),  // Target: 10 ETH
    ethers.parseEther("5")    // Current: 5 ETH (failed)
);

// 6. Claim refund
await contract.claimRefund(campaignId);
```

---

## Best Practices

1. **Always validate campaign status** before performing operations
2. **Use events** for off-chain indexing and tracking
3. **Check refund eligibility** before claiming refunds
4. **Set Gateway address** before requesting decryption
5. **Handle timeout protection** for long-running decryptions
6. **Monitor security audit events** for transparency
7. **Account for gas costs** when planning transactions
8. **Test with local network** before mainnet deployment

---

## Security Considerations

1. **Gateway Security**: Only authorize trusted Gateway addresses
2. **Encryption**: Ensure encrypted inputs are properly formatted
3. **Refunds**: Always claim refunds before campaign state changes
4. **Timeout**: Emergency refunds available if Gateway fails
5. **Access Control**: Modifiers enforce proper authorization
6. **Overflow Protection**: Explicit checks prevent integer overflow

---

## Version History

- **v1.0.0** (2025-01-01): Initial release
  - Campaign creation and management
  - Contribution tracking with privacy obfuscation
  - Gateway callback pattern for decryption
  - Refund and timeout protection
  - Comprehensive security features

---

## Support

For questions or issues:
1. Check the Architecture Documentation: `docs/ARCHITECTURE.md`
2. Review test files for usage examples
3. Submit issues on GitHub
4. Contact support team

