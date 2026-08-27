import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getBridgeDir() {
  const candidates = [
    path.resolve(__dirname, '..'),
    path.resolve(__dirname),
    path.resolve(process.cwd()),
    path.resolve(process.cwd(), 'desktop-bridge'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'group-server.mjs')) && fs.existsSync(path.join(c, 'personal-server.mjs'))) {
      return c;
    }
  }
  return path.resolve(__dirname, '..');
}

const BRIDGE_DIR = getBridgeDir();
const HISTORY_FILE_PATH = path.join(BRIDGE_DIR, 'configs', 'post-history.json');

function ensureHistoryFile() {
  const configsDir = path.join(BRIDGE_DIR, 'configs');
  if (!fs.existsSync(configsDir)) {
    try { fs.mkdirSync(configsDir, { recursive: true }); } catch {}
  }
  if (!fs.existsSync(HISTORY_FILE_PATH)) {
    try {
      fs.writeFileSync(HISTORY_FILE_PATH, JSON.stringify({ entries: [] }, null, 2), 'utf-8');
    } catch {}
  }
}

export function readHistoryEntries() {
  ensureHistoryFile();
  try {
    if (fs.existsSync(HISTORY_FILE_PATH)) {
      const raw = fs.readFileSync(HISTORY_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.entries)) {
        return parsed.entries;
      }
    }
  } catch (err) {
    console.error('[HistoryLogger Error]', err.message);
  }
  return [];
}

