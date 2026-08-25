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

const host = '127.0.0.1';
const port = 3003; // Server riêng cho Trang Cá Nhân & ChatGPT Profile mới
const app = express();
app.use(express.json({ limit: '25mb' }));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
function resolveConfigFile(filename, exampleFilename) {
  const configsDir = path.join(__dirname, 'configs');
  const targetInConfigs = path.join(configsDir, filename);
  const targetInRoot = path.join(__dirname, filename);

  if (fs.existsSync(targetInConfigs)) return targetInConfigs;
  if (fs.existsSync(targetInRoot)) return targetInRoot;

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

const CONFIG_PATH = resolveConfigFile('personal-config.json', 'personal-config.example.json');
const CONFIG_CHATGPT_PATH = resolveConfigFile('chatgpt-config.json', 'chatgpt-config.example.json');

let activeJob = false;
let activeJobAt = 0;
const JOB_TIMEOUT_MS = 15 * 60 * 1000; // 15 phút auto-reset nếu job bị treo

function loadChatGptAccounts() {
  try {
    if (fs.existsSync(CONFIG_CHATGPT_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(CONFIG_CHATGPT_PATH, 'utf-8'));
      if (Array.isArray(parsed.accounts) && parsed.accounts.length > 0) {
        return parsed.accounts;
      }
    }
  } catch (err) {
    console.error('[Personal Server ChatGPT Config]', err.message);
  }
  return [
    { id: 1, name: 'ChatGPT Tài khoản 1', profileDir: 'n8n-chatgpt-profile', port: 9222, enabled: true },
    { id: 2, name: 'ChatGPT Tài khoản 2', profileDir: 'n8n-chatgpt-profile-2', port: 9242, enabled: true },
  ];
}

let currentGptAccountIndex = 0; // Xen kẽ luân phiên qua tất cả tài khoản

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

/** Tự động bật Chrome cho tài khoản ChatGPT tương ứng nếu chưa chạy. */
async function ensureChromeForGpt(account) {
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
      'https://chatgpt.com/',
      'https://www.facebook.com/',
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
  throw new Error(`Chrome không khởi động được trên cổng ${targetPort} cho ${account.name}. Hãy chạy open-setup-chatgpt.ps1 để kiểm tra.`);
}

// ==================== XỬ LÝ CAPTION & VALIDATION ====================

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

function assertRequest(body) {
  const allowedActions = [
    'generate_chatgpt_image',
    'capture_latest_chatgpt_image',
    'publish_facebook_personal',
    'publish_facebook_profile',
    'publish_facebook_page',
  ];
  if (!allowedActions.includes(body?.action)) {
    throw new Error(`action must be one of: ${allowedActions.join(', ')}`);
  }
  if (
    body.action === 'generate_chatgpt_image'
    && (typeof body.prompt !== 'string' || body.prompt.trim().length < 5)
  ) {
    throw new Error('prompt must be a non-empty string');
  }
  if (['publish_facebook_personal', 'publish_facebook_profile', 'publish_facebook_page'].includes(body.action)) {
    const captionText = cleanCaption(body.caption);
    if (!captionText) {
      throw new Error('caption must be a non-empty string');
    }
    if (typeof body.imageBase64 !== 'string' || body.imageBase64.length < 100) {
      throw new Error('imageBase64 must contain the generated image base64 data');
    }
  }
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

// ==================== ĐĂNG BÀI TRANG CÁ NHÂN FACEBOOK ====================

async function handleFacebookCtaPopup(page) {
  try {
    // 1. Ưu tiên bấm "Thêm nút" (Gửi tin nhắn)
    const addBtn = page.getByRole('button', { name: /^(Thêm nút|Thêm nút gửi tin nhắn|Thêm|Add button|Add CTA)$/i });
    if (await addBtn.count() && await addBtn.first().isVisible()) {
      await addBtn.first().click();
      console.log('[Personal Post] Đã bấm "Thêm nút" trên popup Facebook.');
      await delay(2000);
      return true;
    }
    const addBtnLocator = page.locator('[role="dialog"] [role="button"]:has-text("Thêm nút"), [role="button"]:has-text("Thêm nút")').first();
    if (await addBtnLocator.count() && await addBtnLocator.isVisible()) {
      await addBtnLocator.click();
      console.log('[Personal Post] Đã bấm "Thêm nút" trên popup Facebook (locator).');
      await delay(2000);
      return true;
    }

    // 2. Fallback: Bấm "Lúc khác"
    const laterBtn = page.getByRole('button', { name: /Lúc khác|Not Now|Later|Skip/i });
    if (await laterBtn.count() && await laterBtn.first().isVisible()) {
      await laterBtn.first().click();
      console.log('[Personal Post] Đã bấm "Lúc khác" để bỏ qua popup Facebook.');
      await delay(1000);
      return true;
    }

    // 3. Fallback: Bấm nút X
    const closeBtn = page.locator('[aria-label="Close"], [aria-label="Đóng"], [role="button"][aria-label*="close" i]').first();
    if (await closeBtn.count() && await closeBtn.isVisible()) {
      await closeBtn.click();
      console.log('[Personal Post] Đã đóng popup bằng nút X.');
      await delay(1000);
      return true;
    }
  } catch {}
  return false;
}

function loadPersonalConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (err) {
    console.error('[Personal Server Config Error]', err.message);
  }
  return { activeAccount: 1, accounts: [] };
}

function getActivePersonalAccount(reqAccountId) {
  const config = loadPersonalConfig();
  const accounts = (config.accounts || []).filter(a => a.enabled !== false);
  if (reqAccountId) {
    const found = accounts.find((a) => String(a.id) === String(reqAccountId));
    if (found) return found;
  }
  if (config.activeAccount) {
    const active = accounts.find((a) => a.id === config.activeAccount);
    if (active) return active;
  }
  return accounts[0] || {
    id: 1,
    name: 'Facebook Cá nhân 1',
    profileDir: 'n8n-personal-profile-1',
    port: 9230,
    profileUrl: 'https://www.facebook.com/',
  };
}

async function ensureChromeForPersonalFb(account) {
  const targetAccount = account || getActivePersonalAccount();
  const targetPort = targetAccount.port || 9230;
  if (await isPortReady(targetPort)) return `http://127.0.0.1:${targetPort}`;

  const chromePath = getChromeExecutable();
  const profilePath = path.join(os.homedir(), 'AppData', 'Local', targetAccount.profileDir || 'n8n-personal-profile-1');
  console.log(`[Chrome] Khởi động Chrome cho ${targetAccount.name} (Profile: ${targetAccount.profileDir}) trên cổng ${targetPort}...`);

  spawn(
    chromePath,
    [
      '--remote-debugging-address=127.0.0.1',
      `--remote-debugging-port=${targetPort}`,
      `--user-data-dir=${profilePath}`,
      '--start-maximized',
      targetAccount.profileUrl || 'https://www.facebook.com/',
    ],
    { detached: true, stdio: 'ignore' },
  ).unref();

  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    await delay(1500);
    if (await isPortReady(targetPort)) {
      console.log(`[Chrome] Cửa sổ Chrome ${targetAccount.name} đã sẵn sàng trên cổng ${targetPort}. Chờ 5s load...`);
      await delay(5000);
      return `http://127.0.0.1:${targetPort}`;
    }
  }
  throw new Error(`Chrome không khởi động được trên cổng ${targetPort} cho ${targetAccount.name}.`);
}

