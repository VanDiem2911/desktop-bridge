import express from 'express';
import { chromium } from 'playwright-core';
import { setTimeout as delay } from 'node:timers/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { logPostActivity } from './lib/history-logger.mjs';

const host = '127.0.0.1';
const port = 3002;
const BASE_CHROME_PORT = 9223; // Mỗi acc dùng 1 port riêng (Acc 1: 9223, Acc 2: 9224...)
const app = express();
app.use(express.json({ limit: '25mb' }));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
function resolveGroupsConfigPath() {
  const targetInConfigs = path.join(__dirname, 'configs', 'groups-config.json');
  const targetInRoot = path.join(__dirname, 'groups-config.json');

  if (fs.existsSync(targetInConfigs)) return targetInConfigs;
  if (fs.existsSync(targetInRoot)) {
    try {
      const configsDir = path.join(__dirname, 'configs');
      if (!fs.existsSync(configsDir)) fs.mkdirSync(configsDir, { recursive: true });
      fs.copyFileSync(targetInRoot, targetInConfigs);
    } catch {}
    return targetInConfigs;
  }

  const exampleInConfigs = path.join(__dirname, 'configs', 'groups-config.example.json');
  const exampleInRoot = path.join(__dirname, 'groups-config.example.json');
  const examplePath = fs.existsSync(exampleInConfigs) ? exampleInConfigs : exampleInRoot;
  if (fs.existsSync(examplePath)) {
    try {
      const configsDir = path.join(__dirname, 'configs');
      if (!fs.existsSync(configsDir)) fs.mkdirSync(configsDir, { recursive: true });
      fs.copyFileSync(examplePath, targetInConfigs);
    } catch {}
  }
  return targetInConfigs;
}

let activeGroupJob = false;

function loadConfig() {
  const configPath = resolveGroupsConfigPath();
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(data);
      const totalUrls = (parsed.accounts || []).reduce((sum, a) => sum + (a.groupUrls?.length || 0), 0);
      console.log(`[Config] Đã đọc groups-config.json (${parsed.accounts?.length || 0} tài khoản, tổng ${totalUrls} link nhóm) từ: ${configPath}`);
      return parsed;
    } else {
      console.error(`[Config Error] File không tồn tại: ${configPath}`);
    }
  } catch (err) {
    console.error('[Config Error] Không thể đọc groups-config.json:', err.message);
  }
  return { accounts: [] };
}

function saveConfig(config) {
  try {
    const configPath = resolveGroupsConfigPath();
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    console.log(`[Config] Đã lưu thành công groups-config.json tại: ${configPath}`);
  } catch (err) {
    console.error('[Config Error] Không thể lưu groups-config.json:', err.message);
  }
}

