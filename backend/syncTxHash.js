const mongoose = require('mongoose');
require('dotenv').config();

require('./models/SinhVien');
require('./models/GiangVien');
require('./models/DeTai');
require('./models/BaoCao');
require('./models/DiemSo');

const { ethers } = require('ethers');

async function sync() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI);
        
        const DiemSo = mongoose.model('DiemSo');
        const mockGrades = await DiemSo.find({ TxHash: { $regex: /^0xMock/ } }).populate('SinhVien DeTai');
        
        console.log(`Found ${mockGrades.length} grades with mock TxHashes.`);

        if (mockGrades.length === 0) {
            console.log("No work to do.");
            return;
        }

        const rpcUrl = process.env.SEPOLIA_RPC_URL;
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const contractAddress = process.env.THESIS_CONTRACT_ADDRESS;
        
        // Minimal ABI for finding events
        const abi = [
            "event GradeFinalized(string indexed studentDID, string indexed topicId, uint8 grade)"
        ];
        
        const contract = new ethers.Contract(contractAddress, abi, provider);

        for (const grade of mockGrades) {
            const studentDID = grade.SinhVien._id.toString();
            const topicId = grade.DeTai._id.toString();
            
            console.log(`\nSyncing: SV ${grade.SinhVien.HoTen} - Topic: ${grade.DeTai.TenDeTai}`);
            
            // Search for events
            // In Ethers.js v6, we use queryFilter
            const filter = contract.filters.GradeFinalized(studentDID, topicId);
            const events = await contract.queryFilter(filter, -10000); // Look back 10,000 blocks (~1.5 days on Sepolia)

            if (events.length > 0) {
                // Get the latest event
                const latestEvent = events[events.length - 1];
                const realTxHash = latestEvent.transactionHash;
                console.log(`Found real TxHash: ${realTxHash}`);
                
                grade.TxHash = realTxHash;
                await grade.save();
                console.log("Database updated successfully.");
            } else {
                console.log("No matching On-chain event found. The transaction might have failed or not broadcasted.");
            }
        }

    } catch (e) {
        console.error("Sync failed:", e);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

sync();
