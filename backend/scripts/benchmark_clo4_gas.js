// scripts/benchmark_clo4_gas.js
// CLO4 — Đo GAS FEE & THROUGHPUT on-chain cho ThesisManagementV2 (contract production).
// Chạy:  npx hardhat run scripts/benchmark_clo4_gas.js
// (dùng mạng hardhat in-process, auto-mine — gasUsed lấy từ receipt là số THẬT, xác định).
//
// Đo 5 hàm ghi state đúng như luồng hệ thống:
//   registerTopic | submitReport | submitTestResult | submitProgress | finalizeGrade
// + deploy contract. Mỗi hàm chạy N lần lấy trung bình.
//
// Xuất:
//   Document/Day13-06-2026/CLO4_KiemThu/CLO4_Gas_Results.csv
//   Document/Day13-06-2026/CLO4_KiemThu/CLO4_Gas_metrics.json

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// ===== GIẢ ĐỊNH QUY ĐỔI (nêu rõ trong báo cáo) =====
const ETH_USD = 3000;            // 1 ETH ≈ 3,000 USD (giả định, chỉnh theo thời điểm)
const USD_VND = 25400;           // 1 USD ≈ 25,400 VND (giả định)
const GAS_PRICE_SCENARIOS_GWEI = [1, 10, 30]; // Sepolia-thấp / trung bình / mainnet-bận
const HEADLINE_GWEI = 10;        // mốc dùng cho cột chi phí "đại diện"

// ===== THAM SỐ THROUGHPUT ON-CHAIN (Ethereum/Sepolia) =====
const BLOCK_GAS_LIMIT = 30_000_000; // gas limit/block (~Ethereum)
const BLOCK_TIME_SEC = 12;          // thời gian/block (~Ethereum/Sepolia PoS)

const N = 20; // số vòng lặp mỗi hàm

const OUT_DIR = path.join(__dirname, "..", "..", "Document", "Day13-06-2026", "CLO4_KiemThu");

function id(s) { return hre.ethers.id(s); } // keccak256(utf8) -> bytes32

async function gasOf(txPromise) {
  const tx = await txPromise;
  const rc = await tx.wait();
  return Number(rc.gasUsed);
}

