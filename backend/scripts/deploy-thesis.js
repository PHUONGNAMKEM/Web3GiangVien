// scripts/deploy-thesis.js
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("Starting deployment of ThesisManagement...");

    const ThesisManagement = await hre.ethers.getContractFactory("ThesisManagement");
    const thesis = await ThesisManagement.deploy();

    await thesis.waitForDeployment();
    const address = await thesis.getAddress();

    console.log(`ThesisManagement deployed to: ${address}`);

    // Cập nhật địa chỉ contract vào file cấu hình hoặc .env nếu cần
    console.log("\n Vui lòng cập nhật biến môi trường THESIS_CONTRACT_ADDRESS=" + address + " vào file .env của bạn.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
