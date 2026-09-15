import { NextResponse } from 'next/server';
import path from 'node:path';
import {
  BRIDGE_DIR,
  SCHEDULE_CONFIG_PATH,
  readJsonFile,
  writeJsonFile,
  isPortOpen,
} from '@/lib/server-utils';

export interface GoogleSheetConfig {
  enabled: boolean;
  topicSource: 'google_sheet' | 'manual_list';
  sheetUrl: string;
  spreadsheetId: string;
  sheetName: string;
  autoUpdateStatus: boolean;
  channelSheetMapping?: {
    fanpage?: string;
    groups?: string;
    personal?: string;
  };
}

export interface ChannelScheduleItem {
  enabled: boolean;
  times: string[];
  sheetByTime?: Record<string, string>;
}

export interface ChannelSchedules {
  fanpage: ChannelScheduleItem;
  groups: ChannelScheduleItem;
  personal: ChannelScheduleItem;
}

export interface ScheduleConfig {
  enabled: boolean;
  geminiApiKey: string;
  geminiApiKeys?: string[];
  model: string;
  scheduleTimes: string[];
  channelSchedules?: ChannelSchedules;
  channels: {
    fanpage: boolean;
    groups: boolean;
    personal: boolean;
  };
  aspectRatio: string;
  hasMascotDu: boolean;
  googleSheets?: GoogleSheetConfig;
  topics: string[];
  companyInfo?: {
    name: string;
    hotline: string;
    address1: string;
    address2: string;
    mst: string;
    website: string;
    email: string;
    hashtags: string;
  };
  lastRunAt?: string | null;
  lastTopic?: string | null;
  lastRunStatus?: string | null;
}

const DEFAULT_CONFIG: ScheduleConfig = {
  enabled: true,
  geminiApiKey: '',
  model: 'gemini-2.5-flash',
  scheduleTimes: ['08:00', '16:00'],
  channelSchedules: {
    fanpage: {
      enabled: true,
      times: ['08:00', '16:00'],
    },
    groups: {
      enabled: true,
      times: ['09:30', '14:00', '20:00'],
    },
    personal: {
      enabled: false,
      times: ['11:30', '19:30'],
    },
  },
  channels: {
    fanpage: true,
    groups: true,
    personal: false,
  },
  aspectRatio: '4:5',
  hasMascotDu: true,
  googleSheets: {
    enabled: true,
    topicSource: 'google_sheet',
    sheetUrl: 'https://docs.google.com/spreadsheets/d/1tx_RHyRfBgGuYTvO3Tr_08Hrp6SelIsfN9hTQaT3jUY/edit',
    spreadsheetId: '1tx_RHyRfBgGuYTvO3Tr_08Hrp6SelIsfN9hTQaT3jUY',
    sheetName: 'topics',
    autoUpdateStatus: true,
  },
  topics: [
    'Xây dựng hệ thống CRM quản lý khách hàng thông minh cho doanh nghiệp',
    'Thiết kế Website chuẩn SEO tải nhanh giúp tăng gấp đôi chuyển đổi',
    'Tối ưu hóa phễu bán hàng và Landing Page cho doanh nghiệp SME',
    'Giải pháp chuyển đổi số toàn diện tự động hóa quy trình bán hàng',
    'Bảo mật website và tối ưu trải nghiệm người dùng UI/UX hiện đại',
    '10 Lỗi SEO phổ biến khiến website mất thứ hạng và cách khắc phục',
  ],
  lastRunAt: null,
  lastTopic: null,
  lastRunStatus: null,
};

function calculateNextRun(times: string[], enabled: boolean) {
  if (!enabled || !Array.isArray(times) || times.length === 0) {
    return { time: null, label: 'Lịch tự động đang TẮT', diffMinutes: null };
  }

  const sortedTimes = [...times].sort();
  const now = new Date();
  const nowVnStr = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' });
  const [nowH, nowM] = nowVnStr.split(':').map(Number);
  const nowTotalM = nowH * 60 + nowM;

  for (const t of sortedTimes) {
    const [h, m] = t.split(':').map(Number);
    const targetM = h * 60 + m;
    if (targetM > nowTotalM) {
      const diff = targetM - nowTotalM;
      const diffH = Math.floor(diff / 60);
      const diffM = diff % 60;
      const countdown = diffH > 0 ? `${diffH} giờ ${diffM} phút` : `${diffM} phút`;
      return {
        time: t,
        label: `${t} hôm nay (còn khoảng ${countdown})`,
        diffMinutes: diff,
      };
    }
  }

  const firstTomorrow = sortedTimes[0];
  const [fH, fM] = firstTomorrow.split(':').map(Number);
  const diff = 24 * 60 - nowTotalM + (fH * 60 + fM);
  const diffH = Math.floor(diff / 60);
  const diffM = diff % 60;
  return {
    time: firstTomorrow,
    label: `${firstTomorrow} ngày mai (còn khoảng ${diffH} giờ ${diffM} phút)`,
    diffMinutes: diff,
  };
}

