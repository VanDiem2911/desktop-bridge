import express from 'express';
import { chromium } from 'playwright-core';
import { setTimeout as delay } from 'node:timers/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import https from 'node:https';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { logPostActivity } from './lib/history-logger.mjs';

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
  if (!['generate_chatgpt_image', 'capture_latest_chatgpt_image', 'publish_facebook_page'].includes(body?.action)) {
    throw new Error('action must be generate_chatgpt_image, capture_latest_chatgpt_image, or publish_facebook_page');
  }
  if (
    body.action === 'generate_chatgpt_image'
    && (typeof body.prompt !== 'string' || body.prompt.trim().length < 10)
  ) {
    throw new Error('prompt must be a non-empty string');
  }
  if (body.action === 'publish_facebook_page') {
    const allAccounts = loadFanpageAccounts();
    const enabledAccounts = allAccounts.filter((a) => a.enabled !== false);
    if (enabledAccounts.length === 0 && !body.pageUrl) {
      throw new Error('Chưa có tài khoản Fanpage nào được bật trên Dashboard');
    }

    const captionText = facebookCaption(body.caption);
    if (!captionText) {
      console.error('[Bridge Error] Payload received in publish_facebook_page:', JSON.stringify({ action: body.action, pageUrl: body.pageUrl, caption: body.caption, hasImageBase64: Boolean(body.imageBase64) }));
      throw new Error('caption must be a non-empty string');
    }
    if (typeof body.imageBase64 !== 'string' || body.imageBase64.length < 100) {
      console.error('[Bridge Error] Payload received in publish_facebook_page:', JSON.stringify({ action: body.action, pageUrl: body.pageUrl, hasCaption: Boolean(captionText), imageBase64Length: body.imageBase64?.length }));
      throw new Error('imageBase64 must contain the generated image');
    }
  }
}

function facebookCaption(value) {
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
        if (typeof parsed.facebookPost === 'string' && parsed.facebookPost.trim()) {
          return parsed.facebookPost.trim();
        }
        if (typeof parsed.articleMarkdown === 'string' && parsed.articleMarkdown.trim()) {
          return parsed.articleMarkdown
            .replace(/^#{1,6}\s*/gm, '')
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/^>\s?/gm, '')
            .replace(/^---+\s*$/gm, '')
            .trim();
        }
        if (typeof parsed.socialCaption === 'string' && parsed.socialCaption.trim()) {
          return parsed.socialCaption.trim();
        }
        if (typeof parsed.caption === 'string' && parsed.caption.trim()) {
          return parsed.caption.trim();
        }
        if (typeof parsed.content === 'string' && parsed.content.trim()) {
          return parsed.content.trim();
        }
      }
    } catch {}
  }

  return unfenced.replace(/\\n/g, '\n');
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
      profileDir: 'n8n-chatgpt-profile',
      port: 9222,
      enabled: true,
    },
  ];
}