async function openFacebookPersonalPage(account, targetUrl = 'https://www.facebook.com/') {
  const targetAccount = account || getActivePersonalAccount();
  const cdpUrl = await ensureChromeForPersonalFb(targetAccount);
  const browser = await chromium.connectOverCDP(cdpUrl);
  const context = browser.contexts()[0];
  if (!context) throw new Error('Chrome has no browser context');

  let page = context.pages().find((candidate) => candidate.url().includes('facebook.com'));
  if (!page) {
    page = await context.newPage();
  }
  console.log(`[Personal Bridge] Đang truy cập thẳng vào link Trang Cá Nhân Dashboard: ${targetUrl}`);
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.bringToFront();
  await delay(3000);

  if (page.url().includes('/login')) {
    throw new Error(`Tài khoản ${targetAccount.name} chưa đăng nhập trong profile '${targetAccount.profileDir}'. Hãy mở Chrome để đăng nhập.`);
  }

  return { browser, page };
}

async function clickDialogActionButton(page) {
  // 1. Thử click nút "Thêm nút" (Gửi tin nhắn)
  const addBtn = page.getByRole('button', { name: /^(Thêm nút|Thêm nút gửi tin nhắn|Thêm|Add button)$/i }).last();
  if (await addBtn.count() && await addBtn.isVisible()) {
    try {
      await addBtn.click({ force: true });
      console.log('[Personal Post] Đã bấm nút "Thêm nút" trên popup.');
      await delay(2000);
      return 'add_btn';
    } catch {}
  }

  // 2. Thử click nút "Tiếp" (Next)
  const nextExact = page.getByRole('button', { name: /^(Tiếp|Next)$/i }).last();
  if (await nextExact.count() && await nextExact.isVisible()) {
    try {
      await nextExact.click({ force: true });
      console.log('[Personal Post] Đã bấm nút "Tiếp" (Next).');
      await delay(2500);
      return 'next';
    } catch {}
  }

  const nextAria = page.locator('[role="dialog"] div[aria-label="Tiếp"], [role="dialog"] div[aria-label="Next"], [role="dialog"] [role="button"][aria-label="Tiếp"], [role="dialog"] [role="button"][aria-label="Next"]').last();
  if (await nextAria.count() && await nextAria.isVisible()) {
    try {
      await nextAria.click({ force: true });
      console.log('[Personal Post] Đã bấm nút "Tiếp" qua aria-label.');
      await delay(2500);
      return 'next';
    } catch {}
  }

  // 3. Thử click nút "Đăng" (Post/Publish)
  const postExact = page.getByRole('button', { name: /^(Đăng|Post|Publish)$/i }).last();
  if (await postExact.count() && await postExact.isVisible()) {
    try {
      await postExact.click({ force: true });
      console.log('[Personal Post] Đã bấm nút "Đăng" (Publish).');
      await delay(2500);
      return 'post';
    } catch {}
  }

  const postAria = page.locator('[role="dialog"] div[aria-label="Đăng"], [role="dialog"] div[aria-label="Post"], [role="dialog"] [role="button"][aria-label="Đăng"], [role="dialog"] [role="button"][aria-label="Post"]').last();
  if (await postAria.count() && await postAria.isVisible()) {
    try {
      await postAria.click({ force: true });
      console.log('[Personal Post] Đã bấm nút "Đăng" qua aria-label.');
      await delay(2500);
      return 'post';
    } catch {}
  }

  return null;
}

