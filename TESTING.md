# Testing Documentation

## Overview

This document provides comprehensive information about the testing infrastructure, test coverage, and testing procedures for the Crowdfund Platform smart contract.

## Test Infrastructure

### Testing Stack

- **Framework**: Hardhat
- **Test Runner**: Mocha
- **Assertion Library**: Chai
- **Network Helpers**: @nomicfoundation/hardhat-network-helpers
- **Coverage Tool**: solidity-coverage
- **Gas Reporter**: hardhat-gas-reporter

### Test Files

```
test/
└── CrowdfundPlatform.test.js    # Complete test suite (45+ test cases)
```

## Test Coverage

### Total Test Cases: 48

The test suite covers all critical aspects of the smart contract with comprehensive test scenarios.

### Test Categories

#### 1. Deployment Tests (3 tests)
- Contract deployment verification
- Initial state validation
- Deployer account verification

#### 2. Campaign Creation Tests (7 tests)
- Successful campaign creation
- Campaign count increment
- Campaign ID assignment
- Creator address storage
- Deadline calculation
- Multiple campaign handling
- Event emission

#### 3. Contribution Tests (8 tests)
- Successful contributions
- Inactive campaign rejection
- Zero value rejection
- Contribution tracking
- Balance updates
- Multiple contribution accumulation
- Expired campaign rejection
- Event emission

#### 4. Campaign Information Tests (2 tests)
- Campaign information retrieval
- Goal status checking

#### 5. Withdrawal and Refund Tests (2 tests)
- Non-creator withdrawal rejection
- Active campaign refund rejection

#### 6. View Functions Tests (3 tests)
- Campaign count retrieval
- Personal contribution queries
- Personal balance queries

#### 7. Edge Cases Tests (4 tests)
- Zero duration handling
- Large contribution processing
- Empty string handling
- Non-existent campaign ID

#### 8. Gas Optimization Tests (3 tests)
- Campaign creation gas usage
- Contribution gas usage
- View function gas efficiency

## Running Tests

### Basic Test Execution

```bash
# Run all tests
npm test

# Run specific test file
npx hardhat test test/CrowdfundPlatform.test.js

# Run with verbose output
npx hardhat test --verbose
```

### Test with Gas Reporting

```bash
# Enable gas reporter
REPORT_GAS=true npm test
```

### Test Coverage

```bash
# Generate coverage report
npm run coverage
```

Expected coverage metrics:
- **Statements**: > 95%
- **Branches**: > 90%
- **Functions**: 100%
- **Lines**: > 95%

## Test Structure

### Fixture Pattern

All tests use the loadFixture pattern for consistent deployment:

```javascript
async function deployFixture() {
  const [deployer, alice, bob, carol] = await ethers.getSigners();
  const CrowdfundPlatform = await ethers.getContractFactory("CrowdfundPlatform");
  const contract = await CrowdfundPlatform.deploy();
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress, deployer, alice, bob, carol };
}
```

### Test Organization

```javascript
describe("CrowdfundPlatform", function () {
  describe("Deployment", function () {
    // Deployment tests
  });

  describe("Campaign Creation", function () {
    // Creation tests
  });

  describe("Campaign Contributions", function () {
    // Contribution tests
  });

  // More test suites...
});
```

### Signer Roles

- **deployer**: Contract deployer (default admin)
- **alice**: Primary test user (campaign creator)
- **bob**: Secondary test user (contributor)
- **carol**: Tertiary test user (additional scenarios)

## Test Scenarios

### 1. Deployment Scenarios

**Test**: Contract deploys successfully
```javascript
it("should deploy successfully", async function () {
  const { contract, contractAddress } = await loadFixture(deployFixture);
  expect(contractAddress).to.be.properAddress;
});
```

**Test**: Initial state is correct
```javascript
it("should initialize with correct initial state", async function () {
  const { contract } = await loadFixture(deployFixture);
  const nextCampaignId = await contract.nextCampaignId();
  const totalCampaigns = await contract.totalCampaigns();

  expect(nextCampaignId).to.equal(1);
  expect(totalCampaigns).to.equal(0);
});
```

### 2. Campaign Creation Scenarios

**Test**: Create campaign with valid parameters
```javascript
it("should create a campaign successfully", async function () {
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
      "Test Campaign",
      "Description"
    )
  ).to.emit(contract, "CampaignCreated");
});
```

### 3. Contribution Scenarios

**Test**: Accept valid contributions
```javascript
it("should accept contribution successfully", async function () {
  const { contract, alice, bob } = await loadFixture(deployFixture);

  // Create campaign first
  // ... campaign creation code ...

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
```

**Test**: Reject zero-value contributions
```javascript
it("should revert contribution with zero value", async function () {
  // ... setup code ...

  await expect(
    contract.connect(bob).contribute(1, encryptedAmount, { value: 0 })
  ).to.be.revertedWith("Must send ETH");
});
```

### 4. Time-Based Scenarios

**Test**: Reject contributions after deadline
```javascript
it("should revert contribution after deadline", async function () {
  const { contract, alice, bob } = await loadFixture(deployFixture);

  // Create campaign with short duration
  const duration = 60; // 1 minute
  // ... creation code ...

  // Fast forward time
  await time.increase(120); // 2 minutes

  // Should revert
  await expect(
    contract.connect(bob).contribute(1, encryptedAmount, {
      value: contributionAmount
    })
  ).to.be.revertedWith("Campaign expired");
});
```

