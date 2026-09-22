import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { runAutoPilotCycle, loadScheduleConfig, executeSingleNode, getAutoPilotProgress, autoDiscoverAndAppendTopics } from './lib/auto-pilot.mjs';
import { getSheetTopicsOverview } from './lib/google-sheets.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3004;
const app = express();
app.use(express.json({ limit: '25mb' }));

const CONFIG_PATH = path.join(__dirname, 'configs', 'bot-config.json');
const POST_HISTORY_PATH = path.join(__dirname, 'configs', 'post-history.json');
const GROUPS_CONFIG_PATH = path.join(__dirname, 'configs', 'groups-config.json');

let botConfig = loadBotConfig();
let isPolling = false;
let pollOffset = 0;
let lastDigestDate = '';
let serverDownState = {}; // { '3001': true/false }
let checkpointAlertState = {}; // { 'acc_id': true }
let lastUnreadMessageCount = {}; // { 'acc_id': number }
let lastDetectedGroup = null; // { id, title, type, detectedAt }

function loadBotConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    }
  } catch (e) {
    console.error('[Bot] Lỗi đọc cấu hình:', e.message);
  }
  return {
    botToken: '',
    chatId: '',
    allowedChatIds: [],
    enableAlerts: true,
    enableDailyDigest: true,
    dailyDigestTime: '22:00',
    alertOnServerDown: true,
    alertOnCheckpoint: true,
    alertOnJobError: true,
    alertOnNewMessages: true,
    checkIntervalSeconds: 30,
  };
}

function saveBotConfig(cfg) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8');
    botConfig = cfg;
    console.log('[Bot] Đã lưu cấu hình mới thành công, Chat ID đích:', cfg.chatId);
    return true;
  } catch (e) {
    console.error('[Bot] Lỗi lưu cấu hình:', e.message);
    return false;
  }
}

function loadFacebookGroupCount() {
  try {
    const groupsConfig = JSON.parse(fs.readFileSync(GROUPS_CONFIG_PATH, 'utf-8'));
    if (Array.isArray(groupsConfig.centralPool)) return groupsConfig.centralPool.length;

    const uniqueGroupUrls = new Set(
      (groupsConfig.accounts || []).flatMap((account) => account.groupUrls || []),
    );
    return uniqueGroupUrls.size;
  } catch (error) {
    console.error('[Bot] Lỗi đọc số lượng nhóm Facebook:', error.message);
    return 0;
  }
}

// -------------------------------------------------------------
// HELPER: KIỂM TRA PORT & HTTP
// -------------------------------------------------------------
function checkPort(port, timeoutMs = 1000) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/`, { timeout: timeoutMs }, (res) => {
      resolve(true);
    });
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.on('error', () => resolve(false));
  });
}

function fetchJson(url, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(null); }
      });
    });
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.on('error', () => resolve(null));
  });
}

// -------------------------------------------------------------
// TELEGRAM API CLIENT (Native Fetch & FormData)
// -------------------------------------------------------------
const REPLY_KEYBOARD = {
  keyboard: [
    [{ text: '/status' }, { text: '/check_tin' }],
    [{ text: '/screenshot' }, { text: '/restart' }],
    [{ text: '/post_now' }],
  ],
  resize_keyboard: true,
  persistent: true,
};

async function sendTelegramMessage(text, customChatId = null, extra = {}) {
  const token = (botConfig.botToken || '').trim();
  const targetChatId = customChatId || (botConfig.chatId || '').trim();
  if (!token || !targetChatId) return { ok: false, error: 'Chưa cấu hình Telegram Token hoặc Chat ID' };

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChatId,
        text,
        parse_mode: 'HTML',
        reply_markup: REPLY_KEYBOARD,
        ...extra,
      }),
    });
    return await res.json();
  } catch (err) {
    console.error('[Bot Send Error]', err.message);
    return { ok: false, error: err.message };
  }
}

async function sendTelegramPhoto(photoBuffer, caption = '', customChatId = null) {
  const token = (botConfig.botToken || '').trim();
  const targetChatId = customChatId || (botConfig.chatId || '').trim();
  if (!token || !targetChatId) return { ok: false, error: 'Chưa cấu hình Telegram Token hoặc Chat ID' };

  try {
    const form = new FormData();
    form.append('chat_id', targetChatId);
    if (caption) form.append('caption', caption);
    form.append('parse_mode', 'HTML');
    form.append('reply_markup', JSON.stringify(REPLY_KEYBOARD));
    form.append('photo', new Blob([photoBuffer], { type: 'image/png' }), 'screenshot.png');

    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      body: form,
    });
    return await res.json();
  } catch (err) {
    console.error('[Bot Photo Error]', err.message);
    return { ok: false, error: err.message };
  }
}

// -------------------------------------------------------------
// CHỤP ẢNH MÀN HÌNH (CDP HOẶC SYSTEM)
// -------------------------------------------------------------
async function captureCdpScreenshot(cdpPort = 9222) {
  try {
    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${cdpPort}`);
    const contexts = browser.contexts();
    if (contexts.length > 0) {
      const pages = contexts[0].pages();
      if (pages.length > 0) {
        // Ưu tiên trang không phải blank
        const activePage = pages.find((p) => !p.url().includes('about:blank')) || pages[0];
        const buffer = await activePage.screenshot({ type: 'png' });
        await browser.close();
        return buffer;
      }
    }
    await browser.close();
  } catch (e) {
    // Thử port khác nếu lỗi
  }
  return null;
}

async function captureAnyScreenshot() {
  const ports = [9222, 9223, 9224, 9225, 9242];
  for (const p of ports) {
    const buf = await captureCdpScreenshot(p);
    if (buf) return { buffer: buf, source: `Chrome CDP Port ${p}` };
  }

  // Fallback: Chụp bằng script capture-screen.ps1 nếu có
  const psScript = path.join(__dirname, 'scripts', 'capture-screen.ps1');
  const tempOut = path.join(__dirname, 'temp_screenshot.png');
  if (fs.existsSync(psScript)) {
    try {
      await new Promise((resolve) => {
        const ps = spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', psScript, '-OutFile', tempOut]);
        ps.on('close', resolve);
        setTimeout(resolve, 4000);
      });
      if (fs.existsSync(tempOut)) {
        const buf = fs.readFileSync(tempOut);
        try { fs.unlinkSync(tempOut); } catch {}
        return { buffer: buf, source: 'Desktop Screen' };
      }
    } catch {}
  }
  return null;
}

