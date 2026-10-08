/**
 * Script tự động đồng bộ & chuẩn hóa ID tài khoản Facebook Group trong configs/groups-config.json
 * khớp với Dashboard (fb_acc_3, fb_acc_4, fb_acc_11, fb_acc_13, fb_acc_15, fb_acc_16...)
 *
 * Chạy trên máy remote:
 *   node scripts/migrate-group-account-ids.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const configPath = path.join(rootDir, 'configs', 'groups-config.json');
const backupPath = path.join(rootDir, 'configs', `groups-config.backup-${Date.now()}.json`);

if (!fs.existsSync(configPath)) {
  console.error(`❌ Không tìm thấy file: ${configPath}`);
  process.exit(1);
}

const raw = fs.readFileSync(configPath, 'utf8');
const data = JSON.parse(raw);

// Backup trước khi sửa
fs.writeFileSync(backupPath, raw, 'utf8');
console.log(`📦 Đã tạo bản sao lưu tại: ${backupPath}`);

const ID_MAP = {
  'acc_1': 'fb_acc_11',  // Pham Hien (Port 9233)
  'acc_2': 'fb_acc_15',  // Khanh Chi Ngô (Port 9225)
  'acc_4': 'fb_acc_4',   // Thiết Kế Website... Quận 3 (Port 9223)
  'acc_6': 'fb_acc_16',  // Dịch Vụ Thiết Kế WebSite DUDI (Port 9227)
  'acc_14': 'fb_acc_3',  // Ngọc Khuê (Port 9253)
  'fb_acc_13': 'fb_acc_13' // Thiết Kế Website Chuyên Nghiệp (Port 9232)
};

let accountsUpdated = 0;
let poolUpdated = 0;

if (Array.isArray(data.accounts)) {
  data.accounts.forEach(acc => {
    if (ID_MAP[acc.id] && ID_MAP[acc.id] !== acc.id) {
      console.log(`  [Account] Đổi ID: ${acc.id} -> ${ID_MAP[acc.id]} (${acc.name})`);
      acc.id = ID_MAP[acc.id];
      accountsUpdated++;
    }
  });
}

if (Array.isArray(data.centralPool)) {
  data.centralPool.forEach(item => {
    if (ID_MAP[item.assignedAccountId] && ID_MAP[item.assignedAccountId] !== item.assignedAccountId) {
      item.assignedAccountId = ID_MAP[item.assignedAccountId];
      poolUpdated++;
    }
  });
}

fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf8');

console.log(`\n✅ HOÀN TẤT CHUYỂN ĐỔI:`);
console.log(`- Đã cập nhật ${accountsUpdated} tài khoản trong accounts`);
console.log(`- Đã cập nhật ${poolUpdated} nhóm trong centralPool`);
console.log(`- File đã lưu: configs/groups-config.json`);