function getChromeExecutable() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    ...(process.env.LOCALAPPDATA ? [path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe')] : []),
    ...(process.env.PROGRAMFILES ? [path.join(process.env.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe')] : []),
    ...(process.env['PROGRAMFILES(X86)'] ? [path.join(process.env['PROGRAMFILES(X86)'], 'Google', 'Chrome', 'Application', 'chrome.exe')] : []),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0];
}

async function isPortReady(targetPort) {
  try {
    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${targetPort}`);
    await browser.close();
    return true;
  } catch {
    return false;
  }
}

async function ensureChromeForAccount(profileDirName, targetPort) {
  if (await isPortReady(targetPort)) {
    console.log(`[Chrome] Cửa sổ Chrome cho profile ${profileDirName} đã sẵn sàng trên cổng ${targetPort}.`);
    return;
  }

  const chromePath = getChromeExecutable();
  const profilePath = path.join(os.homedir(), 'AppData', 'Local', profileDirName);
  console.log(`[Chrome] Khởi động cửa sổ Chrome riêng cho profile: ${profileDirName} trên cổng ${targetPort}...`);

  spawn(
    chromePath,
    [
      '--remote-debugging-address=127.0.0.1',
      `--remote-debugging-port=${targetPort}`,
      `--user-data-dir=${profilePath}`,
      '--start-maximized',
      'https://www.facebook.com/',
    ],
    { detached: true, stdio: 'ignore' },
  ).unref();

  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    await delay(1500);
    if (await isPortReady(targetPort)) {
      console.log(`[Chrome] Cửa sổ Chrome ${profileDirName} đã mở thành công trên cổng ${targetPort}.`);
      await delay(2000);
      return;
    }
  }
  throw new Error(`Không mở được Chrome trên cổng ${targetPort} cho profile ${profileDirName}`);
}

function cleanCaption(value) {
  if (value && typeof value === 'object') {
    if (typeof value.facebookPost === 'string' && value.facebookPost.trim()) return value.facebookPost.trim();
    if (typeof value.articleMarkdown === 'string' && value.articleMarkdown.trim()) {
      return value.articleMarkdown
        .replace(/^#{1,6}\s*/gm, '')
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/^>\s?/gm, '')
        .replace(/^---+\s*$/gm, '')
        .trim();
    }
    if (typeof value.socialCaption === 'string' && value.socialCaption.trim()) return value.socialCaption.trim();
    if (typeof value.caption === 'string' && value.caption.trim()) return value.caption.trim();
    if (typeof value.content === 'string' && value.content.trim()) return value.content.trim();
  }

  const raw = String(value ?? '').trim();
  const unfenced = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  for (const candidate of [raw, unfenced]) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object') {
        if (typeof parsed.facebookPost === 'string' && parsed.facebookPost.trim()) return parsed.facebookPost.trim();
        if (typeof parsed.articleMarkdown === 'string' && parsed.articleMarkdown.trim()) {
          return parsed.articleMarkdown
            .replace(/^#{1,6}\s*/gm, '')
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/^>\s?/gm, '')
            .replace(/^---+\s*$/gm, '')
            .trim();
        }
        if (typeof parsed.socialCaption === 'string' && parsed.socialCaption.trim()) return parsed.socialCaption.trim();
        if (typeof parsed.caption === 'string' && parsed.caption.trim()) return parsed.caption.trim();
        if (typeof parsed.content === 'string' && parsed.content.trim()) return parsed.content.trim();
      }
    } catch {}
  }

  return unfenced.replace(/\\n/g, '\n');
}

async function firstVisible(page, selectors, timeout = 15000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    for (const selector of selectors) {
      const locator = page.locator(selector).first();
      if (await locator.count()) {
        try {
          if (await locator.isVisible()) return locator;
        } catch {}
      }
    }
    await delay(500);
  }
  return null;
}

/**
 * Tự động xử lý popup trả lời câu hỏi / đồng ý quy tắc nhóm nếu Facebook hiện lên sau khi bấm "Tham gia nhóm"
 */
async function handleMembershipQuestionsPopup(page) {
  const deadline = Date.now() + 12000;
  while (Date.now() < deadline) {
    const dialogs = page.locator('[role="dialog"]');
    if (!(await dialogs.count())) break;
    const dialog = dialogs.last();
    if (!(await dialog.isVisible())) break;

    console.log('[Group Join] Phát hiện popup xác nhận / câu hỏi tham gia nhóm...');

    // 1. Tự động tick tất cả checkbox đồng ý quy tắc nhóm (Tôi đồng ý với quy tắc...)
    try {
      const checkboxes = dialog.locator('input[type="checkbox"], [role="checkbox"]');
      const cbCount = await checkboxes.count();
      for (let c = 0; c < cbCount; c++) {
        const cb = checkboxes.nth(c);
        if (await cb.isVisible()) {
          const isChecked = await cb.isChecked().catch(() => false);
          const ariaChecked = await cb.getAttribute('aria-checked').catch(() => null);
          if (!isChecked && ariaChecked !== 'true') {
            await cb.click({ force: true }).catch(() => {});
            console.log(`[Group Join] Đã tick đồng ý quy tắc nhóm (#${c + 1}).`);
            await delay(500);
          }
        }
      }
    } catch (e) {
      console.warn('[Group Join] Lỗi khi tick checkbox quy tắc:', e.message);
    }

    // 2. Tự động điền câu trả lời ngắn nếu có ô textarea/text rỗng
    try {
      const textInputs = dialog.locator('textarea, input[type="text"]:not([readonly])');
      const inputCount = await textInputs.count();
      for (let t = 0; t < inputCount; t++) {
        const input = textInputs.nth(t);
        if (await input.isVisible()) {
          const val = await input.inputValue().catch(() => '');
          if (!val || !val.trim()) {
            await input.fill('Tôi đồng ý tuân thủ toàn bộ quy tắc của nhóm.').catch(() => {});
            console.log(`[Group Join] Đã điền câu trả lời quy tắc (#${t + 1}).`);
            await delay(500);
          }
        }
      }
    } catch (e) {
      console.warn('[Group Join] Lỗi khi điền text câu hỏi:', e.message);
    }

    // 3. Tự động chọn radio button đầu tiên nếu có câu hỏi trắc nghiệm
    try {
      const radios = dialog.locator('[role="radio"], input[type="radio"]');
      const radioCount = await radios.count();
      if (radioCount > 0) {
        const firstRadio = radios.first();
        if (await firstRadio.isVisible()) {
          const isChecked = await firstRadio.isChecked().catch(() => false);
          const ariaChecked = await firstRadio.getAttribute('aria-checked').catch(() => null);
          if (!isChecked && ariaChecked !== 'true') {
            await firstRadio.click({ force: true }).catch(() => {});
            console.log('[Group Join] Đã chọn phương án trắc nghiệm đầu tiên.');
            await delay(500);
          }
        }
      }
    } catch (e) {
      console.warn('[Group Join] Lỗi khi chọn radio:', e.message);
    }

    // 4. Tìm và bấm nút Gửi / Hoàn tất / Tiếp / Xác nhận / Submit
    const submitSelectors = [
      '[role="dialog"] [role="button"]:has-text("Gửi")',
      '[role="dialog"] [role="button"]:has-text("Hoàn tất")',
      '[role="dialog"] [role="button"]:has-text("Xác nhận")',
      '[role="dialog"] [role="button"]:has-text("Tiếp tục")',
      '[role="dialog"] [role="button"]:has-text("Tiếp")',
      '[role="dialog"] [role="button"]:has-text("Submit")',
      '[role="dialog"] [role="button"]:has-text("Done")',
      '[role="dialog"] [role="button"]:has-text("Confirm")',
      '[role="dialog"] [role="button"]:has-text("Next")',
      '[role="dialog"] [role="button"]:has-text("Send")',
      '[role="dialog"] [aria-label*="Gửi" i]',
      '[role="dialog"] [aria-label*="Submit" i]',
      '[role="dialog"] [aria-label*="Hoàn tất" i]',
    ];

    let clicked = false;
    for (const s of submitSelectors) {
      const btn = page.locator(s).last();
      if (await btn.count() && await btn.isVisible()) {
        await btn.click({ force: true }).catch(() => {});
        console.log(`[Group Join] Đã bấm nút gửi popup quy tắc / câu hỏi: ${s}`);
        clicked = true;
        await delay(2500);
        break;
      }
    }

    if (!clicked) {
      const rBtn = dialog.getByRole('button', { name: /^(Gửi|Gửi câu trả lời|Hoàn tất|Xác nhận|Tiếp tục|Tiếp|Submit|Done|Confirm|Send|Next)$/i }).last();
      if (await rBtn.count() && await rBtn.isVisible()) {
        await rBtn.click({ force: true }).catch(() => {});
        console.log('[Group Join] Đã bấm nút submit popup qua getByRole.');
        clicked = true;
        await delay(2500);
      }
    }

    if (!clicked || !(await dialog.isVisible())) {
      break;
    }
  }
}

/**
 * Kiểm tra trạng thái tham gia nhóm và tự động tham gia nếu chưa tham gia
 */