// -------------------------------------------------------------
// GIÁM SÁT TIN NHẮN TẤT CẢ TÀI KHOẢN (MESSENGER / FANPAGE / GROUPS)
// -------------------------------------------------------------
function getAllMonitoredAccounts() {
  const accounts = [];
  const addedPorts = new Set();

  // 1. Fanpage accounts (configs/fanpage-config.json)
  try {
    const fanpagePath = path.join(__dirname, 'configs', 'fanpage-config.json');
    if (fs.existsSync(fanpagePath)) {
      const data = JSON.parse(fs.readFileSync(fanpagePath, 'utf-8'));
      if (Array.isArray(data.accounts)) {
        for (const a of data.accounts) {
          if (a.enabled !== false && a.port) {
            const p = Number(a.port);
            accounts.push({
              id: `fp_${a.id || p}`,
              name: a.name || 'Facebook Fanpage',
              type: 'Fanpage',
              port: p,
              profileDir: a.profileDir,
              pageUrl: a.pageUrl,
            });
            addedPorts.add(p);
          }
        }
      }
    }
  } catch (e) {}

  // 2. Personal accounts (configs/personal-config.json)
  try {
    const personalPath = path.join(__dirname, 'configs', 'personal-config.json');
    if (fs.existsSync(personalPath)) {
      const data = JSON.parse(fs.readFileSync(personalPath, 'utf-8'));
      if (Array.isArray(data.accounts)) {
        for (const a of data.accounts) {
          if (a.enabled !== false && a.port) {
            const p = Number(a.port);
            accounts.push({
              id: `personal_${a.id || p}`,
              name: a.name || 'Facebook Cá Nhân',
              type: 'Cá nhân',
              port: p,
              profileDir: a.profileDir,
              profileUrl: a.profileUrl,
            });
            addedPorts.add(p);
          }
        }
      }
    }
  } catch (e) {}

  // 3. Group accounts (configs/groups-config.json)
  try {
    const groupsPath = path.join(__dirname, 'configs', 'groups-config.json');
    if (fs.existsSync(groupsPath)) {
      const data = JSON.parse(fs.readFileSync(groupsPath, 'utf-8'));
      if (Array.isArray(data.accounts)) {
        data.accounts.forEach((a, idx) => {
          if (a.enabled !== false) {
            const p = a.port ? Number(a.port) : (9223 + idx);
            accounts.push({
              id: `group_${a.id || p}`,
              name: `Nhóm ${a.name || (idx + 1)}`,
              type: 'Nhóm',
              port: p,
              profileDir: a.profileDir,
            });
            addedPorts.add(p);
          }
        });
      }
    }
  } catch (e) {}

  if (accounts.length === 0) {
    accounts.push(
      { id: 'fp_9222', name: 'Facebook Fanpage Chính', type: 'Fanpage', port: 9222 },
      { id: 'group_9223', name: 'Facebook Group 1', type: 'Nhóm', port: 9223 },
    );
  }

  return accounts;
}

async function checkAccountMessages(account) {
  const port = account.port;
  if (!port) return null;

  // 1. Kiểm tra nhanh qua HTTP endpoint /json/list của CDP (timeout 600ms)
  const tabs = await fetchJson(`http://127.0.0.1:${port}/json/list`, 600);
  if (!Array.isArray(tabs) || tabs.length === 0) {
    return {
      account,
      online: false,
      hasUnread: false,
      unreadCount: 0,
      sender: '',
      snippet: '',
      screenshot: null,
    };
  }

  // Tìm các tab liên quan đến Facebook hoặc Messenger
  const fbTab = tabs.find((t) => t.url && (t.url.includes('facebook.com') || t.url.includes('messenger.com')));

  // CHỈ lấy số từ Title nếu đang mở đúng trang Messenger riêng biệt (/messages hoặc messenger.com)
  // TUYỆT ĐỐI KHÔNG đọc title của facebook.com vì "(1) Facebook" là thông báo like/comment chứ KHÔNG PHẢI tin nhắn
  let titleUnread = 0;
  if (fbTab && fbTab.url && (fbTab.url.includes('/messages') || fbTab.url.includes('messenger.com')) && fbTab.title) {
    const match = fbTab.title.match(/^\((\d+)\)/);
    if (match) titleUnread = parseInt(match[1], 10);
  }

  // 2. Kết nối CDP với timeout ngắn để đánh giá DOM trong trang
  let browser = null;
  try {
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { timeout: 3500 });
    const context = browser.contexts()[0];
    if (!context) {
      await browser.close();
      return {
        account,
        online: true,
        hasUnread: titleUnread > 0,
        unreadCount: titleUnread,
        sender: '',
        snippet: '',
        screenshot: null,
      };
    }

    let page = context.pages().find((p) => p.url().includes('facebook.com') || p.url().includes('messenger.com'));
    if (!page && context.pages().length > 0) {
      page = context.pages()[0];
    }

    if (!page) {
      await browser.close();
      return {
        account,
        online: true,
        hasUnread: titleUnread > 0,
        unreadCount: titleUnread,
        sender: '',
        snippet: '',
        screenshot: null,
      };
    }

    const evalResult = await page.evaluate(() => {
      let unread = 0;
      let sender = '';
      let snippet = '';

      const currentUrl = window.location.href;
      const isMessagesPage = currentUrl.includes('/messages') || window.location.hostname.includes('messenger.com');

      // TRƯỜNG HỢP 1: ĐANG Ở TRANG MESSENGER RIÊNG BIỆT (/messages/ hoặc messenger.com)
      if (isMessagesPage) {
        const titleMatch = document.title.match(/^\((\d+)\)/);
        if (titleMatch) {
          unread = Math.max(unread, parseInt(titleMatch[1], 10));
        }

        const unreadRows = document.querySelectorAll('[aria-label*="chưa đọc" i], [aria-label*="unread" i]');
        if (unreadRows.length > 0) {
          unread = Math.max(unread, unreadRows.length);
          const firstRow = unreadRows[0];
          const lines = (firstRow.innerText || '').split('\n').map((s) => s.trim()).filter(Boolean);
          if (lines.length > 0) sender = lines[0];
          if (lines.length > 1) snippet = lines[1];
        }
        return { unreadCount: unread, sender, snippet };
      }

      // TRƯỜNG HỢP 2: ĐANG Ở TRANG FACEBOOK CHUNG (facebook.com)
      // TUYỆT ĐỐI KHÔNG DÙNG document.title VÌ "(1) Facebook" LÀ THÔNG BÁO CHUNG (like, comment, tag, group...) KHÔNG PHẢI TIN NHẮN!
      
      // Quét duy nhất icon/nút Messenger trên thanh điều hướng đầu trang
      const allButtons = document.querySelectorAll('div[role="button"], a, div[aria-label]');
      for (const btn of allButtons) {
        const label = (btn.getAttribute('aria-label') || '').toLowerCase();
        
        // BỎ QUA HOÀN TOÀN ICON QUẢ CHUÔNG THÔNG BÁO (Notification Bell)
        if (label.includes('thông báo') || label.includes('notification')) {
          continue;
        }

        // Chỉ xét đúng nút Messenger
        const isMessenger = label.includes('messenger') || (label.includes('tin nhắn') && !label.includes('thông báo'));
        const isMessagesLink = btn.getAttribute('href')?.includes('/messages');

        if (isMessenger || isMessagesLink) {
          // A. Kiểm tra chữ trong aria-label: ví dụ "Messenger, 2 tin nhắn chưa đọc"
          const match = label.match(/(\d+)\s*(tin nhắn chưa đọc|tin nhắn mới|unread)/i);
          if (match) {
            unread = Math.max(unread, parseInt(match[1], 10));
          }

          // B. Kiểm tra badge số màu đỏ hiển thị trên icon Messenger
          const badgeSpans = btn.querySelectorAll('span');
          for (const sp of badgeSpans) {
            const txt = (sp.textContent || '').trim();
            if (/^\d+$/.test(txt)) {
              const num = parseInt(txt, 10);
              if (num > 0 && num < 1000) {
                unread = Math.max(unread, num);
              }
            }
          }
        }
      }

      // Kiểm tra thêm các popup chat tab đang mở dưới góc phải
      const chatTabs = document.querySelectorAll('div[data-pagelet*="ChatTab"], div[role="dialog"][aria-label*="Chat với" i], div[role="dialog"][aria-label*="Cuộc trò chuyện" i]');
      for (const tab of chatTabs) {
        const badge = tab.querySelector('span[data-visualcompletion="ignore"], span[dir="auto"]');
        if (badge && /^\d+$/.test(badge.textContent.trim())) {
          unread = Math.max(unread, parseInt(badge.textContent.trim(), 10));
        }
        const titleEl = tab.querySelector('h2, [role="heading"], strong');
        if (titleEl && !sender) {
          sender = titleEl.textContent?.trim() || '';
        }
      }

      return {
        unreadCount: unread,
        sender,
        snippet,
      };
    }).catch(() => ({ unreadCount: 0, sender: '', snippet: '' }));

    const finalUnread = evalResult.unreadCount || titleUnread || 0;

    let screenshotBuffer = null;
    if (finalUnread > 0) {
      try {
        screenshotBuffer = await page.screenshot({ type: 'png', timeout: 4000 });
      } catch {}
    }

    await browser.close();
    return {
      account,
      online: true,
      hasUnread: finalUnread > 0,
      unreadCount: finalUnread,
      sender: evalResult.sender,
      snippet: evalResult.snippet,
      screenshot: screenshotBuffer,
    };
  } catch (err) {
    if (browser) {
      try { await browser.close(); } catch {}
    }
    return {
      account,
      online: true,
      hasUnread: titleUnread > 0,
      unreadCount: titleUnread,
      sender: '',
      snippet: '',
      screenshot: null,
    };
  }
}

