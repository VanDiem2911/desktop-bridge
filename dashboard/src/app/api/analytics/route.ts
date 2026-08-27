import { NextRequest, NextResponse } from 'next/server';
import path from 'node:path';
import fs from 'node:fs';
import { BRIDGE_DIR, readJsonFile, writeJsonFile } from '@/lib/server-utils';

export interface HistoryEntry {
  id: string;
  timestamp: string;
  type: 'post' | 'image_generate';
  channel: 'fanpage' | 'groups' | 'personal' | 'chatgpt';
  channelName: string;
  targetName?: string | null;
  targetUrl?: string | null;
  status: 'success' | 'failed';
  title?: string;
  caption?: string;
  prompt?: string;
  chatgptAccount?: string | null;
  aspectRatio?: string;
  hasMascotDu?: boolean;
  durationMs?: number;
  error?: string | null;
  errorDetails?: string | null;
  details?: Record<string, unknown>;
}

interface PostHistoryFile {
  entries: HistoryEntry[];
}

const HISTORY_FILE_PATH = path.join(BRIDGE_DIR, 'configs', 'post-history.json');

function getHistoryData(): HistoryEntry[] {
  const data = readJsonFile<PostHistoryFile>(HISTORY_FILE_PATH, { entries: [] });
  return Array.isArray(data.entries) ? data.entries : [];
}