async function ensureJoinedGroup(page, groupUrl) {
  // 1. Kiểm tra xem đã tham gia nhóm chưa
  const alreadyJoined = page.locator('[role="button"]:has-text("Đã tham gia"), [role="button"]:has-text("Joined"), [role="button"]:has-text("Quản lý"), [role="button"]:has-text("Manage"), [aria-label*="Đã tham gia" i], [aria-label*="Joined" i]').first();
  if (await alreadyJoined.count() && await alreadyJoined.isVisible()) {
    console.log(`[Group Join] Tài khoản ĐÃ THAM GIA nhóm: ${groupUrl}`);
    return { joined: true, pending: false, status: 'already_joined' };
  }

  // 2. Kiểm tra xem có đang ở trạng thái chờ duyệt không
  const pendingBtn = page.locator('[role="button"]:has-text("Hủy yêu cầu"), [role="button"]:has-text("Cancel request"), [role="button"]:has-text("Đã gửi yêu cầu"), [role="button"]:has-text("Yêu cầu đang chờ"), [role="button"]:has-text("Pending")').first();
  if (await pendingBtn.count() && await pendingBtn.isVisible()) {
    console.log(`[Group Join] Yêu cầu tham gia nhóm ĐANG CHỜ PHÊ DUYỆT từ Quản trị viên.`);
    return { joined: false, pending: true, status: 'pending_approval' };
  }

  // 3. Tìm nút "Tham gia nhóm"
  const joinButtonSelectors = [
    'div[role="main"] [role="button"]:has-text("Tham gia nhóm")',
    'div[role="main"] [role="button"]:has-text("Join group")',
    'div[role="main"] [role="button"]:has-text("+ Tham gia nhóm")',
    'div[role="main"] [role="button"]:has-text("+ Join group")',
    '[role="button"][aria-label*="Tham gia nhóm" i]',
    '[role="button"][aria-label*="Join group" i]',
    '[role="button"]:has-text("Tham gia nhóm")',
    '[role="button"]:has-text("Join group")',
    '[role="button"]:has-text("+ Tham gia nhóm")',
    '[role="button"]:has-text("+ Join group")',
    '[aria-label*="Tham gia nhóm" i]',
    '[aria-label*="Join group" i]',
  ];

  let joinBtn = null;
  for (const sel of joinButtonSelectors) {
    const loc = page.locator(sel).first();
    if (await loc.count()) {
      try {
        if (await loc.isVisible()) {
          const text = (await loc.innerText()).trim();
          if (!text.includes('Đã tham gia') && !text.includes('Joined') && !text.includes('Hủy') && !text.includes('Cancel')) {
            joinBtn = loc;
            break;
          }
        }
      } catch {}
    }
  }

  if (!joinBtn) {
    const roleBtn = page.getByRole('button', { name: /^(Tham gia nhóm|\+ Tham gia nhóm|Tham gia|Join group|\+ Join group|Join)$/i }).first();
    if (await roleBtn.count() && await roleBtn.isVisible()) {
      const text = (await roleBtn.innerText().catch(() => '')).trim();
      if (!text.includes('Đã tham gia') && !text.includes('Joined') && !text.includes('Hủy') && !text.includes('Cancel')) {
        joinBtn = roleBtn;
      }
    }
  }

  if (joinBtn) {
    console.log(`[Group Join] Nhóm chưa tham gia! Đang bấm "Tham gia nhóm"...`);
    await joinBtn.click();
    await delay(3000);

    // Xử lý popup câu hỏi / quy tắc nhóm nếu có
    await handleMembershipQuestionsPopup(page);

    await delay(3000);

    // Kiểm tra lại sau khi tham gia
    const nowPending = page.locator('[role="button"]:has-text("Hủy yêu cầu"), [role="button"]:has-text("Cancel request"), [role="button"]:has-text("Đã gửi yêu cầu"), [role="button"]:has-text("Pending")').first();
    if (await nowPending.count() && await nowPending.isVisible()) {
      console.log(`[Group Join] Đã gửi yêu cầu tham gia thành công (Chờ admin duyệt).`);
      return { joined: false, pending: true, status: 'just_requested_pending' };
    }

    console.log(`[Group Join] Đã tham gia nhóm thành công!`);
    return { joined: true, pending: false, status: 'just_joined' };
  }

  // Không tìm thấy nút tham gia nhóm (có thể đã là thành viên hoặc giao diện khác)
  return { joined: true, pending: false, status: 'assumed_joined' };
}

/**
 * Đăng bài vào 1 Facebook Group (Tự động kiểm tra & tham gia nhóm trước khi đăng)
 */