function stats(arr) {
  const s = [...arr].sort((a, b) => a - b);
  const sum = s.reduce((a, b) => a + b, 0);
  return {
    mean: Math.round(sum / s.length),
    min: s[0],
    max: s[s.length - 1],
    p50: s[Math.floor(0.5 * (s.length - 1))],
  };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log("=== CLO4 GAS BENCHMARK — ThesisManagementV2 ===");
  console.log("Network:", hre.network.name);

  const [deployer, student] = await hre.ethers.getSigners();

  // --- DEPLOY (đo gas deploy) ---
  const Factory = await hre.ethers.getContractFactory("ThesisManagementV2");
  const contract = await Factory.deploy();
  const deployRc = await contract.deploymentTransaction().wait();
  const deployGas = Number(deployRc.gasUsed);
  const addr = await contract.getAddress();
  console.log("Deployed at:", addr, "| deploy gas:", deployGas);

  const advisorDID = id("advisor:GV001");
  const requirements = ["React", "NodeJS", "Database", "LMS"];
  const ipfsCID = "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco"; // CID mẫu 46 ký tự
  const feedback = "Bao cao dat yeu cau, trinh bay ro rang, du noi dung chuyen mon.";

  const g = {
    registerTopic: [], submitReport: [], submitTestResult: [],
    submitProgress: [], finalizeGrade: [],
  };

  // --- Đo throughput ghi local (gửi + mine N*5 tx), nhãn: minh hoạ tốc độ ghi hệ thống ---
  const tWall0 = Date.now();
  let txCount = 0;

  for (let i = 0; i < N; i++) {
    const topicHash = id("topic:" + i);
    const studentDID = id("student:" + i);
    const now = Math.floor(Date.now() / 1000);
    const deadline = now + 30 * 24 * 3600;

    g.registerTopic.push(await gasOf(
      contract.registerTopic(topicHash, "De tai do an tot nghiep so " + i, advisorDID, deadline, requirements)
    )); txCount++;

    g.submitReport.push(await gasOf(
      contract.connect(student).submitReport(studentDID, topicHash, ipfsCID, now)
    )); txCount++;

    g.submitTestResult.push(await gasOf(
      contract.connect(student).submitTestResult(topicHash, studentDID, 85) // 8.5đ
    )); txCount++;

    g.submitProgress.push(await gasOf(
      contract.connect(student).submitProgress(topicHash, studentDID, 1, 80) // tuần 1, 8.0đ
    )); txCount++;

    g.finalizeGrade.push(await gasOf(
      contract.finalizeGrade(studentDID, topicHash, 9, feedback, 0) // điểm 9
    )); txCount++;
  }
  const wallSec = (Date.now() - tWall0) / 1000;

  // ===== Tổng hợp =====
  const order = ["registerTopic", "submitReport", "submitTestResult", "submitProgress", "finalizeGrade"];
  const labels = {
    registerTopic: "GV đăng ký đề tài",
    submitReport: "SV nộp báo cáo (IPFS CID)",
    submitTestResult: "Ghi điểm bài test cạnh tranh",
    submitProgress: "Ghi đánh giá tiến độ tuần",
    finalizeGrade: "GV chốt điểm + feedback",
  };

  const gweiToEthFee = (gas, gwei) => gas * gwei * 1e-9; // ETH
  const fns = order.map((k) => {
    const st = stats(g[k]);
    const feeEth = gweiToEthFee(st.mean, HEADLINE_GWEI);
    return {
      fn: k,
      label: labels[k],
      gas_mean: st.mean, gas_min: st.min, gas_max: st.max, gas_p50: st.p50,
      fee_eth_at_headline: feeEth,
      fee_usd_at_headline: feeEth * ETH_USD,
      fee_vnd_at_headline: feeEth * ETH_USD * USD_VND,
      // throughput on-chain lý thuyết cho riêng hàm này
      tx_per_block: Math.floor(BLOCK_GAS_LIMIT / st.mean),
      tx_per_sec_onchain: +(BLOCK_GAS_LIMIT / st.mean / BLOCK_TIME_SEC).toFixed(2),
    };
  });

  // "Một quy trình đầy đủ" = 1 lần mỗi hàm
  const fullFlowGas = fns.reduce((a, f) => a + f.gas_mean, 0);
  const fullFlowFeeEth = gweiToEthFee(fullFlowGas, HEADLINE_GWEI);

  const metrics = {
    contract: "ThesisManagementV2",
    network: hre.network.name,
    iterations_per_fn: N,
    assumptions: {
      eth_usd: ETH_USD, usd_vnd: USD_VND,
      headline_gas_price_gwei: HEADLINE_GWEI,
      gas_price_scenarios_gwei: GAS_PRICE_SCENARIOS_GWEI,
      block_gas_limit: BLOCK_GAS_LIMIT, block_time_sec: BLOCK_TIME_SEC,
    },
    deploy_gas: deployGas,
    functions: fns,
    full_flow: {
      gas: fullFlowGas,
      fee_eth_at_headline: fullFlowFeeEth,
      fee_usd_at_headline: fullFlowFeeEth * ETH_USD,
      fee_vnd_at_headline: fullFlowFeeEth * ETH_USD * USD_VND,
    },
    scenarios_full_flow_vnd: Object.fromEntries(
      GAS_PRICE_SCENARIOS_GWEI.map((gw) => [gw + "gwei",
        Math.round(gweiToEthFee(fullFlowGas, gw) * ETH_USD * USD_VND)])
    ),
    local_write_throughput: {
      tx_sent: txCount, wall_seconds: +wallSec.toFixed(2),
      tx_per_sec_local: +(txCount / wallSec).toFixed(1),
      note: "Local hardhat auto-mine; minh hoạ tốc độ ghi ứng dụng, KHÔNG phải giới hạn blockchain thật",
    },
  };

  // ===== CSV =====
  const csvPath = path.join(OUT_DIR, "CLO4_Gas_Results.csv");
  const lines = [];
  lines.push("Function,Mo ta,Gas (mean),Gas (min),Gas (max),Fee ETH @" + HEADLINE_GWEI + "gwei,Fee USD,Fee VND,Tx/block,Tx/s on-chain");
  for (const f of fns) {
    lines.push([
      f.fn, '"' + f.label + '"', f.gas_mean, f.gas_min, f.gas_max,
      f.fee_eth_at_headline.toFixed(8), f.fee_usd_at_headline.toFixed(4),
      Math.round(f.fee_vnd_at_headline), f.tx_per_block, f.tx_per_sec_onchain,
    ].join(","));
  }
  lines.push("");
  lines.push("Deploy contract,(1 lan),," + deployGas + ",,,,,,");
  lines.push("FULL FLOW (5 ham),(1 quy trinh)," + fullFlowGas + ",,," +
    fullFlowFeeEth.toFixed(8) + "," + (fullFlowFeeEth * ETH_USD).toFixed(4) + "," +
    Math.round(fullFlowFeeEth * ETH_USD * USD_VND) + ",,");
  lines.push("");
  lines.push("Gia dinh:,1 ETH=" + ETH_USD + " USD; 1 USD=" + USD_VND + " VND; gas price=" + HEADLINE_GWEI + " gwei");
  lines.push("Throughput on-chain gia dinh:,block gas limit=" + BLOCK_GAS_LIMIT + "; block time=" + BLOCK_TIME_SEC + "s");
  fs.writeFileSync(csvPath, "﻿" + lines.join("\n"), "utf-8");

  const jsonPath = path.join(OUT_DIR, "CLO4_Gas_metrics.json");
  fs.writeFileSync(jsonPath, JSON.stringify(metrics, null, 2), "utf-8");

  // ===== In bảng =====
  console.log("\n=== GAS PER FUNCTION (mean over " + N + ") ===");
  for (const f of fns) {
    console.log(`${f.fn.padEnd(18)} gas=${String(f.gas_mean).padStart(8)} | ` +
      `~${Math.round(f.fee_vnd_at_headline).toLocaleString()} VND @${HEADLINE_GWEI}gwei | ` +
      `${f.tx_per_sec_onchain} tx/s on-chain`);
  }
  console.log(`\nFULL FLOW gas=${fullFlowGas} | ~${Math.round(fullFlowFeeEth * ETH_USD * USD_VND).toLocaleString()} VND @${HEADLINE_GWEI}gwei`);
  console.log(`Deploy gas=${deployGas}`);
  console.log(`Local write throughput: ${metrics.local_write_throughput.tx_per_sec_local} tx/s (${txCount} tx in ${wallSec.toFixed(2)}s)`);
  console.log(`\nCSV  -> ${csvPath}`);
  console.log(`JSON -> ${jsonPath}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