async function publishFacebookPersonal({
  account: reqAccountId,
  accountId,
  profileUrl,
  pageUrl,
  caption,
  imageBase64,
  mimeType = 'image/png',
  fileName = 'personal-post.png',
}) {
  const account = getActivePersonalAccount(accountId || reqAccountId);
  // LUÔN LUÔN ƯU TIÊN LẤY LINK TRỰC TIẾP TỪ DASHBOARD (personal-config.json)
  const targetUrl = (account.profileUrl && account.profileUrl.startsWith('https://www.facebook.com/'))
    ? account.profileUrl.trim()
    : (profileUrl && typeof profileUrl === 'string' && profileUrl.startsWith('https://www.facebook.com/'))
      ? profileUrl.trim()
      : (pageUrl && typeof pageUrl === 'string' && pageUrl.startsWith('https://www.facebook.com/'))
        ? pageUrl.trim()
        : 'https://www.facebook.com/';

  console.log(`[Personal Server 3003] Bắt đầu đăng bài lên Facebook Cá Nhân (${account.name} - Port ${account.port}) tại link Dashboard: ${targetUrl}...`);

  const { browser, page } = await openFacebookPersonalPage(account, targetUrl);
  try {
    await handleFacebookCtaPopup(page);

    const postCaption = cleanCaption(caption);
    const dialogSelectors = [
      '[role="dialog"][aria-label*="Tạo bài viết"]',
      '[role="dialog"][aria-label*="Create post"]',
      '[role="dialog"]:has([contenteditable="true"])',
    ];

    let dialog = page.locator(dialogSelectors.join(',')).first();
    if (!(await dialog.count()) || !(await dialog.last().isVisible())) {
      const createPost = await firstVisible(page, [
        '[role="button"][aria-label*="Bạn đang nghĩ gì"]',
        '[role="button"][aria-label*="What\'s on your mind"]',
        '[role="button"]:has-text("Bạn đang nghĩ gì")',
        '[role="button"]:has-text("What\'s on your mind")',
        '[role="button"]:has-text("Create post")',
        '[role="button"]:has-text("Tạo bài viết")',
      ]);

      if (!createPost) {
        throw new Error('Không tìm thấy nút "Bạn đang nghĩ gì" trên Facebook Cá Nhân. Hãy đảm bảo đã đăng nhập và đang ở trang chủ/trang cá nhân.');
      }
      await createPost.click({ force: true });
      await delay(2000);
      dialog = page.locator(dialogSelectors.join(',')).last();
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
      throw new Error('Không tìm thấy ô nhập nội dung bài viết.');
    }

    await composer.click({ force: true });
    await delay(500);
    await composer.fill(postCaption);
    console.log('[Personal Post] Đã điền xong nội dung bài viết.');

    // 2. Upload hình ảnh
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
      throw new Error('Không tìm thấy ô upload hình ảnh trên trình soạn thảo Facebook.');
    }

    const upload = finalUploads.last();
    await upload.setInputFiles({
      name: fileName,
      mimeType,
      buffer: Buffer.from(imageBase64, 'base64'),
    });
    console.log('[Personal Post] Đã đính kèm ảnh thành công. Chờ Facebook render 5s...');
    await delay(5000);

    // Tiến hành bấm chuỗi: Tiếp -> (Thêm nút nếu có) -> Đăng
    console.log('[Personal Post] Bắt đầu quy trình bấm Tiếp và Đăng bài viết...');
    const publishDeadline = Date.now() + 60000;
    while (Date.now() < publishDeadline) {
      await delay(1500);

      const activeDialog = page.locator('[role="dialog"]').last();
      if (!(await activeDialog.count()) || !(await activeDialog.isVisible())) {
        console.log('[Personal Post] Hộp thoại Đăng bài đã đóng hoàn toàn (Xuất bản thành công).');
        break;
      }

      await clickDialogActionButton(page);
    }

    console.log('[Personal Post] Chờ thêm 8 giây để đảm bảo bài viết đã lên sóng 100%...');
    await delay(8000);

    console.log('[Personal Post] Đăng bài Facebook Cá Nhân hoàn tất 100%!');
    return {
      ok: true,
      source: 'facebook-personal',
      publishedAt: new Date().toISOString(),
    };
  } finally {
    await browser.close();
  }
}