async function postToSingleGroup(page, groupUrl, caption, imageBase64, mimeType = 'image/png', fileName = 'image.png') {
  console.log(`[Group Post] Đang truy cập nhóm: ${groupUrl}...`);
  await page.goto(groupUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await delay(4000);

  if (page.url().includes('/login')) {
    throw new Error('Tài khoản Facebook chưa đăng nhập trong profile này. Hãy chạy open-setup-chrome.ps1 để đăng nhập.');
  }

  // BƯỚC 1: KIỂM TRA VÀ TỰ ĐỘNG THAM GIA NHÓM NẾU CHƯA THAM GIA
  const joinResult = await ensureJoinedGroup(page, groupUrl);
  await delay(2000);

  const postCaption = cleanCaption(caption);

  // BƯỚC 2: MỞ POPUP TẠO BÀI VIẾT NẾU CHƯA MỞ
  const createPostSelectors = [
    '[role="button"][aria-label*="Bạn viết gì đi" i]',
    '[role="button"][aria-label*="Viết gì đó" i]',
    '[role="button"][aria-label*="Tạo bài viết công khai" i]',
    '[role="button"][aria-label*="Tạo bài viết" i]',
    '[role="button"][aria-label*="Write something" i]',
    '[role="button"][aria-label*="Create a public post" i]',
    '[role="button"]:has-text("Bạn viết gì đi")',
    '[role="button"]:has-text("Viết gì đó")',
    '[role="button"]:has-text("Tạo bài viết công khai")',
    '[role="button"]:has-text("Tạo bài viết")',
    '[role="button"]:has-text("Write something")',
    '[role="button"]:has-text("Create a public post")',
    'div[role="main"] span:has-text("Bạn viết gì đi")',
    'div[role="main"] span:has-text("Viết gì đó")',
    'div[role="main"] span:has-text("Write something")',
    'div[role="main"] span:has-text("Tạo bài viết")',
  ];

  let dialog = page.locator('[role="dialog"]').filter({ has: page.locator('[contenteditable="true"]') }).last();
  if (!(await dialog.count()) || !(await dialog.isVisible())) {
    let createPost = await firstVisible(page, createPostSelectors, 10000);

    if (!createPost) {
      // Thử cuộn nhẹ trang xuống để nạp DOM
      await page.evaluate(() => window.scrollBy(0, 300)).catch(() => {});
      await delay(2000);
      createPost = await firstVisible(page, createPostSelectors, 8000);
    }

    if (!createPost) {
      if (joinResult.pending) {
        throw new Error(`Đã gửi yêu cầu tham gia nhóm thành công nhưng nhóm yêu cầu Quản trị viên phê duyệt thành viên trước khi có thể đăng bài.`);
      }
      throw new Error(`Không tìm thấy ô đăng bài trong nhóm ${groupUrl}. Có thể nhóm tắt quyền đăng bài hoặc đang chờ phê duyệt thành viên.`);
    }

    await createPost.click();
    await delay(3000);
    dialog = page.locator('[role="dialog"]').filter({ has: page.locator('[contenteditable="true"]') }).last();
  }

  if (!(await dialog.count())) {
    dialog = page.locator('[role="dialog"]').last();
  }

  // BƯỚC 3: TÌM Ô SOẠN THẢO TRONG DIALOG VÀ ĐIỀN NỘI DUNG
  const composerSelectors = [
    '[role="dialog"] div[role="textbox"]',
    '[role="dialog"] div[contenteditable="true"]',
    '[role="dialog"] [data-lexical-editor="true"]',
    '[role="dialog"] [aria-label*="viết" i]',
    '[role="dialog"] [aria-label*="write" i]',
    '[role="dialog"] [aria-label*="nghĩ gì" i]',
    '[role="dialog"] [aria-label*="tạo bài viết" i]',
    '[role="dialog"] [contenteditable="true"]',
    'div[role="textbox"]',
    'div[contenteditable="true"]',
  ];

  let composer = null;
  const composerDeadline = Date.now() + 15000;
  while (Date.now() < composerDeadline) {
    for (const sel of composerSelectors) {
      const loc = dialog.locator(sel).last();
      if (await loc.count()) {
        try {
          if (await loc.isVisible()) {
            composer = loc;
            break;
          }
        } catch {}
      }
    }
    if (composer) break;
    await delay(500);
  }

  if (!composer) {
    composer = dialog.locator('[contenteditable="true"]').first();
  }

  await composer.click({ force: true });
  await delay(500);

  try {
    await composer.fill(postCaption);
  } catch {
    await page.keyboard.insertText(postCaption);
  }
  console.log('[Group Post] Đã điền nội dung vào bài viết.');
  await delay(1000);

  // BƯỚC 4: TẢI ẢNH VÀO CÙNG BÀI VIẾT NÀY
  if (imageBase64 && imageBase64.length > 100) {
    let uploads = dialog.locator('input[type="file"][accept*="image"]');
    if (!(await uploads.count())) {
      const photoBtn = dialog.locator('[aria-label*="Ảnh/video"], [aria-label*="Photo/video"], [aria-label*="Ảnh"], [aria-label*="Photo"]').first();
      if (await photoBtn.count() && await photoBtn.isVisible()) {
        await photoBtn.click();
        await delay(2000);
      }
      uploads = dialog.locator('input[type="file"][accept*="image"]');
    }

    if (await uploads.count()) {
      const upload = uploads.last();
      await upload.setInputFiles({
        name: fileName,
        mimeType,
        buffer: Buffer.from(imageBase64, 'base64'),
      });
      console.log('[Group Post] Đã đính kèm ảnh vào bài viết.');
      await delay(5000);
    }
  }

  // BƯỚC 5: BẤM NÚT TIẾP NẾU CÓ
  const next = dialog.getByRole('button', { name: /^(Tiếp|Next)$/i });
  if (await next.count() && await next.first().isVisible()) {
    await next.first().click();
    await delay(2500);
  }

  // BƯỚC 6: BẤM NÚT ĐĂNG BÀI (POST / ĐĂNG / GỬI / SUBMIT)
  const publishSelectors = [
    '[role="dialog"] [role="button"]:has-text("Đăng")',
    '[role="dialog"] [role="button"]:has-text("Post")',
    '[role="dialog"] [role="button"]:has-text("Gửi")',
    '[role="dialog"] [role="button"]:has-text("Submit")',
    '[role="button"][aria-label*="Đăng" i]',
    '[role="button"][aria-label*="Post" i]',
  ];

  let publishBtn = dialog.getByRole('button', { name: /^(Post|Đăng|Gửi|Submit)$/i }).first();
  if (!(await publishBtn.count()) || !(await publishBtn.isVisible())) {
    for (const pSel of publishSelectors) {
      const btn = page.locator(pSel).last();
      if (await btn.count() && await btn.isVisible()) {
        publishBtn = btn;
        break;
      }
    }
  }

  await publishBtn.waitFor({ state: 'visible', timeout: 30000 });
  console.log('[Group Post] Bấm nút Đăng bài...');
  await publishBtn.click();
  console.log('[Group Post] Đã bấm nút Đăng. Đang chờ xuất bản...');

  try {
    await dialog.waitFor({ state: 'hidden', timeout: 60000 });
    console.log('[Group Post] Bài viết đã đăng thành công.');
  } catch {
    console.warn('[Group Post] Chờ thêm buffer an toàn...');
  }

  await delay(8000);
  console.log(`[Group Post] Hoàn thành đăng nhóm: ${groupUrl}`);
  return { success: true, joinStatus: joinResult.status };
}

/**
 * Xử lý tuần tự các tài khoản và đăng bài xoay vòng theo danh sách nhóm
 */
async function executeGroupPosting(body) {
  const { caption, imageBase64, targetAccounts, postAllGroups = false } = body || {};
  const postCaption = cleanCaption(caption || body?.facebookPost || body?.articleMarkdown || body?.content);

  if (!postCaption || postCaption === '=' || postCaption.length < 5) {
    console.error('[Group Server Error] Payload nhận được không hợp lệ:', JSON.stringify(body));
    throw new Error(`caption không hợp lệ (nhận được: "${postCaption}"). Hãy kiểm tra lại biểu thức {{ $json... }} trong node n8n.`);
  }

  let finalImageBase64 = imageBase64 || body?.image || body?.data;
  if (finalImageBase64 && typeof finalImageBase64 === 'string' && finalImageBase64.includes('base64,')) {
    finalImageBase64 = finalImageBase64.split('base64,')[1];
  }

  const config = loadConfig();
  let accountsToRun = (config.accounts || []).filter(acc => acc.enabled !== false);

  if (targetAccounts) {
    const targets = Array.isArray(targetAccounts) ? targetAccounts.map(String) : [String(targetAccounts)];
    if (targets.length > 0) {
      accountsToRun = accountsToRun.filter(acc => {
        const idStr = String(acc.id);
        const rawId = idStr.replace(/^acc_/, '');
        return targets.includes(idStr) || targets.includes(rawId) || targets.includes(acc.name);
      });
    }
  }

  if (accountsToRun.length === 0) {
    throw new Error('Không có tài khoản nào được bật (enabled: true) trong groups-config.json. Hãy bật tài khoản trên Dashboard!');
  }

  const results = [];
  console.log(`[Group Server] Bắt đầu đăng bài xoay vòng cho ${accountsToRun.length} tài khoản đang bật...`);

  for (let i = 0; i < accountsToRun.length; i++) {
    const account = accountsToRun[i];
    const accNum = parseInt(String(account.id).replace(/\D/g, ''), 10) || (i + 1);
    const accPort = account.port ? Number(account.port) : (9222 + accNum);
    const profileDir = account.profileDir || `n8n-fb-group-profile-${accNum}`;

    const accResult = {
      accountId: account.id,
      accountName: account.name,
      port: accPort,
      profileDir: profileDir,
      groups: [],
    };

    const groupUrls = Array.isArray(account.groupUrls)
      ? account.groupUrls.filter(u => u.startsWith('http') && !u.includes('your_group_id'))
      : [];
    if (groupUrls.length === 0) {
      console.log(`[Group Server] Tài khoản ${account.name} không có URL nhóm hợp lệ, bỏ qua.`);
      accResult.skipped = true;
      results.push(accResult);
      continue;
    }

    // Xác định nhóm cần đăng: Xoay vòng lần lượt từng nhóm hoặc đăng tất cả
    let targetGroupList = [];
    if (postAllGroups) {
      targetGroupList = groupUrls;
    } else {
      const lastIndex = typeof account.lastGroupIndex === 'number' ? account.lastGroupIndex : -1;
      const nextIndex = (lastIndex + 1) % groupUrls.length;
      account.lastGroupIndex = nextIndex;
      account.lastPostedAt = new Date().toISOString();
      targetGroupList = [groupUrls[nextIndex]];
      console.log(`[Group Server] -> ${account.name}: Đăng nhóm thứ ${nextIndex + 1}/${groupUrls.length} (${groupUrls[nextIndex]})`);
    }

    let browser = null;
    try {
      console.log(`\n======================================================`);
      console.log(`[Group Server] BẮT ĐẦU TÀI KHOẢN: ${account.name} (${account.profileDir}) trên CỔNG ${accPort}`);
      console.log(`======================================================`);

      // Mở cửa sổ Chrome độc lập cho tài khoản này trên cổng riêng
      await ensureChromeForAccount(account.profileDir, accPort);
      browser = await chromium.connectOverCDP(`http://127.0.0.1:${accPort}`);
      const context = browser.contexts()[0];
      if (!context) throw new Error('Không tìm thấy context trình duyệt Chrome');

      let page = context.pages()[0];
      if (!page) {
        page = await context.newPage();
      }
      await page.bringToFront();

      for (const groupUrl of targetGroupList) {
        const postStartTime = Date.now();
        try {
          await postToSingleGroup(page, groupUrl, postCaption, finalImageBase64);
          accResult.groups.push({ groupUrl, status: 'success', timestamp: new Date().toISOString() });
          logPostActivity({
            type: 'post',
            channel: 'groups',
            channelName: 'Facebook Groups',
            targetName: account.name,
            targetUrl: groupUrl,
            status: 'success',
            caption: postCaption,
            durationMs: Date.now() - postStartTime,
          });
        } catch (groupError) {
          console.error(`[Group Server Error] Lỗi đăng nhóm ${groupUrl}:`, groupError.message);
          accResult.groups.push({ groupUrl, status: 'error', error: groupError.message });
          logPostActivity({
            type: 'post',
            channel: 'groups',
            channelName: 'Facebook Groups',
            targetName: account.name,
            targetUrl: groupUrl,
            status: 'failed',
            caption: postCaption,
            error: groupError.message,
            errorDetails: groupError.stack,
            durationMs: Date.now() - postStartTime,
          });
        }
        await delay(3000);
      }

    } catch (accError) {
      console.error(`[Group Server Error] Lỗi xử lý tài khoản ${account.name}:`, accError.message);
      accResult.accountError = accError.message;
    } finally {
      if (browser) {
        try { await browser.close(); } catch {}
      }
      console.log(`[Group Server] Giữ nguyên cửa sổ Chrome của ${account.name} (không tắt).`);
      await delay(2000);
    }

    results.push(accResult);
  }

  // Tự động lưu lại vị trí nhóm vừa đăng vào groups-config.json
  saveConfig(config);

  console.log(`[Group Server] Đã hoàn thành toàn bộ lượt đăng bài vào nhóm.`);
  return {
    ok: true,
    totalAccounts: accountsToRun.length,
    completedAt: new Date().toISOString(),
    results,
  };
}

const CONFIG_CHATGPT_PATH = path.join(__dirname, 'chatgpt-config.json');

function loadChatGptAccounts() {
  try {
    if (fs.existsSync(CONFIG_CHATGPT_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(CONFIG_CHATGPT_PATH, 'utf-8'));
      if (Array.isArray(parsed.accounts) && parsed.accounts.length > 0) {
        return parsed.accounts;
      }
    }
  } catch (err) {
    console.error('[Group Server ChatGPT Config]', err.message);
  }
  return [
    { id: 1, name: 'ChatGPT Tài khoản 1', profileDir: 'n8n-chatgpt-profile', port: 9222, enabled: true },
    { id: 2, name: 'ChatGPT Tài khoản 2', profileDir: 'n8n-chatgpt-profile-2', port: 9242, enabled: true },
  ];
}

let currentGptAccountIndex = 0;

async function ensureChromeForGpt(account) {
  const targetPort = account.port;
  if (await isPortReady(targetPort)) return `http://127.0.0.1:${targetPort}`;

  const chromePath = getChromeExecutable();
  const profilePath = path.join(os.homedir(), 'AppData', 'Local', account.profileDir);
  console.log(`[Chrome] Khởi động Chrome cho ${account.name} trên cổng ${targetPort}...`);

  spawn(
    chromePath,
    [
      '--remote-debugging-address=127.0.0.1',
      `--remote-debugging-port=${targetPort}`,
      `--user-data-dir=${profilePath}`,
      '--start-maximized',
      'https://chatgpt.com/',
    ],
    { detached: true, stdio: 'ignore' },
  ).unref();

  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    await delay(1500);
    if (await isPortReady(targetPort)) {
      console.log(`[Chrome] Cửa sổ Chrome ${account.name} đã sẵn sàng trên cổng ${targetPort}. Chờ 8s load...`);
      await delay(8000);
      return `http://127.0.0.1:${targetPort}`;
    }
  }
  throw new Error(`Chrome không khởi động được trên cổng ${targetPort} cho ${account.name}.`);
}

