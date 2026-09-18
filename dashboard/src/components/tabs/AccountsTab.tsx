'use client';

import React from 'react';
import {
  Users,
  RefreshCw,
  Plus,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Edit3,
  ArrowRight,
  ArrowLeftRight,
  Trash2,
  Lock,
  Unlock,
  Bot,
  UserPlus,
  KeyRound,
  Sparkles,
} from 'lucide-react';
import { AccountCategory, AccountItem, GroupAccount, CentralPoolItem, RotationConfig } from '@/types/dashboard';
import AccountModals from '@/components/modals/AccountModals';

interface AccountsTabProps {
  handleSyncAllProfiles?: () => Promise<void>;
  accounts: AccountCategory[];
  groupsData: {
    accounts?: GroupAccount[];
    pool?: CentralPoolItem[];
    rotation?: RotationConfig;
  };
  handleChangeRoleGroup: (accId: string, roleGroup: 'group_1' | 'group_2' | 'quarantine') => Promise<void>;
  handleReleaseQuarantine: (accId: string) => Promise<void>;
  formatCountdown: (untilStr?: string | null) => string;
  handleSwitchActiveGroup: (targetGroup?: 'group_1' | 'group_2') => Promise<void>;
  handleToggleRotation: (enabled: boolean) => Promise<void>;

  fetchAccounts: () => Promise<void>;
  handleOpenChrome: (profileDir: string, port: number, url?: string) => Promise<void>;
  handleDeleteAccount: (id: string, name: string) => Promise<void>;
  handleDeleteChatGpt: (id: string, name: string) => Promise<void>;
  handleDeleteFanpage: (id: string, name: string) => Promise<void>;
  handleDeletePersonal: (id: string, name: string) => Promise<void>;
  handleToggleAccount: (category: string, accountId: string, currentEnabled: boolean) => Promise<void>;
  setDetectedGroupName: (val: string) => void;


  isAddChatGptOpen: boolean;
  setIsAddChatGptOpen: (open: boolean) => void;
  newChatGptForm: { id?: string; name: string; port?: number | string; profileDir: string; desc?: string; enabled?: boolean };
  setNewChatGptForm: React.Dispatch<React.SetStateAction<any>>;
  handleCreateChatGpt: (e: React.FormEvent) => Promise<void>;
  isEditChatGptOpen: boolean;
  setIsEditChatGptOpen: (open: boolean) => void;
  editingChatGpt: { id: string; name: string; profileDir: string; port: number; desc?: string; enabled?: boolean } | null;
  setEditingChatGpt: React.Dispatch<React.SetStateAction<any>>;
  handleUpdateChatGpt: (e: React.FormEvent) => Promise<void>;

  isAddAccountOpen: boolean;
  setIsAddAccountOpen: (open: boolean) => void;
  newAccountForm: { id?: string; name: string; profileDir: string; port?: number | string; profileUrl: string; desc?: string; enabled?: boolean; groupUrlsText?: string };
  setNewAccountForm: React.Dispatch<React.SetStateAction<any>>;
  handleCreateAccount: (e: React.FormEvent) => Promise<void>;
  handleAutoDetectFbName: (url: string, targetType?: any) => Promise<void>;
  isDetectingName: boolean;
  detectedGroupName: string;
  isEditAccountOpen: boolean;
  setIsEditAccountOpen: (open: boolean) => void;
  editingAccount: { id: string; name: string; profileUrl?: string; profileDir: string; port?: number | string; desc?: string; enabled?: boolean } | null;
  setEditingAccount: React.Dispatch<React.SetStateAction<any>>;
  handleUpdateAccount: (e: React.FormEvent) => Promise<void>;

  isAddFanpageOpen: boolean;
  setIsAddFanpageOpen: (open: boolean) => void;
    newFanpageForm: { id?: string; name: string; pageUrl: string; profileDir: string; port: string | number; description?: string; desc?: string; enabled?: boolean };
  setNewFanpageForm: React.Dispatch<React.SetStateAction<any>>;
  handleCreateFanpage: (e: React.FormEvent) => Promise<void>;
  handleAutoDetectPageName: (url: string, isEdit?: any) => Promise<void>;
  isEditFanpageOpen: boolean;
  setIsEditFanpageOpen: (open: boolean) => void;
  editingFanpage: { id: string; name: string; pageUrl: string; profileDir: string; port: string | number; description?: string; desc?: string; enabled?: boolean } | null;
  setEditingFanpage: React.Dispatch<React.SetStateAction<any>>;
  handleUpdateFanpage: (e: React.FormEvent) => Promise<void>;

