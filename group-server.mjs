import express from 'express';
import { chromium } from 'playwright-core';
import { setTimeout as delay } from 'node:timers/promises';
import { spawn, exec } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { logPostActivity } from './lib/history-logger.mjs';
import {
  attachReferenceImage,
  resolveReferenceImageUrl,
  extractCardTextFromPrompt,
} from './lib/chatgpt-image-helper.mjs';

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

/**
 * Quản lý Chiến thuật 3 Nhóm:
 * - Nhóm 1 (group_1): Đội đăng bài hôm nay
 * - Nhóm 2 (group_2): Đội dự phòng luân phiên (sẽ chạy ngày mai)
 * - Nhóm 3 (quarantine): Khu cách ly 7 ngày (168 giờ)
 */
function resolveRotationAndQuarantine(config) {
  if (!config) return config;
  if (!Array.isArray(config.accounts)) config.accounts = [];

  if (!config.rotation) {
    config.rotation = {
      enabled: true,
      mode: 'daily_alternate',
      activeGroupToday: 'group_1',
      lastRotatedDate: '',
      quarantineDays: 7,
    };
  }

  let isDirty = false;
  const now = Date.now();

  // 1. Kiểm tra và tự động giải phóng tài khoản trong Nhóm 3 (Quarantine) sau 7 ngày
  for (const acc of config.accounts) {
    // Migration: nếu chưa có roleGroup thì gán theo id
    if (!acc.roleGroup) {
      acc.roleGroup = acc.id === 'acc_2' ? 'group_2' : 'group_1';
      acc.originalRoleGroup = acc.roleGroup;
      isDirty = true;
    }

    if ((acc.roleGroup === 'quarantine' || acc.quarantineUntil || acc.cooldownUntil) && acc.status !== 'checkpoint' && !acc.checkpointAt) {
      const qUntilTime = new Date(acc.quarantineUntil || acc.cooldownUntil).getTime();
      if (now >= qUntilTime) {
        const restoredRole = acc.originalRoleGroup || (acc.id === 'acc_2' ? 'group_2' : 'group_1');
        console.log(`\n======================================================`);
        console.log(`🎉🎉🎉 [CÁCH LY HOÀN TẤT] TÀI KHOẢN "${acc.name}" ĐÃ HẾT 7 NGÀY CÁCH LY AN TOÀN!`);
        console.log(`👉 Đã tự động phục hồi về ${restoredRole === 'group_1' ? 'Nhóm 1 (Đội đăng bài)' : 'Nhóm 2 (Đội dự phòng)'}.`);
        console.log(`======================================================\n`);

        acc.roleGroup = restoredRole;
        acc.status = 'active';
        acc.enabled = true;
        delete acc.quarantineUntil;
        delete acc.quarantineReason;
        delete acc.quarantineAt;
        delete acc.cooldownUntil;
        delete acc.disabledReason;
        delete acc.disabledAt;
        isDirty = true;
      }
    }
  }

  // 2. Kiểm tra luân phiên ngày (Daily Alternation giữa Nhóm 1 và Nhóm 2)
  if (config.rotation.enabled !== false && config.rotation.mode !== 'manual') {
    const vnDateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }); // YYYY-MM-DD
    const lastDate = config.rotation.lastRotatedDate || '';

    if (lastDate !== vnDateStr) {
      const todayDay = parseInt(vnDateStr.split('-')[2], 10) || 1;
      const nextActive = (todayDay % 2 === 1) ? 'group_1' : 'group_2';

      if (config.rotation.activeGroupToday !== nextActive || !config.rotation.lastRotatedDate) {
        console.log(`[Group Server] 📅 Sang ngày mới (${vnDateStr})!`);
        console.log(`[Group Server] 🔄 Luân phiên phiên đăng bài: [${nextActive === 'group_1' ? '🟢 Nhóm 1 (Đội chính)' : '🟡 Nhóm 2 (Đội dự phòng)'}] đăng hôm nay.`);
        config.rotation.activeGroupToday = nextActive;
      }
      config.rotation.lastRotatedDate = vnDateStr;
      isDirty = true;
    }
  }

  if (isDirty) {
    saveConfig(config);
  }

  return config;
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

/**
 * Đóng hoàn toàn trình duyệt Chrome sau khi hoàn tất tác vụ:
 * 1. Gửi lệnh CDP Browser.close để Chrome lưu phiên làm việc và đóng sạch sẽ.
 * 2. Nếu sau 2.5s tiến trình vẫn chạy trên cổng CDP, dùng lệnh PowerShell để tắt triệt để.
 */