async function checkAllAccountsMessages() {
  const accounts = getAllMonitoredAccounts();
  const reports = [];

  for (const acc of accounts) {
    try {
      const res = await checkAccountMessages(acc);
      if (res) reports.push(res);
    } catch (e) {
      reports.push({
        account: acc,
        online: false,
        hasUnread: false,
        unreadCount: 0,
        sender: '',
        snippet: '',
        screenshot: null,
      });
    }
  }

  return reports;
}

// -------------------------------------------------------------
// KIỂM TRA BẢO MẬT & XỬ LÝ LỆNH TELEGRAM
// -------------------------------------------------------------
function isAuthorizedChat(chatId, fromUserId = null) {
  const primary = String(botConfig.chatId || '').trim();
  const allowed = Array.isArray(botConfig.allowedChatIds) ? botConfig.allowedChatIds.map(String) : [];
  const senderId = String(chatId).trim();
  const userId = fromUserId ? String(fromUserId).trim() : null;
  return (
    senderId === primary ||
    allowed.includes(senderId) ||
    (userId && (userId === primary || allowed.includes(userId)))
  );
}

async function handleTelegramMessage(message) {
  const chatId = message.chat?.id;
  const isGroup = message.chat?.type === 'group' || message.chat?.type === 'supergroup';
  const text = (message.text || '').trim();
  const fromName = message.from?.first_name || 'Bạn';
  const fromUserId = message.from?.id;

  // Nếu là nhóm Telegram, ghi nhận lại thông tin nhóm
  if (isGroup && chatId) {
    lastDetectedGroup = {
      id: String(chatId),
      title: message.chat.title || 'Nhóm Telegram',
      type: message.chat.type,
      detectedAt: new Date().toISOString(),
    };
    console.log(`[Telegram Group] Tương tác từ nhóm "${lastDetectedGroup.title}" (ID: ${chatId})`);
  }

  // Khi bot vừa được thêm vào một nhóm mới
  if (message.new_chat_members || message.group_chat_created || message.supergroup_chat_created) {
    if (chatId) {
      await sendTelegramMessage(
        `🎉 <b>Xin chào nhóm "${message.chat?.title || 'này'}"!</b>\n` +
        `Bot đã được thêm vào nhóm thành công.\n\n` +
        `📍 <b>Group Chat ID:</b> <code>${chatId}</code>\n\n` +
        `👉 <b>Để chuyển toàn bộ thông báo hệ thống DUDI vào nhóm này:</b>\n` +
        `• Gõ lệnh <code>/set_group</code> ngay tại đây để bot tự động lưu nhóm này!\n` +
        `• Hoặc copy mã <code>${chatId}</code> dán vào ô <b>Telegram Chat ID</b> trên Dashboard.`,
        chatId
      );
    }
    return;
  }

  // Tách lệnh (hỗ trợ cả dạng /command@botname)
  const rawCmd = text.split(' ')[0].toLowerCase();
  const cmd = rawCmd.split('@')[0];

  // Lệnh kiểm tra ID (cho phép chạy công khai để người dùng lấy ID nhóm nhanh nhất)
  if (cmd === '/id' || cmd === '/myid' || cmd === '/chatid' || cmd === '/getid') {
    const reply = isGroup
      ? `👥 <b>Thông Tin Nhóm Telegram:</b>\n• Tên nhóm: <b>${message.chat.title || 'Nhóm'}</b>\n• <b>Group Chat ID:</b> <code>${chatId}</code>\n\n👉 Gõ lệnh <code>/set_group</code> ngay tại đây để bot tự động chuyển toàn bộ thông báo về nhóm này, hoặc copy ID trên dán vào Dashboard!`
      : `👤 <b>Thông Tin Cá Nhân:</b>\n• Tên: <b>${fromName}</b>\n• <b>User Chat ID:</b> <code>${chatId}</code>`;
    await sendTelegramMessage(reply, chatId);
    return;
  }

  // Lệnh cài đặt nhóm nhận thông báo trực tiếp từ Telegram
  if (cmd === '/set_group' || cmd === '/setgroup' || cmd === '/set_chat') {
    if (!isGroup) {
      await sendTelegramMessage('⚠️ Lệnh <code>/set_group</code> chỉ dùng bên trong Nhóm Telegram để cấu hình nhóm nhận tin.', chatId);
      return;
    }

    const previousId = String(botConfig.chatId || '').trim();
    botConfig.chatId = String(chatId);

    // Lưu người vừa gõ lệnh vào allowedChatIds để họ vẫn có quyền điều khiển các lệnh
    if (fromUserId && !botConfig.allowedChatIds?.includes(String(fromUserId))) {
      botConfig.allowedChatIds = [...(botConfig.allowedChatIds || []), String(fromUserId)];
    }
    if (previousId && previousId !== String(chatId) && !botConfig.allowedChatIds?.includes(previousId)) {
      botConfig.allowedChatIds = [...(botConfig.allowedChatIds || []), previousId];
    }

    saveBotConfig(botConfig);

    await sendTelegramMessage(
      `✅ <b>ĐÃ CÀI ĐẶT NHẬN THÔNG BÁO VÀO NHÓM THÀNH CÔNG!</b>\n` +
      `Từ bây giờ toàn bộ thông báo bài đăng Fanpage & Group, cảnh báo checkpoint và báo cáo tổng kết 22h tối sẽ được gửi trực tiếp vào nhóm <b>${message.chat.title || 'này'}</b>.\n\n` +
      `📌 <b>Group Chat ID đã lưu:</b> <code>${chatId}</code>`,
      chatId
    );
    return;
  }

  if (!isAuthorizedChat(chatId, fromUserId)) {
    console.warn(`[Bot Security] Chặn tin nhắn từ Chat ID lạ: ${chatId} (${fromName})`);
    await sendTelegramMessage(
      isGroup
        ? `⛔ <b>Nhóm chưa được cấp quyền</b>\nGroup Chat ID (<code>${chatId}</code>) chưa được cấu hình nhận tin. Gõ <code>/set_group</code> tại nhóm này hoặc copy mã <code>${chatId}</code> dán vào Dashboard.`
        : `⛔ <b>Từ chối quyền truy cập</b>\nChat ID của bạn (<code>${chatId}</code>) chưa được cấp quyền điều khiển hệ thống này. Vui lòng thêm Chat ID vào Dashboard Control Center.`,
      chatId,
    );
    return;
  }

  switch (cmd) {
    case '/start':
    case '/help': {
      const helpText = [
        `👋 <b>Xin chào ${fromName}!</b>`,
        'Chào mừng bạn đến với hệ thống <b>DUDI Control Center</b> từ xa.',
        '',
        '⚡ <b>Các lệnh điều khiển nhanh:</b>',
        '• <code>/status</code>: Kiểm tra trạng thái toàn bộ máy chủ & tài khoản',
        '• <code>/check_tin</code>: Quét & kiểm tra tin nhắn mới tất cả các tài khoản',
        '• <code>/screenshot</code>: Chụp màn hình tab Chrome đang hoạt động',
        '• <code>/post_now</code>: Kích hoạt đăng bài khẩn cấp ngay lập tức',
        '• <code>/restart</code>: Khởi động lại toàn bộ hệ thống (Port 3000-3004)',
        '',
        '🔔 <i>Hệ thống tự động báo tin nhắn mới từ khách hàng, gửi ảnh lỗi tức thì và Báo cáo tổng kết lúc 22h tối.</i>',
      ].join('\n');
      await sendTelegramMessage(helpText, chatId);
      break;
    }

    case '/status': {
      await sendTelegramMessage('🔍 <i>Đang kiểm tra toàn bộ hệ thống, vui lòng chờ 1-2 giây...</i>', chatId);
      const statusText = await getSystemStatusText();
      await sendTelegramMessage(statusText, chatId);
      break;
    }

    case '/check_tin':
    case '/tinnhan':
    case '/messages': {
      await sendTelegramMessage('🔍 <i>Đang quét tin nhắn trên tất cả tài khoản Facebook & Fanpage, vui lòng chờ...</i>', chatId);
      const reports = await checkAllAccountsMessages();

      const unreadList = reports.filter((r) => r.hasUnread && r.unreadCount > 0);

      const msgLines = [
        '📬 <b>BÁO CÁO TIN NHẮN TẤT CẢ TÀI KHOẢN</b>',
        '━━━━━━━━━━━━━━━━━━━━',
      ];

      if (reports.length === 0) {
        msgLines.push('⚠️ <i>Chưa cấu hình tài khoản nào trên hệ thống.</i>');
      } else {
        reports.forEach((r, idx) => {
          const acc = r.account;
          if (!r.online) {
            msgLines.push(`${idx + 1}. <b>${acc.name}</b> (${acc.type} - Port ${acc.port}):\n   ⚪ <i>Chrome chưa bật</i>`);
          } else if (r.hasUnread && r.unreadCount > 0) {
            msgLines.push(
              `${idx + 1}. <b>${acc.name}</b> (${acc.type} - Port ${acc.port}):\n   🔴 <b>Có ${r.unreadCount} tin nhắn mới!</b>${r.sender ? ` (Khách: ${r.sender})` : ''}`,
            );
          } else {
            msgLines.push(`${idx + 1}. <b>${acc.name}</b> (${acc.type} - Port ${acc.port}):\n   🟢 <i>Không có tin nhắn mới</i>`);
          }
        });
      }

      msgLines.push('━━━━━━━━━━━━━━━━━━━━');
      if (unreadList.length > 0) {
        msgLines.push(`🚨 <i>Phát hiện <b>${unreadList.length}</b> tài khoản có tin nhắn mới chờ phản hồi!</i>`);
      } else {
        msgLines.push('✨ <i>Tất cả tài khoản đang bật đều đã được phản hồi đầy đủ!</i>');
      }

      await sendTelegramMessage(msgLines.join('\n'), chatId);

      // Gửi ảnh chụp màn hình của các tài khoản có tin nhắn chưa đọc
      for (const unreadAcc of unreadList) {
        if (unreadAcc.screenshot) {
          await sendTelegramPhoto(
            unreadAcc.screenshot,
            `📸 <b>Hộp thư của ${unreadAcc.account.name} (Port ${unreadAcc.account.port})</b>\n📩 <b>${unreadAcc.unreadCount} tin nhắn mới</b>`,
            chatId,
          );
        }
      }
      break;
    }

    case '/screenshot': {
      await sendTelegramMessage('📸 <i>Đang chụp màn hình tab Chrome đang mở...</i>', chatId);
      const shot = await captureAnyScreenshot();
      if (shot && shot.buffer) {
        const timeNow = new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
        await sendTelegramPhoto(
          shot.buffer,
          `📸 <b>Ảnh chụp màn hình từ ${shot.source}</b>\n⏰ Thời gian: <code>${timeNow}</code>`,
          chatId,
        );
      } else {
        await sendTelegramMessage('⚠️ Không thể kết nối tới màn hình hoặc không có tab Chrome nào đang mở để chụp.', chatId);
      }
      break;
    }

    case '/restart': {
      await sendTelegramMessage(
        '⏳ <b>Đang kích hoạt quy trình khởi động lại hệ thống...</b>\n• Tắt các tiến trình cũ (3000, 3001, 3004)\n• Cập nhật build và khởi chạy lại dịch vụ ngầm.\n<i>Vui lòng chờ khoảng 15-25 giây.</i>',
        chatId,
      );

      const psScript = path.join(__dirname, 'scripts', 'kill-and-restart.ps1');
      if (fs.existsSync(psScript)) {
        spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', psScript], {
          detached: true,
          stdio: 'ignore',
          cwd: __dirname,
        }).unref();
      }

      // Đợi 20 giây sau kiểm tra và thông báo online lại
      setTimeout(async () => {
        const p3000 = await checkPort(3000);
        const p3001 = await checkPort(3001);
        const allOk = p3000 && p3001;

        if (allOk) {
          await sendTelegramMessage(
            '✅ <b>HỆ THỐNG ĐÃ KHỞI ĐỘNG LẠI THÀNH CÔNG!</b>\n🟢 Dashboard 3000: Online\n🟢 Bridge ChatGPT & FB Cá Nhân 3001: Online\n🚀 Hệ thống đã sẵn sàng nhận việc!',
            chatId,
          );
        } else {
          await sendTelegramMessage(
            `⚠️ <b>Khởi động lại hoàn tất nhưng một số port chưa sẵn sàng:</b>\n• 3000: ${p3000 ? '🟢' : '🔴'}\n• 3001: ${p3001 ? '🟢' : '🔴'}\nVui lòng gửi lại lệnh <code>/status</code> sau vài giây.`,
            chatId,
          );
        }
      }, 20000);
      break;
    }

    case '/post_now': {
      await sendTelegramMessage('🚀 <b>Đang kích hoạt quy trình Auto-Pilot!</b>\n1️⃣ Gemini AI viết bài & sinh prompt ảnh\n2️⃣ ChatGPT Web Bridge tạo ảnh\n3️⃣ Đăng tự động lên các kênh Facebook\n<i>Vui lòng chờ khoảng 1-2 phút...</i>', chatId);
      try {
        runAutoPilotCycle().then((res) => {
          sendTelegramMessage(`✅ <b>Auto-Pilot đăng bài thành công!</b>\n📌 Tiêu đề: ${res.title}\n⏱️ Thời gian: ${Math.round(res.durationMs / 1000)}s`, chatId);
        }).catch((err) => {
          sendTelegramMessage(`❌ <b>Auto-Pilot thất bại:</b> ${err.message}`, chatId);
        });
      } catch (e) {
        await sendTelegramMessage(`⚠️ Lỗi khởi chạy Auto-Pilot: ${e.message}`, chatId);
      }
      break;
    }

    default:
      await sendTelegramMessage(
        `❓ Lệnh không nhận diện: <code>${text}</code>\nGửi <code>/help</code> hoặc chọn các phím bấm bên dưới để điều khiển.`,
        chatId,
      );
      break;
  }
}