function calculateChannelNextRuns(channelSchedules?: ChannelSchedules, globalEnabled = true) {
  if (!channelSchedules) return {};
  const res: Record<string, { time: string | null; label: string; diffMinutes: number | null }> = {};
  for (const [key, ch] of Object.entries(channelSchedules)) {
    res[key] = calculateNextRun(ch.times || [], globalEnabled && ch.enabled !== false);
  }
  return res;
}

export async function GET() {
  try {
    const config = readJsonFile<ScheduleConfig>(SCHEDULE_CONFIG_PATH, DEFAULT_CONFIG);
    const isBotRunning = await isPortOpen(3004, 500);
    const nextRun = calculateNextRun(config.scheduleTimes || [], config.enabled);
    const channelNextRuns = calculateChannelNextRuns(config.channelSchedules, config.enabled);

    let sheetsOverview = null;
    let availableSheets: string[] = ['topics', 'content_calendar'];
    if (config.googleSheets?.enabled) {
      try {
        const sheetsPath = path.join(BRIDGE_DIR, 'lib', 'google-sheets.mjs');
        const sheetsUrl = new URL(`file://${sheetsPath.replace(/\\/g, '/')}`).href;
        const { getSheetTopicsOverview, getSpreadsheetSheetsList } = await import(/* webpackIgnore: true */ sheetsUrl);
        sheetsOverview = await getSheetTopicsOverview(config.googleSheets.spreadsheetId, config.googleSheets.sheetName || 'topics');
        try {
          availableSheets = await getSpreadsheetSheetsList(config.googleSheets.spreadsheetId);
        } catch {}
      } catch (sheetErr: unknown) {
        const msg = sheetErr instanceof Error ? sheetErr.message : String(sheetErr);
        console.warn('[Schedule API] Không thể đọc Google Sheets:', msg);
      }
    }

    let progress = null;
    if (isBotRunning) {
      try {
        const progRes = await fetch('http://127.0.0.1:3004/autopilot-status');
        progress = await progRes.json();
      } catch {}
    } else {
      try {
        const autoPilotPath = path.join(BRIDGE_DIR, 'lib', 'auto-pilot.mjs');
        const autoPilotUrl = new URL(`file://${autoPilotPath.replace(/\\/g, '/')}`).href;
        const { getAutoPilotProgress } = await import(/* webpackIgnore: true */ autoPilotUrl);
        if (getAutoPilotProgress) progress = getAutoPilotProgress();
      } catch {}
    }

    return NextResponse.json({
      ok: true,
      config,
      isSchedulerRunning: isBotRunning,
      nextRun,
      channelNextRuns,
      sheetsOverview,
      availableSheets,
      progress,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lỗi máy chủ nội bộ';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    // 0. Lấy tiến độ thời gian thực của Auto-Pilot
    if (action === 'status' || action === 'progress') {
      let progress = null;
      try {
        const progRes = await fetch('http://127.0.0.1:3004/autopilot-status');
        progress = await progRes.json();
      } catch {
        const autoPilotPath = path.join(BRIDGE_DIR, 'lib', 'auto-pilot.mjs');
        const autoPilotUrl = new URL(`file://${autoPilotPath.replace(/\\/g, '/')}`).href;
        const { getAutoPilotProgress } = await import(/* webpackIgnore: true */ autoPilotUrl);
        if (getAutoPilotProgress) progress = getAutoPilotProgress();
      }
      return NextResponse.json({ ok: true, progress });
    }

    // 1. Kích hoạt chạy Auto-Pilot / Execute Workflow (n8n Engine)
    if (action === 'trigger' || action === 'execute_workflow') {
      const { topic, channels, accounts, sheetName } = body;
      const isBotRunning = await isPortOpen(3004, 500);

      if (isBotRunning) {
        // Gửi qua Bot Server (Port 3004) để tận dụng luồng nền
        const triggerRes = await fetch('http://127.0.0.1:3004/trigger-autopilot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, channels, accounts, sheetName }),
        });
        const triggerData = await triggerRes.json();
        return NextResponse.json(triggerData);
      }

      // Fallback: Nếu 3004 chưa bật, gọi trực tiếp thư viện auto-pilot
      const autoPilotPath = path.join(BRIDGE_DIR, 'lib', 'auto-pilot.mjs');
      const autoPilotUrl = new URL(`file://${autoPilotPath.replace(/\\/g, '/')}`).href;
      const { runAutoPilotCycle } = await import(/* webpackIgnore: true */ autoPilotUrl);
      const result = await runAutoPilotCycle({ topic, channels, accounts, sheetName });
      return NextResponse.json({ ok: true, result });
    }

    // 1.1 Chạy riêng một Node đơn lẻ (Single Step Execution giống n8n)
    if (action === 'execute_node') {
      const { nodeType, payload } = body;
      const isBotRunning = await isPortOpen(3004, 500);

      if (isBotRunning) {
        try {
          const nodeRes = await fetch('http://127.0.0.1:3004/execute-node', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nodeType, payload }),
          });
          const nodeData = await nodeRes.json();
          return NextResponse.json(nodeData);
        } catch {}
      }

      const autoPilotPath = path.join(BRIDGE_DIR, 'lib', 'auto-pilot.mjs');
      const autoPilotUrl = new URL(`file://${autoPilotPath.replace(/\\/g, '/')}`).href;
      const { executeSingleNode } = await import(/* webpackIgnore: true */ autoPilotUrl);
      const result = await executeSingleNode(nodeType, payload);
      return NextResponse.json({ ok: true, result });
    }

    // 2. Lấy thông tin & Đồng bộ Google Sheets
    if (action === 'sheets-info') {
      const { spreadsheetId, sheetName } = body;
      const sheetsPath = path.join(BRIDGE_DIR, 'lib', 'google-sheets.mjs');
      const sheetsUrl = new URL(`file://${sheetsPath.replace(/\\/g, '/')}`).href;
      const { getSheetTopicsOverview, getSpreadsheetSheetsList } = await import(/* webpackIgnore: true */ sheetsUrl);

      const sname = sheetName || 'topics';
      const overview = await getSheetTopicsOverview(spreadsheetId, sname);
      let availableSheets = ['topics', 'content_calendar'];
      try {
        availableSheets = await getSpreadsheetSheetsList(spreadsheetId);
      } catch {}
      return NextResponse.json({ ok: true, sheetsInfo: overview, availableSheets });
    }

    // 3. Thử nghiệm viết bài nhanh với Gemini (không đăng)
    if (action === 'test-gemini') {
      const { topic, apiKey, model } = body;
      const currentConfig = readJsonFile<ScheduleConfig>(SCHEDULE_CONFIG_PATH, DEFAULT_CONFIG);
      const autoPilotPath = path.join(BRIDGE_DIR, 'lib', 'auto-pilot.mjs');
      const autoPilotUrl = new URL(`file://${autoPilotPath.replace(/\\/g, '/')}`).href;
      const { generateContentWithGemini } = await import(/* webpackIgnore: true */ autoPilotUrl);

      const testConfig = {
        ...currentConfig,
        ...(apiKey ? { geminiApiKey: apiKey } : {}),
        ...(model ? { model } : {}),
      };

      const generated = await generateContentWithGemini(topic || 'Kiểm tra kết nối Gemini AI', testConfig);
      return NextResponse.json({ ok: true, data: generated });
    }

    // 4. Lưu cấu hình lịch trình & Google Sheets
    const currentConfig = readJsonFile<ScheduleConfig>(SCHEDULE_CONFIG_PATH, DEFAULT_CONFIG);
    const normalizedGeminiApiKeys: string[] = [];
    const geminiApiKeys = Array.isArray(body.geminiApiKeys)
      ? body.geminiApiKeys.reduce((keys: string[], value: unknown) => {
          const key = String(value).trim();
          if (key && !keys.includes(key)) keys.push(key);
          return keys;
        }, normalizedGeminiApiKeys)
      : undefined;
    const updatedConfig: ScheduleConfig = {
      ...currentConfig,
      ...(body.enabled !== undefined ? { enabled: Boolean(body.enabled) } : {}),
      ...(body.geminiApiKey !== undefined ? { geminiApiKey: String(body.geminiApiKey).trim() } : {}),
      ...(geminiApiKeys !== undefined ? { geminiApiKeys } : {}),
      ...(body.model !== undefined ? { model: String(body.model).trim() } : {}),
      ...(Array.isArray(body.scheduleTimes) ? { scheduleTimes: body.scheduleTimes } : {}),
      ...(body.channelSchedules ? { channelSchedules: body.channelSchedules } : {}),
      ...(body.channels ? { channels: { ...currentConfig.channels, ...body.channels } } : {}),
      ...(body.aspectRatio ? { aspectRatio: body.aspectRatio } : {}),
      ...(body.hasMascotDu !== undefined ? { hasMascotDu: Boolean(body.hasMascotDu) } : {}),
      ...(body.googleSheets ? { googleSheets: { ...currentConfig.googleSheets, ...body.googleSheets } } : {}),
      ...(Array.isArray(body.topics) ? { topics: body.topics } : {}),
      ...(body.companyInfo ? { companyInfo: { ...currentConfig.companyInfo, ...body.companyInfo } } : {}),
    };

    writeJsonFile(SCHEDULE_CONFIG_PATH, updatedConfig);

    return NextResponse.json({
      ok: true,
      message: 'Đã lưu cấu hình lịch đăng bài tự động thành công!',
      config: updatedConfig,
      nextRun: calculateNextRun(updatedConfig.scheduleTimes, updatedConfig.enabled),
      channelNextRuns: calculateChannelNextRuns(updatedConfig.channelSchedules, updatedConfig.enabled),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
