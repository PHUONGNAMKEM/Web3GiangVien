// scripts/deploy-thesis-v2.js
const hre = require("hardhat");

async function main() {
    console.log("=== Deploying ThesisManagementV2 ===");
    console.log("Network:", hre.network.name);

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer address:", deployer.address);

    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Deployer balance:", hre.ethers.formatEther(balance), "ETH");

    const ThesisV2 = await hre.ethers.getContractFactory("ThesisManagementV2");
    const thesis = await ThesisV2.deploy();

    await thesis.waitForDeployment();
    const address = await thesis.getAddress();

    console.log("\n✅ ThesisManagementV2 deployed to:", address);
    console.log("\n📋 Cập nhật .env:");
    console.log(`   THESIS_CONTRACT_ADDRESS=${address}`);
    console.log("\n⚠️  Contract V2 dùng bytes32 keys thay cho string → tiết kiệm gas ~30-50%");
    console.log("   Owner (chỉ GV mới gọi được registerTopic, finalizeGrade):", deployer.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
