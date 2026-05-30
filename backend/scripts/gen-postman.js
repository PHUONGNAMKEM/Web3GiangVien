/**
 * gen-postman.js v4 — Smoke Test xanh thật cho CẢ Giảng viên VÀ Sinh viên
 *
 *   node scripts/gen-postman.js
 *
 * Sinh ra:
 *   - Web3GiangVien_SmokeTest_Lecturer.postman_collection.json  (token GIẢNG VIÊN)
 *   - Web3GiangVien_SmokeTest_Student.postman_collection.json   (token SINH VIÊN)
 *   - Web3GiangVien.postman_environment.json                    (dùng chung)
 *
 * Cách dùng:
 *   1. Lấy token GV:  node scripts/get-token.js 0xPK_GIANGVIEN  → token + User ID (gvId)
 *   2. Lấy token SV:  node scripts/get-token.js 0xPK_SINHVIEN   → token + User ID (svId)
 *   3. Postman: Import 2 collection + environment
 *   4. Chạy Lecturer: dán token GV vào "token", gvId vào "gvId" → Run
 *   5. Chạy Student:  dán token SV vào "token", svId vào "svId" → Run
 *
 * FIX cốt lõi: event (test script) đặt ở CẤP ITEM → assertion mới chạy.
 */

const fs = require('fs');
const path = require('path');

// ── Test script builders ───────────────────────────────────────────────
const assertOk = `pm.test("Status OK (200/201/204)", function () {
    pm.expect([200,201,204]).to.include(pm.response.code);
});`;

function listSaver(varName) {
  return `${assertOk}
try {
  var j = pm.response.json();
  var arr = Array.isArray(j) ? j : (j.data || j.nhom || []);
  if (arr && arr[0] && arr[0]._id) {
    pm.environment.set("${varName}", arr[0]._id);
    console.log("✅ ${varName} =", arr[0]._id);
  }
} catch (e) { console.log("⚠️ ${varName}:", e.message); }`;
}

function createSaver(varName) {
  return `${assertOk}
try {
  var j = pm.response.json();
  var id = (j.data && j.data._id) || j._id;
  if (id) {
    pm.environment.set("${varName}", id);
    console.log("✅ ${varName} =", id);
  }
} catch (e) { console.log("⚠️ ${varName}:", e.message); }`;
}

// Lưu nhiều field từ 1 object response (vd hồ sơ SV: HoTen/MaSV/Email)
function fieldSaver(mapping) {
  const lines = Object.entries(mapping)
    .map(([envKey, jsonKey]) => `  if (j.${jsonKey} != null) pm.environment.set("${envKey}", j.${jsonKey});`)
    .join('\n');
  return `${assertOk}
try {
  var j = pm.response.json();
  if (j.data) j = j.data;
${lines}
} catch (e) { console.log("⚠️ fieldSaver:", e.message); }`;
}

const json = (obj) => ({
  mode: 'raw',
  raw: JSON.stringify(obj, null, 2),
  options: { raw: { language: 'json' } },
});

const S = (folder, method, route, opts = {}) => ({ folder, method, route, ...opts });

