'use client';

import React from 'react';
import {
  Bot,
  RefreshCw,
  Send,
  Calendar,
  ExternalLink,
  Eye,
  ShieldCheck,
  Check,
  Activity,
} from 'lucide-react';
import { BotConfig, ServerStatus } from '@/types/dashboard';

interface BotTabProps {
  botConfig: BotConfig;
  setBotConfig: React.Dispatch<React.SetStateAction<any>>;
  isBotRunning: boolean;
  botLoading: boolean;
  botTesting: boolean;
  showTokenSecret: boolean;
  setShowTokenSecret: (val: boolean) => void;
  botInfo: { username?: string; firstName?: string } | null;
  handleSaveBotConfig: (e?: React.FormEvent) => Promise<void>;
  handleTestBotMessage: () => Promise<void>;
  handleTriggerDigest: () => Promise<void>;
  fetchBotConfig: () => Promise<void>;
  status: ServerStatus | null;
  fetchStatus: () => Promise<void>;
  copiedId: string | null;
  copyToClipboard: (text: string, id: string) => void;
}

export default function BotTab({
  botConfig,
  setBotConfig,
  isBotRunning,
  botLoading,
  botTesting,
  showTokenSecret,
  setShowTokenSecret,
  botInfo,
  handleSaveBotConfig,
  handleTestBotMessage,
  handleTriggerDigest,
  fetchBotConfig,
  status,
  fetchStatus,
  copiedId,
  copyToClipboard,
}: BotTabProps) {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
            
            {/* Header Banner */}
            <div className="liquid-glass rounded-3xl p-6 md:p-8 relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="p-3 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/30">
                      <Bot className="w-6 h-6" />
                    </span>
                    <div>
                      <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                        Giám Sát Từ Xa & Telegram Command Bot
                      </h2>
                      <p className="text-xs md:text-sm text-slate-500 font-medium">
                        Quản lý toàn bộ hệ thống từ điện thoại, nhận cảnh báo lỗi kèm ảnh chụp màn hình tức thì và báo cáo tổng kết 22h tối.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className={`px-4 py-2.5 rounded-2xl text-xs font-bold border flex items-center gap-2 ${
                    isBotRunning 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${isBotRunning ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                    {isBotRunning ? 'Bot Service: Online (Port 3004)' : 'Bot Service: Đang tắt (Port 3004)'}
                  </div>

                  <div className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold border flex items-center gap-1.5 ${
                    botConfig.botToken && botConfig.chatId
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    {botConfig.botToken && botConfig.chatId ? '🟢 Đã cấu hình' : '⚠️ Chưa đủ Token / Chat ID'}
                  </div>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="mt-6 pt-5 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleTestBotMessage}
                    disabled={botTesting || !botConfig.botToken || !botConfig.chatId}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold text-xs shadow-md shadow-sky-500/25 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {botTesting ? 'Đang gửi test...' : 'Test Gửi Tin Nhắn Telegram'}
                  </button>

                  <button
                    type="button"
                    onClick={handleTriggerDigest}
                    disabled={!isBotRunning || !botConfig.botToken || !botConfig.chatId}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    Gửi thử Báo cáo 22h tối (Daily Digest)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={fetchBotConfig}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Làm mới cấu hình
                </button>
              </div>
              {/* Direct Telegram Bot Link & Start Reminder */}
              {botInfo?.username && (
                <div className="mt-5 p-4 rounded-2xl bg-sky-50 border border-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 rounded-xl bg-sky-500 text-white shadow-sm">
                      <Bot className="w-5 h-5" />
                    </span>
                    <div>
                      <p className="text-xs font-black text-slate-900 flex items-center gap-2">
                        Bot của bạn: <span className="text-sky-700 font-mono text-sm">@{botInfo.username}</span>
                        {botInfo.firstName && <span className="text-slate-500 font-medium">({botInfo.firstName})</span>}
                      </p>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        👉 <b>Bắt buộc:</b> Bạn cần mở Telegram, vào bot và bấm nút <b>&quot;START&quot;</b> thì Telegram mới cho phép Bot gửi tin nhắn cho bạn.
                      </p>
                    </div>
                  </div>
                  <a
                    href={`https://t.me/${botInfo.username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs shadow-md shadow-sky-600/25 transition-all cursor-pointer text-center justify-center"
                  >
                    <ExternalLink className="w-4 h-4" /> Mở Bot & Ấn START
                  </a>
                </div>
              )}
            </div>

            {/* Form Settings Grid */}
            <form onSubmit={handleSaveBotConfig} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Cột 1: Thông tin kết nối Telegram */}
              <div className="liquid-glass rounded-3xl p-6 md:p-7 space-y-5">
                <div className="border-b border-slate-200/80 pb-3 flex items-center justify-between">
                  <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-sky-100 text-sky-700">
                      <Bot className="w-4 h-4" />
                    </span>
                    Thông Tin Kết Nối Telegram
                  </h3>
                  <span className="text-[11px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                    Long Polling (Không cần mở port)
                  </span>
                </div>

                {/* Bot Token */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">Telegram Bot Token (từ @BotFather):</label>
                    <button
                      type="button"
                      onClick={() => setShowTokenSecret(!showTokenSecret)}
                      className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> {showTokenSecret ? 'Ẩn token' : 'Hiện token'}
                    </button>
                  </div>
                  <input
                    type={showTokenSecret ? 'text' : 'password'}
                    value={botConfig.botToken || ''}
                    onChange={(e) => setBotConfig({ ...botConfig, botToken: e.target.value })}
                    placeholder="VD: 7123456789:AAFlmP_abc1234xyz..."
                    className="liquid-input w-full rounded-xl px-4 py-2.5 text-xs md:text-sm font-mono text-slate-900"
                  />
                  <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-200 text-[11px] text-sky-900 space-y-1">
                    <p className="font-bold">💡 Cách lấy Token trong 1 phút:</p>
                    <ol className="list-decimal pl-4 space-y-0.5 text-slate-600">
                      <li>Mở ứng dụng Telegram, tìm bot <b>@BotFather</b></li>
                      <li>Gửi lệnh <code>/newbot</code>, đặt tên hiển thị và username bot (kết thúc bằng từ bot)</li>
                      <li>Sao chép dòng <b>HTTP API Token</b> và dán vào ô trên.</li>
                    </ol>
                  </div>
                </div>

                {/* Chat ID */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Telegram Chat ID (Cá nhân hoặc Nhóm nhận tin):</label>
                  <input
                    type="text"
                    value={botConfig.chatId || ''}
                    onChange={(e) => setBotConfig({ ...botConfig, chatId: e.target.value })}
                    placeholder="VD: 123456789 (dạng số)"
                    className="liquid-input w-full rounded-xl px-4 py-2.5 text-xs md:text-sm font-mono text-slate-900"
                  />
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                    <p className="font-bold text-slate-800">💡 Cách lấy Chat ID của bạn:</p>
                    <p>
                      Mở Telegram, tìm bot <b>@userinfobot</b> và bấm <b>Start</b>. Bot sẽ gửi lại cho bạn một dãy số <code>Id: 123456789</code>. Hãy nhập dãy số đó vào ô này.
                    </p>
                  </div>
                </div>

                {/* Allowed Chat IDs */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Chat ID phụ (Tùy chọn, cách nhau bằng dấu phẩy):</label>
                  <input
                    type="text"
                    value={Array.isArray(botConfig.allowedChatIds) ? botConfig.allowedChatIds.join(', ') : ''}
                    onChange={(e) => {
                      const ids = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                      setBotConfig({ ...botConfig, allowedChatIds: ids });
                    }}
                    placeholder="VD: 987654321, 555666777"
                    className="liquid-input w-full rounded-xl px-4 py-2.5 text-xs md:text-sm font-mono text-slate-900"
                  />
                  <p className="text-[11px] text-slate-500">
                    Bảo mật: Chỉ các Chat ID được liệt kê ở đây mới có quyền điều khiển các lệnh <code>/restart</code> hoặc <code>/post_now</code>.
                  </p>
                </div>

              </div>

              {/* Cột 2: Cài đặt Cảnh báo & Tự động hóa */}
              <div className="liquid-glass rounded-3xl p-6 md:p-7 space-y-5">
                <div className="border-b border-slate-200/80 pb-3">
                  <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                      <ShieldCheck className="w-4 h-4" />
                    </span>
                    Chính Sách Cảnh Báo & Tự Động Hóa
                  </h3>
                </div>

                <div className="space-y-3">
                  
                  {/* Master Alert Toggle */}
                  <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-blue-200/80 bg-blue-50/50 cursor-pointer hover:bg-blue-50 transition-all">
                    <input
                      type="checkbox"
                      checked={botConfig.enableAlerts !== false}
                      onChange={(e) => setBotConfig({ ...botConfig, enableAlerts: e.target.checked })}
                      className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <div>
                      <span className="text-xs font-bold text-blue-950 block">⚡ Bật Hệ Thống Cảnh Báo Lỗi Tức Thì</span>
                      <span className="text-[11px] text-blue-800">
                        Bot tự động bắn tin nhắn ngay khi phát hiện sự cố hệ thống hoặc tiến trình đăng bài bị lỗi.
                      </span>
                    </div>
                  </label>

                  {/* Alert on Server Down */}
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-white/70 cursor-pointer hover:bg-white transition-all">
                    <input
                      type="checkbox"
                      checked={botConfig.alertOnServerDown !== false}
                      onChange={(e) => setBotConfig({ ...botConfig, alertOnServerDown: e.target.checked })}
                      className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Cảnh báo khi Server Bridge mất kết nối</span>
                      <span className="text-[11px] text-slate-500">
                        Bắn cảnh báo nếu các cổng 3001, 3002 hoặc n8n bị tắt/dừng đột ngột.
                      </span>
                    </div>
                  </label>

                  {/* Alert on Checkpoint */}
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-white/70 cursor-pointer hover:bg-white transition-all">
                    <input
                      type="checkbox"
                      checked={botConfig.alertOnCheckpoint !== false}
                      onChange={(e) => setBotConfig({ ...botConfig, alertOnCheckpoint: e.target.checked })}
                      className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Cảnh báo Checkpoint Facebook (Kèm ảnh chụp màn hình)</span>
                      <span className="text-[11px] text-slate-500">
                        Tự động phát hiện khi tài khoản Facebook bị văng ra trang xác minh checkpoint và chụp ảnh báo ngay.
                      </span>
                    </div>
                  </label>

                  {/* Alert on Job Error */}
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-white/70 cursor-pointer hover:bg-white transition-all">
                    <input
                      type="checkbox"
                      checked={botConfig.alertOnJobError !== false}
                      onChange={(e) => setBotConfig({ ...botConfig, alertOnJobError: e.target.checked })}
                      className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Cảnh báo khi xuất bản bài viết thất bại</span>
                      <span className="text-[11px] text-slate-500">
                        Gửi chi tiết thông báo lỗi và ảnh chụp của bài viết khi đăng nhóm hoặc fanpage bị chặn.
                      </span>
                    </div>
                  </label>

                  {/* Alert on New Messages */}
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 cursor-pointer hover:bg-emerald-50 transition-all">
                    <input
                      type="checkbox"
                      checked={botConfig.alertOnNewMessages !== false}
                      onChange={(e) => setBotConfig({ ...botConfig, alertOnNewMessages: e.target.checked })}
                      className="w-4 h-4 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                    />
                    <div>
                      <span className="text-xs font-bold text-emerald-950 block">🔔 Cảnh báo khi có tin nhắn mới từ khách hàng (Messenger / Fanpage)</span>
                      <span className="text-[11px] text-emerald-800">
                        Tự động theo dõi các nick Facebook & Fanpage. Khi khách nhắn tin đến, Bot sẽ lập tức bắn thông báo kèm ảnh chụp màn hình về Telegram.
                      </span>
                    </div>
                  </label>

                  {/* Daily Digest Setting */}
                  <div className="p-3.5 rounded-2xl border border-indigo-200 bg-indigo-50/40 space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={botConfig.enableDailyDigest !== false}
                        onChange={(e) => setBotConfig({ ...botConfig, enableDailyDigest: e.target.checked })}
                        className="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                      />
                      <div>
                        <span className="text-xs font-bold text-indigo-950 block">🌙 Báo Cáo Tổng Kết Ngày (Daily Digest)</span>
                        <span className="text-[11px] text-indigo-800">
                          Tự động tổng hợp số bài đã đăng, bài lỗi, số nhóm đã phủ sóng và tình trạng tài khoản.
                        </span>
                      </div>
                    </label>

                    <div className="flex items-center gap-3 pl-7">
                      <label className="text-xs font-bold text-slate-700">Giờ gửi báo cáo:</label>
                      <input
                        type="time"
                        value={botConfig.dailyDigestTime || '22:00'}
                        onChange={(e) => setBotConfig({ ...botConfig, dailyDigestTime: e.target.value })}
                        className="liquid-input rounded-xl px-3 py-1.5 text-xs font-bold font-mono text-indigo-900 border border-indigo-300"
                      />
                      <span className="text-[11px] text-slate-500">(Mặc định: 22:00 tối)</span>
                    </div>
                  </div>

                </div>

                {/* Save Button */}
                <div className="pt-3 border-t border-slate-200/80">
                  <button
                    type="submit"
                    disabled={botLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-sm shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    {botLoading ? 'Đang lưu cấu hình...' : 'Lưu Cấu Hình Bot Telegram'}
                  </button>
                </div>

              </div>

            </form>

            {/* Remote Command Cheatsheet Card */}
            <div className="liquid-glass rounded-3xl p-6 md:p-8 space-y-4">
              <div className="border-b border-slate-200/80 pb-3 flex items-center justify-between">
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-teal-100 text-teal-700">
                    <Activity className="w-4 h-4" />
                  </span>
                  Danh Sách Lệnh Điều Khiển Từ Xa (Gõ trên Telegram)
                </h3>
                <span className="text-xs font-semibold text-slate-500">
                  Có sẵn bàn phím bấm nhanh tiện lợi
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                
                <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <code className="text-xs font-black text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                      /status
                    </code>
                    <span className="text-[10px] font-bold text-slate-400">Kiểm tra</span>
                  </div>
                  <p className="text-xs font-bold text-slate-800">Trạng thái hệ thống</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Xem tình trạng 4 server bridge, n8n, 5 chrome profile và số bài đăng thành công trong ngày.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <code className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                      /check_tin
                    </code>
                    <span className="text-[10px] font-bold text-emerald-600">Tin nhắn</span>
                  </div>
                  <p className="text-xs font-bold text-slate-800">Quét tin nhắn các nick</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Quét nhanh tất cả tài khoản Facebook & Fanpage, báo số tin chưa đọc và gửi ảnh hộp thư khách.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <code className="text-xs font-black text-teal-700 bg-teal-50 px-2 py-1 rounded-md border border-teal-200">
                      /screenshot
                    </code>
                    <span className="text-[10px] font-bold text-slate-400">Xem ảnh</span>
                  </div>
                  <p className="text-xs font-bold text-slate-800">Chụp màn hình Chrome</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Chụp trực tiếp tab Chrome đang chạy trên máy tính và gửi ảnh về điện thoại trong 1 giây.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <code className="text-xs font-black text-rose-700 bg-rose-50 px-2 py-1 rounded-md border border-rose-200">
                      /restart
                    </code>
                    <span className="text-[10px] font-bold text-slate-400">Khởi động</span>
                  </div>
                  <p className="text-xs font-bold text-slate-800">Khởi động lại Servers</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Tự động chạy script <code>kill-and-restart.ps1</code> và báo lại khi toàn bộ hệ thống đã online.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <code className="text-xs font-black text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                      /post_now
                    </code>
                    <span className="text-[10px] font-bold text-slate-400">Đăng ngay</span>
                  </div>
                  <p className="text-xs font-bold text-slate-800">Đăng bài khẩn cấp</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Kích hoạt duyệt và xuất bản ngay lập tức một bài viết vào nhóm đang chờ mà không cần chờ lịch.
                  </p>
                </div>

              </div>
            </div>

          </div>
  );
}
