'use client';

import React from 'react';
import {
  UserPlus,
  RefreshCw,
  Edit3,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
  Globe,
  FileText,
  Users,
  X,
} from 'lucide-react';

export interface FbModalFormData {
  id?: string;
  name: string;
  url: string;
  port: number | string;
  profileDir: string;
  canPostFanpage: boolean;
  fanpageUrl?: string;
  canPostGroup: boolean;
  groupUrlsText?: string;
  roleGroup?: string;
  enabled?: boolean;
}

interface AccountModalsProps {
  // Facebook Modal State
  isFbModalOpen: boolean;
  setIsFbModalOpen: (open: boolean) => void;
  isFbModalEditing: boolean;
  fbModalForm: FbModalFormData;
  setFbModalForm: React.Dispatch<React.SetStateAction<FbModalFormData>>;
  handleSaveFbAccount: (e: React.FormEvent) => Promise<void>;
  handleAutoDetectFbName: (url: string, targetType?: any) => Promise<void>;
  isDetectingName: boolean;

  // ChatGPT Modals State
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

export default function AccountModals({
  isFbModalOpen,
  setIsFbModalOpen,
  isFbModalEditing,
  fbModalForm,
  setFbModalForm,
  handleSaveFbAccount,
  handleAutoDetectFbName,
  isDetectingName,

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
}: AccountModalsProps) {
  return (
    <>
      {/* ==================== MODAL TẬP TRUNG: THÊM / SỬA TÀI KHOẢN FACEBOOK ==================== */}
      {isFbModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                  FB
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                    {isFbModalEditing ? `Chỉnh sửa: ${fbModalForm.name || 'Tài khoản'}` : 'Thêm tài khoản Facebook mới'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Cấu hình Chrome độc lập & phân quyền đăng bài
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFbModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFbAccount} className="space-y-4">
              {/* 1. Tên hiển thị & Link */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">Tên tài khoản hiển thị:</label>
                    {fbModalForm.url && (
                      <button
                        type="button"
                        disabled={isDetectingName}
                        onClick={() => handleAutoDetectFbName(fbModalForm.url, 'unifiedFb')}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-md transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw className={`w-3 h-3 ${isDetectingName ? 'animate-spin' : ''}`} />
                        {isDetectingName ? 'Đang lấy...' : 'Lấy tên'}
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={fbModalForm.name}
                    onChange={(e) => setFbModalForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="VD: 3H Paradise, Pham Hien..."
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-blue-500 px-3.5 py-2 text-xs font-semibold text-slate-900 transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Link Facebook (Profile / Trang):</label>
                  <input
                    type="text"
                    value={fbModalForm.url}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFbModalForm(prev => ({ ...prev, url: val }));
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
                    placeholder="https://www.facebook.com/..."
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-blue-500 px-3.5 py-2 text-xs font-mono text-slate-700 transition-all outline-none"
                  />
                </div>
              </div>

              {/* 2. Cấu hình Chrome gọn gàng */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Chrome Profile độc lập
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                    Không dính checkpoint chéo
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cổng Remote Port:</label>
                    <input
                      type="number"
                      value={fbModalForm.port}
                      onChange={(e) => {
                        const newPort = Number(e.target.value);
                        setFbModalForm(prev => ({
                          ...prev,
                          port: newPort,
                          profileDir: prev.profileDir.startsWith('n8n-fb-profile-') ? `n8n-fb-profile-${newPort}` : prev.profileDir,
                        }));
                      }}
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono font-bold text-slate-900 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Thư mục Profile:</label>
                    <input
                      type="text"
                      value={fbModalForm.profileDir}
                      onChange={(e) => setFbModalForm(prev => ({ ...prev, profileDir: e.target.value }))}
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono font-bold text-slate-900 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Mục đích sử dụng */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-800">
                  Mục đích sử dụng:
                </label>

                {/* Option: Đăng bài Nhóm Facebook */}
                <div className="p-3 rounded-2xl border bg-indigo-50/60 border-indigo-300 ring-1 ring-indigo-400/20">
                  <div className="flex items-center gap-2.5">
                    <span className="w-4 h-4 rounded text-indigo-600 font-bold flex items-center justify-center">✓</span>
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-indigo-600" />
                      Dùng để đăng bài vào Nhóm Facebook (Profile độc lập chống Checkpoint)
                    </span>
                  </div>
                </div>

                {/* Option: Fanpage */}
                <div className={`p-3 rounded-2xl border transition-all ${
                  fbModalForm.canPostFanpage
                    ? 'bg-blue-50/60 border-blue-300 ring-1 ring-blue-400/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}>
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={fbModalForm.canPostFanpage}
                      onChange={(e) => setFbModalForm(prev => ({ ...prev, canPostFanpage: e.target.checked }))}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-blue-600" />
                      Dùng để đăng lên Fanpage (tùy chọn)
                    </span>
                  </label>
                  {fbModalForm.canPostFanpage && (
                    <div className="mt-2.5 pl-6.5">
                      <input
                        type="text"
                        value={fbModalForm.fanpageUrl || ''}
                        onChange={(e) => setFbModalForm(prev => ({ ...prev, fanpageUrl: e.target.value }))}
                        placeholder={fbModalForm.url || 'Link Fanpage riêng (để trống nếu dùng link ở trên)'}
                        className="w-full rounded-xl border border-blue-200 bg-white px-3 py-1.5 text-xs font-mono text-slate-800 outline-none focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Bật / Tắt trạng thái */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={fbModalForm.enabled !== false}
                    onChange={(e) => setFbModalForm(prev => ({ ...prev, enabled: e.target.checked }))}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Kích hoạt tài khoản này (Bật hoạt động)</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFbModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isFbModalEditing ? 'Lưu thay đổi' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL THÊM TÀI KHOẢN CHATGPT ==================== */}
      {isAddChatGptOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="liquid-glass-modal rounded-3xl w-full max-w-md p-7 space-y-4 shadow-2xl">
            <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-violet-600" /> Thêm tài khoản ChatGPT
            </h3>
            <form onSubmit={handleCreateChatGpt} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên tài khoản:</label>
                <input
                  type="text"
                  value={newChatGptForm.name}
                  onChange={(e) => setNewChatGptForm({ ...newChatGptForm, name: e.target.value })}
                  placeholder="VD: ChatGPT Tài khoản 3..."
                  required
                  className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 font-semibold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Profile Chrome Folder:</label>
                  <input
                    type="text"
                    value={newChatGptForm.profileDir}
                    onChange={(e) => setNewChatGptForm({ ...newChatGptForm, profileDir: e.target.value })}
                    required
                    className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cổng Remote Port:</label>
                  <input
                    type="number"
                    value={newChatGptForm.port || ''}
                    onChange={(e) => setNewChatGptForm({ ...newChatGptForm, port: e.target.value })}
                    placeholder="VD: 9243"
                    required
                    className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú:</label>
                <input
                  type="text"
                  value={newChatGptForm.desc || ''}
                  onChange={(e) => setNewChatGptForm({ ...newChatGptForm, desc: e.target.value })}
                  placeholder="VD: Tài khoản Plus, Gói free..."
                  className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900"
                />
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
                  Tạo tài khoản
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
              <Edit3 className="w-5 h-5 text-violet-600" /> Sửa tài khoản: {editingChatGpt.name}
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cổng Remote Port:</label>
                  <input
                    type="number"
                    value={editingChatGpt.port}
                    onChange={(e) => setEditingChatGpt({ ...editingChatGpt, port: Number(e.target.value) })}
                    required
                    className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono text-xs"
                  />
                </div>
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
    </>
  );
}
