const mongoose = require('mongoose');
require('dotenv').config();

require('./models/SinhVien');
require('./models/GiangVien');
require('./models/DeTai');
require('./models/BaoCao');
require('./models/DiemSo');

const contractService = require('./services/thesisContractService');
const { ethers } = require('ethers');

async function audit() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI);
        
        const DiemSo = mongoose.model('DiemSo');
        const allGrades = await DiemSo.find().populate('SinhVien DeTai');
        
        console.log(`Found ${allGrades.length} grades in MongoDB.`);

        const rpcUrl = process.env.SEPOLIA_RPC_URL;
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const contractAddress = process.env.THESIS_CONTRACT_ADDRESS;
        
        // Minimal ABI for auditing
        const abi = [
            "function getSubmissionHistory(string studentDID, string topicId) view returns (tuple(string studentDID, string topicId, string ipfsCID, uint256 timestamp, uint8 grade, string feedback, bool graded)[])"
        ];
        
        const contract = new ethers.Contract(contractAddress, abi, provider);

        for (const grade of allGrades) {
            const studentDID = grade.SinhVien._id.toString();
            const topicId = grade.DeTai._id.toString();
            
            console.log(`\nChecking Grade: SV ${grade.SinhVien.HoTen} - Topic: ${grade.DeTai.TenDeTai}`);
            console.log(`DB TxHash: ${grade.TxHash}`);
            
            try {
                const history = await contract.getSubmissionHistory(studentDID, topicId);
                console.log(`On-chain History Length: ${history.length}`);
                history.forEach((sub, i) => {
                    console.log(`  [${i}] Graded: ${sub.graded}, Grade: ${sub.grade}, Feedback: ${sub.feedback}`);
                });
            } catch (err) {
                console.error(`  Error fetching on-chain history: ${err.message}`);
            }
        }

    } catch (e) {
        console.error("Audit failed:", e);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

audit();
