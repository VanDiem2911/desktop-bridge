'use client';

import React, { useState } from 'react';
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
  ShieldAlert,
  AlertTriangle,
  FileText,
  Power,
} from 'lucide-react';
import { AccountCategory, AccountItem, GroupAccount, CentralPoolItem, RotationConfig } from '@/types/dashboard';
import AccountModals, { FbModalFormData } from '@/components/modals/AccountModals';

interface AccountsTabProps {
  handleMarkCheckpoint?: (accountId: string, category: string, reason?: string) => Promise<void>;
  handleResolveCheckpoint?: (accountId: string, category: string) => Promise<void>;
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
  handleDeleteChatGpt: (id: string, name: string) => Promise<void>;
  handleToggleAccount: (category: string, accountId: string, currentEnabled: boolean) => Promise<void>;

  // Unified Facebook Account Props
  isFbModalOpen: boolean;
  setIsFbModalOpen: (open: boolean) => void;
  isFbModalEditing: boolean;
  fbModalForm: FbModalFormData;
  setFbModalForm: React.Dispatch<React.SetStateAction<FbModalFormData>>;
  handleSaveFbAccount: (e: React.FormEvent) => Promise<void>;
  handleDeleteFbAccount: (id: string, port: number, name: string) => Promise<void>;
  handleToggleFbAccount: (id: string, port: number, currentEnabled: boolean) => Promise<void>;
  openAddFbModal: () => void;
  openEditFbModal: (acc: AccountItem) => void;
  handleAutoDetectFbName: (url: string, targetType?: any) => Promise<void>;
  isDetectingName: boolean;

  // ChatGPT Props
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
  handleDeleteChatGpt,
  handleToggleAccount,
  handleResolveCheckpoint,

  isFbModalOpen,
  setIsFbModalOpen,
  isFbModalEditing,
  fbModalForm,
  setFbModalForm,
  handleSaveFbAccount,
  handleDeleteFbAccount,
  handleToggleFbAccount,
  openAddFbModal,
  openEditFbModal,
  handleAutoDetectFbName,
  isDetectingName,

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

  const checkpointCategory = accounts.find((c) => c.category === 'checkpoint');
  const facebookCategory = accounts.find((c) => c.category === 'facebook');
  const chatgptCategory = accounts.find((c) => c.category === 'chatgpt');