async function openChatGptPage(account, { newConversation = false } = {}) {
  const cdpUrl = await ensureChromeForGpt(account);
  const browser = await chromium.connectOverCDP(cdpUrl);
  const context = browser.contexts()[0];
  if (!context) throw new Error('Chrome has no browser context');

  let page;
  if (newConversation) {
    page = await context.newPage();
    await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded' });
    await delay(3000);
  } else {
    page = context.pages().find((candidate) => candidate.url().includes('chatgpt.com'));
    if (!page) {
      page = await context.newPage();
      await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded' });
      await delay(3000);
    }
  }
  await page.bringToFront();
  return { browser, page };
}

async function promptBoxGpt(page) {
  const selectors = [
    'textarea#prompt-textarea',
    'textarea[placeholder*="Message"]',
    '[contenteditable="true"][data-lexical-editor="true"]',
    '[contenteditable="true"]',
  ];
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    for (const selector of selectors) {
      const locator = page.locator(selector).last();
      if (await locator.count()) {
        try {
          await locator.waitFor({ state: 'visible', timeout: 2000 });
          return locator;
        } catch {}
      }
    }
    await delay(2000);
  }
  throw new Error('Không tìm thấy ô chat prompt của ChatGPT.');
}

async function imageSourcesGpt(page) {
  return await page.locator('img').evaluateAll((images) =>
    images
      .map((image) => ({
        src: image.currentSrc || image.src,
        width: image.naturalWidth,
        height: image.naturalHeight,
      }))
      .filter(({ src, width, height }) => src && width >= 256 && height >= 256)
      .map(({ src }) => src),
  );
}

async function downloadAsBase64Gpt(page, src) {
  return await page.evaluate(async (imageSource) => {
    const response = await fetch(imageSource);
    if (!response.ok) throw new Error('Image download failed: ' + response.status);
    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();
    let binary = '';
    for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte);
    return { imageBase64: btoa(binary), mimeType: blob.type || 'image/png' };
  }, src);
}

async function checkChatGptLimit(page) {
  try {
    const bodyText = await page.locator('body').innerText();
    const limitPatterns = [
      /You've reached your limit/i,
      /You have reached our limit/i,
      /limit for GPT-4o/i,
      /hit the Free plan limit/i,
      /Try again after/i,
      /Rate limit/i,
      /Bạn đã đạt đến giới hạn/i,
      /Hết lượt tạo ảnh/i,
    ];
    for (const pattern of limitPatterns) {
      if (pattern.test(bodyText)) {
        return { isLimited: true, message: 'ChatGPT đã hết token/lượt (Rate limit reached).' };
      }
    }
  } catch {}
  return { isLimited: false };
}