// -------------------------------------------------------------
// BÁO CÁO TRẠNG THÁI HỆ THỐNG (/status)
// -------------------------------------------------------------
async function getSystemStatusText() {
  const [p3000, p3001, p3002, p5678] = await Promise.all([
    checkPort(3000),
    checkPort(3001),
    checkPort(3002), // Facebook Groups Server
    checkPort(5678), // n8n port mặc định
  ]);

  const [c9222, c9223, c9224, c9242] = await Promise.all([
    checkPort(9222), // ChatGPT 1
    checkPort(9223), // Facebook Chrome Nick 1
    checkPort(9224), // Facebook Chrome Nick 2
    checkPort(9242), // ChatGPT 2 Quota Fallback
  ]);

  // Đọc lịch sử hôm nay
  let todaySuccess = 0;
  let todayFailed = 0;
  const todayStr = new Date().toISOString().slice(0, 10);

  try {
    if (fs.existsSync(POST_HISTORY_PATH)) {
      const history = JSON.parse(fs.readFileSync(POST_HISTORY_PATH, 'utf-8'));
      const entries = Array.isArray(history.entries) ? history.entries : [];
      entries.forEach((entry) => {
        if (entry.timestamp && entry.timestamp.startsWith(todayStr)) {
          if (entry.status === 'success') todaySuccess++;
          else if (entry.status === 'failed') todayFailed++;
        }
      });
    }
  } catch {}

  const nowStr = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

  return [
    '📊 <b>TRẠNG THÁI HỆ THỐNG DUDI</b>',
    `⏰ <i>Cập nhật: ${nowStr}</i>`,
    '',
    '🖥️ <b>Máy chủ & Dịch vụ:</b>',
    `• Dashboard (3000): ${p3000 ? '🟢 Online' : '🔴 Mất kết nối'}`,
    `• Bridge ChatGPT & Fanpage (3001): ${p3001 ? '🟢 Online' : '🔴 Mất kết nối'}`,
    `• Facebook Groups Bridge (3002): ${p3002 ? '🟢 Online' : '🔴 Mất kết nối'}`,
    `• n8n Workflow (5678): ${p5678 ? '🟢 Online' : '⚪ Chưa bật'}`,
    '',
    '🌐 <b>Chrome Debugging & Nick FB/AI:</b>',
    `• ChatGPT 1 (9222): ${c9222 ? '🟢 Sẵn sàng' : '⚪ Đang tắt'}`,
    `• ChatGPT 2 Fallback (9242): ${c9242 ? '🟢 Sẵn sàng' : '⚪ Đang tắt'}`,
    `• Facebook Nick 1 (9223): ${c9223 ? '🟢 Sẵn sàng' : '⚪ Đang tắt'}`,
    `• Facebook Nick 2 (9224): ${c9224 ? '🟢 Sẵn sàng' : '⚪ Đang tắt'}`,
    '',
    '📈 <b>Tiến độ đăng bài hôm nay:</b>',
    `• Đã đăng thành công: <b>${todaySuccess}</b> bài`,
    `• Bài lỗi: <b>${todayFailed}</b> bài`,
    `• Checkpoint: <b>0</b> tài khoản bị chặn`,
    '',
    '💡 <i>Gõ /screenshot để xem màn hình hoặc /restart để khởi động lại máy chủ.</i>',
  ].join('\n');
}