function saveHistoryData(entries: HistoryEntry[]): boolean {
  const configsDir = path.join(BRIDGE_DIR, 'configs');
  if (!fs.existsSync(configsDir)) {
    try { fs.mkdirSync(configsDir, { recursive: true }); } catch {}
  }
  writeJsonFile(HISTORY_FILE_PATH, { entries: entries.slice(0, 1000) });
  return true;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const channel = searchParams.get('channel');
    const status = searchParams.get('status');
    const search = (searchParams.get('search') || '').toLowerCase().trim();
    const chatgpt = searchParams.get('chatgpt');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get('limit') || '50', 10)));

    let allEntries = getHistoryData();

    // 1. Tính toán thống kê tổng hợp (toàn diện trước khi lọc phân trang)
    const total = allEntries.length;
    const successCount = allEntries.filter((e) => e.status === 'success').length;
    const failedCount = allEntries.filter((e) => e.status === 'failed').length;
    const successRate = total > 0 ? Math.round((successCount / total) * 100) : 100;

    const byChannel = {
      fanpage: { total: 0, success: 0, failed: 0 },
      groups: { total: 0, success: 0, failed: 0 },
      personal: { total: 0, success: 0, failed: 0 },
      chatgpt: { total: 0, success: 0, failed: 0 },
    };

    const byGpt = {
      acc1: { name: 'ChatGPT Tài khoản 1 (Port 9222)', count: 0, errorCount: 0 },
      acc2: { name: 'ChatGPT Tài khoản 2 (Port 9242)', count: 0, errorCount: 0 },
      other: { name: 'Khác', count: 0, errorCount: 0 },
    };

    const errorReasonMap: Record<string, number> = {};
    let totalDurationMs = 0;
    let durationCount = 0;

    for (const e of allEntries) {
      const ch = (e.channel || 'fanpage') as keyof typeof byChannel;
      if (byChannel[ch]) {
        byChannel[ch].total++;
        if (e.status === 'success') byChannel[ch].success++;
        else byChannel[ch].failed++;
      }

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

      if (e.durationMs && e.durationMs > 0) {
        totalDurationMs += e.durationMs;
        durationCount++;
      }

      if (e.status === 'failed' && e.error) {
        let cleanReason = e.error.trim();
        if (cleanReason.includes('Không tìm thấy ô đăng bài') || cleanReason.includes('chưa tham gia nhóm')) {
          cleanReason = 'Chưa tham gia nhóm hoặc nhóm cần phê duyệt thành viên';
        } else if (cleanReason.includes('Rate limit') || cleanReason.includes('Quota Exceeded') || cleanReason.includes('token') || cleanReason.includes('giới hạn')) {
          cleanReason = 'ChatGPT hết token / đạt giới hạn quota tạo ảnh';
        } else if (cleanReason.includes('không tìm thấy ô upload') || cleanReason.includes('trình soạn thảo')) {
          cleanReason = 'Giao diện Facebook thay đổi / không tìm thấy nút đính kèm ảnh';
        } else if (cleanReason.includes('Chrome is not ready') || cleanReason.includes('chưa đăng nhập') || cleanReason.includes('cổng')) {
          cleanReason = 'Chrome Profile chưa đăng nhập Facebook / ChatGPT';
        }
        errorReasonMap[cleanReason] = (errorReasonMap[cleanReason] || 0) + 1;
      }
    }

    const topErrors = Object.entries(errorReasonMap)
      .map(([reason, count]) => {
        let suggestion = 'Kiểm tra lại kết nối trình duyệt và phiên đăng nhập.';
        if (reason.includes('tham gia nhóm')) {
          suggestion = 'Mở Profile Chrome của tài khoản trên Dashboard và bấm Tham gia nhóm trước khi đăng bài.';
        } else if (reason.includes('token') || reason.includes('quota') || reason.includes('giới hạn')) {
          suggestion = 'Bật cả 2 tài khoản ChatGPT trên Dashboard để tự động luân phiên hoặc chờ hết giờ giới hạn.';
        } else if (reason.includes('đăng nhập')) {
          suggestion = 'Nhấn nút "Mở Chrome Profile" tương ứng trên Dashboard để đăng nhập tài khoản một lần.';
        }
        return { reason, count, suggestion };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const avgDurationSec = durationCount > 0 ? Math.round((totalDurationMs / durationCount) / 1000) : 0;
    const lastRunAt = allEntries.length > 0 ? allEntries[0].timestamp : null;

    // 2. Lọc dữ liệu theo bộ lọc của người dùng
    let filtered = allEntries;

    if (channel && channel !== 'all') {
      filtered = filtered.filter((e) => e.channel === channel);
    }

    if (status && status !== 'all') {
      filtered = filtered.filter((e) => e.status === status);
    }

    if (chatgpt && chatgpt !== 'all') {
      filtered = filtered.filter((e) => {
        if (!e.chatgptAccount) return false;
        if (chatgpt === 'acc1') return e.chatgptAccount.includes('1') || e.chatgptAccount.includes('9222');
        if (chatgpt === 'acc2') return e.chatgptAccount.includes('2') || e.chatgptAccount.includes('9242');
        return true;
      });
    }

    if (search) {
      filtered = filtered.filter((e) => {
        const cap = (e.caption || '').toLowerCase();
        const prm = (e.prompt || '').toLowerCase();
        const err = (e.error || '').toLowerCase();
        const url = (e.targetUrl || '').toLowerCase();
        const nam = (e.targetName || '').toLowerCase();
        const tit = (e.title || '').toLowerCase();
        return cap.includes(search) || prm.includes(search) || err.includes(search) || url.includes(search) || nam.includes(search) || tit.includes(search);
      });
    }

    // 3. Phân trang
    const totalFiltered = filtered.length;
    const totalPages = Math.ceil(totalFiltered / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedEntries = filtered.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      ok: true,
      stats: {
        total,
        successCount,
        failedCount,
        successRate,
        byChannel,
        byGpt,
        topErrors,
        avgDurationSec,
        lastRunAt,
      },
      history: paginatedEntries,
      pagination: {
        totalEntries: totalFiltered,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // 1. Xóa toàn bộ lịch sử
    if (action === 'clear_history') {
      saveHistoryData([]);
      return NextResponse.json({ ok: true, message: 'Đã xóa toàn bộ lịch sử hoạt động!' });
    }

    // 2. Xóa 1 dòng
    if (action === 'delete_entry') {
      const { id } = body;
      const all = getHistoryData();
      const next = all.filter((e) => e.id !== id);
      saveHistoryData(next);
      return NextResponse.json({ ok: true, message: 'Đã xóa bản ghi thành công!' });
    }

    // 3. Thêm bản ghi thủ công từ Quick Post
    if (action === 'log_entry') {
      const { entry } = body;
      if (!entry) return NextResponse.json({ ok: false, error: 'Thiếu thông tin bản ghi' }, { status: 400 });

      const all = getHistoryData();
      const newEntry: HistoryEntry = {
        id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        type: entry.type || 'post',
        channel: entry.channel || 'fanpage',
        channelName: entry.channelName || 'Facebook Post',
        targetName: entry.targetName || null,
        targetUrl: entry.targetUrl || null,
        status: entry.status || 'success',
        title: entry.title || (entry.caption ? entry.caption.slice(0, 60) + '...' : 'Bài viết mới'),
        caption: entry.caption || '',
        prompt: entry.prompt || '',
        chatgptAccount: entry.chatgptAccount || null,
        aspectRatio: entry.aspectRatio || '4:5',
        hasMascotDu: entry.hasMascotDu !== undefined ? entry.hasMascotDu : true,
        durationMs: entry.durationMs || 0,
        error: entry.error || null,
        errorDetails: entry.errorDetails || null,
        details: entry.details || {},
      };

      all.unshift(newEntry);
      saveHistoryData(all);
      return NextResponse.json({ ok: true, message: 'Đã lưu lịch sử!', entry: newEntry });
    }

    return NextResponse.json({ ok: false, error: 'Action không hợp lệ' }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
