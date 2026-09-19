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
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="liquid-glass-modal rounded-3xl w-full max-w-xl p-7 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200/80 pb-4">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs font-black shadow-xs">
                    FB
                  </span>
                  {isFbModalEditing ? `Chỉnh sửa tài khoản: ${fbModalForm.name}` : 'Thêm tài khoản Facebook mới'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Mỗi tài khoản hoạt động độc lập trên Port và Profile Chrome riêng biệt. Chọn quyền đăng Fanpage hoặc Nhóm.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveFbAccount} className="space-y-4">
              {/* Link Facebook */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Link Facebook / Fanpage / Profile:</label>
                  {isDetectingName && (
                    <span className="text-[11px] font-extrabold text-blue-600 flex items-center gap-1.5 animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Đang lấy tên Facebook...
                    </span>
                  )}
                </div>
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
                  className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono text-xs"
                />
              </div>

              {/* Tên tài khoản */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên tài khoản hiển thị:</label>
                <div className="relative">
                  <input
                    type="text"
                    value={fbModalForm.name}
                    onChange={(e) => setFbModalForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="VD: Pham Hien, Võ Bảo Vy,..."
                    required
                    className="liquid-input w-full rounded-xl px-4 py-2.5 pr-24 text-sm text-slate-900 font-semibold"
                  />
                  {fbModalForm.url && (
                    <button
                      type="button"
                      disabled={isDetectingName}
                      onClick={() => handleAutoDetectFbName(fbModalForm.url, 'unifiedFb')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 cursor-pointer transition-colors"
                      title="Bấm để lấy lại tên từ Facebook"
                    >
                      ⚡ Lấy tên
                    </button>
                  )}
                </div>
              </div>

              {/* Port & Profile Chrome riêng biệt */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Cấu hình Chrome độc lập (Mỗi nick 1 Port riêng biệt)</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Cổng Remote Port:</label>
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
                      className="liquid-input w-full rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Thư mục Profile Chrome:</label>
                    <input
                      type="text"
                      value={fbModalForm.profileDir}
                      onChange={(e) => setFbModalForm(prev => ({ ...prev, profileDir: e.target.value }))}
                      required
                      className="liquid-input w-full rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 bg-white"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  💡 Mỗi tài khoản được cấp Port và thư mục dữ liệu Chrome riêng để không dính phiên và chống checkpoint chéo.
                </p>
              </div>

              {/* CHỌN MỤC ĐÍCH SỬ DỤNG: ĐĂNG FANPAGE / ĐĂNG NHÓM */}
              <div className="space-y-3 pt-1">
                <label className="block text-xs font-extrabold text-slate-800">
                  Chọn mục đích sử dụng (Tùy chọn quyền đăng bài):
                </label>

                {/* 1. Tùy chọn Đăng Fanpage */}
                <div className={`p-3.5 rounded-2xl border transition-all ${fbModalForm.canPostFanpage ? 'bg-blue-50/70 border-blue-200' : 'bg-slate-50/60 border-slate-200 opacity-80'}`}>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={fbModalForm.canPostFanpage}
                      onChange={(e) => setFbModalForm(prev => ({ ...prev, canPostFanpage: e.target.checked }))}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-extrabold text-blue-950 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-blue-600" />
                      Dùng để đăng lên Fanpage
                    </span>
                  </label>
                  {fbModalForm.canPostFanpage && (
                    <div className="mt-2.5 pl-6 space-y-1">
                      <label className="block text-[11px] font-bold text-slate-600">Link Fanpage (Để trống nếu dùng link ở trên):</label>
                      <input
                        type="text"
                        value={fbModalForm.fanpageUrl || ''}
                        onChange={(e) => setFbModalForm(prev => ({ ...prev, fanpageUrl: e.target.value }))}
                        placeholder={fbModalForm.url || 'https://www.facebook.com/...'}
                        className="liquid-input w-full rounded-xl px-3 py-1.5 text-xs font-mono bg-white"
                      />
                    </div>
                  )}
                </div>

                {/* 2. Tùy chọn Đăng Nhóm */}
                <div className={`p-3.5 rounded-2xl border transition-all ${fbModalForm.canPostGroup ? 'bg-indigo-50/70 border-indigo-200' : 'bg-slate-50/60 border-slate-200 opacity-80'}`}>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={fbModalForm.canPostGroup}
                        onChange={(e) => setFbModalForm(prev => ({ ...prev, canPostGroup: e.target.checked }))}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-indigo-600" />
                        Dùng để đăng vào các Nhóm Facebook
                      </span>
                    </label>

                    {fbModalForm.canPostGroup && (
                      <select
                        value={fbModalForm.roleGroup || 'group_1'}
                        onChange={(e) => setFbModalForm(prev => ({ ...prev, roleGroup: e.target.value }))}
                        className="text-[11px] font-bold bg-white border border-indigo-200 rounded-lg px-2 py-1 text-indigo-900"
                      >
                        <option value="group_1">🟢 Nhóm 1 (Đội chính)</option>
                        <option value="group_2">🟡 Nhóm 2 (Đội dự phòng)</option>
                      </select>
                    )}
                  </div>

                  {fbModalForm.canPostGroup && (
                    <div className="mt-2.5 pl-6 space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-600">
                        Danh sách link nhóm Facebook của nick này (Mỗi dòng 1 link):
                      </label>
                      <textarea
                        value={fbModalForm.groupUrlsText || ''}
                        onChange={(e) => setFbModalForm(prev => ({ ...prev, groupUrlsText: e.target.value }))}
                        rows={3}
                        placeholder="https://www.facebook.com/groups/nhom1/&#10;https://www.facebook.com/groups/nhom2/"
                        className="liquid-input w-full rounded-xl px-3 py-2 text-xs font-mono bg-white"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Bật / Tắt nếu đang chỉnh sửa */}
              {isFbModalEditing && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="unifiedFbEnabled"
                    checked={fbModalForm.enabled !== false}
                    onChange={(e) => setFbModalForm(prev => ({ ...prev, enabled: e.target.checked }))}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <label htmlFor="unifiedFbEnabled" className="text-xs font-bold text-slate-700 cursor-pointer">
                    Kích hoạt tài khoản này (Đang Bật)
                  </label>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setIsFbModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isFbModalEditing ? 'Lưu thay đổi' : 'Lưu tài khoản Facebook'}
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
