require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
    // 1. Update existing students with new fields
    const r = await mongoose.connection.collection('sinhviens').updateMany(
        {},
        { $set: { ChuyenNganh: 'Công nghệ phần mềm', KyNang: ['React', 'NodeJS', 'Python', 'Solidity', 'Blockchain'] } }
    );
    console.log('Updated', r.modifiedCount, 'students with ChuyenNganh + KyNang');

    // Verify
    const sv = await mongoose.connection.collection('sinhviens').findOne({});
    console.log('Sample SV:', JSON.stringify(sv, null, 2));
    
    mongoose.disconnect();
}).catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