function loadFanpageConfig() {
  const accounts = loadFanpageAccounts();
  return accounts.find((a) => a.enabled !== false) || accounts[0];
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

async function openChatGptPage(account, { newConversation = false } = {}) {
  const cdpUrl = await ensureChromeForGpt(account);
  const browser = await chromium.connectOverCDP(cdpUrl);
  const context = browser.contexts()[0];
  if (!context) throw new Error('Chrome has no browser context');

  let page;
  if (newConversation) {
    // Mở tab mới với conversation hoàn toàn mới
    page = await context.newPage();
    await page.goto('https://chatgpt.com/', { waitUntil: 'domcontentloaded' });
    await delay(3000);
  } else {
    // Dùng lại tab ChatGPT hiện có
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

async function openFacebookPage(account, pageUrl) {
  const targetUrl = pageUrl || account?.pageUrl || 'https://www.facebook.com/';
  const fbAccount = {
    name: account?.name || 'Facebook Fanpage',
    profileDir: account?.profileDir || 'n8n-chatgpt-profile',
    port: account?.port || 9222,
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

async function publishSingleFacebookPage(account, { caption, imageBase64, mimeType = 'image/png', fileName = 'image.png' }) {
  const targetPageUrl = (account?.pageUrl && typeof account.pageUrl === 'string' && account.pageUrl.startsWith('https://www.facebook.com/'))
    ? account.pageUrl.trim()
    : 'https://www.facebook.com/';
  console.log(`[Fanpage Server 3001] Đang xuất bản bài viết lên Fanpage: "${account.name}" (${targetPageUrl}) trên cổng ${account.port}...`);
  const { browser, page } = await openFacebookPage(account, targetPageUrl);
  try {
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
    await delay(500);
    await composer.fill(postCaption);

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

    // Tiến hành bấm Tiếp -> (Thêm nút nếu có) -> Đăng
    console.log(`[Fanpage Server 3001] [${account.name}] Bắt đầu quy trình bấm Tiếp và Đăng bài viết...`);
    const publishDeadline = Date.now() + 60000;
    while (Date.now() < publishDeadline) {
      await delay(1500);

      // Kiểm tra xem dialog có còn mở không
      const activeDialog = page.locator('[role="dialog"]').last();
      if (!(await activeDialog.count()) || !(await activeDialog.isVisible())) {
        console.log(`[Fanpage Server 3001] [${account.name}] Hộp thoại Đăng bài đã đóng hoàn toàn (Facebook xuất bản thành công).`);
        break;
      }

      // Bấm nút hành động phù hợp (Tiếp / Thêm nút / Đăng)
      await clickDialogActionButton(page);
    }

    // Chờ thêm buffer an toàn để Facebook hoàn tất ghi dữ liệu
    console.log(`[Fanpage Server 3001] [${account.name}] Chờ thêm 8 giây để đảm bảo bài viết đã lên sóng 100%...`);
    await delay(8000);

    console.log(`[Fanpage Server 3001] [${account.name}] Đăng bài Fanpage hoàn tất!`);
    return { ok: true, source: 'facebook-web', account: account.name, pageUrl: targetPageUrl, publishedAt: new Date().toISOString() };
  } finally {
    try {
      await browser.close(); // Ngắt kết nối CDP, giữ nguyên tab Facebook và Chrome vẫn mở
    } catch {}
  }
}

async function publishFacebookPage(body) {
  const allAccounts = loadFanpageAccounts();
  let targetAccounts = allAccounts.filter((a) => a.enabled !== false);

  // Nếu request chỉ định rõ accountId cụ thể
  if (body.accountId) {
    const specific = allAccounts.find((a) => String(a.id) === String(body.accountId));
    if (specific) targetAccounts = [specific];
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
    throw new Error('Không có tài khoản Fanpage nào đang Bật để đăng bài.');
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
async function waitForGeneratedImage(page, initialSrcs = new Set()) {
  const deadline = Date.now() + 360000; // timeout 6 phút
  let hasStarted = false;

  while (Date.now() < deadline) {
    const bodyText = await page.locator('body').innerText();
    const stopBtn = page.locator('button[aria-label*="Stop"], button[data-testid*="stop"]').first();
    const isStreaming = (await stopBtn.count()) && (await stopBtn.isVisible());
    const isCreating = bodyText.includes('Creating image') || isStreaming;

    if (isCreating) hasStarted = true;

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
    if (await image1Btn.count() > 0) {
      try {
        await image1Btn.click({ timeout: 2000 });
        console.log('Auto-selected Image 1.');
      } catch {}
    }

    if (!isCreating) {
      // 1. Tìm ảnh trong tin nhắn phản hồi của assistant
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

      // 2. Tìm tất cả ảnh mới chưa từng có trên trang trước khi prompt
      const allSrcs = await imageSources(page);
      const newSrcs = allSrcs.filter((s) => !initialSrcs.has(s));

      const candidateSrcs = [...new Set([...assistantImgs.filter((s) => !initialSrcs.has(s)), ...newSrcs])];

      if (candidateSrcs.length > 0) {
        const lastSrc = candidateSrcs.at(-1);
        console.log(`Đã lấy ảnh mới tạo từ ChatGPT: ${lastSrc.slice(0, 80)}...`);
        return await downloadAsBase64(page, lastSrc);
      }

      // Fallback: tìm canvas lớn mới
      const canvasIndex = await page.locator('canvas').evaluateAll((canvases) => {
        const imageCanvases = canvases
          .map((canvas, index) => ({ index, width: canvas.width, height: canvas.height }))
          .filter(({ width, height }) => width >= 512 && height >= 512);
        return imageCanvases.length ? imageCanvases.at(-1).index : null;
      });
      if (canvasIndex !== null) return await canvasAsBase64(page, canvasIndex);

      if (hasStarted && !isCreating) {
        await delay(5000);
        const doubleCheckSrcs = (await imageSources(page)).filter((s) => !initialSrcs.has(s));
        if (doubleCheckSrcs.length > 0) {
          return await downloadAsBase64(page, doubleCheckSrcs.at(-1));
        }
        throw new Error('ChatGPT đã phản hồi xong nhưng không tạo ra ảnh mới (có thể bị chặn bởi bộ lọc nội dung).');
      }
    }

    await delay(3000);
  }

  throw new Error('Hết thời gian 6 phút chờ ChatGPT tạo ảnh mới hoặc ChatGPT không tạo ra ảnh.');
}

/**
 * Tải ảnh từ URL về buffer (hỗ trợ cả http và https).
 */
function fetchImageBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to fetch image: HTTP ${response.statusCode}`));
        return;
      }
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve({ buffer: Buffer.concat(chunks), mimeType: response.headers['content-type'] || 'image/png' }));
      response.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Đính kèm ảnh tham chiếu vào ChatGPT bằng cách upload file qua nút đính kèm.
 * Trả về true nếu upload thành công, false nếu không tìm thấy nút upload.
 */
async function attachReferenceImage(page, referenceImageUrl) {
  try {
    console.log('Đang tải ảnh tham chiếu từ URL...');
    const { buffer, mimeType } = await fetchImageBuffer(referenceImageUrl);
    const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
    const fileName = `du-reference.${ext}`;

    // Tìm nút đính kèm file (nút clip/paperclip) trên ChatGPT
    const attachSelectors = [
      'input[type="file"]',
      'button[aria-label*="Attach"]',
      'button[aria-label*="attach"]',
      'button[aria-label*="Upload"]',
      'button[aria-label*="upload"]',
      '[data-testid="composer-footer-attachment-button"]',
    ];

    // Thử tìm input file ẩn trực tiếp để inject file (cách đáng tin cậy nhất)
    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.count()) {
      await fileInput.setInputFiles({ name: fileName, mimeType, buffer });
      console.log(`Đã đính kèm ảnh tham chiếu: ${fileName}`);
      await delay(3000); // Chờ preview ảnh hiển thị
      return true;
    }

    // Fallback: click nút đính kèm rồi chờ input file xuất hiện
    for (const selector of attachSelectors.slice(1)) {
      const btn = page.locator(selector).first();
      if (await btn.count() && await btn.isVisible()) {
        await btn.click();
        await delay(1000);
        const input = page.locator('input[type="file"]').first();
        if (await input.count()) {
          await input.setInputFiles({ name: fileName, mimeType, buffer });
          console.log(`Đã đính kèm ảnh tham chiếu: ${fileName}`);
          await delay(3000);
          return true;
        }
        break;
      }
    }

    console.warn('Không tìm thấy nút upload ảnh — bỏ qua đính kèm ảnh tham chiếu.');
    return false;
  } catch (error) {
    // Không để lỗi upload ảnh chặn quá trình tạo ảnh
    console.error('Lỗi khi đính kèm ảnh tham chiếu:', error.message);
    return false;
  }
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

const DEFAULT_DU_REFERENCE_URL = 'https://res.cloudinary.com/dbwahdjzg/image/upload/v1786351452/4022ffed-ef18-4faf-bf7e-156716aa5d4e.png';

// 20 BACKGROUND NỔI BẬT ĐA DẠNG MÀU SẮC (Tím, Xanh nước biển, Lục bảo, Đỏ, Cyberpunk, 3D Luxury)
const VIBRANT_BACKGROUNDS = [
  // 1. Tím Neon Cyberpunk
  'futuristic cyberpunk stage bathed in intense neon violet and electric purple lighting, glowing purple holographic geometry, dark glossy floor with vivid reflections, cinematic atmospheric purple fog',
  // 2. Xanh Nước Biển Sapphire
  'stunning deep ocean sapphire showroom with glowing electric blue and cyan light ribbons, sleek dark glass pedestal, immersive aquatic blue ambient glow, high-contrast cool atmosphere',
  // 3. Lục Bảo Cao Cấp & Mint
  'luxurious 3D digital gallery with deep emerald green and glowing mint neon accents, dark obsidian marble reflective floor, floating jade light crystals, premium modern aesthetic',
  // 4. Đỏ Rực Cyberpunk & Ruby
  'high-impact futuristic showroom bathed in dramatic crimson red and glowing ruby neon lighting, dark carbon-fiber textured panels, striking red rim lighting and sharp reflections',
  // 5. Tím Midnight & Magenta
  'luxurious midnight indigo studio with vibrant magenta and purple neon light tubes, floating frosted glass geometric prisms, deep amethyst backdrop, futuristic soft glow',
  // 6. Xanh Băng Tuyết & Cyan
  'cutting-edge futuristic stage with glowing ice blue neon pillars, sleek frosted glass architectural elements, clean minimalist deep cobalt and arctic cyan lighting',
  // 7. Lục Bảo Sinh Học & Teal Garden
  'breathtaking futuristic indoor bio-tech garden with glowing teal and emerald flora, sleek architectural glass arches, soft cyan and mint lighting, modern tech vibe',
  // 8. Đỏ Scarlet & Đen Obsidian
  'dramatic dark obsidian stage with glowing scarlet red neon light rings, floating red holographic geometric shapes, bold and energetic high-tech atmosphere',
  // 9. Tím Vũ Trụ & Cosmic Matrix
  'abstract 3D luxury stage with curved glossy purple panels, floating glowing violet rings, deep galaxy purple backdrop with shimmering starlight ambient glow',
  // 10. Xanh Biển Điện Tử & Cobalt Matrix
  'sleek dark cobalt blue virtual space with floating glowing neon cyan data nodes, interconnected digital light lines, futuristic technology showroom aesthetic',
  // 11. Lục Bảo & Neon Mint Aqua
  'futuristic high-tech lab with glowing neon emerald and bright mint green light strips, holographic matrix projections, dark charcoal metallic surfaces, vibrant green ambient glow',
  // 12. Đỏ Ruby & Lưới Laser
  'cutting-edge technology studio with glowing ruby red laser grid lines, floating glass panels, dark matte background with vivid crimson backlight and sleek reflections',
  // 13. Tím Hoàng Hôn Penthouse
  'dramatic high-tech penthouse terrace overlooking a glowing neon cyberpunk city at dusk, rich purple and neon violet glow, soft city bokeh lights, reflective glass railings',
  // 14. Xanh Đại Dương Royal Blue
  'futuristic high-tech digital studio bathed in electric royal blue and glowing cyan neon lighting, transparent holographic interfaces, sleek reflective floor, cool blue atmosphere',
  // 15. Lục Bảo & Ngọc Bích Showroom
  'modern digital showroom with deep teal and dark aqua tones, glowing mint neon light tubes, floating 3D geometric glass prisms, crisp emerald reflections',
  // 16. Đỏ Năng Động & Lửa Neon
  'energetic futuristic presentation stage with warm crimson red and glowing neon scarlet arches, sleek polished dark podium, dynamic cinematic lighting',
  // 17. Tím Neon Laser Hologram
  'sleek futuristic exhibition stage with glowing violet laser light grids, floating holographic data crystals, deep dark purple backdrop with neon purple accents',
  // 18. Xanh Biển Pha Lê Sapphire
  'sleek panoramic lounge overlooking a neon-lit futuristic city with glowing blue and cyan skyscrapers at night, polished dark marble surfaces, rich cool blue tones',
  // 19. Lục Bảo Pha Lê 3D
  'abstract 3D stage featuring floating glowing emerald crystals, neon mint ambient lighting, dark glossy floor reflecting vibrant green light',
  // 20. Đỏ Cyber Metropolis
  'futuristic urban terrace overlooking a neon red cyberpunk cityscape at night, glowing ruby billboards in background, sleek dark metal architecture, high-contrast glow',
];

// Bộ đếm xoay vòng tuần tự để xen kẽ 100% không trùng lặp bối cảnh
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

// Layout, Pose và Background xoay vòng xen kẽ (Tím -> Xanh biển -> Lục bảo -> Đỏ -> ...)
function pickVariation(promptText = '', hasDu = true) {
  const { bg, bgNumber } = getNextBackground();

  if (!hasDu) {
    // Workflow Giờ Lẻ: NGƯỜI THẬT PHOTOREALISTIC, BỐ CỤC ĐA DẠNG KHÔNG LẶP LẠI, FULL BLEED BG
    const humanLayouts = [
      'FULL-BLEED SCENE WITH SOFT CURVED OVERLAY CARD (Right): Environmental background spans 100% full-bleed. A sleek semi-transparent white frosted glass panel with smooth curved edges rests on the RIGHT side (50% width), containing all headline text. A photorealistic Vietnamese professional model stands on the LEFT side.',

      'FULL-BLEED SCENE WITH FROSTED GLASS PANEL (Left): Environmental background spans 100% full-bleed. A sleek semi-transparent frosted glass panel rests on the LEFT side (50% width) containing all headline text. A photorealistic Vietnamese human model stands on the RIGHT side in a dynamic pose.',

      'FULL-BLEED SCENE WITH TOP-RIGHT FLOATING CARD: Environmental background spans 100% full-bleed. Text block is set inside a clean translucent floating card in the TOP-RIGHT zone. Photorealistic Vietnamese human model stands neatly in the BOTTOM-LEFT zone.',

      'FULL-BLEED SCENE WITH TOP-LEFT FLOATING CARD: Environmental background spans 100% full-bleed. Headline text is placed on a sleek translucent floating card in the TOP-LEFT zone. Photorealistic Vietnamese human model stands in the BOTTOM-RIGHT zone.',

      'FULL-BLEED SCENE WITH BOTTOM TEXT BAR: Environmental background spans 100% full-bleed. A translucent frosted glass bar across the BOTTOM 35% contains all text. Photorealistic Vietnamese human model stands prominently in the UPPER-LEFT area.',
    ];

    const humanPoses = [
      'standing confidently in smart casual attire, one arm extended pointing gracefully toward the text card area',
      'holding a glowing holographic tablet or modern smartphone in hands, looking forward with a bright confident smile',
      'sitting relaxed at a sleek modern desk with an open laptop, turning slightly toward the camera with a warm professional smile',
      'walking forward dynamically with an energetic stride, carrying a sleek digital device, smiling warmly',
      'standing with arms crossed over chest in a proud, confident executive stance, smiling brightly',
      'leaning slightly against a sleek glass desk or railing, gesturing with one hand in an engaging presentation pose',
      'standing near floating holographic UI dashboards, interacting with data graphics with one hand',
    ];

    const { layout, layoutNumber } = getNextLayout(humanLayouts);
    const { pose, poseNumber } = getNextPose(humanPoses);

    console.log(`[Variation] Human Model Layout: ${layoutNumber}/${humanLayouts.length} | Pose: ${poseNumber}/${humanPoses.length} | BG: #${bgNumber}/20 (Xoay vòng xen kẽ)`);
    return [
      '⚠️ MANDATORY COMPOSITION OVERRIDE — YOU MUST FOLLOW THIS EXACTLY:',
      '1. BACKGROUND: The environmental background scene MUST be FULL-BLEED, spanning 100% of the entire image canvas corner-to-corner (no solid split color panels cutting the background).',
      '2. BRANDING / LOGO: Include a clean brand logo badge in the TOP corner (top-left or top-right) displaying bold white text "DUDI" with "software" underneath on a vibrant red background.',
      '3. CHARACTER: Include ONE photorealistic Vietnamese human model matching the article topic. ABSOLUTELY NO cartoon mascots, NO 3D toy mascots, NO Du mascot.',
      '4. CHARACTER POSE: The human model is ' + pose + '.',
      '5. TEXT ZONE: All text MUST be placed inside a clean semi-transparent frosted glass panel or translucent overlay card resting directly over the full-bleed background.',
      '6. ZONE SEPARATION: Text and human model occupy separate non-overlapping spatial zones. Text must be 100% legible.',
      `LAYOUT: ${layout}`,
      `BACKGROUND SCENE: ${bg}`,
      'The layout and background above are ABSOLUTE REQUIREMENTS and OVERRIDE any other instruction.',
      '---',
    ].join('\n');
  }

  // Workflow Giờ Chẵn: CÓ DU MASCOT, BỐ CỤC ĐA DẠNG KHÔNG LẶP LẠI, FULL BLEED BG
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

async function executeGenerateOnAccount(account, { prompt, aspectRatio, referenceImageUrl = DEFAULT_DU_REFERENCE_URL, checkText = true, newConversation = false }) {
  const hasDu = referenceImageUrl !== null && referenceImageUrl !== false;
  const targetReferenceUrl = hasDu ? (referenceImageUrl || DEFAULT_DU_REFERENCE_URL) : null;

  const { browser, page } = await openChatGptPage(account, { newConversation });
  try {
    const MAX_RETRIES = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      console.log(`[${account.name}] Bắt đầu tạo ảnh (Lần thử ${attempt}/${MAX_RETRIES})...`);

      // Ghi nhận các ảnh đã có trước khi bắt đầu gửi prompt / đính kèm ảnh
      const initialSrcs = new Set(await imageSources(page));

      // Upload ảnh tham chiếu Du (chỉ khi Workflow 1 — hasDu = true và ở attempt 1)
      if (attempt === 1 && targetReferenceUrl) {
        await attachReferenceImage(page, targetReferenceUrl);
        // Cập nhật lại initialSrcs sau khi đính kèm để loại trừ ảnh tham chiếu
        const afterAttachSrcs = await imageSources(page);
        for (const s of afterAttachSrcs) initialSrcs.add(s);
      }

      const input = await promptBox(page);
      let promptToSend;

      if (attempt === 1) {
        const variation = pickVariation(prompt, hasDu);
        promptToSend = [
          'Generate one high-quality image using this exact art direction:',
          variation,
          prompt.trim(),
          aspectRatio ? 'Preferred aspect ratio: ' + aspectRatio + '.' : '',
          'Do not explain the prompt. Generate the image now.',
        ].filter(Boolean).join('\n\n');
      } else {
        // Khi thử lại (do policy error, generation failure hoặc text error): tối ưu prompt an toàn hơn
        console.warn(`[${account.name}] Thử lại tạo ảnh lần ${attempt}: tự động tối ưu prompt tuân thủ chính sách và chính xác...`);
        const safePrompt = sanitizePromptForPolicy(prompt);
        const retryNote = lastError?.message?.includes('chính tả') || lastError?.message?.includes('chữ')
          ? 'CRITICAL REQUIREMENT: Make sure all Vietnamese text rendered on the image is 100% correct with full standard diacritics and no typos.'
          : 'CRITICAL REQUIREMENT: Strictly follow all safety and content policies. Create a clean, professional, family-friendly marketing visual.';

        promptToSend = [
          'Please regenerate a brand new high-quality image for the following topic:',
          retryNote,
          safePrompt,
          aspectRatio ? 'Preferred aspect ratio: ' + aspectRatio + '.' : '',
          'Do not explain. Generate the image now.',
        ].filter(Boolean).join('\n\n');
      }

      await input.fill(promptToSend);
      await input.press('Enter');

      console.log(`[${account.name}] Đã gửi prompt lần ${attempt}. Đang theo dõi quá trình tạo ảnh...`);
      await delay(5000);

      try {
        const image = await waitForGeneratedImage(page, initialSrcs);

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
    try {
      await page.close(); // Đóng tab ChatGPT sau khi tạo ảnh xong
      console.log('Đã đóng tab ChatGPT.');
    } catch {}
    await browser.close(); // Ngắt kết nối CDP, giữ Chrome vẫn chạy
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
    if (request.body.action === 'publish_facebook_page') {
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
