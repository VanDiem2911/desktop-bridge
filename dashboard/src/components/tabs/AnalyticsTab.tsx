'use client';

import React, { useState } from 'react';
import {
  BarChart3,
  RefreshCw,
  Download,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Activity,
  FileText,
  Clock,
  Bot,
  Maximize2,
  Eye,
} from 'lucide-react';
import { AnalyticsStats, HistoryEntry } from '@/types/dashboard';
import { parseErrorMessage } from '@/lib/error-parser';
import AnalyticsModals from '@/components/modals/AnalyticsModals';

interface AnalyticsTabProps {
  analyticsData: {
    stats: AnalyticsStats;
    history: HistoryEntry[];
    pagination: { total?: number; totalEntries?: number; page: number; totalPages: number; limit?: number };
  } | null;
  analyticsLoading: boolean;
  fetchAnalytics: (page?: number, overrideFilters?: { channel?: string; status?: string; gpt?: string; search?: string }) => Promise<void>;
  handleClearHistory: () => Promise<void>;
  handleDeleteHistoryEntry: (id: string) => Promise<void>;
  handleExportHistory: () => void;
  copiedId: string | null;
  copyToClipboard: (text: string, id: string) => void;
}

export default function AnalyticsTab({
  analyticsData,
  analyticsLoading,
  fetchAnalytics,
  handleClearHistory,
  handleDeleteHistoryEntry,
  handleExportHistory,
  copiedId,
  copyToClipboard,
}: AnalyticsTabProps) {
  const [filterChannel, setFilterChannel] = useState<'all' | 'fanpage' | 'groups' | 'personal' | 'chatgpt'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'failed'>('all');
  const [filterGpt, setFilterGpt] = useState<'all' | 'acc1' | 'acc2'>('all');
  const [analyticsSearch, setAnalyticsSearch] = useState('');
  const [analyticsPage, setAnalyticsPage] = useState(1);

  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryEntry | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [viewingErrorItem, setViewingErrorItem] = useState<HistoryEntry | null>(null);

  const triggerFilter = (page = 1) => {
    setAnalyticsPage(page);
    fetchAnalytics(page, {
      channel: filterChannel,
      status: filterStatus,
      gpt: filterGpt,
      search: analyticsSearch,
    });
  };

  return (
    <>
      <div className="space-y-8">
            
            {/* Header Actions & Filter Controls */}
            <div className="liquid-glass rounded-3xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
                <div>
                  <h2 className="font-extrabold text-xl text-slate-900 tracking-tight flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                      <BarChart3 className="w-5 h-5" />
                    </span>
                    Báo cáo Thống kê & Lịch sử Đăng bài
                  </h2>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Theo dõi chi tiết mọi lượt tạo ảnh AI, kênh xuất bản (Fanpage, Groups, Cá nhân), tài khoản ChatGPT và nguyên nhân lỗi.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => fetchAnalytics(analyticsPage)}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl shadow-xs transition-all"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${analyticsLoading ? 'animate-spin' : ''}`} /> Làm mới
                  </button>
                  <button
                    onClick={handleExportHistory}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-xl shadow-xs transition-all"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600" /> Xuất JSON
                  </button>
                  <button
                    onClick={handleClearHistory}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl shadow-xs transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" /> Xóa lịch sử
                  </button>
                </div>
              </div>

              {/* Filter Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={analyticsSearch}
                    onChange={(e) => setAnalyticsSearch(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') fetchAnalytics(1); }}
                    placeholder="Tìm theo Caption, Prompt, Lỗi..."
                    className="liquid-input w-full rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900"
                  />
                </div>

                {/* Status Filter */}
                <div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="liquid-input w-full rounded-xl px-3 py-2 text-xs font-semibold text-slate-900"
                  >
                    <option value="all">🎯 Tất cả trạng thái</option>
                    <option value="success">✅ Đăng thành công</option>
                    <option value="failed">❌ Thất bại / Có lỗi</option>
                  </select>
                </div>

                {/* Channel Filter */}
                <div>
                  <select
                    value={filterChannel}
                    onChange={(e) => setFilterChannel(e.target.value as any)}
                    className="liquid-input w-full rounded-xl px-3 py-2 text-xs font-semibold text-slate-900"
                  >
                    <option value="all">🌐 Tất cả kênh xuất bản</option>
                    <option value="fanpage">📄 Facebook Fanpage</option>
                    <option value="groups">👥 Facebook Groups</option>
                    <option value="personal">👤 Facebook Cá nhân</option>
                    <option value="chatgpt">🤖 ChatGPT Image AI</option>
                  </select>
                </div>

                {/* ChatGPT Account Filter */}
                <div>
                  <select
                    value={filterGpt}
                    onChange={(e) => setFilterGpt(e.target.value as any)}
                    className="liquid-input w-full rounded-xl px-3 py-2 text-xs font-semibold text-slate-900"
                  >
                    <option value="all">🤖 Tất cả tài khoản ChatGPT</option>
                    <option value="acc1">ChatGPT Tài khoản 1 (9222)</option>
                    <option value="acc2">ChatGPT Tài khoản 2 (9242)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 5 KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* KPI 1: Tổng lượt chạy */}
              <div className="liquid-glass rounded-3xl p-5 relative overflow-hidden">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng Lượt Chạy</span>
                  <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                    <Activity className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-3xl font-black text-slate-900 tracking-tight">
                  {analyticsData?.stats.total || 0}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 font-medium">Toàn bộ tác vụ đã ghi nhận</p>
              </div>

              {/* KPI 2: Đăng Thành Công */}
              <div className="liquid-glass rounded-3xl p-5 relative overflow-hidden border-emerald-200/80 bg-gradient-to-br from-white/90 to-emerald-50/30">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Thành Công</span>
                  <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <div className="text-3xl font-black text-emerald-700 tracking-tight">
                    {analyticsData?.stats.successCount || 0}
                  </div>
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {analyticsData?.stats.successRate ?? 100}%
                  </span>
                </div>
                <p className="text-[11px] text-emerald-600/80 mt-1 font-medium">Xuất bản không gặp trở ngại</p>
              </div>

              {/* KPI 3: Lỗi / Thất Bại */}
              <div className="liquid-glass rounded-3xl p-5 relative overflow-hidden border-rose-200/80 bg-gradient-to-br from-white/90 to-rose-50/30">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Gặp Lỗi / Thất Bại</span>
                  <span className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
                    <AlertCircle className="w-4 h-4" />
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <div className="text-3xl font-black text-rose-700 tracking-tight">
                    {analyticsData?.stats.failedCount || 0}
                  </div>
                  <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                    {analyticsData?.stats.total ? Math.round(((analyticsData?.stats.failedCount || 0) / analyticsData.stats.total) * 100) : 0}%
                  </span>
                </div>
                <p className="text-[11px] text-rose-600/80 mt-1 font-medium">Có phân tích nguyên nhân</p>
              </div>

              {/* KPI 4: Xoay vòng ChatGPT */}
              <div className="liquid-glass rounded-3xl p-5 relative overflow-hidden">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-violet-700 uppercase tracking-wider">Tài khoản ChatGPT</span>
                  <span className="p-2 rounded-xl bg-violet-50 text-violet-600 border border-violet-100">
                    <Bot className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-800 space-y-1 mt-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600">Acc 1 (9222):</span>
                    <b className="text-violet-700">{analyticsData?.stats.byGpt.acc1.count || 0} lượt</b>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600">Acc 2 (9242):</span>
                    <b className="text-indigo-700">{analyticsData?.stats.byGpt.acc2.count || 0} lượt</b>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">Tự động xen kẽ luân phiên</p>
              </div>

              {/* KPI 5: Thời gian TB */}
              <div className="liquid-glass rounded-3xl p-5 relative overflow-hidden">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Thời Gian TB</span>
                  <span className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                    <Clock className="w-4 h-4" />
                  </span>
                </div>
                <div className="text-3xl font-black text-slate-900 tracking-tight">
                  {analyticsData?.stats.avgDurationSec || 0}<span className="text-sm font-bold text-slate-500 ml-1">giây</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 font-medium">Tốc độ xử lý mỗi bài viết</p>
              </div>
            </div>

            {/* Row 2: Phân tích Kênh & Top Nguyên nhân Lỗi */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Breakdown Kênh */}
              <div className="liquid-glass rounded-3xl p-6 space-y-4">
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600" /> Phân Bổ Theo Kênh Xuất Bản
                </h3>
                
                <div className="space-y-3 pt-1">
                  {/* Fanpage */}
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-blue-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span> Facebook Fanpage
                      </span>
                      <span className="text-slate-700">
                        {analyticsData?.stats.byChannel.fanpage.success || 0} thành công / {analyticsData?.stats.byChannel.fanpage.total || 0} bài
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                        style={{
                          width: `${analyticsData?.stats.byChannel.fanpage.total ? (analyticsData.stats.byChannel.fanpage.success / analyticsData.stats.byChannel.fanpage.total) * 100 : 0}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Groups */}
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-indigo-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Facebook Groups
                      </span>
                      <span className="text-slate-700">
                        {analyticsData?.stats.byChannel.groups.success || 0} thành công / {analyticsData?.stats.byChannel.groups.total || 0} bài
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                        style={{
                          width: `${analyticsData?.stats.byChannel.groups.total ? (analyticsData.stats.byChannel.groups.success / analyticsData.stats.byChannel.groups.total) * 100 : 0}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Personal */}
                  <div>
                    <div className="flex justify-between text-xs font-bold mb-1">
                      <span className="text-teal-700 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-teal-500"></span> Facebook Trang Cá Nhân
                      </span>
                      <span className="text-slate-700">
                        {analyticsData?.stats.byChannel.personal.success || 0} thành công / {analyticsData?.stats.byChannel.personal.total || 0} bài
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-teal-600 h-2.5 rounded-full transition-all duration-500"
                        style={{
                          width: `${analyticsData?.stats.byChannel.personal.total ? (analyticsData.stats.byChannel.personal.success / analyticsData.stats.byChannel.personal.total) * 100 : 0}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Lỗi & Gợi ý Khắc Phục */}
              <div className="liquid-glass rounded-3xl p-6 space-y-4">
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600" /> Bác Sĩ Chuẩn Đoán & Gợi Ý Khắc Phục
                </h3>
                
                {(!analyticsData?.stats.topErrors || analyticsData.stats.topErrors.length === 0) ? (
                  <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    Hệ thống đang hoạt động hoàn hảo! Không có lỗi nào đáng chú ý được ghi nhận.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {analyticsData.stats.topErrors.map((err, idx) => (
                      <div key={idx} className="p-3 rounded-2xl bg-rose-50/70 border border-rose-200/90 text-xs space-y-1">
                        <div className="flex justify-between items-start font-bold text-rose-900">
                          <span className="flex-1 pr-2">⚠️ {err.reason}</span>
                          <span className="px-2 py-0.5 rounded-md bg-rose-200/70 text-rose-900 text-[10px] font-black">{err.count} lần</span>
                        </div>
                        <div className="text-[11px] text-slate-600 font-medium">
                          💡 <b className="text-slate-800">Giải pháp:</b> {err.suggestion}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Detailed History Table */}
            <div className="liquid-glass rounded-3xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" /> Nhật Ký Chi Tiết Từng Bài Đăng
                </h3>
                <span className="text-xs text-slate-500 font-semibold">
                  Hiển thị {analyticsData?.history.length || 0} / {(analyticsData?.pagination.totalEntries || analyticsData?.pagination.total || 0) || 0} bản ghi
                </span>
              </div>

              <div className="border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs bg-white/60">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/90 border-b border-slate-200/90 text-slate-700 font-bold">
                      <tr>
                        <th className="py-3 px-3 w-10 text-center">STT</th>
                        <th className="py-3 px-3 w-36">Thời gian</th>
                        <th className="py-3 px-3 w-36">Kênh & Đích đến</th>
                        <th className="py-3 px-3 w-40">Tài khoản ChatGPT</th>
                        <th className="py-3 px-3 w-28 text-center">Trạng thái</th>
                        <th className="py-3 px-4">Nội dung / Lỗi chi tiết</th>
                        <th className="py-3 px-3 w-24 text-center">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(!analyticsData?.history || analyticsData.history.length === 0) ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                            Chưa có nhật ký nào phù hợp với bộ lọc hiện tại.
                          </td>
                        </tr>
                      ) : (
                        analyticsData.history.map((item, idx) => {
                          const isSuccess = item.status === 'success';
                          const dateStr = new Date(item.timestamp).toLocaleString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          });

                          return (
                            <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                              <td className="py-3 px-3 text-center font-bold text-slate-400">
                                {((analyticsPage - 1) * 25) + idx + 1}
                              </td>
                              <td className="py-3 px-3 text-slate-600 font-medium whitespace-nowrap">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                  <span>{dateStr}</span>
                                </div>
                                {item.durationMs ? (
                                  <span className="text-[10px] text-slate-400 block mt-0.5">
                                    ⏱️ {(item.durationMs / 1000).toFixed(1)}s
                                  </span>
                                ) : null}
                              </td>
                              <td className="py-3 px-3">
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  {item.channel === 'fanpage' && <span className="p-1 rounded bg-blue-100 text-blue-700 text-[10px]">Fanpage</span>}
                                  {item.channel === 'groups' && <span className="p-1 rounded bg-indigo-100 text-indigo-700 text-[10px]">Group</span>}
                                  {item.channel === 'personal' && <span className="p-1 rounded bg-teal-100 text-teal-700 text-[10px]">Cá nhân</span>}
                                  {item.channel === 'chatgpt' && <span className="p-1 rounded bg-violet-100 text-violet-700 text-[10px]">AI Image</span>}
                                </div>
                                {item.targetUrl && (
                                  <a
                                    href={item.targetUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-blue-600 hover:text-blue-800 hover:underline text-[11px] truncate max-w-[140px] block mt-0.5 font-medium"
                                    title={item.targetUrl}
                                  >
                                    🔗 {item.targetName || item.targetUrl.replace(/^https?:\/\/(www\.)?facebook\.com\//, '')}
                                  </a>
                                )}
                              </td>
                              <td className="py-3 px-3">
                                {item.chatgptAccount ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-violet-50 text-violet-700 border border-violet-200">
                                    <Bot className="w-3 h-3" />
                                    {item.chatgptAccount.replace('ChatGPT ', '')}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[11px]">—</span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black ${
                                  isSuccess
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'
                                }`}>
                                  {isSuccess ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <AlertCircle className="w-3 h-3 text-rose-600" />}
                                  {isSuccess ? 'Thành công' : 'Thất bại'}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <div className="max-w-md">
                                  {item.caption && (
                                    <p className="font-semibold text-slate-800 line-clamp-1 mb-0.5">
                                      {item.caption}
                                    </p>
                                  )}
                                  {item.prompt && (
                                    <p className="text-[11px] text-slate-500 line-clamp-1 italic">
                                      🎨 Prompt: {item.prompt}
                                    </p>
                                  )}
                                  {!isSuccess && item.error && (() => {
                                    const parsed = parseErrorMessage(item.error);
                                    return (
                                      <div
                                        onClick={() => setViewingErrorItem(item)}
                                        className="mt-1.5 p-1.5 px-2.5 rounded-xl bg-rose-50 border border-rose-200/90 text-rose-800 text-[11px] flex items-center justify-between gap-2 max-w-md shadow-xs group/err hover:bg-rose-100/80 hover:border-rose-300 transition-all cursor-pointer"
                                        title="Nhấp để mở to xem chi tiết lỗi"
                                      >
                                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                          <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                          <span className="font-bold truncate text-rose-900">
                                            Lỗi: {parsed.summary}
                                          </span>
                                        </div>
                                        <span
                                          className="shrink-0 px-2 py-0.5 rounded-lg text-[10px] font-black bg-rose-200 group-hover/err:bg-rose-300 text-rose-900 flex items-center gap-1 transition-all shadow-xs"
                                        >
                                          <Maximize2 className="w-2.5 h-2.5" />
                                          Xem lỗi
                                        </span>
                                      </div>
                                    );
                                  })()}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => { setSelectedHistoryItem(item); setIsDetailModalOpen(true); }}
                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                    title="Xem chi tiết toàn bộ"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteHistoryEntry(item.id)}
                                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                    title="Xóa bản ghi này"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Bar */}
                {analyticsData && analyticsData.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200">
                    <span className="text-xs text-slate-500">
                      Trang <b>{analyticsPage}</b> / <b>{analyticsData.pagination.totalPages}</b>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={analyticsPage <= 1}
                        onClick={() => fetchAnalytics(analyticsPage - 1)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg border ${
                          analyticsPage <= 1
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        Trang trước
                      </button>
                      <button
                        disabled={analyticsPage >= analyticsData.pagination.totalPages}
                        onClick={() => fetchAnalytics(analyticsPage + 1)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg border ${
                          analyticsPage >= analyticsData.pagination.totalPages
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        Trang sau
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
      <AnalyticsModals
        selectedHistoryItem={selectedHistoryItem}
        setSelectedHistoryItem={setSelectedHistoryItem}
        isDetailModalOpen={isDetailModalOpen}
        setIsDetailModalOpen={setIsDetailModalOpen}
        viewingErrorItem={viewingErrorItem}
        setViewingErrorItem={setViewingErrorItem}
        copiedId={copiedId}
        copyToClipboard={copyToClipboard}
        handleDeleteHistoryEntry={handleDeleteHistoryEntry}
      />
    </>
  );
}
