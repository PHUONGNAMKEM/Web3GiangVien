const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

const DeTai = require('../models/DeTai');
const Nhom = require('../models/Nhom');
const BaoCao = require('../models/BaoCao');
const TienDo = require('../models/TienDo');
const LopHoc = require('../models/LopHoc');
const DangKyDeTai = require('../models/DangKyDeTai');
const DiemSo = require('../models/DiemSo');

const dryRun = process.argv.includes('--dry-run');

async function migrate() {
  console.log(`Starting migration... Dry-run mode: ${dryRun}`);
  const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://nguyenhuy4435:nhathuy812@clusterweb3.5tqfgfq.mongodb.net/web3';
  
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    
    // 1. DeTai: Tìm tất cả DeTai chưa có LopHoc hoặc LopHoc rỗng
    console.log('\n--- 1. Migrating DeTai ---');
    const deTais = await DeTai.find({ $or: [{ LopHoc: { $exists: false } }, { LopHoc: { $size: 0 } }] });
    console.log(`Found ${deTais.length} DeTai documents to migrate.`);
    for (const dt of deTais) {
      if (dt.MonHoc) {
        const lops = await LopHoc.find({ MonHoc: dt.MonHoc });
        if (lops.length > 0) {
          const lopIds = lops.map(l => l._id);
          console.log(`DeTai "${dt.TenDeTai}" (${dt._id}): Associating with LopHoc [${lops.map(l => l.MaLopHoc).join(', ')}]`);
          if (!dryRun) {
            dt.LopHoc = lopIds;
            await dt.save();
          }
        } else {
          console.log(`DeTai "${dt.TenDeTai}" (${dt._id}): No LopHoc found for MonHoc ${dt.MonHoc}`);
        }
      } else {
        console.log(`DeTai "${dt.TenDeTai}" (${dt._id}): No MonHoc assigned.`);
      }
    }
    
    // 2. Nhom: Tìm Nhom chưa có LopHoc
    console.log('\n--- 2. Migrating Nhom ---');
    const nhoms = await Nhom.find({ $or: [{ LopHoc: { $exists: false } }, { LopHoc: null }] });
    console.log(`Found ${nhoms.length} Nhom documents to migrate.`);
    for (const nhom of nhoms) {
      // Find DangKyDeTai for this nhom
      const dk = await DangKyDeTai.findOne({ Nhom: nhom._id, TrangThai: { $nin: ['TuChoi', 'Thua'] } });
      if (dk && dk.DeTai) {
        const dt = await DeTai.findById(dk.DeTai);
        if (dt && dt.LopHoc && dt.LopHoc.length > 0) {
          // Find which LopHoc of the DeTai contains the Nhom members
          const memberIds = [nhom.TruongNhom, ...nhom.ThanhVien.map(m => m.SinhVien)].filter(Boolean).map(id => id.toString());
          let matchedLopId = null;
          
          for (const lopId of dt.LopHoc) {
            const lop = await LopHoc.findById(lopId);
            if (lop) {
              const lopSvStrs = lop.SinhVien.map(id => id.toString());
              if (memberIds.some(mId => lopSvStrs.includes(mId))) {
                matchedLopId = lop._id;
                break;
              }
            }
          }
          
          if (!matchedLopId) {
            matchedLopId = dt.LopHoc[0]; // fallback
          }
          
          console.log(`Nhom "${nhom.TenNhom}" (${nhom._id}): Associating with LopHoc ${matchedLopId}`);
          if (!dryRun) {
            nhom.LopHoc = matchedLopId;
            await nhom.save();
          }
        } else {
          console.log(`Nhom "${nhom.TenNhom}" (${nhom._id}): DeTai has no LopHoc.`);
        }
      } else {
        // Fallback: search for any LopHoc containing TruongNhom
        const lop = await LopHoc.findOne({ SinhVien: nhom.TruongNhom });
        if (lop) {
          console.log(`Nhom "${nhom.TenNhom}" (${nhom._id}) Fallback: Associating with LopHoc ${lop.MaLopHoc} (based on TruongNhom)`);
          if (!dryRun) {
            nhom.LopHoc = lop._id;
            await nhom.save();
          }
        } else {
          console.log(`Nhom "${nhom.TenNhom}" (${nhom._id}): No DangKyDeTai or class with TruongNhom found.`);
        }
      }
    }
    
    // 3. BaoCao: Tìm BaoCao chưa có Nhom
    console.log('\n--- 3. Migrating BaoCao ---');
    const baoCaos = await BaoCao.find({ $or: [{ Nhom: { $exists: false } }, { Nhom: null }] });
    console.log(`Found ${baoCaos.length} BaoCao documents to migrate.`);
    for (const bc of baoCaos) {
      const nhomList = await Nhom.find({
        $or: [
          { TruongNhom: bc.SinhVien },
          { 'ThanhVien.SinhVien': bc.SinhVien }
        ]
      });
      
      let matchedNhomId = null;
      if (nhomList.length > 0) {
        const nhomIds = nhomList.map(n => n._id);
        const dk = await DangKyDeTai.findOne({
          DeTai: bc.DeTai,
          Nhom: { $in: nhomIds },
          TrangThai: { $nin: ['TuChoi', 'Thua'] }
        });
        if (dk) {
          matchedNhomId = dk.Nhom;
        } else {
          matchedNhomId = nhomList[0]._id; // fallback
        }
      }
      
      if (matchedNhomId) {
        console.log(`BaoCao "${bc.TieuDe}" (${bc._id}): Associating with Nhom ${matchedNhomId}`);
        if (!dryRun) {
          bc.Nhom = matchedNhomId;
          await bc.save();
        }
      } else {
        console.log(`BaoCao "${bc.TieuDe}" (${bc._id}): No Nhom found for SinhVien ${bc.SinhVien}`);
      }
    }
    
    // 4. TienDo: Tìm TienDo chưa có Nhom
    console.log('\n--- 4. Migrating TienDo ---');
    const tienDos = await TienDo.find({ $or: [{ Nhom: { $exists: false } }, { Nhom: null }] });
    console.log(`Found ${tienDos.length} TienDo documents to migrate.`);
    for (const td of tienDos) {
      const nhomList = await Nhom.find({
        $or: [
          { TruongNhom: td.SinhVien },
          { 'ThanhVien.SinhVien': td.SinhVien }
        ]
      });
      
      let matchedNhomId = null;
      if (nhomList.length > 0) {
        const nhomIds = nhomList.map(n => n._id);
        const dk = await DangKyDeTai.findOne({
          DeTai: td.DeTai,
          Nhom: { $in: nhomIds },
          TrangThai: { $nin: ['TuChoi', 'Thua'] }
        });
        if (dk) {
          matchedNhomId = dk.Nhom;
        } else {
          matchedNhomId = nhomList[0]._id; // fallback
        }
      }
      
      if (matchedNhomId) {
        console.log(`TienDo (Tuan ${td.TuanSo}) (${td._id}): Associating with Nhom ${matchedNhomId}`);
        if (!dryRun) {
          td.Nhom = matchedNhomId;
          await td.save();
        }
      } else {
        console.log(`TienDo (Tuan ${td.TuanSo}) (${td._id}): No Nhom found for SinhVien ${td.SinhVien}`);
      }
    }

    // 5. DiemSo: Tìm DiemSo chưa có Nhom
    console.log('\n--- 5. Migrating DiemSo ---');
    const diemSos = await DiemSo.find({ $or: [{ Nhom: { $exists: false } }, { Nhom: null }] });
    console.log(`Found ${diemSos.length} DiemSo documents to migrate.`);
    for (const ds of diemSos) {
      const nhomList = await Nhom.find({
        $or: [
          { TruongNhom: ds.SinhVien },
          { 'ThanhVien.SinhVien': ds.SinhVien }
        ]
      });
      
      let matchedNhomId = null;
      if (nhomList.length > 0) {
        const nhomIds = nhomList.map(n => n._id);
        const dk = await DangKyDeTai.findOne({
          DeTai: ds.DeTai,
          Nhom: { $in: nhomIds },
          TrangThai: { $nin: ['TuChoi', 'Thua'] }
        });
        if (dk) {
          matchedNhomId = dk.Nhom;
        } else {
          matchedNhomId = nhomList[0]._id; // fallback
        }
      }
      
      if (matchedNhomId) {
        console.log(`DiemSo (SV ${ds.SinhVien}) (${ds._id}): Associating with Nhom ${matchedNhomId}`);
        if (!dryRun) {
          ds.Nhom = matchedNhomId;
          if (ds.DiemGoc === undefined) {
            ds.DiemGoc = ds.Diem;
          }
          await ds.save();
        }
      } else {
        console.log(`DiemSo (SV ${ds.SinhVien}) (${ds._id}): No Nhom found for SinhVien ${ds.SinhVien}`);
      }
    }
    
    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

migrate();
