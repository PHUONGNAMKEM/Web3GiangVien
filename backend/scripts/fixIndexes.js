/**
 * Script kiểm tra và sửa indexes cho collection dangkydettais
 * Chạy: node scripts/fixIndexes.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function fixIndexes() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/web3';
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('✅ Connected!\n');

    const db = mongoose.connection.db;
    const collection = db.collection('dangkydetais');

    // 1. Xem tất cả indexes hiện có
    const indexes = await collection.indexes();
    console.log('📋 Indexes hiện tại của dangkydettais:');
    console.log('─'.repeat(60));
    indexes.forEach((idx, i) => {
      console.log(`  ${i + 1}. Name: "${idx.name}"`);
      console.log(`     Key:    ${JSON.stringify(idx.key)}`);
      console.log(`     Unique: ${idx.unique || false}`);
      console.log(`     Sparse: ${idx.sparse || false}`);
      console.log('');
    });

    // 2. Tìm index cũ DeTai_1_SinhVien_1 (unique, KHÔNG sparse)
    const oldIndex = indexes.find(idx => 
      idx.name === 'DeTai_1_SinhVien_1' && idx.unique === true && !idx.sparse
    );

    if (oldIndex) {
      console.log('⚠️  Tìm thấy index CŨ cần drop: "DeTai_1_SinhVien_1" (unique, non-sparse)');
      console.log('   → Drop index này...');
      await collection.dropIndex('DeTai_1_SinhVien_1');
      console.log('   ✅ Đã drop thành công!\n');
    } else {
      console.log('ℹ️  Không tìm thấy index cũ "DeTai_1_SinhVien_1" (unique, non-sparse). OK!\n');
    }

    // 3. Kiểm tra và tạo indexes mới (sparse)
    console.log('🔧 Tạo indexes mới (sparse)...');
    
    // Index cho Nhom (mới)
    try {
      await collection.createIndex(
        { DeTai: 1, Nhom: 1 }, 
        { unique: true, sparse: true, name: 'DeTai_1_Nhom_1_sparse' }
      );
      console.log('   ✅ Created: DeTai_1_Nhom_1 (unique, sparse)');
    } catch (e) {
      if (e.code === 85 || e.code === 86) {
        console.log('   ℹ️  DeTai_1_Nhom_1 đã tồn tại, skip.');
      } else {
        console.log(`   ⚠️  Error: ${e.message}`);
      }
    }

    // Index cho SinhVien (backward compat, sparse)
    try {
      await collection.createIndex(
        { DeTai: 1, SinhVien: 1 }, 
        { unique: true, sparse: true, name: 'DeTai_1_SinhVien_1_sparse' }
      );
      console.log('   ✅ Created: DeTai_1_SinhVien_1 (unique, sparse)');
    } catch (e) {
      if (e.code === 85 || e.code === 86) {
        console.log('   ℹ️  DeTai_1_SinhVien_1 đã tồn tại (có thể dạng khác), skip.');
      } else {
        console.log(`   ⚠️  Error: ${e.message}`);
      }
    }

    // 4. Xem lại indexes sau khi sửa
    const newIndexes = await collection.indexes();
    console.log('\n📋 Indexes SAU khi sửa:');
    console.log('─'.repeat(60));
    newIndexes.forEach((idx, i) => {
      console.log(`  ${i + 1}. Name: "${idx.name}"`);
      console.log(`     Key:    ${JSON.stringify(idx.key)}`);
      console.log(`     Unique: ${idx.unique || false}`);
      console.log(`     Sparse: ${idx.sparse || false}`);
      console.log('');
    });

    console.log('🎉 Done!');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

fixIndexes();
