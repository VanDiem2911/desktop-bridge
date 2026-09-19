import { NextResponse } from 'next/server';
import {
  BOT_CONFIG_PATH,
  BotConfig,
  readJsonFile,
  writeJsonFile,
  isPortOpen,
  getServerPorts,
} from '@/lib/server-utils';

export async function GET() {
  try {
    const config = readJsonFile<BotConfig>(BOT_CONFIG_PATH, {
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
    });

    const { botServer } = getServerPorts();
    const isBotRunning = await isPortOpen(botServer, 600);

    let botInfo: { username?: string; firstName?: string } | null = null;
    if (config.botToken?.trim()) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${config.botToken.trim()}/getMe`, {
          signal: AbortSignal.timeout(3000),
        });
        const d = await res.json();
        if (d.ok && d.result) {
          botInfo = { username: d.result.username, firstName: d.result.first_name };
        }
      } catch {}
    }

    let detectedGroup: { id: string; title: string; type: string; detectedAt: string } | null = null;
    if (isBotRunning) {
      try {
        const res = await fetch(`http://127.0.0.1:${botServer}/detected-group`, {
          signal: AbortSignal.timeout(1500),
        });
        const d = await res.json();
        if (d.ok && d.group) {
          detectedGroup = d.group;
        }
      } catch {}
    }

    return NextResponse.json({
      ok: true,
      config,
      isBotRunning,
      botInfo,
      detectedGroup,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    const currentConfig = readJsonFile<BotConfig>(BOT_CONFIG_PATH, {
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
    });

    if (action === 'save_config') {
      const updated: BotConfig = {
        ...currentConfig,
        ...(body.config || {}),
      };
      writeJsonFile(BOT_CONFIG_PATH, updated);

      // Nếu bot server đang chạy, báo cho bot reload config
      try {
        const { botServer: bp } = getServerPorts();
        await fetch(`http://127.0.0.1:${bp}/reload-config`, { method: 'POST' }).catch(() => {});
      } catch {}

      return NextResponse.json({
        ok: true,
        message: 'Đã lưu cấu hình Bot Telegram thành công!',
        config: updated,
      });
    }

    if (action === 'test_message') {
      const token = (body.botToken || currentConfig.botToken || '').trim();
      const chatId = (body.chatId || currentConfig.chatId || '').trim();

      if (!token) {
        return NextResponse.json({ ok: false, error: 'Chưa có Telegram Bot Token. Vui lòng nhập Token trước!' }, { status: 400 });
      }
      if (!chatId) {
        return NextResponse.json({ ok: false, error: 'Chưa có Telegram Chat ID. Vui lòng nhập Chat ID trước!' }, { status: 400 });
      }

      const isGroup = chatId.startsWith('-');
      const nowStr = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      const text = [
        isGroup
          ? '🚀 <b>DUDI Control Center - Kết Nối NHÓM Telegram Thành Công!</b>'
          : '🚀 <b>DUDI Control Center - Kết Nối Telegram Thành Công!</b>',
        '',
        `⏰ <b>Thời gian:</b> <code>${nowStr}</code>`,
        isGroup
          ? '👥 <b>Đích nhận tin:</b> Đã chuyển toàn bộ thông báo hệ thống vào NHÓM này.'
          : '📱 <b>Trạng thái:</b> Bot Telegram đã sẵn sàng nhận cảnh báo và lệnh điều khiển từ xa.',
        '',
        '👉 <i>Các thành viên trong nhóm có thể dùng các lệnh sau:</i>',
        '• <code>/status</code>: Kiểm tra trạng thái hệ thống',
        '• <code>/check_tin</code>: Quét tin nhắn khách hàng',
        '• <code>/screenshot</code>: Chụp màn hình tab Chrome đang hoạt động',
        '• <code>/post_now</code>: Kích hoạt chạy đăng bài ngay',
      ].join('\n');

      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        let errorMsg = `Telegram API Error: ${data.description || 'Gửi thất bại'}`;
        const desc = (data.description || '').toLowerCase();
        if (desc.includes('chat not found')) {
          errorMsg = isGroup
            ? 'Không tìm thấy nhóm Telegram này! Hãy chắc chắn bạn đã THÊM BOT VÀO NHÓM đó và bot có quyền gửi tin nhắn.'
            : 'Bạn chưa bấm "Start" với Bot trên Telegram! Hãy mở Telegram, tìm bot của bạn và ấn Start (Bắt đầu) trước khi test.';
        } else if (desc.includes('bot was kicked') || desc.includes('bot is not a member')) {
          errorMsg = 'Bot chưa được thêm vào nhóm hoặc đã bị xóa khỏi nhóm! Vui lòng thêm bot vào nhóm Telegram trước.';
        } else if (desc.includes('unauthorized') || desc.includes('not found')) {
          errorMsg = 'Telegram Bot Token không đúng hoặc đã bị thu hồi. Vui lòng kiểm tra lại Token từ @BotFather.';
        }
        return NextResponse.json({
          ok: false,
          error: errorMsg,
        }, { status: 400 });
      }

      return NextResponse.json({
        ok: true,
        message: isGroup
          ? 'Đã gửi tin nhắn thử nghiệm thành công vào NHÓM Telegram!'
          : 'Đã gửi tin nhắn thử nghiệm thành công tới Telegram của bạn!',
      });
    }

    if (action === 'trigger_digest') {
      try {
        const { botServer: bp2 } = getServerPorts();
        const res = await fetch(`http://127.0.0.1:${bp2}/trigger-digest`, { method: 'POST' });
        const data = await res.json();
        return NextResponse.json(data);
      } catch {
        const { botServer: bp3 } = getServerPorts();
        return NextResponse.json({ ok: false, error: `Bot Service (port ${bp3}) chưa chạy hoặc không phản hồi` }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: false, error: 'Hành động (action) không hợp lệ' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