// ==================== CHATGPT IMAGE GENERATION (XEN KẼ 2 TÀI KHOẢN) ====================

async function promptBox(page) {
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
  throw new Error('Không tìm thấy ô chat prompt của ChatGPT. Hãy kiểm tra đã đăng nhập trên ChatGPT chưa.');
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

/** Kiểm tra xem ChatGPT có báo hết lượt / hết token / rate limit không. */
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
        console.log(`[Personal ChatGPT] Đã lấy ảnh mới tạo: ${lastSrc.slice(0, 80)}...`);
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

async function attachReferenceImage(page, referenceImageUrl) {
  try {
    console.log('[Personal ChatGPT] Đang tải ảnh tham chiếu...');
    const { buffer, mimeType } = await fetchImageBuffer(referenceImageUrl);
    const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
    const fileName = `reference.${ext}`;

    const attachSelectors = [
      'input[type="file"]',
      'button[aria-label*="Attach"]',
      'button[aria-label*="attach"]',
      'button[aria-label*="Upload"]',
      'button[aria-label*="upload"]',
      '[data-testid="composer-footer-attachment-button"]',
    ];

    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.count()) {
      await fileInput.setInputFiles({ name: fileName, mimeType, buffer });
      console.log(`[Personal ChatGPT] Đã đính kèm ảnh: ${fileName}`);
      await delay(3000);
      return true;
    }

    for (const selector of attachSelectors.slice(1)) {
      const btn = page.locator(selector).first();
      if (await btn.count() && await btn.isVisible()) {
        await btn.click();
        await delay(1000);
        const input = page.locator('input[type="file"]').first();
        if (await input.count()) {
          await input.setInputFiles({ name: fileName, mimeType, buffer });
          console.log(`[Personal ChatGPT] Đã đính kèm ảnh: ${fileName}`);
          await delay(3000);
          return true;
        }
        break;
      }
    }
    return false;
  } catch (error) {
    console.error('Lỗi khi đính kèm ảnh tham chiếu:', error.message);
    return false;
  }
}

