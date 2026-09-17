'use client';

import React, { useState } from 'react';
import {
  Download,
  Database,
  FileText,
  Copy,
  Check,
  X,
  Plus,
  RefreshCw,
  Shuffle,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import { CentralPoolItem, GroupAccount, PoolStats } from '@/types/dashboard';

interface GroupModalsProps {
  isDetectingName: boolean;
  handleAutoDetectFbName: (url: string, targetType?: string) => Promise<void>;
  poolStats: PoolStats;
  handleExportCsv: () => void;
  handleExportTxt: () => void;
  handlePoolDistribute: (e: React.FormEvent) => Promise<void>;

  isAddGroupOpen: boolean;
  setIsAddGroupOpen: (open: boolean) => void;
  newGroupUrl: string;
  setNewGroupUrl: (val: string) => void;
  selectedGroupAcc: string;
  setSelectedGroupAcc: (val: string) => void;
  handleAddGroup: (e: React.FormEvent) => Promise<void>;

  isBulkGroupOpen: boolean;
  setIsBulkGroupOpen: (open: boolean) => void;
  bulkGroupText: string;
  setBulkGroupText: (val: string) => void;
  bulkMode: 'append' | 'replace';
  setBulkMode: (val: 'append' | 'replace') => void;
  handleBulkImport: (e: React.FormEvent) => Promise<void>;

  isExportModalOpen: boolean;
  setIsExportModalOpen: (open: boolean) => void;
  exportFilterAcc: string;
  setExportFilterAcc: (acc: string) => void;
  exportFilterPostStatus: string;
  setExportFilterPostStatus: (status: string) => void;
  exportFilterJoinStatus: string;
  setExportFilterJoinStatus: (status: string) => void;
  exportCopied: boolean;
  getExportablePoolItems: () => CentralPoolItem[];
  handleCopyExportLinks: () => void;
  groupsData: {
    accounts?: GroupAccount[];
    pool?: CentralPoolItem[];
    centralPool?: CentralPoolItem[];
  };

  isPoolImportOpen: boolean;
  setIsPoolImportOpen: (open: boolean) => void;
  poolImportText: string;
  setPoolImportText: (text: string) => void;
  poolImportAssignAcc: string;
  setPoolImportAssignAcc: (acc: string) => void;
  poolImportAutoDistribute: boolean;
  setPoolImportAutoDistribute: (val: boolean) => void;
  handlePoolImport: () => Promise<void>;

  isDistributeModalOpen: boolean;
  setIsDistributeModalOpen: (open: boolean) => void;
  distributeMode: 'unassigned_only' | 'all';
  setDistributeMode: (mode: 'unassigned_only' | 'all') => void;
  distributeSelectedAccs: string[];
  setDistributeSelectedAccs: React.Dispatch<React.SetStateAction<string[]>>;
  distributeLoading: boolean;

  isRevokeModalOpen: boolean;
  setIsRevokeModalOpen: (open: boolean) => void;
  revokeMode: 'unposted_only' | 'all';
  setRevokeMode: (mode: 'unposted_only' | 'all') => void;
  revokeTargetAcc: string;
  setRevokeTargetAcc: (acc: string) => void;
  revokeLoading: boolean;
  handlePoolRevoke: (e: React.FormEvent) => Promise<void>;

  viewingGroupError: { url: string; error: string } | null;
  setViewingGroupError: (val: { url: string; error: string } | null) => void;
  copyToClipboard: (text: string, id: string) => void;
  copiedId: string | null;
}

export default function GroupModals({
  isDetectingName,
  handleAutoDetectFbName,
  poolStats,
  handleExportCsv,
  handleExportTxt,
  handlePoolDistribute,
  isAddGroupOpen,
  setIsAddGroupOpen,
  newGroupUrl,
  setNewGroupUrl,
  selectedGroupAcc,
  setSelectedGroupAcc,
  handleAddGroup,
  isBulkGroupOpen,
  setIsBulkGroupOpen,
  bulkGroupText,
  setBulkGroupText,
  bulkMode,
  setBulkMode,
  handleBulkImport,
  isExportModalOpen,
  setIsExportModalOpen,
  exportFilterAcc,
  setExportFilterAcc,
  exportFilterPostStatus,
  setExportFilterPostStatus,
  exportFilterJoinStatus,
  setExportFilterJoinStatus,
  exportCopied,
  getExportablePoolItems,
  handleCopyExportLinks,
  groupsData,
  isPoolImportOpen,
  setIsPoolImportOpen,
  poolImportText,
  setPoolImportText,
  poolImportAssignAcc,
  setPoolImportAssignAcc,
  poolImportAutoDistribute,
  setPoolImportAutoDistribute,
  handlePoolImport,
  isDistributeModalOpen,
  setIsDistributeModalOpen,
  distributeMode,
  setDistributeMode,
  distributeSelectedAccs,
  setDistributeSelectedAccs,
  distributeLoading,
  isRevokeModalOpen,
  setIsRevokeModalOpen,
  revokeMode,
  setRevokeMode,
  revokeTargetAcc,
  setRevokeTargetAcc,
  revokeLoading,
  handlePoolRevoke,
  viewingGroupError,
  setViewingGroupError,
  copyToClipboard,
  copiedId,
}: GroupModalsProps) {
  const [detectedGroupName, setDetectedGroupName] = useState('');
  return (
    <>
      {/* ==================== MODAL THÊM LINK NHÓM ==================== */}
      {isAddGroupOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="liquid-glass-modal rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-extrabold text-lg text-slate-900">➕ Thêm Link Nhóm Facebook</h3>
            <form onSubmit={handleAddGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tài khoản nhận nhóm:</label>
                <select
                  value={selectedGroupAcc}
                  onChange={(e) => setSelectedGroupAcc(e.target.value)}
                  className="liquid-input w-full rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900"
                >
                  {groupsData.accounts?.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">URL Nhóm Facebook:</label>
                  {isDetectingName && (
                    <span className="text-[11px] font-extrabold text-blue-600 flex items-center gap-1.5 animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Đang lấy tên nhóm...
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="url"
                    value={newGroupUrl}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewGroupUrl(val);
                      if (val.includes('facebook.com') && val.length > 25) {
                        handleAutoDetectFbName(val, 'newGroup');
                      }
                    }}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData('text');
                      if (pasted && pasted.includes('facebook.com')) {
                        handleAutoDetectFbName(pasted, 'newGroup');
                      }
                    }}
                    placeholder="https://www.facebook.com/groups/..."
                    required
                    className="liquid-input w-full rounded-xl px-3.5 py-2.5 pr-20 text-sm text-slate-900 font-mono text-xs"
                  />
                  {newGroupUrl && (
                    <button
                      type="button"
                      disabled={isDetectingName}
                      onClick={() => handleAutoDetectFbName(newGroupUrl, 'newGroup')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg border border-blue-200 cursor-pointer transition-colors"
                      title="Bấm để lấy tên nhóm từ link"
                    >
                      ⚡ Lấy tên
                    </button>
                  )}
                </div>
                {detectedGroupName && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 animate-in fade-in">
                    <span className="text-base">✨</span>
                    <div className="text-xs text-emerald-900 leading-tight">
                      <span className="font-semibold text-emerald-700">Tên nhóm nhận diện: </span>
                      <strong className="font-bold">{detectedGroupName}</strong>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => { setDetectedGroupName(''); setIsAddGroupOpen(false); }}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md shadow-blue-600/30"
                >
                  Lưu nhóm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL IMPORT HÀNG LOẠT NHÓM ==================== */}
      {isBulkGroupOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="liquid-glass-modal rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h3 className="font-extrabold text-lg text-slate-900">📥 Import Hàng Loạt Link Nhóm</h3>
            <form onSubmit={handleBulkImport} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tài khoản nhận nhóm:</label>
                <select
                  value={selectedGroupAcc}
                  onChange={(e) => setSelectedGroupAcc(e.target.value)}
                  className="liquid-input w-full rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900"
                >
                  {groupsData.accounts?.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Chế độ Import:</label>
                <select
                  value={bulkMode}
                  onChange={(e) => setBulkMode(e.target.value as 'append' | 'replace')}
                  className="liquid-input w-full rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900"
                >
                  <option value="append">Thêm nối tiếp vào danh sách cũ</option>
                  <option value="replace">Ghi đè (Xóa cũ và thay bằng danh sách mới)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Danh sách link nhóm (Mỗi link 1 dòng):</label>
                <textarea
                  value={bulkGroupText}
                  onChange={(e) => setBulkGroupText(e.target.value)}
                  rows={6}
                  placeholder="https://www.facebook.com/groups/nhom1&#10;https://www.facebook.com/groups/nhom2"
                  required
                  className="liquid-input w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-mono text-xs"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBulkGroupOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md shadow-blue-600/30"
                >
                  Thực hiện Import
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL XUẤT LINK FACEBOOK ==================== */}
      {isExportModalOpen && (() => {
        const exportItems = getExportablePoolItems();
        return (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
            <div className="liquid-glass-modal rounded-3xl w-full max-w-xl p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <Download className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-extrabold text-base md:text-lg text-slate-900">
                      Xuất Danh Sách Link Facebook
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Tải file .TXT nạp tool, file .CSV (Excel) chi tiết hoặc sao chép nhanh
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsExportModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Filters */}
              <div className="space-y-3 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Bộ lọc danh sách xuất
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Account Filter */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Nick phụ trách:</label>
                    <select
                      value={exportFilterAcc}
                      onChange={(e) => setExportFilterAcc(e.target.value)}
                      className="liquid-input w-full rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800"
                    >
                      <option value="all">Tất cả ({poolStats.total || groupsData.centralPool?.length || 0})</option>
                      <option value="unassigned">Chưa gán ({poolStats.unassigned || 0})</option>
                      {groupsData.accounts?.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.groupUrls?.length || 0} link)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Post Status Filter */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Trạng thái đăng:</label>
                    <select
                      value={exportFilterPostStatus}
                      onChange={(e) => setExportFilterPostStatus(e.target.value)}
                      className="liquid-input w-full rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800"
                    >
                      <option value="all">Tất cả trạng thái</option>
                      <option value="success">🟢 Đã đăng thành công</option>
                      <option value="failed">🔴 Gặp lỗi đăng bài</option>
                      <option value="not_posted">⚪ Chưa từng đăng</option>
                    </select>
                  </div>

                  {/* Join Status Filter */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Trạng thái nhóm:</label>
                    <select
                      value={exportFilterJoinStatus}
                      onChange={(e) => setExportFilterJoinStatus(e.target.value)}
                      className="liquid-input w-full rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800"
                    >
                      <option value="all">Tất cả nhóm</option>
                      <option value="joined">🤝 Đã tham gia</option>
                      <option value="pending">⏳ Đang chờ duyệt</option>
                      <option value="not_joined">❌ Chưa tham gia</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Status & Preview */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-blue-600" />
                    Đang chọn: <b className="text-blue-600 font-extrabold">{exportItems.length}</b> link Facebook
                  </span>
                  <button
                    onClick={handleCopyExportLinks}
                    className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors"
                  >
                    {exportCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">Đã chép vào bộ nhớ tạm!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép toàn bộ</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="relative">
                  <textarea
                    readOnly
                    rows={6}
                    value={exportItems.map((it) => it.url).join('\n')}
                    placeholder="Không có link nào phù hợp bộ lọc..."
                    className="liquid-input w-full rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-700 bg-slate-50/70 select-all resize-none"
                  />
                  {exportItems.length > 0 && (
                    <span className="absolute bottom-2.5 right-3 text-[10px] font-medium text-slate-400 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200/60 pointer-events-none">
                      {exportItems.length} dòng
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-all"
                >
                  Đóng
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyExportLinks}
                    disabled={exportItems.length === 0}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-bold text-slate-700 disabled:opacity-50 transition-all shadow-xs cursor-pointer"
                  >
                    {exportCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                    Sao chép Clipboard
                  </button>

                  <button
                    type="button"
                    onClick={handleExportCsv}
                    disabled={exportItems.length === 0}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-xs font-bold text-blue-700 disabled:opacity-50 transition-all shadow-xs cursor-pointer"
                    title="Xuất file CSV mở bằng Microsoft Excel với đầy đủ cột trạng thái, nick phụ trách, lỗi"
                  >
                    <Download className="w-4 h-4 text-blue-600" />
                    Tải file .CSV (Excel)
                  </button>

                  <button
                    type="button"
                    onClick={handleExportTxt}
                    disabled={exportItems.length === 0}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-md shadow-emerald-600/25 disabled:opacity-50 transition-all cursor-pointer"
                    title="Tải file TXT mỗi link một dòng để nạp vào tool"
                  >
                    <FileText className="w-4 h-4" />
                    Tải file .TXT
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ==================== MODAL IMPORT VÀO KHO CHUNG ==================== */}
      {isPoolImportOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="liquid-glass-modal rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" /> Import Link vào Kho chung
              </h3>
              <button
                onClick={() => setIsPoolImportOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePoolImport} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Danh sách link nhóm Facebook (Mỗi link 1 dòng):
                </label>
                <textarea
                  value={poolImportText}
                  onChange={(e) => setPoolImportText(e.target.value)}
                  rows={6}
                  placeholder="https://www.facebook.com/groups/nhom1&#10;https://www.facebook.com/groups/nhom2&#10;https://www.facebook.com/groups/nhom3..."
                  required
                  className="liquid-input w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-mono text-xs"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Hệ thống sẽ tự động lọc bỏ các link trùng lặp và link không hợp lệ.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Gán luôn cho Nick (Tùy chọn):
                </label>
                <select
                  value={poolImportAssignAcc}
                  onChange={(e) => setPoolImportAssignAcc(e.target.value)}
                  className="liquid-input w-full rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-900"
                >
                  <option value="">⚪ Để trống (Lưu vào Kho chung chưa gán)</option>
                  {groupsData.accounts?.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      👤 Gán ngay cho: {acc.name} ({acc.groupUrls?.length || 0} link hiện có)
                    </option>
                  ))}
                </select>
              </div>

              {!poolImportAssignAcc && (
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-violet-50/80 border border-violet-200">
                  <input
                    type="checkbox"
                    id="poolAutoDist"
                    checked={poolImportAutoDistribute}
                    onChange={(e) => setPoolImportAutoDistribute(e.target.checked)}
                    className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 border-slate-300 cursor-pointer"
                  />
                  <label htmlFor="poolAutoDist" className="text-xs font-bold text-violet-900 cursor-pointer">
                    ⚡ Tự động chia đều cho các Nick đang bật ngay sau khi nạp
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPoolImportOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md shadow-blue-600/30"
                >
                  Thực hiện Import
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL TỰ ĐỘNG CHIA ĐỀU ==================== */}
      {isDistributeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="liquid-glass-modal rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                <Shuffle className="w-5 h-5 text-violet-600" /> Tự động Chia đều Link Nhóm
              </h3>
              <button
                onClick={() => setIsDistributeModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePoolDistribute} className="space-y-4">
              {/* Mode Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Chế độ phân bổ:</label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDistributeMode('unassigned_only')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      distributeMode === 'unassigned_only'
                        ? 'bg-violet-50/90 border-violet-400 text-violet-900 shadow-xs'
                        : 'bg-white/60 border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs font-extrabold block">⚪ Chỉ link Chưa gán</span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">
                      Phân bổ <b>{poolStats.unassigned || 0}</b> link chưa có chủ
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDistributeMode('all')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      distributeMode === 'all'
                        ? 'bg-violet-50/90 border-violet-400 text-violet-900 shadow-xs'
                        : 'bg-white/60 border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs font-extrabold block">🔄 Chia lại toàn bộ</span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">
                      Phân bổ đều lại cả <b>{poolStats.total || groupsData.centralPool?.length || 0}</b> link
                    </span>
                  </button>
                </div>
              </div>

              {/* Account Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">Chọn các Nick nhận link:</label>
                  <button
                    type="button"
                    onClick={() => {
                      const allIds = (groupsData.accounts || []).map((a) => a.id);
                      setDistributeSelectedAccs(
                        distributeSelectedAccs.length === allIds.length ? [] : allIds
                      );
                    }}
                    className="text-[11px] font-bold text-blue-600 hover:underline"
                  >
                    {distributeSelectedAccs.length === (groupsData.accounts?.length || 0)
                      ? 'Bỏ chọn tất cả'
                      : 'Chọn tất cả'}
                  </button>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {groupsData.accounts?.map((acc) => {
                    const isChecked = distributeSelectedAccs.includes(acc.id);
                    return (
                      <label
                        key={acc.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-blue-50/70 border-blue-300 text-blue-950'
                            : 'bg-slate-50/60 border-slate-200 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setDistributeSelectedAccs([...distributeSelectedAccs, acc.id]);
                              } else {
                                setDistributeSelectedAccs(
                                  distributeSelectedAccs.filter((id) => id !== acc.id)
                                );
                              }
                            }}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                          />
                          <span className="text-xs font-bold">{acc.name}</span>
                          {acc.enabled === false && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-600">Đã tắt</span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 font-mono">
                          {acc.groupUrls?.length || 0} link
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Estimation Summary Box */}
              {(() => {
                const totalToDist =
                  distributeMode === 'all'
                    ? poolStats.total || groupsData.centralPool?.length || 0
                    : poolStats.unassigned || 0;
                const accCount = distributeSelectedAccs.length;
                const approxPerAcc = accCount > 0 ? Math.ceil(totalToDist / accCount) : 0;

                return (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 text-xs">
                    <span className="text-violet-950 font-bold block mb-1">📊 Dự kiến kết quả phân bổ:</span>
                    <p className="text-violet-800 font-medium leading-relaxed">
                      Sẽ chia <b>{totalToDist} link</b> cho <b>{accCount} tài khoản</b> đã chọn.<br />
                      Mỗi tài khoản sẽ nhận trung bình khoảng <b>~{approxPerAcc} link</b> theo thuật toán xoay vòng cân bằng.
                    </p>
                  </div>
                );
              })()}

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setIsDistributeModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={distributeLoading || distributeSelectedAccs.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-xs font-bold text-white shadow-md shadow-violet-600/30 disabled:opacity-50"
                >
                  {distributeLoading ? 'Đang chia đều...' : 'Xác nhận Chia đều'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL THU HỒI LINK ĐÃ CHIA ==================== */}
      {isRevokeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="liquid-glass-modal rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-amber-500" /> Thu hồi Link Nhóm đã chia
              </h3>
              <button
                onClick={() => setIsRevokeModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePoolRevoke} className="space-y-4">
              {/* Account Scope Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Thu hồi từ tài khoản:</label>
                <select
                  value={revokeTargetAcc}
                  onChange={(e) => setRevokeTargetAcc(e.target.value)}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:bg-white focus:border-amber-500 transition-all outline-none"
                >
                  <option value="all">⚡ Tất cả các Nick (Toàn bộ hệ thống)</option>
                  {groupsData.accounts?.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      👤 Nick {acc.name} ({acc.groupUrls?.length || 0} link đang giữ)
                    </option>
                  ))}
                </select>
              </div>

              {/* Mode Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Chế độ thu hồi:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setRevokeMode('unposted_only')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      revokeMode === 'unposted_only'
                        ? 'bg-amber-50/90 border-amber-400 text-amber-950 shadow-xs'
                        : 'bg-white/60 border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs font-extrabold flex items-center gap-1.5">
                      ⭐ Chỉ link Chưa đăng
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">Khuyên dùng</span>
                    </span>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Giữ lại các nhóm đã đăng thành công của nick, chỉ thu hồi các link chưa đăng để phân bổ lại.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRevokeMode('all')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      revokeMode === 'all'
                        ? 'bg-rose-50/90 border-rose-400 text-rose-950 shadow-xs'
                        : 'bg-white/60 border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-xs font-extrabold block text-rose-700">⚠️ Thu hồi toàn bộ link</span>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Gỡ sạch toàn bộ link khỏi nick được chọn, đưa tất cả về trạng thái Chưa gán.
                    </span>
                  </button>
                </div>
              </div>

              {/* Preview Box */}
              {(() => {
                const pool = groupsData.centralPool || [];
                const targetPool = pool.filter((item) => {
                  if (!item.assignedAccountId) return false;
                  if (revokeTargetAcc !== 'all' && item.assignedAccountId !== revokeTargetAcc) return false;
                  if (revokeMode === 'unposted_only' && item.lastPostStatus === 'success') return false;
                  return true;
                });
                const count = targetPool.length;

                return (
                  <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs">
                    <span className="text-amber-950 font-bold block mb-1">📋 Dự kiến số lượng thu hồi:</span>
                    <p className="text-amber-900 font-medium leading-relaxed">
                      Hệ thống sẽ thu hồi <b>{count} link</b> {revokeMode === 'unposted_only' ? 'chưa đăng bài' : 'đang gán'} về lại trạng thái <b>Chưa gán</b> trong Kho chung.
                    </p>
                  </div>
                );
              })()}

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setIsRevokeModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={revokeLoading}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-xs font-bold text-white shadow-md shadow-amber-500/30 disabled:opacity-50"
                >
                  {revokeLoading ? 'Đang thu hồi...' : 'Xác nhận Thu hồi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL XEM CHI TIẾT LỖI NHÓM ==================== */}
      {viewingGroupError && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="liquid-glass-modal rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <h3 className="font-extrabold text-base text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600" /> Chi tiết lỗi đăng nhóm
              </h3>
              <button
                onClick={() => setViewingGroupError(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="font-bold text-slate-600 block mb-1">🔗 Đường dẫn nhóm:</span>
                <a
                  href={viewingGroupError.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline break-all font-mono"
                >
                  {viewingGroupError.url}
                </a>
              </div>

              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs">
                <span className="font-bold text-rose-900 block mb-1">⚠️ Nội dung thông báo lỗi:</span>
                <p className="text-rose-800 font-mono leading-relaxed">{viewingGroupError.error}</p>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                <span className="font-bold text-amber-900 block mb-1">💡 Hướng dẫn xử lý:</span>
                <ul className="list-disc pl-4 text-amber-800 space-y-1">
                  <li>Nếu lỗi <b>&quot;Chưa tham gia nhóm&quot;</b> hoặc <b>&quot;Chờ phê duyệt&quot;</b>: Hãy mở Chrome Profile của Nick, vào nhóm và ấn Tham gia / trả lời câu hỏi của Quản trị viên.</li>
                  <li>Nếu lỗi <b>&quot;Timeout&quot;</b>: Kiểm tra đường truyền mạng hoặc giao diện Facebook có bị chậm không.</li>
                  <li>Nếu lỗi <b>&quot;Không tìm thấy ô đăng bài&quot;</b>: Nhóm có thể đang tạm khóa tính năng đăng bài của thành viên.</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingGroupError(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}
