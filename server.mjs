import express from 'express';
import { chromium } from 'playwright-core';
import { setTimeout as delay } from 'node:timers/promises';
import { spawn, exec } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import https from 'node:https';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { logPostActivity } from './lib/history-logger.mjs';
import {
  GOOGLE_DRIVE_DU_IDS,
  getNextDriveReferenceUrl,
  resolveReferenceImageUrl,
  extractCardTextFromPrompt,
  fetchImageBuffer,
  attachReferenceImage,
} from './lib/chatgpt-image-helper.mjs';

const host = '127.0.0.1';
const port = 3001;
const chromeDebugUrl = 'http://127.0.0.1:9222';
const app = express();
app.use(express.json({ limit: '20mb' }));

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let activeJob = false;
let activeJobAt = 0;
const JOB_TIMEOUT_MS = 15 * 60 * 1000; // 15 phút auto-reset nếu job bị treo

function assertGenerateRequest(body) {
  if (!['generate_chatgpt_image', 'capture_latest_chatgpt_image', 'publish_facebook_page', 'publish_facebook_personal'].includes(body?.action)) {
    throw new Error('action must be generate_chatgpt_image, capture_latest_chatgpt_image, publish_facebook_page, or publish_facebook_personal');
  }
  if (
    body.action === 'generate_chatgpt_image'
    && (typeof body.prompt !== 'string' || body.prompt.trim().length < 10)
  ) {
    throw new Error('prompt must be a non-empty string');
  }
  if (body.action === 'publish_facebook_page' || body.action === 'publish_facebook_personal') {
    const isPersonal = body.action === 'publish_facebook_personal';
    const allAccounts = isPersonal ? loadPersonalAccounts() : loadFanpageAccounts();
    const enabledAccounts = allAccounts.filter((a) => a.enabled !== false);
    if (enabledAccounts.length === 0 && !body.pageUrl && !body.profileUrl) {
      throw new Error(`Chưa có tài khoản Facebook ${isPersonal ? 'Cá nhân' : 'Fanpage'} nào được bật trên Dashboard`);
    }

    const captionText = facebookCaption(body.caption);
    if (!captionText) {
      console.error('[Bridge Error] Payload received in publish Facebook:', JSON.stringify({ action: body.action, pageUrl: body.pageUrl || body.profileUrl, caption: body.caption, hasImageBase64: Boolean(body.imageBase64) }));
      throw new Error('caption must be a non-empty string');
    }
    if (typeof body.imageBase64 !== 'string' || body.imageBase64.length < 100) {
      console.error('[Bridge Error] Payload received in publish Facebook:', JSON.stringify({ action: body.action, pageUrl: body.pageUrl || body.profileUrl, hasCaption: Boolean(captionText), imageBase64Length: body.imageBase64?.length }));
      throw new Error('imageBase64 must contain the generated image');
    }
  }
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

function facebookCaption(value) {
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

  return stripMarkdown(result);
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

function resolveConfigFile(filename, exampleFilename) {
  const configsDir = path.join(__dirname, 'configs');
  const targetInConfigs = path.join(configsDir, filename);
  const targetInRoot = path.join(__dirname, filename);

  if (fs.existsSync(targetInConfigs)) return targetInConfigs;
  if (fs.existsSync(targetInRoot)) return targetInRoot;

  // Tự tạo file config từ file mẫu .example nếu chưa tồn tại
  if (!fs.existsSync(configsDir)) {
    try { fs.mkdirSync(configsDir, { recursive: true }); } catch {}
  }
  const exampleInConfigs = path.join(configsDir, exampleFilename);
  const exampleInRoot = path.join(__dirname, exampleFilename);
  const examplePath = fs.existsSync(exampleInConfigs) ? exampleInConfigs : exampleInRoot;

  if (fs.existsSync(examplePath)) {
    try {
      fs.copyFileSync(examplePath, targetInConfigs);
      console.log(`[Config] Đã tạo ${filename} từ file mẫu trong thư mục configs/. Mở Dashboard để cấu hình.`);
    } catch {}
  }
  return targetInConfigs;
}

const CONFIG_CHATGPT_PATH = resolveConfigFile('chatgpt-config.json', 'chatgpt-config.example.json');
const CONFIG_FANPAGE_PATH = resolveConfigFile('fanpage-config.json', 'fanpage-config.example.json');
const CONFIG_PERSONAL_PATH = resolveConfigFile('personal-config.json', 'personal-config.example.json');

function loadPersonalAccounts() {
  try {
    if (fs.existsSync(CONFIG_PERSONAL_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(CONFIG_PERSONAL_PATH, 'utf-8'));
      if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.accounts) && parsed.accounts.length > 0) {
          return parsed.accounts;
        }
      }
    }
  } catch (err) {
    console.error('[Personal Config Error]', err.message);
  }
  return loadFanpageAccounts();
}

function markPersonalAccountCheckpoint(accountId, checkpointUrl) {
  markFanpageAccountCheckpoint(accountId, checkpointUrl);
  try {
    if (fs.existsSync(CONFIG_PERSONAL_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(CONFIG_PERSONAL_PATH, 'utf-8'));
      if (parsed && Array.isArray(parsed.accounts)) {
        let changed = false;
        parsed.accounts = parsed.accounts.map((acc) => {
          if (acc.id === accountId || (!accountId && acc.enabled !== false)) {
            changed = true;
            return {
              ...acc,
              status: 'checkpoint',
              checkpointReason: 'Yêu cầu xác nhận bạn là người thật / danh tính trên Facebook',
              checkpointUrl: checkpointUrl || 'https://www.facebook.com/checkpoint/',
              checkpointAt: new Date().toISOString(),
            };
          }
          return acc;
        });
        if (changed) {
          fs.writeFileSync(CONFIG_PERSONAL_PATH, JSON.stringify(parsed, null, 2), 'utf-8');
          console.log(`[Personal Checkpoint] Đã tự động chuyển tài khoản Trang cá nhân ID ${accountId || 'hiện tại'} vào mục "Acc yêu cầu xác thực".`);
        }
      }
    }
  } catch (err) {
    console.error('[Personal Checkpoint Update Error]', err.message);
  }
}

function loadFanpageAccounts() {
  try {
    if (fs.existsSync(CONFIG_FANPAGE_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(CONFIG_FANPAGE_PATH, 'utf-8'));
      if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.accounts) && parsed.accounts.length > 0) {
          return parsed.accounts;
        }
        if (parsed.pageUrl) {
          return [parsed];
        }
      }
    }
  } catch (err) {
    console.error('[Fanpage Config Error]', err.message);
  }
  return [
    {
      id: 1,
      name: 'Facebook Fanpage Chính',
      pageUrl: 'https://www.facebook.com/',
      profileDir: 'n8n-fb-group-profile-1',
      port: 9223,
      enabled: true,
    },
  ];
}

function markFanpageAccountCheckpoint(accountId, checkpointUrl) {
  try {
    if (fs.existsSync(CONFIG_FANPAGE_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(CONFIG_FANPAGE_PATH, 'utf-8'));
      if (parsed && Array.isArray(parsed.accounts)) {
        let changed = false;
        parsed.accounts = parsed.accounts.map((acc) => {
          if (acc.id === accountId || (!accountId && acc.enabled !== false)) {
            changed = true;
            return {
              ...acc,
              status: 'checkpoint',
              checkpointReason: 'Yêu cầu xác nhận bạn là người thật / danh tính trên Facebook',
              checkpointUrl: checkpointUrl || 'https://www.facebook.com/checkpoint/',
              checkpointAt: new Date().toISOString(),
            };
          }
          return acc;
        });
        if (changed) {
          fs.writeFileSync(CONFIG_FANPAGE_PATH, JSON.stringify(parsed, null, 2), 'utf-8');
          console.log(`[Fanpage Checkpoint] Đã tự động chuyển tài khoản Fanpage ID ${accountId || 'hiện tại'} vào mục "Acc yêu cầu xác thực".`);
        }
      }
    }
  } catch (err) {
    console.error('[Fanpage Checkpoint Update Error]', err.message);
  }
}

