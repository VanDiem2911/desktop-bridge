'use client';

import React, { useState } from 'react';
import {
  KeyRound,
  ShieldCheck,
  Bot,
  Users,
  Eye,
  EyeOff,
  Copy,
  Check,
  ExternalLink,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Download,
  Trash2,
  Edit3,
  Globe,
  AlertTriangle,
  Lock,
  Unlock,
  Layers,
  Sparkles,
  Info,
  X,
} from 'lucide-react';
import { ChatGptCredential, FacebookCredential, CredentialsData } from '@/types/dashboard';

interface CredentialsTabProps {
  credentialsData: CredentialsData | null;
  credentialsLoading: boolean;
  fetchCredentials: () => Promise<void>;
  handleOpenChrome: (profileDir: string, port: number, url?: string) => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function CredentialsTab({
  credentialsData,
  credentialsLoading,
  fetchCredentials,
  handleOpenChrome,
  showToast,
}: CredentialsTabProps) {
  const [subTab, setSubTab] = useState<'all' | 'chatgpt' | 'facebook'>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'checkpoint' | 'expired' | 'backup'>('all');

  // Quản lý hiển thị mật khẩu
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modal thêm / chỉnh sửa
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [targetService, setTargetService] = useState<'chatgpt' | 'facebook'>('chatgpt');

  // State form
  const [formData, setFormData] = useState<{
    id?: string;
    name: string;
    emailOrAccount: string;
    password: string;
    planOrType: string;
    status: string;
    twoFactorSecret?: string;
    profileUrl?: string;
    port?: number | string;
    profileDir?: string;
    notes?: string;
  }>({
    name: '',
    emailOrAccount: '',
    password: '',
    planOrType: 'Plus',
    status: 'active',
    twoFactorSecret: '',
    profileUrl: '',
    port: '',
    profileDir: '',
    notes: '',
  });

  // Tự động đóng modal khi nhấn phím Escape
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, key: string, label: string) => {
    if (!text) {
      showToast(`Chưa có thông tin ${label} để sao chép!`, 'info');
      return;
    }
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast(`Đã sao chép ${label}!`, 'success');
    setTimeout(() => {
      setCopiedKey((curr) => (curr === key ? null : curr));
    }, 2000);
  };

