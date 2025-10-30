const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

console.log("========================================");
console.log("Security Audit Check");
console.log("========================================\n");

const checks = [
  {
    name: "NPM Audit",
    command: "npm audit --audit-level=moderate",
    description: "Checking for known vulnerabilities in dependencies",
  },
  {
    name: "Solhint",
    command: "npm run lint:sol",
    description: "Running Solidity linter for security issues",
  },
  {
    name: "Contract Size",
    command: "npm run size-contracts",
    description: "Checking contract size limits",
  },
];

let hasErrors = false;

for (const check of checks) {
  console.log(`\n📋 ${check.name}`);
  console.log(`   ${check.description}`);

  try {
    execSync(check.command, { stdio: "inherit" });
    console.log(`   ✅ ${check.name} passed`);
  } catch (error) {
    console.error(`   ❌ ${check.name} failed`);
    hasErrors = true;
  }
}

console.log("\n========================================");
if (hasErrors) {
  console.log("❌ Security checks failed");
  console.log("========================================\n");
  process.exit(1);
} else {
  console.log("✅ All security checks passed");
  console.log("========================================\n");
  process.exit(0);
}
