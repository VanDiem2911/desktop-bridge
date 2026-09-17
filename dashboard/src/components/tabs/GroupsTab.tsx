'use client';

import React, { useState } from 'react';
import {
  Share2,
  Database,
  Download,
  Shuffle,
  RotateCcw,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Trash2,
  XCircle,
  Users,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Clock,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { GroupAccount, CentralPoolItem, RotationConfig, PoolStats } from '@/types/dashboard';
import GroupModals from '@/components/modals/GroupModals';

interface GroupsTabProps {
  isDetectingName: boolean;
  handleAutoDetectFbName: (url: string, targetType?: any) => Promise<void>;
  handleExportCsv: () => void;
  handleExportTxt: () => void;
  handlePoolDistribute: (e: React.FormEvent) => Promise<void>;
  setIsAddAccountOpen: (open: boolean) => void;
  setActiveTab: (tab: 'overview' | 'analytics' | 'accounts' | 'groups' | 'schedule' | 'bot') => void;
  groupsData: {
    accounts?: GroupAccount[];
    pool?: CentralPoolItem[];
    centralPool?: CentralPoolItem[];
    rotation?: RotationConfig;
    totalGroups?: number;
  };
  fetchGroups: () => Promise<void>;
  poolStats: PoolStats;
  groupViewMode: 'pool' | 'by_account';
  setGroupViewMode: (mode: 'pool' | 'by_account') => void;
  selectedGroupAcc: string;
  setSelectedGroupAcc: (acc: string) => void;
  groupSearch: string;
  setGroupSearch: (val: string) => void;
  poolSearch: string;
  setPoolSearch: (val: string) => void;
  poolFilterAccount: string;
  setPoolFilterAccount: (val: string) => void;
  poolFilterPostStatus: string;
  setPoolFilterPostStatus: (val: string) => void;
  poolFilterJoinStatus: string;
  setPoolFilterJoinStatus: (val: string) => void;
  handleToggleAccount: (category: string, accountId: string, currentEnabled: boolean) => Promise<void>;
  handlePoolDeleteItem: (id: string, url: string) => Promise<void>;
  handleReleaseQuarantine: (accId: string) => Promise<void>;
  handlePoolImport: (e?: any) => Promise<void>;
  handlePoolRevoke: (e: React.FormEvent) => Promise<void>;
  handlePoolUpdateStatus: (id: string, url?: string, joinedStatus?: 'joined' | 'pending' | 'not_joined' | 'unknown', assignedAccountId?: string | null) => Promise<void>;
  handleRemoveGroup: (groupUrl: string) => Promise<void>;
  handleCopyExportLinks: () => void;
  getExportablePoolItems: () => CentralPoolItem[];
  handleOpenChrome: (profileDir: string, port: number, url?: string) => Promise<void>;
  copyToClipboard: (text: string, id: string) => void;
  copiedId: string | null;

  isAddGroupOpen: boolean;
  setIsAddGroupOpen: (open: boolean) => void;
  newGroupUrl: string;
  setNewGroupUrl: (val: string) => void;
  handleAddGroup: (e: React.FormEvent) => Promise<void>;

  isBulkGroupOpen: boolean;
  setIsBulkGroupOpen: (open: boolean) => void;
  bulkGroupText: string;
  setBulkGroupText: (val: string) => void;
  bulkMode: 'append' | 'replace';
  setBulkMode: (val: 'append' | 'replace') => void;
  handleBulkImport: (e: React.FormEvent) => Promise<void>;

  isPoolImportOpen: boolean;
  setIsPoolImportOpen: (open: boolean) => void;
  poolImportText: string;
  setPoolImportText: (text: string) => void;
  poolImportAssignAcc: string;
  setPoolImportAssignAcc: (acc: string) => void;
  poolImportAutoDistribute: boolean;
  setPoolImportAutoDistribute: (val: boolean) => void;

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

  viewingGroupError: { url: string; error: string } | null;
  setViewingGroupError: (val: { url: string; error: string } | null) => void;

  isExportModalOpen: boolean;
  setIsExportModalOpen: (open: boolean) => void;
  exportFilterAcc: string;
  setExportFilterAcc: (acc: string) => void;
  exportFilterPostStatus: string;
  setExportFilterPostStatus: (status: string) => void;
  exportFilterJoinStatus: string;
  setExportFilterJoinStatus: (status: string) => void;
  exportCopied: boolean;
}

export default function GroupsTab({
  isDetectingName,
  handleAutoDetectFbName,
  handleExportCsv,
  handleExportTxt,
  handlePoolDistribute,
  setIsAddAccountOpen,
  setActiveTab,
  groupsData,
  fetchGroups,
  poolStats,
  groupViewMode,
  setGroupViewMode,
  selectedGroupAcc,
  setSelectedGroupAcc,
  groupSearch,
  setGroupSearch,
  poolSearch,
  setPoolSearch,
  poolFilterAccount,
  setPoolFilterAccount,
  poolFilterPostStatus,
  setPoolFilterPostStatus,
  poolFilterJoinStatus,
  setPoolFilterJoinStatus,
  handleToggleAccount,
  handlePoolDeleteItem,
  handleReleaseQuarantine,
  handlePoolImport,
  handlePoolRevoke,
  handlePoolUpdateStatus,
  handleRemoveGroup,
  handleCopyExportLinks,
  getExportablePoolItems,
  handleOpenChrome,
  copyToClipboard,
  copiedId,
  isAddGroupOpen,
  setIsAddGroupOpen,
  newGroupUrl,
  setNewGroupUrl,
  handleAddGroup,
  isBulkGroupOpen,
  setIsBulkGroupOpen,
  bulkGroupText,
  setBulkGroupText,
  bulkMode,
  setBulkMode,
  handleBulkImport,
  isPoolImportOpen,
  setIsPoolImportOpen,
  poolImportText,
  setPoolImportText,
  poolImportAssignAcc,
  setPoolImportAssignAcc,
  poolImportAutoDistribute,
  setPoolImportAutoDistribute,
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
  viewingGroupError,
  setViewingGroupError,
  isExportModalOpen,
  setIsExportModalOpen,
  exportFilterAcc,
  setExportFilterAcc,
  exportFilterPostStatus,
  setExportFilterPostStatus,
  exportFilterJoinStatus,
  setExportFilterJoinStatus,
  exportCopied,
}: GroupsTabProps) {
  
  const [detectedGroupName, setDetectedGroupName] = useState('');
  const openDistributeModal = () => {
    const enabledIds = (groupsData.accounts || []).filter(a => a.enabled !== false).map(a => a.id);
    setDistributeSelectedAccs(enabledIds.length > 0 ? enabledIds : (groupsData.accounts || []).map(a => a.id));
    setIsDistributeModalOpen(true);
  };

  const activeGroupAccount = groupsData.accounts?.find(a => a.id === selectedGroupAcc);
  const filteredGroups = (activeGroupAccount?.groupUrls || []).filter(u => u.toLowerCase().includes(groupSearch.toLowerCase()));

  const poolItemByUrl = React.useMemo(() => {
    const map = new Map<string, CentralPoolItem>();
    const pool = (groupsData as any).centralPool || groupsData.pool || [];
    for (const item of pool) {
      const clean = item.url.trim().replace(/\/+$/, '');
      map.set(clean, item);
    }
    return map;
  }, [groupsData]);

  const filteredPool = ((groupsData as any).centralPool || groupsData.pool || []).filter((item: CentralPoolItem) => {
    if (poolSearch.trim()) {
      const q = poolSearch.trim().toLowerCase();
      const matchUrl = item.url.toLowerCase().includes(q);
      const matchName = item.assignedAccountName?.toLowerCase().includes(q) || false;
      const matchErr = item.lastPostError?.toLowerCase().includes(q) || false;
      if (!matchUrl && !matchName && !matchErr) return false;
    }

    if (poolFilterAccount === 'unassigned') {
      if (item.assignedAccountId) return false;
    } else if (poolFilterAccount !== 'all') {
      if (item.assignedAccountId !== poolFilterAccount) return false;
    }

    if (poolFilterPostStatus !== 'all') {
      if (poolFilterPostStatus === 'not_posted') {
        if (item.lastPostStatus && item.lastPostStatus !== 'not_posted') return false;
      } else {
        if (item.lastPostStatus !== poolFilterPostStatus) return false;
      }
    }

    if (poolFilterJoinStatus !== 'all') {
      if (item.joinedStatus !== poolFilterJoinStatus) return false;
    }

    return true;
  });

  return (
    <>
      <div className="liquid-glass rounded-3xl p-7 space-y-6">
            
            {/* Header with Title & Primary Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                    <Share2 className="w-5 h-5" />
                  </span>
                  Quản lý Link Nhóm Facebook
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Kho tập trung link Facebook, tự động chia đều cho các Nick và theo dõi trạng thái tham gia &amp; đăng bài
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => setIsPoolImportOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md shadow-blue-600/25 transition-all"
                >
                  <Database className="w-4 h-4" /> Import vào Kho chung
                </button>
                <button
                  onClick={() => {
                    setExportFilterAcc('all');
                    setExportFilterPostStatus('all');
                    setExportFilterJoinStatus('all');
                    setIsExportModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md shadow-emerald-600/25 transition-all"
                  title="Xuất toàn bộ link nhóm Facebook ra file TXT, CSV hoặc sao chép"
                >
                  <Download className="w-4 h-4" /> Xuất toàn bộ link
                </button>
                <button
                  onClick={openDistributeModal}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl shadow-md shadow-violet-600/25 transition-all"
                >
                  <Shuffle className="w-4 h-4" /> Chia đều cho các Nick
                </button>
                <button
                  onClick={() => setIsRevokeModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl shadow-md shadow-amber-500/25 transition-all"
                  title="Thu hồi các link đã gán về lại Kho chung"
                >
                  <RotateCcw className="w-4 h-4" /> Thu hồi link đã chia
                </button>
                <button
                  onClick={() => setIsAddAccountOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-700 shadow-xs transition-all"
                >
                  <UserPlus className="w-4 h-4 text-blue-600" /> Thêm Nick
                </button>
                <button
                  onClick={() => { setDetectedGroupName(''); setIsAddGroupOpen(true); }}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-700 shadow-xs transition-all"
                >
                  <Plus className="w-4 h-4 text-emerald-600" /> Thêm link lẻ
                </button>
              </div>
            </div>

            {/* 3 Groups Status Notification Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800 flex flex-wrap items-center gap-2">
                    <span>Chiến thuật 3 Nhóm Luân phiên & Cách ly 7 ngày:</span>
                    <span className="inline-flex items-center gap-1 font-extrabold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200 text-[11px]">
                      {groupsData.rotation?.activeGroupToday === 'group_1' ? '🟢 Ca hôm nay: Nhóm 1 (Đội chính)' : '🟡 Ca hôm nay: Nhóm 2 (Đội dự phòng)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Phân bổ nick vào Nhóm 1, Nhóm 2 và Khu cách ly 7 ngày hiện được hiển thị & quản lý trực quan tại tab <b>Quản lý Tài khoản</b>.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('accounts')}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs shrink-0"
              >
                Sang Quản lý Tài khoản <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* View Switcher Pills */}
            <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl w-fit border border-slate-200/80">
              <button
                onClick={() => setGroupViewMode('pool')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  groupViewMode === 'pool'
                    ? 'bg-white text-blue-700 shadow-sm shadow-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                🏢 Kho chung link Facebook
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-800 font-extrabold">
                  {poolStats.total || groupsData.centralPool?.length || 0}
                </span>
              </button>
              <button
                onClick={() => setGroupViewMode('by_account')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  groupViewMode === 'by_account'
                    ? 'bg-white text-blue-700 shadow-sm shadow-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                👤 Xem theo từng Nick
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700 font-extrabold">
                  {groupsData.accounts?.length || 0} nick
                </span>
              </button>
            </div>

            {/* Metric Cards - Quick Overview of Pool */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
              <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/90 shadow-2xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">📦 Tổng link trong kho</span>
                <span className="text-xl font-extrabold text-slate-900">{poolStats.total || groupsData.centralPool?.length || 0}</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Tất cả link nhóm</span>
              </div>
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 shadow-2xs">
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block mb-1">👥 Đã gán Nick</span>
                <span className="text-xl font-extrabold text-blue-900">{poolStats.assigned || 0}</span>
                <span className="text-[11px] text-blue-600/80 block mt-0.5 font-medium">Chưa gán: <b>{poolStats.unassigned || 0}</b> link</span>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 shadow-2xs">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">🟢 Đã đăng thành công</span>
                <span className="text-xl font-extrabold text-emerald-900">{poolStats.postedSuccess || 0}</span>
                <span className="text-[11px] text-emerald-600/80 block mt-0.5 font-medium">Chưa đăng: <b>{poolStats.notPosted || 0}</b> link</span>
              </div>
              <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/80 shadow-2xs">
                <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block mb-1">🔴 Gặp lỗi đăng bài</span>
                <span className="text-xl font-extrabold text-rose-900">{poolStats.postedFailed || 0}</span>
                <span className="text-[11px] text-rose-600/80 block mt-0.5 font-medium">Cần kiểm tra lại</span>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 shadow-2xs">
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block mb-1">🤝 Trạng thái nhóm</span>
                <span className="text-xl font-extrabold text-amber-900">{poolStats.joined || 0} <span className="text-xs font-semibold text-slate-500">đã vào</span></span>
                <span className="text-[11px] text-amber-700 block mt-0.5 font-medium">Chờ duyệt: <b>{poolStats.pending || 0}</b></span>
              </div>
            </div>

            {/* ================= MODE 1: KHO CHUNG (POOL) ================= */}
            {groupViewMode === 'pool' && (
              <div className="space-y-4">
                {/* Search & Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={poolSearch}
                      onChange={(e) => setPoolSearch(e.target.value)}
                      placeholder="Tìm link, nick phụ trách, lỗi..."
                      className="liquid-input w-full rounded-xl pl-10 pr-4 py-2.5 text-xs md:text-sm text-slate-900 placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <select
                      value={poolFilterAccount}
                      onChange={(e) => setPoolFilterAccount(e.target.value)}
                      className="liquid-input w-full rounded-xl px-3.5 py-2.5 text-xs md:text-sm font-medium text-slate-800"
                    >
                      <option value="all">👤 Tất cả Nick (Tất cả)</option>
                      <option value="unassigned">⚪ Chỉ link Chưa gán ({poolStats.unassigned || 0})</option>
                      {groupsData.accounts?.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          👤 Nick: {acc.name} ({acc.groupUrls?.length || 0} link)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <select
                      value={poolFilterPostStatus}
                      onChange={(e) => setPoolFilterPostStatus(e.target.value)}
                      className="liquid-input w-full rounded-xl px-3.5 py-2.5 text-xs md:text-sm font-medium text-slate-800"
                    >
                      <option value="all">📝 Tất cả trạng thái đăng</option>
                      <option value="success">🟢 Đã đăng thành công</option>
                      <option value="failed">🔴 Gặp lỗi đăng bài</option>
                      <option value="not_posted">⚪ Chưa từng đăng</option>
                    </select>
                  </div>

                  <div>
                    <select
                      value={poolFilterJoinStatus}
                      onChange={(e) => setPoolFilterJoinStatus(e.target.value)}
                      className="liquid-input w-full rounded-xl px-3.5 py-2.5 text-xs md:text-sm font-medium text-slate-800"
                    >
                      <option value="all">🤝 Tất cả trạng thái tham gia</option>
                      <option value="joined">🟢 Đã tham gia nhóm</option>
                      <option value="pending">🟡 Đang chờ phê duyệt</option>
                      <option value="not_joined">🔴 Chưa tham gia nhóm</option>
                      <option value="unknown">⚪ Chưa kiểm tra</option>
                    </select>
                  </div>
                </div>

                {/* Pool Table */}
                <div className="border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs bg-white/70">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs md:text-sm">
                      <thead className="bg-slate-100/80 border-b border-slate-200/90 text-slate-700 font-bold">
                        <tr>
                          <th className="py-3 px-3.5 w-12 text-center">STT</th>
                          <th className="py-3 px-3.5">Đường dẫn nhóm Facebook</th>
                          <th className="py-3 px-3.5 w-44">Nick phụ trách</th>
                          <th className="py-3 px-3.5 w-40 text-center">Trạng thái nhóm</th>
                          <th className="py-3 px-3.5 w-44 text-center">Trạng thái đăng bài</th>
                          <th className="py-3 px-3.5 w-24 text-center">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredPool.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-slate-400 text-xs font-medium">
                              {groupsData.centralPool?.length === 0
                                ? 'Kho chung hiện chưa có link nào. Hãy bấm "Import vào Kho chung" ở góc trên để thêm.'
                                : 'Không tìm thấy link nhóm nào khớp với bộ lọc.'}
                            </td>
                          </tr>
                        ) : (
                          filteredPool.map((item: any, idx: number) => {
                            const acc = groupsData.accounts?.find((a) => a.id === item.assignedAccountId);
                            return (
                              <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                                <td className="py-3 px-3.5 text-center font-bold text-slate-400 text-xs">
                                  {idx + 1}
                                </td>

                                {/* Group URL */}
                                <td className="py-3 px-3.5 font-medium">
                                  <div className="flex items-center gap-1.5 break-all">
                                    <a
                                      href={item.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5 font-mono text-xs"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 text-blue-500" />
                                      {item.url}
                                    </a>
                                  </div>
                                </td>

                                {/* Assigned Account */}
                                <td className="py-3 px-3.5">
                                  <select
                                    value={item.assignedAccountId || ''}
                                    onChange={(e) => handlePoolUpdateStatus(item.id, item.url, undefined, e.target.value || null)}
                                    className={`w-full text-xs font-semibold rounded-lg px-2.5 py-1.5 border transition-all ${
                                      item.assignedAccountId
                                        ? 'bg-blue-50/70 border-blue-200 text-blue-900'
                                        : 'bg-slate-100 border-slate-200 text-slate-500 italic'
                                    }`}
                                  >
                                    <option value="">⚪ Chưa gán (Kho trống)</option>
                                    {groupsData.accounts?.map((a) => (
                                      <option key={a.id} value={a.id}>
                                        👤 {a.name}
                                      </option>
                                    ))}
                                  </select>
                                </td>

                                {/* Joined Status */}
                                <td className="py-3 px-3.5 text-center">
                                  <select
                                    value={item.joinedStatus || 'unknown'}
                                    onChange={(e) =>
                                      handlePoolUpdateStatus(
                                        item.id,
                                        item.url,
                                        e.target.value as 'joined' | 'pending' | 'not_joined' | 'unknown'
                                      )
                                    }
                                    className={`text-xs font-bold rounded-lg px-2.5 py-1.5 border cursor-pointer ${
                                      item.joinedStatus === 'joined'
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                        : item.joinedStatus === 'pending'
                                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                                        : item.joinedStatus === 'not_joined'
                                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                                        : 'bg-slate-50 text-slate-600 border-slate-200'
                                    }`}
                                  >
                                    <option value="joined">🟢 Đã tham gia</option>
                                    <option value="pending">🟡 Đang chờ duyệt</option>
                                    <option value="not_joined">🔴 Chưa tham gia</option>
                                    <option value="unknown">⚪ Chưa kiểm tra</option>
                                  </select>
                                </td>

                                {/* Post Status */}
                                <td className="py-3 px-3.5 text-center">
                                  {item.lastPostStatus === 'success' ? (
                                    <div className="inline-flex flex-col items-center">
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Đã đăng bài
                                      </span>
                                      {item.lastPostedAt && (
                                        <span className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                          {new Date(item.lastPostedAt).toLocaleDateString('vi-VN', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })}
                                        </span>
                                      )}
                                    </div>
                                  ) : item.lastPostStatus === 'failed' ? (
                                    <div className="inline-flex flex-col items-center">
                                      <button
                                        onClick={() =>
                                          setViewingGroupError({
                                            url: item.url,
                                            error: item.lastPostError || 'Lỗi không xác định khi đăng bài',
                                          })
                                        }
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 transition-all cursor-pointer"
                                        title="Bấm để xem chi tiết lỗi"
                                      >
                                        <XCircle className="w-3.5 h-3.5 text-rose-600" /> Lỗi đăng bài
                                      </button>
                                      {item.lastPostedAt && (
                                        <span className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                          {new Date(item.lastPostedAt).toLocaleDateString('vi-VN', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                      <Clock className="w-3 h-3 text-slate-400" /> Chưa đăng
                                    </span>
                                  )}
                                </td>

                                {/* Action buttons */}
                                <td className="py-3 px-3.5 text-center">
                                  <div className="flex items-center justify-center gap-1.5">
                                    {acc?.profileDir && (
                                      <button
                                        onClick={() => {
                                          const accNum = parseInt(String(acc.id).replace(/\D/g, ''), 10) || 1;
                                          const port = 9222 + accNum;
                                          handleOpenChrome(acc.profileDir || `n8n-fb-group-profile-${accNum}`, port, item.url);
                                        }}
                                        className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                        title={`Mở Chrome nick "${acc.name}" vào thẳng nhóm này`}
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handlePoolDeleteItem(item.id, item.url)}
                                      className="p-1 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition-all"
                                      title="Xóa link này khỏi kho chung"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
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
                </div>
              </div>
            )}

            {/* ================= MODE 2: XEM THEO TỪNG NICK ================= */}
            {groupViewMode === 'by_account' && (
              <div className="space-y-4">
                {/* Selector & Search Filter */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700">Chọn tài khoản xem nhóm:</label>
                      <div className="flex items-center gap-2">
                        {activeGroupAccount && (
                          <button
                            onClick={() => {
                              setExportFilterAcc(activeGroupAccount.id);
                              setExportFilterPostStatus('all');
                              setExportFilterJoinStatus('all');
                              setIsExportModalOpen(true);
                            }}
                            className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1 transition-all"
                            title="Xuất riêng danh sách link của nick này"
                          >
                            <Download className="w-3 h-3 text-emerald-600" /> Xuất link nick này
                          </button>
                        )}
                        {activeGroupAccount && (
                          <button
                            onClick={() => handleToggleAccount('groups', activeGroupAccount.id, activeGroupAccount.enabled !== false)}
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                              activeGroupAccount.enabled !== false
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            {activeGroupAccount.enabled !== false ? '🟢 Tài khoản đang Bật' : '⚪ Tài khoản đang Tắt'}
                          </button>
                        )}
                      </div>
                    </div>
                    <select
                      value={selectedGroupAcc}
                      onChange={(e) => setSelectedGroupAcc(e.target.value)}
                      className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900"
                    >
                      {groupsData.accounts?.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.groupUrls?.length || 0} link nhóm) {acc.enabled === false ? '— [Đã Tắt]' : '— [Đang Bật]'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Tìm kiếm trong nhóm của nick này:</label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={groupSearch}
                        onChange={(e) => setGroupSearch(e.target.value)}
                        placeholder="Nhập link hoặc từ khóa nhóm..."
                        className="liquid-input w-full rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Groups Table of Selected Account with Status Enriched */}
                <div className="border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs bg-white/70">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs md:text-sm">
                      <thead className="bg-slate-100/80 border-b border-slate-200/90 text-slate-700 font-bold">
                        <tr>
                          <th className="py-3 px-3.5 w-12 text-center">STT</th>
                          <th className="py-3 px-3.5">Đường dẫn nhóm Facebook</th>
                          <th className="py-3 px-3.5 w-36 text-center">Trạng thái nhóm</th>
                          <th className="py-3 px-3.5 w-40 text-center">Trạng thái đăng bài</th>
                          <th className="py-3 px-3.5 w-24 text-center">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredGroups.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-10 text-center text-slate-400 text-xs font-medium">
                              Không có nhóm nào phù hợp. Bấm &quot;Thêm link lẻ&quot; hoặc &quot;Chia đều từ Kho chung&quot; để gán nhóm.
                            </td>
                          </tr>
                        ) : (
                          filteredGroups.map((url, idx) => {
                            const clean = url.trim().replace(/\/+$/, '');
                            const poolItem = poolItemByUrl.get(clean);

                            return (
                              <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                                <td className="py-3 px-3.5 text-center font-bold text-slate-400 text-xs">{idx + 1}</td>
                                <td className="py-3 px-3.5 font-medium">
                                  <a
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5 break-all font-mono text-xs"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 text-blue-500" />
                                    {url}
                                  </a>
                                </td>

                                {/* Group Joined Status */}
                                <td className="py-3 px-3.5 text-center">
                                  <select
                                    value={poolItem?.joinedStatus || 'unknown'}
                                    onChange={(e) =>
                                      handlePoolUpdateStatus(
                                        poolItem?.id || '',
                                        url,
                                        e.target.value as 'joined' | 'pending' | 'not_joined' | 'unknown'
                                      )
                                    }
                                    className={`text-xs font-bold rounded-lg px-2.5 py-1.5 border cursor-pointer ${
                                      poolItem?.joinedStatus === 'joined'
                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                        : poolItem?.joinedStatus === 'pending'
                                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                                        : poolItem?.joinedStatus === 'not_joined'
                                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                                        : 'bg-slate-50 text-slate-600 border-slate-200'
                                    }`}
                                  >
                                    <option value="joined">🟢 Đã tham gia</option>
                                    <option value="pending">🟡 Đang chờ duyệt</option>
                                    <option value="not_joined">🔴 Chưa tham gia</option>
                                    <option value="unknown">⚪ Chưa kiểm tra</option>
                                  </select>
                                </td>

                                {/* Post Status */}
                                <td className="py-3 px-3.5 text-center">
                                  {poolItem?.lastPostStatus === 'success' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Đã đăng
                                    </span>
                                  ) : poolItem?.lastPostStatus === 'failed' ? (
                                    <button
                                      onClick={() =>
                                        setViewingGroupError({
                                          url,
                                          error: poolItem?.lastPostError || 'Gặp lỗi khi đăng bài vào nhóm này',
                                        })
                                      }
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100 transition-all cursor-pointer"
                                      title="Bấm xem chi tiết lỗi"
                                    >
                                      <XCircle className="w-3.5 h-3.5 text-rose-600" /> Lỗi đăng
                                    </button>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                      <Clock className="w-3 h-3 text-slate-400" /> Chưa đăng
                                    </span>
                                  )}
                                </td>

                                {/* Action */}
                                <td className="py-3 px-3.5 text-center">
                                  <button
                                    onClick={() => handleRemoveGroup(url)}
                                    className="p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded-lg transition-all"
                                    title="Xóa link nhóm này khỏi tài khoản"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

          </div>
      <GroupModals
        isDetectingName={isDetectingName}
        handleAutoDetectFbName={handleAutoDetectFbName}
        poolStats={poolStats}
        handlePoolRevoke={handlePoolRevoke}
        handleExportCsv={handleExportCsv}
        handleExportTxt={handleExportTxt}
        handlePoolDistribute={handlePoolDistribute}
        isAddGroupOpen={isAddGroupOpen}
        setIsAddGroupOpen={setIsAddGroupOpen}
        newGroupUrl={newGroupUrl}
        setNewGroupUrl={setNewGroupUrl}
        selectedGroupAcc={selectedGroupAcc}
        setSelectedGroupAcc={setSelectedGroupAcc}
        handleAddGroup={handleAddGroup}
        isBulkGroupOpen={isBulkGroupOpen}
        setIsBulkGroupOpen={setIsBulkGroupOpen}
        bulkGroupText={bulkGroupText}
        setBulkGroupText={setBulkGroupText}
        bulkMode={bulkMode}
        setBulkMode={setBulkMode}
        handleBulkImport={handleBulkImport}
        isExportModalOpen={isExportModalOpen}
        setIsExportModalOpen={setIsExportModalOpen}
        exportFilterAcc={exportFilterAcc}
        setExportFilterAcc={setExportFilterAcc}
        exportFilterPostStatus={exportFilterPostStatus}
        setExportFilterPostStatus={setExportFilterPostStatus}
        exportFilterJoinStatus={exportFilterJoinStatus}
        setExportFilterJoinStatus={setExportFilterJoinStatus}
        exportCopied={exportCopied}
        getExportablePoolItems={getExportablePoolItems}
        handleCopyExportLinks={handleCopyExportLinks}
        groupsData={groupsData}
        isPoolImportOpen={isPoolImportOpen}
        setIsPoolImportOpen={setIsPoolImportOpen}
        poolImportText={poolImportText}
        setPoolImportText={setPoolImportText}
        poolImportAssignAcc={poolImportAssignAcc}
        setPoolImportAssignAcc={setPoolImportAssignAcc}
        poolImportAutoDistribute={poolImportAutoDistribute}
        setPoolImportAutoDistribute={setPoolImportAutoDistribute}
        handlePoolImport={handlePoolImport}
        isDistributeModalOpen={isDistributeModalOpen}
        setIsDistributeModalOpen={setIsDistributeModalOpen}
        distributeMode={distributeMode}
        setDistributeMode={setDistributeMode}
        distributeSelectedAccs={distributeSelectedAccs}
        setDistributeSelectedAccs={setDistributeSelectedAccs}
        distributeLoading={distributeLoading}
        isRevokeModalOpen={isRevokeModalOpen}
        setIsRevokeModalOpen={setIsRevokeModalOpen}
        revokeMode={revokeMode}
        setRevokeMode={setRevokeMode}
        revokeTargetAcc={revokeTargetAcc}
        setRevokeTargetAcc={setRevokeTargetAcc}
        revokeLoading={revokeLoading}
        viewingGroupError={viewingGroupError}
        setViewingGroupError={setViewingGroupError}
        copyToClipboard={copyToClipboard}
        copiedId={copiedId}
      />
    </>
  );
}