export function writeHistoryEntries(entries) {
  ensureHistoryFile();
  try {
    // Giữ tối đa 1000 bản ghi mới nhất để file luôn nhẹ và nhanh
    const trimmed = entries.slice(0, 1000);
    fs.writeFileSync(HISTORY_FILE_PATH, JSON.stringify({ entries: trimmed }, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[HistoryLogger Write Error]', err.message);
    return false;
  }
}

export function logPostActivity({
  type = 'post',
  channel, // 'fanpage' | 'groups' | 'personal' | 'chatgpt'
  channelName,
  targetName,
  targetUrl,
  status = 'success', // 'success' | 'failed'
  title,
  caption,
  prompt,
  chatgptAccount,
  aspectRatio,
  hasMascotDu,
  durationMs,
  error = null,
  errorDetails = null,
  details = {},
}) {
  try {
    const entries = readHistoryEntries();
    const id = `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
    let computedChannelName = channelName;
    if (!computedChannelName) {
      if (channel === 'fanpage') computedChannelName = 'Facebook Fanpage';
      else if (channel === 'groups') computedChannelName = 'Facebook Groups';
      else if (channel === 'personal') computedChannelName = 'Facebook Trang Cá Nhân';
      else if (channel === 'chatgpt') computedChannelName = 'ChatGPT Image AI';
      else computedChannelName = 'Khác';
    }

    const newEntry = {
      id,
      timestamp: new Date().toISOString(),
      type,
      channel,
      channelName: computedChannelName,
      targetName: targetName || null,
      targetUrl: targetUrl || null,
      status,
      title: title || (caption ? caption.slice(0, 60) + '...' : 'Bài viết mới'),
      caption: caption || '',
      prompt: prompt || '',
      chatgptAccount: chatgptAccount || null,
      aspectRatio: aspectRatio || '4:5',
      hasMascotDu: hasMascotDu !== undefined ? hasMascotDu : true,
      durationMs: durationMs || 0,
      error: error ? String(error) : null,
      errorDetails: errorDetails ? String(errorDetails) : null,
      details: details || {},
    };

    // Chèn lên đầu danh sách
    entries.unshift(newEntry);
    writeHistoryEntries(entries);
    console.log(`[HistoryLogger] Đã lưu log hoạt động: [${status.toUpperCase()}] ${computedChannelName} (${id})`);
    return newEntry;
  } catch (err) {
    console.error('[HistoryLogger Failed to log]', err.message);
    return null;
  }
}

export function getHistoryStats() {
  const entries = readHistoryEntries();
  const total = entries.length;
  const successCount = entries.filter(e => e.status === 'success').length;
  const failedCount = entries.filter(e => e.status === 'failed').length;
  const successRate = total > 0 ? Math.round((successCount / total) * 100) : 100;

  // Breakdown theo Kênh
  const byChannel = {
    fanpage: { total: 0, success: 0, failed: 0 },
    groups: { total: 0, success: 0, failed: 0 },
    personal: { total: 0, success: 0, failed: 0 },
    chatgpt: { total: 0, success: 0, failed: 0 },
  };

  // Breakdown theo Tài khoản ChatGPT
  const byGpt = {
    acc1: { name: 'ChatGPT Tài khoản 1', count: 0, errorCount: 0 },
    acc2: { name: 'ChatGPT Tài khoản 2', count: 0, errorCount: 0 },
    other: { name: 'Khác', count: 0, errorCount: 0 },
  };

  const errorReasonMap = {};
  let totalDurationMs = 0;
  let durationCount = 0;

  for (const e of entries) {
    // Channel stats
    const ch = e.channel || 'fanpage';
    if (!byChannel[ch]) byChannel[ch] = { total: 0, success: 0, failed: 0 };
    byChannel[ch].total++;
    if (e.status === 'success') byChannel[ch].success++;
    else byChannel[ch].failed++;

    // ChatGPT stats
    if (e.chatgptAccount) {
      if (e.chatgptAccount.includes('1') || e.chatgptAccount.includes('9222')) {
        byGpt.acc1.count++;
        if (e.status === 'failed') byGpt.acc1.errorCount++;
      } else if (e.chatgptAccount.includes('2') || e.chatgptAccount.includes('9242')) {
        byGpt.acc2.count++;
        if (e.status === 'failed') byGpt.acc2.errorCount++;
      } else {
        byGpt.other.count++;
        if (e.status === 'failed') byGpt.other.errorCount++;
      }
    }

    // Duration
    if (e.durationMs && e.durationMs > 0) {
      totalDurationMs += e.durationMs;
      durationCount++;
    }

    // Error Reasons
    if (e.status === 'failed' && e.error) {
      let cleanReason = e.error.trim();
      if (cleanReason.includes('Không tìm thấy ô đăng bài') || cleanReason.includes('chưa tham gia nhóm')) {
        cleanReason = 'Chưa tham gia nhóm hoặc nhóm yêu cầu phê duyệt thành viên';
      } else if (cleanReason.includes('Rate limit') || cleanReason.includes('Quota Exceeded') || cleanReason.includes('token') || cleanReason.includes('giới hạn')) {
        cleanReason = 'ChatGPT hết token / đạt giới hạn lượt tạo ảnh';
      } else if (cleanReason.includes('không tìm thấy ô upload') || cleanReason.includes('trình soạn thảo')) {
        cleanReason = 'Giao diện Facebook thay đổi / không tìm thấy nút tải ảnh';
      } else if (cleanReason.includes('Chrome is not ready') || cleanReason.includes('chưa đăng nhập') || cleanReason.includes('cổng')) {
        cleanReason = 'Chrome Profile chưa đăng nhập Facebook / ChatGPT';
      }
      errorReasonMap[cleanReason] = (errorReasonMap[cleanReason] || 0) + 1;
    }
  }

  const topErrors = Object.entries(errorReasonMap)
    .map(([reason, count]) => {
      let suggestion = 'Kiểm tra lại kết nối và phiên đăng nhập Chrome.';
      if (reason.includes('tham gia nhóm')) {
        suggestion = 'Dùng Chrome Profile của tài khoản để bấm Tham gia nhóm trước khi đăng.';
      } else if (reason.includes('token') || reason.includes('giới hạn')) {
        suggestion = 'Bật cả 2 tài khoản ChatGPT trên Dashboard để tự động luân phiên hoặc chờ reset token.';
      } else if (reason.includes('đăng nhập')) {
        suggestion = 'Nhấn nút "Mở Chrome Profile" trên Dashboard và đăng nhập tài khoản một lần.';
      }
      return { reason, count, suggestion };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const avgDurationSec = durationCount > 0 ? Math.round((totalDurationMs / durationCount) / 1000) : 0;
  const lastRunAt = entries.length > 0 ? entries[0].timestamp : null;

  return {
    total,
    successCount,
    failedCount,
    successRate,
    byChannel,
    byGpt,
    topErrors,
    avgDurationSec,
    lastRunAt,
  };
}

export function clearAllHistory() {
  return writeHistoryEntries([]);
}

export function deleteHistoryById(id) {
  const entries = readHistoryEntries();
  const filtered = entries.filter(e => e.id !== id);
  return writeHistoryEntries(filtered);
}