function loadFanpageConfig() {
  const accounts = loadFanpageAccounts();
  const eligible = accounts.filter((a) => a.status !== 'checkpoint' && !a.checkpointAt);
  return eligible.find((a) => a.enabled !== false) || eligible[0] || null;
}

function loadChatGptAccounts() {
  try {
    if (fs.existsSync(CONFIG_CHATGPT_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(CONFIG_CHATGPT_PATH, 'utf-8'));
      if (Array.isArray(parsed.accounts) && parsed.accounts.length > 0) {
        return parsed.accounts;
      }
    }
  } catch (err) {
    console.error('[ChatGPT Config] Không thể đọc chatgpt-config.json:', err.message);
  }
  return [
    { id: 1, name: 'ChatGPT Tài khoản 1', profileDir: 'n8n-chatgpt-profile', port: 9222, enabled: true },
    { id: 2, name: 'ChatGPT Tài khoản 2', profileDir: 'n8n-chatgpt-profile-2', port: 9242, enabled: true },
  ];
}

let currentGptAccountIndex = 0; // Luân phiên xen kẽ lần lượt qua tất cả các tài khoản

/** Kiểm tra Chrome có đang chạy trên cổng targetPort không. */
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

/** Tự động bật Chrome cho tài khoản ChatGPT / Fanpage tương ứng nếu chưa chạy. */
async function ensureChromeForGpt(account, defaultUrl = 'https://chatgpt.com/') {
  const targetPort = account.port;
  if (await isPortReady(targetPort)) return `http://127.0.0.1:${targetPort}`;

  const chromePath = getChromeExecutable();
  const profilePath = path.join(os.homedir(), 'AppData', 'Local', account.profileDir);
  console.log(`[Chrome] Khởi động Chrome cho ${account.name} (Profile: ${account.profileDir}) trên cổng ${targetPort}...`);

  spawn(
    chromePath,
    [
      '--remote-debugging-address=127.0.0.1',
      `--remote-debugging-port=${targetPort}`,
      `--user-data-dir=${profilePath}`,
      '--start-maximized',
      defaultUrl,
    ],
    { detached: true, stdio: 'ignore' },
  ).unref();

  // Chờ tối đa 30 giây cho Chrome sẵn sàng
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    await delay(1500);
    if (await isPortReady(targetPort)) {
      console.log(`[Chrome] Cửa sổ Chrome ${account.name} đã sẵn sàng trên cổng ${targetPort}. Chờ 5s load...`);
      await delay(5000);
      return `http://127.0.0.1:${targetPort}`;
    }
  }
  throw new Error(`Chrome không khởi động được trên cổng ${targetPort} cho ${account.name}. Hãy kiểm tra xem tài khoản đã được thiết lập chưa.`);
}

async function openChatGptPage(account, { newConversation = true } = {}) {
  const cdpUrl = await ensureChromeForGpt(account);
  const browser = await chromium.connectOverCDP(cdpUrl);
  const context = browser.contexts()[0];
  if (!context) throw new Error('Chrome has no browser context');

  let page = context.pages().find((candidate) => candidate.url().includes('chatgpt.com'));
  if (!page) {
    page = await context.newPage();
  }

  console.log(`[ChatGPT] Điều hướng về https://chatgpt.com/ và mở phiên chat mới sạch sẽ 100%...`);
  await page.bringToFront();
  await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await delay(2000);

  // Bấm nút "New chat" nếu đang có phiên chat cũ để xóa sạch DOM tin nhắn & ảnh cũ
  const newChatSelectors = [
    'a[data-testid="create-new-chat-button"]',
    'button[data-testid="create-new-chat-button"]',
    'a[href="/"]',
    'button[aria-label*="New chat" i]',
    'button[aria-label*="Đoạn chat mới" i]',
    'button[aria-label*="Cuộc trò chuyện mới" i]',
  ];
  for (const selector of newChatSelectors) {
    try {
      const btn = page.locator(selector).first();
      if (await btn.count() && await btn.isVisible()) {
        await btn.click({ timeout: 2000 });
        console.log(`[ChatGPT] Đã bấm nút "New chat" để tạo phiên trò chuyện mới.`);
        await delay(1500);
        break;
      }
    } catch {}
  }

  if (page.url().includes('/c/')) {
    await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await delay(2000);
  }

  await dismissAllPopups(page, 'chatgpt');
  return { browser, page };
}

async function openFacebookPage(account, pageUrl) {
  const targetUrl = pageUrl || account?.pageUrl || 'https://www.facebook.com/';
  const fbAccount = {
    name: account?.name || 'Facebook Fanpage',
    profileDir: account?.profileDir || 'n8n-fb-group-profile-1',
    port: account?.port || 9223,
    pageUrl: targetUrl,
  };
  const cdpUrl = await ensureChromeForGpt(fbAccount, targetUrl);
  let browser;
  try {
    browser = await chromium.connectOverCDP(cdpUrl);
  } catch {
    throw new Error(`Chrome không sẵn sàng trên cổng ${fbAccount.port} cho ${fbAccount.name}. Hãy chắc chắn Chrome đang mở và đã đăng nhập Facebook.`);
  }
  const context = browser.contexts()[0];
  if (!context) throw new Error('Chrome has no browser context');

  // Tìm tab Facebook hoặc tạo mới
  let page = context.pages().find((candidate) => candidate.url().includes('facebook.com'));
  if (!page) {
    page = await context.newPage();
  }

  // Luôn điều hướng trực tiếp đến đúng URL Fanpage cấu hình từ Dashboard
  console.log(`[Fanpage Bridge] [${fbAccount.name}] Đang truy cập thẳng vào link Fanpage: ${targetUrl}`);
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await delay(3000);

  await page.bringToFront();
  if (page.url().includes('/login')) {
    throw new Error(`Tài khoản ${fbAccount.name} chưa đăng nhập Facebook trên profile ${fbAccount.profileDir}.`);
  }

  const currentUrl = page.url();
  let isCheckpoint = currentUrl.includes('/checkpoint') || currentUrl.includes('login.php?next=checkpoint');
  if (!isCheckpoint) {
    try {
      const pageText = await page.evaluate(() => (document.body ? document.body.innerText.slice(0, 3000) : '')).catch(() => '');
      if (
        pageText.includes('xác nhận bạn là người thật') ||
        pageText.includes('hãy xác nhận bạn là người thật') ||
        pageText.includes('để sử dụng trang cá nhân của mình') ||
        pageText.includes('confirm your identity') ||
        pageText.includes('xác minh danh tính')
      ) {
        isCheckpoint = true;
      }
    } catch {}
  }

  if (isCheckpoint) {
    markFanpageAccountCheckpoint(account?.id, currentUrl);
    throw new Error(`Tài khoản [${fbAccount.name}] bị Facebook yêu cầu xác thực / Checkpoint ("Xác nhận bạn là người thật"). Đã tự động chuyển vào mục "Acc yêu cầu xác thực" trên Dashboard và loại khỏi danh sách đăng bài.`);
  }

  await dismissAllPopups(page, 'facebook');
  return { browser, page };
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
  throw new Error('Facebook composer was not found. Open the Page once in Chrome and ensure this account can create posts.');
}

