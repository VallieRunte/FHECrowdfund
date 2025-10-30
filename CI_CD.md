# CI/CD Documentation

## Overview

This project uses GitHub Actions for continuous integration and continuous deployment (CI/CD). The workflows automatically test, lint, and deploy the smart contracts on every push and pull request.

## Workflows

### 1. Test Workflow (`.github/workflows/test.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**Jobs:**

#### Test Job
Runs tests on multiple Node.js versions to ensure compatibility.

**Matrix Strategy:**
- Node.js 18.x
- Node.js 20.x

**Steps:**
1. Checkout code
2. Setup Node.js (with npm cache)
3. Install dependencies (`npm ci`)
4. Run Solhint linter
5. Compile contracts
6. Run test suite
7. Generate coverage report
8. Upload coverage to Codecov

#### Code Quality Job
Performs additional quality checks.

**Steps:**
1. Checkout code
2. Setup Node.js 20.x
3. Install dependencies
4. Check contract sizes
5. Run Solhint
6. Check code formatting (Prettier)

**Usage:**
```bash
# Triggered automatically on push/PR
# Manual execution:
gh workflow run test.yml
```

### 2. Manual Test Workflow (`.github/workflows/manual.yml`)

**Triggers:**
- Manual workflow dispatch only

**Features:**
- Choose environment (localhost/sepolia)
- Complete test execution
- Coverage report generation
- Contract size analysis

**Usage:**
```bash
# Via GitHub UI: Actions → Manual Test → Run workflow
# Via CLI:
gh workflow run manual.yml -f environment=localhost
```

### 3. Deploy Workflow (`.github/workflows/deploy.yml`)

**Triggers:**
- Manual workflow dispatch only

**Inputs:**
- `network`: Target network (localhost/sepolia)
- `verify`: Whether to verify on Etherscan (boolean)

**Environment Variables Required:**
- `SEPOLIA_RPC_URL`: RPC endpoint for Sepolia
- `PRIVATE_KEY`: Deployer private key
- `ETHERSCAN_API_KEY`: API key for verification

**Steps:**
1. Checkout code
2. Setup Node.js
3. Install dependencies
4. Compile contracts
5. Deploy to selected network
6. Verify on Etherscan (if enabled)
7. Upload deployment artifacts

**Usage:**
```bash
# Via GitHub UI: Actions → Deploy → Run workflow
# Via CLI:
gh workflow run deploy.yml -f network=sepolia -f verify=true
```

### 4. CodeQL Security Analysis (`.github/workflows/codeql.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches
- Weekly schedule (Monday at midnight)

**Purpose:**
- Automated security analysis
- Vulnerability detection
- Code quality scanning

**Language:**
- JavaScript/TypeScript

## Code Quality Tools

### Solhint

Solidity linter for smart contract best practices.

**Configuration:** `.solhint.json`

**Rules:**
- Code complexity: max 8
- Compiler version: >= 0.8.20
- Function visibility required
- Max line length: 120
- Named parameters mapping
- State visibility enforced

**Usage:**
```bash
# Lint contracts
npm run lint:sol

# Auto-fix issues
npm run lint:sol:fix
```

### Prettier

Code formatter for consistent style.

**Configuration:** `.prettierrc`

**Settings:**
- Print width: 120 characters
- Tab width: 2 spaces (4 for Solidity)
- Semi-colons: required
- Single quotes: disabled
- Trailing commas: ES5

**Usage:**
```bash
# Check formatting
npm run lint:check

# Fix formatting
npm run lint:fix

# Format all files
npm run format
```

## Code Coverage

### Codecov Integration

Automatic code coverage tracking and reporting.

**Configuration:** `codecov.yml`

**Settings:**
- Target coverage: 80%
- Threshold: 2% (project), 5% (patch)
- Precision: 2 decimal places
- Range: 70-100%

**Coverage Metrics:**
- Statement coverage
- Branch coverage
- Function coverage
- Line coverage

**Badge:**
```markdown
[![codecov](https://codecov.io/gh/YOUR_ORG/YOUR_REPO/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_ORG/YOUR_REPO)
```

**Setup:**
1. Sign up at https://codecov.io
2. Add repository
3. Get token
4. Add `CODECOV_TOKEN` to GitHub Secrets
5. Coverage reports uploaded automatically on test runs

## GitHub Secrets

Configure these secrets in your repository settings:

### Required for Deployment

| Secret | Description | Example |
|--------|-------------|---------|
| `SEPOLIA_RPC_URL` | Sepolia RPC endpoint | `https://eth-sepolia.g.alchemy.com/v2/...` |
| `PRIVATE_KEY` | Deployer wallet private key | `0x1234...` |
| `ETHERSCAN_API_KEY` | Etherscan API key | `ABC123...` |
| `CODECOV_TOKEN` | Codecov upload token | `xyz789...` |

**Security Notes:**
- Never commit secrets to the repository
- Use organization-level secrets for shared resources
- Rotate keys regularly
- Use minimal permission scopes

