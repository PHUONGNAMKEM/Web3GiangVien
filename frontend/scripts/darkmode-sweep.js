// One-shot sweep: thay màu hard-code bằng CSS variables (theme.css) cho dark mode.
// Chỉ thay literal đúng chuỗi — không đụng brand colors (#1677ff, #52c41a, #722ed1...).
const fs = require('fs');
const path = require('path');

const TARGET_DIRS = [
  'src/components/student',
  'src/components/lecturer',
  'src/components/admin',
  'src/components/common',
  'src/components/layout',
];

const MAP = [
  // Nền trắng / xám nhạt
  ["background: '#fff'", "background: 'var(--bg-container)'"],
  ["background: '#ffffff'", "background: 'var(--bg-container)'"],
  ["background: 'white'", "background: 'var(--bg-container)'"],
  ["backgroundColor: '#fff'", "backgroundColor: 'var(--bg-container)'"],
  ["backgroundColor: '#ffffff'", "backgroundColor: 'var(--bg-container)'"],
  ["backgroundColor: 'white'", "backgroundColor: 'var(--bg-container)'"],
  ["background: '#fafafa'", "background: 'var(--bg-subtle)'"],
  ["backgroundColor: '#fafafa'", "backgroundColor: 'var(--bg-subtle)'"],
  ["background: '#f5f5f5'", "background: 'var(--bg-subtle)'"],
  ["backgroundColor: '#f5f5f5'", "backgroundColor: 'var(--bg-subtle)'"],
  ["background: '#f9f9f9'", "background: 'var(--bg-subtle)'"],
  ["background: 'rgba(255,255,255,0.6)'", "background: 'var(--bg-glass)'"],
  ["background: 'rgba(255, 255, 255, 0.6)'", "background: 'var(--bg-glass)'"],

  // Nền tint trạng thái
  ["background: '#e6f4ff'", "background: 'var(--bg-primary-tint)'"],
  ["backgroundColor: '#e6f4ff'", "backgroundColor: 'var(--bg-primary-tint)'"],
  ["background: '#f0f5ff'", "background: 'var(--bg-primary-tint-2)'"],
  ["background: '#f6ffed'", "background: 'var(--bg-success-tint)'"],
  ["backgroundColor: '#f6ffed'", "backgroundColor: 'var(--bg-success-tint)'"],
  ["background: '#fffbe6'", "background: 'var(--bg-warning-tint)'"],
  ["background: '#fff7e6'", "background: 'var(--bg-warning-tint)'"],
  ["background: '#fff1f0'", "background: 'var(--bg-error-tint)'"],
  ["background: '#faf0ff'", "background: 'var(--bg-purple-tint)'"],
  ["background: '#f9f0ff'", "background: 'var(--bg-purple-tint)'"],

  // Gradient stat card
  ["'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)'", "'var(--grad-blue)'"],
  ["'linear-gradient(135deg, #f0f5ff 0%, #adc6ff 100%)'", "'var(--grad-geekblue)'"],
  ["'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)'", "'var(--grad-green)'"],
  ["'linear-gradient(135deg, #fffbe6 0%, #ffe58f 100%)'", "'var(--grad-gold)'"],
  ["'linear-gradient(135deg, #fff2e8 0%, #ffbb96 100%)'", "'var(--grad-orange)'"],
  ["'linear-gradient(135deg, #fff0f6 0%, #ffd6e7 100%)'", "'var(--grad-pink)'"],
  ["'linear-gradient(135deg, #f9f0ff 0%, #e8d0ff 100%)'", "'var(--grad-purple)'"],

  // Viền
  ["'1px solid #f0f0f0'", "'1px solid var(--border-subtle)'"],
  ["'1px solid #e8e8e8'", "'1px solid var(--border-subtle)'"],
  ["'1px solid #d9d9d9'", "'1px solid var(--border)'"],
  ["'1px solid #91caff'", "'1px solid var(--border-primary)'"],
  ["'1px solid #d3adf7'", "'1px solid var(--border-purple)'"],
  ["'1px solid #ffccc7'", "'1px solid var(--border-error)'"],

  // Chữ xám
  ["color: '#8c8c8c'", "color: 'var(--text-tertiary)'"],
  ["color: '#aaa'", "color: 'var(--text-tertiary)'"],
  ["color: '#bfbfbf'", "color: 'var(--text-tertiary)'"],
  ["color: '#999'", "color: 'var(--text-tertiary)'"],
  ["color: '#666'", "color: 'var(--text-secondary)'"],
  ["color: '#595959'", "color: 'var(--text-secondary)'"],
  ["color: '#000'", "color: 'var(--text)'"],
];

let totalFiles = 0;
let totalRepl = 0;

for (const dir of TARGET_DIRS) {
  const abs = path.join(__dirname, '..', dir);
  if (!fs.existsSync(abs)) continue;
  for (const f of fs.readdirSync(abs)) {
    if (!f.endsWith('.js')) continue;
    const fp = path.join(abs, f);
    let src = fs.readFileSync(fp, 'utf8');
    let count = 0;
    for (const [from, to] of MAP) {
      while (src.includes(from)) {
        src = src.replace(from, to);
        count++;
      }
    }
    if (count > 0) {
      fs.writeFileSync(fp, src, 'utf8');
      totalFiles++;
      totalRepl += count;
      console.log(`${dir}/${f}: ${count} replacements`);
    }
  }
}
console.log(`DONE: ${totalRepl} replacements in ${totalFiles} files`);