// ── COLLECTION GIẢNG VIÊN ──────────────────────────────────────────────
const lecturerRequests = [
  // 0 — bootstrap
  S('0_bootstrap', 'GET', '/api/giangvien', { test: listSaver('gvId') }),
  S('0_bootstrap', 'GET', '/api/detai', { test: listSaver('deTaiId') }),

  // 1 — read
  S('1_read', 'GET', '/api/detai/:id', { params: { id: 'deTaiId' } }),
  S('1_read', 'GET', '/api/giangvien/:id', { params: { id: 'gvId' } }),
  S('1_read', 'GET', '/api/monhoc/giangvien/:gvId', { params: { gvId: 'gvId' } }),
  S('1_read', 'GET', '/api/lophoc/giangvien/:gvId', { params: { gvId: 'gvId' } }),
  S('1_read', 'GET', '/api/blockchain/contracts'),
  S('1_read', 'GET', '/api/blockchain/thesis/db-records'),
  S('1_read', 'GET', '/api/dangky/giangvien/:gvId', { params: { gvId: 'gvId' } }),
  S('1_read', 'GET', '/api/baocao/giangvien/:gvId', { params: { gvId: 'gvId' } }),
  S('1_read', 'GET', '/api/baocao/detai/:deTaiId', { params: { deTaiId: 'deTaiId' } }),
  S('1_read', 'GET', '/api/diemso/comparison/:gvId', { params: { gvId: 'gvId' } }),
  S('1_read', 'GET', '/api/rubrics/giangvien/:gvId', { params: { gvId: 'gvId' } }),

  // 2 — create/update
  S('2_create', 'POST', '/api/detai', {
    test: createSaver('deTaiId'),
    body: json({
      MaDeTai: 'DT_SMOKE',
      TenDeTai: 'Smoke Test - Hệ thống Web3 Giảng Viên',
      MoTa: 'Đề tài tạo tự động khi kiểm thử',
      YeuCau: ['Web3', 'Blockchain', 'AI'],
      SoLuongSinhVien: 2,
      Deadline: new Date(Date.now() + 90 * 864e5).toISOString().split('T')[0],
      GiangVienHuongDan: '{{gvId}}',
      CoBaiTest: false,
    }),
  }),
  S('2_create', 'PUT', '/api/detai/:id', {
    params: { id: 'deTaiId' },
    body: json({ MoTa: 'Đã cập nhật mô tả khi smoke test' }),
  }),
  S('2_create', 'POST', '/api/rubrics', {
    test: createSaver('rubricsId'),
    body: json({
      TenMau: 'Rubric Smoke Test',
      MoTaMau: 'Mẫu rubric tạo tự động',
      GiangVien: '{{gvId}}',
      MacDinh: false,
      TieuChi: [
        { TenTieuChi: 'Nội dung kỹ thuật', TrongSo: 50, DiemToiDa: 10, GoiYChoAI: ['web3', 'blockchain'] },
        { TenTieuChi: 'Tài liệu & trình bày', TrongSo: 50, DiemToiDa: 10, GoiYChoAI: ['report', 'documentation'] },
      ],
    }),
  }),
  S('2_create', 'PUT', '/api/rubrics/:id', {
    params: { id: 'rubricsId' },
    body: json({ MoTaMau: 'Đã cập nhật mô tả rubric' }),
  }),

  // 3 — AI (cần ML 8001)
  S('3_ai', 'POST', '/api/ai/analyze-report', {
    body: json({
      text: 'Báo cáo trình bày hệ thống quản lý đề tài Web3 dùng blockchain Ethereum, smart contract, IPFS lưu báo cáo, và mô hình SBERT/PhoBERT để gợi ý và chấm điểm.',
      topicRequirements: ['blockchain', 'web3', 'ethereum', 'smart contract'],
    }),
  }),
  S('3_ai', 'POST', '/api/ai/analyze-rubrics', {
    body: json({
      text: 'Báo cáo trình bày kiến trúc blockchain, smart contract Solidity, lưu trữ IPFS và tài liệu hướng dẫn chi tiết.',
      rubrics: [
        { TenTieuChi: 'Nội dung kỹ thuật', TrongSo: 50, GoiYChoAI: ['blockchain', 'solidity'] },
        { TenTieuChi: 'Tài liệu', TrongSo: 50, GoiYChoAI: ['documentation', 'report'] },
      ],
    }),
  }),

  // 4 — bài test (dùng đề tài vừa tạo)
  S('4_baitest', 'POST', '/api/baitest', {
    test: createSaver('baiTestId'),
    body: json({
      deTaiId: '{{deTaiId}}',
      tieuDe: 'Bài test smoke',
      moTa: 'Bài test tạo tự động',
      thoiGianLam: 30,
      nguongDat: 50,
      cauHoi: [
        { LoaiCauHoi: 'TracNghiem', NoiDung: 'Solidity là ngôn ngữ của?', LuaChon: ['Ethereum', 'Bitcoin'], DapAnDung: 0 },
      ],
    }),
  }),
  S('4_baitest', 'GET', '/api/baitest/detai/:deTaiId', { params: { deTaiId: 'deTaiId' } }),
  S('4_baitest', 'GET', '/api/baitest/:id/results', { params: { id: 'baiTestId' } }),

  // 5 — cleanup
  S('5_cleanup', 'DELETE', '/api/baitest/:id', { params: { id: 'baiTestId' } }),
  S('5_cleanup', 'DELETE', '/api/detai/:id', { params: { id: 'deTaiId' } }),
];

