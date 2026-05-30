const mongoose = require('mongoose');
require('dotenv').config();
const Admin = require('../models/Admin');

const adminWallet = '0x3081F8965F007A78C1502b51DAC0bD54E6f6dBBF'.toLowerCase();

async function seedAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://nguyenhuy4435:nhathuy812@clusterweb3.5tqfgfq.mongodb.net/test', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    const existingAdmin = await Admin.findOne({ WalletAddress: adminWallet });
    if (existingAdmin) {
      console.log('Admin already exists:', existingAdmin);
      process.exit(0);
    }

    const newAdmin = new Admin({
      WalletAddress: adminWallet,
      HoTen: 'Super Admin'
    });
    
    await newAdmin.save();
    console.log('Super Admin seeded successfully');
    console.log('Wallet Address:', adminWallet);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding Admin:', error);
    process.exit(1);
  }
}

seedAdmin();
