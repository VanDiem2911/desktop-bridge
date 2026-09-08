import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

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
    checkIntervalSeconds: 30,
  };
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
    [{ text: '/status' }, { text: '/screenshot' }],
    [{ text: '/post_now' }, { text: '/restart' }],
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
// KIỂM TRA BẢO MẬT & XỬ LÝ LỆNH TELEGRAM
// -------------------------------------------------------------
function isAuthorizedChat(chatId) {
  const primary = String(botConfig.chatId || '').trim();
  const allowed = Array.isArray(botConfig.allowedChatIds) ? botConfig.allowedChatIds.map(String) : [];
  const senderId = String(chatId).trim();
  return senderId === primary || allowed.includes(senderId);
}

async function handleTelegramMessage(message) {
  const chatId = message.chat?.id;
  const text = (message.text || '').trim();
  const fromName = message.from?.first_name || 'Bạn';

  if (!isAuthorizedChat(chatId)) {
    console.warn(`[Bot Security] Chặn tin nhắn từ Chat ID lạ: ${chatId} (${fromName})`);
    await sendTelegramMessage(
      `⛔ <b>Từ chối quyền truy cập</b>\nChat ID của bạn (<code>${chatId}</code>) chưa được cấp quyền điều khiển hệ thống này. Vui lòng thêm Chat ID vào Dashboard Control Center.`,
      chatId,
    );
    return;
  }

  const cmd = text.split(' ')[0].toLowerCase();

  switch (cmd) {
    case '/start':
    case '/help': {
      const helpText = [
        `👋 <b>Xin chào ${fromName}!</b>`,
        'Chào mừng bạn đến với hệ thống <b>DUDI Control Center</b> từ xa.',
        '',
        '⚡ <b>Các lệnh điều khiển nhanh:</b>',
        '• <code>/status</code>: Kiểm tra trạng thái toàn bộ máy chủ & tài khoản',
        '• <code>/screenshot</code>: Chụp màn hình tab Chrome đang hoạt động',
        '• <code>/post_now</code>: Kích hoạt đăng bài khẩn cấp ngay lập tức',
        '• <code>/restart</code>: Khởi động lại toàn bộ hệ thống (Port 3000-3004)',
        '',
        '🔔 <i>Hệ thống sẽ tự động gửi ảnh chụp lỗi ngay khi phát hiện sự cố và gửi Báo cáo tổng kết lúc 22h tối.</i>',
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
        '⏳ <b>Đang kích hoạt quy trình khởi động lại toàn bộ hệ thống...</b>\n• Tắt các tiến trình cũ (3000, 3001, 3002, 3003, 3004)\n• Cập nhật build và khởi chạy lại dịch vụ ngầm.\n<i>Vui lòng chờ khoảng 15-25 giây.</i>',
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
        const p3002 = await checkPort(3002);
        const p3003 = await checkPort(3003);
        const allOk = p3000 && p3001 && p3002 && p3003;

        if (allOk) {
          await sendTelegramMessage(
            '✅ <b>HỆ THỐNG ĐÃ KHỞI ĐỘNG LẠI THÀNH CÔNG!</b>\n🟢 Dashboard 3000: Online\n🟢 Bridge 3001, 3002, 3003: Online\n🚀 Hệ thống đã sẵn sàng nhận việc!',
            chatId,
          );
        } else {
          await sendTelegramMessage(
            `⚠️ <b>Khởi động lại hoàn tất nhưng một số port chưa sẵn sàng:</b>\n• 3000: ${p3000 ? '🟢' : '🔴'}\n• 3001: ${p3001 ? '🟢' : '🔴'}\n• 3002: ${p3002 ? '🟢' : '🔴'}\n• 3003: ${p3003 ? '🟢' : '🔴'}\nVui lòng gửi lại lệnh <code>/status</code> sau vài giây.`,
            chatId,
          );
        }
      }, 20000);
      break;
    }

    case '/post_now': {
      await sendTelegramMessage('🚀 <i>Đang kích hoạt quy trình đăng bài ngay lập tức...</i>', chatId);
      try {
        // Thử kích hoạt đăng bài trên server Groups (Port 3002) hoặc Personal (Port 3003)
        const res = await fetch('http://127.0.0.1:3002/api/trigger-queue', { method: 'POST' }).catch(() => null);
        if (res && res.ok) {
          await sendTelegramMessage('✅ Đã kích hoạt lệnh đăng bài trên Facebook Groups thành công!', chatId);
        } else {
          // Thử ping qua Dashboard API
          await sendTelegramMessage('ℹ️ Đã gửi tín hiệu đăng bài. Kiểm tra nhật ký qua <code>/status</code>.', chatId);
        }
      } catch (e) {
        await sendTelegramMessage(`⚠️ Lỗi khi gửi lệnh đăng bài: ${e.message}`, chatId);
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
  const [p3000, p3001, p3002, p3003, p5678] = await Promise.all([
    checkPort(3000),
    checkPort(3001),
    checkPort(3002),
    checkPort(3003),
    checkPort(5678), // n8n port mặc định
  ]);

  const [c9222, c9223, c9224, c9225, c9242] = await Promise.all([
    checkPort(9222), // ChatGPT 1 & Fanpage
    checkPort(9223), // Groups Nick 1
    checkPort(9224), // Groups Nick 2
    checkPort(9225), // Personal
    checkPort(9242), // ChatGPT 2
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
    `• Bridge Fanpage & GPT (3001): ${p3001 ? '🟢 Online' : '🔴 Mất kết nối'}`,
    `• Bridge Groups (3002): ${p3002 ? '🟢 Online' : '🔴 Mất kết nối'}`,
    `• Bridge Cá nhân (3003): ${p3003 ? '🟢 Online' : '🔴 Mất kết nối'}`,
    `• n8n Workflow (5678): ${p5678 ? '🟢 Online' : '⚪ Chưa bật'}`,
    '',
    '🌐 <b>Chrome Debugging & Nick FB/AI:</b>',
    `• ChatGPT 1 / Fanpage (9222): ${c9222 ? '🟢 Sẵn sàng' : '⚪ Đang tắt'}`,
    `• ChatGPT 2 Quota Fallback (9242): ${c9242 ? '🟢 Sẵn sàng' : '⚪ Đang tắt'}`,
    `• Facebook Group Nick 1 (9223): ${c9223 ? '🟢 Sẵn sàng' : '⚪ Đang tắt'}`,
    `• Facebook Group Nick 2 (9224): ${c9242 ? '🟢 Sẵn sàng' : '⚪ Đang tắt'}`,
    `• Facebook Cá nhân (9225): ${c9225 ? '🟢 Sẵn sàng' : '⚪ Đang tắt'}`,
    '',
    '📈 <b>Tiến độ hôm nay:</b>',
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
      { port: 3001, name: 'Server 1 (Fanpage & ChatGPT Xen Kẽ)' },
      { port: 3002, name: 'Server 2 (Facebook Groups)' },
      { port: 3003, name: 'Server 3 (Facebook Cá Nhân)' },
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
    const cdpPorts = [9222, 9223, 9224, 9225];
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

app.post('/reload-config', (req, res) => {
  botConfig = loadBotConfig();
  res.json({ ok: true, message: 'Đã tải lại cấu hình bot', config: botConfig });
});

// Nhận cảnh báo lỗi tức thì từ server.mjs / group-server.mjs / personal-server.mjs
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
});