// -------------------------------------------------------------
// WATCHDOG GIÁM SÁT ĐỊNH KỲ (Mỗi 30s)
// -------------------------------------------------------------
async function runWatchdogCheck() {
  if (!botConfig.enableAlerts) return;
  const token = (botConfig.botToken || '').trim();
  const chatId = (botConfig.chatId || '').trim();
  if (!token || !chatId) return;

  // 1. Kiểm tra Server Bridge
  if (botConfig.alertOnServerDown) {
    const servers = [
      { port: 3001, name: 'Server 1 (ChatGPT & Facebook Cá Nhân)' },
    ];

    for (const s of servers) {
      const isUp = await checkPort(s.port);
      const wasDown = serverDownState[s.port] === true;

      if (!isUp && !wasDown) {
        // Server vừa bị sập
        serverDownState[s.port] = true;
        console.warn(`[Watchdog Alert] ${s.name} trên port ${s.port} bị mất kết nối!`);

        // Cố gắng chụp ảnh màn hình hiện tại
        const shot = await captureAnyScreenshot();
        const alertMsg = [
          '🚨 <b>CẢNH BÁO MẤT KẾT NỐI SERVER BRIDGE!</b>',
          '',
          `⚠️ <b>Dịch vụ:</b> ${s.name} (Port ${s.port})`,
          '❌ <b>Tình trạng:</b> Không phản hồi hoặc tiến trình đã bị dừng.',
          `⏰ <b>Thời gian:</b> <code>${new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</code>`,
          '',
          '👉 <i>Bạn có thể gửi lệnh <code>/restart</code> để tự động khởi động lại từ xa.</i>',
        ].join('\n');

        if (shot && shot.buffer) {
          await sendTelegramPhoto(shot.buffer, alertMsg);
        } else {
          await sendTelegramMessage(alertMsg);
        }
      } else if (isUp && wasDown) {
        // Server đã hồi phục
        serverDownState[s.port] = false;
        await sendTelegramMessage(
          `✅ <b>HỒI PHỤC:</b> ${s.name} (Port ${s.port}) đã hoạt động bình thường trở lại!`,
        );
      }
    }
  }

  // 2. Kiểm tra Checkpoint trên các tab Chrome
  if (botConfig.alertOnCheckpoint) {
    const monitoredAccs = getAllMonitoredAccounts();
    const cdpPorts = Array.from(new Set([9222, 9242, ...monitoredAccs.map((a) => a.port)]));
    for (const cdpPort of cdpPorts) {
      try {
        const tabs = await fetchJson(`http://127.0.0.1:${cdpPort}/json/list`, 800);
        if (Array.isArray(tabs)) {
          const checkpointTab = tabs.find(
            (t) => t.url && (t.url.includes('/checkpoint') || t.url.includes('login.php?next=checkpoint')),
          );

          if (checkpointTab) {
            const accKey = `cp_${cdpPort}`;
            if (!checkpointAlertState[accKey]) {
              checkpointAlertState[accKey] = true;
              console.warn(`[Watchdog Alert] Phát hiện checkpoint trên Port ${cdpPort}: ${checkpointTab.url}`);

              const shot = await captureCdpScreenshot(cdpPort);
              const cpMsg = [
                '⚠️ <b>CẢNH BÁO CHECKPOINT TÀI KHOẢN FACEBOOK!</b>',
                '',
                `📱 <b>Chrome Port:</b> <code>${cdpPort}</code>`,
                `🔗 <b>URL:</b> <code>${checkpointTab.url.slice(0, 100)}</code>`,
                '🛡️ <b>Mô tả:</b> Tài khoản Facebook yêu cầu xác minh bảo mật hoặc đổi mật khẩu.',
                `⏰ <b>Thời gian:</b> <code>${new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</code>`,
                '',
                '👉 <i>Vui lòng mở máy tính hoặc Remote UltraViewer để giải quyết checkpoint.</i>',
              ].join('\n');

              if (shot) {
                await sendTelegramPhoto(shot, cpMsg);
              } else {
                await sendTelegramMessage(cpMsg);
              }
            }
          } else {
            checkpointAlertState[`cp_${cdpPort}`] = false;
          }
        }
      } catch {}
    }
  }

  // 3. Kiểm tra Tin Nhắn Mới trên tất cả các tài khoản Facebook & Fanpage
  if (botConfig.alertOnNewMessages !== false) {
    try {
      const accounts = getAllMonitoredAccounts();
      for (const acc of accounts) {
        const res = await checkAccountMessages(acc);
        if (!res) continue;

        const accKey = acc.id || `acc_${acc.port}`;
        const prevCount = lastUnreadMessageCount[accKey] || 0;

        if (res.hasUnread && res.unreadCount > 0) {
          // Chỉ gửi tin nhắn cảnh báo khi số tin nhắn mới TĂNG LÊN so với lần kiểm tra trước (tránh gửi lặp lại)
          if (res.unreadCount > prevCount) {
            lastUnreadMessageCount[accKey] = res.unreadCount;
            console.log(`[Watchdog] 🔔 Phát hiện tin nhắn mới trên ${acc.name} (${acc.type} - Port ${acc.port}): ${res.unreadCount} tin`);

            const timeNow = new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
            const alertMsg = [
              '🔔 <b>CÓ TIN NHẮN MỚI TỪ KHÁCH HÀNG!</b>',
              '━━━━━━━━━━━━━━━━━━━━',
              `👤 <b>Tài khoản:</b> <b>${acc.name}</b> (${acc.type})`,
              `📱 <b>Cổng Chrome:</b> <code>Port ${acc.port}</code>`,
              `📩 <b>Số tin chưa đọc:</b> <b>${res.unreadCount}</b> tin nhắn mới`,
              res.sender ? `💬 <b>Khách gửi:</b> <b>${res.sender}</b>` : '',
              res.snippet ? `📝 <b>Nội dung:</b> <i>"${res.snippet.slice(0, 150)}"</i>` : '',
              `⏰ <b>Thời gian:</b> <code>${timeNow}</code>`,
              '━━━━━━━━━━━━━━━━━━━━',
              '👉 <i>Vui lòng mở Facebook hoặc Messenger để phản hồi khách hàng kịp thời!</i>',
            ].filter(Boolean).join('\n');

            if (res.screenshot) {
              await sendTelegramPhoto(res.screenshot, alertMsg);
            } else {
              await sendTelegramMessage(alertMsg);
            }
          }
        } else if (res.online && res.unreadCount === 0 && prevCount > 0) {
          // Người dùng đã đọc hoặc trả lời tin nhắn -> reset bộ đếm về 0
          lastUnreadMessageCount[accKey] = 0;
        }
      }
    } catch (msgErr) {
      console.error('[Watchdog Message Check Error]', msgErr.message);
    }
  }
}

