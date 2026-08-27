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
 * Đăng bài vào 1 Facebook Group (Áp dụng 100% cấu trúc chuẩn như server.mjs)
 */
async function postToSingleGroup(page, groupUrl, caption, imageBase64, mimeType = 'image/png', fileName = 'image.png') {
  console.log(`[Group Post] Đang truy cập nhóm: ${groupUrl}...`);
  await page.goto(groupUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await delay(4000);

  if (page.url().includes('/login')) {
    throw new Error('Tài khoản Facebook chưa đăng nhập trong profile này. Hãy chạy open-setup-chrome.ps1 để đăng nhập.');
  }

  const postCaption = cleanCaption(caption);

  // 1. Mở popup Tạo bài viết nếu chưa mở
  let dialog = page.locator('[role="dialog"]').filter({ has: page.locator('[contenteditable="true"]') }).last();
  if (!(await dialog.count()) || !(await dialog.isVisible())) {
    const createPost = await firstVisible(page, [
      '[role="button"][aria-label*="Bạn viết gì đi"]',
      '[role="button"][aria-label*="Viết gì đó"]',
      '[role="button"][aria-label*="Tạo bài viết công khai"]',
      '[role="button"][aria-label*="Tạo bài viết"]',
      '[role="button"][aria-label*="Write something"]',
      '[role="button"][aria-label*="Create a public post"]',
      '[role="button"]:has-text("Bạn viết gì đi")',
      '[role="button"]:has-text("Viết gì đó")',
      '[role="button"]:has-text("Tạo bài viết công khai")',
      '[role="button"]:has-text("Tạo bài viết")',
      '[role="button"]:has-text("Write something")',
      '[role="button"]:has-text("Create a public post")',
      'div[role="main"] span:has-text("Bạn viết gì đi")',
      'div[role="main"] span:has-text("Viết gì đó")',
    ]);

    if (!createPost) {
      throw new Error(`Không tìm thấy ô đăng bài trong nhóm ${groupUrl}. Có thể tài khoản chưa tham gia nhóm.`);
    }

    await createPost.click();
    await delay(3000);
    dialog = page.locator('[role="dialog"]').filter({ has: page.locator('[contenteditable="true"]') }).last();
  }

  if (!(await dialog.count())) {
    dialog = page.locator('[role="dialog"]').last();
  }

  // 2. Tìm ô soạn thảo trong dialog
  const composerSelectors = [
    '[role="dialog"] div[role="textbox"]',
    '[role="dialog"] div[contenteditable="true"]',
    '[role="dialog"] [data-lexical-editor="true"]',
    '[role="dialog"] [aria-label*="viết" i]',
    '[role="dialog"] [aria-label*="write" i]',
    '[role="dialog"] [aria-label*="nghĩ gì" i]',
    '[role="dialog"] [aria-label*="tạo bài viết" i]',
    '[role="dialog"] [contenteditable="true"]',
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

  // 3. Tải ảnh vào cùng bài viết này
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

  const next = dialog.getByRole('button', { name: /^(Tiếp|Next)$/ });
  if (await next.count() && await next.first().isVisible()) {
    await next.first().click();
    await delay(2500);
  }

  const publish = page.getByRole('button', { name: /^(Post|Đăng)$/ });
  await publish.first().waitFor({ state: 'visible', timeout: 30000 });
  console.log('[Group Post] Bấm nút Đăng bài...');
  await publish.first().click();
  console.log('[Group Post] Đã bấm nút Đăng. Đang chờ xuất bản...');

  try {
    await dialog.waitFor({ state: 'hidden', timeout: 60000 });
    console.log('[Group Post] Bài viết đã đăng thành công.');
  } catch {
    console.warn('[Group Post] Chờ thêm buffer an toàn...');
  }

  await delay(8000);
  console.log(`[Group Post] Hoàn thành đăng nhóm: ${groupUrl}`);
}

function saveConfig(configData) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(configData, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Config Error] Không thể lưu groups-config.json:', err.message);
  }
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
        fullPrompt = [
          'Generate one high-quality, professional image matching the following description:',
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
  try {
    const result = await generateGroupImage(req.body);
    logPostActivity({
      type: 'image_generate',
      channel: 'chatgpt',
      channelName: 'ChatGPT Image AI (Nhóm)',
      status: 'success',
      prompt: req.body.prompt,
      chatgptAccount: result.account,
      aspectRatio: req.body.aspectRatio,
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
      prompt: req.body?.prompt,
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