async function closeChromeGracefully(browser, targetPort) {
  if (browser) {
    try {
      console.log(`[Chrome] Gửi lệnh Browser.close qua CDP để tắt Chrome (Cổng ${targetPort || 'n/a'})...`);
      const session = await browser.newBrowserCDPSession();
      await session.send('Browser.close');
      await delay(2500);
    } catch (err) {
      console.warn(`[Chrome] Gửi lệnh Browser.close chưa được (${err.message}), đóng các tab...`);
      try {
        for (const ctx of browser.contexts()) {
          for (const p of ctx.pages()) {
            await p.close().catch(() => {});
          }
        }
      } catch {}
    }
    try {
      await browser.close();
    } catch {}
  }

  if (targetPort) {
    await delay(1500);
    if (await isPortReady(targetPort)) {
      console.log(`[Chrome] Cổng ${targetPort} vẫn mở, tiến hành giải phóng tiến trình Chrome...`);
      try {
        const killCmd = `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${targetPort} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"`;
        exec(killCmd);
        console.log(`[Chrome] Đã dọn dẹp tiến trình Chrome trên cổng ${targetPort}.`);
      } catch (err) {
        console.warn(`[Chrome] Lỗi khi dừng tiến trình cổng ${targetPort}:`, err.message);
      }
    } else {
      console.log(`[Chrome] Cửa sổ Chrome trên cổng ${targetPort} đã tắt hoàn toàn.`);
    }
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

function stripMarkdown(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // Xóa ** in đậm
    .replace(/\*(.*?)\*/g, '$1')     // Xóa * in nghiêng
    .replace(/_{2}(.*?)_{2}/g, '$1') // Xóa __
    .replace(/_(.*?)_/g, '$1')       // Xóa _
    .replace(/^#{1,6}\s*/gm, '')     // Xóa # tiêu đề
    .replace(/^>\s?/gm, '')          // Xóa > quote
    .replace(/^---+\s*$/gm, '')      // Xóa ---
    .replace(/`([^`]+)`/g, '$1')     // Xóa backtick
    .trim();
}

function stripCompanyFooter(caption) {
  if (!caption || typeof caption !== 'string') return '';
  const lines = caption.split('\n');
  const filtered = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const isCompany = /dudi\s+software/i.test(line);
    const isAddress = /nguy[eễ]n th[iị] minh khai|đường 14|phường xuân hòa|phường thủ đức/i.test(line);
    const isMst = /mst\s*[:：]|mã số thuế|0318776997/i.test(line);
    const isWeb = /dudisoftware\.com/i.test(line);
    const isEmail = /contact@dudisoftware\.com/i.test(line);
    const isHotline = /(?:hotline|zalo)\s*[:：].*0909\s*163\s*821/i.test(line);

    if (isCompany || isAddress || isMst || isWeb || isEmail || isHotline) {
      continue;
    }
    filtered.push(lines[i]);
  }
  while (filtered.length > 0 && !filtered[filtered.length - 1].trim()) {
    filtered.pop();
  }
  return filtered.join('\n').trim();
}

function cleanCaption(value) {
  let result = '';
  if (value && typeof value === 'object') {
    if (typeof value.facebookPost === 'string' && value.facebookPost.trim()) result = value.facebookPost.trim();
    else if (typeof value.articleMarkdown === 'string' && value.articleMarkdown.trim()) result = value.articleMarkdown.trim();
    else if (typeof value.socialCaption === 'string' && value.socialCaption.trim()) result = value.socialCaption.trim();
    else if (typeof value.caption === 'string' && value.caption.trim()) result = value.caption.trim();
    else if (typeof value.content === 'string' && value.content.trim()) result = value.content.trim();
  }

  if (!result) {
    const raw = String(value ?? '').trim();
    const unfenced = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    for (const candidate of [raw, unfenced]) {
      try {
        const parsed = JSON.parse(candidate);
        if (parsed && typeof parsed === 'object') {
          if (typeof parsed.facebookPost === 'string' && parsed.facebookPost.trim()) {
            result = parsed.facebookPost.trim();
            break;
          }
          if (typeof parsed.articleMarkdown === 'string' && parsed.articleMarkdown.trim()) {
            result = parsed.articleMarkdown.trim();
            break;
          }
          if (typeof parsed.socialCaption === 'string' && parsed.socialCaption.trim()) {
            result = parsed.socialCaption.trim();
            break;
          }
          if (typeof parsed.caption === 'string' && parsed.caption.trim()) {
            result = parsed.caption.trim();
            break;
          }
          if (typeof parsed.content === 'string' && parsed.content.trim()) {
            result = parsed.content.trim();
            break;
          }
        }
      } catch {}
    }

    if (!result) {
      result = unfenced.replace(/\\n/g, '\n');
    }
  }

  return stripCompanyFooter(stripMarkdown(result));
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
 * Tự động quét và tắt sạch mọi popup phiền hà (thông báo, chat tabs, cookie, tour, dialog)
 * trước khi thực hiện chức năng chính.
 */
async function dismissAllPopups(page, service = 'facebook') {
  if (!page) return;
  try {
    page.on('dialog', async (dialog) => {
      try {
        console.log(`[Popup Cleaner] Tự động chấp nhận dialog: "${dialog.message()}"`);
        await dialog.accept();
      } catch {}
    });

    if (service === 'facebook') {
      try {
        const chatCloseBtns = page.locator('[aria-label="Đóng cuộc trò chuyện"], [aria-label="Close chat"], [aria-label="Đóng tab trò chuyện"], [aria-label="Close chat tab"]');
        const count = await chatCloseBtns.count();
        for (let i = 0; i < count; i++) {
          if (await chatCloseBtns.nth(i).isVisible()) {
            await chatCloseBtns.nth(i).click({ force: true });
            console.log('[Popup Cleaner] Đã đóng tab chat Facebook đang mở đè.');
            await delay(300);
          }
        }
      } catch {}

      const dismissButtonTexts = [
        'Lúc khác',
        'Để sau',
        'Không phải bây giờ',
        'Không, cảm ơn',
        'Bỏ qua',
        'Bỏ',
        'Hủy',
        'Đóng',
        'Hiểu rồi',
        'Tôi hiểu',
        'Not Now',
        'Later',
        'Skip',
        'Close',
        'Dismiss',
        'Cancel',
        'Decline',
        'Got it',
      ];

      for (const text of dismissButtonTexts) {
        try {
          const btn = page.locator(`[role="dialog"] [role="button"]:has-text("${text}"), [role="button"]:has-text("${text}")`).first();
          if (await btn.count() && await btn.isVisible()) {
            const btnText = (await btn.innerText()).trim();
            if (btnText.includes('Đăng') || btnText.includes('Post') || btnText.includes('Tạo bài') || btnText.includes('Tham gia')) continue;
            await btn.click({ force: true });
            console.log(`[Popup Cleaner] Đã bấm nút tắt popup Facebook: "${text}"`);
            await delay(500);
          }
        } catch {}
      }

      try {
        const dialogs = page.locator('[role="dialog"]');
        const dCount = await dialogs.count();
        for (let d = 0; d < dCount; d++) {
          const currentDialog = dialogs.nth(d);
          const ariaLabel = (await currentDialog.getAttribute('aria-label')) || '';
          if (ariaLabel.includes('Tạo bài viết') || ariaLabel.includes('Create post') || ariaLabel.includes('Câu hỏi') || ariaLabel.includes('Tham gia')) {
            continue;
          }
          const xBtn = currentDialog.locator('[aria-label="Đóng"], [aria-label="Close"], [aria-label*="close" i]').first();
          if (await xBtn.count() && await xBtn.isVisible()) {
            await xBtn.click({ force: true });
            console.log('[Popup Cleaner] Đã bấm nút X đóng popup Facebook không cần thiết.');
            await delay(500);
          }
        }
      } catch {}

      try {
        await page.keyboard.press('Escape');
      } catch {}
    }

    if (service === 'chatgpt') {
      const gptDismissTexts = [
        'Stay logged out',
        'Stay signed out',
        'Dismiss',
        'Done',
        'Next',
        'Hoàn tất',
        'Tiếp tục',
        'Đã hiểu',
        'Got it',
        'Accept all',
        'Chấp nhận tất cả',
        'Close',
        'Đóng',
      ];

      for (const text of gptDismissTexts) {
        try {
          const btn = page.locator(`button:has-text("${text}"), [role="button"]:has-text("${text}")`).first();
          if (await btn.count() && await btn.isVisible()) {
            await btn.click({ force: true });
            console.log(`[Popup Cleaner] Đã tắt popup ChatGPT: "${text}"`);
            await delay(500);
          }
        } catch {}
      }

      try {
        const closeBtn = page.locator('[role="dialog"] button[aria-label="Close"], [role="dialog"] button[aria-label="Đóng"]').first();
        if (await closeBtn.count() && await closeBtn.isVisible()) {
          await closeBtn.click({ force: true });
          console.log('[Popup Cleaner] Đã bấm nút X đóng dialog ChatGPT.');
          await delay(500);
        }
      } catch {}

      try {
        await page.keyboard.press('Escape');
      } catch {}
    }
  } catch {}
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
 * Phát hiện tài khoản có đang bị Facebook cảnh báo spam, giới hạn tần suất đăng bài, hoặc dính checkpoint hay không
 */
async function detectFacebookWarningOrBlock(page, dialog = null) {
  try {
    const currentUrl = page.url();
    if (currentUrl.includes('/checkpoint/') || currentUrl.includes('login.php?next=checkpoint') || currentUrl.includes('checkpoint')) {
      return 'Tài khoản đang bị Facebook chuyển hướng đến trang Checkpoint (Xác nhận bạn là người thật / xác minh danh tính)';
    }

    const warningKeywords = [
      'xác nhận bạn là người thật',
      'hãy xác nhận bạn là người thật',
      'để sử dụng trang cá nhân của mình',
      'xác minh danh tính',
      'để bảo vệ cộng đồng khỏi spam',
      'giới hạn tần suất bạn đăng bài',
      'giới hạn tần suất',
      'khoảng thời gian nhất định',
      'thử lại sau',
      'tiêu chuẩn cộng đồng',
      'đóng góp ý kiến',
      'tạm thời bị chặn',
      'bạn tạm thời bị hạn chế',
      'không thể thực hiện hành động này',
      'bạn đã thực hiện hành động này quá thường xuyên',
      'hạn chế tính năng',
      'tài khoản của bạn đã bị khóa',
      'tài khoản của bạn tạm thời bị khóa',
      'nhập số di động',
      'xác nhận danh tính',
      'bị vô hiệu hóa',
      'protect the community from spam',
      'limit how often',
      'temporarily blocked',
      'action blocked',
      'community standards',
      'try again later',
      'your account has been locked',
      'confirm your identity',
    ];

    // 1. Quét nội dung text trong dialog (nếu có)
    if (dialog) {
      const dialogVisible = await dialog.isVisible().catch(() => false);
      if (dialogVisible) {
        const dialogText = (await dialog.innerText().catch(() => '')).toLowerCase();
        for (const kw of warningKeywords) {
          if (dialogText.includes(kw)) {
            const lines = dialogText.split('\n').map(l => l.trim()).filter(Boolean);
            const found = lines.find(l => l.includes(kw)) || kw;
            return `Cảnh báo Facebook trong hộp thoại: "${found.substring(0, 150)}"`;
          }
        }
      }
    }

    // 2. Quét các phần tử role="alert" hoặc có text cảnh báo đặc trưng
    const alertSelectors = [
      '[role="alert"]',
      'div[role="dialog"] [role="alert"]',
      'div[role="dialog"] div[style*="red"]',
      'div:has-text("Để bảo vệ cộng đồng")',
      'div:has-text("giới hạn tần suất")',
      'div:has-text("Đóng góp ý kiến")',
      'div:has-text("tạm thời bị chặn")',
      'div:has-text("Tiêu chuẩn cộng đồng")',
    ];

    for (const sel of alertSelectors) {
      const el = page.locator(sel).first();
      if (await el.count().catch(() => 0) && await el.isVisible().catch(() => false)) {
        const text = (await el.innerText().catch(() => '')).trim();
        const lower = text.toLowerCase();
        for (const kw of warningKeywords) {
          if (lower.includes(kw)) {
            return `Cảnh báo Facebook phát hiện: "${text.replace(/\s+/g, ' ').substring(0, 150)}"`;
          }
        }
      }
    }

    // 3. Quét nhanh text toàn trang
    const pageSnippet = await page.evaluate(() => {
      const text = document.body ? document.body.innerText : '';
      return text.substring(0, 5000).toLowerCase();
    }).catch(() => '');

    if (
      pageSnippet.includes('xác nhận bạn là người thật') ||
      pageSnippet.includes('hãy xác nhận bạn là người thật') ||
      pageSnippet.includes('confirm your identity') ||
      pageSnippet.includes('để bảo vệ cộng đồng khỏi spam') ||
      (pageSnippet.includes('giới hạn tần suất') && pageSnippet.includes('thử lại sau')) ||
      pageSnippet.includes('tài khoản của bạn đã bị khóa') ||
      pageSnippet.includes('bạn tạm thời bị chặn')
    ) {
      for (const kw of warningKeywords) {
        if (pageSnippet.includes(kw)) {
          return `Cảnh báo Facebook trên trang: "${kw}"`;
        }
      }
    }
  } catch (err) {
    // Không làm gián đoạn nếu xảy ra lỗi evaluate
  }
  return null;
}

function cleanFbUrl(href) {
  if (!href) return null;
  let fullUrl = href;
  if (fullUrl.startsWith('/')) {
    fullUrl = 'https://www.facebook.com' + fullUrl;
  }
  try {
    const u = new URL(fullUrl);
    u.searchParams.delete('__cft__[0]');
    u.searchParams.delete('__tn__');
    u.searchParams.delete('notif_id');
    u.searchParams.delete('notif_t');
    u.searchParams.delete('ref');
    return u.toString();
  } catch {
    return fullUrl;
  }
}

async function extractLatestPostUrl(page, fallbackUrl) {
  try {
    const timeLocators = [
      'a[role="link"]:has-text("Vừa xong")',
      'a[role="link"]:has-text("Just now")',
      'a[role="link"]:has-text("1 phút")',
      'a[role="link"]:has-text("1 min")',
      'a[role="link"]:has-text("2 phút")',
      'a[role="link"]:has-text("2 min")',
    ];
    for (const sel of timeLocators) {
      const loc = page.locator(sel).first();
      if (await loc.count().catch(() => 0) && await loc.isVisible().catch(() => false)) {
        let href = await loc.getAttribute('href').catch(() => null);
        if (href) return cleanFbUrl(href);
      }
    }

    const feedLocators = [
      'div[role="feed"] a[href*="/posts/"]',
      'div[role="feed"] a[href*="permalink.php"]',
      'div[role="feed"] a[href*="story_fbid="]',
      'div[role="feed"] a[href*="/photo/"]',
      'div[role="feed"] a[href*="/photos/"]',
      'div[role="main"] a[href*="/posts/"]',
      'div[role="main"] a[href*="permalink.php"]',
      'div[role="main"] a[href*="story_fbid="]',
      'div[role="main"] a[href*="/photo/"]',
    ];
    for (const sel of feedLocators) {
      const loc = page.locator(sel).first();
      if (await loc.count().catch(() => 0)) {
        let href = await loc.getAttribute('href').catch(() => null);
        if (href) return cleanFbUrl(href);
      }
    }
  } catch (err) {
    console.warn('[Facebook Group] Không thể trích xuất link bài viết:', err.message);
  }
  return fallbackUrl;
}

/**
 * Đăng bài vào 1 Facebook Group (Tự động kiểm tra & tham gia nhóm trước khi đăng)
 */
async function postToSingleGroup(page, groupUrl, caption, imageBase64, mimeType = 'image/png', fileName = 'image.png') {
  console.log(`[Group Post] Đang truy cập nhóm: ${groupUrl}...`);
  await page.goto(groupUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await delay(4000);
  await dismissAllPopups(page, 'facebook');

  if (page.url().includes('/login')) {
    throw new Error('Tài khoản Facebook chưa đăng nhập trong profile này. Hãy chạy open-setup-chrome.ps1 để đăng nhập.');
  }

  // KIỂM TRA NGAY NẾU TÀI KHOẢN ĐANG Ở TRẠNG THÁI CHECKPOINT / KHÓA TÍNH NĂNG
  const initialWarning = await detectFacebookWarningOrBlock(page);
  if (initialWarning) {
    const warnErr = new Error(`[FACEBOOK_WARNING_BLOCKED] ${initialWarning}`);
    warnErr.isWarningBlocked = true;
    throw warnErr;
  }

  // BƯỚC 1: KIỂM TRA VÀ TỰ ĐỘNG THAM GIA NHÓM NẾU CHƯA THAM GIA
  const joinResult = await ensureJoinedGroup(page, groupUrl);
  await delay(2000);
  await dismissAllPopups(page, 'facebook');

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
  console.log('[Group Post] Đã bấm nút Đăng. Đang theo dõi xuất bản & quét cảnh báo Facebook...');

  let isPublished = false;
  const publishDeadline = Date.now() + 45000;

  while (Date.now() < publishDeadline) {
    await delay(2000);

    // 1. Kiểm tra nếu có cảnh báo spam / giới hạn tần suất xuất hiện ngay trong hoặc sau khi bấm Đăng
    const warning = await detectFacebookWarningOrBlock(page, dialog);
    if (warning) {
      console.error(`\n🚨 [Group Post] PHÁT HIỆN CẢNH BÁO VI PHẠM TỪ FACEBOOK: ${warning}`);
      const warnErr = new Error(`[FACEBOOK_WARNING_BLOCKED] ${warning}`);
      warnErr.isWarningBlocked = true;
      throw warnErr;
    }

    // 2. Kiểm tra nếu dialog đã đóng hoàn toàn (Facebook xuất bản thành công)
    const dialogVisible = await dialog.isVisible().catch(() => false);
    if (!dialogVisible) {
      isPublished = true;
      console.log('[Group Post] Hộp thoại đăng bài đã đóng (Facebook đã xuất bản bài viết).');
      break;
    }
  }

  if (!isPublished) {
    const finalWarning = await detectFacebookWarningOrBlock(page, dialog);
    if (finalWarning) {
      const warnErr = new Error(`[FACEBOOK_WARNING_BLOCKED] ${finalWarning}`);
      warnErr.isWarningBlocked = true;
      throw warnErr;
    }
    throw new Error(`Hết thời gian chờ đăng bài lên nhóm ${groupUrl} (Hộp thoại đăng bài không đóng sau 45s).`);
  }

  await delay(5000);
  const postUrl = await extractLatestPostUrl(page, groupUrl);
  console.log(`[Group Post] Hoàn thành đăng nhóm: ${groupUrl} (Link: ${postUrl})`);
  return { success: true, joinStatus: joinResult.status, postUrl };
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

  const rawConfig = loadConfig();
  const config = resolveRotationAndQuarantine(rawConfig);
  const now = Date.now();
  const activeGroupToday = config.rotation?.activeGroupToday || 'group_1';
  const rotationEnabled = config.rotation?.enabled !== false;

  console.log(`[Group Server] 🛡️ [HỆ THỐNG 3 NHÓM LÁCH BAN FACEBOOK]`);
  console.log(`[Group Server] 👉 Phiên đăng hôm nay: [${activeGroupToday === 'group_1' ? '🟢 NHÓM 1 (Đội chính)' : '🟡 NHÓM 2 (Đội dự phòng)'}]`);
  console.log(`[Group Server] 👉 Chế độ luân phiên: ${rotationEnabled ? 'Tự động luân phiên mỗi ngày' : 'Thủ công'}`);

  let accountsToRun = (config.accounts || []).filter(acc => {
    // 0. KIỂM TRA CHECKPOINT / YÊU CẦU XÁC THỰC
    if (acc.status === 'checkpoint' || acc.checkpointAt) {
      console.log(`[Group Server] 🛡️ Tài khoản "${acc.name}" ĐANG YÊU CẦU XÁC THỰC CHECKPOINT. Đã đưa ra khỏi danh sách đăng bài nhóm!`);
      return false;
    }

    // 1. Kiểm tra tài khoản bị tắt thủ công
    if (acc.enabled === false && acc.roleGroup !== 'quarantine') {
      console.log(`[Group Server] ⚪ Tài khoản "${acc.name}" đang bị tắt trên Dashboard. Bỏ qua.`);
      return false;
    }

    // 2. KIỂM TRA NHÓM 3 (KHU CÁCH LY 7 NGÀY)
    if (acc.roleGroup === 'quarantine' || (acc.quarantineUntil && new Date(acc.quarantineUntil).getTime() > now)) {
      const qTime = new Date(acc.quarantineUntil || acc.cooldownUntil).getTime();
      const remainMs = Math.max(0, qTime - now);
      const remainDays = Math.floor(remainMs / (24 * 3600 * 1000));
      const remainHours = Math.ceil((remainMs % (24 * 3600 * 1000)) / (3600 * 1000));
      const timeStr = remainDays > 0 ? `${remainDays} ngày ${remainHours} giờ` : `${remainHours} giờ`;
      console.log(`[Group Server] 🔴 Tài khoản "${acc.name}" ĐANG TRONG KHU CÁCH LY 7 NGÀY (Nhóm 3). Còn ~${timeStr} (đến ${new Date(qTime).toLocaleString('vi-VN')}). TUYỆT ĐỐI BỎ QUA để bảo vệ an toàn nick!`);
      return false;
    }

    // 3. KIỂM TRA LUÂN PHIÊN NHÓM 1 & NHÓM 2
    if (rotationEnabled && !targetAccounts) {
      const accRole = acc.roleGroup || 'group_1';
      if (accRole !== activeGroupToday) {
        console.log(`[Group Server] 🛌 Tài khoản "${acc.name}" thuộc [${accRole === 'group_2' ? '🟡 Nhóm 2 (Dự phòng)' : '🟢 Nhóm 1'}] - Đang nghỉ ngơi hôm nay để giữ an toàn nick. Phiên hôm nay là của [${activeGroupToday === 'group_1' ? '🟢 Nhóm 1' : '🟡 Nhóm 2'}].`);
        return false;
      }
    }

    return acc.enabled !== false;
  });

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
    throw new Error(`Không có tài khoản nào thuộc [${activeGroupToday === 'group_1' ? 'Nhóm 1' : 'Nhóm 2'}] sẵn sàng để đăng bài hôm nay (có thể các nick đang trong Khu cách ly 7 ngày hoặc bị tắt). Hãy kiểm tra lại trên Dashboard!`);
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
      console.log(`[Group Server] BẮT ĐẦU TÀI KHOẢN: ${account.name} (${profileDir}) trên CỔNG ${accPort}`);
      console.log(`======================================================`);

      // Mở cửa sổ Chrome độc lập cho tài khoản này trên cổng riêng
      await ensureChromeForAccount(profileDir, accPort);
      browser = await chromium.connectOverCDP(`http://127.0.0.1:${accPort}`);
      const context = browser.contexts()[0];
      if (!context) throw new Error('Không tìm thấy context trình duyệt Chrome');

      let page = context.pages()[0];
      if (!page) {
        page = await context.newPage();
      }
      await page.bringToFront();

      // KIỂM TRA NGAY NẾU TÀI KHOẢN ĐANG DÍNH CHECKPOINT HOẶC CẢNH BÁO TRƯỚC KHI BẮT ĐẦU
      const preCheckWarning = await detectFacebookWarningOrBlock(page);
      if (preCheckWarning) {
        const quarantineDays = config.rotation?.quarantineDays || 7;
        const quarantineDate = new Date(Date.now() + quarantineDays * 24 * 60 * 60 * 1000);
        const quarantineUntil = quarantineDate.toISOString();
        const quarantineText = quarantineDate.toLocaleString('vi-VN');

        console.error(`\n======================================================`);
        console.error(`🚨🚨🚨 [CẢNH BÁO FACEBOOK] Tài khoản "${account.name}" bị checkpoint/khóa!`);
        console.error(`👉 Chi tiết: ${preCheckWarning}`);
        console.error(`👉 HÀNH ĐỘNG BẢO VỆ: CHUYỂN VÀO NHÓM 3 (CÁCH LY 7 NGÀY ĐẾN ${quarantineText})!`);
        console.error(`👉 Đóng băng toàn bộ hoạt động trong 168 giờ để nhả phạt Facebook an toàn.`);
        console.error(`======================================================\n`);

        const isPreCheckpoint = String(preCheckWarning).toLowerCase().includes('checkpoint') ||
          String(preCheckWarning).toLowerCase().includes('người thật') ||
          String(preCheckWarning).toLowerCase().includes('danh tính');

        const targetAccInConfig = (config.accounts || []).find(a => String(a.id) === String(account.id));
        if (targetAccInConfig) {
          if (targetAccInConfig.roleGroup !== 'quarantine') {
            targetAccInConfig.originalRoleGroup = targetAccInConfig.roleGroup || 'group_1';
          }
          targetAccInConfig.roleGroup = 'quarantine';
          targetAccInConfig.enabled = false;
          targetAccInConfig.quarantineUntil = quarantineUntil;
          targetAccInConfig.quarantineReason = preCheckWarning;
          targetAccInConfig.quarantineAt = new Date().toISOString();
          targetAccInConfig.cooldownUntil = quarantineUntil;
          targetAccInConfig.status = isPreCheckpoint ? 'checkpoint' : 'quarantined_7d';
          if (isPreCheckpoint) {
            targetAccInConfig.checkpointReason = preCheckWarning;
            targetAccInConfig.checkpointUrl = 'https://www.facebook.com/checkpoint/';
            targetAccInConfig.checkpointAt = new Date().toISOString();
          }
          targetAccInConfig.disabledReason = `Facebook cảnh báo: ${preCheckWarning}. Cách ly 7 ngày đến ${quarantineText}`;
          targetAccInConfig.disabledAt = new Date().toISOString();
        }
        if (account.roleGroup !== 'quarantine') {
          account.originalRoleGroup = account.roleGroup || 'group_1';
        }
        account.roleGroup = 'quarantine';
        account.enabled = false;
        account.quarantineUntil = quarantineUntil;
        account.quarantineReason = preCheckWarning;
        account.quarantineAt = new Date().toISOString();
        account.cooldownUntil = quarantineUntil;
        account.status = isPreCheckpoint ? 'checkpoint' : 'quarantined_7d';
        if (isPreCheckpoint) {
          account.checkpointReason = preCheckWarning;
          account.checkpointUrl = 'https://www.facebook.com/checkpoint/';
          account.checkpointAt = new Date().toISOString();
        }
        account.disabledReason = `Facebook cảnh báo: ${preCheckWarning}. Cách ly 7 ngày đến ${quarantineText}`;
        account.disabledAt = new Date().toISOString();
        saveConfig(config);

        accResult.accountError = `Đã tự động CHUYỂN VÀO NHÓM 3 (Cách ly 7 ngày đến ${quarantineText}): ${preCheckWarning}`;
        logPostActivity({
          type: 'post',
          channel: 'groups',
          channelName: 'Facebook Groups',
          targetName: account.name,
          targetUrl: 'N/A',
          status: 'failed',
          caption: postCaption,
          error: `[CÁCH LY 7 NGÀY] ${preCheckWarning}`,
          durationMs: 0,
        });
        results.push(accResult);
        continue; // Chuyển sang tài khoản tiếp theo ngay lập tức
      }

      for (const groupUrl of targetGroupList) {
        const postStartTime = Date.now();
        try {
          const singleRes = await postToSingleGroup(page, groupUrl, postCaption, finalImageBase64);
          accResult.groups.push({ groupUrl, postUrl: singleRes?.postUrl || groupUrl, status: 'success', timestamp: new Date().toISOString() });
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
          const isWarningBlocked =
            groupError.isWarningBlocked ||
            groupError.message.includes('FACEBOOK_WARNING_BLOCKED') ||
            groupError.message.includes('bảo vệ cộng đồng') ||
            groupError.message.includes('giới hạn tần suất') ||
            groupError.message.includes('checkpoint') ||
            groupError.message.includes('Checkpoint') ||
            groupError.message.includes('tạm thời bị chặn');

          console.error(`[Group Server Error] Lỗi đăng nhóm ${groupUrl}:`, groupError.message);
          accResult.groups.push({ groupUrl, status: isWarningBlocked ? 'warning_blocked' : 'error', error: groupError.message });
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

          if (isWarningBlocked) {
            const quarantineDays = config.rotation?.quarantineDays || 7;
            const quarantineDate = new Date(Date.now() + quarantineDays * 24 * 60 * 60 * 1000);
            const quarantineUntil = quarantineDate.toISOString();
            const quarantineText = quarantineDate.toLocaleString('vi-VN');

            console.error(`\n======================================================`);
            console.error(`🚨🚨🚨 PHÁT HIỆN TÀI KHOẢN "${account.name}" BỊ FACEBOOK CẢNH BÁO! 🚨🚨🚨`);
            console.error(`👉 Chi tiết: ${groupError.message}`);
            console.error(`👉 HÀNH ĐỘNG BẢO VỆ: CHUYỂN VÀO NHÓM 3 (CÁCH LY 7 NGÀY ĐẾN ${quarantineText})!`);
            console.error(`👉 Tự động bảo lưu nhóm gốc, đóng băng nick trong 168 giờ để nhả phạt.`);
            console.error(`👉 DỪNG NGAY TẤT CẢ CÁC NHÓM CÒN LẠI ĐỂ TRÁNH BAY NICK!`);
            console.error(`======================================================\n`);

            const isPostCheckpoint = String(groupError.message).toLowerCase().includes('checkpoint') ||
              String(groupError.message).toLowerCase().includes('người thật') ||
              String(groupError.message).toLowerCase().includes('danh tính');

            const targetAccInConfig = (config.accounts || []).find(a => String(a.id) === String(account.id));
            if (targetAccInConfig) {
              if (targetAccInConfig.roleGroup !== 'quarantine') {
                targetAccInConfig.originalRoleGroup = targetAccInConfig.roleGroup || 'group_1';
              }
              targetAccInConfig.roleGroup = 'quarantine';
              targetAccInConfig.enabled = false;
              targetAccInConfig.quarantineUntil = quarantineUntil;
              targetAccInConfig.quarantineReason = groupError.message;
              targetAccInConfig.quarantineAt = new Date().toISOString();
              targetAccInConfig.cooldownUntil = quarantineUntil;
              targetAccInConfig.status = isPostCheckpoint ? 'checkpoint' : 'quarantined_7d';
              if (isPostCheckpoint) {
                targetAccInConfig.checkpointReason = groupError.message;
                targetAccInConfig.checkpointUrl = 'https://www.facebook.com/checkpoint/';
                targetAccInConfig.checkpointAt = new Date().toISOString();
              }
              targetAccInConfig.disabledReason = `Facebook cảnh báo: ${groupError.message}. Cách ly 7 ngày đến ${quarantineText}`;
              targetAccInConfig.disabledAt = new Date().toISOString();
            }
            if (account.roleGroup !== 'quarantine') {
              account.originalRoleGroup = account.roleGroup || 'group_1';
            }
            account.roleGroup = 'quarantine';
            account.enabled = false;
            account.quarantineUntil = quarantineUntil;
            account.quarantineReason = groupError.message;
            account.quarantineAt = new Date().toISOString();
            account.cooldownUntil = quarantineUntil;
            account.status = isPostCheckpoint ? 'checkpoint' : 'quarantined_7d';
            if (isPostCheckpoint) {
              account.checkpointReason = groupError.message;
              account.checkpointUrl = 'https://www.facebook.com/checkpoint/';
              account.checkpointAt = new Date().toISOString();
            }
            account.disabledReason = `Facebook cảnh báo: ${groupError.message}. Cách ly 7 ngày đến ${quarantineText}`;
            account.disabledAt = new Date().toISOString();
            saveConfig(config);

            accResult.accountError = `Tài khoản đã TỰ ĐỘNG CHUYỂN VÀO NHÓM 3 (Cách ly 7 ngày đến ${quarantineText}): ${groupError.message}`;
            break; // DỪNG TOÀN BỘ CÁC NHÓM TIẾP THEO CỦA NICK NÀY NGAY!
          }
        }
        await delay(3000);
      }

    } catch (accError) {
      console.error(`[Group Server Error] Lỗi xử lý tài khoản ${account.name}:`, accError.message);
      accResult.accountError = accError.message;
    } finally {
      console.log(`[Group Server] Tác vụ tài khoản ${account.name} hoàn tất. Tiến hành tắt trình duyệt Chrome (Port ${accPort})...`);
      await closeChromeGracefully(browser, accPort);
      await delay(1500);
    }

    results.push(accResult);
  }

  // Tự động lưu lại vị trí nhóm vừa đăng vào groups-config.json
  saveConfig(config);

  console.log(`[Group Server] Đã hoàn thành toàn bộ lượt đăng bài vào nhóm.`);
  const allPostUrls = results.flatMap(r => (r.groups || []).filter(g => g.status === 'success' && g.postUrl).map(g => g.postUrl));
  return {
    ok: true,
    totalAccounts: accountsToRun.length,
    postUrls: allPostUrls,
    postUrl: allPostUrls[0] || null,
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

  let page = context.pages().find((candidate) => candidate.url().includes('chatgpt.com'));
  if (!page) {
    page = await context.newPage();
  }
  // Luôn điều hướng về https://chatgpt.com/ để bắt đầu phiên chat mới, dọn sạch ảnh cũ trong DOM
  console.log(`[Group ChatGPT] Điều hướng về https://chatgpt.com/ để bắt đầu phiên tạo ảnh mới (loại bỏ hoàn toàn ảnh cũ)...`);
  await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await delay(3000);
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

async function waitForGeneratedImageGpt(page, initialSrcs = new Set(), waitStartTime = Date.now()) {
  const deadline = Date.now() + 360000; // timeout 6 phút
  let hasStarted = false;

  while (Date.now() < deadline) {
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const stopBtn = page.locator('button[aria-label*="Stop"], button[data-testid*="stop"]').first();
    const isStreaming = (await stopBtn.count().catch(() => 0)) && (await stopBtn.isVisible().catch(() => false));
    const isCreating = bodyText.includes('Creating image') || isStreaming;

    if (isCreating || (Date.now() - waitStartTime > 15000)) {
      hasStarted = true;
    }

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
    if (await image1Btn.count().catch(() => 0) > 0) {
      try { await image1Btn.click({ timeout: 2000 }); } catch {}
    }

    if (!isCreating && hasStarted) {
      const assistantImgs = await page.locator('[data-message-author-role="assistant"] img').evaluateAll((imgs) =>
        imgs
          .map((img) => ({
            src: img.currentSrc || img.src,
            width: img.naturalWidth,
            height: img.naturalHeight,
          }))
          .filter(({ src, width, height }) => src && width >= 256 && height >= 256 && !src.includes('avatar') && !src.includes('profile'))
          .map(({ src }) => src),
      ).catch(() => []);

      const allSrcs = await imageSourcesGpt(page);
      const newSrcs = allSrcs.filter((s) => !initialSrcs.has(s));
      const candidateSrcs = [...new Set([...assistantImgs.filter((s) => !initialSrcs.has(s)), ...newSrcs])];

      if (candidateSrcs.length > 0) {
        await delay(3000);
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

async function executeGenerateOnAccount(account, { prompt, aspectRatio, referenceImageUrl = 'auto_drive', newConversation = false }) {
  const targetReferenceUrl = resolveReferenceImageUrl(referenceImageUrl);
  const hasDu = targetReferenceUrl !== null;
  const cleanRatio = (aspectRatio === '4:5' || aspectRatio === '4/5' || aspectRatio === '9:16' || aspectRatio === '9/16' || !aspectRatio) ? '16:9' : aspectRatio;

  const { browser, page } = await openChatGptPage(account, { newConversation });
  try {
    const MAX_RETRIES = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      console.log(`[${account.name}] Bắt đầu tạo ảnh Group (Lần thử ${attempt}/${MAX_RETRIES})...`);
      const initialSrcs = new Set(await imageSourcesGpt(page));

      // Upload ảnh tham chiếu Du (khi hasDu = true)
      let attachSuccess = false;
      if (hasDu && targetReferenceUrl) {
        attachSuccess = await attachReferenceImage(page, targetReferenceUrl);
        if (!attachSuccess && attempt === 1) {
          console.warn(`[${account.name}] Đính kèm ảnh lần đầu chưa nhận, chờ 2s và thử lại...`);
          await delay(2000);
          attachSuccess = await attachReferenceImage(page, targetReferenceUrl);
        }
        const afterAttachSrcs = await imageSourcesGpt(page);
        for (const s of afterAttachSrcs) initialSrcs.add(s);

        if (!attachSuccess) {
          console.warn(`[${account.name}] Cảnh báo: Trình duyệt chưa bắt được preview ảnh, nhưng file đã nạp vào composer.`);
        }
      }

      const input = await promptBoxGpt(page);
      let fullPrompt;

      if (hasDu) {
        // CHẾ ĐỘ GIỮ NGUYÊN BỐI CẢNH ẢNH MẪU GOOGLE DRIVE — CHỈ THAY DUY NHẤT CHỮ TRÊN CARD (GỌN GÀNG 16:9)
        const { headline, subheadline } = extractCardTextFromPrompt(prompt);
        console.log(`[Group Server ChatGPT] 🎯 LẤY BỐI CẢNH ẢNH MẪU — BỎ THANH THỐNG KÊ & CARD ĐÁY, CHỈ THAY CHỮ TRÊN CARD (Tỉ lệ ${cleanRatio}):`);
        console.log(`   - Tiêu đề chính: "${headline}"`);
        if (subheadline) console.log(`   - Phụ đề / nội dung: "${subheadline}"`);

        fullPrompt = [
          'Using the uploaded reference image:',
          '1. STRICTLY PRESERVE THE 3D SCENE & MASCOT:',
          '- Keep the exact same 3D background scene, environment, atmosphere, lighting, and colors as shown in the uploaded reference image.',
          '- Keep the exact same 3D mascot character (identical design, outfit, pose, proportions, and placement) from the uploaded reference image.',
          '- Keep the main translucent card/panel style, position, and layout.',
          '- Do NOT change the background setting. Do NOT change the character or clothing.',
          '',
          '2. CLEAN & COMPACT COMPOSITION (MANDATORY):',
          '- DO NOT generate any top statistics banner (NO "100+ dự án", NO "98% hài lòng", NO top stats bar).',
          '- DO NOT generate any bottom row of feature cards below the main panel.',
          '- Keep the overall composition clean, neat, uncluttered, and perfectly balanced in 16:9 landscape aspect ratio.',
          '',
          '3. YOUR ONLY TASK IS TO REPLACE THE TEXT ON THE MAIN CARD:',
          'Replace the text inside the main card with this new Vietnamese content:',
          `- TIÊU ĐỀ: "${headline}"`,
          subheadline ? `- NỘI DUNG: "${subheadline}"` : '',
          '',
          '4. TEXT ACCURACY REQUIREMENTS:',
          '- Render the text cleanly inside the card with 100% correct Vietnamese spelling, standard diacritics, and elegant typography matching the original card style.',
          '- Keep the DUDI Software brand logo.',
          '',
          'Preferred aspect ratio: ' + cleanRatio + '.',
          'Do not explain. Generate the image now.',
        ].filter(Boolean).join('\n');
      } else {
        fullPrompt = [
          'Generate one high-quality, professional commercial image matching the following description:',
          prompt.trim(),
          'Preferred aspect ratio: ' + cleanRatio + '.',
          'Do not explain. Generate the image now.',
        ].filter(Boolean).join('\n\n');
      }

      await input.fill(fullPrompt);
      await input.press('Enter');
      console.log(`[${account.name}] Đã gửi prompt lần ${attempt}. Đang theo dõi tiến trình...`);
      const promptSentAt = Date.now();
      await delay(5000);

      try {
        const image = await waitForGeneratedImageGpt(page, initialSrcs, promptSentAt);
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

        // Nếu là lỗi fatal không thể thử lại trên cùng tài khoản (hết token, limit, mất kết nối Chrome, không tìm thấy ô chat...) thì thoát ngay để chuyển sang tài khoản khác
        const isFatalError =
          err.message.includes('Quota Exceeded') ||
          err.message.includes('Rate limit') ||
          err.message.includes('đã hết token') ||
          err.message.includes('limit') ||
          err.message.includes('prompt box was not found') ||
          err.message.includes('Không tìm thấy ô chat prompt') ||
          err.message.includes('signed in') ||
          err.message.includes('Target closed') ||
          err.message.includes('has been closed') ||
          err.message.includes('Session closed') ||
          err.message.includes('browser has disconnected') ||
          err.message.includes('ECONNREFUSED');

        if (isFatalError) {
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
    console.log(`[Group Server] Hoàn tất tác vụ ảnh cho ${account.name}. Đang đóng tab và tắt Chrome hoàn toàn (Port ${account.port})...`);
    try { await page.close(); } catch {}
    await closeChromeGracefully(browser, account.port);
  }
}

async function generateGroupImage(params) {
  const { account: requestedAccount, prompt, aspectRatio, referenceImageUrl = 'auto_drive', newConversation = false } = params;
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

  // Danh sách các tài khoản sẽ thử: ưu tiên primaryAccount, sau đó lần lượt là các tài khoản còn lại
  const accountsToTry = [
    primaryAccount,
    ...enabledAccounts.filter((a) => String(a.id) !== String(primaryAccount.id)),
  ];

  let lastError = null;
  for (let i = 0; i < accountsToTry.length; i++) {
    const acc = accountsToTry[i];
    if (i > 0) {
      console.warn(`[Group Server 3002] Tài khoản trước đó gặp lỗi (${lastError?.message || 'Không xác định'}). Tự động chuyển sang tài khoản: ${acc.name} (Port ${acc.port})...`);
    } else {
      console.log(`[Group Server 3002] Đang tạo ảnh bằng: ${acc.name} (Port ${acc.port})...`);
    }

    try {
      return await executeGenerateOnAccount(acc, { prompt, aspectRatio, referenceImageUrl, newConversation });
    } catch (err) {
      lastError = err;
      console.error(`[Group Server 3002] Tài khoản ${acc.name} (Port ${acc.port}) gặp lỗi:`, err.message);
      // Bất kể lỗi gì (limit, kết nối, lỗi mạng, lỗi giao diện,...) đều chuyển sang tài khoản tiếp theo
    }
  }

  throw new Error(`Tất cả ${accountsToTry.length} tài khoản ChatGPT đều thất bại. Chi tiết lỗi cuối cùng: ${lastError?.message || 'Không tạo được ảnh'}`);
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

// Endpoint lấy thông tin 3 nhóm luân phiên & cách ly
app.get('/rotation-status', (_req, res) => {
  const rawConfig = loadConfig();
  const config = resolveRotationAndQuarantine(rawConfig);

  const group1 = (config.accounts || []).filter(a => (a.roleGroup || 'group_1') === 'group_1');
  const group2 = (config.accounts || []).filter(a => a.roleGroup === 'group_2');
  const quarantine = (config.accounts || []).filter(a => a.roleGroup === 'quarantine');

  res.json({
    ok: true,
    rotation: config.rotation,
    group1,
    group2,
    quarantine,
  });
});

// Endpoint chuyển đổi nhóm đang đăng hôm nay (group_1 <-> group_2)
app.post('/switch-active-group', (req, res) => {
  const { targetGroup } = req.body || {};
  const rawConfig = loadConfig();
  const config = resolveRotationAndQuarantine(rawConfig);

  if (!config.rotation) {
    config.rotation = { enabled: true, mode: 'daily_alternate', activeGroupToday: 'group_1', quarantineDays: 7 };
  }

  const current = config.rotation.activeGroupToday || 'group_1';
  const newActive = targetGroup === 'group_2' ? 'group_2' : (targetGroup === 'group_1' ? 'group_1' : (current === 'group_1' ? 'group_2' : 'group_1'));
  config.rotation.activeGroupToday = newActive;
  saveConfig(config);

  console.log(`[Group Server] 🔄 Đã chuyển phiên đăng bài hôm nay thành: [${newActive === 'group_1' ? 'Nhóm 1' : 'Nhóm 2'}]`);
  res.json({ ok: true, activeGroupToday: newActive, message: `Đã chuyển phiên đăng hôm nay sang ${newActive === 'group_1' ? 'Nhóm 1' : 'Nhóm 2'}` });
});

// Endpoint gán nhóm thủ công cho tài khoản (group_1 | group_2 | quarantine)
app.post('/set-account-group', (req, res) => {
  const { accountId, roleGroup } = req.body || {};
  if (!accountId || !roleGroup || !['group_1', 'group_2', 'quarantine'].includes(roleGroup)) {
    return res.status(400).json({ ok: false, error: 'accountId và roleGroup (group_1 | group_2 | quarantine) không hợp lệ' });
  }

  const rawConfig = loadConfig();
  const config = resolveRotationAndQuarantine(rawConfig);
  const acc = (config.accounts || []).find(a => String(a.id) === String(accountId));
  if (!acc) return res.status(404).json({ ok: false, error: 'Không tìm thấy tài khoản' });

  if (roleGroup === 'quarantine') {
    const qDays = config.rotation?.quarantineDays || 7;
    acc.originalRoleGroup = acc.roleGroup === 'quarantine' ? (acc.originalRoleGroup || 'group_1') : (acc.roleGroup || 'group_1');
    acc.roleGroup = 'quarantine';
    acc.quarantineUntil = new Date(Date.now() + qDays * 24 * 3600 * 1000).toISOString();
    acc.quarantineReason = 'Chuyển vào khu cách ly thủ công từ Dashboard';
    acc.quarantineAt = new Date().toISOString();
    acc.cooldownUntil = acc.quarantineUntil;
    acc.status = 'quarantined_7d';
    acc.enabled = false;
  } else {
    acc.roleGroup = roleGroup;
    acc.originalRoleGroup = roleGroup;
    acc.status = 'active';
    acc.enabled = true;
    delete acc.quarantineUntil;
    delete acc.quarantineReason;
    delete acc.quarantineAt;
    delete acc.cooldownUntil;
    delete acc.disabledReason;
    delete acc.disabledAt;
  }

  saveConfig(config);
  res.json({ ok: true, account: acc, message: `Đã chuyển tài khoản "${acc.name}" vào ${roleGroup === 'group_1' ? 'Nhóm 1' : roleGroup === 'group_2' ? 'Nhóm 2' : 'Nhóm 3 (Cách ly 7 ngày)'}` });
});

// Endpoint mở khóa cách ly sớm
app.post('/release-quarantine', (req, res) => {
  const { accountId } = req.body || {};
  const rawConfig = loadConfig();
  const config = resolveRotationAndQuarantine(rawConfig);
  const acc = (config.accounts || []).find(a => String(a.id) === String(accountId));
  if (!acc) return res.status(404).json({ ok: false, error: 'Không tìm thấy tài khoản' });

  const restored = acc.originalRoleGroup || (acc.id === 'acc_2' ? 'group_2' : 'group_1');
  acc.roleGroup = restored;
  acc.status = 'active';
  acc.enabled = true;
  delete acc.quarantineUntil;
  delete acc.quarantineReason;
  delete acc.quarantineAt;
  delete acc.cooldownUntil;
  delete acc.disabledReason;
  delete acc.disabledAt;

  saveConfig(config);
  res.json({ ok: true, account: acc, message: `Đã mở khóa cách ly sớm cho tài khoản "${acc.name}". Đã phục hồi về ${restored === 'group_1' ? 'Nhóm 1' : 'Nhóm 2'}` });
});

app.listen(port, host, () => {
  console.log(`======================================================`);
  console.log(`  FACEBOOK GROUP POSTING BRIDGE SERVER`);
  console.log(`  Listening on: http://${host}:${port}`);
  console.log(`  Server 2: Facebook Groups Bridge đã sẵn sàng.`);
  console.log(`======================================================`);
});
