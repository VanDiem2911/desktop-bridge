'use client';

import React from 'react';
import {
  UserPlus,
  RefreshCw,
  Edit3,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';

interface AccountModalsProps {
  groupsData?: { accounts?: any[] };
  chatgptAccounts?: any[];
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
  newAccountForm: {
    id?: string;
    name: string;
    profileDir: string;
    port?: number | string;
    profileUrl: string;
    desc?: string;
    enabled?: boolean;
    groupUrlsText?: string;
    useSharedProfile?: boolean;
    sharedProfileDir?: string;
  };
  setNewAccountForm: React.Dispatch<React.SetStateAction<any>>;
  handleCreateAccount: (e: React.FormEvent) => Promise<void>;
  handleAutoDetectFbName: (url: string, targetType?: any) => Promise<void>;
  isDetectingName: boolean;
  detectedGroupName: string;
  isEditAccountOpen: boolean;
  setIsEditAccountOpen: (open: boolean) => void;
  editingAccount: {
    id: string;
    name: string;
    profileUrl?: string;
    profileDir: string;
    port?: number | string;
    desc?: string;
    enabled?: boolean;
    useSharedProfile?: boolean;
    sharedProfileDir?: string;
  } | null;
  setEditingAccount: React.Dispatch<React.SetStateAction<any>>;
  handleUpdateAccount: (e: React.FormEvent) => Promise<void>;

  isAddFanpageOpen: boolean;
  setIsAddFanpageOpen: (open: boolean) => void;
  newFanpageForm: {
    id?: string;
    name: string;
    pageUrl: string;
    profileDir: string;
    port: string | number;
    description?: string;
    desc?: string;
    enabled?: boolean;
    useSharedProfile?: boolean;
    sharedProfileDir?: string;
  };
  setNewFanpageForm: React.Dispatch<React.SetStateAction<any>>;
  handleCreateFanpage: (e: React.FormEvent) => Promise<void>;
  handleAutoDetectPageName: (url: string, isEdit?: any) => Promise<void>;
  isEditFanpageOpen: boolean;
  setIsEditFanpageOpen: (open: boolean) => void;
  editingFanpage: {
    id: string;
    name: string;
    pageUrl: string;
    profileDir: string;
    port: string | number;
    description?: string;
    desc?: string;
    enabled?: boolean;
    useSharedProfile?: boolean;
    sharedProfileDir?: string;
  } | null;
  setEditingFanpage: React.Dispatch<React.SetStateAction<any>>;
  handleUpdateFanpage: (e: React.FormEvent) => Promise<void>;

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
}

export default function AccountModals({
  groupsData,
  chatgptAccounts,
  isAddChatGptOpen,
  setIsAddChatGptOpen,
  newChatGptForm,
  setNewChatGptForm,
  handleCreateChatGpt,
  isEditChatGptOpen,
  setIsEditChatGptOpen,
  editingChatGpt,
  setEditingChatGpt,
  handleUpdateChatGpt,
  isAddAccountOpen,
  setIsAddAccountOpen,
  newAccountForm,
  setNewAccountForm,
  handleCreateAccount,
  handleAutoDetectFbName,
  isDetectingName,
  detectedGroupName,
  isEditAccountOpen,
  setIsEditAccountOpen,
  editingAccount,
  setEditingAccount,
  handleUpdateAccount,
  isAddFanpageOpen,
  setIsAddFanpageOpen,
  newFanpageForm,
  setNewFanpageForm,
  handleCreateFanpage,
  handleAutoDetectPageName,
  isEditFanpageOpen,
  setIsEditFanpageOpen,
  editingFanpage,
  setEditingFanpage,
  handleUpdateFanpage,
  isAddUnifiedFbOpen,
  setIsAddUnifiedFbOpen,
  unifiedFbForm,
  setUnifiedFbForm,
  handleCreateUnifiedFb,
  isAddPersonalOpen,
  setIsAddPersonalOpen,
  newPersonalForm,
  setNewPersonalForm,
  handleCreatePersonal,
  handleAutoDetectPersonalName,
  isEditPersonalOpen,
  setIsEditPersonalOpen,
  editingPersonal,
  setEditingPersonal,
  handleUpdatePersonal,
}: AccountModalsProps) {
  return (
    <>
      {/* ==================== MODAL THÊM TÀI KHOẢN CHATGPT MỚI ==================== */}
      {isAddChatGptOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="liquid-glass-modal rounded-3xl w-full max-w-lg p-7 space-y-4 shadow-2xl">
            <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-violet-600" /> Thêm Tài Khoản ChatGPT Mới
            </h3>
            <p className="text-xs text-slate-500">Thêm tài khoản ChatGPT để hệ thống tự động xen kẽ luân phiên và fallback khi hết hạn mức</p>

            <form onSubmit={handleCreateChatGpt} className="space-y-4 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên tài khoản ChatGPT:</label>
                <input
                  type="text"
                  value={newChatGptForm.name}
                  onChange={(e) => setNewChatGptForm({ ...newChatGptForm, name: e.target.value })}
                  placeholder={`VD: ChatGPT Tài khoản ${(chatgptAccounts?.length || 0) + 1}`}
                  className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Thư mục Profile Chrome:</label>
                  <input
                    type="text"
                    value={newChatGptForm.profileDir}
                    onChange={(e) => setNewChatGptForm({ ...newChatGptForm, profileDir: e.target.value })}
                    placeholder={`n8n-chatgpt-profile-${(chatgptAccounts?.length || 0) + 1}`}
                    className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cổng Remote Debug Port:</label>
                  <input
                    type="number"
                    value={newChatGptForm.port}
                    onChange={(e) => setNewChatGptForm({ ...newChatGptForm, port: e.target.value })}
                    placeholder={`VD: ${9240 + (chatgptAccounts?.length || 0) + 1}`}
                    className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="newGptEnabled"
                  checked={newChatGptForm.enabled}
                  onChange={(e) => setNewChatGptForm({ ...newChatGptForm, enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 border-slate-300"
                />
                <label htmlFor="newGptEnabled" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Kích hoạt ngay (Bật tham gia xen kẽ tạo ảnh)
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setIsAddChatGptOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white shadow-md shadow-violet-600/30"
                >
                  Thêm tài khoản ChatGPT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL SỬA TÀI KHOẢN CHATGPT ==================== */}
      {isEditChatGptOpen && editingChatGpt && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="liquid-glass-modal rounded-3xl w-full max-w-md p-7 space-y-4 shadow-2xl">
            <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-violet-600" /> Sửa Tài Khoản ChatGPT
            </h3>

            <form onSubmit={handleUpdateChatGpt} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên tài khoản:</label>
                <input
                  type="text"
                  value={editingChatGpt.name}
                  onChange={(e) => setEditingChatGpt({ ...editingChatGpt, name: e.target.value })}
                  required
                  className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Profile Chrome Folder:</label>
                  <input
                    type="text"
                    value={editingChatGpt.profileDir}
                    onChange={(e) => setEditingChatGpt({ ...editingChatGpt, profileDir: e.target.value })}
                    required
                    className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Port Debug:</label>
                  <input
                    type="number"
                    value={editingChatGpt.port}
                    onChange={(e) => setEditingChatGpt({ ...editingChatGpt, port: Number(e.target.value) })}
                    required
                    className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editGptEnabled"
                  checked={editingChatGpt.enabled}
                  onChange={(e) => setEditingChatGpt({ ...editingChatGpt, enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500 border-slate-300"
                />
                <label htmlFor="editGptEnabled" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Kích hoạt tài khoản (Đang Bật)
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={() => { setIsEditChatGptOpen(false); setEditingChatGpt(null); }}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white shadow-md shadow-violet-600/30"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL THÊM TÀI KHOẢN GROUP MỚI ==================== */}
      {isAddAccountOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="liquid-glass-modal rounded-3xl w-full max-w-lg p-7 space-y-4 shadow-2xl">
            <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" /> Thêm Tài Khoản Facebook Group Mới
            </h3>
            <p className="text-xs text-slate-500">Tạo thêm tài khoản mới để hệ thống tự động xoay vòng đăng bài nhiều nick</p>

            <form onSubmit={handleCreateAccount} className="space-y-4 pt-1">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Đường link Facebook cá nhân (Trang cá nhân của Nick):</label>
                  {isDetectingName && (
                    <span className="text-[11px] font-extrabold text-blue-600 flex items-center gap-1.5 animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Đang lấy tên Facebook...
                    </span>
                  )}
                </div>
                <input
                  type="url"
                  value={newAccountForm.profileUrl}
                  onChange={(e) => {
                    const url = e.target.value;
                    setNewAccountForm({ ...newAccountForm, profileUrl: url });
                    if (url.includes('facebook.com') && url.length > 20) {
                      handleAutoDetectFbName(url, 'newGroupAccount');
                    }
                  }}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData('text');
                    if (pasted && pasted.includes('facebook.com')) {
                      handleAutoDetectFbName(pasted, 'newGroupAccount');
                    }
                  }}
                  placeholder="https://www.facebook.com/tennick hoặc https://www.facebook.com/profile.php?id=..."
                  className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Tên tài khoản (Tự động nhận diện):</label>
                  {newAccountForm.name ? (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      ✓ Đã tự động lấy tên
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">Không bắt buộc (Tự điền khi dán link FB)</span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={newAccountForm.name}
                    onChange={(e) => setNewAccountForm({ ...newAccountForm, name: e.target.value })}
                    placeholder={`VD: Tài khoản ${(groupsData?.accounts?.length || 0) + 1} (Tự động lấy khi dán link)...`}
                    className="liquid-input w-full rounded-xl px-4 py-2.5 pr-20 text-sm text-slate-900 font-semibold"
                  />
                  {newAccountForm.profileUrl && (
                    <button
                      type="button"
                      disabled={isDetectingName}
                      onClick={() => handleAutoDetectFbName(newAccountForm.profileUrl, 'newGroupAccount')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 cursor-pointer transition-colors"
                      title="Bấm để lấy lại tên từ Facebook"
                    >
                      ⚡ Lấy tên
                    </button>
                  )}
                </div>
              </div>

              {/* CHẾ ĐỘ ĐĂNG NHẬP FACEBOOK: ĐĂNG NHẬP 1 LẦN DÙNG CHUNG HOẶC NICK RIÊNG */}
              <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-blue-900 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-blue-600" /> Phiên đăng nhập Facebook
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Khuyên dùng: Đăng nhập 1 lần
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer p-2.5 rounded-xl bg-white border border-blue-200/70 shadow-2xs hover:border-blue-400 transition-colors">
                    <input
                      type="radio"
                      name="newAccProfileMode"
                      checked={newAccountForm.useSharedProfile !== false}
                      onChange={() => setNewAccountForm({ ...newAccountForm, useSharedProfile: true })}
                      className="mt-0.5 w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        Dùng chung phiên Facebook đã có (Đăng nhập 1 lần)
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Tự động dùng phiên đăng nhập của tài khoản Facebook chính. Bạn không cần đăng nhập lại!
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors">
                    <input
                      type="radio"
                      name="newAccProfileMode"
                      checked={newAccountForm.useSharedProfile === false}
                      onChange={() => setNewAccountForm({ ...newAccountForm, useSharedProfile: false })}
                      className="mt-0.5 w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        Dùng Nick Facebook khác (Tạo Profile Chrome riêng)
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Chỉ chọn khi bạn muốn đăng nhập một nick Facebook cá nhân hoàn toàn khác.
                      </div>
                    </div>
                  </label>
                </div>

                {newAccountForm.useSharedProfile !== false ? (
                  <div className="pt-1 text-[11px] text-emerald-700 font-bold flex items-center gap-1.5 bg-emerald-50/80 px-2.5 py-1.5 rounded-lg border border-emerald-200/70">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                    Đã liên kết với Profile: <span className="font-mono">{newAccountForm.sharedProfileDir || 'n8n-fb-group-profile-1'}</span> (Không cần nhập mật khẩu)
                  </div>
                ) : (
                  <div className="pt-1.5 space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">Tên thư mục Profile Chrome riêng:</label>
                    <input
                      type="text"
                      value={newAccountForm.profileDir}
                      onChange={(e) => setNewAccountForm({ ...newAccountForm, profileDir: e.target.value })}
                      placeholder={`Mặc định: n8n-fb-group-profile-${(groupsData?.accounts?.length || 0) + 1}`}
                      className="liquid-input w-full rounded-xl px-3 py-2 text-xs text-slate-900 font-mono"
                    />
                    <span className="text-[10px] text-slate-400 block">Sẽ mở cửa sổ Chrome mới để bạn đăng nhập nick FB riêng biệt này.</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Danh sách link nhóm ban đầu (Mỗi link 1 dòng, tùy chọn):</label>
                <textarea
                  value={newAccountForm.groupUrlsText}
                  onChange={(e) => setNewAccountForm({ ...newAccountForm, groupUrlsText: e.target.value })}
                  rows={4}
                  placeholder="https://www.facebook.com/groups/nhom1&#10;https://www.facebook.com/groups/nhom2"
                  className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono text-xs"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="newAccEnabled"
                  checked={newAccountForm.enabled}
                  onChange={(e) => setNewAccountForm({ ...newAccountForm, enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <label htmlFor="newAccEnabled" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Kích hoạt tài khoản ngay sau khi tạo (Bật xoay vòng đăng bài)
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setIsAddAccountOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md shadow-blue-600/30"
                >
                  Tạo tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL SỬA TÀI KHOẢN GROUP ==================== */}
      {isEditAccountOpen && editingAccount && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="liquid-glass-modal rounded-3xl w-full max-w-md p-7 space-y-4 shadow-2xl">
            <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-blue-600" /> Sửa Tài Khoản Group
            </h3>

            <form onSubmit={handleUpdateAccount} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Đường link Facebook cá nhân:</label>
                  {isDetectingName && (
                    <span className="text-[11px] font-extrabold text-blue-600 flex items-center gap-1.5 animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Đang lấy tên Facebook...
                    </span>
                  )}
                </div>
                <input
                  type="url"
                  value={editingAccount.profileUrl || ''}
                  onChange={(e) => {
                    const url = e.target.value;
                    setEditingAccount({ ...editingAccount, profileUrl: url });
                    if (url.includes('facebook.com') && url.length > 20) {
                      handleAutoDetectFbName(url, 'editGroupAccount');
                    }
                  }}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData('text');
                    if (pasted && pasted.includes('facebook.com')) {
                      handleAutoDetectFbName(pasted, 'editGroupAccount');
                    }
                  }}
                  placeholder="https://www.facebook.com/tennick hoặc https://www.facebook.com/profile.php?id=..."
                  className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên tài khoản:</label>
                <div className="relative">
                  <input
                    type="text"
                    value={editingAccount.name}
                    onChange={(e) => setEditingAccount({ ...editingAccount, name: e.target.value })}
                    required
                    className="liquid-input w-full rounded-xl px-4 py-2.5 pr-20 text-sm text-slate-900 font-semibold"
                  />
                  {editingAccount.profileUrl && (
                    <button
                      type="button"
                      disabled={isDetectingName}
                      onClick={() => handleAutoDetectFbName(editingAccount.profileUrl || '', 'editGroupAccount')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 cursor-pointer transition-colors"
                      title="Bấm để lấy lại tên từ Facebook"
                    >
                      ⚡ Lấy tên
                    </button>
                  )}
                </div>
              </div>

              {/* CHẾ ĐỘ ĐĂNG NHẬP FACEBOOK: ĐĂNG NHẬP 1 LẦN DÙNG CHUNG HOẶC NICK RIÊNG */}
              <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-blue-900 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-blue-600" /> Phiên đăng nhập Facebook
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Khuyên dùng
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer p-2.5 rounded-xl bg-white border border-blue-200/70 shadow-2xs hover:border-blue-400 transition-colors">
                    <input
                      type="radio"
                      name="editAccProfileMode"
                      checked={editingAccount.useSharedProfile !== false}
                      onChange={() => setEditingAccount({ ...editingAccount, useSharedProfile: true, profileDir: editingAccount.sharedProfileDir || 'n8n-fb-group-profile-1' })}
                      className="mt-0.5 w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        Dùng chung phiên Facebook đã có (Đăng nhập 1 lần)
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Dùng chung phiên đăng nhập của nick Facebook chính. Không cần đăng nhập lại!
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors">
                    <input
                      type="radio"
                      name="editAccProfileMode"
                      checked={editingAccount.useSharedProfile === false}
                      onChange={() => setEditingAccount({ ...editingAccount, useSharedProfile: false })}
                      className="mt-0.5 w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        Dùng Nick Facebook khác (Tạo Profile Chrome riêng)
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Chỉ chọn khi bạn muốn đăng nhập một nick Facebook cá nhân hoàn toàn khác.
                      </div>
                    </div>
                  </label>
                </div>

                {editingAccount.useSharedProfile !== false ? (
                  <div className="pt-1 text-[11px] text-emerald-700 font-bold flex items-center gap-1.5 bg-emerald-50/80 px-2.5 py-1.5 rounded-lg border border-emerald-200/70">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                    Đã liên kết với Profile: <span className="font-mono">{editingAccount.profileDir || 'n8n-fb-group-profile-1'}</span> (Không cần đăng nhập lại)
                  </div>
                ) : (
                  <div className="pt-1.5 space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">Tên thư mục Profile Chrome riêng:</label>
                    <input
                      type="text"
                      value={editingAccount.profileDir}
                      onChange={(e) => setEditingAccount({ ...editingAccount, profileDir: e.target.value })}
                      required
                      className="liquid-input w-full rounded-xl px-3 py-2 text-xs text-slate-900 font-mono"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editAccEnabled"
                  checked={editingAccount.enabled}
                  onChange={(e) => setEditingAccount({ ...editingAccount, enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <label htmlFor="editAccEnabled" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Kích hoạt tài khoản (Đang Bật)
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={() => { setIsEditAccountOpen(false); setEditingAccount(null); }}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md shadow-blue-600/30"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ==================== MODAL THÊM FANPAGE MỚI ==================== */}
      {isAddFanpageOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="liquid-glass-modal rounded-3xl w-full max-w-lg p-7 space-y-4 shadow-2xl">
            <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" /> Thêm Facebook Fanpage Mới
            </h3>
            <p className="text-xs text-slate-500">
              Thêm một Fanpage mới vào hệ thống để xuất bản bài viết tự động qua Chrome Profile riêng biệt.
            </p>

            <form onSubmit={handleCreateFanpage} className="space-y-4 pt-1">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Đường link Facebook Fanpage:</label>
                  {isDetectingName && (
                    <span className="text-[11px] font-extrabold text-blue-600 flex items-center gap-1.5 animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Đang lấy tên Facebook...
                    </span>
                  )}
                </div>
                <input
                  type="url"
                  value={newFanpageForm.pageUrl}
                  onChange={(e) => {
                    const url = e.target.value;
                    setNewFanpageForm({ ...newFanpageForm, pageUrl: url });
                    if (url.includes('facebook.com') && url.length > 20) {
                      handleAutoDetectFbName(url, 'newFanpage');
                    }
                  }}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData('text');
                    if (pasted && pasted.includes('facebook.com')) {
                      handleAutoDetectFbName(pasted, 'newFanpage');
                    }
                  }}
                  placeholder="https://www.facebook.com/tenpage hoặc https://www.facebook.com/profile.php?id=..."
                  required
                  className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Tên Fanpage (Tự động nhận diện):</label>
                  {newFanpageForm.name ? (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      ✓ Đã tự động lấy tên
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">Không bắt buộc (Tự điền khi dán link)</span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={newFanpageForm.name}
                    onChange={(e) => setNewFanpageForm({ ...newFanpageForm, name: e.target.value })}
                    placeholder="Tự động nhận diện từ link FB hoặc nhập nếu muốn đổi..."
                    className="liquid-input w-full rounded-xl px-4 py-2.5 pr-20 text-sm text-slate-900 font-semibold"
                  />
                  {newFanpageForm.pageUrl && (
                    <button
                      type="button"
                      disabled={isDetectingName}
                      onClick={() => handleAutoDetectFbName(newFanpageForm.pageUrl, 'newFanpage')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 cursor-pointer transition-colors"
                      title="Bấm để lấy lại tên từ Facebook"
                    >
                      ⚡ Lấy tên
                    </button>
                  )}
                </div>
              </div>

              {/* CHẾ ĐỘ ĐĂNG NHẬP FACEBOOK CHO FANPAGE: ĐĂNG NHẬP 1 LẦN DÙNG CHUNG HOẶC NICK RIÊNG */}
              <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-blue-900 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-blue-600" /> Phiên đăng nhập Facebook
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Khuyên dùng: Đăng nhập 1 lần
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer p-2.5 rounded-xl bg-white border border-blue-200/70 shadow-2xs hover:border-blue-400 transition-colors">
                    <input
                      type="radio"
                      name="newFanpageProfileMode"
                      checked={newFanpageForm.useSharedProfile !== false}
                      onChange={() => setNewFanpageForm({ ...newFanpageForm, useSharedProfile: true, profileDir: 'n8n-fb-group-profile-1', port: 9223 })}
                      className="mt-0.5 w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        Dùng chung phiên Facebook chính (Đăng nhập 1 lần)
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Dùng chung phiên của Nick Facebook chính (cùng phiên với Nhóm). Không cần đăng nhập lại!
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors">
                    <input
                      type="radio"
                      name="newFanpageProfileMode"
                      checked={newFanpageForm.useSharedProfile === false}
                      onChange={() => setNewFanpageForm({ ...newFanpageForm, useSharedProfile: false })}
                      className="mt-0.5 w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        Dùng Nick Facebook khác (Tạo Profile Chrome riêng)
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Chỉ chọn nếu Fanpage này thuộc quyền quản trị của một nick FB cá nhân khác.
                      </div>
                    </div>
                  </label>
                </div>

                {newFanpageForm.useSharedProfile !== false ? (
                  <div className="pt-1 text-[11px] text-emerald-700 font-bold flex items-center gap-1.5 bg-emerald-50/80 px-2.5 py-1.5 rounded-lg border border-emerald-200/70">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                    Đã liên kết với Profile FB chính (n8n-fb-group-profile-1 - Port 9223)
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 pt-1.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Thư mục Profile Chrome:</label>
                      <input
                        type="text"
                        value={newFanpageForm.profileDir}
                        onChange={(e) => setNewFanpageForm({ ...newFanpageForm, profileDir: e.target.value })}
                        placeholder="VD: n8n-fanpage-profile-2"
                        className="liquid-input w-full rounded-xl px-3 py-2 text-xs text-slate-900 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Cổng Remote Port:</label>
                      <input
                        type="number"
                        value={newFanpageForm.port}
                        onChange={(e) => setNewFanpageForm({ ...newFanpageForm, port: e.target.value })}
                        placeholder="Mặc định: 9251+"
                        className="liquid-input w-full rounded-xl px-3 py-2 text-xs text-slate-900 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú mô tả (Tùy chọn):</label>
                <input
                  type="text"
                  value={newFanpageForm.description}
                  onChange={(e) => setNewFanpageForm({ ...newFanpageForm, description: e.target.value })}
                  placeholder="VD: Page chính thương hiệu, Page tin tức phụ..."
                  className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="newFanpageEnabled"
                  checked={newFanpageForm.enabled}
                  onChange={(e) => setNewFanpageForm({ ...newFanpageForm, enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <label htmlFor="newFanpageEnabled" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Kích hoạt Fanpage này ngay sau khi tạo
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setIsAddFanpageOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md shadow-blue-600/30"
                >
                  Thêm Fanpage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL SỬA FANPAGE ==================== */}
      {isEditFanpageOpen && editingFanpage && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="liquid-glass-modal rounded-3xl w-full max-w-lg p-7 space-y-4 shadow-2xl">
            <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-blue-600" /> Sửa Cấu Hình Facebook Fanpage
            </h3>

            <form onSubmit={handleUpdateFanpage} className="space-y-4 pt-1">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Đường link Facebook Fanpage:</label>
                  {isDetectingName && (
                    <span className="text-[11px] font-extrabold text-blue-600 flex items-center gap-1.5 animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Đang lấy tên Facebook...
                    </span>
                  )}
                </div>
                <input
                  type="url"
                  value={editingFanpage.pageUrl}
                  onChange={(e) => {
                    const url = e.target.value;
                    setEditingFanpage({ ...editingFanpage, pageUrl: url });
                    if (url.includes('facebook.com') && url.length > 20) {
                      handleAutoDetectFbName(url, 'editFanpage');
                    }
                  }}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData('text');
                    if (pasted && pasted.includes('facebook.com')) {
                      handleAutoDetectFbName(pasted, 'editFanpage');
                    }
                  }}
                  required
                  className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên Fanpage:</label>
                <div className="relative">
                  <input
                    type="text"
                    value={editingFanpage.name}
                    onChange={(e) => setEditingFanpage({ ...editingFanpage, name: e.target.value })}
                    required
                    className="liquid-input w-full rounded-xl px-4 py-2.5 pr-20 text-sm text-slate-900 font-semibold"
                  />
                  {editingFanpage.pageUrl && (
                    <button
                      type="button"
                      disabled={isDetectingName}
                      onClick={() => handleAutoDetectFbName(editingFanpage.pageUrl, 'editFanpage')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 cursor-pointer transition-colors"
                      title="Bấm để lấy lại tên từ Facebook"
                    >
                      ⚡ Lấy tên
                    </button>
                  )}
                </div>
              </div>

              {/* CHẾ ĐỘ ĐĂNG NHẬP FACEBOOK CHO FANPAGE: ĐĂNG NHẬP 1 LẦN DÙNG CHUNG HOẶC NICK RIÊNG */}
              <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-blue-900 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-blue-600" /> Phiên đăng nhập Facebook
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Khuyên dùng
                  </span>
                </div>

                <div className="space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer p-2.5 rounded-xl bg-white border border-blue-200/70 shadow-2xs hover:border-blue-400 transition-colors">
                    <input
                      type="radio"
                      name="editFanpageProfileMode"
                      checked={editingFanpage.useSharedProfile !== false}
                      onChange={() => setEditingFanpage({ ...editingFanpage, useSharedProfile: true, profileDir: 'n8n-fb-group-profile-1', port: 9223 })}
                      className="mt-0.5 w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        Dùng chung phiên Facebook chính (Đăng nhập 1 lần)
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Dùng chung phiên của Nick Facebook chính (cùng phiên với Nhóm). Không cần đăng nhập lại!
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition-colors">
                    <input
                      type="radio"
                      name="editFanpageProfileMode"
                      checked={editingFanpage.useSharedProfile === false}
                      onChange={() => setEditingFanpage({ ...editingFanpage, useSharedProfile: false })}
                      className="mt-0.5 w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-xs font-bold text-slate-800">
                        Dùng Nick Facebook khác (Tạo Profile Chrome riêng)
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Chỉ chọn nếu Fanpage này thuộc quyền quản trị của một nick FB cá nhân khác.
                      </div>
                    </div>
                  </label>
                </div>

                {editingFanpage.useSharedProfile !== false ? (
                  <div className="pt-1 text-[11px] text-emerald-700 font-bold flex items-center gap-1.5 bg-emerald-50/80 px-2.5 py-1.5 rounded-lg border border-emerald-200/70">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                    Đã liên kết với Profile FB chính (n8n-fb-group-profile-1 - Port 9223)
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 pt-1.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Profile Chrome Folder:</label>
                      <input
                        type="text"
                        value={editingFanpage.profileDir}
                        onChange={(e) => setEditingFanpage({ ...editingFanpage, profileDir: e.target.value })}
                        required
                        className="liquid-input w-full rounded-xl px-3 py-2 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Cổng Remote Port:</label>
                      <input
                        type="number"
                        value={editingFanpage.port}
                        onChange={(e) => setEditingFanpage({ ...editingFanpage, port: Number(e.target.value) })}
                        required
                        className="liquid-input w-full rounded-xl px-3 py-2 text-xs font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú mô tả:</label>
                <input
                  type="text"
                  value={editingFanpage.description}
                  onChange={(e) => setEditingFanpage({ ...editingFanpage, description: e.target.value })}
                  className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editFanpageEnabled"
                  checked={editingFanpage.enabled}
                  onChange={(e) => setEditingFanpage({ ...editingFanpage, enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <label htmlFor="editFanpageEnabled" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Kích hoạt Fanpage này (Đang Bật)
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={() => { setIsEditFanpageOpen(false); setEditingFanpage(null); }}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md shadow-blue-600/30"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL THÊM FACEBOOK CÁ NHÂN MỚI ==================== */}
      {isAddPersonalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="liquid-glass-modal rounded-3xl w-full max-w-lg p-7 space-y-4 shadow-2xl">
            <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-teal-600" /> Thêm Facebook Cá Nhân Mới
            </h3>
            <p className="text-xs text-slate-500">
              Thêm tài khoản cá nhân mới để đăng bài lên dòng thời gian / tường cá nhân độc lập.
            </p>

            <form onSubmit={handleCreatePersonal} className="space-y-4 pt-1">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Đường link Trang Cá Nhân:</label>
                  {isDetectingName && (
                    <span className="text-[11px] font-extrabold text-teal-600 flex items-center gap-1.5 animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Đang lấy tên Facebook...
                    </span>
                  )}
                </div>
                <input
                  type="url"
                  value={newPersonalForm.profileUrl}
                  onChange={(e) => {
                    const url = e.target.value;
                    setNewPersonalForm({ ...newPersonalForm, profileUrl: url });
                    if (url.includes('facebook.com') && url.length > 20) {
                      handleAutoDetectFbName(url, 'newPersonal');
                    }
                  }}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData('text');
                    if (pasted && pasted.includes('facebook.com')) {
                      handleAutoDetectFbName(pasted, 'newPersonal');
                    }
                  }}
                  placeholder="https://www.facebook.com/tennick hoặc https://www.facebook.com/profile.php?id=..."
                  required
                  className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Tên tài khoản (Tự động nhận diện):</label>
                  {newPersonalForm.name ? (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      ✓ Đã tự động lấy tên
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">Không bắt buộc (Tự điền khi dán link)</span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={newPersonalForm.name}
                    onChange={(e) => setNewPersonalForm({ ...newPersonalForm, name: e.target.value })}
                    placeholder="Tự động nhận diện từ link FB hoặc nhập nếu muốn..."
                    className="liquid-input w-full rounded-xl px-4 py-2.5 pr-20 text-sm text-slate-900 font-semibold"
                  />
                  {newPersonalForm.profileUrl && (
                    <button
                      type="button"
                      disabled={isDetectingName}
                      onClick={() => handleAutoDetectFbName(newPersonalForm.profileUrl, 'newPersonal')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-teal-600 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg border border-teal-200 cursor-pointer transition-colors"
                      title="Bấm để lấy lại tên từ Facebook"
                    >
                      ⚡ Lấy tên
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Thư mục Profile Chrome:</label>
                  <input
                    type="text"
                    value={newPersonalForm.profileDir}
                    onChange={(e) => setNewPersonalForm({ ...newPersonalForm, profileDir: e.target.value })}
                    placeholder="VD: n8n-personal-profile-2"
                    className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cổng Remote Port:</label>
                  <input
                    type="number"
                    value={newPersonalForm.port}
                    onChange={(e) => setNewPersonalForm({ ...newPersonalForm, port: e.target.value })}
                    placeholder="Mặc định: 9231+"
                    className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú mô tả (Tùy chọn):</label>
                <input
                  type="text"
                  value={newPersonalForm.description}
                  onChange={(e) => setNewPersonalForm({ ...newPersonalForm, description: e.target.value })}
                  placeholder="VD: Nick chính, Nick phụ tương tác..."
                  className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="newPersonalEnabled"
                  checked={newPersonalForm.enabled}
                  onChange={(e) => setNewPersonalForm({ ...newPersonalForm, enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                />
                <label htmlFor="newPersonalEnabled" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Kích hoạt tài khoản này ngay sau khi tạo
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setIsAddPersonalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-xs font-bold text-white shadow-md shadow-teal-600/30"
                >
                  Thêm tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL SỬA LINK TRANG CÁ NHÂN ==================== */}
      {isEditPersonalOpen && editingPersonal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="liquid-glass-modal rounded-3xl w-full max-w-lg p-7 space-y-4 shadow-2xl">
            <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-teal-600" /> Sửa Cấu Hình Facebook Cá Nhân
            </h3>

            <form onSubmit={handleUpdatePersonal} className="space-y-4 pt-1">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Đường link Trang Cá Nhân:</label>
                  {isDetectingName && (
                    <span className="text-[11px] font-extrabold text-teal-600 flex items-center gap-1.5 animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Đang lấy tên Facebook...
                    </span>
                  )}
                </div>
                <input
                  type="url"
                  value={editingPersonal.profileUrl}
                  onChange={(e) => {
                    const url = e.target.value;
                    setEditingPersonal({ ...editingPersonal, profileUrl: url });
                    if (url.includes('facebook.com') && url.length > 20) {
                      handleAutoDetectFbName(url, 'editPersonal');
                    }
                  }}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData('text');
                    if (pasted && pasted.includes('facebook.com')) {
                      handleAutoDetectFbName(pasted, 'editPersonal');
                    }
                  }}
                  required
                  className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên tài khoản:</label>
                <div className="relative">
                  <input
                    type="text"
                    value={editingPersonal.name}
                    onChange={(e) => setEditingPersonal({ ...editingPersonal, name: e.target.value })}
                    required
                    className="liquid-input w-full rounded-xl px-4 py-2.5 pr-20 text-sm text-slate-900 font-semibold"
                  />
                  {editingPersonal.profileUrl && (
                    <button
                      type="button"
                      disabled={isDetectingName}
                      onClick={() => handleAutoDetectFbName(editingPersonal.profileUrl, 'editPersonal')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-teal-600 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg border border-teal-200 cursor-pointer transition-colors"
                      title="Bấm để lấy lại tên từ Facebook"
                    >
                      ⚡ Lấy tên
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Profile Chrome Folder:</label>
                  <input
                    type="text"
                    value={editingPersonal.profileDir}
                    onChange={(e) => setEditingPersonal({ ...editingPersonal, profileDir: e.target.value })}
                    required
                    className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cổng Remote Port:</label>
                  <input
                    type="number"
                    value={editingPersonal.port}
                    onChange={(e) => setEditingPersonal({ ...editingPersonal, port: Number(e.target.value) })}
                    required
                    className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mô tả ghi chú:</label>
                <input
                  type="text"
                  value={editingPersonal.description}
                  onChange={(e) => setEditingPersonal({ ...editingPersonal, description: e.target.value })}
                  placeholder="VD: Nick chính, Nick phụ seeding..."
                  className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editPersonalEnabled"
                  checked={editingPersonal.enabled}
                  onChange={(e) => setEditingPersonal({ ...editingPersonal, enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                />
                <label htmlFor="editPersonalEnabled" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Kích hoạt tài khoản này (Đang Bật)
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={() => { setIsEditPersonalOpen(false); setEditingPersonal(null); }}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-xs font-bold text-white shadow-md shadow-teal-600/30"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL THÊM TÀI KHOẢN FACEBOOK ĐA NĂNG (FANPAGE & GROUPS) ==================== */}
      {isAddUnifiedFbOpen && unifiedFbForm && setUnifiedFbForm && handleCreateUnifiedFb && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="liquid-glass-modal rounded-3xl w-full max-w-xl p-7 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs font-black shadow-xs">
                    FB
                  </span>
                  Thêm tài khoản Facebook
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Chọn nơi tài khoản này được dùng để đăng bài.
                </p>
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); if (handleCreateUnifiedFb) handleCreateUnifiedFb(e); }} className="space-y-4 pt-1">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Link Facebook cá nhân (Hoặc tên Nick):</label>
                  {isDetectingName && (
                    <span className="text-[11px] font-extrabold text-blue-600 flex items-center gap-1.5 animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Đang lấy tên Facebook...
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={unifiedFbForm.profileUrl || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setUnifiedFbForm({ ...unifiedFbForm, profileUrl: val });
                    if (val.includes('facebook.com') && val.length > 20) {
                      handleAutoDetectFbName(val, 'unifiedFb');
                    }
                  }}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData('text');
                    if (pasted && pasted.includes('facebook.com')) {
                      handleAutoDetectFbName(pasted, 'unifiedFb');
                    }
                  }}
                  placeholder="VD: https://www.facebook.com/tennick hoặc dán link cá nhân..."
                  className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên tài khoản hiển thị:</label>
                <input
                  type="text"
                  value={unifiedFbForm.name}
                  onChange={(e) => setUnifiedFbForm({ ...unifiedFbForm, name: e.target.value })}
                  placeholder="VD: Nick FB Chính (Tự động lấy khi dán link FB ở trên)..."
                  className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 font-semibold"
                />
              </div>

              {/* MỤC 1: CHO VÀO FACEBOOK FANPAGE */}
              <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={unifiedFbForm.enableFanpage}
                      onChange={(e) => setUnifiedFbForm({ ...unifiedFbForm, enableFanpage: e.target.checked })}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-extrabold text-blue-950 flex items-center gap-1.5">
                    📄 Dùng để đăng Fanpage
                    </span>
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">
                    Hỗ trợ 5+ Fanpage cùng lúc
                  </span>
                </div>

                {unifiedFbForm.enableFanpage && (
                  <div className="space-y-1 pt-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Danh sách link Fanpage (Mỗi dòng 1 link, ví dụ 5 Fanpage mà nick này quản lý):
                    </label>
                    <textarea
                      value={unifiedFbForm.fanpageUrlsText}
                      onChange={(e) => setUnifiedFbForm({ ...unifiedFbForm, fanpageUrlsText: e.target.value })}
                      rows={3}
                      placeholder="https://www.facebook.com/fanpage-1&#10;https://www.facebook.com/fanpage-2&#10;https://www.facebook.com/fanpage-3"
                      className="liquid-input w-full rounded-xl px-3 py-2 text-xs font-mono"
                    />
                    <span className="text-[10px] text-slate-500 block">
                      Hệ thống sẽ thêm các Fanpage này vào danh sách Fanpage và dùng chung phiên đăng nhập của nick FB này.
                    </span>
                  </div>
                )}
              </div>

              {/* MỤC 2: CHO VÀO FACEBOOK GROUPS */}
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={unifiedFbForm.enableGroups}
                      onChange={(e) => setUnifiedFbForm({ ...unifiedFbForm, enableGroups: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                    👥 Dùng để đăng Nhóm Facebook
                    </span>
                  </label>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                    Xoay vòng bài đăng
                  </span>
                </div>

                {unifiedFbForm.enableGroups && (
                  <div className="space-y-1 pt-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Danh sách link Nhóm Facebook ban đầu (Mỗi link 1 dòng, tùy chọn):
                    </label>
                    <textarea
                      value={unifiedFbForm.groupUrlsText}
                      onChange={(e) => setUnifiedFbForm({ ...unifiedFbForm, groupUrlsText: e.target.value })}
                      rows={3}
                      placeholder="https://www.facebook.com/groups/nhom-1&#10;https://www.facebook.com/groups/nhom-2"
                      className="liquid-input w-full rounded-xl px-3 py-2 text-xs font-mono"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={() => { if (setIsAddUnifiedFbOpen) setIsAddUnifiedFbOpen(false); }}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md shadow-blue-600/30 flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Lưu và Liên kết ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </>
  );
}
