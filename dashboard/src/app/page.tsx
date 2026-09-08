'use client';

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Share2,
  Send,
  RefreshCw,
  Power,
  ExternalLink,
  Plus,
  Trash2,
  Edit3,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
  Copy,
  Check,
  Bot,
  Globe,
  Radio,
  ArrowUpRight,
  ShieldCheck,
  UserPlus,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Filter,
  Calendar,
  Download,
  Eye,
  HelpCircle,
  Activity,
  FileText,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Database,
  Shuffle,
  XCircle,
  RotateCcw,
} from 'lucide-react';

interface HistoryEntry {
  id: string;
  timestamp: string;
  type: 'post' | 'image_generate';
  channel: 'fanpage' | 'groups' | 'personal' | 'chatgpt';
  channelName: string;
  targetName?: string | null;
  targetUrl?: string | null;
  status: 'success' | 'failed';
  title?: string;
  caption?: string;
  prompt?: string;
  chatgptAccount?: string | null;
  aspectRatio?: string;
  hasMascotDu?: boolean;
  durationMs?: number;
  error?: string | null;
  errorDetails?: string | null;
  details?: Record<string, unknown>;
}

interface AnalyticsStats {
  total: number;
  successCount: number;
  failedCount: number;
  successRate: number;
  byChannel: {
    fanpage: { total: number; success: number; failed: number };
    groups: { total: number; success: number; failed: number };
    personal: { total: number; success: number; failed: number };
    chatgpt: { total: number; success: number; failed: number };
  };
  byGpt: {
    acc1: { name: string; count: number; errorCount: number };
    acc2: { name: string; count: number; errorCount: number };
    other: { name: string; count: number; errorCount: number };
  };
  topErrors: Array<{ reason: string; count: number; suggestion: string }>;
  avgDurationSec: number;
  lastRunAt: string | null;
}

interface ServerStatus {
  ok: boolean;
  servers: {
    fanpageGpt: { port: number; name: string; active: boolean };
    fbGroups: { port: number; name: string; active: boolean };
    fbPersonal: { port: number; name: string; active: boolean };
  };
  chromeGpt: {
    acc1: { port: number; active: boolean };
    acc2: { port: number; active: boolean };
  };
}

interface AccountItem {
  id: string;
  rawId?: string;
  name: string;
  port: number;
  profileDir: string;
  url?: string;
  pageUrl?: string;
  profileUrl?: string;
  desc?: string;
  isReady?: boolean;
  loginStatus?: 'logged_in' | 'not_logged_in' | 'no_tab' | 'offline';
  currentUrl?: string;
  profileExists?: boolean;
  isConfigured?: boolean;
  groupCount?: number;
  enabled?: boolean;
}

interface AccountCategory {
  category: string;
  categoryName: string;
  description: string;
  items: AccountItem[];
}

interface GroupAccount {
  id: string;
  name: string;
  enabled?: boolean;
  profileDir?: string;
  groupUrls?: string[];
}

interface CentralPoolItem {
  id: string;
  url: string;
  name?: string;
  addedAt: string;
  assignedAccountId?: string | null;
  assignedAccountName?: string | null;
  joinedStatus?: 'joined' | 'pending' | 'not_joined' | 'unknown';
  joinedUpdatedAt?: string;
  lastPostStatus?: 'success' | 'failed' | 'not_posted';
  lastPostError?: string | null;
  lastPostedAt?: string | null;
}