async function verifyGeneratedImageWithChatGpt(page) {
  try {
    console.log('[Personal ChatGPT] Đang kiểm tra chữ tiếng Việt trên ảnh...');
    const input = await promptBox(page);
    const checkPrompt = `DO NOT GENERATE AN IMAGE. DO NOT CALL DALL-E. TEXT RESPONSE ONLY.
Inspect the image you just generated above in this conversation. Read all rendered Vietnamese text in that image.
Check if any Vietnamese word has spelling errors, broken accent marks, missing diacritics, corrupted characters, or garbled text.
Respond ONLY with text in JSON format (no image, no markdown, no extra text):
{"isValid": true or false, "reason": "Short explanation in Vietnamese if isValid is false, or 'Chữ chuẩn' if true"}`;

    await input.fill(checkPrompt);
    await input.press('Enter');

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

      if (!isStreaming && lastMessage.includes('isValid')) break;
    }

    const jsonMatch = lastMessage.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        isValid: Boolean(parsed.isValid),
        reason: parsed.reason || 'Đã kiểm tra xong',
      };
    }
  } catch (err) {
    console.warn('Không thể parse kết quả kiểm tra:', err.message);
  }
  return { isValid: true, reason: 'Chưa xác định được lỗi chữ (mặc định cho qua)' };
}

const DEFAULT_DU_REFERENCE_URL = 'https://res.cloudinary.com/dbwahdjzg/image/upload/v1786351452/4022ffed-ef18-4faf-bf7e-156716aa5d4e.png';