/**
 * Kiểm tra xem ChatGPT có báo lỗi vi phạm chính sách hoặc lỗi tạo ảnh không.
 */
async function checkChatGptGenerationError(page) {
  try {
    const assistantLocators = page.locator('[data-message-author-role="assistant"]');
    const count = await assistantLocators.count();
    if (count > 0) {
      const lastMsgText = await assistantLocators.last().innerText();
      const errorPatterns = [
        /violate\s+(our\s+)?(content|usage)\s+policies/i,
        /violate\s+content\s+policy/i,
        /content\s+policies/i,
        /may\s+violate/i,
        /chính\s+sách\s+nội\s+dung/i,
        /vi\s+phạm\s+chính\s+sách/i,
        /we're\s+so\s+sorry/i,
        /unable\s+to\s+generate/i,
        /could\s+not\s+generate/i,
        /cannot\s+generate/i,
        /error\s+generating/i,
        /something\s+went\s+wrong/i,
        /an\s+error\s+occurred/i,
        /i\s+cannot\s+generate/i,
        /i'm\s+unable\s+to/i,
        /không\s+thể\s+tạo\s+ảnh/i,
        /lỗi\s+khi\s+tạo\s+ảnh/i,
      ];
      for (const pattern of errorPatterns) {
        if (pattern.test(lastMsgText)) {
          return { hasError: true, message: lastMsgText.trim().slice(0, 300) };
        }
      }
    }

    const errorBanner = page.locator('[data-testid*="error"], .text-red-500').first();
    if (await errorBanner.count() && await errorBanner.isVisible()) {
      const bannerText = await errorBanner.innerText().catch(() => '');
      if (bannerText) return { hasError: true, message: bannerText.trim() };
    }
  } catch {}
  return { hasError: false };
}

/** Tự động loại bỏ các từ nhạy cảm có thể trigger policy filter của ChatGPT / DALL-E */
function sanitizePromptForPolicy(rawPrompt) {
  if (!rawPrompt) return 'A modern professional technology and business visual';
  let safe = rawPrompt
    .replace(/⚠️ MANDATORY COMPOSITION OVERRIDE[\s\S]*?---/g, '')
    .replace(/\b(violate|policy|nude|sexy|hack|crack|bypass|weapon|gun|kill|blood|gambling|casino|betting|tiền ảo|crypto|lừa đảo|scam)\b/gi, '')
    .trim();
  if (safe.length < 10) {
    safe = 'A modern professional business visual, elegant minimalist setting, warm soft lighting';
  }
  return safe;
}

async function waitForGeneratedImageGpt(page, initialSrcs = new Set()) {
  const deadline = Date.now() + 360000; // timeout 6 phút
  let hasStarted = false;

  while (Date.now() < deadline) {
    const bodyText = await page.locator('body').innerText();
    const stopBtn = page.locator('button[aria-label*="Stop"], button[data-testid*="stop"]').first();
    const isStreaming = (await stopBtn.count()) && (await stopBtn.isVisible());
    const isCreating = bodyText.includes('Creating image') || isStreaming;

    if (isCreating) hasStarted = true;

    const limitCheck = await checkChatGptLimit(page);
    if (limitCheck.isLimited && !isCreating) {
      throw new Error(`[ChatGPT Quota Exceeded] ${limitCheck.message}`);
    }

    const genError = await checkChatGptGenerationError(page);
    if (genError.hasError && !isCreating) {
      throw new Error(`[ChatGPT Policy/Generation Error] ${genError.message}`);
    }

    const image1Btn = page.locator('button, [role="button"]').filter({
      hasText: /image\s*1\s*is\s*better/i,
    }).first();
    if (await image1Btn.count() > 0) {
      try { await image1Btn.click({ timeout: 2000 }); } catch {}
    }

    if (!isCreating) {
      const assistantImgs = await page.locator('[data-message-author-role="assistant"] img').evaluateAll((imgs) =>
        imgs
          .map((img) => ({
            src: img.currentSrc || img.src,
            width: img.naturalWidth,
            height: img.naturalHeight,
          }))
          .filter(({ src, width, height }) => src && width >= 256 && height >= 256 && !src.includes('avatar') && !src.includes('profile'))
          .map(({ src }) => src),
      );

      const allSrcs = await imageSourcesGpt(page);
      const newSrcs = allSrcs.filter((s) => !initialSrcs.has(s));
      const candidateSrcs = [...new Set([...assistantImgs.filter((s) => !initialSrcs.has(s)), ...newSrcs])];

      if (candidateSrcs.length > 0) {
        const lastSrc = candidateSrcs.at(-1);
        console.log(`[Group ChatGPT] Đã lấy ảnh mới: ${lastSrc.slice(0, 80)}...`);
        return await downloadAsBase64Gpt(page, lastSrc);
      }

      if (hasStarted && !isCreating) {
        await delay(5000);
        const doubleCheckSrcs = (await imageSourcesGpt(page)).filter((s) => !initialSrcs.has(s));
        if (doubleCheckSrcs.length > 0) {
          return await downloadAsBase64Gpt(page, doubleCheckSrcs.at(-1));
        }
        throw new Error('ChatGPT đã hoàn thành nhưng không có ảnh mới nào được tạo.');
      }
    }
    await delay(3000);
  }
  throw new Error('Hết thời gian 6 phút chờ ChatGPT tạo ảnh.');
}

