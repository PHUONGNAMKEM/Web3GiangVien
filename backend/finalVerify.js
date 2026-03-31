const mongoose = require('mongoose');
const axios = require('axios');
require('dotenv').config();

require('./models/SinhVien');
require('./models/GiangVien');
require('./models/DeTai');
require('./models/BaoCao');
require('./models/DiemSo');

const { ethers } = require('ethers');

async function finalVerify() {
    try {
        console.log("=== FINAL VERIFICATION SYSTEM ===");
        await mongoose.connect(process.env.MONGODB_URI);
        
        const DiemSo = mongoose.model('DiemSo');
        const grades = await DiemSo.find().populate('SinhVien DeTai');
        
        const rpcUrl = process.env.SEPOLIA_RPC_URL;
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const contractAddress = process.env.THESIS_CONTRACT_ADDRESS;
        
        const abi = [
            "function getSubmissionHistory(string studentDID, string topicId) view returns (tuple(string studentDID, string topicId, string ipfsCID, uint256 timestamp, uint8 grade, string feedback, bool graded)[])"
        ];
        const contract = new ethers.Contract(contractAddress, abi, provider);

        const gateway = process.env.PINATA_GATEWAY || "gateway.pinata.cloud";

        for (const grade of grades) {
            console.log(`\n--- Report for: ${grade.SinhVien.HoTen} ---`);
            console.log(`Topic: ${grade.DeTai.TenDeTai}`);
            
            // 1. Blockchain Check
            console.log(`[BLOCKCHAIN] TxHash: ${grade.TxHash}`);
            if (grade.TxHash.startsWith('0xMock')) {
                console.log("❌ Error: Still has mock TxHash!");
            } else {
                console.log(`✅ Success: TxHash updated. View: https://sepolia.etherscan.io/tx/${grade.TxHash}`);
            }

            const studentDID = grade.SinhVien._id.toString();
            const topicId = grade.DeTai._id.toString();
            const history = await contract.getSubmissionHistory(studentDID, topicId);
            
            if (history.length > 0) {
                const sub = history[0];
                console.log(`[ON-CHAIN DATA] Score: ${Number(sub.grade) / 10}, Graded: ${sub.graded}, IPFS: ${sub.ipfsCID}`);
                
                // 2. IPFS Check
                const cid = sub.ipfsCID;
                const ipfsUrl = `https://${gateway}/ipfs/${cid}`;
                console.log(`[IPFS] Checking CID: ${cid}`);
                try {
                    // Try to fetch headers only to verify existence
                    const response = await axios.head(ipfsUrl, { timeout: 10000 });
                    console.log(`✅ Success: IPFS File is reachable at: ${ipfsUrl}`);
                } catch (err) {
                    console.log(`⚠️ Warning: IPFS File not instantly reachable via gateway (Status: ${err.response?.status || 'Timeout'}). Link: ${ipfsUrl}`);
                }
            } else {
                console.log("❌ Error: No submission history found on-chain!");
            }
        }

    } catch (e) {
        console.error("Verification failed:", e);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

finalVerify();