  isAddPersonalOpen: boolean;
  setIsAddPersonalOpen: (open: boolean) => void;
  newPersonalForm: { id?: string; name: string; profileUrl: string; profileDir: string; port: string | number; description?: string; desc?: string; enabled?: boolean };
  setNewPersonalForm: React.Dispatch<React.SetStateAction<any>>;
  handleCreatePersonal: (e: React.FormEvent) => Promise<void>;
  handleAutoDetectPersonalName: (url: string, isEdit?: any) => Promise<void>;
  isEditPersonalOpen: boolean;
  setIsEditPersonalOpen: (open: boolean) => void;
  editingPersonal: { id: string; name: string; profileUrl: string; profileDir: string; port: string | number; description?: string; desc?: string; enabled?: boolean } | null;
  setEditingPersonal: React.Dispatch<React.SetStateAction<any>>;
  handleUpdatePersonal: (e: React.FormEvent) => Promise<void>;

  // Unified FB Modal
  isAddUnifiedFbOpen?: boolean;
  setIsAddUnifiedFbOpen?: (open: boolean) => void;
  unifiedFbForm?: {
    name: string;
    profileUrl: string;
    enableFanpage: boolean;
    fanpageUrlsText: string;
    enableGroups: boolean;
    groupUrlsText: string;
    profileDir: string;
  };
  setUnifiedFbForm?: React.Dispatch<React.SetStateAction<any>>;
  handleCreateUnifiedFb?: (e: React.FormEvent) => Promise<void>;
}