// ── COLLECTION SINH VIÊN ───────────────────────────────────────────────
// Không cần dán svId: lấy svId từ response POST /api/nhom (TruongNhom = chính SV này).
// Lưu svId + nhomId từ create-nhom response
const nhomBootstrapSaver = `${assertOk}
try {
  var j = pm.response.json();
  var d = j.data || j;
  if (d._id) { pm.environment.set("nhomId", d._id); console.log("✅ nhomId =", d._id); }
  var tn = d.TruongNhom;
  var sv = tn && (tn._id || tn);
  if (sv) { pm.environment.set("svId", sv); console.log("✅ svId =", sv); }
} catch (e) { console.log("⚠️ nhomBootstrap:", e.message); }`;

const studentRequests = [
  // 0 — bootstrap: tạo nhóm để lấy svId (từ TruongNhom) + nhomId; lấy đề tài
  S('0_bootstrap', 'GET', '/api/detai', { test: listSaver('deTaiId') }),
  S('0_bootstrap', 'POST', '/api/nhom', {
    test: nhomBootstrapSaver,
    body: json({ tenNhom: 'Nhóm Smoke Test', soLuong: 1 }),
  }),
  S('0_bootstrap', 'GET', '/api/sinhvien/:id', {
    params: { id: 'svId' },
    test: fieldSaver({ svHoTen: 'HoTen', svMaSV: 'MaSV', svEmail: 'Email' }),
  }),

  // 1 — đọc dữ liệu của chính mình (svId đã có)
  S('1_read', 'GET', '/api/nhom/sinhvien/:svId', { params: { svId: 'svId' } }),
  S('1_read', 'GET', '/api/nhom/invites/:svId', { params: { svId: 'svId' } }),
  S('1_read', 'GET', '/api/dangky/sinhvien/:svId', { params: { svId: 'svId' } }),
  S('1_read', 'GET', '/api/baocao/sinhvien/:svId', { params: { svId: 'svId' } }),
  S('1_read', 'GET', '/api/diemso/sinhvien/:svId', { params: { svId: 'svId' } }),
  S('1_read', 'GET', '/api/tiendo/sinhvien/:svId', { params: { svId: 'svId' } }),

  // 2 — AI gợi ý đề tài theo năng lực (SBERT). Cần ML 8001.
  // matchingService cần mỗi topic có _id + YeuCau, studentProfile có GPA + BangDiemKyNang
  S('2_ai', 'POST', '/api/ai/match-student', {
    body: json({
      studentProfile: {
        GPA: 3.5,
        ChuyenNganh: 'Công nghệ thông tin',
        BangDiemKyNang: [
          { TenKyNang: 'Web3', Diem: 8 },
          { TenKyNang: 'Machine Learning', Diem: 8 },
        ],
      },
      topics: [{ _id: '{{deTaiId}}', YeuCau: ['Web3', 'Blockchain'] }],
    }),
  }),

  // 3 — cập nhật hồ sơ (GIỮ NGUYÊN tên/MSSV/email gốc, chỉ thêm GPA + kỹ năng)
  S('3_profile', 'PUT', '/api/sinhvien/:id/profile', {
    params: { id: 'svId' },
    body: json({
      HoTen: '{{svHoTen}}',
      MaSV: '{{svMaSV}}',
      Email: '{{svEmail}}',
      GPA: 3.5,
      ChuyenNganh: 'Công nghệ thông tin',
      BangDiemKyNang: [
        { TenKyNang: 'Web3/Blockchain', Diem: 8 },
        { TenKyNang: 'Python', Diem: 8 },
      ],
    }),
  }),

  // 4 — hoàn tất vòng đời nhóm (chốt → xóa nhóm bootstrap)
  S('4_nhom', 'POST', '/api/nhom/:id/chot', { params: { id: 'nhomId' } }),
  S('4_nhom', 'DELETE', '/api/nhom/:id', { params: { id: 'nhomId' } }),
];

// ── BUILD ──────────────────────────────────────────────────────────────
function buildUrl(route, paramMap = {}) {
  const segs = route.split('/').filter(Boolean);
  const path = segs.map((s) => (s.startsWith(':') ? `{{${paramMap[s.slice(1)] || s.slice(1)}}}` : s));
  const variable = segs
    .filter((s) => s.startsWith(':'))
    .map((s) => ({ key: s.slice(1), value: `{{${paramMap[s.slice(1)] || s.slice(1)}}}` }));
  return {
    raw: `{{baseUrl}}/${path.join('/')}`,
    host: ['{{baseUrl}}'],
    path,
    ...(variable.length && { variable }),
  };
}