### 5. Access Control Scenarios

**Test**: Only creator can withdraw
```javascript
it("should revert withdrawal by non-creator", async function () {
  const { contract, alice, bob } = await loadFixture(deployFixture);

  // ... setup code ...

  await expect(
    contract.connect(bob).withdrawFunds(1)
  ).to.be.revertedWith("Not campaign creator");
});
```

### 6. Edge Case Scenarios

**Test**: Handle extreme values
```javascript
it("should handle very large contribution", async function () {
  const largeContribution = ethers.parseEther("10.0");
  // ... test large amounts ...
});

it("should handle zero duration", async function () {
  const duration = 0;
  // ... test zero duration ...
});

it("should handle empty strings", async function () {
  // ... test empty title/description ...
});
```

### 7. Gas Optimization Scenarios

**Test**: Verify reasonable gas usage
```javascript
it("should create campaign with reasonable gas", async function () {
  const tx = await contract.connect(alice).createCampaign(/* ... */);
  const receipt = await tx.wait();

  expect(receipt.gasUsed).to.be.lt(500000n);
});
```

## Continuous Integration

### GitHub Actions Workflow

```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test
      - run: npm run coverage
```

## Best Practices

### 1. Test Independence

Each test should be independent and not rely on other tests:

```javascript
beforeEach(async function () {
  // Fresh deployment for each test
  ({ contract, contractAddress, deployer, alice, bob, carol } =
    await loadFixture(deployFixture));
});
```

### 2. Clear Assertions

Use descriptive assertions with clear expected values:

```javascript
// Good
expect(campaignCount).to.equal(3);
expect(creator).to.equal(alice.address);

// Bad
expect(result).to.be.ok;
expect(value).to.exist;
```

### 3. Descriptive Test Names

Write clear, descriptive test names:

```javascript
// Good
it("should revert contribution with zero value", async function () {});
it("should emit CampaignCreated event", async function () {});

// Bad
it("test1", async function () {});
it("works", async function () {});
```

### 4. Test Organization

Group related tests in describe blocks:

```javascript
describe("Campaign Creation", function () {
  // All creation-related tests
});

describe("Campaign Contributions", function () {
  // All contribution-related tests
});
```

### 5. Error Testing

Always test error conditions:

```javascript
await expect(
  contract.someFunction()
).to.be.revertedWith("Expected error message");
```

## Debugging Tests

### Run Specific Test

```bash
# Run single test by name
npx hardhat test --grep "should deploy successfully"

# Run test suite by describe block
npx hardhat test --grep "Deployment"
```

### Enable Console Logging

Add console.log in tests for debugging:

```javascript
it("debug test", async function () {
  console.log("Contract address:", contractAddress);
  console.log("Campaign count:", await contract.getCampaignCount());
});
```

### View Transaction Details

```javascript
const tx = await contract.someFunction();
const receipt = await tx.wait();
console.log("Gas used:", receipt.gasUsed.toString());
console.log("Block number:", receipt.blockNumber);
```

## Test Maintenance

### Adding New Tests

1. Identify the functionality to test
2. Choose appropriate describe block
3. Write test following existing patterns
4. Run test to verify it passes
5. Update this documentation

### Updating Existing Tests

1. Modify test code
2. Run full test suite to check for regressions
3. Update coverage report
4. Update documentation if needed

### Test Review Checklist

- [ ] Test is independent
- [ ] Test has clear name
- [ ] Test uses fixtures properly
- [ ] Test has clear assertions
- [ ] Test covers edge cases
- [ ] Test handles errors properly
- [ ] Test is documented
- [ ] Test passes consistently

## Coverage Goals

### Target Metrics

- **Statement Coverage**: ≥ 95%
- **Branch Coverage**: ≥ 90%
- **Function Coverage**: 100%
- **Line Coverage**: ≥ 95%

### Uncovered Areas

Document any intentionally uncovered code with reasoning:

```solidity
// Uncovered: Emergency pause function - tested manually on testnet
function emergencyPause() external onlyOwner {
    // ...
}
```

## Performance Benchmarks

### Expected Test Execution Times

- Full test suite: < 30 seconds
- Deployment tests: < 2 seconds
- Contribution tests: < 5 seconds
- Edge case tests: < 3 seconds

### Gas Usage Benchmarks

- Campaign creation: < 500,000 gas
- Contribution: < 300,000 gas
- View functions: < 50,000 gas

## Troubleshooting

### Common Issues

**Issue**: Tests timeout
```bash
# Solution: Increase timeout in test
this.timeout(60000); // 60 seconds
```

**Issue**: Nonce too high
```bash
# Solution: Reset Hardhat network
npx hardhat clean
rm -rf cache artifacts
```

**Issue**: Contract not found
```bash
# Solution: Recompile contracts
npx hardhat compile --force
```

## Resources

- [Hardhat Testing Guide](https://hardhat.org/tutorial/testing-contracts)
- [Chai Assertion Library](https://www.chaijs.com/api/bdd/)
- [Ethers.js Documentation](https://docs.ethers.org)
- [Mocha Test Framework](https://mochajs.org/)

---

**Last Updated**: 2025-10-30