// 20 BACKGROUND NỔI BẬT ĐA DẠNG MÀU SẮC (Tím, Xanh nước biển, Lục bảo, Đỏ, Cyberpunk, 3D Luxury)
const VIBRANT_BACKGROUNDS = [
  'futuristic cyberpunk stage bathed in intense neon violet and electric purple lighting, glowing purple holographic geometry, dark glossy floor with vivid reflections, cinematic atmospheric purple fog',
  'stunning deep ocean sapphire showroom with glowing electric blue and cyan light ribbons, sleek dark glass pedestal, immersive aquatic blue ambient glow, high-contrast cool atmosphere',
  'luxurious 3D digital gallery with deep emerald green and glowing mint neon accents, dark obsidian marble reflective floor, floating jade light crystals, premium modern aesthetic',
  'high-impact futuristic showroom bathed in dramatic crimson red and glowing ruby neon lighting, dark carbon-fiber textured panels, striking red rim lighting and sharp reflections',
  'luxurious midnight indigo studio with vibrant magenta and purple neon light tubes, floating frosted glass geometric prisms, deep amethyst backdrop, futuristic soft glow',
  'cutting-edge futuristic stage with glowing ice blue neon pillars, sleek frosted glass architectural elements, clean minimalist deep cobalt and arctic cyan lighting',
  'breathtaking futuristic indoor bio-tech garden with glowing teal and emerald flora, sleek architectural glass arches, soft cyan and mint lighting, modern tech vibe',
  'dramatic dark obsidian stage with glowing scarlet red neon light rings, floating red holographic geometric shapes, bold and energetic high-tech atmosphere',
  'abstract 3D luxury stage with curved glossy purple panels, floating glowing violet rings, deep galaxy purple backdrop with shimmering starlight ambient glow',
  'sleek dark cobalt blue virtual space with floating glowing neon cyan data nodes, interconnected digital light lines, futuristic technology showroom aesthetic',
  'futuristic high-tech lab with glowing neon emerald and bright mint green light strips, holographic matrix projections, dark charcoal metallic surfaces, vibrant green ambient glow',
  'cutting-edge technology studio with glowing ruby red laser grid lines, floating glass panels, dark matte background with vivid crimson backlight and sleek reflections',
  'dramatic high-tech penthouse terrace overlooking a glowing neon cyberpunk city at dusk, rich purple and neon violet glow, soft city bokeh lights, reflective glass railings',
  'futuristic high-tech digital studio bathed in electric royal blue and glowing cyan neon lighting, transparent holographic interfaces, sleek reflective floor, cool blue atmosphere',
  'modern digital showroom with deep teal and dark aqua tones, glowing mint neon light tubes, floating 3D geometric glass prisms, crisp emerald reflections',
  'energetic futuristic presentation stage with warm crimson red and glowing neon scarlet arches, sleek polished dark podium, dynamic cinematic lighting',
  'sleek futuristic exhibition stage with glowing violet laser light grids, floating holographic data crystals, deep dark purple backdrop with neon purple accents',
  'sleek panoramic lounge overlooking a neon-lit futuristic city with glowing blue and cyan skyscrapers at night, polished dark marble surfaces, rich cool blue tones',
  'abstract 3D stage featuring floating glowing emerald crystals, neon mint ambient lighting, dark glossy floor reflecting vibrant green light',
  'futuristic urban terrace overlooking a neon red cyberpunk cityscape at night, glowing ruby billboards in background, sleek dark metal architecture, high-contrast glow',
];

let currentBgIndex = Math.floor(Math.random() * VIBRANT_BACKGROUNDS.length);
let currentLayoutIndex = Math.floor(Math.random() * 5);
let currentPoseIndex = Math.floor(Math.random() * 7);

function getNextBackground() {
  const bg = VIBRANT_BACKGROUNDS[currentBgIndex % VIBRANT_BACKGROUNDS.length];
  const bgNumber = (currentBgIndex % VIBRANT_BACKGROUNDS.length) + 1;
  currentBgIndex = (currentBgIndex + 1) % VIBRANT_BACKGROUNDS.length;
  return { bg, bgNumber };
}

function getNextLayout(layouts) {
  const layout = layouts[currentLayoutIndex % layouts.length];
  const layoutNumber = (currentLayoutIndex % layouts.length) + 1;
  currentLayoutIndex = (currentLayoutIndex + 1) % layouts.length;
  return { layout, layoutNumber };
}

function getNextPose(poses) {
  const pose = poses[currentPoseIndex % poses.length];
  const poseNumber = (currentPoseIndex % poses.length) + 1;
  currentPoseIndex = (currentPoseIndex + 1) % poses.length;
  return { pose, poseNumber };
}

function pickVariation(promptText = '', hasDu = true) {
  const { bg, bgNumber } = getNextBackground();

  const duLayouts = [
    'FULL-BLEED SCENE WITH SOFT CURVED OVERLAY CARD (Right): Environmental background spans 100% full-bleed. A sleek semi-transparent white frosted glass panel with smooth curved edges rests on the RIGHT side containing all headline text. Du mascot stands neatly on the LEFT side.',
    'FULL-BLEED SCENE WITH FROSTED GLASS PANEL (Left): Environmental background spans 100% full-bleed. A sleek semi-transparent frosted glass panel rests on the LEFT side containing all text. Du mascot stands cleanly on the RIGHT side.',
    'FULL-BLEED SCENE WITH FLOATING TEXT CARD (Top-Right): Environmental background spans 100% full-bleed. Headline text is placed on a clean translucent floating card in the TOP-RIGHT area. Du mascot stands in the BOTTOM-LEFT corner.',
    'FULL-BLEED SCENE WITH FLOATING TEXT CARD (Top-Left): Environmental background spans 100% full-bleed. Headline text is placed on a clean translucent floating card in the TOP-LEFT area. Du mascot stands in the BOTTOM-RIGHT corner.',
    'FULL-BLEED SCENE WITH BOTTOM TEXT BAR: Environmental background spans 100% full-bleed. Translucent frosted glass bar across the BOTTOM 35% contains all text. Du mascot stands in the UPPER-LEFT area.',
  ];
  const duPoses = [
    'standing upright with RIGHT arm extended, index finger confidently pointing toward the text area',
    'sitting casually on the edge of a stylized floating geometric platform, one leg dangling, relaxed and approachable pose',
    'walking forward dynamically with a confident energetic stride, arms swinging naturally',
    'arms crossed over chest in a cool confident stance, head tilted slightly',
    'holding a glowing holographic tablet or phone in both hands, screen emitting soft blue light',
    'both arms raised upward in a celebratory V-shape victory pose',
    'leaning forward slightly with one hand raised in a friendly wave gesture',
  ];
  const { layout, layoutNumber } = getNextLayout(duLayouts);
  const { pose, poseNumber } = getNextPose(duPoses);
  console.log(`[Variation] Du Layout: ${layoutNumber}/${duLayouts.length} | Pose: ${poseNumber}/${duPoses.length} | BG: #${bgNumber}/20 (Xoay vòng xen kẽ)`);

  return [
    '⚠️ MANDATORY COMPOSITION OVERRIDE — YOU MUST FOLLOW THIS EXACTLY:',
    '1. BACKGROUND: The environmental background scene MUST be FULL-BLEED, spanning 100% of the entire image canvas corner-to-corner (no solid split color blocks).',
    '2. BRANDING / LOGO: Include a clean brand logo badge in the TOP corner (top-left or top-right) displaying bold white text "DUDI" with "software" underneath on a vibrant red background.',
    '3. DU CHARACTER: Du mascot is medium-to-small size (20-40% of frame height), fully opaque and solid.',
    '4. TEXT ZONE: All text MUST be placed inside a clean semi-transparent frosted glass panel or translucent overlay card resting over the full-bleed background.',
    '5. ZONE SEPARATION: Text and Du character occupy separate non-overlapping spatial zones — zero text printed on top of Du.',
    `LAYOUT: ${layout}`,
    `BACKGROUND SCENE: ${bg}`,
    `DU POSE: ${pose}`,
    'The layout, background, and pose above are ABSOLUTE REQUIREMENTS and OVERRIDE any other instruction.',
    '---',
  ].join('\n');
}