  const openAddModal = (service: 'chatgpt' | 'facebook') => {
    setModalMode('add');
    setTargetService(service);
    setFormData({
      name: '',
      emailOrAccount: '',
      password: '',
      planOrType: service === 'chatgpt' ? 'Plus' : 'personal',
      status: 'active',
      twoFactorSecret: '',
      profileUrl: '',
      port: service === 'chatgpt' ? 9222 : 9230,
      profileDir: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (service: 'chatgpt' | 'facebook', item: ChatGptCredential | FacebookCredential) => {
    setModalMode('edit');
    setTargetService(service);
    if (service === 'chatgpt') {
      const gpt = item as ChatGptCredential;
      setFormData({
        id: gpt.id,
        name: gpt.name,
        emailOrAccount: gpt.email || '',
        password: gpt.password || '',
        planOrType: gpt.plan || 'Plus',
        status: gpt.status || 'active',
        port: gpt.port || '',
        profileDir: gpt.profileDir || '',
        notes: gpt.notes || '',
      });
    } else {
      const fb = item as FacebookCredential;
      setFormData({
        id: fb.id,
        name: fb.name,
        emailOrAccount: fb.account || '',
        password: fb.password || '',
        planOrType: fb.type || 'personal',
        status: fb.status || 'active',
        twoFactorSecret: fb.twoFactorSecret || '',
        profileUrl: fb.profileUrl || '',
        port: fb.port || '',
        profileDir: fb.profileDir || '',
        notes: fb.notes || '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('Vui lòng nhập tên gợi nhớ cho tài khoản!', 'error');
      return;
    }

    try {
      const itemPayload: any = {
        name: formData.name.trim(),
        password: formData.password.trim(),
        status: formData.status,
        port: formData.port ? Number(formData.port) : undefined,
        profileDir: formData.profileDir?.trim() || undefined,
        notes: formData.notes?.trim() || undefined,
      };

      if (targetService === 'chatgpt') {
        itemPayload.email = formData.emailOrAccount.trim();
        itemPayload.plan = formData.planOrType;
      } else {
        itemPayload.account = formData.emailOrAccount.trim();
        itemPayload.type = formData.planOrType;
        itemPayload.twoFactorSecret = formData.twoFactorSecret?.trim() || undefined;
        itemPayload.profileUrl = formData.profileUrl?.trim() || undefined;
      }

      if (modalMode === 'edit' && formData.id) {
        itemPayload.id = formData.id;
        const res = await fetch('/api/credentials', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ service: targetService, item: itemPayload }),
        });
        const result = await res.json();
        if (result.ok) {
          showToast(result.message || 'Đã cập nhật tài khoản!', 'success');
          setIsModalOpen(false);
          fetchCredentials();
        } else {
          showToast(result.error || 'Lỗi cập nhật tài khoản', 'error');
        }
      } else {
        const res = await fetch('/api/credentials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ service: targetService, item: itemPayload }),
        });
        const result = await res.json();
        if (result.ok) {
          showToast(result.message || 'Đã thêm tài khoản mới!', 'success');
          setIsModalOpen(false);
          fetchCredentials();
        } else {
          showToast(result.error || 'Lỗi thêm tài khoản', 'error');
        }
      }
    } catch {
      showToast('Lỗi kết nối máy chủ!', 'error');
    }
  };

  const handleDelete = async (service: 'chatgpt' | 'facebook', id: string, name: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa thông tin tài khoản "${name}"?`)) return;
    try {
      const res = await fetch('/api/credentials', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service, id }),
      });
      const result = await res.json();
      if (result.ok) {
        showToast(result.message || 'Đã xóa tài khoản', 'success');
        fetchCredentials();
      } else {
        showToast(result.error || 'Lỗi xóa tài khoản', 'error');
      }
    } catch {
      showToast('Lỗi xóa tài khoản', 'error');
    }
  };

  const handleExportJson = () => {
    if (!credentialsData) return;
    const blob = new Blob([JSON.stringify(credentialsData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dudi_credentials_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Đã xuất file lưu trữ mật khẩu an toàn!', 'success');
  };

  const gptList = credentialsData?.chatgpt || [];
  const fbList = credentialsData?.facebook || [];

  // Lọc danh sách theo từ khóa & trạng thái
  const filteredGpt = gptList.filter((item) => {
    const matchSearch =
      !searchKeyword ||
      item.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      (item.email || '').toLowerCase().includes(searchKeyword.toLowerCase()) ||
      (item.notes || '').toLowerCase().includes(searchKeyword.toLowerCase());
    const matchStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredFb = fbList.filter((item) => {
    const matchSearch =
      !searchKeyword ||
      item.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      (item.account || '').toLowerCase().includes(searchKeyword.toLowerCase()) ||
      (item.notes || '').toLowerCase().includes(searchKeyword.toLowerCase());
    const matchStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalAccounts = gptList.length + fbList.length;
  const activeCount =
    gptList.filter((g) => g.status === 'active').length +
    fbList.filter((f) => f.status === 'active').length;

  return (
    <div className="space-y-8">
      {/* Header card */}
      <div className="liquid-glass rounded-3xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <div>
            <h2 className="font-extrabold text-xl text-slate-900 tracking-tight flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-violet-50 text-violet-600 border border-violet-100">
                <KeyRound className="w-5 h-5" />
              </span>
              Quản Lý Tài Khoản & Mật Khẩu (ChatGPT & Facebook)
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Két lưu trữ bảo mật mật khẩu, tài khoản đăng nhập, mã 2FA, gói dịch vụ và liên kết trực tiếp với Profile Chrome.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => fetchCredentials()}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${credentialsLoading ? 'animate-spin' : ''}`} /> Làm mới
            </button>
            <button
              onClick={handleExportJson}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl shadow-xs transition-all cursor-pointer"
              title="Xuất bản sao lưu offline"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" /> Xuất Backup
            </button>
            <button
              onClick={() => openAddModal('chatgpt')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm TK ChatGPT
            </button>
            <button
              onClick={() => openAddModal('facebook')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm TK Facebook
            </button>
          </div>
        </div>

        {/* 3 KPI Stats Mini Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div className="bg-white/80 p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase">Tổng Tài Khoản Đã Lưu</span>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{totalAccounts}</div>
              <p className="text-[10px] text-slate-400 mt-0.5">{activeCount} tài khoản đang hoạt động tốt</p>
            </div>
            <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
              <KeyRound className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white/80 p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-emerald-600 uppercase">ChatGPT Image AI</span>
              <div className="text-2xl font-black text-emerald-700 mt-0.5">{gptList.length}</div>
              <p className="text-[10px] text-emerald-600/80 mt-0.5">Sinh ảnh poster n8n luân phiên</p>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <Bot className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white/80 p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-indigo-600 uppercase">Facebook (Cá nhân, Via, Nhóm)</span>
              <div className="text-2xl font-black text-indigo-700 mt-0.5">{fbList.length}</div>
              <p className="text-[10px] text-indigo-600/80 mt-0.5">Đăng bài tự động Fanpage & Group</p>
            </div>
            <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filter & View Switcher */}
        <div className="pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
          {/* Sub tabs */}
          <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl">
            <button
              onClick={() => setSubTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                subTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả ({totalAccounts})
            </button>
            <button
              onClick={() => setSubTab('chatgpt')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                subTab === 'chatgpt'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              <Bot className="w-3.5 h-3.5" /> ChatGPT ({gptList.length})
            </button>
            <button
              onClick={() => setSubTab('facebook')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                subTab === 'facebook'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Facebook ({fbList.length})
            </button>
          </div>

          {/* Search and Status filter */}
          <div className="flex items-center gap-2 flex-wrap grow sm:grow-0">
            <div className="relative min-w-[200px] grow sm:grow-0">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Tìm tài khoản, email, UID..."
                className="liquid-input w-full rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="liquid-input rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800"
            >
              <option value="all">Mọi trạng thái</option>
              <option value="active">🟢 Đang hoạt động</option>
              <option value="checkpoint">🟡 Checkpoint / Cần xác minh</option>
              <option value="expired">🔴 Hết hạn / Lỗi</option>
              <option value="backup">⚪ Dự phòng</option>
            </select>
          </div>
        </div>
      </div>

      {/* SECTION 1: TÀI KHOẢN CHATGPT */}
      {(subTab === 'all' || subTab === 'chatgpt') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                <Bot className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">
                Tài Khoản ChatGPT ({filteredGpt.length})
              </h3>
            </div>
            <button
              onClick={() => openAddModal('chatgpt')}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm tài khoản ChatGPT
            </button>
          </div>

          {filteredGpt.length === 0 ? (
            <div className="p-8 text-center bg-white/60 rounded-3xl border border-dashed border-slate-300">
              <Bot className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-semibold text-slate-600">Chưa có tài khoản ChatGPT nào phù hợp với bộ lọc.</p>
              <button
                onClick={() => openAddModal('chatgpt')}
                className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm tài khoản đầu tiên
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGpt.map((acc) => {
                const isPassVisible = Boolean(visiblePasswords[acc.id]);
                const isCopiedPass = copiedKey === `pass_${acc.id}`;
                const isCopiedUser = copiedKey === `user_${acc.id}`;

                return (
                  <div
                    key={acc.id}
                    className="liquid-glass rounded-2xl p-5 border border-slate-200 hover:border-emerald-300 transition-all shadow-2xs hover:shadow-md flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                            {acc.name}
                          </h4>
                          <span className="inline-block mt-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Gói: {acc.plan || 'Plus'}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            acc.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : acc.status === 'rate_limit'
                              ? 'bg-amber-100 text-amber-800'
                              : acc.status === 'expired'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {acc.status === 'active'
                            ? 'Hoạt động'
                            : acc.status === 'rate_limit'
                            ? 'Giới hạn'
                            : acc.status === 'expired'
                            ? 'Hết hạn'
                            : 'Dự phòng'}
                        </span>
                      </div>

                      {/* Fields */}
                      <div className="space-y-2 text-xs bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                        {/* Email / Username */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-medium text-slate-500 shrink-0">Email/TK:</span>
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            <span className="font-mono font-semibold text-slate-800 truncate" title={acc.email || 'Chưa điền'}>
                              {acc.email || <i className="text-slate-400 font-normal">Chưa cập nhật</i>}
                            </span>
                            {acc.email && (
                              <button
                                onClick={() => copyToClipboard(acc.email, `user_${acc.id}`, 'Email')}
                                className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition-all shrink-0 cursor-pointer"
                                title="Sao chép Email"
                              >
                                {isCopiedUser ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Password */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-medium text-slate-500 shrink-0">Mật khẩu:</span>
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            <span className="font-mono font-semibold text-slate-800">
                              {acc.password ? (
                                isPassVisible ? (
                                  acc.password
                                ) : (
                                  '••••••••••••'
                                )
                              ) : (
                                <i className="text-slate-400 font-normal">Chưa cập nhật</i>
                              )}
                            </span>
                            {acc.password && (
                              <>
                                <button
                                  onClick={() => togglePasswordVisibility(acc.id)}
                                  className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition-all shrink-0 cursor-pointer"
                                  title={isPassVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                >
                                  {isPassVisible ? <EyeOff className="w-3 h-3 text-slate-600" /> : <Eye className="w-3 h-3" />}
                                </button>
                                <button
                                  onClick={() => copyToClipboard(acc.password || '', `pass_${acc.id}`, 'Mật khẩu')}
                                  className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition-all shrink-0 cursor-pointer"
                                  title="Sao chép mật khẩu"
                                >
                                  {isCopiedPass ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Chrome Link */}
                        {(acc.port || acc.profileDir) && (
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
                            <span className="text-slate-500">Chrome:</span>
                            <span className="font-mono text-slate-700">Port {acc.port || 'Tự do'}</span>
                          </div>
                        )}

                        {/* Notes */}
                        {acc.notes && (
                          <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-200/60 line-clamp-2">
                            "{acc.notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-3 mt-3 border-t border-slate-200/80 flex items-center justify-between gap-2">
                      <div>
                        {acc.profileDir && acc.port ? (
                          <button
                            onClick={() => handleOpenChrome(acc.profileDir!, Number(acc.port), 'https://chatgpt.com/')}
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-all cursor-pointer"
                            title="Mở trình duyệt Chrome với profile này để đăng nhập trực tiếp"
                          >
                            <Globe className="w-3 h-3 text-emerald-600" /> Mở Profile
                          </button>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal('chatgpt', acc)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                          title="Chỉnh sửa thông tin"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete('chatgpt', acc.id, acc.name)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                          title="Xóa tài khoản"
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
      )}

      {/* SECTION 2: TÀI KHOẢN FACEBOOK */}
      {(subTab === 'all' || subTab === 'facebook') && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-slate-900 text-base">
                Tài Khoản Facebook ({filteredFb.length})
              </h3>
            </div>
            <button
              onClick={() => openAddModal('facebook')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm tài khoản Facebook
            </button>
          </div>

          {filteredFb.length === 0 ? (
            <div className="p-8 text-center bg-white/60 rounded-3xl border border-dashed border-slate-300">
              <Users className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-semibold text-slate-600">Chưa có tài khoản Facebook nào phù hợp với bộ lọc.</p>
              <button
                onClick={() => openAddModal('facebook')}
                className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded-xl"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm tài khoản đầu tiên
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFb.map((acc) => {
                const isPassVisible = Boolean(visiblePasswords[acc.id]);
                const isCopiedPass = copiedKey === `pass_${acc.id}`;
                const isCopiedUser = copiedKey === `user_${acc.id}`;
                const isCopied2fa = copiedKey === `2fa_${acc.id}`;

                return (
                  <div
                    key={acc.id}
                    className="liquid-glass rounded-2xl p-5 border border-slate-200 hover:border-blue-300 transition-all shadow-2xs hover:shadow-md flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                            {acc.name}
                          </h4>
                          <span className="inline-block mt-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            Loại:{' '}
                            {acc.type === 'personal'
                              ? 'Cá nhân'
                              : acc.type === 'fanpage'
                              ? 'Fanpage'
                              : acc.type === 'via'
                              ? 'Via'
                              : acc.type === 'clone'
                              ? 'Clone'
                              : 'Doanh nghiệp'}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            acc.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : acc.status === 'checkpoint'
                              ? 'bg-amber-100 text-amber-800'
                              : acc.status === 'locked' || acc.status === 'restricted'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {acc.status === 'active'
                            ? 'Hoạt động'
                            : acc.status === 'checkpoint'
                            ? 'Checkpoint'
                            : acc.status === 'locked'
                            ? 'Bị khóa'
                            : acc.status === 'restricted'
                            ? 'Hạn chế'
                            : 'Dự phòng'}
                        </span>
                      </div>

                      {/* Fields */}
                      <div className="space-y-2 text-xs bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                        {/* Account (Email/Phone/UID) */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-medium text-slate-500 shrink-0">Tài khoản/UID:</span>
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            <span className="font-mono font-semibold text-slate-800 truncate" title={acc.account || 'Chưa điền'}>
                              {acc.account || <i className="text-slate-400 font-normal">Chưa cập nhật</i>}
                            </span>
                            {acc.account && (
                              <button
                                onClick={() => copyToClipboard(acc.account, `user_${acc.id}`, 'Tài khoản')}
                                className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition-all shrink-0 cursor-pointer"
                                title="Sao chép tài khoản / UID"
                              >
                                {isCopiedUser ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Password */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-medium text-slate-500 shrink-0">Mật khẩu:</span>
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            <span className="font-mono font-semibold text-slate-800">
                              {acc.password ? (
                                isPassVisible ? (
                                  acc.password
                                ) : (
                                  '••••••••••••'
                                )
                              ) : (
                                <i className="text-slate-400 font-normal">Chưa cập nhật</i>
                              )}
                            </span>
                            {acc.password && (
                              <>
                                <button
                                  onClick={() => togglePasswordVisibility(acc.id)}
                                  className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition-all shrink-0 cursor-pointer"
                                  title={isPassVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                >
                                  {isPassVisible ? <EyeOff className="w-3 h-3 text-slate-600" /> : <Eye className="w-3 h-3" />}
                                </button>
                                <button
                                  onClick={() => copyToClipboard(acc.password || '', `pass_${acc.id}`, 'Mật khẩu')}
                                  className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition-all shrink-0 cursor-pointer"
                                  title="Sao chép mật khẩu"
                                >
                                  {isCopiedPass ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* 2FA Key */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-medium text-slate-500 shrink-0">Khóa 2FA:</span>
                          <div className="flex items-center gap-1.5 overflow-hidden">
                            <span className="font-mono font-semibold text-slate-800 truncate" title={acc.twoFactorSecret || 'Không có'}>
                              {acc.twoFactorSecret ? (
                                acc.twoFactorSecret.length > 12 ? `${acc.twoFactorSecret.substring(0, 10)}...` : acc.twoFactorSecret
                              ) : (
                                <i className="text-slate-400 font-normal">Chưa có</i>
                              )}
                            </span>
                            {acc.twoFactorSecret && (
                              <button
                                onClick={() => copyToClipboard(acc.twoFactorSecret || '', `2fa_${acc.id}`, 'Mã 2FA')}
                                className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition-all shrink-0 cursor-pointer"
                                title="Sao chép khóa bảo mật 2FA"
                              >
                                {isCopied2fa ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Profile Link */}
                        {acc.profileUrl && (
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60 text-[11px]">
                            <span className="text-slate-500">Link Profile:</span>
                            <a
                              href={acc.profileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1 truncate max-w-[150px]"
                            >
                              Mở trang FB <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                            </a>
                          </div>
                        )}

                        {/* Chrome Link */}
                        {(acc.port || acc.profileDir) && (
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="text-slate-500">Chrome:</span>
                            <span className="font-mono text-slate-700">Port {acc.port || 'Tự do'}</span>
                          </div>
                        )}

                        {/* Notes */}
                        {acc.notes && (
                          <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-200/60 line-clamp-2">
                            "{acc.notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-3 mt-3 border-t border-slate-200/80 flex items-center justify-between gap-2">
                      <div>
                        {acc.profileDir && acc.port ? (
                          <button
                            onClick={() => handleOpenChrome(acc.profileDir!, Number(acc.port), acc.profileUrl || 'https://www.facebook.com/')}
                            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-all cursor-pointer"
                            title="Mở trình duyệt Chrome với profile này để đăng nhập trực tiếp"
                          >
                            <Globe className="w-3 h-3 text-blue-600" /> Mở Profile
                          </button>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal('facebook', acc)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                          title="Chỉnh sửa thông tin"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete('facebook', acc.id, acc.name)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                          title="Xóa tài khoản"
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
      )}

      {/* MODAL THÊM / CHỈNH SỬA TÀI KHOẢN & MẬT KHẨU */}
      {isModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto cursor-default"
          >
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
              <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-violet-50 text-violet-600">
                  <KeyRound className="w-5 h-5" />
                </span>
                {modalMode === 'add' ? 'Thêm Tài Khoản Mới' : 'Cập Nhật Mật Khẩu & Tài Khoản'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Service selector in Add mode */}
            {modalMode === 'add' && (
              <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setTargetService('chatgpt');
                    setFormData((prev) => ({ ...prev, planOrType: 'Plus' }));
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    targetService === 'chatgpt'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Bot className="w-4 h-4" /> Tài khoản ChatGPT
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTargetService('facebook');
                    setFormData((prev) => ({ ...prev, planOrType: 'personal' }));
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    targetService === 'facebook'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-4 h-4" /> Tài khoản Facebook
                </button>
              </div>
            )}

            <form onSubmit={handleSaveCredential} className="space-y-3.5">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên gợi nhớ / Tên hiển thị <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={targetService === 'chatgpt' ? 'Ví dụ: ChatGPT Team 1 (Chính)' : 'Ví dụ: Nick FB Cá nhân Trương Nam'}
                  className="liquid-input w-full rounded-xl px-3.5 py-2 text-xs text-slate-900"
                />
              </div>

              {/* Email or Account */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {targetService === 'chatgpt' ? 'Email Đăng Nhập' : 'Tên Đăng Nhập / Email / SĐT / UID FB'}
                </label>
                <input
                  type="text"
                  value={formData.emailOrAccount}
                  onChange={(e) => setFormData({ ...formData, emailOrAccount: e.target.value })}
                  placeholder={targetService === 'chatgpt' ? 'name@gmail.com' : '0987654321 hoặc 100087184532124'}
                  className="liquid-input w-full rounded-xl px-3.5 py-2 text-xs text-slate-900"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mật khẩu (Password)</label>
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Nhập mật khẩu tài khoản..."
                  className="liquid-input w-full rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900"
                />
              </div>

              {/* 2FA Key (Facebook only) */}
              {targetService === 'facebook' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Khóa Bảo Mật 2FA (Secret Key / Mã dự phòng)
                  </label>
                  <input
                    type="text"
                    value={formData.twoFactorSecret}
                    onChange={(e) => setFormData({ ...formData, twoFactorSecret: e.target.value })}
                    placeholder="Ví dụ: JBSWY3DPEHPK3PXP..."
                    className="liquid-input w-full rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Dùng để sao chép nhanh khi Facebook yêu cầu mã 6 chữ số (Google Authenticator / 2fa.live).
                  </p>
                </div>
              )}

              {/* Plan or Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {targetService === 'chatgpt' ? 'Gói Dịch Vụ' : 'Phân Loại Tài Khoản'}
                  </label>
                  {targetService === 'chatgpt' ? (
                    <select
                      value={formData.planOrType}
                      onChange={(e) => setFormData({ ...formData, planOrType: e.target.value })}
                      className="liquid-input w-full rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                    >
                      <option value="Plus">ChatGPT Plus ($20/tháng)</option>
                      <option value="Team">ChatGPT Team ($25/user)</option>
                      <option value="Free">ChatGPT Miễn Phí (Free)</option>
                      <option value="Enterprise">Enterprise / Pro</option>
                    </select>
                  ) : (
                    <select
                      value={formData.planOrType}
                      onChange={(e) => setFormData({ ...formData, planOrType: e.target.value })}
                      className="liquid-input w-full rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                    >
                      <option value="personal">Nick Cá Nhân Chính</option>
                      <option value="via">Via Nuôi Nhóm</option>
                      <option value="clone">Nick Clone Phụ</option>
                      <option value="fanpage">Quản Trị Fanpage</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Trạng Thái</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="liquid-input w-full rounded-xl px-3 py-2 text-xs font-semibold text-slate-800"
                  >
                    <option value="active">🟢 Đang hoạt động</option>
                    <option value="checkpoint">🟡 Checkpoint / Cần xác minh</option>
                    <option value="rate_limit">🟠 Bị giới hạn / Limit</option>
                    <option value="expired">🔴 Hết hạn / Khóa</option>
                    <option value="backup">⚪ Dự phòng</option>
                  </select>
                </div>
              </div>

              {/* Chrome Profile Port & ProfileDir */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cổng Chrome Port (Tùy chọn)</label>
                  <input
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                    placeholder={targetService === 'chatgpt' ? '9222 hoặc 9242' : '9230, 9225...'}
                    className="liquid-input w-full rounded-xl px-3.5 py-2 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Profile Chrome Dir</label>
                  <input
                    type="text"
                    value={formData.profileDir}
                    onChange={(e) => setFormData({ ...formData, profileDir: e.target.value })}
                    placeholder="n8n-chatgpt-profile..."
                    className="liquid-input w-full rounded-xl px-3.5 py-2 text-xs text-slate-900"
                  />
                </div>
              </div>

              {/* Profile URL (Facebook only) */}
              {targetService === 'facebook' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Link Trang Cá Nhân FB (URL)</label>
                  <input
                    type="url"
                    value={formData.profileUrl}
                    onChange={(e) => setFormData({ ...formData, profileUrl: e.target.value })}
                    placeholder="https://www.facebook.com/profile.php?id=..."
                    className="liquid-input w-full rounded-xl px-3.5 py-2 text-xs text-slate-900"
                  />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ghi Chú Thêm</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ghi chú về ngày mua, hạn dùng, người phụ trách..."
                  className="liquid-input w-full rounded-xl px-3.5 py-2 text-xs text-slate-900"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200/80 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  {modalMode === 'add' ? 'Lưu Tài Khoản' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