## Local Development

### Running CI Checks Locally

Before pushing, run the same checks that CI will perform:

```bash
# Install dependencies
npm ci

# Run linter
npm run lint:sol

# Check formatting
npm run lint:check

# Compile contracts
npm run compile

# Run tests
npm test

# Generate coverage
npm run coverage

# Check contract sizes
npm run size-contracts
```

### Pre-commit Checklist

- [ ] All tests pass (`npm test`)
- [ ] No linting errors (`npm run lint:sol`)
- [ ] Code is formatted (`npm run format`)
- [ ] Coverage meets threshold (>80%)
- [ ] Contracts compile without warnings
- [ ] Contract sizes are reasonable

## Continuous Integration Best Practices

### 1. Branch Protection

Configure branch protection rules for `main` and `develop`:

**Settings → Branches → Branch protection rules:**
- ✅ Require a pull request before merging
- ✅ Require status checks to pass before merging
  - test (Node.js 18.x)
  - test (Node.js 20.x)
  - code-quality
- ✅ Require conversation resolution before merging
- ✅ Require linear history
- ✅ Include administrators

### 2. Pull Request Workflow

1. Create feature branch from `develop`
2. Make changes and commit
3. Push to remote
4. Create pull request to `develop`
5. Wait for CI checks to pass
6. Request code review
7. Address feedback
8. Merge when approved and tests pass

### 3. Release Workflow

1. Create release branch from `develop`
2. Update version in `package.json`
3. Update `CHANGELOG.md`
4. Create PR to `main`
5. CI runs all checks
6. Merge to `main`
7. Tag release
8. Deploy to production (manual workflow)

## Monitoring and Notifications

### GitHub Actions Status

Monitor workflow runs:
- **GitHub UI**: Repository → Actions tab
- **CLI**: `gh run list`
- **API**: GitHub REST API

### Notifications

Configure notifications in GitHub settings:
- Email notifications for failed workflows
- Slack/Discord integration for team alerts
- Status badges in README

### Status Badges

Add to README.md:

```markdown
![Tests](https://github.com/YOUR_ORG/YOUR_REPO/workflows/Tests/badge.svg)
![CodeQL](https://github.com/YOUR_ORG/YOUR_REPO/workflows/CodeQL%20Security%20Analysis/badge.svg)
[![codecov](https://codecov.io/gh/YOUR_ORG/YOUR_REPO/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_ORG/YOUR_REPO)
```

## Troubleshooting

### Common Issues

#### Tests Fail in CI but Pass Locally

**Causes:**
- Environment differences
- Different Node.js versions
- Missing dependencies

**Solutions:**
```bash
# Use exact Node version from CI
nvm use 20

# Clean install dependencies
rm -rf node_modules package-lock.json
npm install

# Clear Hardhat cache
npx hardhat clean
```

#### Codecov Upload Fails

**Causes:**
- Invalid token
- Network issues
- Coverage file not found

**Solutions:**
- Verify `CODECOV_TOKEN` secret
- Check coverage file path in workflow
- Review Codecov action logs

#### Deployment Fails

**Causes:**
- Missing secrets
- Insufficient gas
- Network issues
- RPC rate limiting

**Solutions:**
- Verify all secrets are set
- Check deployer account balance
- Try with different RPC provider
- Add retry logic to deployment script

### Debug Mode

Enable debug logging in workflows:

```yaml
- name: Debug info
  run: |
    echo "Node version: $(node --version)"
    echo "NPM version: $(npm --version)"
    echo "Working directory: $(pwd)"
    ls -la
```

## Performance Optimization

### Cache Strategy

Workflows use npm cache to speed up installations:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20.x
    cache: 'npm'
```

### Parallel Jobs

Tests run in parallel across Node.js versions:

```yaml
strategy:
  matrix:
    node-version: [18.x, 20.x]
```

### Artifact Sharing

Share build artifacts between jobs:

```yaml
- uses: actions/upload-artifact@v4
  with:
    name: contracts
    path: artifacts/
```

## Security Considerations

### Secret Management

- Use GitHub Secrets for sensitive data
- Never log secret values
- Rotate secrets regularly
- Use environment-specific secrets

### Permissions

Workflows use minimal permissions:

```yaml
permissions:
  contents: read
  security-events: write  # Only for CodeQL
```

### Dependency Security

- Regular dependency updates
- Automated security scanning (CodeQL)
- Audit dependencies: `npm audit`

## Maintenance

### Regular Updates

- Update GitHub Actions to latest versions
- Keep dependencies up to date
- Review and update coverage thresholds
- Monitor CI performance

### Workflow Review

Quarterly review:
- Are all workflows still needed?
- Can any steps be optimized?
- Are there new security best practices?
- Update Node.js versions in matrix

---

**Last Updated**: 2025-10-30

For questions or issues with CI/CD, please open an issue on GitHub.