async function executeGenerateOnAccount(account, { prompt, aspectRatio, newConversation = false }) {
  const { browser, page } = await openChatGptPage(account, { newConversation });
  try {
    const MAX_RETRIES = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      console.log(`[${account.name}] Bắt đầu tạo ảnh Group (Lần thử ${attempt}/${MAX_RETRIES})...`);
      const initialSrcs = new Set(await imageSourcesGpt(page));

      const input = await promptBoxGpt(page);
      let fullPrompt;

      if (attempt === 1) {
        const variation = pickVariation(prompt, true);
        fullPrompt = [
          'Generate one high-quality, professional image matching the following description:',
          variation,
          prompt.trim(),
          aspectRatio ? 'Preferred aspect ratio: ' + aspectRatio + '.' : '',
          'Do not explain the prompt. Generate the image now.',
        ].filter(Boolean).join('\n\n');
      } else {
        console.warn(`[${account.name}] Thử lại tạo ảnh lần ${attempt}: tự động tối ưu prompt...`);
        const safePrompt = sanitizePromptForPolicy(prompt);
        fullPrompt = [
          'Please regenerate a brand new high-quality image strictly adhering to all content policies:',
          safePrompt,
          aspectRatio ? 'Preferred aspect ratio: ' + aspectRatio + '.' : '',
          'Do not explain. Generate the image now.',
        ].filter(Boolean).join('\n\n');
      }

      await input.fill(fullPrompt);
      await input.press('Enter');
      console.log(`[${account.name}] Đã gửi prompt lần ${attempt}. Đang theo dõi tiến trình...`);
      await delay(5000);

      try {
        const image = await waitForGeneratedImageGpt(page, initialSrcs);
        console.log(`[${account.name}] Tạo ảnh Group thành công ở lần thử ${attempt}.`);
        return {
          ...image,
          fileName: 'chatgpt-group-' + Date.now() + '.png',
          source: 'chatgpt-group',
          account: account.name,
        };
      } catch (err) {
        lastError = err;
        console.error(`[${account.name}] Lần thử ${attempt} thất bại:`, err.message);

        if (err.message.includes('Quota Exceeded') || err.message.includes('Rate limit') || err.message.includes('đã hết token')) {
          throw err;
        }

        if (attempt < MAX_RETRIES) {
          console.log(`[${account.name}] Chuẩn bị thử lại tạo ảnh lần ${attempt + 1}...`);
          await delay(4000);
        }
      }
    }

    throw new Error(`ChatGPT tạo ảnh thất bại sau ${MAX_RETRIES} lần thử lại. Chi tiết lỗi: ${lastError?.message || 'Không tạo được ảnh hợp lệ'}`);
  } finally {
    try { await page.close(); } catch {}
    await browser.close();
  }
}

async function generateGroupImage(params) {
  const { account: requestedAccount, prompt, aspectRatio, newConversation = false } = params;
  const allAccounts = loadChatGptAccounts();
  const enabledAccounts = allAccounts.filter(a => a.enabled !== false);
  if (enabledAccounts.length === 0) {
    throw new Error('Không có tài khoản ChatGPT nào đang Bật trong cấu hình.');
  }

  let primaryAccount;
  if (requestedAccount) {
    primaryAccount = enabledAccounts.find((a) => String(a.id) === String(requestedAccount)) || enabledAccounts[0];
  } else {
    primaryAccount = enabledAccounts[currentGptAccountIndex % enabledAccounts.length];
    currentGptAccountIndex = (currentGptAccountIndex + 1) % enabledAccounts.length;
  }

  console.log(`[Group Server 3002] Đang tạo ảnh xen kẽ bằng: ${primaryAccount.name} (Port ${primaryAccount.port})...`);
  try {
    return await executeGenerateOnAccount(primaryAccount, { prompt, aspectRatio, newConversation });
  } catch (err) {
    if (err.message.includes('Quota Exceeded') || err.message.includes('limit') || err.message.includes('Rate limit')) {
      const remainingAccounts = enabledAccounts.filter((a) => String(a.id) !== String(primaryAccount.id));
      for (const fallbackAccount of remainingAccounts) {
        try {
          console.warn(`[Group Server 3002] ${primaryAccount.name} bị giới hạn token/quota. Tự động chuyển sang ${fallbackAccount.name} (Port ${fallbackAccount.port})...`);
          return await executeGenerateOnAccount(fallbackAccount, { prompt, aspectRatio, newConversation });
        } catch (fallbackErr) {
          console.warn(`[Group Server 3002] ${fallbackAccount.name} cũng gặp lỗi:`, fallbackErr.message);
        }
      }
    }
    throw err;
  }
}

// REST API Endpoints
app.get('/health', async (_req, res) => {
  const config = loadConfig();
  res.json({
    ok: true,
    status: 'online',
    service: 'facebook-group-bridge',
    port,
    config,
  });
});

app.get('/config', (_req, res) => {
  res.json(loadConfig());
});

app.post('/generate', async (req, res) => {
  const startTime = Date.now();
  const body = req.body || {};
  const action = body.action;

  // Nếu payload là đăng bài nhóm Facebook
  if (
    action === 'publish_facebook_group' ||
    action === 'publish_facebook_groups' ||
    action === 'post_groups' ||
    action === 'publish_facebook_post' ||
    (!action && body.caption && !body.prompt)
  ) {
    if (activeGroupJob) {
      return res.status(429).json({ error: 'Đang có một tiến trình đăng bài nhóm đang chạy. Vui lòng thử lại sau.' });
    }
    try {
      activeGroupJob = true;
      const report = await executeGroupPosting(body);
      return res.json(report);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      return res.status(500).json({ error: errorMsg });
    } finally {
      activeGroupJob = false;
    }
  }

  // Mặc định tạo ảnh qua ChatGPT
  try {
    const result = await generateGroupImage(body);
    logPostActivity({
      type: 'image_generate',
      channel: 'chatgpt',
      channelName: 'ChatGPT Image AI (Nhóm)',
      status: 'success',
      prompt: body.prompt,
      chatgptAccount: result.account,
      aspectRatio: body.aspectRatio,
      durationMs: Date.now() - startTime,
    });
    res.json(result);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logPostActivity({
      type: 'image_generate',
      channel: 'chatgpt',
      channelName: 'ChatGPT Image AI (Nhóm)',
      status: 'failed',
      prompt: body?.prompt,
      error: errorMsg,
      errorDetails: error.stack,
      durationMs: Date.now() - startTime,
    });
    res.status(500).json({ error: errorMsg });
  }
});

app.post('/post-groups', async (req, res) => {
  if (activeGroupJob) {
    return res.status(429).json({ error: 'Đang có một tiến trình đăng bài nhóm đang chạy. Vui lòng thử lại sau.' });
  }

  try {
    activeGroupJob = true;
    const report = await executeGroupPosting(req.body);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  } finally {
    activeGroupJob = false;
  }
});

app.listen(port, host, () => {
  console.log(`======================================================`);
  console.log(`  FACEBOOK GROUP POSTING BRIDGE SERVER`);
  console.log(`  Listening on: http://${host}:${port}`);
  console.log(`  Server 2: Facebook Groups Bridge đã sẵn sàng.`);
  console.log(`======================================================`);
});
