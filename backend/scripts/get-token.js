/**
 * get-token.js — Lấy nhanh JWT token để kiểm thử API bằng Postman.
 *
 * Cách dùng (chạy trong thư mục backend, backend đang chạy ở cổng 5000):
 *
 *   node scripts/get-token.js 0xPRIVATE_KEY_CUA_VI
 *
 * Hoặc đặt biến môi trường:
 *   TEST_PRIVATE_KEY=0x... node scripts/get-token.js
 *
 * Script sẽ:
 *   1) Tính ra địa chỉ ví từ private key
 *   2) Gọi POST /api/auth/challenge để lấy nonce
 *   3) Ký nonce bằng private key (EIP-191 personal_sign)
 *   4) Gọi POST /api/auth/verify để lấy JWT token
 *   5) In ra token + vai trò để dán vào Postman (Authorization: Bearer <token>)
 *
 * LƯU Ý: Ví phải đã được đăng ký trong DB (giảng viên/sinh viên).
 *  - Ví giảng viên mẫu đã seed sẵn: 0x3081F8965F007A78C1502b51DAC0bD54E6f6dBBF
 *    (chạy: node seed_lecturer.js để tạo). Dùng private key của chính ví này.
 */

const { ethers } = require('ethers');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
const pk = process.argv[2] || process.env.TEST_PRIVATE_KEY;

if (!pk) {
  console.error('❌ Thiếu private key.\n   Dùng: node scripts/get-token.js 0xYOUR_PRIVATE_KEY');
  process.exit(1);
}

async function main() {
  const wallet = new ethers.Wallet(pk);
  console.log('🔑 Địa chỉ ví:', wallet.address);

  // 1) Lấy challenge
  const chRes = await fetch(`${BASE_URL}/api/auth/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress: wallet.address })
  });
  const chData = await chRes.json();
  if (!chData.success) throw new Error('Challenge thất bại: ' + JSON.stringify(chData));

  // 2) Ký challenge
  const signature = await wallet.signMessage(chData.challenge);

  // 3) Verify để lấy token
  const vRes = await fetch(`${BASE_URL}/api/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId: chData.challengeId, signature })
  });
  const vData = await vRes.json();

  if (vData.needsRoleSelection) {
    console.error('\n⚠️  Ví này CHƯA được đăng ký trong hệ thống (cần chọn vai trò).');
    console.error('    → Seed ví giảng viên (node seed_lecturer.js) hoặc đăng ký qua UI trước.');
    process.exit(1);
  }
  if (!vData.success || !vData.token) throw new Error('Verify thất bại: ' + JSON.stringify(vData));

  console.log('\n✅ Vai trò:', vData.user.role_id);
  console.log('✅ Tên    :', vData.user.name);
  console.log('✅ User ID:', vData.user.id, '(dùng làm :id / :svId / :gvId trong route)');
  console.log('\n===== JWT TOKEN (dán vào Postman: Authorization → Bearer Token) =====\n');
  console.log(vData.token);
  console.log('\n=====================================================================');
}

main().catch((e) => {
  console.error('❌ Lỗi:', e.message);
  console.error('   Kiểm tra: backend đã chạy ở', BASE_URL, '? MongoDB đã kết nối?');
  process.exit(1);
});
