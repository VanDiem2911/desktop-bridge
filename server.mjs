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
    const fanpageConfig = loadFanpageConfig();
    // LUÔN LUÔN ƯU TIÊN LẤY LINK TRỰC TIẾP TỪ DASHBOARD (fanpage-config.json)
    const dashboardUrl = fanpageConfig.pageUrl || (fanpageConfig.accounts && fanpageConfig.accounts.find(a => a.enabled !== false)?.pageUrl) || (fanpageConfig.accounts && fanpageConfig.accounts[0]?.pageUrl);
    const targetUrl = dashboardUrl || (body.pageUrl && typeof body.pageUrl === 'string' && body.pageUrl.startsWith('https://www.facebook.com/') ? body.pageUrl.trim() : 'https://www.facebook.com/');

    if (!targetUrl.startsWith('https://www.facebook.com/')) {
      throw new Error('pageUrl không hợp lệ hoặc chưa được cấu hình đúng trên Dashboard');
    }
    body.pageUrl = targetUrl;

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

function loadFanpageConfig() {
  try {
    if (fs.existsSync(CONFIG_FANPAGE_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(CONFIG_FANPAGE_PATH, 'utf-8'));
      if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.accounts) && parsed.accounts.length > 0) {
          const active = parsed.accounts.find((a) => a.enabled !== false) || parsed.accounts[0];
          return active;
        }
        return parsed;
      }
    }
  } catch (err) {
    console.error('[Fanpage Config Error]', err.message);
  }
  return {
    name: 'Facebook Fanpage Chính',
    pageUrl: 'https://www.facebook.com/',
    profileDir: 'n8n-chatgpt-profile',
    port: 9222,
    enabled: true,
  };
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
    ],
    { detached: true, stdio: 'ignore' },
  ).unref();

  // Chờ tối đa 30 giây cho Chrome sẵn sàng
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