// -------------------------------------------------------------
// DAILY DIGEST (BÁO CÁO TỔNG KẾT 22H TỐI)
// -------------------------------------------------------------
async function checkDailyDigest() {
  if (!botConfig.enableDailyDigest) return;
  const token = (botConfig.botToken || '').trim();
  const chatId = (botConfig.chatId || '').trim();
  if (!token || !chatId) return;

  const targetTime = botConfig.dailyDigestTime || '22:00';
  const now = new Date();
  const vnTimeStr = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' });
  const todayDateStr = now.toISOString().slice(0, 10);

  if (vnTimeStr === targetTime && lastDigestDate !== todayDateStr) {
    lastDigestDate = todayDateStr;
    await triggerDailyDigest();
  }
}

async function triggerDailyDigest() {
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const nowFormatted = now.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

  let successPosts = 0;
  let failedPosts = 0;
  const groupsPosted = new Set();
  const channelsCount = { fanpage: 0, groups: 0, personal: 0, chatgpt: 0 };

  try {
    if (fs.existsSync(POST_HISTORY_PATH)) {
      const hist = JSON.parse(fs.readFileSync(POST_HISTORY_PATH, 'utf-8'));
      const entries = Array.isArray(hist.entries) ? hist.entries : [];
      entries.forEach((e) => {
        if (e.timestamp && e.timestamp.startsWith(todayStr)) {
          if (e.status === 'success') {
            successPosts++;
            if (e.channel) channelsCount[e.channel] = (channelsCount[e.channel] || 0) + 1;
            if (e.targetUrl) groupsPosted.add(e.targetUrl);
          } else if (e.status === 'failed') {
            failedPosts++;
          }
        }
      });
    }
  } catch {}

  const digestText = [
    `🌙 <b>BÁO CÁO TỔNG KẾT NGÀY (${nowFormatted})</b>`,
    '━━━━━━━━━━━━━━━━━━━━',
    `✅ <b>Đăng thành công:</b> <b>${successPosts}</b> bài viết`,
    `👥 <b>Số nhóm & kênh đã phủ sóng:</b> <b>${groupsPosted.size}</b> nhóm/trang`,
    `❌ <b>Số bài viết gặp lỗi:</b> <b>${failedPosts}</b> bài`,
    '🛡️ <b>Trạng thái nick:</b> <b>0</b> tài khoản bị checkpoint',
    '',
    '📊 <b>Phân bổ theo kênh:</b>',
    `• Facebook Groups: ${channelsCount.groups || 0} bài`,
    `• Facebook Fanpage: ${channelsCount.fanpage || 0} bài`,
    `• Trang cá nhân: ${channelsCount.personal || 0} bài`,
    `• Tạo ảnh ChatGPT: ${channelsCount.chatgpt || 0} ảnh`,
    '━━━━━━━━━━━━━━━━━━━━',
    '🎉 <i>Toàn bộ hệ thống hoạt động ổn định và sẵn sàng cho lịch trình ngày mai!</i>',
  ].join('\n');

  return await sendTelegramMessage(digestText);
}

