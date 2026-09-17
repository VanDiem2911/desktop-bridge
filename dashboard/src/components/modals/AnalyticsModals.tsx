'use client';

import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  X,
  Copy,
  Check,
  Trash2,
  Eye,
} from 'lucide-react';
import { HistoryEntry } from '@/types/dashboard';
import { parseErrorMessage } from '@/lib/error-parser';

interface AnalyticsModalsProps {
  selectedHistoryItem: HistoryEntry | null;
  setSelectedHistoryItem: (item: HistoryEntry | null) => void;
  isDetailModalOpen: boolean;
  setIsDetailModalOpen: (open: boolean) => void;
  viewingErrorItem: HistoryEntry | null;
  setViewingErrorItem: (item: HistoryEntry | null) => void;
  copiedId: string | null;
  copyToClipboard: (text: string, id: string) => void;
  handleDeleteHistoryEntry: (id: string) => Promise<void>;
}

export default function AnalyticsModals({
  selectedHistoryItem,
  setSelectedHistoryItem,
  isDetailModalOpen,
  setIsDetailModalOpen,
  viewingErrorItem,
  setViewingErrorItem,
  copiedId,
  copyToClipboard,
  handleDeleteHistoryEntry,
}: AnalyticsModalsProps) {
  return (
    <>
      {/* ==================== MODAL CHI TIẾT NHẬT KÝ BÀI ĐĂNG (ANALYTICS DETAIL) ==================== */}
      {isDetailModalOpen && selectedHistoryItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="liquid-glass-modal rounded-3xl w-full max-w-2xl p-7 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
              <div className="flex items-center gap-3">
                <span
                  className={`p-2.5 rounded-2xl ${
                    selectedHistoryItem.status === 'success'
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : 'bg-rose-50 text-rose-600 border border-rose-200'
                  }`}
                >
                  {selectedHistoryItem.status === 'success' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <AlertCircle className="w-5 h-5" />
                  )}
                </span>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">Chi Tiết Nhật Ký Tác Vụ</h3>
                  <p className="text-xs text-slate-500 font-mono">{selectedHistoryItem.id}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedHistoryItem(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-bold block mb-1">Thời gian thực hiện:</span>
                <span className="font-bold text-slate-900">
                  {new Date(selectedHistoryItem.timestamp).toLocaleString('vi-VN')}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-bold block mb-1">Thời lượng xử lý:</span>
                <span className="font-bold text-slate-900">
                  {selectedHistoryItem.durationMs
                    ? `${(selectedHistoryItem.durationMs / 1000).toFixed(2)} giây`
                    : 'N/A'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-bold block mb-1">Kênh xuất bản:</span>
                <span className="font-bold text-blue-600 uppercase">
                  {selectedHistoryItem.channelName || selectedHistoryItem.channel}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-bold block mb-1">Tài khoản AI ChatGPT:</span>
                <span className="font-bold text-slate-900">
                  {selectedHistoryItem.chatgptAccount || '—'}
                </span>
              </div>
            </div>

            {selectedHistoryItem.targetUrl && (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs flex items-center justify-between">
                <span className="truncate text-blue-700 font-mono">
                  🔗 {selectedHistoryItem.targetUrl}
                </span>
                <a
                  href={selectedHistoryItem.targetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 px-2 py-1 bg-white hover:bg-blue-100 text-blue-700 font-bold rounded-lg border border-blue-200 shadow-2xs transition-all"
                >
                  Mở link
                </a>
              </div>
            )}

            {selectedHistoryItem.title && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Tiêu đề bài viết:</label>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium text-xs">
                  {selectedHistoryItem.title}
                </div>
              </div>
            )}

            {selectedHistoryItem.caption && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Nội dung Caption:</label>
                  <button
                    onClick={() =>
                      copyToClipboard(selectedHistoryItem.caption || '', `modal_cap_${selectedHistoryItem.id}`)
                    }
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedId === `modal_cap_${selectedHistoryItem.id}` ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    Sao chép
                  </button>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-normal whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {selectedHistoryItem.caption}
                </div>
              </div>
            )}

            {selectedHistoryItem.prompt && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Prompt tạo ảnh ChatGPT:</label>
                  <button
                    onClick={() =>
                      copyToClipboard(selectedHistoryItem.prompt || '', `modal_prm_${selectedHistoryItem.id}`)
                    }
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedId === `modal_prm_${selectedHistoryItem.id}` ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    Sao chép
                  </button>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                  {selectedHistoryItem.prompt}
                </div>
              </div>
            )}

            {selectedHistoryItem.error && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-rose-600">Thông báo lỗi:</label>
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-mono text-xs whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                  {selectedHistoryItem.error}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-200/80">
              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setSelectedHistoryItem(null);
                }}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white shadow-md transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL CHI TIẾT LỖI TÁC VỤ (ERROR DETAIL MODAL) ==================== */}
      {viewingErrorItem &&
        (() => {
          const parsed = parseErrorMessage(viewingErrorItem.error);
          const hasTechDetails = parsed.technicalDetails || viewingErrorItem.errorDetails;
          const fullTechDetails = viewingErrorItem.errorDetails
            ? parsed.technicalDetails
              ? `${parsed.technicalDetails}\n\n--- Stack Trace ---\n${viewingErrorItem.errorDetails}`
              : viewingErrorItem.errorDetails
            : parsed.technicalDetails;

          return (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
              <div className="liquid-glass-modal rounded-3xl w-full max-w-2xl p-6 md:p-7 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto border border-rose-200/80">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-rose-100 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 rounded-2xl bg-rose-100 text-rose-600 border border-rose-200 shadow-sm">
                      <AlertCircle className="w-6 h-6" />
                    </span>
                    <div>
                      <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                        Chi Tiết Lỗi Thất Bại
                      </h3>
                      <p className="text-xs text-slate-500 font-mono">
                        Mã tác vụ: {viewingErrorItem.id} •{' '}
                        {new Date(viewingErrorItem.timestamp).toLocaleString('vi-VN')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setViewingErrorItem(null)}
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Context Info */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 font-bold block mb-0.5">Kênh xuất bản:</span>
                    <span className="font-extrabold text-blue-700">
                      {viewingErrorItem.channelName || viewingErrorItem.channel}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 font-bold block mb-0.5">Tài khoản đích:</span>
                    <span className="font-extrabold text-slate-800">
                      {viewingErrorItem.targetName || 'Mặc định'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 col-span-2 sm:col-span-1">
                    <span className="text-slate-500 font-bold block mb-0.5">Tài khoản AI:</span>
                    <span className="font-extrabold text-violet-700">
                      {viewingErrorItem.chatgptAccount || '—'}
                    </span>
                  </div>
                </div>

                {/* Target URL if present */}
                {viewingErrorItem.targetUrl && (
                  <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <span className="text-blue-900 font-bold shrink-0">🔗 Đường dẫn:</span>
                      <a
                        href={viewingErrorItem.targetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-600 hover:underline truncate font-mono"
                      >
                        {viewingErrorItem.targetUrl}
                      </a>
                    </div>
                    <button
                      onClick={() =>
                        copyToClipboard(viewingErrorItem.targetUrl!, `url_${viewingErrorItem.id}`)
                      }
                      className="shrink-0 p-1 text-blue-600 hover:bg-blue-100 rounded-lg transition-all cursor-pointer"
                      title="Sao chép link"
                    >
                      {copiedId === `url_${viewingErrorItem.id}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}

                {/* Clean Error Message */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-rose-800 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-600" /> Nội Dung Lỗi Gặp Phải:
                    </label>
                    <button
                      onClick={() => copyToClipboard(parsed.summary, `err_msg_${viewingErrorItem.id}`)}
                      className="text-[11px] font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1 bg-rose-100/80 px-2 py-0.5 rounded-md hover:bg-rose-200 transition-all cursor-pointer"
                    >
                      {copiedId === `err_msg_${viewingErrorItem.id}` ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      Sao chép lỗi
                    </button>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 font-bold text-xs leading-relaxed shadow-xs">
                    {parsed.summary}
                  </div>
                </div>

                {/* Suggestion / Fix guidance */}
                {parsed.suggestion && (
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs space-y-1">
                    <div className="font-extrabold text-amber-900 flex items-center gap-1.5">
                      💡 Hướng dẫn khắc phục:
                    </div>
                    <p className="text-amber-800 font-medium leading-relaxed">
                      {parsed.suggestion}
                    </p>
                  </div>
                )}

                {/* Technical Stack / Call Log */}
                {hasTechDetails && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        ⚙️ Chi tiết nhật ký kỹ thuật (Call Log / Stack Trace):
                      </label>
                      <button
                        onClick={() =>
                          copyToClipboard(fullTechDetails || '', `err_tech_${viewingErrorItem.id}`)
                        }
                        className="text-[11px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md hover:bg-slate-200 transition-all cursor-pointer"
                      >
                        {copiedId === `err_tech_${viewingErrorItem.id}` ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        Sao chép log
                      </button>
                    </div>
                    <pre className="p-3.5 rounded-2xl bg-slate-900 text-rose-300 text-[11px] font-mono leading-relaxed overflow-x-auto max-h-56 border border-slate-800 shadow-inner">
                      {fullTechDetails}
                    </pre>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-3 border-t border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteHistoryEntry(viewingErrorItem.id);
                      setViewingErrorItem(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-700 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Xóa bản ghi này
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const item = viewingErrorItem;
                        setViewingErrorItem(null);
                        setSelectedHistoryItem(item);
                        setIsDetailModalOpen(true);
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" /> Xem toàn bộ tác vụ
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewingErrorItem(null)}
                      className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white shadow-md transition-all cursor-pointer"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
    </>
  );
}