async function openFacebookPage(pageUrl) {
  const fanpageConfig = loadFanpageConfig();
  const targetUrl = pageUrl || fanpageConfig.pageUrl || (fanpageConfig.accounts && fanpageConfig.accounts[0]?.pageUrl) || 'https://www.facebook.com/';
  const fbAccount = {
    name: fanpageConfig.name || (fanpageConfig.accounts && fanpageConfig.accounts[0]?.name) || 'Facebook Fanpage',
    profileDir: fanpageConfig.profileDir || (fanpageConfig.accounts && fanpageConfig.accounts[0]?.profileDir) || 'n8n-chatgpt-profile',
    port: fanpageConfig.port || (fanpageConfig.accounts && fanpageConfig.accounts[0]?.port) || 9222,
  };
  const cdpUrl = await ensureChromeForGpt(fbAccount);
  let browser;
  try {
    browser = await chromium.connectOverCDP(cdpUrl);
  } catch {
    throw new Error('Chrome is not ready on port ' + fbAccount.port + '. Sign in to Facebook in the Chrome window.');
  }
  const context = browser.contexts()[0];
  if (!context) throw new Error('Chrome has no browser context');

  // Tìm tab Facebook hoặc tạo mới
  let page = context.pages().find((candidate) => candidate.url().includes('facebook.com'));
  if (!page) {
    page = await context.newPage();
  }

  // Luôn điều hướng trực tiếp đến đúng URL Fanpage cấu hình từ Dashboard
  console.log(`[Fanpage Bridge] Đang truy cập thẳng vào link Fanpage Dashboard: ${targetUrl}`);
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await delay(3000);

  await page.bringToFront();
  if (page.url().includes('/login')) {
    throw new Error('Facebook is not signed in in the controlled Chrome profile. Sign in once, then retry.');
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

async function publishFacebookPage({ pageUrl, caption, imageBase64, mimeType = 'image/png', fileName = 'image.png' }) {
  const fanpageConfig = loadFanpageConfig();
  const targetPageUrl = (pageUrl && typeof pageUrl === 'string' && pageUrl.startsWith('https://www.facebook.com/'))
    ? pageUrl.trim()
    : (fanpageConfig.pageUrl || 'https://www.facebook.com/');
  console.log(`[Fanpage Server 3001] Đang xuất bản bài viết lên Fanpage (${targetPageUrl})...`);
  const { browser, page } = await openFacebookPage(targetPageUrl);
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
    const composer = await firstVisible(dialog, [
      '[contenteditable="true"][aria-placeholder*="Bạn đang nghĩ gì"]',
      '[contenteditable="true"][aria-placeholder*="What\'s on your mind"]',
    ]);
    await composer.fill(postCaption);

    const uploads = dialog.locator('input[type="file"][accept*="image"]');
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
    console.log('Bắt đầu quy trình bấm Tiếp và Đăng bài viết...');
    const publishDeadline = Date.now() + 60000;
    while (Date.now() < publishDeadline) {
      await delay(1500);

      // Kiểm tra xem dialog có còn mở không
      const activeDialog = page.locator('[role="dialog"]').last();
      if (!(await activeDialog.count()) || !(await activeDialog.isVisible())) {
        console.log('Hộp thoại Đăng bài đã đóng hoàn toàn (Facebook xuất bản thành công).');
        break;
      }

      // Bấm nút hành động phù hợp (Tiếp / Thêm nút / Đăng)
      await clickDialogActionButton(page);
    }

    // Chờ thêm buffer an toàn để Facebook hoàn tất ghi dữ liệu
    console.log('Chờ thêm 8 giây để đảm bảo bài viết đã lên sóng 100%...');
    await delay(8000);

    console.log('Đăng bài Facebook hoàn tất! Giữ nguyên tab Facebook trên trình duyệt.');
    return { ok: true, source: 'facebook-web', pageUrl, publishedAt: new Date().toISOString() };
  } finally {
    await browser.close(); // Ngắt kết nối CDP, giữ nguyên tab Facebook và Chrome vẫn mở
  }
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

// Phát hiện chủ đề từ nội dung prompt để chọn background phù hợp
function detectTopicBackground(promptText) {
  const text = promptText.toLowerCase();

  // Mỗi topic có 2 background options để vẫn còn chút đa dạng
  const topicMap = [
    {
      keywords: ['website', 'landing page', 'ui', 'ux', 'frontend', 'web design', 'interface', 'mockup', 'wireframe'],
      backgrounds: [
        'elegant minimalist white studio with floating holographic UI screens and website wireframe projections, clean white surfaces, soft blue ambient glow, futuristic tech atmosphere',
        'bright modern creative agency office with large monitor screens displaying website designs, sleek desk setup, soft daylight, professional and creative atmosphere',
      ],
    },
    {
      keywords: ['seo', 'marketing', 'ads', 'traffic', 'keyword', 'ranking', 'google', 'quảng cáo', 'tiếp thị', 'digital'],
      backgrounds: [
        'vibrant co-working creative studio with colorful accent walls, neon signs, laptop screens glowing with analytics dashboards, energetic and dynamic creative atmosphere',
        'bright modern open-plan office with large screens showing graphs and SEO metrics, whiteboards with strategy notes, energetic startup vibe',
      ],
    },
    {
      keywords: ['crm', 'erp', 'phần mềm', 'software', 'quản lý', 'doanh nghiệp', 'enterprise', 'management', 'automation', 'hệ thống'],
      backgrounds: [
        'sleek corporate conference room with a large presentation screen showing CRM dashboards and business charts, dark wood table, professional warm lighting, executive atmosphere',
        'bright modern glass-wall office interior with clean workstations, indoor plants, soft indoor daylight, city skyline visible through floor-to-ceiling windows',
      ],
    },
    {
      keywords: ['ai', 'artificial intelligence', 'chatbot', 'machine learning', 'automation', 'robot', 'trí tuệ nhân tạo', 'tự động'],
      backgrounds: [
        'futuristic eco-tech lab with glowing circuit board patterns on walls, holographic data streams, clean white and neon blue surfaces, advanced AI atmosphere',
        'sleek modern server room with dramatic blue and cyan lighting, clean glass panels, floating holographic data visualizations, cutting-edge tech feel',
      ],
    },
    {
      keywords: ['doanh thu', 'revenue', 'lợi nhuận', 'profit', 'tài chính', 'finance', 'kế toán', 'accounting', 'báo cáo tài chính', 'tăng trưởng', 'growth'],
      backgrounds: [
        'elegant executive office with an upward-trending financial chart on a large wall screen, polished marble desk, warm golden lighting, sophisticated professional atmosphere',
        'bright modern boardroom with floor-to-ceiling windows, financial graphs projected on screen, clean minimalist design, confident and prosperous feeling',
      ],
    },
    {
      keywords: ['tuyển dụng', 'nhân sự', 'hr', 'recruitment', 'team', 'nhân viên', 'employee', 'workforce', 'hiring'],
      backgrounds: [
        'bright open collaborative office space with diverse happy team working in background, warm natural light, plants and colorful accents, welcoming and energetic atmosphere',
        'modern HR office with a warm reception area, smiling people, bright natural light, open plan design, inclusive and professional environment',
      ],
    },
    {
      keywords: ['ecommerce', 'thương mại điện tử', 'shop', 'bán hàng', 'sản phẩm', 'product', 'order', 'delivery', 'cart', 'online store'],
      backgrounds: [
        'bright vibrant product showroom with colorful merchandise displays, clean white shelving, warm accent lighting, modern retail aesthetic',
        'modern ecommerce fulfillment center with bright lighting, organized shelves, clean white and orange color accents, energetic and efficient atmosphere',
      ],
    },
    {
      keywords: ['học', 'giáo dục', 'education', 'training', 'course', 'khóa học', 'tutorial', 'kỹ năng', 'skill', 'certificate', 'chứng chỉ'],
      backgrounds: [
        'bright airy modern library or e-learning studio with bookshelves, open laptop, warm reading light, calm and focused learning atmosphere',
        'cheerful modern classroom with large windows, digital screens, plants on windowsills, motivational atmosphere for learning and growth',
      ],
    },
    {
      keywords: ['tết', 'lễ', 'festival', 'holiday', 'seasonal', 'truyền thống', 'traditional', 'vietnamese culture', 'đèn lồng', 'hoa đào', 'trung thu'],
      backgrounds: [
        'festive outdoor Vietnamese street scene with colorful silk lanterns, blooming peach blossom trees, warm golden evening glow, joyful cultural celebration atmosphere',
        'elegant traditional Vietnamese courtyard with red lanterns, white flowers, candles, and decorative cultural elements, warm and festive ambiance',
      ],
    },
    {
      keywords: ['sức khỏe', 'health', 'wellness', 'clinic', 'bệnh viện', 'hospital', 'medical', 'spa', 'fitness', 'yoga'],
      backgrounds: [
        'clean modern wellness clinic interior with white and mint green palette, soft natural light, fresh potted plants, calm and trustworthy healing atmosphere',
        'bright airy spa or wellness studio with bamboo accents, white linen, soft green foliage, natural light, serene and rejuvenating atmosphere',
      ],
    },
  ];

  // Tìm topic khớp với nhiều keywords nhất
  let bestMatch = null;
  let bestScore = 0;
  for (const topic of topicMap) {
    const score = topic.keywords.filter(kw => text.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = topic;
    }
  }

  // Fallback nếu không khớp topic nào
  const fallbackBackgrounds = [
    'bright modern glass-wall office interior with indoor plants, clean workstation, soft indoor daylight, city skyline visible through floor-to-ceiling windows',
    'warm airy tropical café with rattan furniture, white walls, potted monstera plants, golden morning sunlight streaming through large windows',
    'bright open rooftop garden terrace at golden hour, lush greenery planters, city skyline blurred in background, warm sunset tones',
  ];

  const pool = bestMatch ? bestMatch.backgrounds : fallbackBackgrounds;
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  const topicName = bestScore > 0 ? `(matched ${bestScore} keywords)` : '(no match → fallback)';
  console.log(`[Topic Detection] ${topicName}`);
  return chosen;
}

// Layout và pose vẫn random để đa dạng bố cục, background khớp chủ đề
// hasDu = true: Workflow giờ chẵn (có Du) | hasDu = false: Workflow giờ lẻ (người thật photorealistic)
function pickVariation(promptText = '', hasDu = true) {
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const bg = detectTopicBackground(promptText);

  if (!hasDu) {
    // Workflow Giờ Lẻ: NGƯỜI THẬT PHOTOREALISTIC, BỐ CỤC ĐA DẠNG KHÔNG LẶP LAI, FULL BLEED BG
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

    const layout = pick(humanLayouts);
    const pose = pick(humanPoses);

    console.log(`[Variation] Human Model Layout: ${humanLayouts.indexOf(layout)+1}/5 | Pose: ${humanPoses.indexOf(pose)+1}/7 | BG: topic-matched`);
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

  const layout = pick(duLayouts);
  const pose = pick(duPoses);

  console.log(`[Variation] Du Layout: ${duLayouts.indexOf(layout)+1}/5 | Pose: ${duPoses.indexOf(pose)+1}/7 | BG: topic-matched`);

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

        // Nếu là lỗi hết token / quota thì quăng lỗi ra ngoài ngay để chuyển sang tài khoản dự phòng
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

  console.log(`[ChatGPT Server 3001] Đang tạo ảnh xen kẽ bằng: ${primaryAccount.name} (Port ${primaryAccount.port})...`);

  try {
    return await executeGenerateOnAccount(primaryAccount, { prompt, aspectRatio, referenceImageUrl, checkText, newConversation });
  } catch (err) {
    // Tự động thử lần lượt các tài khoản còn lại nếu tài khoản đầu bị hết token / rate limit
    if (err.message.includes('Quota Exceeded') || err.message.includes('limit') || err.message.includes('Rate limit')) {
      const remainingAccounts = enabledAccounts.filter((a) => String(a.id) !== String(primaryAccount.id));
      for (const fallbackAccount of remainingAccounts) {
        try {
          console.warn(`[ChatGPT Server 3001] ${primaryAccount.name} bị giới hạn token/quota. Tự động chuyển sang ${fallbackAccount.name} (Port ${fallbackAccount.port})...`);
          return await executeGenerateOnAccount(fallbackAccount, { prompt, aspectRatio, referenceImageUrl, checkText, newConversation });
        } catch (fallbackErr) {
          console.warn(`[ChatGPT Server 3001] ${fallbackAccount.name} cũng gặp lỗi:`, fallbackErr.message);
        }
      }
    }
    throw err;
  }
}

app.get('/health', async (_request, response) => {
  const accounts = loadChatGptAccounts();
  const fanpage = loadFanpageConfig();
  response.json({
    ok: true,
    status: 'online',
    server: 'server.mjs (Fanpage & ChatGPT Xen Kẽ)',
    port,
    fanpage,
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
  try {
    assertGenerateRequest(request.body);
    activeJob = true;
    activeJobAt = Date.now();
    response.json(
      request.body.action === 'capture_latest_chatgpt_image'
        ? await captureLatestImage(request.body.account)
        : request.body.action === 'publish_facebook_page'
          ? await publishFacebookPage(request.body)
          : await generateImage(request.body),
    );
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : 'Unknown bridge error' });
  } finally {
    activeJob = false;
    activeJobAt = 0;
  }
});

app.listen(port, host, () => {
  console.log('Desktop bridge listening on http://' + host + ':' + port);
  console.log('Server 1: Facebook Fanpage & ChatGPT Xen Kẽ đã sẵn sàng.');
});