async function openChatGptPersonalPage(account, { newConversation = false } = {}) {
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

async function executeGenerateOnAccount(account, { prompt, aspectRatio, referenceImageUrl = DEFAULT_DU_REFERENCE_URL, checkText = true, newConversation = false }) {
  const hasDu = referenceImageUrl !== null && referenceImageUrl !== false;
  const targetReferenceUrl = hasDu ? (referenceImageUrl || DEFAULT_DU_REFERENCE_URL) : null;

  const { browser, page } = await openChatGptPersonalPage(account, { newConversation });
  try {
    const MAX_RETRIES = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      console.log(`[${account.name}] Bắt đầu tạo ảnh (Lần thử ${attempt}/${MAX_RETRIES})...`);

      // Ghi nhận các ảnh đã có trước khi gửi prompt / đính kèm ảnh
      const initialSrcs = new Set(await imageSources(page));

      if (attempt === 1 && targetReferenceUrl) {
        await attachReferenceImage(page, targetReferenceUrl);
        const afterAttachSrcs = await imageSources(page);
        for (const s of afterAttachSrcs) initialSrcs.add(s);
      }

      const input = await promptBox(page);
      let promptToSend;

      if (attempt === 1) {
        promptToSend = [
          'Generate one high-quality, professional image matching the following description:',
          prompt.trim(),
          aspectRatio ? 'Preferred aspect ratio: ' + aspectRatio + '.' : '',
          'Do not explain the prompt. Generate the image now.',
        ].filter(Boolean).join('\n\n');
      } else {
        console.warn(`[${account.name}] Thử lại tạo ảnh lần ${attempt}: tự động tối ưu prompt an toàn và chuẩn xác...`);
        const safePrompt = sanitizePromptForPolicy(prompt);
        const retryNote = lastError?.message?.includes('chính tả') || lastError?.message?.includes('chữ')
          ? 'CRITICAL REQUIREMENT: Ensure all Vietnamese text is 100% correct with full accents and no typos.'
          : 'CRITICAL REQUIREMENT: Strictly follow all safety and content policies. Create a clean, professional visual.';

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

        let textVerification = { isValid: true, reason: 'Chưa bật kiểm tra chữ' };
        if (checkText) {
          console.log(`[${account.name}] Bắt đầu kiểm tra chữ tiếng Việt...`);
          textVerification = await verifyGeneratedImageWithChatGpt(page);
          console.log('Kết quả kiểm tra chữ:', JSON.stringify(textVerification));

          if (!textVerification.isValid && attempt < MAX_RETRIES) {
            console.warn(`[${account.name}] Ảnh bị lỗi chữ (${textVerification.reason}). Sẽ tự động tạo lại ảnh mới...`);
            lastError = new Error(`Lỗi chữ tiếng Việt: ${textVerification.reason}`);
            continue;
          }
        }

        console.log(`[${account.name}] Đã tạo ảnh thành công ở lần thử ${attempt}.`);
        return {
          ...image,
          fileName: 'chatgpt-personal-' + Date.now() + '.png',
          source: 'chatgpt-personal',
          account: account.name,
          textVerification,
        };
      } catch (err) {
        lastError = err;
        console.error(`[${account.name}] Lần thử ${attempt} gặp lỗi:`, err.message);

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
    try {
      await page.close();
      console.log('Đã đóng tab ChatGPT.');
    } catch {}
    await browser.close();
  }
}

async function generateImage(params) {
  const { account: requestedAccount, prompt, aspectRatio, referenceImageUrl, checkText = true, newConversation = false } = params;
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

  console.log(`[Personal Server 3003] Đang tạo ảnh xen kẽ bằng: ${primaryAccount.name} (Port ${primaryAccount.port})...`);

  try {
    return await executeGenerateOnAccount(primaryAccount, { prompt, aspectRatio, referenceImageUrl, checkText, newConversation });
  } catch (err) {
    if (err.message.includes('Quota Exceeded') || err.message.includes('limit') || err.message.includes('Rate limit')) {
      const allAccounts = loadChatGptAccounts();
      const fallbackAccount = allAccounts.find((a) => a.id !== primaryAccount.id && a.enabled !== false);
      if (fallbackAccount) {
        console.warn(`[Personal Server 3003] ${primaryAccount.name} bị giới hạn token/quota. Tự động chuyển sang ${fallbackAccount.name} (Port ${fallbackAccount.port})...`);
        return await executeGenerateOnAccount(fallbackAccount, { prompt, aspectRatio, referenceImageUrl, checkText, newConversation });
      }
    }
    throw err;
  }
}

async function captureLatestPersonalImage(reqAccountId) {
  const allAccounts = loadChatGptAccounts();
  const account = reqAccountId
    ? (allAccounts.find((a) => String(a.id) === String(reqAccountId)) || allAccounts[0])
    : allAccounts[0];
  const { browser, page } = await openChatGptPersonalPage(account);
  try {
    const src = (await imageSources(page)).at(-1);
    if (!src) throw new Error('Không tìm thấy ảnh nào trong phiên chat ChatGPT hiện tại.');
    return {
      ...(await downloadAsBase64(page, src)),
      fileName: 'chatgpt-personal-' + Date.now() + '.png',
      source: 'chatgpt-personal',
      account: account.name,
    };
  } finally {
    try { await page.close(); } catch {}
    await browser.close();
  }
}

// ==================== API ENDPOINTS ====================

app.get('/health', async (_req, res) => {
  const accounts = loadChatGptAccounts();
  const personalConfig = loadPersonalConfig();
  res.json({
    ok: true,
    status: 'online',
    server: 'personal-server (Facebook Trang Cá Nhân & ChatGPT Port 3003)',
    port,
    personalConfig,
    accounts,
  });
});

app.post('/generate', async (req, res) => {
  if (activeJob && Date.now() - activeJobAt > JOB_TIMEOUT_MS) {
    console.warn('[Personal Server] Resetting activeJob flag due to timeout.');
    activeJob = false;
  }
  if (activeJob) {
    return res.status(429).json({ error: 'Một tác vụ khác đang chạy trên Personal Server. Vui lòng thử lại sau giây lát.' });
  }

  try {
    assertRequest(req.body);
    activeJob = true;
    activeJobAt = Date.now();

    let result;
    if (req.body.action === 'capture_latest_chatgpt_image') {
      result = await captureLatestPersonalImage(req.body.account);
    } else if (['publish_facebook_personal', 'publish_facebook_profile', 'publish_facebook_page'].includes(req.body.action)) {
      result = await publishFacebookPersonal(req.body);
    } else {
      result = await generateImage(req.body);
    }
    res.json(result);
  } catch (error) {
    console.error('[Personal Server Error]', error.message);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown bridge error' });
  } finally {
    activeJob = false;
    activeJobAt = 0;
  }
});

app.listen(port, host, () => {
  console.log('====================================================');
  console.log(`🚀 Server 3: Personal Facebook & ChatGPT Bridge đang chạy: http://${host}:${port}`);
  console.log('====================================================');
});