// -------------------------------------------------------------
// TELEGRAM LONG POLLING
// -------------------------------------------------------------
async function startTelegramPolling() {
  if (isPolling) return;
  isPolling = true;

  console.log('[Telegram Bot] Bắt đầu Long Polling...');

  while (isPolling) {
    botConfig = loadBotConfig();
    const token = (botConfig.botToken || '').trim();

    if (!token) {
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }

    try {
      const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${pollOffset}&timeout=25`;
      const res = await fetch(url, { signal: AbortSignal.timeout(35000) });
      const data = await res.json();

      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          pollOffset = update.update_id + 1;
          if (update.message) {
            handleTelegramMessage(update.message).catch((err) => {
              console.error('[Bot Handle Message Error]', err);
            });
          }
        }
      } else if (!data.ok) {
        console.warn('[Telegram Poll Warning]', data.description);
        await new Promise((r) => setTimeout(r, 6000));
      }
    } catch (err) {
      // Network timeout bình thường của long polling, chờ 2s lặp lại
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

// -------------------------------------------------------------
// INTERNAL EXPRESS ROUTES (Port 3004)
// -------------------------------------------------------------
app.get('/health', async (req, res) => {
  res.json({
    ok: true,
    service: 'dudi-telegram-bot',
    port: PORT,
    hasToken: Boolean(botConfig.botToken),
    hasChatId: Boolean(botConfig.chatId),
    enableAlerts: botConfig.enableAlerts,
    enableDailyDigest: botConfig.enableDailyDigest,
  });
});

app.get('/detected-group', (req, res) => {
  res.json({ ok: true, group: lastDetectedGroup });
});

app.post('/reload-config', (req, res) => {
  botConfig = loadBotConfig();
  res.json({ ok: true, message: 'Đã tải lại cấu hình bot', config: botConfig });
});

// Nhận cảnh báo lỗi tức thì từ server.mjs / group-server.mjs
app.post('/alert', async (req, res) => {
  const { title, details, imageBase64, channel, targetUrl } = req.body;
  if (!botConfig.enableAlerts) return res.json({ ok: false, reason: 'alerts_disabled' });

  const timeNow = new Date().toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  const alertText = [
    `🚨 <b>CẢNH BÁO LỖI: ${title || 'Lỗi xử lý tác vụ'}</b>`,
    '',
    channel ? `📡 <b>Kênh:</b> ${channel}` : '',
    targetUrl ? `🔗 <b>Mục tiêu:</b> <code>${targetUrl}</code>` : '',
    `❌ <b>Chi tiết:</b> <code>${String(details || 'Không rõ nguyên nhân').slice(0, 300)}</code>`,
    `⏰ <b>Thời gian:</b> <code>${timeNow}</code>`,
    '',
    '👉 <i>Bạn có thể gửi lệnh <code>/screenshot</code> để kiểm tra hoặc <code>/restart</code> để khởi động lại.</i>',
  ].filter(Boolean).join('\n');

  try {
    if (imageBase64) {
      const buf = Buffer.from(imageBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      await sendTelegramPhoto(buf, alertText);
    } else {
      // Tự động chụp màn hình tab đang lỗi
      const shot = await captureAnyScreenshot();
      if (shot && shot.buffer) {
        await sendTelegramPhoto(shot.buffer, alertText);
      } else {
        await sendTelegramMessage(alertText);
      }
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Gửi tin nhắn thông báo thông thường
app.post('/notify', async (req, res) => {
  const { message, chatId } = req.body;
  const result = await sendTelegramMessage(message, chatId);
  res.json(result);
});

// Kích hoạt Daily Digest thủ công
app.post('/trigger-digest', async (req, res) => {
  const result = await triggerDailyDigest();
  res.json(result);
});

// Endpoint quét tin nhắn tất cả tài khoản
app.get('/check-messages', async (req, res) => {
  try {
    const reports = await checkAllAccountsMessages();
    const formatted = reports.map((r) => ({
      accountId: r.account.id,
      name: r.account.name,
      type: r.account.type,
      port: r.account.port,
      online: r.online,
      hasUnread: r.hasUnread,
      unreadCount: r.unreadCount,
      sender: r.sender || '',
      snippet: r.snippet || '',
      hasScreenshot: Boolean(r.screenshot),
    }));
    res.json({ ok: true, reports: formatted });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// -------------------------------------------------------------
// AUTO-PILOT SCHEDULER (Kiểm tra lịch đăng mỗi 30s)
// -------------------------------------------------------------
let isAutoPilotRunning = false;
let lastAutoPilotRunSlot = '';

async function checkAutoPilotSchedule() {
  try {
    const scheduleConfig = loadScheduleConfig();
    if (!scheduleConfig.enabled) {
      return;
    }

    const now = new Date();
    const vnTimeStr = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' });
    const todayDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }); // YYYY-MM-DD
    const currentSlot = `${todayDateStr}_${vnTimeStr}`;

    // Lấy lịch riêng biệt cho từng kênh (Personal, Fanpage)
    const channelSchedules = scheduleConfig.channelSchedules || {
      personal: { enabled: true, times: scheduleConfig.scheduleTimes || ['08:30', '11:30', '14:30', '19:30'] },
      fanpage: { enabled: false, times: [] },
      groups: { enabled: false, times: [] },
    };

    const triggeredChannels = {
      personal: Boolean(channelSchedules.personal?.enabled !== false && channelSchedules.personal?.times?.includes(vnTimeStr)),
      fanpage: Boolean(channelSchedules.fanpage?.enabled && channelSchedules.fanpage?.times?.includes(vnTimeStr)),
      groups: false,
    };

    const hasAnyTrigger = triggeredChannels.personal || triggeredChannels.fanpage;

    if (hasAnyTrigger && lastAutoPilotRunSlot !== currentSlot) {
      if (isAutoPilotRunning) {
        console.warn(`[Scheduler] Bỏ qua lượt ${vnTimeStr} do một tác vụ Auto-Pilot khác đang chạy.`);
        return;
      }

      lastAutoPilotRunSlot = currentSlot;
      isAutoPilotRunning = true;
      const triggeredNames = [
        triggeredChannels.groups ? 'Facebook Groups (Nhóm)' : null,
        triggeredChannels.fanpage ? 'Fanpage' : null,
      ].filter(Boolean).join(', ');

      console.log(`[Scheduler] ⏰ Đến khung giờ hẹn ${vnTimeStr}! Bắt đầu kích hoạt Auto-Pilot cho: ${triggeredNames}...`);

      try {
        for (const [channel, triggered] of Object.entries(triggeredChannels)) {
          if (!triggered) continue;
          const sheetName = channelSchedules[channel]?.sheetByTime?.[vnTimeStr]
            || scheduleConfig.googleSheets?.channelSheetMapping?.[channel]
            || scheduleConfig.googleSheets?.sheetName || 'topics';
          const rawAccountSetting = channelSchedules[channel]?.accountsByTime?.[vnTimeStr]
            ?? channelSchedules[channel]?.accountByTime?.[vnTimeStr];

          let targetAccounts = null;
          if (Array.isArray(rawAccountSetting)) {
            targetAccounts = rawAccountSetting.length > 0 ? rawAccountSetting : null;
          } else if (rawAccountSetting) {
            targetAccounts = [rawAccountSetting];
          }

          console.log(`[Scheduler] Đang chạy kênh "${channel}" khung giờ ${vnTimeStr} (Sheet: "${sheetName}", Tài khoản: ${Array.isArray(targetAccounts) ? targetAccounts.join(', ') : (targetAccounts || 'Tự động')})...`);
          try {
            await runAutoPilotCycle({
              channels: { [channel]: true },
              accounts: { [channel]: targetAccounts },
              sheetName,
            });
          } catch (err) {
            console.error(`[Scheduler] Lỗi kênh ${channel} lúc ${vnTimeStr}:`, err.message);
          }
        }
      } catch (err) {
        console.error(`[Scheduler Error] Thất bại khi chạy lượt ${vnTimeStr}:`, err.message);
      } finally {
        isAutoPilotRunning = false;
      }
    }
  } catch (err) {
    console.error('[Scheduler Check Error]', err.message);
  }
}

// Endpoint kích hoạt Auto-Pilot thủ công từ Dashboard hoặc script (Hỗ trợ n8n options)
app.post('/trigger-autopilot', async (req, res) => {
  if (isAutoPilotRunning) {
    return res.status(429).json({ ok: false, error: 'Một chu trình Auto-Pilot đang chạy. Vui lòng thử lại sau giây lát.' });
  }
  isAutoPilotRunning = true;
  const options = req.body || {};

  try {
    const result = await runAutoPilotCycle(options);
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    isAutoPilotRunning = false;
  }
});

// Endpoint theo dõi tiến độ thời gian thực của Auto-Pilot
app.get('/autopilot-status', (req, res) => {
  res.json(getAutoPilotProgress());
});

// Endpoint chạy riêng 1 node (Single Step Execution giống n8n)
app.post('/execute-node', async (req, res) => {
  const { nodeType, payload } = req.body || {};
  try {
    const result = await executeSingleNode(nodeType, payload);
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Endpoint tự động tìm kiếm và nạp chủ đề mới vào Google Sheet
app.post('/generate-topics', async (req, res) => {
  const { niche, count = 5, sheetName = 'topics', customPrompt } = req.body || {};
  try {
    const result = await autoDiscoverAndAppendTopics({ niche, count, sheetName, customPrompt });
    res.json({ ok: true, result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// -------------------------------------------------------------
// TỰ ĐỘNG BỔ SUNG CHỦ ĐỀ VÀO GOOGLE SHEET (AUTO REFILL / SCHEDULE)
// -------------------------------------------------------------
let isTopicGenerating = false;
let lastTopicCheckSlot = '';
let lastTopicGenDate = '';

async function checkAutoTopicRefillSchedule() {
  try {
    const scheduleConfig = loadScheduleConfig();
    const autoGen = scheduleConfig.autoTopicGeneration;
    if (!autoGen?.enabled) return;

    const sid = scheduleConfig.googleSheets?.spreadsheetId;
    if (!sid) return;

    const now = new Date();
    const vnTimeStr = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' });
    const todayDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    const targetSheet = autoGen.targetSheet || scheduleConfig.googleSheets?.sheetName || 'topics';
    const triggerMode = autoGen.triggerMode || 'auto_refill';

    let shouldGenerate = false;
    let reason = '';

    if (triggerMode === 'auto_refill') {
      const checkSlot = `${todayDateStr}_${vnTimeStr.slice(0, 4)}0`;
      if (lastTopicCheckSlot !== checkSlot) {
        lastTopicCheckSlot = checkSlot;
        const overview = await getSheetTopicsOverview(sid, targetSheet);
        const minPending = autoGen.minPendingThreshold || 3;
        if (overview.pending <= minPending) {
          shouldGenerate = true;
          reason = `Số chủ đề chờ đăng (${overview.pending}) trong sheet [${targetSheet}] còn ít hơn ngưỡng tối thiểu (${minPending})`;
        }
      }
    } else if (triggerMode === 'scheduled') {
      const targetTime = autoGen.scheduleTime || '07:00';
      const slotKey = `${todayDateStr}_${targetTime}`;
      if (vnTimeStr === targetTime && lastTopicGenDate !== slotKey) {
        lastTopicGenDate = slotKey;
        shouldGenerate = true;
        reason = `Đến khung giờ tự động nạp chủ đề hàng ngày (${targetTime})`;
      }
    }

    if (shouldGenerate && !isTopicGenerating) {
      isTopicGenerating = true;
      console.log(`[AutoTopicGen] 🤖 Bắt đầu tự động tìm kiếm & nạp chủ đề: ${reason}`);
      try {
        const count = autoGen.quantityPerRun || 5;
        const result = await autoDiscoverAndAppendTopics({
          niche: autoGen.niche,
          count,
          sheetName: targetSheet,
        });
        console.log(`[AutoTopicGen] ✅ Đã nạp thành công ${result.count} chủ đề mới vào Google Sheet [${targetSheet}]!`);
        if (botConfig.botToken && botConfig.chatId) {
          await sendTelegramMessage(
            `🤖 <b>TỰ ĐỘNG BỔ SUNG CHỦ ĐỀ VÀO GOOGLE SHEET</b>\n\n` +
            `📋 <b>Lý do:</b> ${reason}\n` +
            `📊 <b>Số lượng nạp:</b> ${result.count} bài vào sheet <code>${targetSheet}</code>\n` +
            `💡 <b>Chủ đề mẫu:</b>\n- <i>${result.topics?.[0]?.topic || ''}</i>\n\n` +
            `⏰ <i>Hệ thống sẽ tự động viết bài và đăng theo lịch đã cài đặt!</i>`
          );
        }
      } catch (genErr) {
        console.error('[AutoTopicGen Error]', genErr.message);
      } finally {
        isTopicGenerating = false;
      }
    }
  } catch (err) {
    console.error('[AutoTopicGen Check Error]', err.message);
  }
}

// -------------------------------------------------------------
// KHỞI ĐỘNG SERVER & TIMERS
// -------------------------------------------------------------
app.listen(PORT, '127.0.0.1', () => {
  console.log(`[Telegram Bot Service] Đang chạy tại http://127.0.0.1:${PORT}`);
  
  // Bắt đầu Telegram Long Polling
  startTelegramPolling();

  // Watchdog kiểm tra mỗi 30s
  const checkIntervalMs = (botConfig.checkIntervalSeconds || 30) * 1000;
  setInterval(runWatchdogCheck, checkIntervalMs);

  // Kiểm tra Daily Digest mỗi phút
  setInterval(checkDailyDigest, 60000);

  // Kiểm tra Lịch trình Auto-Pilot mỗi 30s
  setInterval(checkAutoPilotSchedule, 30000);

  // Kiểm tra Bổ sung chủ đề tự động vào Google Sheet mỗi 30s
  setInterval(checkAutoTopicRefillSchedule, 30000);
});