  return (
    <>
      <div className="space-y-8">
        {/* ==================== HEADER BANNER & ACTION BUTTONS ==================== */}
        <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white shadow-xl shadow-blue-500/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-extrabold text-blue-50 border border-white/20">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              QUẢN LÝ TẬP TRUNG TÀI KHOẢN FACEBOOK
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight">
              Tất Cả Tài Khoản Facebook Tại Một Nơi Duy Nhất
            </h3>
            <p className="text-xs sm:text-sm text-blue-100 font-medium leading-relaxed">
              Mỗi tài khoản được cấp riêng <b>1 Cổng Remote Port</b> và <b>1 Thư mục Profile Chrome</b> (Độc lập 100% - Chống checkpoint chéo). Tùy chọn quyền Đăng Fanpage hoặc Đăng Nhóm cho từng tài khoản một cách dễ dàng.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={openAddFbModal}
              className="flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-extrabold bg-white text-blue-700 hover:bg-blue-50 rounded-2xl shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-blue-600" />
              Thêm tài khoản Facebook
            </button>
            <button
              onClick={() => setIsAddChatGptOpen(true)}
              className="flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-extrabold bg-white/15 hover:bg-white/25 border border-white/30 text-white rounded-2xl transition-all cursor-pointer backdrop-blur-md"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              Thêm tài khoản ChatGPT
            </button>
          </div>
        </div>

        {/* ==================== KHỐI 1: TÀI KHOẢN YÊU CẦU XÁC THỰC (CHECKPOINT) ==================== */}
        {checkpointCategory && checkpointCategory.items.length > 0 && (
          <div className="liquid-glass rounded-3xl p-7 space-y-5 border-2 border-amber-300/90 bg-amber-50/30">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200/80 pb-4">
              <div>
                <h3 className="font-extrabold text-lg text-amber-950 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-600 animate-bounce" />
                  {checkpointCategory.categoryName}
                </h3>
                <p className="text-xs text-amber-800 font-medium mt-0.5">
                  {checkpointCategory.description}
                </p>
              </div>
              <span className="px-3 py-1 bg-rose-100 text-rose-800 text-xs font-black rounded-full border border-rose-300">
                🔴 {checkpointCategory.items.length} Cần xác thực
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {checkpointCategory.items.map((acc: AccountItem) => (
                <div
                  key={acc.id}
                  className="rounded-2xl p-5 border-2 border-amber-300/90 bg-white/95 shadow-md flex flex-col justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                        Port: {acc.port}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                        CẦN XÁC THỰC
                      </span>
                    </div>
                    <h4 className="font-extrabold text-base text-slate-900 truncate" title={acc.name}>
                      {acc.name}
                    </h4>
                    <span className="text-xs text-slate-500 font-mono block">
                      📁 Profile: <b>{acc.profileDir}</b>
                    </span>
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100 text-xs text-rose-900 flex items-start gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>{acc.checkpointReason || 'Facebook yêu cầu xác nhận danh tính người thật.'}</span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-amber-100">
                    <button
                      onClick={() => handleOpenChrome(acc.profileDir, acc.port, acc.checkpointUrl || acc.url || 'https://www.facebook.com/')}
                      className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Mở Chrome để xác minh
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleResolveCheckpoint?.(acc.id, 'facebook')}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Unlock className="w-3.5 h-3.5" /> Đã xác thực xong
                      </button>
                      <button
                        onClick={() => handleDeleteFbAccount(acc.id, acc.port, acc.name)}
                        className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 border border-rose-200 transition-colors"
                        title="Xóa tài khoản này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ==================== KHỐI 2: DANH SÁCH TÀI KHOẢN FACEBOOK TẬP TRUNG ==================== */}
        {facebookCategory && (
          <div className="liquid-glass rounded-3xl p-7 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  {facebookCategory.categoryName}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {facebookCategory.description}
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={openAddFbModal}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md shadow-blue-600/25 transition-all cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Thêm tài khoản Facebook
                </button>
                <span className="text-xs font-bold px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-full text-slate-700">
                  {facebookCategory.items.length} Tài khoản
                </span>
              </div>
            </div>

            {/* Grid Thẻ Tài khoản Facebook */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {facebookCategory.items.map((acc: AccountItem) => {
                const isEnabled = acc.enabled !== false;
                const isOnline = acc.isReady;

                return (
                  <div
                    key={acc.id}
                    className={`rounded-2xl p-5 border transition-all flex flex-col justify-between gap-4 relative overflow-hidden ${
                      !isEnabled
                        ? 'opacity-65 bg-slate-50/70 border-slate-200'
                        : 'bg-white/95 border-slate-200/90 shadow-sm hover:shadow-md'
                    }`}
                  >
                    {/* Top Bar: Port & Status */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        {/* Port Badge */}
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold bg-blue-50 text-blue-800 border border-blue-200">
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                          Port: <b className="font-mono">{acc.port}</b>
                        </span>

                        {/* Online / Login Status Badge */}
                        {acc.loginStatus === 'logged_in' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Đã đăng nhập
                          </span>
                        ) : isOnline ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Chưa đăng nhập
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            Chrome tắt
                          </span>
                        )}
                      </div>

                      {/* Name & Profile Dir */}
                      <div>
                        <h4 className="font-extrabold text-base text-slate-900 truncate" title={acc.name}>
                          {acc.name}
                        </h4>
                        <span className="text-[11px] text-slate-500 font-mono block mt-0.5">
                          📁 Profile: <b className="text-slate-800">{acc.profileDir}</b>
                        </span>
                      </div>

                      {/* Role & Permissions Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {acc.canPostFanpage && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200/80">
                            <FileText className="w-3 h-3 text-blue-600" />
                            Đăng Fanpage
                          </span>
                        )}
                        {acc.canPostGroup && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200/80">
                            <Users className="w-3 h-3 text-indigo-600" />
                            Đăng Nhóm ({acc.groupCount || 0} link)
                            <span className="ml-1 text-[10px] px-1 rounded bg-indigo-200/70 text-indigo-950 font-extrabold">
                              {acc.roleGroup === 'group_2' ? '🟡 N2' : '🟢 N1'}
                            </span>
                          </span>
                        )}
                        {!acc.canPostFanpage && !acc.canPostGroup && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600">
                            Chưa gán vai trò
                          </span>
                        )}
                      </div>

                      {/* Link FB */}
                      {acc.url && (
                        <a
                          href={acc.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-blue-600 truncate max-w-full font-mono hover:underline"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="truncate">{acc.url}</span>
                        </a>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => handleOpenChrome(acc.profileDir, acc.port, acc.url || 'https://www.facebook.com/')}
                        className="w-full py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 border border-blue-200/80 cursor-pointer"
                        title="Khởi động trình duyệt Chrome của nick này để đăng nhập hoặc kiểm tra"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Mở Chrome Profile (Port {acc.port})
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEditFbModal(acc)}
                          className="flex-1 py-1.5 px-3 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all flex items-center justify-center gap-1 cursor-pointer"
                          title="Chỉnh sửa thông tin nick, quyền đăng hoặc link nhóm"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Sửa
                        </button>

                        <button
                          onClick={() => handleToggleFbAccount(acc.id, acc.port, isEnabled)}
                          className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                            isEnabled
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                          }`}
                          title={isEnabled ? 'Tạm dừng hoạt động tài khoản này' : 'Kích hoạt lại tài khoản này'}
                        >
                          <Power className="w-3.5 h-3.5" />
                          {isEnabled ? 'Tắt' : 'Bật'}
                        </button>

                        <button
                          onClick={() => handleDeleteFbAccount(acc.id, acc.port, acc.name)}
                          className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-700 border border-slate-200 transition-colors cursor-pointer"
                          title="Xóa tài khoản này khỏi hệ thống"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Thanh điều khiển Chiến thuật 3 Nhóm cho các tài khoản đăng nhóm */}
            <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 border border-slate-200 shadow-2xs">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200/80 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                      CHIẾN THUẬT LUÂN PHIÊN ĐĂNG NHÓM
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      Tự động đổi ca mỗi ngày & Cách ly bảo vệ an toàn
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">
                    Hệ thống sẽ luân phiên đăng bài giữa <b>🟢 Nhóm 1</b> và <b>🟡 Nhóm 2</b> theo ca mỗi ngày để Facebook không đánh dấu hành vi bất thường.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs shrink-0">
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
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-xs cursor-pointer"
                    title="Đổi ca trực ngay lập tức"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    Đổi ca trực
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
          </div>
        )}

        {/* ==================== KHỐI 3: TÀI KHOẢN CHATGPT (TẠO ẢNH AI) ==================== */}
        {chatgptCategory && (
          <div className="liquid-glass rounded-3xl p-7 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                  <Bot className="w-5 h-5 text-violet-600" />
                  {chatgptCategory.categoryName}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {chatgptCategory.description}
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setIsAddChatGptOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white rounded-xl shadow-md shadow-violet-600/25 transition-all cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Thêm tài khoản ChatGPT
                </button>
                <span className="text-xs font-bold px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-full text-slate-700">
                  {chatgptCategory.items.length} Tài khoản
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {chatgptCategory.items.map((acc: AccountItem) => {
                const isEnabled = acc.enabled !== false;
                const isOnline = acc.isReady;

                return (
                  <div
                    key={acc.id}
                    className={`rounded-2xl p-5 border transition-all flex flex-col justify-between gap-4 ${
                      !isEnabled
                        ? 'opacity-65 bg-slate-50/70 border-slate-200'
                        : 'bg-white/95 border-slate-200/90 shadow-sm hover:shadow-md'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold bg-violet-50 text-violet-800 border border-violet-200">
                          Port: <b className="font-mono">{acc.port}</b>
                        </span>
                        {isOnline ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            Offline
                          </span>
                        )}
                      </div>

                      <h4 className="font-extrabold text-base text-slate-900 truncate" title={acc.name}>
                        {acc.name}
                      </h4>
                      <span className="text-[11px] text-slate-500 font-mono block">
                        📁 Profile: <b className="text-slate-800">{acc.profileDir}</b>
                      </span>
                      {acc.desc && <p className="text-xs text-slate-500">{acc.desc}</p>}
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => handleOpenChrome(acc.profileDir, acc.port, 'https://chatgpt.com/')}
                        className="w-full py-2 px-3 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 border border-violet-200/80 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Mở Chrome ChatGPT
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditChatGptModal(acc)}
                          className="flex-1 py-1.5 px-3 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Sửa
                        </button>
                        <button
                          onClick={() => handleToggleAccount('chatgpt', acc.id, isEnabled)}
                          className={`py-1.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                            isEnabled
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                          {isEnabled ? 'Tắt' : 'Bật'}
                        </button>
                        <button
                          onClick={() => handleDeleteChatGpt(acc.id, acc.name)}
                          className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 hover:text-rose-700 border border-slate-200 transition-colors cursor-pointer"
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
          </div>
        )}
      </div>

      {/* ==================== TẤT CẢ CÁC MODAL THÊM / SỬA ==================== */}
      <AccountModals
        isFbModalOpen={isFbModalOpen}
        setIsFbModalOpen={setIsFbModalOpen}
        isFbModalEditing={isFbModalEditing}
        fbModalForm={fbModalForm}
        setFbModalForm={setFbModalForm}
        handleSaveFbAccount={handleSaveFbAccount}
        handleAutoDetectFbName={handleAutoDetectFbName}
        isDetectingName={isDetectingName}

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
      />
    </>
  );
}