/**
 * Tự động quét và tắt sạch mọi popup phiền hà (thông báo, chat tabs, cookie, tour, dialog)
 * trước khi thực hiện chức năng chính.
 */
async function dismissAllPopups(page, service = 'facebook') {
  if (!page) return;
  try {
    // 0. Luôn tự động xử lý native dialog (alert / confirm / beforeunload "Rời khỏi trang")
    page.on('dialog', async (dialog) => {
      try {
        console.log(`[Popup Cleaner] Tự động chấp nhận dialog: "${dialog.message()}"`);
        await dialog.accept();
      } catch {}
    });

    if (service === 'facebook') {
      // 1. Tắt các cửa sổ chat Messenger thu nhỏ đang mở đè dưới góc phải
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

      // 2. Bấm tắt các nút từ chối / bỏ qua popup thông báo, lưu mật khẩu, nhắc nhở:
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
            if (btnText.includes('Đăng') || btnText.includes('Post') || btnText.includes('Tạo bài')) continue;
            await btn.click({ force: true });
            console.log(`[Popup Cleaner] Đã bấm nút tắt popup Facebook: "${text}"`);
            await delay(500);
          }
        } catch {}
      }

      // 3. Tắt các nút X (close icon) trên các dialog popup không mong muốn (ngoại trừ dialog "Tạo bài viết")
      try {
        const dialogs = page.locator('[role="dialog"]');
        const dCount = await dialogs.count();
        for (let d = 0; d < dCount; d++) {
          const currentDialog = dialogs.nth(d);
          const ariaLabel = (await currentDialog.getAttribute('aria-label')) || '';
          if (ariaLabel.includes('Tạo bài viết') || ariaLabel.includes('Create post')) {
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
 * Xử lý popup Call-to-Action của Facebook ("Chat trực tiếp với khách hàng" / "Trò chuyện trực tiếp").
 * Ưu tiên bấm "Thêm nút" nếu có, fallback sang "Lúc khác" hoặc nút X nếu không có.
 */
async function handleFacebookCtaPopup(page) {
  try {
    // 1. Ưu tiên bấm nút "Thêm nút" (hoặc "Add button" / "Add CTA")
    const addBtn = page.getByRole('button', { name: /^(Thêm nút|Thêm nút gửi tin nhắn|Thêm|Add button|Add CTA)$/i });
    if (await addBtn.count() && await addBtn.first().isVisible()) {
      await addBtn.first().click();
      console.log('Đã bấm "Thêm nút" (Gửi tin nhắn) trên popup Facebook.');
      await delay(2000);
      return true;
    }
    const addBtnLocator = page.locator('[role="dialog"] [role="button"]:has-text("Thêm nút"), [role="button"]:has-text("Thêm nút")').first();
    if (await addBtnLocator.count() && await addBtnLocator.isVisible()) {
      await addBtnLocator.click();
      console.log('Đã bấm "Thêm nút" (Gửi tin nhắn) trên popup Facebook (locator).');
      await delay(2000);
      return true;
    }

    // 2. Fallback: Nếu không có nút "Thêm nút" -> bấm "Lúc khác"
    const laterBtn = page.getByRole('button', { name: /Lúc khác|Not Now|Later|Skip/i });
    if (await laterBtn.count() && await laterBtn.first().isVisible()) {
      await laterBtn.first().click();
      console.log('Đã bấm "Lúc khác" để bỏ qua popup Facebook.');
      await delay(1000);
      return true;
    }

    // 3. Fallback cuối: bấm nút X đóng dialog
    const closeBtn = page.locator('[aria-label="Close"], [aria-label="Đóng"], [role="button"][aria-label*="close" i]').first();
    if (await closeBtn.count() && await closeBtn.isVisible()) {
      await closeBtn.click();
      console.log('Đã đóng popup Facebook bằng nút X.');
      await delay(1000);
      return true;
    }
  } catch {
    // Popup không xuất hiện hoặc đã tự đóng — bỏ qua
  }
  return false;
}

async function clickDialogActionButton(page) {
  // 1. Thử click nút "Thêm nút" (Gửi tin nhắn)
  const addBtn = page.getByRole('button', { name: /^(Thêm nút|Thêm nút gửi tin nhắn|Thêm|Add button)$/i }).last();
  if (await addBtn.count() && await addBtn.isVisible()) {
    try {
      await addBtn.click({ force: true });
      console.log('Đã bấm nút "Thêm nút" trên popup.');
      await delay(2000);
      return 'add_btn';
    } catch {}
  }

  // 2. Thử click nút "Tiếp" (Next)
  const nextExact = page.getByRole('button', { name: /^(Tiếp|Next)$/i }).last();
  if (await nextExact.count() && await nextExact.isVisible()) {
    try {
      await nextExact.click({ force: true });
      console.log('Đã bấm nút "Tiếp" (Next).');
      await delay(2500);
      return 'next';
    } catch {}
  }

  const nextAria = page.locator('[role="dialog"] div[aria-label="Tiếp"], [role="dialog"] div[aria-label="Next"], [role="dialog"] [role="button"][aria-label="Tiếp"], [role="dialog"] [role="button"][aria-label="Next"]').last();
  if (await nextAria.count() && await nextAria.isVisible()) {
    try {
      await nextAria.click({ force: true });
      console.log('Đã bấm nút "Tiếp" qua aria-label.');
      await delay(2500);
      return 'next';
    } catch {}
  }

  // 3. Thử click nút "Đăng" (Post/Publish)
  const postExact = page.getByRole('button', { name: /^(Đăng|Post|Publish)$/i }).last();
  if (await postExact.count() && await postExact.isVisible()) {
    try {
      await postExact.click({ force: true });
      console.log('Đã bấm nút "Đăng" (Publish).');
      await delay(2500);
      return 'post';
    } catch {}
  }

  const postAria = page.locator('[role="dialog"] div[aria-label="Đăng"], [role="dialog"] div[aria-label="Post"], [role="dialog"] [role="button"][aria-label="Đăng"], [role="dialog"] [role="button"][aria-label="Post"]').last();
  if (await postAria.count() && await postAria.isVisible()) {
    try {
      await postAria.click({ force: true });
      console.log('Đã bấm nút "Đăng" qua aria-label.');
      await delay(2500);
      return 'post';
    } catch {}
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
    console.warn('[Facebook] Không thể trích xuất link bài viết:', err.message);
  }
  return fallbackUrl;
}

async function publishSingleFacebookPage(account, { caption, imageBase64, mimeType = 'image/png', fileName = 'image.png' }) {
  const targetPageUrl = (account?.profileUrl && typeof account.profileUrl === 'string' && account.profileUrl.startsWith('https://www.facebook.com/'))
    ? account.profileUrl.trim()
    : ((account?.pageUrl && typeof account.pageUrl === 'string' && account.pageUrl.startsWith('https://www.facebook.com/'))
      ? account.pageUrl.trim()
      : 'https://www.facebook.com/');
  console.log(`[Facebook Bridge 3001] Đang xuất bản bài viết lên: "${account.name}" (${targetPageUrl}) trên cổng ${account.port}...`);
  const { browser, page } = await openFacebookPage(account, targetPageUrl);
  try {
    await dismissAllPopups(page, 'facebook');
    await handleFacebookCtaPopup(page);

    const postCaption = facebookCaption(caption);
    const dialogSelectors = [
      '[role="dialog"][aria-label="Tạo bài viết"]',
      '[role="dialog"][aria-label="Create post"]',
    ];
    let dialog = page.locator(dialogSelectors.join(',')).first();
    if (!(await dialog.count()) || !(await dialog.isVisible())) {
      const createPost = await firstVisible(page, [
        '[role="button"][aria-label*="What’s on your mind"]',
        '[role="button"][aria-label*="What\'s on your mind"]',
        '[role="button"][aria-label*="Bạn đang nghĩ gì"]',
        '[role="button"]:has-text("Create post")',
        '[role="button"]:has-text("Tạo bài viết")',
        '[role="button"]:has-text("Bạn đang nghĩ gì")',
        '[role="button"]:has-text("Chia sẻ suy nghĩ")',
      ]);
      await createPost.click({ force: true });
      dialog = await firstVisible(page, dialogSelectors);
    }
    // 1. Nhập nội dung bài viết
    const composerSelectors = [
      '[role="dialog"] div[role="textbox"]',
      '[role="dialog"] div[contenteditable="true"]',
      '[role="dialog"] [data-lexical-editor="true"]',
      '[role="dialog"] [data-editor="true"]',
      '[role="dialog"] [aria-label*="nghĩ gì" i]',
      '[role="dialog"] [aria-label*="mind" i]',
      '[role="dialog"] [aria-placeholder*="nghĩ gì" i]',
      'div[role="dialog"] div[contenteditable="true"]',
      'div[role="textbox"][contenteditable="true"]',
      '[contenteditable="true"][data-lexical-editor="true"]',
      '[contenteditable="true"][aria-label*="nghĩ gì" i]',
      '[contenteditable="true"]',
    ];

    let composer = null;
    const composerDeadline = Date.now() + 15000;
    while (Date.now() < composerDeadline) {
      for (const sel of composerSelectors) {
        const loc = page.locator(sel).last();
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
      const anyEditable = page.locator('[role="dialog"] [contenteditable]').first();
      if (await anyEditable.count()) {
        composer = anyEditable;
      }
    }

    if (!composer) {
      throw new Error(`Không tìm thấy ô nhập nội dung bài viết trên Fanpage "${account.name}".`);
    }

    await composer.click({ force: true });
    await delay(500 + Math.floor(Math.random() * 500));
    await composer.fill(postCaption);
    await delay(800 + Math.floor(Math.random() * 600));

    let uploads = page.locator('[role="dialog"] input[type="file"][accept*="image"], input[type="file"][accept*="image"]');
    if (!(await uploads.count())) {
      const addPhotoBtn = page.locator('[role="dialog"] [aria-label*="Ảnh/video" i], [role="dialog"] [aria-label*="Photo/video" i], [role="dialog"] [aria-label*="Ảnh" i], [role="dialog"] div[aria-label*="Photo" i], [role="dialog"] [role="button"]:has-text("Ảnh")').first();
      if (await addPhotoBtn.count() && await addPhotoBtn.isVisible()) {
        await addPhotoBtn.click({ force: true });
        await delay(2000);
      }
      uploads = page.locator('[role="dialog"] input[type="file"][accept*="image"], input[type="file"][accept*="image"]');
    }

    if (!(await uploads.count())) {
      throw new Error('Facebook image upload field was not found in the post composer');
    }
    const upload = uploads.last();
    await upload.setInputFiles({
      name: fileName,
      mimeType,
      buffer: Buffer.from(imageBase64, 'base64'),
    });

    await delay(5000);

    let isPublishConfirmed = false;
    let isDialogClosed = false;

    // Tiến hành bấm Tiếp -> (Thêm nút nếu có) -> Đăng
    console.log(`[Fanpage Server 3001] [${account.name}] Bắt đầu quy trình bấm Tiếp và Đăng bài viết...`);
    const publishDeadline = Date.now() + 60000;
    while (Date.now() < publishDeadline) {
      await delay(1500);

      // Kiểm tra xem dialog có còn mở không
      const activeDialog = page.locator('[role="dialog"]').last();
      if (!(await activeDialog.count()) || !(await activeDialog.isVisible())) {
        console.log(`[Fanpage Server 3001] [${account.name}] Hộp thoại Đăng bài đã đóng hoàn toàn (Facebook xuất bản thành công).`);
        isDialogClosed = true;
        break;
      }

      // Kiểm tra nếu Facebook hiện thông báo lỗi trong dialog
      const errorBanner = page.locator('[role="dialog"] [role="alert"], [role="dialog"] [data-testid*="error"]').first();
      if (await errorBanner.count() && await errorBanner.isVisible()) {
        const errText = await errorBanner.innerText().catch(() => '');
        if (errText && (errText.includes('lỗi') || errText.includes('error') || errText.includes('không thể') || errText.includes('failed'))) {
          throw new Error(`Facebook báo lỗi khi đăng bài: ${errText.trim()}`);
        }
      }

      // Bấm nút hành động phù hợp (Tiếp / Thêm nút / Đăng)
      await clickDialogActionButton(page);
    }

    if (!isDialogClosed) {
      throw new Error(`Hết thời gian 60s nhưng hộp thoại đăng bài Fanpage "${account.name}" chưa đóng. Không tắt Chrome vì chưa xác nhận đăng thành công.`);
    }

    // Chờ thêm buffer an toàn để Facebook hoàn tất ghi dữ liệu
    console.log(`[Fanpage Server 3001] [${account.name}] Hộp thoại đã đóng. Chờ thêm 8 giây để Facebook hoàn tất ghi dữ liệu...`);
    await delay(8000);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    const postUrl = await extractLatestPostUrl(page, targetPageUrl);
    isPublishConfirmed = true;
    console.log(`[Fanpage Server 3001] [${account.name}] ✅ ĐÃ XÁC NHẬN BÀI VIẾT ĐĂNG THÀNH CÔNG 100% LÊN FANPAGE! Link: ${postUrl}`);
    return { ok: true, source: 'facebook-web', account: account.name, pageUrl: targetPageUrl, postUrl, publishedAt: new Date().toISOString() };
  } finally {
    console.log(`[Fanpage Server 3001] [${account.name}] Tác vụ đăng bài hoàn tất. Tự động đóng tab và tắt Chrome cổng ${account.port || 9222}...`);
    try {
      for (const ctx of browser.contexts()) {
        for (const p of ctx.pages()) {
          await p.close().catch(() => {});
        }
      }
    } catch {}
    await closeChromeGracefully(browser, account.port || 9222);
  }
}

async function publishFacebookPage(body) {
  const allAccounts = loadFanpageAccounts();
  let targetAccounts = allAccounts.filter((a) => a.enabled !== false && a.status !== 'checkpoint' && !a.checkpointAt);

  // Nếu request chỉ định danh sách tài khoản cụ thể (array hoặc single)
  if (Array.isArray(body.accountIds) && body.accountIds.length > 0) {
    const selected = allAccounts.filter((a) =>
      body.accountIds.some((id) =>
        String(a.id) === String(id) ||
        `fb_acc_${a.id}` === String(id) ||
        a.name === String(id) ||
        (a.port && String(a.port) === String(id))
      )
    );
    if (selected.length > 0) {
      targetAccounts = selected.filter((a) => a.enabled !== false && a.status !== 'checkpoint' && !a.checkpointAt);
    }
  } else if (body.accountId) {
    const specific = allAccounts.find((a) =>
      String(a.id) === String(body.accountId) ||
      `fb_acc_${a.id}` === String(body.accountId) ||
      a.name === String(body.accountId) ||
      (a.port && String(a.port) === String(body.accountId))
    );
    if (specific) {
      if (specific.status === 'checkpoint' || specific.checkpointAt) {
        throw new Error(`Tài khoản "${specific.name}" đang bị Facebook yêu cầu xác thực / Checkpoint. Vui lòng vào mục "Acc yêu cầu xác thực" trên Dashboard để mở Chrome xử lý.`);
      }
      targetAccounts = [specific];
    }
  } else if (body.pageUrl && typeof body.pageUrl === 'string' && !allAccounts.some(a => a.pageUrl === body.pageUrl)) {
    // Nếu truyền một pageUrl cụ thể không nằm trong danh sách
    targetAccounts = [{
      id: 999,
      name: 'Facebook Fanpage',
      pageUrl: body.pageUrl.trim(),
      profileDir: allAccounts[0]?.profileDir || 'n8n-chatgpt-profile',
      port: allAccounts[0]?.port || 9222,
      enabled: true,
    }];
  }

  if (targetAccounts.length === 0) {
    throw new Error('Không có tài khoản Fanpage nào sẵn sàng để đăng bài (tất cả tài khoản đang bị Facebook yêu cầu xác thực Checkpoint hoặc bị tắt). Hãy vào mục "Acc yêu cầu xác thực" trên Dashboard để mở Chrome xử lý!');
  }

  // Nếu hoàn toàn KHÔNG chỉ định tài khoản (cả accountId lẫn accountIds đều rỗng), chỉ đăng 1 tài khoản đầu tiên để tránh đăng dồn dập
  if (!body.accountId && (!body.accountIds || body.accountIds.length === 0) && !body.pageUrl && targetAccounts.length > 1) {
    console.log(`[Fanpage Server 3001] Không chỉ định tài khoản cụ thể. Chỉ đăng tài khoản: "${targetAccounts[0].name}" (Port ${targetAccounts[0].port}) để tránh đăng dồn dập.`);
    targetAccounts = [targetAccounts[0]];
  }

  console.log(`[Fanpage Server 3001] Bắt đầu đăng bài lên ${targetAccounts.length} tài khoản Fanpage...`);
  const successList = [];
  const errorList = [];

  for (let i = 0; i < targetAccounts.length; i++) {
    const acc = targetAccounts[i];
    const accStartTime = Date.now();
    console.log(`\n======================================================`);
    console.log(`[Fanpage Server 3001] [${i + 1}/${targetAccounts.length}] Đang xuất bản lên Fanpage: "${acc.name}" (Port ${acc.port})`);
    console.log(`======================================================`);

    try {
      const res = await publishSingleFacebookPage(acc, body);
      successList.push({
        account: acc.name,
        pageUrl: acc.pageUrl,
        postUrl: res.postUrl || acc.pageUrl,
        publishedAt: res.publishedAt,
      });

      logPostActivity({
        type: 'post',
        channel: 'fanpage',
        channelName: acc.name || 'Facebook Fanpage',
        targetUrl: acc.pageUrl,
        status: 'success',
        caption: body.caption,
        durationMs: Date.now() - accStartTime,
      });

      // Nếu còn Fanpage tiếp theo, chờ 5 giây trước khi chuyển tài khoản
      if (i < targetAccounts.length - 1) {
        console.log(`[Fanpage Server 3001] Chờ 5 giây trước khi chuyển sang Fanpage tiếp theo...`);
        await delay(5000);
      }
    } catch (err) {
      console.error(`[Fanpage Server 3001] Lỗi khi đăng Fanpage "${acc.name}":`, err.message);
      errorList.push({
        account: acc.name,
        pageUrl: acc.pageUrl,
        error: err.message,
      });

      logPostActivity({
        type: 'post',
        channel: 'fanpage',
        channelName: acc.name || 'Facebook Fanpage',
        targetUrl: acc.pageUrl,
        status: 'failed',
        caption: body.caption,
        error: err.message,
        durationMs: Date.now() - accStartTime,
      });
    }
  }

  if (successList.length === 0 && errorList.length > 0) {
    throw new Error(`Đăng bài Fanpage thất bại trên tất cả ${targetAccounts.length} tài khoản: ${errorList.map(e => `${e.account}: ${e.error}`).join('; ')}`);
  }

  return {
    ok: true,
    source: 'facebook-web',
    postUrl: successList[0]?.postUrl || targetAccounts[0]?.pageUrl,
    total: targetAccounts.length,
    successCount: successList.length,
    failedCount: errorList.length,
    successList,
    errorList,
    publishedAt: new Date().toISOString(),
  };
}

async function publishFacebookPersonal(body) {
  const allAccounts = loadPersonalAccounts();
  let targetAccounts = allAccounts.filter((a) => a.enabled !== false && a.status !== 'checkpoint' && !a.checkpointAt);

  if (Array.isArray(body.accountIds) && body.accountIds.length > 0) {
    const selected = allAccounts.filter((a) =>
      body.accountIds.some((id) =>
        String(a.id) === String(id) ||
        `fb_acc_${a.id}` === String(id) ||
        a.name === String(id) ||
        (a.port && String(a.port) === String(id))
      )
    );
    if (selected.length > 0) {
      targetAccounts = selected.filter((a) => a.enabled !== false && a.status !== 'checkpoint' && !a.checkpointAt);
    }
  } else if (body.accountId) {
    const specific = allAccounts.find((a) =>
      String(a.id) === String(body.accountId) ||
      `fb_acc_${a.id}` === String(body.accountId) ||
      a.name === String(body.accountId) ||
      (a.port && String(a.port) === String(body.accountId))
    );
    if (specific) {
      if (specific.status === 'checkpoint' || specific.checkpointAt) {
        throw new Error(`Tài khoản "${specific.name}" đang bị Facebook yêu cầu xác thực Checkpoint. Vui lòng mở Chrome xử lý.`);
      }
      targetAccounts = [specific];
    }
  } else if (body.profileUrl && typeof body.profileUrl === 'string') {
    targetAccounts = [{
      id: 999,
      name: 'Facebook Trang Cá Nhân',
      profileUrl: body.profileUrl.trim(),
      profileDir: allAccounts[0]?.profileDir || 'n8n-fb-group-profile-1',
      port: allAccounts[0]?.port || 9223,
      enabled: true,
    }];
  }

  if (targetAccounts.length === 0) {
    throw new Error('Không có tài khoản Facebook cá nhân nào sẵn sàng để đăng bài (tất cả có thể bị tắt hoặc đang dính checkpoint).');
  }

  // Nếu không chỉ định tài khoản, chỉ đăng tài khoản đầu tiên để nuôi nick an toàn
  if (!body.accountId && (!body.accountIds || body.accountIds.length === 0) && targetAccounts.length > 1) {
    console.log(`[Facebook Personal] Chỉ đăng 1 tài khoản đầu tiên: "${targetAccounts[0].name}" (Port ${targetAccounts[0].port}) để nuôi nick an toàn tránh dồn dập.`);
    targetAccounts = [targetAccounts[0]];
  }

  console.log(`[Facebook Personal] Bắt đầu đăng bài lên ${targetAccounts.length} tài khoản cá nhân...`);
  const successList = [];
  const errorList = [];

  for (let i = 0; i < targetAccounts.length; i++) {
    const acc = targetAccounts[i];
    const accStartTime = Date.now();
    const accTargetUrl = acc.profileUrl || acc.pageUrl || 'https://www.facebook.com/';
    console.log(`\n======================================================`);
    console.log(`[Facebook Personal] [${i + 1}/${targetAccounts.length}] Đang xuất bản lên Trang cá nhân: "${acc.name}" (Port ${acc.port})`);
    console.log(`======================================================`);

    try {
      const res = await publishSingleFacebookPage(acc, body);
      successList.push({
        account: acc.name,
        profileUrl: accTargetUrl,
        postUrl: res.postUrl || accTargetUrl,
        publishedAt: res.publishedAt,
      });

      logPostActivity({
        type: 'post',
        channel: 'personal',
        channelName: acc.name || 'Facebook Cá Nhân',
        targetUrl: accTargetUrl,
        status: 'success',
        caption: body.caption,
        durationMs: Date.now() - accStartTime,
      });

      if (i < targetAccounts.length - 1) {
        const randomWait = Math.floor(Math.random() * 5000) + 5000;
        console.log(`[Facebook Personal] Chờ ${Math.round(randomWait / 1000)}s an toàn trước khi chuyển nick tiếp theo...`);
        await delay(randomWait);
      }
    } catch (err) {
      console.error(`[Facebook Personal] Lỗi khi đăng bài nick cá nhân "${acc.name}":`, err.message);
      errorList.push({
        account: acc.name,
        profileUrl: accTargetUrl,
        error: err.message,
      });

      logPostActivity({
        type: 'post',
        channel: 'personal',
        channelName: acc.name || 'Facebook Cá Nhân',
        targetUrl: accTargetUrl,
        status: 'failed',
        caption: body.caption,
        error: err.message,
        errorDetails: err.stack,
        durationMs: Date.now() - accStartTime,
      });
    }
  }

  if (successList.length === 0 && errorList.length > 0) {
    throw new Error(`Đăng bài lên Trang cá nhân thất bại: ${errorList[0].error}`);
  }

  return {
    ok: true,
    source: 'facebook-web',
    channel: 'personal',
    postUrl: successList[0]?.postUrl || targetAccounts[0]?.profileUrl || targetAccounts[0]?.pageUrl,
    total: targetAccounts.length,
    successCount: successList.length,
    failedCount: errorList.length,
    successList,
    errorList,
    publishedAt: new Date().toISOString(),
  };
}

async function promptBox(page) {
  const selectors = [
    'textarea#prompt-textarea',
    'textarea[placeholder*="Message"]',
    '[contenteditable="true"][data-lexical-editor="true"]',
    '[contenteditable="true"]',
  ];

  // Retry tối đa 60 giây — chờ ChatGPT load xong
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
    await delay(2000); // chờ 2 giây rồi thử lại
  }
  throw new Error('ChatGPT prompt box was not found after 60s. Check that you are signed in and on chatgpt.com.');
}


async function imageSources(page) {
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



async function downloadAsBase64(page, src) {
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

async function canvasAsBase64(page, index) {
  return await page.locator('canvas').nth(index).evaluate((canvas) => {
    const dataUrl = canvas.toDataURL('image/png');
    return {
      imageBase64: dataUrl.slice(dataUrl.indexOf(',') + 1),
      mimeType: 'image/png',
    };
  });
}

async function captureLatestImage(requestedAccount) {
  const account = requestedAccount
    ? (CHATGPT_ACCOUNTS.find(a => a.id === Number(requestedAccount)) || CHATGPT_ACCOUNTS[0])
    : CHATGPT_ACCOUNTS[0];
  const { browser, page } = await openChatGptPage(account);
  try {
    const src = (await imageSources(page)).at(-1);
    if (!src) throw new Error('No generated image is visible in the current ChatGPT conversation');
    return {
      ...(await downloadAsBase64(page, src)),
      fileName: 'chatgpt-' + Date.now() + '.png',
      source: 'chatgpt-web',
      account: account.name,
    };
  } finally {
    try { await page.close(); } catch {}
    await browser.close();
  }
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
      /Vui lòng thử lại sau/i,
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
        /upload\s+(the\s+)?.*reference\s+image/i,
        /please\s+upload\s+(a\s+photo|the\s+.*image|a\s+reference)/i,
        /vui\s+lòng\s+tải\s+(lên\s+)?ảnh/i,
        /tải\s+ảnh\s+tham\s+chiếu/i,
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

/**
 * Chờ ChatGPT generate xong rồi lấy ảnh MỚI được tạo ra.
 * Tuyệt đối không lấy lại ảnh mẫu / ảnh tham chiếu ban đầu.
 */
async function waitForGeneratedImage(page, initialSrcs = new Set(), waitStartTime = Date.now(), initialAssistantCount = 0) {
  const deadline = Date.now() + 360000; // timeout 6 phút
  let hasStarted = false;

  console.log(`[ChatGPT] Đang theo dõi tiến trình tạo ảnh (số tin nhắn assistant ban đầu: ${initialAssistantCount})...`);

  while (Date.now() < deadline) {
    const bodyText = await page.locator('body').innerText().catch(() => '');
    const stopBtn = page.locator('button[aria-label*="Stop" i], button[data-testid*="stop" i]').first();
    const isStreaming = (await stopBtn.count().catch(() => 0)) && (await stopBtn.isVisible().catch(() => false));
    const isCreating = bodyText.includes('Creating image') || bodyText.includes('Đang tạo ảnh') || bodyText.includes('Generating image') || isStreaming;

    const currentAssistantCount = await page.locator('[data-message-author-role="assistant"]').count().catch(() => 0);
    const hasNewAssistantMsg = currentAssistantCount > initialAssistantCount;

    // Chỉ coi là đã bắt đầu khi:
    // 1. Thấy trạng thái "Creating image" / isStreaming
    // 2. HOẶC xuất hiện tin nhắn assistant mới phản hồi cho prompt này
    if (isCreating || hasNewAssistantMsg) {
      if (!hasStarted) {
        hasStarted = true;
        console.log(`[ChatGPT] Đã phát hiện ChatGPT bắt đầu phản hồi/tạo ảnh (isCreating=${isCreating}, newAssistant=${hasNewAssistantMsg})...`);
      }
    }

    // Kiểm tra rate limit / hết token
    const limitCheck = await checkChatGptLimit(page);
    if (limitCheck.isLimited && !isCreating) {
      throw new Error(`[ChatGPT Quota Exceeded] ${limitCheck.message}`);
    }

    // Kiểm tra lỗi policy / generation error từ ChatGPT
    const genError = await checkChatGptGenerationError(page);
    if (genError.hasError && !isCreating) {
      throw new Error(`[ChatGPT Policy/Generation Error] ${genError.message}`);
    }

    // Tự động bỏ qua câu hỏi so sánh ảnh nếu có
    const image1Btn = page.locator('button, [role="button"]').filter({
      hasText: /image\s*1\s*is\s*better/i,
    }).first();
    if (await image1Btn.count().catch(() => 0) > 0) {
      try {
        await image1Btn.click({ timeout: 2000 });
        console.log('Auto-selected Image 1.');
      } catch {}
    }

    // Khi ChatGPT đã bắt đầu VÀ không còn đang stream/tạo ảnh nữa
    if (hasStarted && !isCreating && !isStreaming) {
      // 1. ƯU TIÊN SỐ 1: Tìm ảnh nằm bên trong tin nhắn assistant MỚI NHẤT
      if (hasNewAssistantMsg) {
        const lastAssistant = page.locator('[data-message-author-role="assistant"]').last();
        const assistantImgs = await lastAssistant.locator('img').evaluateAll((imgs) =>
          imgs
            .map((img) => ({
              src: img.currentSrc || img.src,
              width: img.naturalWidth,
              height: img.naturalHeight,
              complete: img.complete,
            }))
            .filter(({ src, width, height, complete }) => src && complete && width >= 256 && height >= 256 && !src.includes('avatar') && !src.includes('profile'))
            .map(({ src }) => src),
        ).catch(() => []);

        // Lọc bỏ bất kỳ ảnh nào đã có từ trước
        const validNewImgs = assistantImgs.filter((s) => !initialSrcs.has(s));
        if (validNewImgs.length > 0) {
          await delay(2000);
          const lastSrc = validNewImgs.at(-1);
          console.log(`[ChatGPT] ✅ Đã lấy chính xác ảnh MỚI TẠO từ tin nhắn phản hồi: ${lastSrc.slice(0, 80)}...`);
          return await downloadAsBase64(page, lastSrc);
        }
      }

      // 2. Tìm tất cả ảnh mới chưa từng có trên trang trước khi prompt
      const allSrcs = await imageSources(page);
      const newSrcs = allSrcs.filter((s) => !initialSrcs.has(s));

      if (newSrcs.length > 0) {
        await delay(2000);
        const lastSrc = newSrcs.at(-1);
        console.log(`[ChatGPT] ✅ Đã lấy ảnh mới tạo từ DOM (không trùng ảnh cũ): ${lastSrc.slice(0, 80)}...`);
        return await downloadAsBase64(page, lastSrc);
      }

      // 3. Fallback: canvas lớn mới
      const canvasIndex = await page.locator('canvas').evaluateAll((canvases) => {
        const imageCanvases = canvases
          .map((canvas, index) => ({ index, width: canvas.width, height: canvas.height }))
          .filter(({ width, height }) => width >= 512 && height >= 512);
        return imageCanvases.length ? imageCanvases.at(-1).index : null;
      }).catch(() => null);
      if (canvasIndex !== null) return await canvasAsBase64(page, canvasIndex);

      // Nếu đã chạy xong nhưng không có ảnh nào trong tin nhắn assistant mới
      const elapsed = Date.now() - waitStartTime;
      if (elapsed > 45000) {
        if (hasNewAssistantMsg) {
          const lastAssistantText = await page.locator('[data-message-author-role="assistant"]').last().innerText().catch(() => '');
          if (lastAssistantText) {
            throw new Error(`ChatGPT không tạo ảnh mà trả về văn bản: "${lastAssistantText.slice(0, 200)}"`);
          }
        }
        throw new Error('ChatGPT đã phản hồi xong nhưng không tạo ra ảnh mới cho chủ đề này.');
      }
    }

    await delay(3000);
  }

  throw new Error('Hết thời gian 6 phút chờ ChatGPT tạo ảnh mới hoặc ChatGPT không tạo ra ảnh.');
}

async function verifyGeneratedImageWithChatGpt(page) {
  try {
    console.log('Đang yêu cầu ChatGPT Web soi ảnh và kiểm tra chữ tiếng Việt...');
    const input = await promptBox(page);
    const checkPrompt = `DO NOT GENERATE AN IMAGE. DO NOT CALL DALL-E. TEXT RESPONSE ONLY.
Inspect the image you just generated above in this conversation. Read all rendered Vietnamese text in that image.
Check if any Vietnamese word has spelling errors, broken accent marks, missing diacritics, corrupted characters, or garbled text.
Respond ONLY with text in JSON format (no image, no markdown, no extra text):
{"isValid": true or false, "reason": "Short explanation in Vietnamese if isValid is false, or 'Chữ chuẩn' if true"}`;

    await input.fill(checkPrompt);
    await input.press('Enter');

    // Chờ ChatGPT Web suy nghĩ và trả lời hoàn chỉnh (tối đa 45 giây)
    const deadline = Date.now() + 45000;
    let lastMessage = '';
    while (Date.now() < deadline) {
      await delay(2000);
      const stopBtn = page.locator('button[aria-label*="Stop"], button[data-testid*="stop"]').first();
      const isStreaming = (await stopBtn.count()) && (await stopBtn.isVisible());

      const assistantMessages = page.locator('[data-message-author-role="assistant"]');
      if (await assistantMessages.count() > 0) {
        lastMessage = await assistantMessages.last().innerText();
      }

      // Khi ChatGPT đã gõ xong (hết streaming) và có chứa json isValid
      if (!isStreaming && lastMessage.includes('isValid')) break;
    }

    console.log('ChatGPT Web phản hồi kiểm tra:', lastMessage);

    const jsonMatch = lastMessage.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        isValid: Boolean(parsed.isValid),
        reason: parsed.reason || 'Đã kiểm tra xong',
      };
    }
  } catch (err) {
    console.warn('Không thể parse kết quả kiểm tra từ ChatGPT Web:', err.message);
  }
  return { isValid: true, reason: 'Chưa xác định được lỗi chữ (mặc định cho qua)' };
}

const DEFAULT_DU_REFERENCE_URL = 'auto_drive';

async function executeGenerateOnAccount(account, { prompt, aspectRatio, referenceImageUrl = DEFAULT_DU_REFERENCE_URL, checkText = true, newConversation = false }) {
  const targetReferenceUrl = resolveReferenceImageUrl(referenceImageUrl);
  const hasDu = targetReferenceUrl !== null;
  const cleanRatio = (aspectRatio === '4:5' || aspectRatio === '4/5' || !aspectRatio) ? '9:16' : aspectRatio;

  const { browser, page } = await openChatGptPage(account, { newConversation });
  try {
    const MAX_RETRIES = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      console.log(`[${account.name}] Bắt đầu tạo ảnh (Lần thử ${attempt}/${MAX_RETRIES})...`);

      // Ghi nhận số lượng tin nhắn assistant và các ảnh đã có trước khi gửi prompt
      const initialAssistantCount = await page.locator('[data-message-author-role="assistant"]').count().catch(() => 0);
      const initialSrcs = new Set(await imageSources(page));

      // Upload ảnh tham chiếu Du (khi hasDu = true)
      let attachSuccess = false;
      if (hasDu && targetReferenceUrl) {
        attachSuccess = await attachReferenceImage(page, targetReferenceUrl);
        if (!attachSuccess && attempt === 1) {
          console.warn(`[${account.name}] Đính kèm ảnh lần đầu chưa nhận, chờ 2s và thử lại...`);
          await delay(2000);
          attachSuccess = await attachReferenceImage(page, targetReferenceUrl);
        }
        // Cập nhật lại initialSrcs sau khi đính kèm để loại trừ ảnh tham chiếu
        const afterAttachSrcs = await imageSources(page);
        for (const s of afterAttachSrcs) initialSrcs.add(s);

        if (!attachSuccess) {
          console.warn(`[${account.name}] Cảnh báo: Trình duyệt chưa bắt được preview ảnh, nhưng file đã nạp vào composer.`);
        }
      }

      const input = await promptBox(page);
      let promptToSend;

      if (hasDu) {
        // CHẾ ĐỘ GIỮ NGUYÊN BỐI CẢNH ẢNH MẪU GOOGLE DRIVE — CHỈ THAY DUY NHẤT CHỮ TRÊN CARD
        const { headline, subheadline } = extractCardTextFromPrompt(prompt);
        console.log(`[ChatGPT] 🎯 LẤY NGUYÊN BỐI CẢNH ẢNH MẪU — CHỈ THAY CHỮ TRÊN CARD (Tỉ lệ ${cleanRatio}):`);
        console.log(`   - Tiêu đề chính: "${headline}"`);
        if (subheadline) console.log(`   - Phụ đề / nội dung: "${subheadline}"`);

        promptToSend = [
          'Using the uploaded reference image:',
          '1. STRICTLY PRESERVE THE COMPLETE 3D SCENE & ENVIRONMENT:',
          '- Keep the exact same 3D background scene, environment, setting, atmosphere, lighting, and colors as shown in the uploaded reference image.',
          '- Keep the exact same 3D mascot character (identical design, outfit, pose, proportions, and placement) from the uploaded reference image.',
          '- Keep the exact same card/panel shape, style, position, and layout from the uploaded reference image.',
          '- Do NOT change the background scene. Do NOT invent a new room, office, or setting. Do NOT change the character or clothing.',
          '',
          '2. YOUR ONLY TASK IS TO REPLACE THE TEXT ON THE CARD:',
          'Replace the text inside the card with this new Vietnamese content:',
          `- TIÊU ĐỀ: "${headline}"`,
          subheadline ? `- NỘI DUNG: "${subheadline}"` : '',
          '',
          '3. TEXT ACCURACY REQUIREMENTS:',
          '- Render the text cleanly inside the card with 100% correct Vietnamese spelling, standard diacritics, and elegant typography matching the original card style.',
          '- Keep the DUDI Software brand logo.',
          '',
          'Preferred aspect ratio: ' + cleanRatio + '.',
          'Do not explain. Generate the image now.',
        ].filter(Boolean).join('\n');
      } else {
        // Chế độ không dùng Du (mô hình người/human model hoặc đồ họa tự do)
        promptToSend = [
          'Generate one high-quality, professional commercial image matching the following description:',
          prompt.trim(),
          'Preferred aspect ratio: ' + cleanRatio + '.',
          'Do not explain. Generate the image now.',
        ].filter(Boolean).join('\n\n');
      }

      await input.fill(promptToSend);
      await input.press('Enter');

      console.log(`[${account.name}] Đã gửi prompt lần ${attempt}. Đang theo dõi quá trình tạo ảnh...`);
      const promptSentAt = Date.now();
      await delay(5000);

      try {
        const image = await waitForGeneratedImage(page, initialSrcs, promptSentAt, initialAssistantCount);

        // Tự động dùng ChatGPT Web soi và kiểm tra chữ tiếng Việt nếu checkText = true
        let textVerification = { isValid: true, reason: 'Chưa bật kiểm tra chữ' };
        if (checkText) {
          console.log(`[${account.name}] Bắt đầu bước soi và kiểm tra chữ tiếng Việt trên ảnh vừa tạo...`);
          textVerification = await verifyGeneratedImageWithChatGpt(page);
          console.log('Kết quả kiểm tra chữ:', JSON.stringify(textVerification));

          if (!textVerification.isValid && attempt < MAX_RETRIES) {
            console.warn(`[${account.name}] Ảnh vừa tạo bị lỗi chữ (${textVerification.reason}). Sẽ tự động tạo lại ảnh mới...`);
            lastError = new Error(`Lỗi chữ tiếng Việt: ${textVerification.reason}`);
            continue;
          }
        }

        console.log(`[${account.name}] Đã tạo ảnh thành công ở lần thử ${attempt}. Chuẩn bị hoàn tất...`);
        return {
          ...image,
          fileName: 'chatgpt-' + Date.now() + '.png',
          source: 'chatgpt-web',
          account: account.name,
          textVerification,
        };
      } catch (err) {
        lastError = err;
        console.error(`[${account.name}] Lần thử ${attempt} gặp lỗi:`, err.message);

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
    console.log(`[ChatGPT] Hoàn tất tác vụ ảnh cho ${account.name}. Đang đóng tab và tắt Chrome hoàn toàn (Port ${account.port})...`);
    try {
      await page.close();
    } catch {}
    await closeChromeGracefully(browser, account.port);
  }
}

async function generateImage(params) {
  const { account: requestedAccount, prompt, aspectRatio, referenceImageUrl = DEFAULT_DU_REFERENCE_URL, checkText = true, newConversation = false } = params;

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
      console.warn(`[ChatGPT Server 3001] Tài khoản trước đó gặp lỗi (${lastError?.message || 'Không xác định'}). Tự động chuyển sang tài khoản: ${acc.name} (Port ${acc.port})...`);
    } else {
      console.log(`[ChatGPT Server 3001] Đang tạo ảnh bằng: ${acc.name} (Port ${acc.port})...`);
    }

    try {
      return await executeGenerateOnAccount(acc, { prompt, aspectRatio, referenceImageUrl, checkText, newConversation });
    } catch (err) {
      lastError = err;
      console.error(`[ChatGPT Server 3001] Tài khoản ${acc.name} (Port ${acc.port}) gặp lỗi:`, err.message);
      // Bất kể lỗi gì (limit, kết nối, lỗi mạng, lỗi giao diện,...) đều chuyển sang tài khoản tiếp theo
    }
  }

  throw new Error(`Tất cả ${accountsToTry.length} tài khoản ChatGPT đều thất bại. Chi tiết lỗi cuối cùng: ${lastError?.message || 'Không tạo được ảnh'}`);
}

app.get('/health', async (_request, response) => {
  const accounts = loadChatGptAccounts();
  const fanpage = loadFanpageConfig();
  const fanpageAccounts = loadFanpageAccounts();
  response.json({
    ok: true,
    status: 'online',
    server: 'server.mjs (Fanpage & ChatGPT Xen Kẽ)',
    port,
    fanpage,
    fanpageAccounts,
    accounts,
  });
});

app.post('/generate', async (request, response) => {
  // Auto-reset nếu job cũ bị treo quá JOB_TIMEOUT_MS
  if (activeJob && Date.now() - activeJobAt > JOB_TIMEOUT_MS) {
    console.warn('Previous job timed out — resetting activeJob flag.');
    activeJob = false;
  }
  if (activeJob) return response.status(429).json({ error: 'An image job is already running. Try again shortly.' });

  const startTime = Date.now();
  try {
    assertGenerateRequest(request.body);
    activeJob = true;
    activeJobAt = Date.now();

    let result;
    if (request.body.action === 'capture_latest_chatgpt_image') {
      result = await captureLatestImage(request.body.account);
    } else if (request.body.action === 'publish_facebook_personal') {
      result = await publishFacebookPersonal(request.body);
    } else if (request.body.action === 'publish_facebook_page') {
      result = await publishFacebookPage(request.body);
    } else {
      result = await generateImage(request.body);
      logPostActivity({
        type: 'image_generate',
        channel: 'chatgpt',
        channelName: 'ChatGPT Image AI',
        status: 'success',
        prompt: request.body.prompt,
        chatgptAccount: result.account,
        aspectRatio: request.body.aspectRatio,
        durationMs: Date.now() - startTime,
      });
    }
    response.json(result);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown bridge error';
    if (request.body.action === 'publish_facebook_personal') {
      logPostActivity({
        type: 'post',
        channel: 'personal',
        channelName: 'Facebook Cá Nhân',
        targetUrl: request.body.profileUrl || request.body.pageUrl || 'https://www.facebook.com/',
        status: 'failed',
        caption: request.body.caption,
        error: errorMsg,
        errorDetails: error.stack,
        durationMs: Date.now() - startTime,
      });
    } else if (request.body.action === 'publish_facebook_page') {
      logPostActivity({
        type: 'post',
        channel: 'fanpage',
        channelName: 'Facebook Fanpage',
        targetUrl: request.body.pageUrl,
        status: 'failed',
        caption: request.body.caption,
        error: errorMsg,
        errorDetails: error.stack,
        durationMs: Date.now() - startTime,
      });
    } else if (request.body.action === 'generate_chatgpt_image') {
      logPostActivity({
        type: 'image_generate',
        channel: 'chatgpt',
        channelName: 'ChatGPT Image AI',
        status: 'failed',
        prompt: request.body.prompt,
        error: errorMsg,
        errorDetails: error.stack,
        durationMs: Date.now() - startTime,
      });
    }
    response.status(500).json({ error: errorMsg });
  } finally {
    activeJob = false;
    activeJobAt = 0;
  }
});

app.listen(port, host, () => {
  console.log('Desktop bridge listening on http://' + host + ':' + port);
  console.log('Server 1: Facebook Fanpage & ChatGPT Xen Kẽ đã sẵn sàng.');
});