export default function AccountsTab({
  accounts,
  groupsData,
  handleChangeRoleGroup,
  handleReleaseQuarantine,
  formatCountdown,
  handleSwitchActiveGroup,
  handleToggleRotation,
  fetchAccounts,
  handleOpenChrome,
  handleDeleteAccount,
  handleDeleteChatGpt,
  handleDeleteFanpage,
  handleDeletePersonal,
  handleToggleAccount,
  handleSyncAllProfiles,
  setDetectedGroupName,
  isDetectingName,
  detectedGroupName,
  newChatGptForm,
  setNewChatGptForm,
  handleCreateChatGpt,
  isAddChatGptOpen,
  setIsAddChatGptOpen,
  editingChatGpt,
  setEditingChatGpt,
  handleUpdateChatGpt,
  isEditChatGptOpen,
  setIsEditChatGptOpen,
  newAccountForm,
  setNewAccountForm,
  handleCreateAccount,
  handleAutoDetectFbName,
  isAddAccountOpen,
  setIsAddAccountOpen,
  editingAccount,
  setEditingAccount,
  handleUpdateAccount,
  isEditAccountOpen,
  setIsEditAccountOpen,
  newFanpageForm,
  setNewFanpageForm,
  handleCreateFanpage,
  handleAutoDetectPageName,
  isAddFanpageOpen,
  setIsAddFanpageOpen,
  editingFanpage,
  setEditingFanpage,
  handleUpdateFanpage,
  isEditFanpageOpen,
  setIsEditFanpageOpen,
  newPersonalForm,
  setNewPersonalForm,
  handleCreatePersonal,
  handleAutoDetectPersonalName,
  isAddPersonalOpen,
  setIsAddPersonalOpen,
  editingPersonal,
  setEditingPersonal,
  handleUpdatePersonal,
  isEditPersonalOpen,
  setIsEditPersonalOpen,
  isAddUnifiedFbOpen,
  setIsAddUnifiedFbOpen,
  unifiedFbForm,
  setUnifiedFbForm,
  handleCreateUnifiedFb,
}: AccountsTabProps) {
  const openEditChatGptModal = (acc: AccountItem) => {
    setEditingChatGpt({
      id: acc.id,
      name: acc.name,
      profileDir: acc.profileDir,
      port: acc.port,
      desc: acc.desc || '',
    });
    setIsEditChatGptOpen(true);
  };

  const openEditFanpageModal = (acc: AccountItem) => {
    setEditingFanpage({
      id: acc.id,
      name: acc.name,
      pageUrl: acc.pageUrl || acc.url || '',
      profileDir: acc.profileDir,
      port: acc.port,
      desc: acc.desc || '',
    });
    setDetectedGroupName('');
    setIsEditFanpageOpen(true);
  };

  const openEditPersonalModal = (acc: AccountItem) => {
    setEditingPersonal({
      id: acc.id,
      name: acc.name,
      profileUrl: acc.profileUrl || acc.url || '',
      profileDir: acc.profileDir,
      port: acc.port,
      desc: acc.desc || '',
    });
    setDetectedGroupName('');
    setIsEditPersonalOpen(true);
  };

  const openEditAccountModal = (acc: AccountItem) => {
    setEditingAccount({
      id: acc.id,
      name: acc.name,
      profileUrl: acc.profileUrl || acc.url || '',
      profileDir: acc.profileDir,
      port: acc.port,
      desc: acc.desc || '',
    });
    setDetectedGroupName('');
    setIsEditAccountOpen(true);
  };

  return (
    <>
      <div className="space-y-8">
        {/* Banner Quick Action: Thêm Tài Khoản FB Đăng Nhập 1 Lần Dùng Cho Cả Fanpage & Groups */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5 border border-white/20">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
              <h4 className="font-black text-base tracking-tight text-white">Tài Khoản Facebook Dùng Chung (Chỉ cần đăng nhập 1 lần)</h4>
              <span className="px-2.5 py-0.5 text-[10px] font-black bg-amber-400 text-amber-950 rounded-full shadow-xs">Tiết kiệm công sức</span>
            </div>
            <p className="text-xs text-blue-100 max-w-2xl leading-relaxed">
              Bạn có thể thêm 1 tài khoản Facebook và gán ngay cho cả <strong className="text-white underline decoration-amber-300">5+ Fanpage quản lý</strong> lẫn <strong className="text-white underline decoration-amber-300">Nhóm Facebook Groups</strong>. Tất cả tự động kết nối qua Profile Chrome <code className="bg-black/30 px-1.5 py-0.5 rounded font-mono text-amber-200">n8n-fb-group-profile-1 (Port 9223)</code> — Đăng nhập 1 lần là xuất bản bài và đăng group trơn tru!
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddUnifiedFbOpen && setIsAddUnifiedFbOpen(true)}
            className="flex-shrink-0 flex items-center gap-2 px-5 py-3 text-xs font-black bg-white text-indigo-700 hover:bg-amber-300 hover:text-indigo-950 rounded-2xl shadow-lg hover:shadow-xl transition-all active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-indigo-600" />
            + Thêm FB Cả Fanpage & Groups (1 Lần Login)
          </button>
        </div>

            {accounts.map(category => (
              <div key={category.category} className="liquid-glass rounded-3xl p-7 space-y-5">
                
                {/* Category Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
                  <div>
                    <h3 className="font-extrabold text-lg text-slate-900 tracking-tight">{category.categoryName}</h3>
                    <p className="text-xs text-slate-500 font-medium">{category.description}</p>
                  </div>
                  
                  <div className="flex items-center gap-2.5">
                    {category.category === 'chatgpt' && (
                      <button
                        onClick={() => setIsAddChatGptOpen(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white rounded-xl shadow-md shadow-violet-600/25 transition-all"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Thêm tài khoản ChatGPT
                      </button>
                    )}
                    {category.category === 'fanpage' && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsAddUnifiedFbOpen && setIsAddUnifiedFbOpen(true)}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl shadow-md transition-all cursor-pointer"
                          title="Thêm nick Facebook dùng chung cho cả Fanpage và Groups mà chỉ cần đăng nhập 1 lần"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-slate-950" /> Thêm FB Dùng Cả Fanpage & Groups
                        </button>
                        <button
                          onClick={() => setIsAddFanpageOpen(true)}
                          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md shadow-blue-600/25 transition-all"
                        >
                          <UserPlus className="w-3.5 h-3.5" /> Thêm Fanpage
                        </button>
                      </div>
                    )}
                    {category.category === 'groups' && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsAddUnifiedFbOpen && setIsAddUnifiedFbOpen(true)}
                          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl shadow-md transition-all cursor-pointer"
                          title="Thêm nick Facebook dùng chung cho cả Fanpage và Groups mà chỉ cần đăng nhập 1 lần"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-slate-950" /> Thêm FB Dùng Cả Fanpage & Groups
                        </button>
                        <button
                          onClick={() => setIsAddAccountOpen(true)}
                          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-600/25 transition-all"
                        >
                          <UserPlus className="w-3.5 h-3.5" /> Thêm tài khoản Group
                        </button>
                      </div>
                    )}
                    {category.category === 'personal' && (
                      <button
                        onClick={() => setIsAddPersonalOpen(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white rounded-xl shadow-md shadow-teal-600/25 transition-all"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Thêm tài khoản Cá nhân
                      </button>
                    )}
                    <span className="text-xs font-bold px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-full text-slate-700 shadow-2xs">
                      {category.items.length} Tài khoản
                    </span>
                  </div>
                </div>

                {/* Account Cards Grid OR 3-Group Rotation Kanban for Groups */}
                {category.category === 'groups' ? (
                  <div className="space-y-6">
                    {/* Header: Thanh điều khiển Chiến thuật 3 Nhóm */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 border border-slate-200 shadow-2xs">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200/80 flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                              CHIẾN THUẬT AN TOÀN 3 NHÓM
                            </span>
                            <span className="text-xs text-slate-500 font-medium">
                              Luân phiên 24h & Cách ly phục hồi 7 ngày (168 giờ)
                            </span>
                          </div>
                          <h4 className="text-base font-extrabold text-slate-900 tracking-tight">
                            Phân Bổ Ca Đăng Bài & Khu Vực Cách Ly Phục Hồi Trust Score
                          </h4>
                          <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                            Tự động đổi ca xen kẽ mỗi ngày giữa <b>🟢 Nhóm 1</b> và <b>🟡 Nhóm 2</b> để Facebook nhận diện hoạt động tự nhiên như người dùng thật. Khi tài khoản gặp cảnh báo checkpoint, bot tự động giam vào <b>🔴 Nhóm 3 (168 giờ)</b> để xóa vi phạm spam và phục hồi độ uy tín.
                          </p>
                        </div>

                        {/* Controls: Ca trực & Đổi ca */}
                        <div className="flex flex-wrap items-center gap-3 p-2.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs shrink-0">
                          <div className="px-2 border-r border-slate-200 text-left">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Ca chạy hôm nay</span>
                            <span className="text-xs font-extrabold flex items-center gap-1.5 mt-0.5">
                              {groupsData.rotation?.activeGroupToday === 'group_1' ? (
                                <span className="text-emerald-700 flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                  🟢 Nhóm 1 (Đang chạy)
                                </span>
                              ) : (
                                <span className="text-amber-700 flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                                  🟡 Nhóm 2 (Đang chạy)
                                </span>
                              )}
                            </span>
                          </div>

                          <button
                            onClick={() => handleSwitchActiveGroup()}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-xs"
                            title="Đổi phiên trực chiến ngay lập tức giữa Nhóm 1 và Nhóm 2"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                            Đổi ca trực ngay
                          </button>

                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none pl-1">
                            <input
                              type="checkbox"
                              checked={groupsData.rotation?.enabled !== false}
                              onChange={(e) => handleToggleRotation(e.target.checked)}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>Tự xoay ca mỗi ngày</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* BANNER HƯỚNG DẪN ĐĂNG NHẬP 1 LẦN & ĐỒNG BỘ PHIÊN */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50 border border-blue-200/80 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <KeyRound className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                            <span>Quy trình đăng nhập 1 lần duy nhất</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              Đang hoạt động
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 mt-0.5">
                            Bạn chỉ cần đăng nhập Facebook <strong className="text-blue-700">1 lần duy nhất</strong> trên Tài khoản 1. Mọi tài khoản nhóm khác tự động dùng chung phiên đăng nhập này mà không cần nhập mật khẩu hay mã 2FA lại!
                          </p>
                        </div>
                      </div>

                      {handleSyncAllProfiles && (
                        <button
                          onClick={handleSyncAllProfiles}
                          className="shrink-0 px-3.5 py-2 rounded-xl bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold shadow-2xs hover:shadow-xs transition-all flex items-center gap-1.5"
                          title="Chuyển toàn bộ tài khoản nhóm sang dùng chung phiên đăng nhập của nick FB chính"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                          Đồng bộ toàn bộ tài khoản
                        </button>
                      )}
                    </div>

                    {/* 3 Columns Kanban Board */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
                      {/* ================= CỘT 1: NHÓM 1 ================= */}
                      <div className={`rounded-2xl p-4 sm:p-5 border transition-all flex flex-col min-h-[460px] ${
                        groupsData.rotation?.activeGroupToday === 'group_1'
                          ? 'bg-emerald-50/30 border-emerald-300 ring-2 ring-emerald-500/20 shadow-sm'
                          : 'bg-slate-50/50 border-slate-200/90 shadow-2xs'
                      }`}>
                        {/* Column Header */}
                        <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-200/80">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-xs" />
                              <h4 className="font-extrabold text-slate-900 text-sm">🟢 NHÓM 1: ĐỘI CHÍNH</h4>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">Đăng bài ngày lẻ / Phiên A luân phiên</p>
                          </div>
                          {groupsData.rotation?.activeGroupToday === 'group_1' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse flex items-center gap-1">
                              🔥 ĐANG CHẠY
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              💤 Nghỉ ngơi
                            </span>
                          )}
                        </div>

                        {/* Stats Summary Badge */}
                        <div className="my-3 px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700">
                            👤 {(groupsData.accounts || []).filter((a) => a.roleGroup === 'group_1').length} tài khoản
                          </span>
                          <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                            🔗 {(groupsData.accounts || [])
                              .filter((a) => a.roleGroup === 'group_1')
                              .reduce((sum, a) => sum + (a.groupUrls?.length || 0), 0)} link nhóm
                          </span>
                        </div>

                        {/* Account Cards List */}
                        <div className="space-y-3 flex-1">
                          {(groupsData.accounts || []).filter((a) => a.roleGroup === 'group_1').length === 0 ? (
                            <div className="text-center py-10 text-xs text-slate-400 italic bg-white/70 rounded-xl border border-dashed border-slate-200">
                              Chưa có tài khoản nào trong Nhóm 1
                            </div>
                          ) : (
                            (groupsData.accounts || [])
                              .filter((a) => a.roleGroup === 'group_1')
                              .map((acc) => {
                                const catItem = category.items.find((it) => it.id === acc.id || it.id === `group_${acc.id}` || it.profileDir === acc.profileDir);
                                const isOnline = catItem?.isReady;
                                const loginStatus = catItem?.loginStatus;

                                return (
                                  <div key={acc.id} className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all space-y-3">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-extrabold text-xs flex items-center justify-center shrink-0">
                                          {acc.name.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                          <div className="font-extrabold text-slate-900 text-sm truncate">{acc.name}</div>
                                          <span className="text-[10px] text-slate-400 font-mono block truncate">
                                            {acc.profileDir}
                                          </span>
                                        </div>
                                      </div>
                                      <span className="px-2 py-0.5 rounded-md text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                                        {acc.groupUrls?.length || 0} link
                                      </span>
                                    </div>

                                    {/* Chrome & FB Status */}
                                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold ${
                                        isOnline ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                                      }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                                        Port 3002 {isOnline ? 'Online' : 'Chưa bật'}
                                      </span>
                                      {loginStatus === 'logged_in' ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã login FB
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                          Profile sẵn sàng
                                        </span>
                                      )}
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold bg-blue-50 text-blue-700 border border-blue-200" title={`Dùng chung phiên Facebook (${acc.profileDir || 'n8n-fb-group-profile-1'})`}>
                                        <KeyRound className="w-3 h-3 text-blue-600" /> Phiên FB chung
                                      </span>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="space-y-2 pt-2 border-t border-slate-100">
                                      <button
                                        onClick={() => handleOpenChrome(acc.profileDir || '', 3002, 'https://www.facebook.com/')}
                                        className="w-full py-1.5 px-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-indigo-200/70"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" /> Mở Chrome Profile
                                      </button>
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          onClick={() => handleChangeRoleGroup(acc.id, 'group_2')}
                                          className="flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 transition-all flex items-center justify-center gap-1"
                                          title="Chuyển sang Nhóm 2 (Đội dự phòng)"
                                        >
                                          <ArrowRight className="w-3 h-3" /> Sang Nhóm 2
                                        </button>
                                        <button
                                          onClick={() => handleChangeRoleGroup(acc.id, 'quarantine')}
                                          className="py-1.5 px-2 rounded-lg text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 transition-all flex items-center justify-center gap-1"
                                          title="Cách ly 7 ngày"
                                        >
                                          <Lock className="w-3 h-3" /> Cách ly 7N
                                        </button>
                                        {catItem && (
                                          <>
                                            <button
                                              onClick={() => openEditAccountModal(catItem)}
                                              className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-all"
                                              title="Sửa tài khoản"
                                            >
                                              <Edit3 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              onClick={() => handleDeleteAccount(acc.id, acc.name)}
                                              className="p-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 text-rose-600 border border-slate-200 transition-all"
                                              title="Xóa tài khoản"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                          )}
                        </div>
                      </div>

                      {/* ================= CỘT 2: NHÓM 2 ================= */}
                      <div className={`rounded-2xl p-4 sm:p-5 border transition-all flex flex-col min-h-[460px] ${
                        groupsData.rotation?.activeGroupToday === 'group_2'
                          ? 'bg-amber-50/30 border-amber-300 ring-2 ring-amber-500/20 shadow-sm'
                          : 'bg-slate-50/50 border-slate-200/90 shadow-2xs'
                      }`}>
                        {/* Column Header */}
                        <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-200/80">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full bg-amber-500 shadow-xs" />
                              <h4 className="font-extrabold text-slate-900 text-sm">🟡 NHÓM 2: ĐỘI DỰ PHÒNG</h4>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">Nghỉ ngơi hồi trust / Trực nhật ngày mai</p>
                          </div>
                          {groupsData.rotation?.activeGroupToday === 'group_2' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse flex items-center gap-1">
                              🔥 ĐANG CHẠY
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              💤 Nghỉ ngơi hồi phục
                            </span>
                          )}
                        </div>

                        {/* Stats Summary Badge */}
                        <div className="my-3 px-3 py-1.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700">
                            👤 {(groupsData.accounts || []).filter((a) => a.roleGroup === 'group_2').length} tài khoản
                          </span>
                          <span className="font-extrabold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                            🔗 {(groupsData.accounts || [])
                              .filter((a) => a.roleGroup === 'group_2')
                              .reduce((sum, a) => sum + (a.groupUrls?.length || 0), 0)} link nhóm
                          </span>
                        </div>

                        {/* Account Cards List */}
                        <div className="space-y-3 flex-1">
                          {(groupsData.accounts || []).filter((a) => a.roleGroup === 'group_2').length === 0 ? (
                            <div className="text-center py-10 text-xs text-slate-400 italic bg-white/70 rounded-xl border border-dashed border-slate-200">
                              Chưa có tài khoản nào trong Nhóm 2
                            </div>
                          ) : (
                            (groupsData.accounts || [])
                              .filter((a) => a.roleGroup === 'group_2')
                              .map((acc) => {
                                const catItem = category.items.find((it) => it.id === acc.id || it.id === `group_${acc.id}` || it.profileDir === acc.profileDir);
                                const isOnline = catItem?.isReady;
                                const loginStatus = catItem?.loginStatus;

                                return (
                                  <div key={acc.id} className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all space-y-3">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 font-extrabold text-xs flex items-center justify-center shrink-0">
                                          {acc.name.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                          <div className="font-extrabold text-slate-900 text-sm truncate">{acc.name}</div>
                                          <span className="text-[10px] text-slate-400 font-mono block truncate">
                                            {acc.profileDir}
                                          </span>
                                        </div>
                                      </div>
                                      <span className="px-2 py-0.5 rounded-md text-xs font-extrabold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                                        {acc.groupUrls?.length || 0} link
                                      </span>
                                    </div>

                                    {/* Chrome & FB Status */}
                                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold ${
                                        isOnline ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                                      }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                                        Port 3002 {isOnline ? 'Online' : 'Chưa bật'}
                                      </span>
                                      {loginStatus === 'logged_in' ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã login FB
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                          Profile sẵn sàng
                                        </span>
                                      )}
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold bg-blue-50 text-blue-700 border border-blue-200" title={`Dùng chung phiên Facebook (${acc.profileDir || 'n8n-fb-group-profile-1'})`}>
                                        <KeyRound className="w-3 h-3 text-blue-600" /> Phiên FB chung
                                      </span>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="space-y-2 pt-2 border-t border-slate-100">
                                      <button
                                        onClick={() => handleOpenChrome(acc.profileDir || '', 3002, 'https://www.facebook.com/')}
                                        className="w-full py-1.5 px-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-indigo-200/70"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" /> Mở Chrome Profile
                                      </button>
                                      <div className="flex items-center gap-1.5">
                                        <button
                                          onClick={() => handleChangeRoleGroup(acc.id, 'group_1')}
                                          className="flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 transition-all flex items-center justify-center gap-1"
                                          title="Chuyển sang Nhóm 1 (Đội chính)"
                                        >
                                          <ArrowRight className="w-3 h-3" /> Sang Nhóm 1
                                        </button>
                                        <button
                                          onClick={() => handleChangeRoleGroup(acc.id, 'quarantine')}
                                          className="py-1.5 px-2 rounded-lg text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 transition-all flex items-center justify-center gap-1"
                                          title="Cách ly 7 ngày"
                                        >
                                          <Lock className="w-3 h-3" /> Cách ly 7N
                                        </button>
                                        {catItem && (
                                          <>
                                            <button
                                              onClick={() => openEditAccountModal(catItem)}
                                              className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-all"
                                              title="Sửa tài khoản"
                                            >
                                              <Edit3 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              onClick={() => handleDeleteAccount(acc.id, acc.name)}
                                              className="p-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 text-rose-600 border border-slate-200 transition-all"
                                              title="Xóa tài khoản"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                          )}
                        </div>
                      </div>

                      {/* ================= CỘT 3: NHÓM 3 (KHU CÁCH LY 7 NGÀY) ================= */}
                      <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-b from-rose-50/40 via-white to-white border border-rose-200/90 shadow-2xs flex flex-col min-h-[460px]">
                        {/* Column Header */}
                        <div className="flex items-start justify-between gap-2 pb-3 border-b border-rose-200/70">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full bg-rose-600 animate-pulse" />
                              <h4 className="font-extrabold text-rose-900 text-sm">🔴 NHÓM 3: KHU CÁCH LY 7 NGÀY</h4>
                            </div>
                            <p className="text-[11px] text-rose-600/80 mt-0.5">Đóng băng 168 giờ, tuyệt đối không đụng vào</p>
                          </div>
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                            {(groupsData.accounts || []).filter((a) => a.roleGroup === 'quarantine').length} bị phạt
                          </span>
                        </div>

                        {/* Notice Box */}
                        <div className="p-3 my-3 rounded-xl bg-rose-50/70 border border-rose-200/60 text-[11px] text-rose-800 leading-relaxed">
                          💡 <b>Nguyên tắc:</b> Tài khoản khi gặp cảnh báo của Facebook sẽ tự động bị giam ở đây trong <b>7 ngày (168 giờ)</b> để xóa cờ vi phạm spam. Sau 7 ngày bot sẽ tự động đưa về nhóm ban đầu.
                        </div>

                        {/* Quarantined List */}
                        <div className="space-y-3 flex-1">
                          {(groupsData.accounts || []).filter((a) => a.roleGroup === 'quarantine').length === 0 ? (
                            <div className="text-center py-10 px-4 bg-emerald-50/30 rounded-xl border border-dashed border-emerald-200/80 text-slate-500 space-y-2">
                              <ShieldCheck className="w-8 h-8 text-emerald-500 mx-auto" />
                              <div className="text-sm font-extrabold text-emerald-800">Tất cả tài khoản đều an toàn!</div>
                              <p className="text-[11px] text-slate-400">Không có tài khoản nào bị cảnh báo hoặc đang cách ly.</p>
                            </div>
                          ) : (
                            (groupsData.accounts || [])
                              .filter((a) => a.roleGroup === 'quarantine')
                              .map((acc) => {
                                return (
                                  <div key={acc.id} className="p-3.5 rounded-xl bg-white border border-rose-200 shadow-2xs space-y-3">
                                    <div className="flex items-start justify-between">
                                      <div>
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-extrabold text-slate-900 text-sm">{acc.name}</span>
                                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-mono font-bold">
                                            CÁCH LY
                                          </span>
                                        </div>
                                        <span className="text-[11px] text-slate-500 font-mono block mt-0.5">
                                          📁 {acc.profileDir}
                                        </span>
                                      </div>
                                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                                        Gốc: {acc.originalRoleGroup === 'group_2' ? '🟡 Nhóm 2' : '🟢 Nhóm 1'}
                                      </span>
                                    </div>

                                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-100 text-[11px] text-rose-700 space-y-1">
                                      <div className="font-bold flex items-center gap-1">
                                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                        Lý do: {acc.quarantineReason || acc.disabledReason || 'Bị cảnh báo kiểm tra checkpoint'}
                                      </div>
                                      <div className="font-medium text-slate-600">
                                        ⏳ Còn lại: <b className="text-rose-900 font-bold">{formatCountdown(acc.quarantineUntil || acc.cooldownUntil)}</b>
                                      </div>
                                    </div>

                                    <div className="space-y-1.5 pt-1">
                                      <button
                                        onClick={() => handleOpenChrome(acc.profileDir || '', 3002, 'https://www.facebook.com/')}
                                        className="w-full py-1.5 px-3 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all flex items-center justify-center gap-1.5 border border-slate-200"
                                      >
                                        <ExternalLink className="w-3 h-3" /> Mở Chrome gỡ checkpoint
                                      </button>
                                      <button
                                        onClick={() => handleReleaseQuarantine(acc.id)}
                                        className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs flex items-center justify-center gap-1.5"
                                      >
                                        <Unlock className="w-3.5 h-3.5" /> 🔓 Mở khóa sớm (Đã giải checkpoint)
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Account Cards Grid for ChatGPT, Fanpage, Personal */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {category.items.map((acc: AccountItem) => {
                      const isEnabled = acc.enabled !== false;
                      const isOnline = acc.isReady;
                      const isConfigured = acc.isConfigured || acc.profileExists;

                      return (
                        <div
                          key={acc.id}
                          className={`liquid-glass-subtle liquid-glass-interactive rounded-2xl p-5 flex flex-col justify-between gap-4 border transition-all ${
                            !isEnabled ? 'opacity-70 bg-slate-50/50 border-slate-200' : 'border-slate-200/80'
                          }`}
                        >
                          <div>
                            {/* Card Header: Name & Enable Toggle Switch */}
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5 truncate" title={acc.name}>
                                {acc.name}
                              </h4>
                              
                              {/* Toggle Switch */}
                              <button
                                onClick={() => handleToggleAccount(category.category, acc.id, isEnabled)}
                                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all shadow-2xs flex-shrink-0 whitespace-nowrap ${
                                  isEnabled 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' 
                                    : 'bg-slate-200/70 text-slate-600 border border-slate-300 hover:bg-slate-200'
                                }`}
                                title={isEnabled ? 'Bấm để Tắt tài khoản này' : 'Bấm để Bật tài khoản này'}
                              >
                                {isEnabled ? (
                                  <>
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    <span>Đang Bật</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                    <span>Đã Tắt</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Status Badges: Đăng nhập / Profile / Online */}
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {/* Online / Port Status */}
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                                isOnline 
                                  ? 'bg-emerald-100/90 text-emerald-800 border border-emerald-300' 
                                  : 'bg-slate-100 text-slate-500 border border-slate-200'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'}`}></span>
                                {isOnline ? `Online (Port ${acc.port})` : `Chưa bật (Port ${acc.port})`}
                              </span>

                              {/* Real-time Login & Profile Status */}
                              {isOnline ? (
                                acc.loginStatus === 'logged_in' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã đăng nhập
                                  </span>
                                ) : acc.loginStatus === 'not_logged_in' ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                                    <AlertCircle className="w-3 h-3 text-rose-600" /> Chưa đăng nhập
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                    <ShieldCheck className="w-3 h-3 text-blue-600" /> Chrome đang mở
                                  </span>
                                )
                              ) : (
                                acc.profileExists ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200" title="Profile đã lưu trên máy. Bấm 'Mở Chrome Đăng nhập' để kiểm tra tài khoản">
                                    <ShieldCheck className="w-3 h-3 text-slate-500" /> Profile đã tạo
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200" title="Chưa tạo profile. Bấm 'Mở Chrome Đăng nhập' để tạo và đăng nhập">
                                    <AlertCircle className="w-3 h-3 text-amber-600" /> Chưa tạo Profile
                                  </span>
                                )
                              )}
                            </div>

                            <p className="text-xs text-slate-500 mb-3 line-clamp-2">{acc.desc}</p>
                            
                            <div className="flex flex-wrap gap-1.5 text-[11px]">
                              <span className="bg-slate-100/90 text-slate-700 px-2.5 py-0.5 rounded-lg border border-slate-200/80 font-medium">
                                Port: <b className="font-bold text-slate-900">{acc.port}</b>
                              </span>
                              <span className="bg-slate-100/90 text-slate-700 px-2.5 py-0.5 rounded-lg border border-slate-200/80 truncate max-w-[150px] font-medium" title={acc.profileDir}>
                                Profile: <b className="font-bold text-slate-900">{acc.profileDir}</b>
                              </span>
                              {acc.groupCount !== undefined && (
                                <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-lg border border-blue-200 font-bold">
                                  📁 {acc.groupCount} nhóm
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            <button
                              onClick={() => handleOpenChrome(acc.profileDir, acc.port, acc.url || 'https://chatgpt.com/')}
                              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                              <ExternalLink className="w-3.5 h-3.5" /> Mở Chrome Đăng nhập
                            </button>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  if (category.category === 'chatgpt') openEditChatGptModal(acc);
                                  else if (category.category === 'fanpage') openEditFanpageModal(acc);
                                  else if (category.category === 'personal') openEditPersonalModal(acc);
                                  else if (category.category === 'groups') openEditAccountModal(acc);
                                }}
                                className="flex-1 py-1.5 px-3 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 transition-all flex items-center justify-center gap-1 shadow-2xs hover:text-blue-600"
                              >
                                <Edit3 className="w-3 h-3 text-slate-500" /> Sửa
                              </button>
                              <button
                                onClick={() => {
                                  if (category.category === 'chatgpt') handleDeleteChatGpt(acc.id, acc.name);
                                  else if (category.category === 'fanpage') handleDeleteFanpage(acc.id, acc.name);
                                  else if (category.category === 'personal') handleDeletePersonal(acc.id, acc.name);
                                  else if (category.category === 'groups') handleDeleteAccount(acc.id, acc.name);
                                }}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all"
                                title="Xóa tài khoản này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            ))}
          </div>
      <AccountModals
        groupsData={groupsData}
        chatgptAccounts={accounts.find((c) => c.category === 'chatgpt')?.items || []}
        isAddChatGptOpen={isAddChatGptOpen}
        setIsAddChatGptOpen={setIsAddChatGptOpen}
        newChatGptForm={newChatGptForm}
        setNewChatGptForm={setNewChatGptForm}
        handleCreateChatGpt={handleCreateChatGpt}
        isEditChatGptOpen={isEditChatGptOpen}
        setIsEditChatGptOpen={setIsEditChatGptOpen}
        editingChatGpt={editingChatGpt}
        setEditingChatGpt={setEditingChatGpt}
        handleUpdateChatGpt={handleUpdateChatGpt}
        isAddAccountOpen={isAddAccountOpen}
        setIsAddAccountOpen={setIsAddAccountOpen}
        newAccountForm={newAccountForm}
        setNewAccountForm={setNewAccountForm}
        handleCreateAccount={handleCreateAccount}
        handleAutoDetectFbName={handleAutoDetectFbName}
        isDetectingName={isDetectingName}
        detectedGroupName={detectedGroupName}
        isEditAccountOpen={isEditAccountOpen}
        setIsEditAccountOpen={setIsEditAccountOpen}
        editingAccount={editingAccount}
        setEditingAccount={setEditingAccount}
        handleUpdateAccount={handleUpdateAccount}
        isAddFanpageOpen={isAddFanpageOpen}
        setIsAddFanpageOpen={setIsAddFanpageOpen}
        newFanpageForm={newFanpageForm}
        setNewFanpageForm={setNewFanpageForm}
        handleCreateFanpage={handleCreateFanpage}
        handleAutoDetectPageName={handleAutoDetectPageName}
        isEditFanpageOpen={isEditFanpageOpen}
        setIsEditFanpageOpen={setIsEditFanpageOpen}
        editingFanpage={editingFanpage}
        setEditingFanpage={setEditingFanpage}
        handleUpdateFanpage={handleUpdateFanpage}
        isAddPersonalOpen={isAddPersonalOpen}
        setIsAddPersonalOpen={setIsAddPersonalOpen}
        newPersonalForm={newPersonalForm}
        setNewPersonalForm={setNewPersonalForm}
        handleCreatePersonal={handleCreatePersonal}
        handleAutoDetectPersonalName={handleAutoDetectPersonalName}
        isEditPersonalOpen={isEditPersonalOpen}
        setIsEditPersonalOpen={setIsEditPersonalOpen}
        editingPersonal={editingPersonal}
        setEditingPersonal={setEditingPersonal}
        handleUpdatePersonal={handleUpdatePersonal}
        isAddUnifiedFbOpen={isAddUnifiedFbOpen}
        setIsAddUnifiedFbOpen={setIsAddUnifiedFbOpen}
        unifiedFbForm={unifiedFbForm}
        setUnifiedFbForm={setUnifiedFbForm}
        handleCreateUnifiedFb={handleCreateUnifiedFb}
      />
    </>
  );
}