function parseErrorMessage(rawError?: string | null): {
  summary: string;
  suggestion?: string;
  technicalDetails?: string;
  raw: string;
} {
  if (!rawError) return { summary: 'Không có thông tin lỗi', raw: '' };

  // Loại bỏ mã màu ANSI và escape sequences (ví dụ: [2m, [22m, \u001b[...m)
  const clean = String(rawError)
    .replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '')
    .replace(/\[\d+m/g, '')
    .trim();

  let mainError = clean;
  let technicalDetails = '';

  // Tách Call log hoặc stack trace nếu có
  if (clean.includes('Call log:')) {
    const parts = clean.split('Call log:');
    mainError = parts[0].trim();
    technicalDetails = 'Call log:\n' + parts.slice(1).join('Call log:').trim();
  } else if (clean.includes('=========================== logs ===========================')) {
    const parts = clean.split('=========================== logs ===========================');
    mainError = parts[0].trim();
    technicalDetails = parts.slice(1).join('').trim();
  } else if (clean.includes('\n')) {
    const lines = clean.split('\n').map((l) => l.trim()).filter(Boolean);
    mainError = lines[0] || clean;
    if (lines.length > 1) {
      technicalDetails = lines.slice(1).join('\n');
    }
  }

  let summary = mainError;
  let suggestion = '';

  if (/timeout.*exceeded/i.test(mainError)) {
    summary = 'Hết thời gian chờ (Timeout 30s): Facebook phản hồi chậm hoặc không tìm thấy nút bấm tương tác.';
    suggestion = 'Vui lòng kiểm tra lại đường truyền mạng hoặc bấm nút "Mở Chrome Profile" của tài khoản để kiểm tra giao diện Facebook.';
  } else if (/Target page, context or browser has been closed/i.test(mainError)) {
    summary = 'Cửa sổ Chrome bị đóng đột ngột trong khi đang thực hiện tác vụ.';
    suggestion = 'Đảm bảo không tắt thủ công cửa sổ Chrome tự động và không có tiến trình nào can thiệp kill Chrome.';
  } else if (/chưa tham gia nhóm|phê duyệt/i.test(mainError)) {
    summary = 'Tài khoản chưa tham gia nhóm này hoặc nhóm đang yêu cầu Quản trị viên duyệt thành viên.';
    suggestion = 'Bấm "Mở Chrome Profile" của tài khoản, truy cập nhóm và ấn Tham gia / trả lời câu hỏi của quản trị viên trước.';
  } else if (/Rate limit|Quota Exceeded|giới hạn/i.test(mainError)) {
    summary = 'Tài khoản ChatGPT đã đạt giới hạn quota tạo ảnh hoặc bị rate limit.';
    suggestion = 'Bật cả 2 tài khoản ChatGPT trên Dashboard để tự động luân phiên hoặc chờ qua khung giờ giới hạn.';
  } else if (/Chrome is not ready|chưa đăng nhập|net::ERR_CONNECTION_REFUSED/i.test(mainError)) {
    summary = 'Không thể kết nối đến Chrome Profile (Cổng bị ngắt kết nối hoặc chưa đăng nhập).';
    suggestion = 'Kiểm tra trạng thái server, khởi động lại hệ thống hoặc mở Chrome Profile để đăng nhập lại tài khoản.';
  } else if (/không tìm thấy ô upload|không tìm thấy ô đăng bài/i.test(mainError)) {
    summary = 'Không tìm thấy khung soạn thảo hoặc nút đính kèm ảnh trên Facebook.';
    suggestion = 'Giao diện trang Facebook có thể đã đổi sang mẫu mới. Thử mở Chrome Profile để xem trạng thái trang.';
  }

  return { summary, suggestion, technicalDetails, raw: clean };
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'accounts' | 'groups' | 'quick-post' | 'bot'>('overview');
  const [status, setStatus] = useState<ServerStatus | null>(null);

  // Telegram Bot & Watchdog State
  const [botConfig, setBotConfig] = useState({
    botToken: '',
    chatId: '',
    allowedChatIds: [] as string[],
    enableAlerts: true,
    enableDailyDigest: true,
    dailyDigestTime: '22:00',
    alertOnServerDown: true,
    alertOnCheckpoint: true,
    alertOnJobError: true,
    alertOnNewMessages: true,
    checkIntervalSeconds: 30,
  });
  const [isBotRunning, setIsBotRunning] = useState<boolean>(false);
  const [botLoading, setBotLoading] = useState<boolean>(false);
  const [botTesting, setBotTesting] = useState<boolean>(false);
  const [showTokenSecret, setShowTokenSecret] = useState<boolean>(false);
  const [botInfo, setBotInfo] = useState<{ username?: string; firstName?: string } | null>(null);
  const [accounts, setAccounts] = useState<AccountCategory[]>([]);
  const [groupsData, setGroupsData] = useState<{ accounts: GroupAccount[]; centralPool?: CentralPoolItem[] }>({ accounts: [], centralPool: [] });
  const [poolStats, setPoolStats] = useState<{
    total: number;
    assigned: number;
    unassigned: number;
    postedSuccess: number;
    postedFailed: number;
    notPosted: number;
    joined: number;
    pending: number;
    notJoined: number;
  }>({
    total: 0,
    assigned: 0,
    unassigned: 0,
    postedSuccess: 0,
    postedFailed: 0,
    notPosted: 0,
    joined: 0,
    pending: 0,
    notJoined: 0,
  });

  const [groupViewMode, setGroupViewMode] = useState<'pool' | 'by_account'>('pool');
  const [selectedGroupAcc, setSelectedGroupAcc] = useState<string>('acc_1');
  const [groupSearch, setGroupSearch] = useState<string>('');

  // Kho chung Filter & Modal state
  const [poolSearch, setPoolSearch] = useState('');
  const [poolFilterAccount, setPoolFilterAccount] = useState<string>('all');
  const [poolFilterPostStatus, setPoolFilterPostStatus] = useState<string>('all');
  const [poolFilterJoinStatus, setPoolFilterJoinStatus] = useState<string>('all');

  const [isPoolImportOpen, setIsPoolImportOpen] = useState(false);
  const [poolImportText, setPoolImportText] = useState('');
  const [poolImportAutoDistribute, setPoolImportAutoDistribute] = useState(false);
  const [poolImportAssignAcc, setPoolImportAssignAcc] = useState<string>('');

  const [isDistributeModalOpen, setIsDistributeModalOpen] = useState(false);
  const [distributeMode, setDistributeMode] = useState<'unassigned_only' | 'all'>('unassigned_only');
  const [distributeSelectedAccs, setDistributeSelectedAccs] = useState<string[]>([]);
  const [distributeLoading, setDistributeLoading] = useState(false);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [revokeMode, setRevokeMode] = useState<'unposted_only' | 'all'>('unposted_only');
  const [revokeTargetAcc, setRevokeTargetAcc] = useState<string>('all');
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [viewingGroupError, setViewingGroupError] = useState<{ url: string; error: string } | null>(null);

  // Analytics & History state
  const [analyticsData, setAnalyticsData] = useState<{
    stats: AnalyticsStats;
    history: HistoryEntry[];
    pagination: { totalEntries: number; page: number; limit: number; totalPages: number };
  } | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [filterChannel, setFilterChannel] = useState<'all' | 'fanpage' | 'groups' | 'personal' | 'chatgpt'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'failed'>('all');
  const [filterGpt, setFilterGpt] = useState<'all' | 'acc1' | 'acc2'>('all');
  const [analyticsSearch, setAnalyticsSearch] = useState('');
  const [analyticsPage, setAnalyticsPage] = useState(1);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryEntry | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [viewingErrorItem, setViewingErrorItem] = useState<HistoryEntry | null>(null);
  
  // Modals state - ChatGPT Accounts
  const [isAddChatGptOpen, setIsAddChatGptOpen] = useState(false);
  const [newChatGptForm, setNewChatGptForm] = useState({
    name: '',
    profileDir: '',
    port: '',
    enabled: true,
  });

  const [isEditChatGptOpen, setIsEditChatGptOpen] = useState(false);
  const [editingChatGpt, setEditingChatGpt] = useState<{ id: string; name: string; profileDir: string; port: number; enabled: boolean } | null>(null);

  // Modals state - Group Accounts
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [newAccountForm, setNewAccountForm] = useState({
    name: '',
    profileDir: '',
    enabled: true,
    groupUrlsText: '',
  });

  const [isEditAccountOpen, setIsEditAccountOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<{ id: string; name: string; profileDir: string; enabled: boolean } | null>(null);

  // Modals state - Fanpage Accounts
  const [isAddFanpageOpen, setIsAddFanpageOpen] = useState(false);
  const [newFanpageForm, setNewFanpageForm] = useState({
    name: '',
    pageUrl: '',
    profileDir: '',
    port: '',
    description: '',
    enabled: true,
  });
  const [isEditFanpageOpen, setIsEditFanpageOpen] = useState(false);
  const [editingFanpage, setEditingFanpage] = useState<{ id: string; name: string; pageUrl: string; profileDir: string; port: number; description: string; enabled: boolean } | null>(null);

  // Modals state - Personal Accounts
  const [isAddPersonalOpen, setIsAddPersonalOpen] = useState(false);
  const [newPersonalForm, setNewPersonalForm] = useState({
    name: '',
    profileUrl: '',
    profileDir: '',
    port: '',
    description: '',
    enabled: true,
  });
  const [isEditPersonalOpen, setIsEditPersonalOpen] = useState(false);
  const [editingPersonal, setEditingPersonal] = useState<{ id: string; name: string; profileUrl: string; profileDir: string; port: number; description: string; enabled: boolean } | null>(null);

  // Group Links Modals
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  const [newGroupUrl, setNewGroupUrl] = useState('');
  const [isBulkGroupOpen, setIsBulkGroupOpen] = useState(false);
  const [bulkGroupText, setBulkGroupText] = useState('');
  const [bulkMode, setBulkMode] = useState<'append' | 'replace'>('append');

  // Quick Post State
  const [qpChannel, setQpChannel] = useState<'fanpage' | 'groups' | 'personal'>('fanpage');
  const [qpCaption, setQpCaption] = useState<string>('');
  const [qpPrompt, setQpPrompt] = useState<string>('');
  const [qpAspect, setQpAspect] = useState<string>('4:5');
  const [qpHasDu, setQpHasDu] = useState<boolean>(true);
  const [qpLoading, setQpLoading] = useState<boolean>(false);
  const [qpResult, setQpResult] = useState<{ success?: boolean; message?: string; imageBase64?: string } | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Đã sao chép vào bộ nhớ tạm!', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Load Status
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      if (data.ok) setStatus(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Load Accounts
  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/accounts');
      const data = await res.json();
      if (data.ok) setAccounts(data.categories);
    } catch (err) {
      console.error(err);
    }
  };

  // Load Groups
  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/groups');
      const data = await res.json();
      if (data.ok) {
        setGroupsData(data.data);
        if (data.stats) setPoolStats(data.stats);
        if (data.data.accounts?.length > 0 && !data.data.accounts.some((a: GroupAccount) => a.id === selectedGroupAcc)) {
          setSelectedGroupAcc(data.data.accounts[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Load Analytics
  const fetchAnalytics = async (page = 1) => {
    setAnalyticsLoading(true);
    try {
      const params = new URLSearchParams({
        channel: filterChannel,
        status: filterStatus,
        chatgpt: filterGpt,
        search: analyticsSearch,
        page: String(page),
        limit: '25',
      });
      const res = await fetch(`/api/analytics?${params.toString()}`);
      const data = await res.json();
      if (data.ok) {
        setAnalyticsData(data);
        setAnalyticsPage(page);
      }
    } catch (err) {
      console.error('Lỗi tải thống kê:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Clear All History
  const handleClearHistory = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa toàn bộ nhật ký thống kê?')) return;
    try {
      const res = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_history' }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.message, 'success');
        fetchAnalytics(1);
      }
    } catch (err) {
      showToast('Lỗi xóa lịch sử', 'error');
    }
  };

  // Delete Single History Entry
  const handleDeleteHistoryEntry = async (id: string) => {
    try {
      const res = await fetch('/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_entry', id }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.message || 'Đã xóa bản ghi', 'success');
        fetchAnalytics(analyticsPage);
        if (selectedHistoryItem?.id === id) {
          setIsDetailModalOpen(false);
          setSelectedHistoryItem(null);
        }
      }
    } catch (err) {
      showToast('Lỗi xóa bản ghi', 'error');
    }
  };

  // Export History as JSON
  const handleExportHistory = () => {
    if (!analyticsData?.history || analyticsData.history.length === 0) {
      return showToast('Không có dữ liệu để xuất!', 'info');
    }
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(analyticsData.history, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `dudi_analytics_history_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Đã tải xuống file JSON thống kê!', 'success');
  };

  // Load Telegram Bot Config
  const fetchBotConfig = async () => {
    try {
      setBotLoading(true);
      const res = await fetch('/api/bot');
      const data = await res.json();
      if (data.ok) {
        setBotConfig(data.config);
        setIsBotRunning(data.isBotRunning);
        if (data.botInfo) setBotInfo(data.botInfo);
      }
    } catch (err) {
      console.error('Lỗi tải bot config:', err);
    } finally {
      setBotLoading(false);
    }
  };

  // Save Bot Config
  const handleSaveBotConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setBotLoading(true);
      const res = await fetch('/api/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_config', config: botConfig }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Đã lưu cấu hình Bot Telegram thành công!', 'success');
        fetchBotConfig();
      } else {
        showToast(data.error || 'Lỗi lưu cấu hình', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, 'error');
    } finally {
      setBotLoading(false);
    }
  };

  // Test Telegram Bot Message
  const handleTestBotMessage = async () => {
    try {
      setBotTesting(true);
      showToast('Đang gửi tin nhắn thử nghiệm tới Telegram...', 'info');
      const res = await fetch('/api/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_message',
          botToken: botConfig.botToken,
          chatId: botConfig.chatId,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Tin nhắn thử nghiệm đã gửi thành công tới Telegram của bạn!', 'success');
      } else {
        showToast(data.error || 'Lỗi gửi tin nhắn test', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, 'error');
    } finally {
      setBotTesting(false);
    }
  };

  // Trigger Daily Digest
  const handleTriggerDigest = async () => {
    try {
      showToast('Đang gửi thử báo cáo Daily Digest 22h...', 'info');
      const res = await fetch('/api/bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'trigger_digest' }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Đã gửi báo cáo Daily Digest thành công!', 'success');
      } else {
        showToast(data.error || 'Lỗi gửi Daily Digest', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, 'error');
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchAccounts();
    fetchGroups();
    fetchAnalytics(1);
    fetchBotConfig();
    const interval = setInterval(() => {
      fetchStatus();
      fetchAccounts();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchAnalytics(1);
  }, [filterChannel, filterStatus, filterGpt]);

  // Toggle Account Enable/Disable
  const handleToggleAccount = async (category: string, accountId: string, currentEnabled: boolean) => {
    const nextEnabled = !currentEnabled;
    
    // Optimistic UI update
    setAccounts(prev => prev.map(cat => {
      if (cat.category === category) {
        return {
          ...cat,
          items: cat.items.map(it => it.id === accountId ? { ...it, enabled: nextEnabled } : it),
        };
      }
      return cat;
    }));

    if (category === 'chatgpt') {
      const rawId = accountId.replace('gpt_', '');
      try {
        const res = await fetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'toggle_chatgpt', accountId: rawId, enabled: nextEnabled }),
        });
        const data = await res.json();
        if (data.ok) {
          showToast(data.message, 'success');
          fetchAccounts();
        } else {
          showToast(data.error || 'Lỗi cập nhật', 'error');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(msg, 'error');
      }
    } else if (category === 'groups') {
      const rawId = accountId.startsWith('group_acc_') ? `acc_${accountId.replace('group_acc_', '')}` : accountId;
      try {
        const res = await fetch('/api/groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'toggle_account', accountId: rawId, enabled: nextEnabled }),
        });
        const data = await res.json();
        if (data.ok) {
          showToast(data.message, 'success');
          fetchAccounts();
          fetchGroups();
        } else {
          showToast(data.error || 'Lỗi cập nhật', 'error');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(msg, 'error');
      }
    } else if (category === 'fanpage') {
      try {
        const res = await fetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'toggle_fanpage', enabled: nextEnabled }),
        });
        const data = await res.json();
        if (data.ok) {
          showToast(data.message, 'success');
          fetchAccounts();
        } else {
          showToast(data.error || 'Lỗi cập nhật', 'error');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(msg, 'error');
      }
    } else if (category === 'personal') {
      try {
        const res = await fetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'toggle_personal', accountId, enabled: nextEnabled }),
        });
        const data = await res.json();
        if (data.ok) {
          showToast(data.message, 'success');
          fetchAccounts();
        } else {
          showToast(data.error || 'Lỗi cập nhật', 'error');
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        showToast(msg, 'error');
      }
    } else {
      showToast(`Đã ${nextEnabled ? 'bật' : 'tắt'} tài khoản`, 'info');
    }
  };

  // Fanpage CRUD Handlers
  const handleCreateFanpage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_fanpage',
          name: newFanpageForm.name,
          pageUrl: newFanpageForm.pageUrl,
          profileDir: newFanpageForm.profileDir,
          port: newFanpageForm.port,
          description: newFanpageForm.description,
          enabled: newFanpageForm.enabled,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.message || 'Đã thêm Fanpage thành công!', 'success');
        setIsAddFanpageOpen(false);
        setNewFanpageForm({ name: '', pageUrl: '', profileDir: '', port: '', description: '', enabled: true });
        fetchAccounts();
      } else {
        showToast(data.error || 'Lỗi thêm Fanpage', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, 'error');
    }
  };

  const openEditFanpageModal = (acc: AccountItem) => {
    const rawId = acc.rawId || acc.id.replace('fanpage_', '').replace('fb_fanpage_', '');
    setEditingFanpage({
      id: rawId,
      name: acc.name,
      pageUrl: acc.pageUrl || acc.url || 'https://www.facebook.com/',
      profileDir: acc.profileDir,
      port: acc.port,
      description: acc.desc || '',
      enabled: acc.enabled !== false,
    });
    setIsEditFanpageOpen(true);
  };

  const handleUpdateFanpage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFanpage) return;
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_fanpage',
          accountId: editingFanpage.id,
          name: editingFanpage.name,
          pageUrl: editingFanpage.pageUrl,
          profileDir: editingFanpage.profileDir,
          port: editingFanpage.port,
          description: editingFanpage.description,
          enabled: editingFanpage.enabled,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.message || 'Đã cập nhật Fanpage thành công!', 'success');
        setIsEditFanpageOpen(false);
        setEditingFanpage(null);
        fetchAccounts();
      } else {
        showToast(data.error || 'Lỗi lưu Fanpage', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ', 'error');
    }
  };

  const handleDeleteFanpage = async (accountId: string, accountName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản Fanpage "${accountName}"?`)) return;
    try {
      const rawId = accountId.replace('fanpage_', '').replace('fb_fanpage_', '');
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_fanpage', accountId: rawId }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.message || 'Đã xóa Fanpage', 'success');
        fetchAccounts();
      } else {
        showToast(data.error || 'Lỗi xóa Fanpage', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, 'error');
    }
  };

  // Personal (Cá Nhân) CRUD Handlers
  const handleCreatePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_personal',
          name: newPersonalForm.name,
          profileUrl: newPersonalForm.profileUrl,
          profileDir: newPersonalForm.profileDir,
          port: newPersonalForm.port,
          description: newPersonalForm.description,
          enabled: newPersonalForm.enabled,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.message || 'Đã thêm tài khoản cá nhân thành công!', 'success');
        setIsAddPersonalOpen(false);
        setNewPersonalForm({ name: '', profileUrl: '', profileDir: '', port: '', description: '', enabled: true });
        fetchAccounts();
      } else {
        showToast(data.error || 'Lỗi thêm tài khoản cá nhân', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, 'error');
    }
  };

  const openEditPersonalModal = (acc: AccountItem) => {
    const rawId = acc.rawId || acc.id.replace('personal_acc_', '');
    setEditingPersonal({
      id: rawId,
      name: acc.name,
      profileUrl: acc.profileUrl || acc.url || 'https://www.facebook.com/',
      profileDir: acc.profileDir,
      port: acc.port,
      description: acc.desc || '',
      enabled: acc.enabled !== false,
    });
    setIsEditPersonalOpen(true);
  };

  const handleUpdatePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPersonal) return;
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_personal',
          accountId: editingPersonal.id,
          name: editingPersonal.name,
          profileUrl: editingPersonal.profileUrl,
          profileDir: editingPersonal.profileDir,
          port: editingPersonal.port,
          description: editingPersonal.description,
          enabled: editingPersonal.enabled,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.message || `Đã cập nhật ${editingPersonal.name} thành công!`, 'success');
        setIsEditPersonalOpen(false);
        setEditingPersonal(null);
        fetchAccounts();
      } else {
        showToast(data.error || 'Lỗi lưu Trang Cá Nhân', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ', 'error');
    }
  };

  const handleDeletePersonal = async (accountId: string, accountName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản cá nhân "${accountName}"?`)) return;
    try {
      const rawId = accountId.replace('personal_acc_', '');
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_personal', accountId: rawId }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.message || 'Đã xóa tài khoản cá nhân', 'success');
        fetchAccounts();
      } else {
        showToast(data.error || 'Lỗi xóa tài khoản cá nhân', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, 'error');
    }
  };

  // Create ChatGPT Account
  const handleCreateChatGpt = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const chatgptCat = accounts.find(c => c.category === 'chatgpt');
      const count = chatgptCat?.items.length || 2;
      const nextNum = count + 1;
      const name = newChatGptForm.name.trim() || `ChatGPT Tài khoản ${nextNum}`;
      const profileDir = newChatGptForm.profileDir.trim() || `n8n-chatgpt-profile-${nextNum}`;
      const port = newChatGptForm.port ? Number(newChatGptForm.port) : (9240 + nextNum);

      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_chatgpt',
          name,
          profileDir,
          port,
          enabled: newChatGptForm.enabled,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        showToast(data.message, 'success');
        setIsAddChatGptOpen(false);
        setNewChatGptForm({ name: '', profileDir: '', port: '', enabled: true });
        fetchAccounts();
      } else {
        showToast(data.error || 'Lỗi thêm tài khoản ChatGPT', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, 'error');
    }
  };

  // Delete ChatGPT Account
  const handleDeleteChatGpt = async (accountId: string, accountName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản "${accountName}" khỏi danh sách xen kẽ?`)) return;
    try {
      const rawId = accountId.replace('gpt_', '');
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_chatgpt', accountId: rawId }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.message, 'success');
        fetchAccounts();
      } else {
        showToast(data.error || 'Lỗi xóa tài khoản', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, 'error');
    }
  };

  // Open Edit ChatGPT Modal
  const openEditChatGptModal = (acc: AccountItem) => {
    const rawId = acc.rawId || acc.id.replace('gpt_', '');
    setEditingChatGpt({
      id: rawId,
      name: acc.name,
      profileDir: acc.profileDir,
      port: acc.port,
      enabled: acc.enabled !== false,
    });
    setIsEditChatGptOpen(true);
  };

  const handleUpdateChatGpt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChatGpt) return;
    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_chatgpt',
          accountId: editingChatGpt.id,
          name: editingChatGpt.name,
          profileDir: editingChatGpt.profileDir,
          port: editingChatGpt.port,
          enabled: editingChatGpt.enabled,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.message, 'success');
        setIsEditChatGptOpen(false);
        setEditingChatGpt(null);
        fetchAccounts();
      } else {
        showToast(data.error || 'Lỗi cập nhật', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, 'error');
    }
  };

  // Add New Group Account
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const nextIndex = (groupsData.accounts?.length || 0) + 1;
      const name = newAccountForm.name.trim() || `Tài khoản ${nextIndex}`;
      const profileDir = newAccountForm.profileDir.trim() || `n8n-fb-group-profile-${nextIndex}`;
      const groupUrls = newAccountForm.groupUrlsText
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.startsWith('http'));

      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_account',
          name,
          profileDir,
          enabled: newAccountForm.enabled,
          groupUrls,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        showToast(data.message, 'success');
        setIsAddAccountOpen(false);
        setNewAccountForm({ name: '', profileDir: '', enabled: true, groupUrlsText: '' });
        fetchAccounts();
        fetchGroups();
      } else {
        showToast(data.error || 'Lỗi thêm tài khoản', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, 'error');
    }
  };

  // Delete Group Account
  const handleDeleteAccount = async (accountId: string, accountName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản "${accountName}" cùng toàn bộ link nhóm?`)) return;
    try {
      const rawId = accountId.startsWith('group_acc_') ? `acc_${accountId.replace('group_acc_', '')}` : accountId;
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_account', accountId: rawId }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.message, 'success');
        fetchAccounts();
        fetchGroups();
      } else {
        showToast(data.error || 'Lỗi xóa tài khoản', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, 'error');
    }
  };

  // Open Edit Group Account Modal
  const openEditAccountModal = (acc: AccountItem) => {
    const rawId = acc.rawId || acc.id;
    setEditingAccount({
      id: rawId,
      name: acc.name,
      profileDir: acc.profileDir,
      enabled: acc.enabled !== false,
    });
    setIsEditAccountOpen(true);
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_account',
          accountId: editingAccount.id,
          name: editingAccount.name,
          profileDir: editingAccount.profileDir,
          enabled: editingAccount.enabled,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.message, 'success');
        setIsEditAccountOpen(false);
        setEditingAccount(null);
        fetchAccounts();
        fetchGroups();
      } else {
        showToast(data.error || 'Lỗi cập nhật', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, 'error');
    }
  };

  // Open Chrome
  const handleOpenChrome = async (profileDir: string, port: number, url = 'https://www.facebook.com/') => {
    showToast(`Đang mở Chrome (${profileDir} - Port ${port})...`, 'info');
    try {
      const res = await fetch('/api/accounts/open-chrome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileDir, port, url }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.message, 'success');
        setTimeout(() => { fetchStatus(); fetchAccounts(); }, 4000);
      } else {
        showToast(data.error || 'Lỗi mở Chrome', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, 'error');
    }
  };

  // Restart Servers
  const handleRestartServers = async () => {
    if (!confirm('Khởi động lại toàn bộ hệ thống (Dashboard Port 3000 + 3 Server Bridge 3001, 3002, 3003)?')) return;
    try {
      showToast('Đang khởi động lại Dashboard & các servers...', 'info');
      const res = await fetch('/api/servers/restart', { method: 'POST' });
      const data = await res.json();
      showToast(data.message, 'success');
      setTimeout(fetchStatus, 5000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, 'error');
    }
  };

  // Group Link Handlers
  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupUrl.trim()) return;
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add', accountId: selectedGroupAcc, groupUrl: newGroupUrl.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.message || 'Đã thêm link nhóm!', 'success');
        setNewGroupUrl('');
        setIsAddGroupOpen(false);
        fetchGroups();
      } else {
        showToast(data.error || 'Link nhóm đã tồn tại hoặc không hợp lệ', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, 'error');
    }
  };

  const handleRemoveGroup = async (groupUrl: string) => {
    if (!confirm(`Xóa link nhóm:\n${groupUrl}?`)) return;
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', accountId: selectedGroupAcc, groupUrl }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast('Đã xóa nhóm!', 'success');
        fetchGroups();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, 'error');
    }
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'bulk', accountId: selectedGroupAcc, groupUrlsText: bulkGroupText, mode: bulkMode }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.message, 'success');
        setBulkGroupText('');
        setIsBulkGroupOpen(false);
        fetchGroups();
      } else {
        showToast(data.error || 'Lỗi import nhóm', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, 'error');
    }
  };

  // Central Pool Handlers
  const handlePoolImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!poolImportText.trim()) return;
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pool_import',
          urlsText: poolImportText,
          autoDistribute: poolImportAutoDistribute,
          assignedAccountId: poolImportAssignAcc || null,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.message, 'success');
        setIsPoolImportOpen(false);
        setPoolImportText('');
        setPoolImportAutoDistribute(false);
        setPoolImportAssignAcc('');
        fetchGroups();
      } else {
        showToast(data.error || 'Lỗi import link', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, 'error');
    }
  };

  const openDistributeModal = () => {
    const enabledIds = (groupsData.accounts || []).filter(a => a.enabled !== false).map(a => a.id);
    setDistributeSelectedAccs(enabledIds.length > 0 ? enabledIds : (groupsData.accounts || []).map(a => a.id));
    setIsDistributeModalOpen(true);
  };

  const handlePoolDistribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (distributeSelectedAccs.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 tài khoản nhận link', 'error');
      return;
    }
    setDistributeLoading(true);
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pool_distribute',
          targetAccountIds: distributeSelectedAccs,
          mode: distributeMode,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.message, 'success');
        setIsDistributeModalOpen(false);
        fetchGroups();
      } else {
        showToast(data.error || 'Lỗi chia link', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, 'error');
    } finally {
      setDistributeLoading(false);
    }
  };

  const handlePoolRevoke = async (e: React.FormEvent) => {
    e.preventDefault();
    setRevokeLoading(true);
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'pool_revoke',
          mode: revokeMode,
          targetAccountId: revokeTargetAcc === 'all' ? null : revokeTargetAcc,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.message, 'success');
        setIsRevokeModalOpen(false);
        fetchGroups();
      } else {
        showToast(data.error || 'Lỗi thu hồi link', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, 'error');
    } finally {
      setRevokeLoading(false);
    }
  };

  const handlePoolUpdateStatus = async (
    id: string,
    url?: string,
    joinedStatus?: 'joined' | 'pending' | 'not_joined' | 'unknown',
    assignedAccountId?: string | null
  ) => {
    try {
      const payload: Record<string, unknown> = { action: 'pool_update_item', id, url };
      if (joinedStatus) payload.joinedStatus = joinedStatus;
      if (assignedAccountId !== undefined) payload.assignedAccountId = assignedAccountId;

      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.message, 'success');
        fetchGroups();
      } else {
        showToast(data.error || 'Lỗi cập nhật', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, 'error');
    }
  };

  const handlePoolDeleteItem = async (id: string, url: string) => {
    if (!confirm(`Xóa link này khỏi kho chung?\n${url}`)) return;
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pool_delete_item', id, url }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.message, 'success');
        fetchGroups();
      } else {
        showToast(data.error || 'Lỗi xóa link', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, 'error');
    }
  };

  const executeQuickPublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qpCaption.trim()) return showToast('Vui lòng nhập nội dung caption!', 'error');

    setQpLoading(true);
    setQpResult(null);
    showToast('Đang bắt đầu tiến trình tạo ảnh ChatGPT & Đăng bài...', 'info');

    try {
      const gptPort = qpChannel === 'personal' ? 3003 : 3001;
      
      // 1. Generate Image
      const genRes = await fetch(`http://127.0.0.1:${gptPort}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_chatgpt_image',
          prompt: qpPrompt || 'Professional marketing image for Vietnamese software enterprise',
          aspectRatio: qpAspect,
          referenceImageUrl: qpHasDu ? 'https://res.cloudinary.com/dbwahdjzg/image/upload/v1786351452/4022ffed-ef18-4faf-bf7e-156716aa5d4e.png' : null,
        }),
      });

      const genData = await genRes.json();
      if (!genData.imageBase64) throw new Error(genData.error || 'ChatGPT không thể tạo ảnh');

      showToast('Tạo ảnh xong! Đang xuất bản lên Facebook...', 'success');

      // 2. Publish to Target - Lấy link trực tiếp từ cấu hình đang bật trên Dashboard
      const fanpageAcc = accounts.find(c => c.category === 'fanpage')?.items.find(i => i.enabled !== false);
      const fanpageUrl = fanpageAcc?.pageUrl || fanpageAcc?.url;

      const personalAcc = accounts.find(c => c.category === 'personal')?.items.find(i => i.enabled !== false);
      const personalUrl = personalAcc?.profileUrl || personalAcc?.url;

      let pubUrl = 'http://127.0.0.1:3001/generate';
      let pubBody: Record<string, unknown> = {
        action: 'publish_facebook_page',
        ...(fanpageUrl ? { pageUrl: fanpageUrl } : {}),
        caption: qpCaption,
        imageBase64: genData.imageBase64,
      };

      if (qpChannel === 'groups') {
        pubUrl = 'http://127.0.0.1:3002/post-groups';
        pubBody = { caption: qpCaption, imageBase64: genData.imageBase64 };
      } else if (qpChannel === 'personal') {
        pubUrl = 'http://127.0.0.1:3003/generate';
        pubBody = {
          action: 'publish_facebook_personal',
          ...(personalUrl ? { pageUrl: personalUrl, profileUrl: personalUrl } : {}),
          caption: qpCaption,
          imageBase64: genData.imageBase64,
        };
      }

      const pubRes = await fetch(pubUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pubBody),
      });

      const pubData = await pubRes.json();
      if (pubData.ok) {
        setQpResult({
          success: true,
          message: 'Đăng bài thành công lên Facebook!',
          imageBase64: genData.imageBase64,
        });
        showToast('Xuất bản thành công!', 'success');
      } else {
        throw new Error(pubData.error || 'Lỗi xuất bản bài viết');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setQpResult({
        success: false,
        message: msg,
      });
      showToast(msg, 'error');
    } finally {
      setQpLoading(false);
    }
  };

  const totalGroupsCount = (groupsData.accounts || []).reduce((sum, a) => sum + (a.groupUrls?.length || 0), 0);
  const totalAccountsCount = accounts.reduce((sum, c) => sum + (c.items?.length || 0), 0);
  const activeGroupAccount = groupsData.accounts?.find(a => a.id === selectedGroupAcc);
  const filteredGroups = (activeGroupAccount?.groupUrls || []).filter(u => u.toLowerCase().includes(groupSearch.toLowerCase()));

  // Filtered Central Pool
  const filteredPool = (groupsData.centralPool || []).filter((item) => {
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

  // Map to quickly lookup pool item by url for the by_account view
  const poolItemByUrl = React.useMemo(() => {
    const map = new Map<string, CentralPoolItem>();
    for (const item of groupsData.centralPool || []) {
      const clean = item.url.trim().replace(/\/+$/, '');
      map.set(clean, item);
    }
    return map;
  }, [groupsData.centralPool]);

  const chatgptAccounts = accounts.find(c => c.category === 'chatgpt')?.items || [];

  return (
    <div className="relative min-h-screen font-sans text-slate-900 antialiased overflow-x-hidden selection:bg-blue-600 selection:text-white">
      
      {/* Dynamic Background Mesh Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-300/30 rounded-full blur-3xl animate-blob"></div>
        <div className="absolute top-1/4 -right-32 w-96 h-96 bg-sky-200/40 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
        <div className="absolute top-2/3 right-1/4 w-80 h-80 bg-emerald-200/25 rounded-full blur-3xl animate-blob"></div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl backdrop-blur-xl border text-sm transition-all animate-bounce ${
          toast.type === 'success' ? 'bg-white/95 border-emerald-300 text-emerald-800 shadow-emerald-500/10' :
          toast.type === 'error' ? 'bg-white/95 border-rose-300 text-rose-800 shadow-rose-500/10' :
          'bg-white/95 border-blue-300 text-blue-800 shadow-blue-500/10'
        }`}>
          {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />}
          {toast.type === 'info' && <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-2xl border-b border-slate-200/80 px-6 py-3.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3.5">
            <div className="relative group cursor-pointer flex-shrink-0">
              <div className="absolute -inset-0.5 bg-red-500/30 rounded-2xl blur-sm opacity-60 group-hover:opacity-100 transition duration-300"></div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="DUDI software"
                className="relative w-11 h-11 rounded-xl object-cover shadow-md border border-red-500/20 group-hover:scale-105 transition-transform duration-200"
              />
            </div>
            <div>
              <div className="font-extrabold text-lg text-slate-900 tracking-tight flex items-center gap-2">
                Control Center
              </div>
              <p className="text-xs text-slate-500 font-medium">Hệ thống Điều phối Tự động Hóa Tài khoản & AI Content</p>
            </div>
          </div>

          {/* Navigation Pill Switcher */}
          <nav className="flex items-center bg-slate-200/60 p-1.5 rounded-2xl border border-slate-300/60 backdrop-blur-md shadow-xs flex-wrap gap-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 ${
                activeTab === 'overview'
                  ? 'bg-white text-blue-700 shadow-md shadow-slate-900/5 font-bold border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" /> Tổng quan
            </button>
            <button
              onClick={() => { setActiveTab('analytics'); fetchAnalytics(1); }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 ${
                activeTab === 'analytics'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/25 font-bold'
                  : 'text-slate-600 hover:text-blue-700 hover:bg-white/60'
              }`}
            >
              <BarChart3 className="w-4 h-4" /> Thống kê & Lịch sử
            </button>
            <button
              onClick={() => setActiveTab('accounts')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 ${
                activeTab === 'accounts'
                  ? 'bg-white text-blue-700 shadow-md shadow-slate-900/5 font-bold border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Users className="w-4 h-4" /> Quản lý Tài khoản
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 ${
                activeTab === 'groups'
                  ? 'bg-white text-blue-700 shadow-md shadow-slate-900/5 font-bold border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Share2 className="w-4 h-4" /> Link Nhóm FB
            </button>
            <button
              onClick={() => setActiveTab('quick-post')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 ${
                activeTab === 'quick-post'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/25 font-bold'
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-white/60'
              }`}
            >
              <Send className="w-4 h-4" /> Đăng bài Nhanh
            </button>
            <button
              onClick={() => { setActiveTab('bot'); fetchBotConfig(); }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 ${
                activeTab === 'bot'
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25 font-bold'
                  : 'text-slate-600 hover:text-sky-700 hover:bg-white/60'
              }`}
            >
              <Bot className="w-4 h-4" /> Telegram Bot & Giám sát
              {isBotRunning && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              )}
            </button>
          </nav>

          {/* Action Header Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => { fetchStatus(); fetchAccounts(); fetchGroups(); showToast('Đã làm mới dữ liệu!', 'info'); }}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white/80 hover:bg-white border border-slate-200/90 rounded-xl text-slate-700 shadow-xs hover:shadow-sm transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" /> Làm mới
            </button>
            <button
              onClick={handleRestartServers}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-rose-50 hover:bg-rose-100/90 border border-rose-200 text-rose-700 rounded-xl shadow-xs transition-all"
            >
              <Power className="w-3.5 h-3.5 text-rose-600" /> Restart Servers
            </button>
          </div>

        </div>
      </header>

      {/* Main Body Content */}
      <main className="relative z-10 max-w-7xl mx-auto p-6 md:p-8 space-y-8">
        
        {/* ==================== TAB 1: TỔNG QUAN (OVERVIEW) ==================== */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            
            {/* Status Grid Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              
              {/* Server 1 */}
              <div className="liquid-glass liquid-glass-interactive rounded-3xl p-6 relative overflow-hidden">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shadow-xs">
                      <Radio className="w-4 h-4" />
                    </span>
                    <span className="font-bold text-sm text-slate-900">Fanpage & GPT</span>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                    status?.servers.fanpageGpt.active 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${status?.servers.fanpageGpt.active ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                    Port 3001
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-1">Tạo ảnh ChatGPT xen kẽ & xuất bản Fanpage</p>
              </div>

              {/* Server 2 */}
              <div className="liquid-glass liquid-glass-interactive rounded-3xl p-6 relative overflow-hidden">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-xs">
                      <Share2 className="w-4 h-4" />
                    </span>
                    <span className="font-bold text-sm text-slate-900">Facebook Groups</span>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                    status?.servers.fbGroups.active 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${status?.servers.fbGroups.active ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                    Port 3002
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-1">Tự động đăng xoay vòng {groupsData.accounts?.length || 7} tài khoản nhóm</p>
              </div>

              {/* Server 3 */}
              <div className="liquid-glass liquid-glass-interactive rounded-3xl p-6 relative overflow-hidden">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-teal-50 text-teal-600 border border-teal-100 shadow-xs">
                      <Users className="w-4 h-4" />
                    </span>
                    <span className="font-bold text-sm text-slate-900">Trang Cá Nhân</span>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                    status?.servers.fbPersonal.active 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${status?.servers.fbPersonal.active ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                    Port 3003
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-1">Đăng bài lên tường cá nhân độc lập</p>
              </div>

              {/* ChatGPT Multi-Account Status */}
              <div className="liquid-glass liquid-glass-interactive rounded-3xl p-6 relative overflow-hidden">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-violet-50 text-violet-600 border border-violet-100 shadow-xs">
                      <Bot className="w-4 h-4" />
                    </span>
                    <span className="font-bold text-sm text-slate-900">ChatGPT Xen Kẽ</span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-violet-50 text-violet-700 border border-violet-200">
                    <Sparkles className="w-3.5 h-3.5 text-violet-600" /> {chatgptAccounts.length} Tài khoản
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-1">Tự động luân phiên & fallback khi hết quota</p>
              </div>

            </div>

            {/* Quick Actions & Big Stats Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* 1-Click Launchers */}
              <div className="liquid-glass rounded-3xl p-7 lg:col-span-2 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2.5 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                      <Globe className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="font-extrabold text-base text-slate-900">
                        Mở Trình duyệt Đăng nhập Nhanh (1-Click)
                      </h3>
                      <p className="text-xs text-slate-500">Mở Chrome profile tương ứng để đăng nhập nick trực tiếp an toàn</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                    Direct Launcher
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                  
                  {chatgptAccounts.map((acc, idx) => (
                    <button
                      key={acc.id}
                      onClick={() => handleOpenChrome(acc.profileDir, acc.port, 'https://chatgpt.com/')}
                      className="flex items-center justify-between p-4 rounded-2xl bg-white/70 hover:bg-white border border-slate-200/90 hover:border-blue-300 text-xs font-bold text-slate-800 shadow-xs hover:shadow-md transition-all group"
                    >
                      <span className="flex items-center gap-2.5 text-slate-800">
                        <span className={`w-8 h-8 rounded-xl flex items-center justify-center border font-bold ${
                          idx === 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          idx === 1 ? 'bg-violet-50 text-violet-600 border-violet-100' :
                          'bg-sky-50 text-sky-600 border-sky-100'
                        }`}>🤖</span>
                        <span>{acc.name} <span className="text-[11px] text-slate-400 font-normal">(Port {acc.port})</span></span>
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                    </button>
                  ))}

                  <button
                    onClick={() => handleOpenChrome('n8n-chatgpt-profile', 9222, 'https://www.facebook.com/')}
                    className="flex items-center justify-between p-4 rounded-2xl bg-white/70 hover:bg-white border border-slate-200/90 hover:border-blue-300 text-xs font-bold text-slate-800 shadow-xs hover:shadow-md transition-all group"
                  >
                    <span className="flex items-center gap-2.5 text-slate-800">
                      <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 font-bold">📄</span>
                      <span>Facebook Fanpage Profile</span>
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                  </button>

                  <button
                    onClick={() => setActiveTab('accounts')}
                    className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100/70 hover:to-indigo-100/70 border border-blue-200/80 text-xs font-bold text-blue-800 shadow-xs hover:shadow-md transition-all group"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">👥</span>
                      <span>Quản lý Tất cả Tài khoản...</span>
                    </span>
                    <span className="text-blue-600 group-hover:translate-x-1 transition-transform">➔</span>
                  </button>

                </div>
              </div>

              {/* Statistics & Quick Launch CTA */}
              <div className="liquid-glass rounded-3xl p-7 flex flex-col justify-between space-y-5">
                <div className="flex items-center gap-2.5">
                  <span className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <Layers className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">Tổng quan Dữ liệu</h3>
                    <p className="text-xs text-slate-500">Tài nguyên hiện hữu trong hệ thống</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="liquid-recess p-4 rounded-2xl text-center">
                    <div className="text-3xl font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      {totalGroupsCount}
                    </div>
                    <div className="text-xs font-bold text-slate-500 mt-1">Link Nhóm FB</div>
                  </div>
                  <div className="liquid-recess p-4 rounded-2xl text-center">
                    <div className="text-3xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                      {totalAccountsCount}
                    </div>
                    <div className="text-xs font-bold text-slate-500 mt-1">Tài khoản & Kênh</div>
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('quick-post')}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 hover:shadow-xl hover:shadow-emerald-600/40 transition-all flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" /> Đăng bài Thử nghiệm ngay
                </button>
              </div>

            </div>

          </div>
        )}

        {/* ==================== TAB 2: BÁO CÁO THỐNG KÊ & LỊCH SỬ (ANALYTICS) ==================== */}
        {activeTab === 'analytics' && (
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
                  Hiển thị {analyticsData?.history.length || 0} / {analyticsData?.pagination.totalEntries || 0} bản ghi
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
        )}

        {/* ==================== TAB 3: QUẢN LÝ TÀI KHOẢN ==================== */}
        {activeTab === 'accounts' && (
          <div className="space-y-8">
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
                      <button
                        onClick={() => setIsAddFanpageOpen(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md shadow-blue-600/25 transition-all"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Thêm Fanpage
                      </button>
                    )}
                    {category.category === 'groups' && (
                      <button
                        onClick={() => setIsAddAccountOpen(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-md shadow-indigo-600/25 transition-all"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> Thêm tài khoản Group
                      </button>
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

                {/* Account Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {category.items.map(acc => {
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

              </div>
            ))}
          </div>
        )}

        {/* ==================== TAB 3: LINK NHÓM FACEBOOK & KHO CHUNG ==================== */}
        {activeTab === 'groups' && (
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
                  onClick={() => setIsAddGroupOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-700 shadow-xs transition-all"
                >
                  <Plus className="w-4 h-4 text-emerald-600" /> Thêm link lẻ
                </button>
              </div>
            </div>

            {/* View Switcher Pills */}
            <div className="flex items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl w-fit border border-slate-200/80">
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
                          filteredPool.map((item, idx) => {
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
        )}

        {/* ==================== TAB 4: ĐĂNG BÀI NHANH ==================== */}
        {activeTab === 'quick-post' && (
          <div className="max-w-2xl mx-auto liquid-glass rounded-3xl p-8 space-y-6">
            
            <div className="border-b border-slate-200/80 pb-5">
              <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <Send className="w-5 h-5" />
                </span>
                Trung tâm Đăng bài Trực tiếp (Manual Trigger)
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1">Tạo ảnh ChatGPT và xuất bản ngay lên kênh mong muốn để kiểm tra</p>
            </div>

            <form onSubmit={executeQuickPublish} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Chọn Kênh xuất bản:</label>
                <select
                  value={qpChannel}
                  onChange={(e) => setQpChannel(e.target.value as 'fanpage' | 'groups' | 'personal')}
                  className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900"
                >
                  <option value="fanpage">Facebook Fanpage (Bridge Port 3001)</option>
                  <option value="groups">Facebook Groups (Bridge Port 3002)</option>
                  <option value="personal">Facebook Trang Cá Nhân (Bridge Port 3003)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Nội dung Caption đăng bài:</label>
                <textarea
                  value={qpCaption}
                  onChange={(e) => setQpCaption(e.target.value)}
                  rows={5}
                  placeholder="Nhập nội dung đầy đủ bài viết đăng lên Facebook..."
                  className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Prompt Tạo ảnh ChatGPT:</label>
                <textarea
                  value={qpPrompt}
                  onChange={(e) => setQpPrompt(e.target.value)}
                  rows={2}
                  placeholder="Mô tả bối cảnh hình ảnh mong muốn..."
                  className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Tỉ lệ ảnh:</label>
                  <select
                    value={qpAspect}
                    onChange={(e) => setQpAspect(e.target.value)}
                    className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900"
                  >
                    <option value="4:5">4:5 (Khuyên dùng Facebook)</option>
                    <option value="16:9">16:9 (Ngang)</option>
                    <option value="1:1">1:1 (Vuông)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Mascot Du:</label>
                  <select
                    value={qpHasDu ? 'true' : 'false'}
                    onChange={(e) => setQpHasDu(e.target.value === 'true')}
                    className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-900"
                  >
                    <option value="true">Có Mascot Du (Workflow Giờ Chẵn)</option>
                    <option value="false">Người thật Photorealistic (Workflow Giờ Lẻ)</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={qpLoading}
                className={`w-full py-4 rounded-2xl font-extrabold text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${
                  qpLoading
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30 hover:shadow-xl'
                }`}
              >
                {qpLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-500" />
                    Đang tạo ảnh ChatGPT & Đăng bài (Khoảng 1 - 2 phút)...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Bắt đầu Tạo ảnh ChatGPT & Đăng bài ngay
                  </>
                )}
              </button>
            </form>

            {/* Quick Post Result Box */}
            {qpResult && (
              <div className={`p-5 rounded-2xl border ${
                qpResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                <div className="font-extrabold flex items-center gap-2 text-sm mb-2">
                  {qpResult.success ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
                  {qpResult.message}
                </div>
                {qpResult.imageBase64 && (
                  <div className="mt-3">
                    <img
                      src={`data:image/png;base64,${qpResult.imageBase64}`}
                      alt="Generated by ChatGPT"
                      className="max-h-56 rounded-xl border border-slate-200 shadow-md object-contain"
                    />
                  </div>
                )}
              </div>
            )}

          </div>
        )}

        {/* ==================== TAB 5: TELEGRAM BOT & GIÁM SÁT TỪ XA ==================== */}
        {activeTab === 'bot' && (
          <div className="space-y-8 max-w-5xl mx-auto">
            
            {/* Header Banner */}
            <div className="liquid-glass rounded-3xl p-6 md:p-8 relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="p-3 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/30">
                      <Bot className="w-6 h-6" />
                    </span>
                    <div>
                      <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                        Giám Sát Từ Xa & Telegram Command Bot
                      </h2>
                      <p className="text-xs md:text-sm text-slate-500 font-medium">
                        Quản lý toàn bộ hệ thống từ điện thoại, nhận cảnh báo lỗi kèm ảnh chụp màn hình tức thì và báo cáo tổng kết 22h tối.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className={`px-4 py-2.5 rounded-2xl text-xs font-bold border flex items-center gap-2 ${
                    isBotRunning 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${isBotRunning ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                    {isBotRunning ? 'Bot Service: Online (Port 3004)' : 'Bot Service: Đang tắt (Port 3004)'}
                  </div>

                  <div className={`px-3.5 py-2.5 rounded-2xl text-xs font-bold border flex items-center gap-1.5 ${
                    botConfig.botToken && botConfig.chatId
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    {botConfig.botToken && botConfig.chatId ? '🟢 Đã cấu hình' : '⚠️ Chưa đủ Token / Chat ID'}
                  </div>
                </div>
              </div>

              {/* Quick Actions Bar */}
              <div className="mt-6 pt-5 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleTestBotMessage}
                    disabled={botTesting || !botConfig.botToken || !botConfig.chatId}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold text-xs shadow-md shadow-sky-500/25 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {botTesting ? 'Đang gửi test...' : 'Test Gửi Tin Nhắn Telegram'}
                  </button>

                  <button
                    type="button"
                    onClick={handleTriggerDigest}
                    disabled={!isBotRunning || !botConfig.botToken || !botConfig.chatId}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    Gửi thử Báo cáo 22h tối (Daily Digest)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={fetchBotConfig}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Làm mới cấu hình
                </button>
              </div>
              {/* Direct Telegram Bot Link & Start Reminder */}
              {botInfo?.username && (
                <div className="mt-5 p-4 rounded-2xl bg-sky-50 border border-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 rounded-xl bg-sky-500 text-white shadow-sm">
                      <Bot className="w-5 h-5" />
                    </span>
                    <div>
                      <p className="text-xs font-black text-slate-900 flex items-center gap-2">
                        Bot của bạn: <span className="text-sky-700 font-mono text-sm">@{botInfo.username}</span>
                        {botInfo.firstName && <span className="text-slate-500 font-medium">({botInfo.firstName})</span>}
                      </p>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        👉 <b>Bắt buộc:</b> Bạn cần mở Telegram, vào bot và bấm nút <b>&quot;START&quot;</b> thì Telegram mới cho phép Bot gửi tin nhắn cho bạn.
                      </p>
                    </div>
                  </div>
                  <a
                    href={`https://t.me/${botInfo.username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs shadow-md shadow-sky-600/25 transition-all cursor-pointer text-center justify-center"
                  >
                    <ExternalLink className="w-4 h-4" /> Mở Bot & Ấn START
                  </a>
                </div>
              )}
            </div>

            {/* Form Settings Grid */}
            <form onSubmit={handleSaveBotConfig} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Cột 1: Thông tin kết nối Telegram */}
              <div className="liquid-glass rounded-3xl p-6 md:p-7 space-y-5">
                <div className="border-b border-slate-200/80 pb-3 flex items-center justify-between">
                  <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-sky-100 text-sky-700">
                      <Bot className="w-4 h-4" />
                    </span>
                    Thông Tin Kết Nối Telegram
                  </h3>
                  <span className="text-[11px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                    Long Polling (Không cần mở port)
                  </span>
                </div>

                {/* Bot Token */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">Telegram Bot Token (từ @BotFather):</label>
                    <button
                      type="button"
                      onClick={() => setShowTokenSecret(!showTokenSecret)}
                      className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> {showTokenSecret ? 'Ẩn token' : 'Hiện token'}
                    </button>
                  </div>
                  <input
                    type={showTokenSecret ? 'text' : 'password'}
                    value={botConfig.botToken || ''}
                    onChange={(e) => setBotConfig({ ...botConfig, botToken: e.target.value })}
                    placeholder="VD: 7123456789:AAFlmP_abc1234xyz..."
                    className="liquid-input w-full rounded-xl px-4 py-2.5 text-xs md:text-sm font-mono text-slate-900"
                  />
                  <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-200 text-[11px] text-sky-900 space-y-1">
                    <p className="font-bold">💡 Cách lấy Token trong 1 phút:</p>
                    <ol className="list-decimal pl-4 space-y-0.5 text-slate-600">
                      <li>Mở ứng dụng Telegram, tìm bot <b>@BotFather</b></li>
                      <li>Gửi lệnh <code>/newbot</code>, đặt tên hiển thị và username bot (kết thúc bằng từ bot)</li>
                      <li>Sao chép dòng <b>HTTP API Token</b> và dán vào ô trên.</li>
                    </ol>
                  </div>
                </div>

                {/* Chat ID */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Telegram Chat ID (Cá nhân hoặc Nhóm nhận tin):</label>
                  <input
                    type="text"
                    value={botConfig.chatId || ''}
                    onChange={(e) => setBotConfig({ ...botConfig, chatId: e.target.value })}
                    placeholder="VD: 123456789 (dạng số)"
                    className="liquid-input w-full rounded-xl px-4 py-2.5 text-xs md:text-sm font-mono text-slate-900"
                  />
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                    <p className="font-bold text-slate-800">💡 Cách lấy Chat ID của bạn:</p>
                    <p>
                      Mở Telegram, tìm bot <b>@userinfobot</b> và bấm <b>Start</b>. Bot sẽ gửi lại cho bạn một dãy số <code>Id: 123456789</code>. Hãy nhập dãy số đó vào ô này.
                    </p>
                  </div>
                </div>

                {/* Allowed Chat IDs */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Chat ID phụ (Tùy chọn, cách nhau bằng dấu phẩy):</label>
                  <input
                    type="text"
                    value={Array.isArray(botConfig.allowedChatIds) ? botConfig.allowedChatIds.join(', ') : ''}
                    onChange={(e) => {
                      const ids = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                      setBotConfig({ ...botConfig, allowedChatIds: ids });
                    }}
                    placeholder="VD: 987654321, 555666777"
                    className="liquid-input w-full rounded-xl px-4 py-2.5 text-xs md:text-sm font-mono text-slate-900"
                  />
                  <p className="text-[11px] text-slate-500">
                    Bảo mật: Chỉ các Chat ID được liệt kê ở đây mới có quyền điều khiển các lệnh <code>/restart</code> hoặc <code>/post_now</code>.
                  </p>
                </div>

              </div>

              {/* Cột 2: Cài đặt Cảnh báo & Tự động hóa */}
              <div className="liquid-glass rounded-3xl p-6 md:p-7 space-y-5">
                <div className="border-b border-slate-200/80 pb-3">
                  <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                      <ShieldCheck className="w-4 h-4" />
                    </span>
                    Chính Sách Cảnh Báo & Tự Động Hóa
                  </h3>
                </div>

                <div className="space-y-3">
                  
                  {/* Master Alert Toggle */}
                  <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-blue-200/80 bg-blue-50/50 cursor-pointer hover:bg-blue-50 transition-all">
                    <input
                      type="checkbox"
                      checked={botConfig.enableAlerts !== false}
                      onChange={(e) => setBotConfig({ ...botConfig, enableAlerts: e.target.checked })}
                      className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <div>
                      <span className="text-xs font-bold text-blue-950 block">⚡ Bật Hệ Thống Cảnh Báo Lỗi Tức Thì</span>
                      <span className="text-[11px] text-blue-800">
                        Bot tự động bắn tin nhắn ngay khi phát hiện sự cố hệ thống hoặc tiến trình đăng bài bị lỗi.
                      </span>
                    </div>
                  </label>

                  {/* Alert on Server Down */}
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-white/70 cursor-pointer hover:bg-white transition-all">
                    <input
                      type="checkbox"
                      checked={botConfig.alertOnServerDown !== false}
                      onChange={(e) => setBotConfig({ ...botConfig, alertOnServerDown: e.target.checked })}
                      className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Cảnh báo khi Server Bridge mất kết nối</span>
                      <span className="text-[11px] text-slate-500">
                        Bắn cảnh báo nếu các cổng 3001, 3002, 3003 hoặc n8n bị tắt/dừng đột ngột.
                      </span>
                    </div>
                  </label>

                  {/* Alert on Checkpoint */}
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-white/70 cursor-pointer hover:bg-white transition-all">
                    <input
                      type="checkbox"
                      checked={botConfig.alertOnCheckpoint !== false}
                      onChange={(e) => setBotConfig({ ...botConfig, alertOnCheckpoint: e.target.checked })}
                      className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Cảnh báo Checkpoint Facebook (Kèm ảnh chụp màn hình)</span>
                      <span className="text-[11px] text-slate-500">
                        Tự động phát hiện khi tài khoản Facebook bị văng ra trang xác minh checkpoint và chụp ảnh báo ngay.
                      </span>
                    </div>
                  </label>

                  {/* Alert on Job Error */}
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-white/70 cursor-pointer hover:bg-white transition-all">
                    <input
                      type="checkbox"
                      checked={botConfig.alertOnJobError !== false}
                      onChange={(e) => setBotConfig({ ...botConfig, alertOnJobError: e.target.checked })}
                      className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Cảnh báo khi xuất bản bài viết thất bại</span>
                      <span className="text-[11px] text-slate-500">
                        Gửi chi tiết thông báo lỗi và ảnh chụp của bài viết khi đăng nhóm hoặc fanpage bị chặn.
                      </span>
                    </div>
                  </label>

                  {/* Alert on New Messages */}
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 cursor-pointer hover:bg-emerald-50 transition-all">
                    <input
                      type="checkbox"
                      checked={botConfig.alertOnNewMessages !== false}
                      onChange={(e) => setBotConfig({ ...botConfig, alertOnNewMessages: e.target.checked })}
                      className="w-4 h-4 mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                    />
                    <div>
                      <span className="text-xs font-bold text-emerald-950 block">🔔 Cảnh báo khi có tin nhắn mới từ khách hàng (Messenger / Fanpage)</span>
                      <span className="text-[11px] text-emerald-800">
                        Tự động theo dõi các nick Facebook & Fanpage. Khi khách nhắn tin đến, Bot sẽ lập tức bắn thông báo kèm ảnh chụp màn hình về Telegram.
                      </span>
                    </div>
                  </label>

                  {/* Daily Digest Setting */}
                  <div className="p-3.5 rounded-2xl border border-indigo-200 bg-indigo-50/40 space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={botConfig.enableDailyDigest !== false}
                        onChange={(e) => setBotConfig({ ...botConfig, enableDailyDigest: e.target.checked })}
                        className="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                      />
                      <div>
                        <span className="text-xs font-bold text-indigo-950 block">🌙 Báo Cáo Tổng Kết Ngày (Daily Digest)</span>
                        <span className="text-[11px] text-indigo-800">
                          Tự động tổng hợp số bài đã đăng, bài lỗi, số nhóm đã phủ sóng và tình trạng tài khoản.
                        </span>
                      </div>
                    </label>

                    <div className="flex items-center gap-3 pl-7">
                      <label className="text-xs font-bold text-slate-700">Giờ gửi báo cáo:</label>
                      <input
                        type="time"
                        value={botConfig.dailyDigestTime || '22:00'}
                        onChange={(e) => setBotConfig({ ...botConfig, dailyDigestTime: e.target.value })}
                        className="liquid-input rounded-xl px-3 py-1.5 text-xs font-bold font-mono text-indigo-900 border border-indigo-300"
                      />
                      <span className="text-[11px] text-slate-500">(Mặc định: 22:00 tối)</span>
                    </div>
                  </div>

                </div>

                {/* Save Button */}
                <div className="pt-3 border-t border-slate-200/80">
                  <button
                    type="submit"
                    disabled={botLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-sm shadow-lg shadow-blue-600/30 transition-all cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    {botLoading ? 'Đang lưu cấu hình...' : 'Lưu Cấu Hình Bot Telegram'}
                  </button>
                </div>

              </div>

            </form>

            {/* Remote Command Cheatsheet Card */}
            <div className="liquid-glass rounded-3xl p-6 md:p-8 space-y-4">
              <div className="border-b border-slate-200/80 pb-3 flex items-center justify-between">
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-teal-100 text-teal-700">
                    <Activity className="w-4 h-4" />
                  </span>
                  Danh Sách Lệnh Điều Khiển Từ Xa (Gõ trên Telegram)
                </h3>
                <span className="text-xs font-semibold text-slate-500">
                  Có sẵn bàn phím bấm nhanh tiện lợi
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                
                <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <code className="text-xs font-black text-blue-700 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                      /status
                    </code>
                    <span className="text-[10px] font-bold text-slate-400">Kiểm tra</span>
                  </div>
                  <p className="text-xs font-bold text-slate-800">Trạng thái hệ thống</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Xem tình trạng 4 server bridge, n8n, 5 chrome profile và số bài đăng thành công trong ngày.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <code className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                      /check_tin
                    </code>
                    <span className="text-[10px] font-bold text-emerald-600">Tin nhắn</span>
                  </div>
                  <p className="text-xs font-bold text-slate-800">Quét tin nhắn các nick</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Quét nhanh tất cả tài khoản Facebook & Fanpage, báo số tin chưa đọc và gửi ảnh hộp thư khách.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <code className="text-xs font-black text-teal-700 bg-teal-50 px-2 py-1 rounded-md border border-teal-200">
                      /screenshot
                    </code>
                    <span className="text-[10px] font-bold text-slate-400">Xem ảnh</span>
                  </div>
                  <p className="text-xs font-bold text-slate-800">Chụp màn hình Chrome</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Chụp trực tiếp tab Chrome đang chạy trên máy tính và gửi ảnh về điện thoại trong 1 giây.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <code className="text-xs font-black text-rose-700 bg-rose-50 px-2 py-1 rounded-md border border-rose-200">
                      /restart
                    </code>
                    <span className="text-[10px] font-bold text-slate-400">Khởi động</span>
                  </div>
                  <p className="text-xs font-bold text-slate-800">Khởi động lại Servers</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Tự động chạy script <code>kill-and-restart.ps1</code> và báo lại khi toàn bộ hệ thống đã online.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <code className="text-xs font-black text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                      /post_now
                    </code>
                    <span className="text-[10px] font-bold text-slate-400">Đăng ngay</span>
                  </div>
                  <p className="text-xs font-bold text-slate-800">Đăng bài khẩn cấp</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Kích hoạt duyệt và xuất bản ngay lập tức một bài viết vào nhóm đang chờ mà không cần chờ lịch.
                  </p>
                </div>

              </div>
            </div>

          </div>
        )}

      </main>

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
                  placeholder={`VD: ChatGPT Tài khoản ${chatgptAccounts.length + 1}`}
                  required
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
                    placeholder={`n8n-chatgpt-profile-${chatgptAccounts.length + 1}`}
                    className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cổng Remote Debug Port:</label>
                  <input
                    type="number"
                    value={newChatGptForm.port}
                    onChange={(e) => setNewChatGptForm({ ...newChatGptForm, port: e.target.value })}
                    placeholder={`VD: ${9240 + chatgptAccounts.length + 1}`}
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên tài khoản (Gợi nhớ):</label>
                <input
                  type="text"
                  value={newAccountForm.name}
                  onChange={(e) => setNewAccountForm({ ...newAccountForm, name: e.target.value })}
                  placeholder={`VD: Tài khoản ${(groupsData.accounts?.length || 0) + 1} (Nick Seeding)`}
                  required
                  className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên thư mục Profile Chrome (UserData):</label>
                <input
                  type="text"
                  value={newAccountForm.profileDir}
                  onChange={(e) => setNewAccountForm({ ...newAccountForm, profileDir: e.target.value })}
                  placeholder={`Mặc định: n8n-fb-group-profile-${(groupsData.accounts?.length || 0) + 1}`}
                  className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono text-xs"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Hệ thống sẽ tạo thư mục lưu cookie/đăng nhập riêng biệt trong AppData</span>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên tài khoản:</label>
                <input
                  type="text"
                  value={editingAccount.name}
                  onChange={(e) => setEditingAccount({ ...editingAccount, name: e.target.value })}
                  required
                  className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Profile Chrome Folder:</label>
                <input
                  type="text"
                  value={editingAccount.profileDir}
                  onChange={(e) => setEditingAccount({ ...editingAccount, profileDir: e.target.value })}
                  required
                  className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono text-xs"
                />
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
                <label className="block text-xs font-bold text-slate-700 mb-1">URL Nhóm Facebook:</label>
                <input
                  type="url"
                  value={newGroupUrl}
                  onChange={(e) => setNewGroupUrl(e.target.value)}
                  placeholder="https://www.facebook.com/groups/..."
                  required
                  className="liquid-input w-full rounded-xl px-3.5 py-2.5 text-sm text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddGroupOpen(false)}
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên Fanpage (Gợi nhớ):</label>
                <input
                  type="text"
                  value={newFanpageForm.name}
                  onChange={(e) => setNewFanpageForm({ ...newFanpageForm, name: e.target.value })}
                  placeholder="VD: Fanpage Bất Động Sản, Fanpage Tin Tức..."
                  required
                  className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Đường link Facebook Fanpage:</label>
                <input
                  type="url"
                  value={newFanpageForm.pageUrl}
                  onChange={(e) => setNewFanpageForm({ ...newFanpageForm, pageUrl: e.target.value })}
                  placeholder="https://www.facebook.com/tenpage hoặc https://www.facebook.com/profile.php?id=..."
                  required
                  className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Thư mục Profile Chrome:</label>
                  <input
                    type="text"
                    value={newFanpageForm.profileDir}
                    onChange={(e) => setNewFanpageForm({ ...newFanpageForm, profileDir: e.target.value })}
                    placeholder="VD: n8n-fanpage-profile-2"
                    className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cổng Remote Port:</label>
                  <input
                    type="number"
                    value={newFanpageForm.port}
                    onChange={(e) => setNewFanpageForm({ ...newFanpageForm, port: e.target.value })}
                    placeholder="Mặc định: 9251+"
                    className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono text-xs"
                  />
                </div>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên Fanpage:</label>
                <input
                  type="text"
                  value={editingFanpage.name}
                  onChange={(e) => setEditingFanpage({ ...editingFanpage, name: e.target.value })}
                  required
                  className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Đường link Facebook Fanpage:</label>
                <input
                  type="url"
                  value={editingFanpage.pageUrl}
                  onChange={(e) => setEditingFanpage({ ...editingFanpage, pageUrl: e.target.value })}
                  required
                  className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Profile Chrome Folder:</label>
                  <input
                    type="text"
                    value={editingFanpage.profileDir}
                    onChange={(e) => setEditingFanpage({ ...editingFanpage, profileDir: e.target.value })}
                    required
                    className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cổng Remote Port:</label>
                  <input
                    type="number"
                    value={editingFanpage.port}
                    onChange={(e) => setEditingFanpage({ ...editingFanpage, port: Number(e.target.value) })}
                    required
                    className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono text-xs"
                  />
                </div>
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên tài khoản (Gợi nhớ):</label>
                <input
                  type="text"
                  value={newPersonalForm.name}
                  onChange={(e) => setNewPersonalForm({ ...newPersonalForm, name: e.target.value })}
                  placeholder="VD: Nick Facebook Cá nhân 2 (Nguyễn Văn A)..."
                  required
                  className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Đường link Trang Cá Nhân:</label>
                <input
                  type="url"
                  value={newPersonalForm.profileUrl}
                  onChange={(e) => setNewPersonalForm({ ...newPersonalForm, profileUrl: e.target.value })}
                  placeholder="https://www.facebook.com/tennick hoặc https://www.facebook.com/"
                  required
                  className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono text-xs"
                />
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
                <label className="block text-xs font-bold text-slate-700 mb-1">Tên tài khoản:</label>
                <input
                  type="text"
                  value={editingPersonal.name}
                  onChange={(e) => setEditingPersonal({ ...editingPersonal, name: e.target.value })}
                  required
                  className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Đường link Trang Cá Nhân:</label>
                <input
                  type="url"
                  value={editingPersonal.profileUrl}
                  onChange={(e) => setEditingPersonal({ ...editingPersonal, profileUrl: e.target.value })}
                  placeholder="https://www.facebook.com/tennick hoặc https://www.facebook.com/"
                  required
                  className="liquid-input w-full rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono text-xs"
                />
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

      {/* ==================== MODAL CHI TIẾT NHẬT KÝ BÀI ĐĂNG (ANALYTICS DETAIL) ==================== */}
      {isDetailModalOpen && selectedHistoryItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="liquid-glass-modal rounded-3xl w-full max-w-2xl p-7 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
              <div className="flex items-center gap-3">
                <span className={`p-2.5 rounded-2xl ${
                  selectedHistoryItem.status === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
                }`}>
                  {selectedHistoryItem.status === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                </span>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900">Chi Tiết Nhật Ký Tác Vụ</h3>
                  <p className="text-xs text-slate-500 font-mono">{selectedHistoryItem.id}</p>
                </div>
              </div>
              <button
                onClick={() => { setIsDetailModalOpen(false); setSelectedHistoryItem(null); }}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-bold block mb-1">Thời gian thực hiện:</span>
                <span className="font-bold text-slate-900">{new Date(selectedHistoryItem.timestamp).toLocaleString('vi-VN')}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-bold block mb-1">Thời lượng xử lý:</span>
                <span className="font-bold text-slate-900">{selectedHistoryItem.durationMs ? `${(selectedHistoryItem.durationMs / 1000).toFixed(2)} giây` : 'N/A'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-bold block mb-1">Kênh xuất bản:</span>
                <span className="font-bold text-blue-700">{selectedHistoryItem.channelName || selectedHistoryItem.channel}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 font-bold block mb-1">Tài khoản ChatGPT:</span>
                <span className="font-bold text-violet-700">{selectedHistoryItem.chatgptAccount || 'Mặc định'}</span>
              </div>
            </div>

            {selectedHistoryItem.targetUrl && (
              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200 text-xs">
                <span className="text-blue-900 font-bold block mb-1">🔗 Đích đến (URL):</span>
                <a
                  href={selectedHistoryItem.targetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline break-all font-mono"
                >
                  {selectedHistoryItem.targetUrl}
                </a>
              </div>
            )}

            {selectedHistoryItem.caption && (
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-800">📝 Nội dung Caption:</label>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
                  {selectedHistoryItem.caption}
                </div>
              </div>
            )}

            {selectedHistoryItem.prompt && (
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-800">🎨 Prompt tạo ảnh AI:</label>
                <div className="p-4 rounded-xl bg-violet-50/50 border border-violet-200 text-xs text-violet-900 italic font-sans leading-relaxed">
                  {selectedHistoryItem.prompt}
                </div>
              </div>
            )}

            {selectedHistoryItem.error && (() => {
              const parsed = parseErrorMessage(selectedHistoryItem.error);
              const hasTechDetails = parsed.technicalDetails || selectedHistoryItem.errorDetails;
              const fullTechDetails = selectedHistoryItem.errorDetails 
                ? (parsed.technicalDetails ? `${parsed.technicalDetails}\n\n--- Stack Trace ---\n${selectedHistoryItem.errorDetails}` : selectedHistoryItem.errorDetails)
                : parsed.technicalDetails;

              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-extrabold text-rose-700 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" /> Nguyên nhân lỗi:
                    </label>
                    <button
                      onClick={() => copyToClipboard(parsed.summary, `detail_err_${selectedHistoryItem.id}`)}
                      className="text-[11px] font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1 bg-rose-100 px-2 py-0.5 rounded-md hover:bg-rose-200 transition-all cursor-pointer"
                    >
                      {copiedId === `detail_err_${selectedHistoryItem.id}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      Sao chép lỗi
                    </button>
                  </div>
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 font-bold leading-relaxed">
                    {parsed.summary}
                  </div>
                  {parsed.suggestion && (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                      💡 <b>Khắc phục:</b> {parsed.suggestion}
                    </div>
                  )}
                  {hasTechDetails && (
                    <details className="mt-2 text-xs">
                      <summary className="text-slate-500 cursor-pointer hover:text-slate-800 font-bold select-none">
                        ⚙️ Xem chi tiết kỹ thuật (Call log & Stack trace)
                      </summary>
                      <pre className="mt-2 p-3 rounded-xl bg-slate-900 text-rose-300 text-[11px] overflow-x-auto font-mono max-h-60 leading-relaxed">
                        {fullTechDetails}
                      </pre>
                    </details>
                  )}
                </div>
              );
            })()}

            <div className="flex justify-between items-center pt-3 border-t border-slate-200/80">
              <button
                type="button"
                onClick={() => handleDeleteHistoryEntry(selectedHistoryItem.id)}
                className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-700 flex items-center gap-1.5 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" /> Xóa bản ghi này
              </button>
              <button
                type="button"
                onClick={() => { setIsDetailModalOpen(false); setSelectedHistoryItem(null); }}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white shadow-md transition-all"
              >
                Đóng
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ==================== MODAL CHI TIẾT LỖI TÁC VỤ (ERROR DETAIL MODAL) ==================== */}
      {viewingErrorItem && (() => {
        const parsed = parseErrorMessage(viewingErrorItem.error);
        const hasTechDetails = parsed.technicalDetails || viewingErrorItem.errorDetails;
        const fullTechDetails = viewingErrorItem.errorDetails 
          ? (parsed.technicalDetails ? `${parsed.technicalDetails}\n\n--- Stack Trace ---\n${viewingErrorItem.errorDetails}` : viewingErrorItem.errorDetails)
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
                      Mã tác vụ: {viewingErrorItem.id} • {new Date(viewingErrorItem.timestamp).toLocaleString('vi-VN')}
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
                  <span className="font-extrabold text-blue-700">{viewingErrorItem.channelName || viewingErrorItem.channel}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 font-bold block mb-0.5">Tài khoản đích:</span>
                  <span className="font-extrabold text-slate-800">{viewingErrorItem.targetName || 'Mặc định'}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 col-span-2 sm:col-span-1">
                  <span className="text-slate-500 font-bold block mb-0.5">Tài khoản AI:</span>
                  <span className="font-extrabold text-violet-700">{viewingErrorItem.chatgptAccount || '—'}</span>
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
                    onClick={() => copyToClipboard(viewingErrorItem.targetUrl!, `url_${viewingErrorItem.id}`)}
                    className="shrink-0 p-1 text-blue-600 hover:bg-blue-100 rounded-lg transition-all cursor-pointer"
                    title="Sao chép link"
                  >
                    {copiedId === `url_${viewingErrorItem.id}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
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
                    {copiedId === `err_msg_${viewingErrorItem.id}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
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
                      onClick={() => copyToClipboard(fullTechDetails || '', `err_tech_${viewingErrorItem.id}`)}
                      className="text-[11px] font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md hover:bg-slate-200 transition-all cursor-pointer"
                    >
                      {copiedId === `err_tech_${viewingErrorItem.id}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
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

    </div>
  );
}