// Pre-request cấp collection: giải mã JWT trong {{token}} → tự set idVar (svId/gvId)
function jwtPrereq(idVar) {
  return [
    'var t = pm.environment.get("token");',
    'if (t && t.indexOf(".") > -1) {',
    '  try {',
    '    var p = t.split(".")[1].replace(/-/g,"+").replace(/_/g,"/");',
    '    var payload = JSON.parse(atob(p));',
    `    if (payload.id) { pm.environment.set("${idVar}", payload.id); }`,
    '  } catch (e) { console.log("JWT decode fail:", e.message); }',
    '}',
  ];
}

function buildCollection(reqs, name, desc, idVar) {
  const folders = {};
  for (const r of reqs) (folders[r.folder] = folders[r.folder] || []).push(r);

  const items = Object.keys(folders)
    .sort()
    .map((folder) => ({
      name: folder,
      item: folders[folder].map((r) => {
        const request = {
          method: r.method,
          header: [{ key: 'Content-Type', value: 'application/json' }],
          url: buildUrl(r.route, r.params),
        };
        if (r.body) request.body = r.body;
        const exec = (r.test || assertOk).split('\n');
        return {
          name: `${r.method} ${r.route}`,
          event: [{ listen: 'test', script: { type: 'text/javascript', exec } }],
          request,
        };
      }),
    }));

  return {
    info: {
      name,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      description: desc,
    },
    auth: { type: 'bearer', bearer: [{ key: 'token', value: '{{token}}', type: 'string' }] },
    event: [{ listen: 'prerequest', script: { type: 'text/javascript', exec: jwtPrereq(idVar) } }],
    variable: [{ key: 'baseUrl', value: 'http://localhost:5000', type: 'default' }],
    item: items,
  };
}

const lecturer = buildCollection(
  lecturerRequests,
  'Web3GiangVien SmokeTest - Lecturer',
  `${lecturerRequests.length} request (token GIẢNG VIÊN). Chỉ cần dán token GV → gvId tự lấy từ JWT.`,
  'gvId'
);
const student = buildCollection(
  studentRequests,
  'Web3GiangVien SmokeTest - Student',
  `${studentRequests.length} request (token SINH VIÊN). Chỉ cần dán token SV → svId tự lấy từ JWT. Profile PUT giữ nguyên tên/MSSV/email gốc.`,
  'svId'
);

const environment = {
  name: 'Web3GiangVien Local',
  values: [
    { key: 'baseUrl', value: 'http://localhost:5000', enabled: true, type: 'string' },
    { key: 'token', value: '', enabled: true, type: 'string' },
    { key: 'gvId', value: '', enabled: true, type: 'string' },
    { key: 'svId', value: '', enabled: true, type: 'string' },
    { key: 'deTaiId', value: '', enabled: true, type: 'string' },
    { key: 'rubricsId', value: '', enabled: true, type: 'string' },
    { key: 'baiTestId', value: '', enabled: true, type: 'string' },
    { key: 'nhomId', value: '', enabled: true, type: 'string' },
    { key: 'svHoTen', value: '', enabled: true, type: 'string' },
    { key: 'svMaSV', value: '', enabled: true, type: 'string' },
    { key: 'svEmail', value: '', enabled: true, type: 'string' },
  ],
  _postman_variable_scope: 'environment',
};

const outDir = path.join(__dirname, '..');
fs.writeFileSync(
  path.join(outDir, 'Web3GiangVien_SmokeTest_Lecturer.postman_collection.json'),
  JSON.stringify(lecturer, null, 2)
);
fs.writeFileSync(
  path.join(outDir, 'Web3GiangVien_SmokeTest_Student.postman_collection.json'),
  JSON.stringify(student, null, 2)
);
fs.writeFileSync(
  path.join(outDir, 'Web3GiangVien.postman_environment.json'),
  JSON.stringify(environment, null, 2)
);

console.log('✅ Sinh 2 collection smoke test:');
console.log(`   📄 Lecturer (${lecturerRequests.length} req): Web3GiangVien_SmokeTest_Lecturer.postman_collection.json`);
console.log(`   📄 Student  (${studentRequests.length} req): Web3GiangVien_SmokeTest_Student.postman_collection.json`);
console.log('   📄 Web3GiangVien.postman_environment.json (dùng chung)');
console.log('\n🚀 Student: lấy token SV (get-token.js với ví SV), dán token + svId → Run.');
