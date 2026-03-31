console.log("Script starting...");
const mongoose = require('mongoose');
require('dotenv').config();
console.log("Config loaded. Registering models...");

// Pre-register models to avoid "Schema hasn't been registered" errors
require('./models/SinhVien');
require('./models/GiangVien');
require('./models/DeTai');
require('./models/BaoCao');
require('./models/DiemSo');

const contractService = require('./services/thesisContractService');

async function runTest() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI);
        
        const BaoCao = mongoose.model('BaoCao');
        const firstBaoCao = await BaoCao.findOne().populate('SinhVien DeTai');
        
        if (!firstBaoCao) {
            console.log("No BaoCao found in DB to test with.");
            process.exit(0);
        }

        const studentDID = firstBaoCao.SinhVien._id.toString();
        const topicId = firstBaoCao.DeTai._id.toString();
        const grade = 8.8; // Use a distinct score
        const feedback = "Test feedback from debug script at " + new Date().toISOString();
        const idx = 0;

        console.log(`--- DEBUG INFO ---`);
        console.log(`Student DID: ${studentDID}`);
        console.log(`Topic ID:    ${topicId}`);
        console.log(`Grade:       ${grade}`);
        console.log(`------------------`);

        console.log("Calling contract finalizeGradeOnChain...");
        const result = await contractService.finalizeGradeOnChain(studentDID, topicId, grade, feedback, idx);
        console.log("SUCCESS! Transaction Hash:", result);
        console.log(`View it here: https://sepolia.etherscan.io/tx/${result}`);
    } catch (e) {
        console.error("--- TEST FAILED ---");
        console.error("Error Message:", e.message);
        if (e.data) console.error("Error Data:", e.data);
        if (e.transaction) console.error("Transaction detail:", e.transaction);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

runTest();
