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
  Play,
  ArrowRight,
  Zap,
  Sliders,
  Cpu,
  Workflow,
  ChevronDown,
  FileSpreadsheet,
  ShieldAlert,
  Lock,
  Unlock,
  ArrowLeftRight,
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

interface RotationConfig {
  enabled: boolean;
  mode: 'daily_alternate' | 'manual';
  activeGroupToday: 'group_1' | 'group_2';
  lastRotatedDate?: string;
  quarantineDays?: number;
}

interface GroupAccount {
  id: string;
  name: string;
  enabled?: boolean;
  status?: string;
  roleGroup?: 'group_1' | 'group_2' | 'quarantine';
  originalRoleGroup?: 'group_1' | 'group_2';
  quarantineUntil?: string | null;
  quarantineReason?: string | null;
  quarantineAt?: string | null;
  cooldownUntil?: string | null;
  disabledReason?: string | null;
  disabledAt?: string | null;
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
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'accounts' | 'groups' | 'schedule' | 'bot'>('overview');
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

  // Schedule & Auto-Pilot State
  const [scheduleConfig, setScheduleConfig] = useState({
    enabled: true,
    aiProvider: 'groq' as 'groq' | 'gemini',
    geminiApiKey: '',
    geminiApiKeys: [] as string[],
    groqApiKey: '',
    groqApiKeys: [] as string[],
    model: 'gemini-2.5-flash',
    groqModel: 'llama-3.3-70b-versatile',
    scheduleTimes: ['08:00', '16:00'],
    channelSchedules: {
      fanpage: { enabled: true, times: ['08:00', '16:00'], sheetByTime: Object.fromEntries<string>([]) },
      groups: { enabled: true, times: ['09:30', '14:00', '20:00'], sheetByTime: Object.fromEntries<string>([]) },
      personal: { enabled: false, times: [] as string[], sheetByTime: Object.fromEntries<string>([]) },
    },
    channels: { fanpage: true, groups: true, personal: false },
    aspectRatio: '4:5',
    hasMascotDu: true,
    googleSheets: {
      enabled: true,
      topicSource: 'google_sheet' as 'google_sheet' | 'manual_list',
      sheetUrl: 'https://docs.google.com/spreadsheets/d/1tx_RHyRfBgGuYTvO3Tr_08Hrp6SelIsfN9hTQaT3jUY/edit',
      spreadsheetId: '1tx_RHyRfBgGuYTvO3Tr_08Hrp6SelIsfN9hTQaT3jUY',
      sheetName: 'topics',
      autoUpdateStatus: true,
      channelSheetMapping: {
        fanpage: 'topics',
        groups: 'content_calendar',
      } as { fanpage?: string; groups?: string; personal?: string },
    },
    topics: [] as string[],
    companyInfo: {
      name: 'DUDI SOFTWARE TECHNOLOGY CO., LTD',
      hotline: '0909 163 821',
      address1: '232 Nguyễn Thị Minh Khai, Phường Xuân Hòa, TP.HCM',
      address2: '49/2 Đường 14, Phường Thủ Đức, TP.HCM',
      mst: '0318776997',
      website: 'https://dudisoftware.com',
      email: 'contact@dudisoftware.com',
      hashtags: '#website #seo #landingpage #marketing #dudisoftware',
    },
    lastRunAt: null as string | null,
    lastTopic: null as string | null,
    lastRunStatus: null as string | null,
  });
  const [scheduleNextRun, setScheduleNextRun] = useState<{ time: string | null; label: string; diffMinutes: number | null }>({
    time: null,
    label: '',
    diffMinutes: null,
  });
  const [isSchedulerRunning, setIsSchedulerRunning] = useState<boolean>(false);
  const [scheduleLoading, setScheduleLoading] = useState<boolean>(false);
  const [scheduleTriggering, setScheduleTriggering] = useState<boolean>(false);

  // n8n Visual Workflow Engine State
  const [channelNextRuns, setChannelNextRuns] = useState<Record<string, { time: string | null; label: string; diffMinutes: number | null }>>({});
  const [newFanpageTime, setNewFanpageTime] = useState<string>('08:00');
  const [newGroupsTime, setNewGroupsTime] = useState<string>('09:30');
  const [newPersonalTime, setNewPersonalTime] = useState<string>('11:30');

  const [workflowAccounts, setWorkflowAccounts] = useState({
    chatgpt: 'acc_1',
    groups: 'all',
    fanpage: 'fanpage_1',
    personal: 'personal_acc_1',
  });
  const [workflowPreset, setWorkflowPreset] = useState<string>('groups_fanpage');
  const [isWorkflowExecuting, setIsWorkflowExecuting] = useState<boolean>(false);
  const [activeWorkflowNode, setActiveWorkflowNode] = useState<string | null>(null);
  const [nodeExecutionStates, setNodeExecutionStates] = useState<Record<string, {
    status: 'idle' | 'running' | 'success' | 'failed' | 'skipped';
    durationMs?: number;
    error?: string | null;
    output?: any;
  }>>({});
  const [inspectingNodeData, setInspectingNodeData] = useState<{ id: string; name: string; data: any } | null>(null);
  const [workflowActiveTab, setWorkflowActiveTab] = useState<'canvas' | 'times' | 'sheets' | 'ai_config'>('canvas');
  const [newScheduleTime, setNewScheduleTime] = useState<string>('09:00');
  const [newTopicInput, setNewTopicInput] = useState<string>('');
  const [showGeminiKeySecret, setShowGeminiKeySecret] = useState<boolean>(false);
  const [newGeminiApiKey, setNewGeminiApiKey] = useState<string>('');
  const [showGroqKeySecret, setShowGroqKeySecret] = useState<boolean>(false);
  const [newGroqApiKey, setNewGroqApiKey] = useState<string>('');
  const [testingAi, setTestingAi] = useState<boolean>(false);
  const [customRunTopic, setCustomRunTopic] = useState<string>('');
  const [autoPilotStep, setAutoPilotStep] = useState<number>(0);
  const [triggerResult, setTriggerResult] = useState<any>(null);
  const [liveProgress, setLiveProgress] = useState<{
    active: boolean;
    step: number;
    stepName: string;
    detail: string;
    progress: number;
    lastResult?: any;
  } | null>(null);
  const [sheetsOverview, setSheetsOverview] = useState<{
    total: number;
    done: number;
    inProgress: number;
    pending: number;
    nextTopic: {
      rowIndex: number;
      id: string;
      topic: string;
      category: string;
      keywords: string;
      status: string;
      publishedAt?: string;
    } | null;
  } | null>(null);
  const [sheetsSyncing, setSheetsSyncing] = useState<boolean>(false);
  const [availableSheets, setAvailableSheets] = useState<string[]>(['topics', 'content_calendar']);
  const [activeSheetTab, setActiveSheetTab] = useState<string>('topics');
  const [accounts, setAccounts] = useState<AccountCategory[]>([]);
  const [groupsData, setGroupsData] = useState<{ accounts: GroupAccount[]; centralPool?: CentralPoolItem[]; rotation?: RotationConfig }>({ accounts: [], centralPool: [] });
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

  // Modal Xuất toàn bộ link Facebook state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFilterAcc, setExportFilterAcc] = useState<string>('all');
  const [exportFilterPostStatus, setExportFilterPostStatus] = useState<string>('all');
  const [exportFilterJoinStatus, setExportFilterJoinStatus] = useState<string>('all');
  const [exportCopied, setExportCopied] = useState(false);

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
    profileUrl: '',
    profileDir: '',
    enabled: true,
    groupUrlsText: '',
  });

  const [isEditAccountOpen, setIsEditAccountOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<{ id: string; name: string; profileUrl?: string; profileDir: string; enabled: boolean } | null>(null);

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
  const [isDetectingName, setIsDetectingName] = useState<boolean>(false);
  const [detectedGroupName, setDetectedGroupName] = useState<string>('');

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
  const [qpChannel, setQpChannel] = useState<'fanpage' | 'groups'>('fanpage');
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

  // Schedule & Auto-Pilot Functions
  const fetchScheduleConfig = async () => {
    try {
      setScheduleLoading(true);
      const res = await fetch('/api/schedule');
      const data = await res.json();
      if (data.ok) {
        setScheduleConfig(data.config);
        setScheduleNextRun(data.nextRun);
        if (data.channelNextRuns) setChannelNextRuns(data.channelNextRuns);
        setIsSchedulerRunning(data.isSchedulerRunning);
        if (data.sheetsOverview) setSheetsOverview(data.sheetsOverview);
        if (data.availableSheets) setAvailableSheets(data.availableSheets);
        if (data.config?.googleSheets?.sheetName) setActiveSheetTab(data.config.googleSheets.sheetName);
      }
    } catch (err: unknown) {
      console.error('Lỗi tải cấu hình lịch đăng:', err);
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleSaveScheduleConfig = async (newCfg: typeof scheduleConfig) => {
    try {
      setScheduleLoading(true);

      // Tự động gộp key dự phòng nếu người dùng đã gõ/dán vào ô nhưng chưa bấm nút [+]
      const updatedGroqApiKeys = [...(newCfg.groqApiKeys || [])];
      const pendingGroq = newGroqApiKey.trim();
      if (pendingGroq) {
        const parts = pendingGroq.split(/[\n,;]+/).map((k) => k.trim()).filter(Boolean);
        for (const part of parts) {
          if (!updatedGroqApiKeys.includes(part) && part !== newCfg.groqApiKey) {
            updatedGroqApiKeys.push(part);
          }
        }
        setNewGroqApiKey('');
      }

      const updatedGeminiApiKeys = [...(newCfg.geminiApiKeys || [])];
      const pendingGemini = newGeminiApiKey.trim();
      if (pendingGemini) {
        const parts = pendingGemini.split(/[\n,;]+/).map((k) => k.trim()).filter(Boolean);
        for (const part of parts) {
          if (!updatedGeminiApiKeys.includes(part) && part !== newCfg.geminiApiKey) {
            updatedGeminiApiKeys.push(part);
          }
        }
        setNewGeminiApiKey('');
      }

      const payload = {
        ...newCfg,
        groqApiKeys: updatedGroqApiKeys,
        geminiApiKeys: updatedGeminiApiKeys,
      };

      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.ok) {
        setScheduleConfig(data.config);
        setScheduleNextRun(data.nextRun);
        if (data.channelNextRuns) setChannelNextRuns(data.channelNextRuns);
        showToast('Đã lưu cấu hình Lịch Đăng & API Key vào file thành công!', 'success');
      } else {
        showToast(data.error || 'Lỗi lưu cấu hình', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('Lỗi: ' + msg, 'error');
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleAddBackupKey = async (provider: 'groq' | 'gemini', rawKey: string) => {
    const key = rawKey.trim();
    if (!key) return showToast('Vui lòng dán key dự phòng trước!', 'info');
    const splitKeys = key.split(/[\n,;]+/).map((k) => k.trim()).filter(Boolean);
    if (splitKeys.length === 0) return;

    if (provider === 'groq') {
      const existing = [scheduleConfig.groqApiKey, ...(scheduleConfig.groqApiKeys || [])];
      const newKeysToAdd = splitKeys.filter((k) => !existing.includes(k));
      if (newKeysToAdd.length === 0) return showToast('Key này đã có trong danh sách!', 'info');
      const updatedList = [...(scheduleConfig.groqApiKeys || []), ...newKeysToAdd];
      setNewGroqApiKey('');
      await handleSaveScheduleConfig({ ...scheduleConfig, groqApiKeys: updatedList });
      showToast(`Đã thêm & LƯU ${newKeysToAdd.length} key Groq dự phòng vào file!`, 'success');
    } else {
      const existing = [scheduleConfig.geminiApiKey, ...(scheduleConfig.geminiApiKeys || [])];
      const newKeysToAdd = splitKeys.filter((k) => !existing.includes(k));
      if (newKeysToAdd.length === 0) return showToast('Key này đã có trong danh sách!', 'info');
      const updatedList = [...(scheduleConfig.geminiApiKeys || []), ...newKeysToAdd];
      setNewGeminiApiKey('');
      await handleSaveScheduleConfig({ ...scheduleConfig, geminiApiKeys: updatedList });
      showToast(`Đã thêm & LƯU ${newKeysToAdd.length} key Gemini dự phòng vào file!`, 'success');
    }
  };

  const handleRemoveBackupKey = async (provider: 'groq' | 'gemini', index: number) => {
    if (provider === 'groq') {
      const updatedList = (scheduleConfig.groqApiKeys || []).filter((_: string, i: number) => i !== index);
      await handleSaveScheduleConfig({ ...scheduleConfig, groqApiKeys: updatedList });
      showToast('Đã xóa key Groq dự phòng và cập nhật file cấu hình!', 'success');
    } else {
      const updatedList = (scheduleConfig.geminiApiKeys || []).filter((_: string, i: number) => i !== index);
      await handleSaveScheduleConfig({ ...scheduleConfig, geminiApiKeys: updatedList });
      showToast('Đã xóa key Gemini dự phòng và cập nhật file cấu hình!', 'success');
    }
  };

  const handleTestAi = async () => {
    if (testingAi) return;
    try {
      setTestingAi(true);
      const isGroq = (scheduleConfig.aiProvider || 'groq') === 'groq';
      showToast(`⚡ Đang gửi yêu cầu test ${isGroq ? 'Groq AI (Llama 3.3)' : 'Gemini AI'} viết bài...`, 'info');
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test-ai',
          topic: customRunTopic || sheetsOverview?.nextTopic?.topic || 'Tối ưu hóa phễu bán hàng và chuyển đổi số cho SME',
          aiProvider: scheduleConfig.aiProvider || 'groq',
          apiKey: (isGroq ? scheduleConfig.groqApiKey : scheduleConfig.geminiApiKey) || '',
          model: (isGroq ? scheduleConfig.groqModel : scheduleConfig.model) || '',
        }),
      });
      const data = await res.json();
      if (data.ok && data.data) {
        showToast(`🎉 [${(data.data.provider || 'AI').toUpperCase()}] Test thành công: "${data.data.title}"`, 'success');
      } else {
        showToast(`❌ Lỗi test AI: ${data.error || 'Không rõ nguyên nhân'}`, 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`❌ Lỗi kết nối: ${msg}`, 'error');
    } finally {
      setTestingAi(false);
    }
  };

  const handleSyncGoogleSheets = async (targetName?: string) => {
    try {
      setSheetsSyncing(true);
      const sid = scheduleConfig.googleSheets?.spreadsheetId || '1tx_RHyRfBgGuYTvO3Tr_08Hrp6SelIsfN9hTQaT3jUY';
      const sname = targetName || activeSheetTab || scheduleConfig.googleSheets?.sheetName || 'topics';
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sheets-info', spreadsheetId: sid, sheetName: sname }),
      });
      const data = await res.json();
      if (data.ok && data.sheetsInfo) {
        setSheetsOverview(data.sheetsInfo);
        if (data.availableSheets) setAvailableSheets(data.availableSheets);
        showToast(`Đã đồng bộ Sheet [${sname}]! Còn ${data.sheetsInfo.pending} chủ đề đang chờ đăng.`, 'success');
      } else {
        showToast(data.error || 'Lỗi đồng bộ Google Sheets', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('Lỗi: ' + msg, 'error');
    } finally {
      setSheetsSyncing(false);
    }
  };

  const handleSwitchSheetTab = async (sheetName: string) => {
    setActiveSheetTab(sheetName);
    try {
      setSheetsSyncing(true);
      const sid = scheduleConfig.googleSheets?.spreadsheetId || '1tx_RHyRfBgGuYTvO3Tr_08Hrp6SelIsfN9hTQaT3jUY';
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sheets-info', spreadsheetId: sid, sheetName }),
      });
      const data = await res.json();
      if (data.ok && data.sheetsInfo) {
        setSheetsOverview(data.sheetsInfo);
        if (data.availableSheets) setAvailableSheets(data.availableSheets);
      }
      const updatedConfig = {
        ...scheduleConfig,
        googleSheets: {
          ...scheduleConfig.googleSheets,
          sheetName,
        }
      };
      setScheduleConfig(updatedConfig as any);
      await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleSheets: { sheetName }
        }),
      });
      showToast(`Đã chuyển sang xem Sheet [${sheetName}]!`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('Lỗi: ' + msg, 'error');
    } finally {
      setSheetsSyncing(false);
    }
  };

  const handleUpdateChannelSheetMapping = async (channel: 'fanpage' | 'groups' | 'personal', sheetName: string) => {
    const currentMapping = scheduleConfig.googleSheets?.channelSheetMapping || {
      fanpage: scheduleConfig.googleSheets?.sheetName || 'topics',
      groups: scheduleConfig.googleSheets?.sheetName || 'topics',
      personal: scheduleConfig.googleSheets?.sheetName || 'topics',
    };
    const updatedMapping = { ...currentMapping, [channel]: sheetName };
    const updatedCfg = {
      ...scheduleConfig,
      googleSheets: {
        ...scheduleConfig.googleSheets,
        channelSheetMapping: updatedMapping,
      }
    };
    setScheduleConfig(updatedCfg as any);
    try {
      await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          googleSheets: { channelSheetMapping: updatedMapping }
        }),
      });
      const chTitle = channel === 'fanpage' ? 'Fanpage' : channel === 'groups' ? `${facebookGroupCount} Nhóm FB` : 'Trang Cá Nhân';
      showToast(`Đã gán kênh ${chTitle} lấy bài từ Sheet [${sheetName}]!`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('Lỗi lưu cấu hình nguồn sheet: ' + msg, 'error');
    }
  };

  const handleTriggerAutoPilot = async (customTopic?: string, channelKey?: 'fanpage' | 'groups' | 'personal' | 'all') => {
    if (scheduleTriggering) return;
    try {
      setScheduleTriggering(true);
      setTriggerResult(null);
      setLiveProgress({
        active: true,
        step: 1,
        stepName: 'Đọc chủ đề',
        detail: 'Hệ thống đang chuẩn bị và lấy chủ đề...',
        progress: 15,
      });

      let effectiveChannels = { ...scheduleConfig.channels };
      let label = 'tất cả kênh kích hoạt';
      if (channelKey === 'fanpage') {
        effectiveChannels = { fanpage: true, groups: false, personal: false };
        label = 'Fanpage';
      } else if (channelKey === 'groups') {
        effectiveChannels = { fanpage: false, groups: true, personal: false };
        label = `${facebookGroupCount} Nhóm FB`;
      } else if (channelKey === 'personal') {
        effectiveChannels = { fanpage: false, groups: false, personal: true };
        label = 'Trang Cá Nhân';
      }

      const mappingKey = (channelKey === 'fanpage' || channelKey === 'groups' || channelKey === 'personal') ? channelKey : undefined;
      const assignedSheet = (mappingKey && scheduleConfig.googleSheets?.channelSheetMapping?.[mappingKey])
        || scheduleConfig.googleSheets?.sheetName
        || activeSheetTab
        || 'topics';

      showToast(`🚀 Bắt đầu ĐĂNG NGAY lên ${label}! Nguồn: Sheet [${assignedSheet}]. Nút đăng đã khóa để chống trùng lặp.`, 'info');

      // Polling tiến độ thời gian thực mỗi 1s từ backend
      const pollTimer = setInterval(async () => {
        try {
          const pRes = await fetch('/api/schedule?action=progress');
          const pData = await pRes.json();
          if (pData.ok && pData.progress) {
            setLiveProgress(pData.progress);
          }
        } catch {}
      }, 1000);

      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'trigger',
          topic: customTopic || undefined,
          sheetName: assignedSheet,
          channels: effectiveChannels,
          accounts: {
            chatgpt: workflowAccounts.chatgpt,
            groups: workflowAccounts.groups === 'all' ? undefined : workflowAccounts.groups,
            fanpage: workflowAccounts.fanpage,
            personal: workflowAccounts.personal,
          },
        }),
      });

      clearInterval(pollTimer);

      const data = await res.json();
      if (data.ok && data.result) {
        setTriggerResult(data.result);
        setLiveProgress({
          active: false,
          step: 6,
          stepName: 'Hoàn tất xuất sắc',
          detail: 'Đã hoàn tất đăng bài thành công lên Facebook!',
          progress: 100,
          lastResult: data.result,
        });
        showToast(`🎉 Đã đăng bài thành công lên ${label}!`, 'success');
        fetchScheduleConfig();
      } else {
        throw new Error(data.error || 'Lỗi khi thực hiện đăng ngay');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLiveProgress({
        active: false,
        step: -1,
        stepName: 'Gặp sự cố',
        detail: msg,
        progress: 0,
      });
      showToast(`❌ Lỗi đăng bài: ${msg}`, 'error');
    } finally {
      setScheduleTriggering(false);
    }
  };

  // Channel-Specific Schedule Handlers
  const handleSlotSheetChange = (channelKey: 'fanpage' | 'groups' | 'personal', time: string, sheetName: string) => {
    const channel = scheduleConfig.channelSchedules[channelKey];
    const newCfg = {
      ...scheduleConfig,
      channelSchedules: {
        ...scheduleConfig.channelSchedules,
        [channelKey]: { ...channel, sheetByTime: { ...channel.sheetByTime, [time]: sheetName } },
      },
    };
    setScheduleConfig(newCfg);
    handleSaveScheduleConfig(newCfg);
  };

  const renderSlotSheetSelect = (channelKey: 'fanpage' | 'groups' | 'personal', time: string) => {
    const selected = scheduleConfig.channelSchedules?.[channelKey]?.sheetByTime?.[time]
      || scheduleConfig.googleSheets?.channelSheetMapping?.[channelKey]
      || scheduleConfig.googleSheets?.sheetName || 'topics';
    return (
      <select
        aria-label={`Sheet cho ${channelKey} lúc ${time}`}
        value={selected}
        onChange={(event) => handleSlotSheetChange(channelKey, time, event.target.value)}
        className="min-w-0 rounded-lg border border-current bg-white px-2 py-1 text-xs font-bold"
      >
        {Array.from(new Set([...availableSheets, selected])).map((sheet) => (
          <option key={sheet} value={sheet}>{sheet}</option>
        ))}
      </select>
    );
  };

  const handleAddChannelTime = (channelKey: 'fanpage' | 'groups' | 'personal', timeStr: string) => {
    if (!timeStr) return;
    const currentChannel = scheduleConfig.channelSchedules?.[channelKey] || { enabled: true, times: [] };
    if (currentChannel.times.includes(timeStr)) {
      return showToast('Mốc giờ này đã có trong danh sách kênh!', 'info');
    }
    const updatedTimes = [...currentChannel.times, timeStr].sort();
    const updatedChannelSchedules = {
      ...scheduleConfig.channelSchedules,
      [channelKey]: {
        ...currentChannel,
        times: updatedTimes,
        sheetByTime: {
          ...currentChannel.sheetByTime,
          [timeStr]: scheduleConfig.googleSheets?.channelSheetMapping?.[channelKey]
            || scheduleConfig.googleSheets?.sheetName || 'topics',
        },
      },
    };
    const newCfg = { ...scheduleConfig, channelSchedules: updatedChannelSchedules };
    setScheduleConfig(newCfg);
    handleSaveScheduleConfig(newCfg);
    showToast(`Đã thêm mốc giờ ${timeStr} cho kênh ${channelKey.toUpperCase()}!`, 'success');
  };

  const handleToggleChannel = (channelKey: 'fanpage' | 'groups' | 'personal') => {
    const currentVal = Boolean(scheduleConfig.channels?.[channelKey]);
    const newVal = !currentVal;

    const currentChannel = scheduleConfig.channelSchedules?.[channelKey] || { enabled: true, times: [] };
    const updatedChannelSchedules = {
      ...scheduleConfig.channelSchedules,
      [channelKey]: { ...currentChannel, enabled: newVal },
    };

    const newCfg = {
      ...scheduleConfig,
      channels: {
        ...scheduleConfig.channels,
        [channelKey]: newVal,
      },
      channelSchedules: updatedChannelSchedules,
    };

    setScheduleConfig(newCfg);
    handleSaveScheduleConfig(newCfg);
    const channelName = channelKey === 'fanpage' ? 'Facebook Fanpage' : channelKey === 'groups' ? `${facebookGroupCount} Nhóm Facebook` : 'Facebook Cá Nhân';
    showToast(`Đã ${newVal ? 'BẬT' : 'TẮT'} đăng lên ${channelName}!`, 'success');
  };

  const handleRemoveChannelTime = (channelKey: 'fanpage' | 'groups' | 'personal', timeStr: string) => {
    const currentChannel = scheduleConfig.channelSchedules?.[channelKey] || { enabled: true, times: [] };
    const updatedTimes = currentChannel.times.filter((t: string) => t !== timeStr);
    const sheetByTime = { ...currentChannel.sheetByTime };
    delete sheetByTime[timeStr];
    const updatedChannelSchedules = {
      ...scheduleConfig.channelSchedules,
      [channelKey]: { ...currentChannel, times: updatedTimes, sheetByTime },
    };
    const newCfg = { ...scheduleConfig, channelSchedules: updatedChannelSchedules };
    setScheduleConfig(newCfg);
    handleSaveScheduleConfig(newCfg);
  };

  // n8n Workflow Preset Handler
  const handleApplyWorkflowPreset = (preset: string) => {
    setWorkflowPreset(preset);
    let updatedChannels = { ...scheduleConfig.channels };

    if (preset === 'groups_fanpage') {
      updatedChannels = { groups: true, fanpage: true, personal: false };
      showToast('Đã áp dụng mẫu: Đăng Nhóm FB rồi lên Fanpage!', 'info');
    } else if (preset === 'all') {
      updatedChannels = { groups: true, fanpage: true, personal: true };
      showToast('Đã áp dụng mẫu: Đăng Toàn Diện (Nhóm + Fanpage + Cá Nhân)!', 'info');
    } else if (preset === 'groups_only') {
      updatedChannels = { groups: true, fanpage: false, personal: false };
      showToast(`Đã áp dụng mẫu: Chỉ đăng vào ${facebookGroupCount} Nhóm FB!`, 'info');
    } else if (preset === 'fanpage_only') {
      updatedChannels = { groups: false, fanpage: true, personal: false };
      showToast('Đã áp dụng mẫu: Chỉ đăng lên Facebook Fanpage!', 'info');
    } else if (preset === 'personal_only') {
      updatedChannels = { groups: false, fanpage: false, personal: true };
      showToast('Đã áp dụng mẫu: Chỉ đăng lên Trang Cá Nhân!', 'info');
    }

    const newCfg = { ...scheduleConfig, channels: updatedChannels };
    setScheduleConfig(newCfg);
    handleSaveScheduleConfig(newCfg);
  };

  // Test single node (giống "Test step" trong n8n)
  const handleTestSingleNode = async (nodeType: string) => {
    try {
      setNodeExecutionStates((prev) => ({
        ...prev,
        [nodeType]: { status: 'running' },
      }));
      showToast(`⚡ Đang test riêng Node [${nodeType.toUpperCase()}]...`, 'info');

      let payload: any = {};
      if (nodeType === 'sheets') {
        payload = {};
      } else if (nodeType === 'gemini' || nodeType === 'groq' || nodeType === 'ai') {
        payload = { topic: customRunTopic || sheetsOverview?.nextTopic?.topic || 'Tối ưu hóa phễu bán hàng và chuyển đổi số' };
      } else if (nodeType === 'chatgpt') {
        payload = {
          prompt: '3D vinyl Mascot Du bear in modern software high-tech workspace, cinematic lighting, realistic render',
          aspectRatio: scheduleConfig.aspectRatio || '4:5',
          hasMascotDu: scheduleConfig.hasMascotDu,
          chatgptAccount: workflowAccounts.chatgpt,
        };
      } else if (nodeType === 'groups') {
        payload = {
          caption: '🚀 [TEST NODE] Bài viết thử nghiệm tính năng đăng nhóm từ n8n Workflow Engine!',
          targetAccounts: workflowAccounts.groups === 'all' ? undefined : workflowAccounts.groups,
        };
      } else if (nodeType === 'fanpage') {
        payload = {
          caption: '📢 [TEST NODE] Bài viết thử nghiệm tính năng đăng Fanpage từ n8n Workflow Engine!',
        };
      } else if (nodeType === 'personal') {
        payload = {
          caption: '👤 [TEST NODE] Bài viết thử nghiệm đăng Profile Cá Nhân từ n8n Workflow Engine!',
        };
      } else if (nodeType === 'update_sheet') {
        payload = {
          rowIndex: sheetsOverview?.nextTopic?.rowIndex || 2,
          status: 'done',
        };
      }

      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'execute_node', nodeType, payload }),
      });

      const data = await res.json();
      if (data.ok) {
        const outData = data.result?.data || data.result;
        setNodeExecutionStates((prev) => ({
          ...prev,
          [nodeType]: {
            status: 'success',
            durationMs: data.result?.durationMs || 1200,
            output: outData,
          },
        }));
        showToast(`✅ Node [${nodeType.toUpperCase()}] chạy thành công!`, 'success');
      } else {
        throw new Error(data.error || 'Lỗi thực thi node');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setNodeExecutionStates((prev) => ({
        ...prev,
        [nodeType]: { status: 'failed', error: msg },
      }));
      showToast(`❌ Lỗi test node [${nodeType}]: ${msg}`, 'error');
    }
  };

  // Execute full workflow (giống "Execute workflow" trong n8n)
  const handleExecuteFullWorkflow = async () => {
    try {
      setIsWorkflowExecuting(true);
      setTriggerResult(null);

      // Reset states
      const initialStates: Record<string, any> = {
        sheets: { status: scheduleConfig.googleSheets?.enabled ? 'running' : 'skipped' },
        gemini: { status: 'idle' },
        chatgpt: { status: 'idle' },
        groups: { status: scheduleConfig.channels?.groups ? 'idle' : 'skipped' },
        fanpage: { status: scheduleConfig.channels?.fanpage ? 'idle' : 'skipped' },
        personal: { status: scheduleConfig.channels?.personal ? 'idle' : 'skipped' },
        finalize: { status: 'idle' },
      };
      setNodeExecutionStates(initialStates);
      setActiveWorkflowNode('sheets');
      showToast('🚀 Khởi động n8n Workflow: Đang đọc chủ đề...', 'info');

      // Visual stepper
      const timer1 = setTimeout(() => {
        setActiveWorkflowNode('gemini');
        setNodeExecutionStates((prev) => ({
          ...prev,
          sheets: { status: 'success', durationMs: 420 },
          gemini: { status: 'running' },
        }));
      }, 1500);

      const timer2 = setTimeout(() => {
        setActiveWorkflowNode('chatgpt');
        setNodeExecutionStates((prev) => ({
          ...prev,
          gemini: { status: 'success', durationMs: 3800 },
          chatgpt: { status: 'running' },
        }));
      }, 7000);

      const timer3 = setTimeout(() => {
        setActiveWorkflowNode('publishers');
        setNodeExecutionStates((prev) => ({
          ...prev,
          chatgpt: { status: 'success', durationMs: 42000 },
          groups: scheduleConfig.channels?.groups ? { status: 'running' } : { status: 'skipped' },
          fanpage: scheduleConfig.channels?.fanpage ? { status: 'running' } : { status: 'skipped' },
          personal: scheduleConfig.channels?.personal ? { status: 'running' } : { status: 'skipped' },
        }));
      }, 48000);

      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute_workflow',
          topic: customRunTopic || undefined,
          channels: scheduleConfig.channels,
          accounts: {
            chatgpt: workflowAccounts.chatgpt,
            groups: workflowAccounts.groups === 'all' ? undefined : workflowAccounts.groups,
            fanpage: workflowAccounts.fanpage,
            personal: workflowAccounts.personal,
          },
        }),
      });

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      const data = await res.json();
      if (data.ok && data.result) {
        setTriggerResult(data.result);
        const resList = data.result.publishResults || [];
        const groupsRes = resList.find((r: any) => r.channel === 'groups');
        const fanpageRes = resList.find((r: any) => r.channel === 'fanpage');
        const personalRes = resList.find((r: any) => r.channel === 'personal');

        setNodeExecutionStates({
          sheets: { status: 'success', durationMs: 350, output: data.result.topic },
          gemini: { status: 'success', durationMs: 3500, output: { title: data.result.title, caption: data.result.caption } },
          chatgpt: { status: 'success', durationMs: 38000, output: { imagePrompt: data.result.imagePrompt, imageBase64: data.result.imageBase64 } },
          groups: scheduleConfig.channels?.groups
            ? { status: groupsRes?.success ? 'success' : 'failed', durationMs: 4500, output: groupsRes }
            : { status: 'skipped' },
          fanpage: scheduleConfig.channels?.fanpage
            ? { status: fanpageRes?.success ? 'success' : 'failed', durationMs: 3200, output: fanpageRes }
            : { status: 'skipped' },
          personal: scheduleConfig.channels?.personal
            ? { status: personalRes?.success ? 'success' : 'failed', durationMs: 2900, output: personalRes }
            : { status: 'skipped' },
          finalize: { status: 'success', durationMs: 800, output: 'Hoàn tất cập nhật Google Sheet & Telegram' },
        });

        setActiveWorkflowNode(null);
        showToast('🎉 Toàn bộ quy trình n8n đã hoàn tất xuất bản thành công!', 'success');
        fetchScheduleConfig();
      } else {
        throw new Error(data.error || 'Lỗi khi thực thi workflow');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`❌ Lỗi thực thi quy trình: ${msg}`, 'error');
      setActiveWorkflowNode(null);
    } finally {
      setIsWorkflowExecuting(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchAccounts();
    fetchGroups();
    fetchAnalytics(1);
    fetchBotConfig();
    fetchScheduleConfig();
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

  // Tự động nhận diện tên Fanpage / Group / Profile từ link Facebook
  const handleAutoDetectFbName = async (url: string, targetForm: 'newFanpage' | 'editFanpage' | 'newGroup' | 'newPersonal' | 'editPersonal' | 'newGroupAccount' | 'editGroupAccount') => {
    if (!url || !url.includes('facebook.com')) return;
    setIsDetectingName(true);
    try {
      const res = await fetch(`/api/facebook/lookup-name?url=${encodeURIComponent(url.trim())}`);
      const data = await res.json();
      if (data?.ok && data.name) {
        if (targetForm === 'newFanpage') {
          setNewFanpageForm(prev => ({ ...prev, name: data.name }));
          showToast(`Đã tự động nhận diện tên: "${data.name}"`, 'success');
        } else if (targetForm === 'editFanpage') {
          setEditingFanpage(prev => prev ? ({ ...prev, name: data.name }) : null);
          showToast(`Đã cập nhật tên: "${data.name}"`, 'success');
        } else if (targetForm === 'newGroup') {
          setDetectedGroupName(data.name);
          showToast(`Đã nhận diện nhóm: "${data.name}"`, 'success');
        } else if (targetForm === 'newPersonal') {
          setNewPersonalForm(prev => ({ ...prev, name: data.name }));
          showToast(`Đã nhận diện tên: "${data.name}"`, 'success');
        } else if (targetForm === 'editPersonal') {
          setEditingPersonal(prev => prev ? ({ ...prev, name: data.name }) : null);
          showToast(`Đã cập nhật tên: "${data.name}"`, 'success');
        } else if (targetForm === 'newGroupAccount') {
          setNewAccountForm(prev => ({ ...prev, name: data.name }));
          showToast(`Đã tự động nhận diện tên: "${data.name}"`, 'success');
        } else if (targetForm === 'editGroupAccount') {
          setEditingAccount(prev => prev ? ({ ...prev, name: data.name }) : null);
          showToast(`Đã cập nhật tên: "${data.name}"`, 'success');
        }
      }
    } catch {
      // ignore
    } finally {
      setIsDetectingName(false);
    }
  };

  // Fanpage CRUD Handlers
  const handleCreateFanpage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let finalName = newFanpageForm.name?.trim();
      if (!finalName && newFanpageForm.pageUrl) {
        try {
          const lookupRes = await fetch(`/api/facebook/lookup-name?url=${encodeURIComponent(newFanpageForm.pageUrl.trim())}`);
          const lookupData = await lookupRes.json();
          if (lookupData?.ok && lookupData.name) {
            finalName = lookupData.name;
          }
        } catch {}
      }

      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_fanpage',
          name: finalName || '',
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
      let finalName = newPersonalForm.name?.trim();
      if (!finalName && newPersonalForm.profileUrl) {
        try {
          const lookupRes = await fetch(`/api/facebook/lookup-name?url=${encodeURIComponent(newPersonalForm.profileUrl.trim())}`);
          const lookupData = await lookupRes.json();
          if (lookupData?.ok && lookupData.name) {
            finalName = lookupData.name;
          }
        } catch {}
      }

      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_personal',
          name: finalName || '',
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
      let finalName = newAccountForm.name.trim();
      if (!finalName && newAccountForm.profileUrl) {
        try {
          const lookupRes = await fetch(`/api/facebook/lookup-name?url=${encodeURIComponent(newAccountForm.profileUrl.trim())}`);
          const lookupData = await lookupRes.json();
          if (lookupData?.ok && lookupData.name) {
            finalName = lookupData.name;
          }
        } catch {}
      }
      const name = finalName || `Tài khoản ${nextIndex}`;
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
          profileUrl: newAccountForm.profileUrl,
          profileDir,
          enabled: newAccountForm.enabled,
          groupUrls,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        showToast(data.message, 'success');
        setIsAddAccountOpen(false);
        setNewAccountForm({ name: '', profileUrl: '', profileDir: '', enabled: true, groupUrlsText: '' });
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
      profileUrl: acc.url || '',
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
          profileUrl: editingAccount.profileUrl,
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
    if (!confirm('Khởi động lại toàn bộ hệ thống (Dashboard Port 3000 + 2 Server Bridge 3001, 3002)?')) return;
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
        setDetectedGroupName('');
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

  // Helper lọc và lấy danh sách link để xuất
  const getExportablePoolItems = () => {
    const allItems: CentralPoolItem[] = [...(groupsData.centralPool || [])];
    const seenUrls = new Set(allItems.map((p) => p.url));
    for (const acc of groupsData.accounts || []) {
      for (const u of acc.groupUrls || []) {
        if (!seenUrls.has(u)) {
          seenUrls.add(u);
          allItems.push({
            id: u,
            url: u,
            addedAt: '',
            assignedAccountId: acc.id,
            assignedAccountName: acc.name,
            joinedStatus: 'unknown',
            lastPostStatus: 'not_posted',
          });
        }
      }
    }

    return allItems.filter((item) => {
      if (exportFilterAcc !== 'all') {
        if (exportFilterAcc === 'unassigned') {
          if (item.assignedAccountId) return false;
        } else {
          if (item.assignedAccountId !== exportFilterAcc) return false;
        }
      }
      if (exportFilterPostStatus !== 'all') {
        const postStatus = item.lastPostStatus || 'not_posted';
        if (exportFilterPostStatus !== postStatus) return false;
      }
      if (exportFilterJoinStatus !== 'all') {
        const joinStatus = item.joinedStatus || 'unknown';
        if (exportFilterJoinStatus !== joinStatus) return false;
      }
      return true;
    });
  };

  // Xuất file .TXT (Mỗi dòng 1 link)
  const handleExportTxt = () => {
    const items = getExportablePoolItems();
    if (items.length === 0) {
      return showToast('Không có link nào để xuất!', 'info');
    }
    const textContent = items.map((it) => it.url).join('\n');
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `danh_sach_link_fb_${items.length}_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast(`Đã xuất thành công ${items.length} link ra file .TXT!`, 'success');
  };

  // Xuất file .CSV (Excel chi tiết đầy đủ cột)
  const handleExportCsv = () => {
    const items = getExportablePoolItems();
    if (items.length === 0) {
      return showToast('Không có link nào để xuất!', 'info');
    }
    const headers = [
      'STT',
      'URL Facebook',
      'Tên nhóm',
      'Nick phụ trách',
      'Trạng thái nhóm',
      'Trạng thái đăng bài',
      'Thời gian đăng gần nhất',
      'Lỗi đăng bài',
    ];

    const escapeCsv = (val: string | number | undefined | null) => {
      if (val === undefined || val === null) return '""';
      const s = String(val).replace(/"/g, '""');
      return `"${s}"`;
    };

    const getJoinText = (st?: string) => {
      if (st === 'joined') return 'Đã tham gia';
      if (st === 'pending') return 'Đang chờ duyệt';
      if (st === 'not_joined') return 'Chưa tham gia';
      return 'Chưa xác định';
    };

    const getPostText = (st?: string) => {
      if (st === 'success') return 'Đã đăng thành công';
      if (st === 'failed') return 'Gặp lỗi đăng bài';
      return 'Chưa đăng';
    };

    const rows = items.map((item, idx) => {
      const acc = groupsData.accounts?.find((a) => a.id === item.assignedAccountId);
      const accName = acc?.name || item.assignedAccountName || (item.assignedAccountId ? item.assignedAccountId : 'Chưa gán');
      return [
        escapeCsv(idx + 1),
        escapeCsv(item.url),
        escapeCsv(item.name || ''),
        escapeCsv(accName),
        escapeCsv(getJoinText(item.joinedStatus)),
        escapeCsv(getPostText(item.lastPostStatus)),
        escapeCsv(item.lastPostedAt ? new Date(item.lastPostedAt).toLocaleString('vi-VN') : ''),
        escapeCsv(item.lastPostError || ''),
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `danh_sach_link_fb_chi_tiet_${items.length}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast(`Đã xuất thành công ${items.length} link ra file .CSV (Excel)!`, 'success');
  };

  // Sao chép toàn bộ link vào Clipboard
  const handleCopyExportLinks = async () => {
    const items = getExportablePoolItems();
    if (items.length === 0) {
      return showToast('Không có link nào để sao chép!', 'info');
    }
    const text = items.map((it) => it.url).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setExportCopied(true);
      setTimeout(() => setExportCopied(false), 2000);
      showToast(`Đã sao chép ${items.length} link vào Clipboard!`, 'success');
    } catch {
      showToast('Không thể sao chép vào Clipboard, vui lòng thử lại', 'error');
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

  // ================= 3 NHÓM LÁCH BAN FB HANDLERS =================
  const handleSwitchActiveGroup = async (targetGroup?: 'group_1' | 'group_2') => {
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'switch_active_group', targetGroup }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.message, 'success');
        fetchGroups();
      } else {
        showToast(data.error || 'Lỗi đổi ca đăng bài', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, 'error');
    }
  };

  const handleChangeRoleGroup = async (
    accountId: string,
    roleGroup: 'group_1' | 'group_2' | 'quarantine'
  ) => {
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change_role_group', accountId, roleGroup }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.message, 'success');
        fetchGroups();
      } else {
        showToast(data.error || 'Lỗi chuyển nhóm', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, 'error');
    }
  };

  const handleReleaseQuarantine = async (accountId: string) => {
    if (!confirm('Bạn có chắc chắn muốn giải phóng tài khoản này khỏi khu cách ly sớm?')) return;
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'release_quarantine', accountId }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.message, 'success');
        fetchGroups();
      } else {
        showToast(data.error || 'Lỗi giải phóng cách ly', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, 'error');
    }
  };

  const handleToggleRotation = async (enabled: boolean) => {
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_rotation', enabled }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(data.message, 'success');
        fetchGroups();
      } else {
        showToast(data.error || 'Lỗi cập nhật cấu hình luân phiên', 'error');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg, 'error');
    }
  };

  const formatCountdown = (untilStr?: string | null): string => {
    if (!untilStr) return 'Đang cách ly';
    const diff = new Date(untilStr).getTime() - Date.now();
    if (diff <= 0) return 'Đã hết hạn cách ly (Sẵn sàng phục hồi)';
    const days = Math.floor(diff / (24 * 3600 * 1000));
    const hours = Math.floor((diff % (24 * 3600 * 1000)) / (3600 * 1000));
    const minutes = Math.floor((diff % (3600 * 1000)) / (60 * 1000));
    if (days > 0) return `${days} ngày ${hours} giờ nữa`;
    if (hours > 0) return `${hours} giờ ${minutes} phút nữa`;
    return `${minutes} phút nữa`;
  };

  const executeQuickPublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qpCaption.trim()) return showToast('Vui lòng nhập nội dung caption!', 'error');

    setQpLoading(true);
    setQpResult(null);
    showToast('Đang bắt đầu tiến trình tạo ảnh ChatGPT & Đăng bài...', 'info');

    try {
      // 1. Generate Image — dùng /api/bridge proxy để không hardcode port
      const genRes = await fetch('/api/bridge?target=fanpage&path=/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_chatgpt_image',
          prompt: qpPrompt || 'Professional marketing image for Vietnamese software enterprise',
          aspectRatio: qpAspect,
          referenceImageUrl: qpHasDu ? 'https://res.cloudinary.com/dbwahdjzg/image/upload/v1789449519/nail_DU_hjqnmq.png' : null,
        }),
      });

      const genData = await genRes.json();
      if (!genData.imageBase64) throw new Error(genData.error || 'ChatGPT không thể tạo ảnh');

      showToast('Tạo ảnh xong! Đang xuất bản lên Facebook...', 'success');

      // 2. Publish to Target - Lấy link trực tiếp từ cấu hình đang bật trên Dashboard
      const fanpageAcc = accounts.find(c => c.category === 'fanpage')?.items.find(i => i.enabled !== false);
      const fanpageUrl = fanpageAcc?.pageUrl || fanpageAcc?.url;

      // Dùng /api/bridge proxy để không hardcode port — port đọc từ schedule-config.json
      let pubUrl = '/api/bridge?target=fanpage&path=/generate';
      let pubBody: Record<string, unknown> = {
        action: 'publish_facebook_page',
        ...(fanpageUrl ? { pageUrl: fanpageUrl } : {}),
        caption: qpCaption,
        imageBase64: genData.imageBase64,
      };

      if (qpChannel === 'groups') {
        pubUrl = '/api/bridge?target=groups&path=/post-groups';
        pubBody = { caption: qpCaption, imageBase64: genData.imageBase64 };
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
  const facebookGroupCount = poolStats.total || groupsData.centralPool?.length || totalGroupsCount;
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
              onClick={() => { setActiveTab('schedule'); fetchScheduleConfig(); }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 ${
                activeTab === 'schedule'
                  ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white shadow-md shadow-violet-600/25 font-bold'
                  : 'text-slate-600 hover:text-violet-700 hover:bg-white/60'
              }`}
            >
              <Workflow className="w-4 h-4 text-amber-300" /> Quy Trình AI (n8n Engine)
              {scheduleConfig.enabled && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              )}
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
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
                      {facebookGroupCount}
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
                  onClick={() => setActiveTab('groups')}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 transition-all flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" /> Quản lý Link Nhóm FB
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
                )}

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
        )}

        {/* ==================== TAB: LỊCH ĐĂNG TỰ ĐỘNG & GEMINI AUTO-PILOT ==================== */}
        {activeTab === 'schedule' && (
          <div className="space-y-8 max-w-6xl mx-auto">
            
            {/* Header Banner */}
            <div className="rounded-3xl p-6 md:p-8 relative overflow-hidden bg-white border border-slate-200 shadow-sm text-slate-900">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 shrink-0">
                      <Workflow className="w-6 h-6 text-indigo-600" />
                    </span>
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold tracking-tight flex flex-wrap items-center gap-2.5 text-slate-900">
                        Thiết Lập Quy Trình Chạy (n8n Workflow Engine)
                        <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 whitespace-nowrap">
                          Khép Kín 100%
                        </span>
                      </h2>
                      <p className="text-sm text-slate-600 font-medium leading-relaxed mt-2 max-w-2xl">
                        Tùy chọn linh hoạt các bước: Đọc Google Sheet &rarr; Gemini viết bài &rarr; ChatGPT tạo ảnh &rarr; Đăng Nhóm FB &rarr; Đăng Fanpage theo tài khoản cấu hình
                      </p>
                    </div>
                  </div>
                </div>

                {/* Master Switch & Status */}
                <div className="flex items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 shrink-0">
                  <div className="text-right">
                    <div className="text-xs font-semibold text-slate-600 whitespace-nowrap">Lịch Trình Tự Động</div>
                    <div className={`text-sm font-black ${scheduleConfig.enabled ? 'text-emerald-700' : 'text-slate-600'}`}>
                      {scheduleConfig.enabled ? 'ĐANG BẬT' : 'ĐANG TẮT'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSaveScheduleConfig({ ...scheduleConfig, enabled: !scheduleConfig.enabled })}
                    className={`w-14 h-8 shrink-0 rounded-full transition-colors relative p-1 cursor-pointer ${
                      scheduleConfig.enabled ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-slate-600'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${
                        scheduleConfig.enabled ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Next Run Info Strip */}
              <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" /> Lần đăng bài tiếp theo
                  </div>
                  <div className="text-sm font-semibold text-slate-900 mt-2">
                    {scheduleNextRun.label || 'Chưa xác định'}
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-emerald-600" /> Scheduler Daemon (Port 3004)
                  </div>
                  <div className="text-sm font-semibold text-slate-900 mt-2 flex items-center gap-2">
                    {isSchedulerRunning ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="text-emerald-700">Đang chạy ngầm ổn định</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        <span className="text-amber-700">Chưa bật Bot Server (Port 3004)</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-indigo-600" /> Lần chạy gần nhất
                  </div>
                  <div className="text-sm font-semibold text-slate-900 mt-2">
                    {scheduleConfig.lastRunAt
                      ? new Date(scheduleConfig.lastRunAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
                      : 'Chưa có lượt chạy nào'}
                  </div>
                </div>
              </div>
            </div>

                
            {/* ==================== QUY TRÌNH ĐĂNG TỰ ĐỘNG ĐƠN GIẢN & TIẾN ĐỘ ==================== */}
            <div className="liquid-glass rounded-3xl p-6 md:p-8 space-y-6 border border-slate-200/80 shadow-lg relative overflow-hidden">
              {/* Header: Giải thích cách hoạt động đơn giản */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-lg text-slate-900 flex flex-wrap items-center gap-2">
                        Quy Trình Đăng Bài Tự Động
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black border shadow-xs ${
                          (scheduleConfig.aiProvider || 'groq') === 'groq'
                            ? 'bg-amber-500/15 text-amber-700 border-amber-300'
                            : 'bg-indigo-500/15 text-indigo-700 border-indigo-300'
                        }`} title="Hệ thống AI đang được dùng để viết bài Facebook">
                          {(scheduleConfig.aiProvider || 'groq') === 'groq' ? '⚡ Groq AI (Đang Dùng)' : '✨ Gemini AI (Đang Dùng)'}
                        </span>
                        {scheduleTriggering && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                            Đang Đăng Bài...
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Hệ thống hoạt động tuần tự qua 5 bước tự động: Lấy chủ đề → AI viết bài → Tạo ảnh poster → Đăng Facebook → Cập nhật Google Sheet.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Nút Điều Khiển & Ô Nhập Chủ Đề */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative flex-1 sm:w-80">
                    <input
                      type="text"
                      disabled={scheduleTriggering}
                      value={customRunTopic}
                      onChange={(e) => setCustomRunTopic(e.target.value)}
                      placeholder={sheetsOverview?.nextTopic ? `Mặc định: "${sheetsOverview.nextTopic.topic.substring(0, 30)}..."` : "Nhập chủ đề tùy chọn (để trống: tự lấy từ Sheet)..."}
                      className={`w-full bg-white border text-xs text-slate-800 placeholder:text-slate-400 rounded-xl px-3.5 py-2.5 shadow-xs transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        scheduleTriggering ? 'bg-slate-100 border-slate-200 cursor-not-allowed opacity-75' : 'border-slate-300 hover:border-slate-400'
                      }`}
                    />
                    {customRunTopic && !scheduleTriggering && (
                      <button
                        type="button"
                        onClick={() => setCustomRunTopic('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* NÚT HOẠT ĐỘNG / ĐĂNG NGAY - BỊ KHÓA CHẶT KHI ĐANG ĐĂNG */}
                  <button
                    type="button"
                    disabled={scheduleTriggering}
                    onClick={() => handleTriggerAutoPilot(customRunTopic)}
                    className={`px-6 py-2.5 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                      scheduleTriggering
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none border border-slate-300 select-none pointer-events-none'
                        : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                    title={scheduleTriggering ? "Đang trong tiến trình đăng bài, nút đã bị khóa để tránh trùng lặp" : "Bấm để kích hoạt đăng bài ngay lập tức"}
                  >
                    {scheduleTriggering ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-600" />
                        <span>🔒 ĐANG ĐĂNG BÀI (ĐÃ KHÓA)...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 text-emerald-100" />
                        <span>🚀 ĐĂNG BÀI NGAY</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Sơ đồ 5 bước trực quan, dễ hiểu cách hoạt động */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                {/* Bước 1: Google Sheets */}
                <div className={`p-4 rounded-2xl border transition-all relative ${
                  scheduleTriggering && liveProgress?.step === 1
                    ? 'bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                    : liveProgress?.step && liveProgress.step > 1
                    ? 'bg-emerald-50/60 border-emerald-300'
                    : 'bg-slate-50/70 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-black">
                      {liveProgress?.step && liveProgress.step > 1 ? '✓' : '1'}
                    </span>
                    <div className="flex items-center justify-between flex-1 ml-2">
                      <h4 className="text-xs font-extrabold text-slate-800">1. Google Sheets</h4>
                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded-md">
                        {sheetsOverview?.pending ?? 0} chờ
                      </span>
                    </div>
                  </div>

                  {/* Pills chọn Tab Sheet */}
                  <div className="mt-2 flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-xl">
                    {availableSheets.map((s) => {
                      const isSelected = (activeSheetTab || scheduleConfig.googleSheets?.sheetName || 'topics') === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          disabled={sheetsSyncing || scheduleTriggering}
                          onClick={() => handleSwitchSheetTab(s)}
                          className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] font-black tracking-tight transition-all cursor-pointer truncate ${
                            isSelected
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                          }`}
                          title={`Chuyển sang Sheet [${s}]`}
                        >
                          {s === 'topics' ? '📁 topics' : '📅 calendar'}
                        </button>
                      );
                    })}
                  </div>

                  <p className="text-[10px] text-slate-500 mt-1.5 leading-snug">
                    Đang chọn: <b className="text-emerald-700 font-mono">[{activeSheetTab || scheduleConfig.googleSheets?.sheetName || 'topics'}]</b>.
                  </p>
                  {scheduleTriggering && liveProgress?.step === 1 && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-bold text-indigo-700">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Đang đọc chủ đề...</span>
                    </div>
                  )}
                </div>

                {/* Bước 2: AI Viết Bài (Groq hoặc Gemini) */}
                <div className={`p-4 rounded-2xl border transition-all relative ${
                  scheduleTriggering && liveProgress?.step === 2
                    ? 'bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                    : liveProgress?.step && liveProgress.step > 2
                    ? 'bg-emerald-50/60 border-emerald-300'
                    : 'bg-slate-50/70 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-7 h-7 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-black">
                      {liveProgress?.step && liveProgress.step > 2 ? '✓' : '2'}
                    </span>
                    <div className="flex items-center justify-between flex-1 ml-2">
                      <h4 className="text-xs font-extrabold text-slate-800">2. AI Viết Bài</h4>
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                        (scheduleConfig.aiProvider || 'groq') === 'groq'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}>
                        {(scheduleConfig.aiProvider || 'groq') === 'groq' ? '⚡ Groq' : '✨ Gemini'}
                      </span>
                    </div>
                  </div>

                  {/* Pills chọn nhanh Groq hoặc Gemini */}
                  <div className="mt-1 flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-xl">
                    <button
                      type="button"
                      disabled={scheduleTriggering}
                      onClick={() => handleSaveScheduleConfig({ ...scheduleConfig, aiProvider: 'groq' })}
                      className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] font-black tracking-tight transition-all cursor-pointer truncate ${
                        (scheduleConfig.aiProvider || 'groq') === 'groq'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                      }`}
                      title="Chuyển sang Groq AI (Miễn phí 100%)"
                    >
                      ⚡ Groq
                    </button>
                    <button
                      type="button"
                      disabled={scheduleTriggering}
                      onClick={() => handleSaveScheduleConfig({ ...scheduleConfig, aiProvider: 'gemini' })}
                      className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] font-black tracking-tight transition-all cursor-pointer truncate ${
                        scheduleConfig.aiProvider === 'gemini'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                      }`}
                      title="Chuyển sang Google Gemini AI"
                    >
                      ✨ Gemini
                    </button>
                  </div>

                  <p className="text-[10px] text-slate-500 mt-1.5 leading-snug">
                    Đang dùng: <b className={`font-mono ${(scheduleConfig.aiProvider || 'groq') === 'groq' ? 'text-amber-700' : 'text-indigo-700'}`}>
                      {(scheduleConfig.aiProvider || 'groq') === 'groq' ? '[⚡ Groq LPU]' : '[✨ Google Gemini]'}
                    </b>.
                    <span className="block text-[9px] text-slate-400 mt-0.5">Tự động đổi nếu hết token</span>
                  </p>
                  {scheduleTriggering && liveProgress?.step === 2 && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-bold text-indigo-700">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>{(scheduleConfig.aiProvider || 'groq') === 'groq' ? 'Groq LPU đang viết bài...' : 'Gemini đang viết bài...'}</span>
                    </div>
                  )}
                </div>

                {/* Bước 3: ChatGPT Web Robot */}
                <div className={`p-4 rounded-2xl border transition-all relative ${
                  scheduleTriggering && liveProgress?.step === 3
                    ? 'bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                    : liveProgress?.step && liveProgress.step > 3
                    ? 'bg-emerald-50/60 border-emerald-300'
                    : 'bg-slate-50/70 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-7 h-7 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center text-xs font-black">
                      {liveProgress?.step && liveProgress.step > 3 ? '✓' : '3'}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tạo Ảnh</span>
                  </div>
                  <h4 className="text-xs font-extrabold text-slate-800">3. ChatGPT Robot</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    Tự động mở trình duyệt vẽ ảnh poster 3D, tỉ lệ 4:5 kèm linh vật Gấu Đỏ.
                  </p>
                  {scheduleTriggering && liveProgress?.step === 3 && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-bold text-indigo-700">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>ChatGPT đang vẽ ảnh...</span>
                    </div>
                  )}
                </div>

                {/* Bước 4: Đăng Facebook */}
                <div className={`p-4 rounded-2xl border transition-all relative ${
                  scheduleTriggering && liveProgress?.step === 4
                    ? 'bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                    : liveProgress?.step && liveProgress.step > 4
                    ? 'bg-emerald-50/60 border-emerald-300'
                    : 'bg-slate-50/70 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-7 h-7 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black">
                      {liveProgress?.step && liveProgress.step > 4 ? '✓' : '4'}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Xuất Bản</span>
                  </div>
                  <h4 className="text-xs font-extrabold text-slate-800">4. Đăng Facebook</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    Đăng đồng thời lên các kênh đang bật:
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <button
                      type="button"
                      onClick={() => handleToggleChannel('fanpage')}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                        scheduleConfig.channels?.fanpage
                          ? 'bg-blue-600 text-white shadow-xs hover:bg-blue-700'
                          : 'bg-slate-200 text-slate-400 hover:bg-slate-300'
                      }`}
                      title="Bấm để Bật/Tắt Fanpage"
                    >
                      {scheduleConfig.channels?.fanpage ? '✓ Fanpage' : '✕ Fanpage'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleChannel('groups')}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                        scheduleConfig.channels?.groups
                          ? 'bg-indigo-600 text-white shadow-xs hover:bg-indigo-700'
                          : 'bg-slate-200 text-slate-400 hover:bg-slate-300'
                      }`}
                      title={`Bấm để Bật/Tắt ${facebookGroupCount} Nhóm`}
                    >
                      {scheduleConfig.channels?.groups ? `✓ ${facebookGroupCount} Nhóm` : `✕ ${facebookGroupCount} Nhóm`}
                    </button>
                  </div>
                  {scheduleTriggering && liveProgress?.step === 4 && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-bold text-indigo-700">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Đang xuất bản Facebook...</span>
                    </div>
                  )}
                </div>

                {/* Bước 5: Cập nhật Sheet & Telegram */}
                <div className={`p-4 rounded-2xl border transition-all relative ${
                  scheduleTriggering && liveProgress?.step === 5
                    ? 'bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                    : liveProgress?.step && liveProgress.step >= 5 && liveProgress.step !== -1
                    ? 'bg-emerald-50/60 border-emerald-300'
                    : 'bg-slate-50/70 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-black">
                      {liveProgress?.step && liveProgress.step >= 6 ? '✓' : '5'}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hoàn Tất</span>
                  </div>
                  <h4 className="text-xs font-extrabold text-slate-800">5. Sheet & Telegram</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    Đánh dấu 'done', lưu link bài viết, ngày giờ vào Google Sheet và báo qua Telegram.
                  </p>
                  {scheduleTriggering && liveProgress?.step === 5 && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-bold text-indigo-700">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Lưu link vào Sheet...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* TIẾN ĐỘ THỜI GIAN THỰC (HIỂN THỊ TIẾN ĐỘ ĐĂNG BÀI TỚI BƯỚC NÀO) */}
              {(scheduleTriggering || (liveProgress && liveProgress.active)) && (
                <div className="p-5 rounded-2xl bg-indigo-50/90 border-2 border-indigo-500/40 space-y-3 animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-600"></span>
                      </span>
                      <span className="text-xs font-extrabold text-indigo-950 uppercase tracking-wider">
                        Tiến Độ Đăng Bài: {liveProgress?.stepName || 'Đang chuẩn bị...'} ({liveProgress?.progress || 10}%)
                      </span>
                    </div>
                    <span className="text-xs font-bold text-indigo-700">
                      {liveProgress?.detail || 'Hệ thống đang tiến hành chu trình tự động...'}
                    </span>
                  </div>

                  {/* Thanh Progress Bar Gradient Animated */}
                  <div className="w-full h-3 bg-indigo-200/80 rounded-full overflow-hidden p-0.5 border border-indigo-300">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${Math.min(100, Math.max(8, liveProgress?.progress || 10))}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Bước {liveProgress?.step ?? 1}/5</span>
                    <span>Nút đăng đang khóa an toàn để tránh đăng trùng lặp</span>
                  </div>
                </div>
              )}

              {/* KẾT QUẢ ĐĂNG BÀI & LINK BÀI VIẾT (HIỂN THỊ KHI ĐĂNG XONG) */}
              {triggerResult && (
                <div className="p-5 rounded-2xl bg-emerald-50/90 border-2 border-emerald-400 shadow-md space-y-4 animate-in fade-in duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-emerald-950">
                          Đã Đăng Bài Thành Công Lên Facebook!
                        </h4>
                        <p className="text-xs text-emerald-700 mt-0.5">
                          Tiêu đề: <strong className="font-bold text-emerald-900">"{triggerResult.title || 'Bài viết marketing'}"</strong>
                        </p>
                      </div>
                    </div>

                    {/* NÚT MỞ LINK BÀI VIẾT TRỰC TIẾP TRÊN FACEBOOK */}
                    {triggerResult.postUrl && (
                      <a
                        href={triggerResult.postUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-600/20 hover:scale-105 transition-all cursor-pointer"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Mở Xem Bài Viết Trên Facebook</span>
                      </a>
                    )}
                  </div>

                  {/* Kênh đã đăng, Trạng thái Google Sheet & Nhà cung cấp AI viết bài */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-emerald-200">
                    <div className="p-2.5 rounded-xl bg-white/80 border border-emerald-200 text-xs">
                      <span className="text-slate-500">{facebookGroupCount} Nhóm FB:</span>{' '}
                      <span className="font-bold text-emerald-700">
                        {triggerResult.publishResults?.groups?.success ? `✓ Đã đăng (${triggerResult.publishResults.groups.count || 1} nhóm)` : 'Không bật / Đã bỏ qua'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/80 border border-emerald-200 text-xs">
                      <span className="text-slate-500">Fanpage:</span>{' '}
                      <span className="font-bold text-emerald-700">
                        {triggerResult.publishResults?.fanpage?.success ? '✓ Đã đăng Fanpage' : 'Không bật / Đã bỏ qua'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/80 border border-emerald-200 text-xs">
                      <span className="text-slate-500">Google Sheet:</span>{' '}
                      <span className="font-bold text-emerald-700">
                        {triggerResult.sheetUpdated ? '✓ Đã ghi link & ngày đăng' : 'Đã ghi nhận'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white/80 border border-emerald-200 text-xs">
                      <span className="text-slate-500">AI Viết Bài:</span>{' '}
                      <span className={`font-black ${triggerResult.provider === 'groq' ? 'text-amber-700' : 'text-indigo-700'}`}>
                        {triggerResult.provider === 'groq' ? '⚡ Groq Cloud LPU' : '✨ Google Gemini'}
                      </span>
                      {triggerResult.fallbackNotice && (
                        <p className="text-[10px] text-amber-700 font-bold mt-0.5">⚠️ {triggerResult.fallbackNotice}</p>
                      )}
                    </div>
                  </div>

                  {/* Ảnh poster thu nhỏ */}
                  {triggerResult.imageBase64 && (
                    <div className="pt-2 flex items-center gap-3">
                      <img
                        src={`data:image/png;base64,${triggerResult.imageBase64}`}
                        alt="Poster đã tạo"
                        className="w-16 h-20 object-cover rounded-lg border border-emerald-300 shadow-sm"
                      />
                      <div className="text-xs text-emerald-800">
                        <p className="font-bold">Ảnh Poster 3D Gấu Đỏ đã được đính kèm vào bài viết</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Tỉ lệ chuẩn 4:5 hiển thị tối ưu trên Facebook Feed</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

{/* ==================== WORKFLOW SETTINGS TABS ==================== */}
            <div className="liquid-glass rounded-3xl p-6 md:p-8 space-y-6 border border-slate-200/80 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-indigo-600" />
                    Cấu Hình Chi Tiết Quy Trình &amp; Lịch Hẹn
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Tùy biến khung giờ quét tự động, nguồn Google Sheets và Gemini API</p>
                </div>

                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setWorkflowActiveTab('canvas')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      workflowActiveTab === 'canvas' ? 'bg-indigo-600 text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ⏰ Khung Giờ Hẹn
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkflowActiveTab('sheets')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      workflowActiveTab === 'sheets' ? 'bg-indigo-600 text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📊 Google Sheets
                  </button>
                  <button
                    type="button"
                    onClick={() => setWorkflowActiveTab('ai_config')}
                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                      workflowActiveTab === 'ai_config' ? 'bg-indigo-600 text-white shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🤖 AI Viết Bài &amp; Mascot
                  </button>
                </div>
              </div>

              {/* Sub-tab 1: Khung giờ hẹn riêng biệt cho từng kênh */}
              {workflowActiveTab === 'canvas' && (
                <div className="space-y-6">
                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200/80 text-xs text-amber-900 font-medium flex items-center gap-2.5">
                    <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>
                      <b>Lịch đăng độc lập từng kênh:</b> Bạn có thể đặt giờ đăng Fanpage riêng (vd: 08:00, 16:00) và giờ đăng Nhóm riêng (vd: 09:30, 14:00, 20:00) mà không bị gộp chung!
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* CARD 1: FANPAGE SCHEDULE */}
                    <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-200/80 shadow-xs space-y-4">
                      <div className="flex items-center justify-between border-b border-blue-200/80 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
                            <Share2 className="w-4 h-4" />
                          </span>
                          <div>
                            <h4 className="font-extrabold text-sm text-slate-900">Facebook Fanpage</h4>
                            <span className="text-[10px] font-bold text-blue-700">Port 3001</span>
                          </div>
                        </div>

                        {/* Interactive Toggle Switch */}
                        <button
                          type="button"
                          onClick={() => handleToggleChannel('fanpage')}
                          className="flex items-center gap-2 cursor-pointer group select-none p-1 rounded-xl hover:bg-blue-100/50 transition-all"
                          title={scheduleConfig.channels?.fanpage ? "Bấm để TẮT đăng Fanpage" : "Bấm để BẬT đăng Fanpage"}
                        >
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full transition-all ${
                            scheduleConfig.channels?.fanpage ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'
                          }`}>
                            {scheduleConfig.channels?.fanpage ? 'ĐANG BẬT' : 'ĐÃ TẮT'}
                          </span>
                          <div className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
                            scheduleConfig.channels?.fanpage ? 'bg-blue-600' : 'bg-slate-300'
                          }`}>
                            <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                              scheduleConfig.channels?.fanpage ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                          </div>
                        </button>
                      </div>

                      {/* Next Run Info */}
                      <div className="bg-white/80 p-2.5 rounded-xl border border-blue-100 text-[11px]">
                        <span className="text-slate-500 font-semibold">Lần đăng tiếp theo:</span>
                        <div className="font-extrabold text-blue-900 mt-0.5">
                          {channelNextRuns.fanpage?.label || 'Chưa xác định'}
                        </div>
                      </div>

                      {/* Sheet Source Selection for Fanpage */}
                      <div className="bg-white/80 p-2.5 rounded-xl border border-blue-100 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                          <span className="text-slate-600 font-bold">Lấy từ Sheet:</span>
                        </div>
                        <select
                          value={scheduleConfig.googleSheets?.channelSheetMapping?.fanpage || scheduleConfig.googleSheets?.sheetName || 'topics'}
                          onChange={(e) => handleUpdateChannelSheetMapping('fanpage', e.target.value)}
                          className="bg-blue-50 border border-blue-200 text-blue-900 text-[11px] font-extrabold rounded-lg px-2 py-1 outline-hidden cursor-pointer"
                        >
                          {availableSheets.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      {/* List of Times */}
                      <div className="space-y-2">
                        <label className="block text-[11px] font-bold text-slate-700">Khung giờ Fanpage hiện tại:</label>
                        <div className="flex flex-wrap gap-1.5">
                          {(scheduleConfig.channelSchedules?.fanpage?.times || ['08:00', '16:00']).map((t: string) => (
                            <span
                              key={t}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-100 text-blue-900 font-black text-xs border border-blue-200 shadow-2xs"
                            >
                              <Clock className="w-3 h-3 text-blue-600" />
                              {t}
                              {renderSlotSheetSelect('fanpage', t)}
                              <button
                                type="button"
                                onClick={() => handleRemoveChannelTime('fanpage', t)}
                                className="hover:text-rose-600 text-blue-400 cursor-pointer"
                                title="Xóa giờ này"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Add Time Form */}
                      <div className="flex items-center gap-2 pt-2 border-t border-blue-100">
                        <input
                          type="time"
                          value={newFanpageTime}
                          onChange={(e) => setNewFanpageTime(e.target.value)}
                          className="liquid-input rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 w-28"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddChannelTime('fanpage', newFanpageTime)}
                          className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> Thêm Giờ
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={scheduleTriggering}
                        onClick={() => handleTriggerAutoPilot(customRunTopic, 'fanpage')}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-black shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" /> 🚀 ĐĂNG NGAY LÊN FANPAGE (TEST)
                      </button>
                    </div>

                    {/* CARD 2: GROUPS SCHEDULE */}
                    <div className="p-5 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 shadow-xs space-y-4">
                      <div className="flex items-center justify-between border-b border-indigo-200/80 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
                            <Users className="w-4 h-4" />
                          </span>
                          <div>
                            <h4 className="font-extrabold text-sm text-slate-900">{facebookGroupCount} Nhóm Facebook</h4>
                            <span className="text-[10px] font-bold text-indigo-700">Port 3002</span>
                          </div>
                        </div>

                        {/* Interactive Toggle Switch */}
                        <button
                          type="button"
                          onClick={() => handleToggleChannel('groups')}
                          className="flex items-center gap-2 cursor-pointer group select-none p-1 rounded-xl hover:bg-indigo-100/50 transition-all"
                          title={scheduleConfig.channels?.groups ? `Bấm để TẮT đăng ${facebookGroupCount} Nhóm` : `Bấm để BẬT đăng ${facebookGroupCount} Nhóm`}
                        >
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full transition-all ${
                            scheduleConfig.channels?.groups ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'
                          }`}>
                            {scheduleConfig.channels?.groups ? 'ĐANG BẬT' : 'ĐÃ TẮT'}
                          </span>
                          <div className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
                            scheduleConfig.channels?.groups ? 'bg-indigo-600' : 'bg-slate-300'
                          }`}>
                            <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-in-out ${
                              scheduleConfig.channels?.groups ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                          </div>
                        </button>
                      </div>

                      {/* Next Run Info */}
                      <div className="bg-white/80 p-2.5 rounded-xl border border-indigo-100 text-[11px]">
                        <span className="text-slate-500 font-semibold">Lần đăng tiếp theo:</span>
                        <div className="font-extrabold text-indigo-900 mt-0.5">
                          {channelNextRuns.groups?.label || 'Chưa xác định'}
                        </div>
                      </div>

                      {/* Sheet Source Selection for Groups */}
                      <div className="bg-white/80 p-2.5 rounded-xl border border-indigo-100 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                          <span className="text-slate-600 font-bold">Lấy từ Sheet:</span>
                        </div>
                        <select
                          value={scheduleConfig.googleSheets?.channelSheetMapping?.groups || scheduleConfig.googleSheets?.sheetName || 'topics'}
                          onChange={(e) => handleUpdateChannelSheetMapping('groups', e.target.value)}
                          className="bg-indigo-50 border border-indigo-200 text-indigo-900 text-[11px] font-extrabold rounded-lg px-2 py-1 outline-hidden cursor-pointer"
                        >
                          {availableSheets.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      {/* List of Times */}
                      <div className="space-y-2">
                        <label className="block text-[11px] font-bold text-slate-700">Khung giờ Nhóm hiện tại:</label>
                        <div className="flex flex-wrap gap-1.5">
                          {(scheduleConfig.channelSchedules?.groups?.times || ['09:30', '14:00', '20:00']).map((t: string) => (
                            <span
                              key={t}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-100 text-indigo-900 font-black text-xs border border-indigo-200 shadow-2xs"
                            >
                              <Clock className="w-3 h-3 text-indigo-600" />
                              {t}
                              {renderSlotSheetSelect('groups', t)}
                              <button
                                type="button"
                                onClick={() => handleRemoveChannelTime('groups', t)}
                                className="hover:text-rose-600 text-indigo-400 cursor-pointer"
                                title="Xóa giờ này"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Add Time Form */}
                      <div className="flex items-center gap-2 pt-2 border-t border-indigo-100">
                        <input
                          type="time"
                          value={newGroupsTime}
                          onChange={(e) => setNewGroupsTime(e.target.value)}
                          className="liquid-input rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 w-28"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddChannelTime('groups', newGroupsTime)}
                          className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> Thêm Giờ
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={scheduleTriggering}
                        onClick={() => handleTriggerAutoPilot(customRunTopic, 'groups')}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-black shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" /> 🚀 ĐĂNG NGAY LÊN {facebookGroupCount} NHÓM (TEST)
                      </button>
                    </div>



                  </div>
                </div>
              )}

              {/* Sub-tab 2: Google Sheets & Kho chủ đề */}
              {workflowActiveTab === 'sheets' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200/80 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-200/60">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-xs font-black text-emerald-950 uppercase tracking-wide">
                          Xem &amp; Đồng bộ Sheet:
                        </span>
                        <div className="flex items-center gap-1 bg-white/80 p-1 rounded-xl border border-emerald-200">
                          {availableSheets.map((s) => {
                            const isSelected = (activeSheetTab || scheduleConfig.googleSheets?.sheetName || 'topics') === s;
                            return (
                              <button
                                key={s}
                                type="button"
                                disabled={sheetsSyncing}
                                onClick={() => handleSwitchSheetTab(s)}
                                className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                                  isSelected
                                    ? 'bg-emerald-700 text-white shadow-xs'
                                    : 'text-emerald-900 hover:bg-emerald-100/70'
                                }`}
                              >
                                {s === 'topics' ? '📁 topics' : '📅 content_calendar'}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <a
                        href={scheduleConfig.googleSheets?.sheetUrl || 'https://docs.google.com/spreadsheets/d/1tx_RHyRfBgGuYTvO3Tr_08Hrp6SelIsfN9hTQaT3jUY/edit'}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-extrabold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 bg-white/80 px-2.5 py-1 rounded-lg border border-emerald-200 hover:shadow-xs transition-all w-fit"
                      >
                        Mở Trang Tính <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    <div className="grid grid-cols-4 gap-2 pt-3 text-center">
                      <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-100 shadow-xs">
                        <div className="text-[10px] font-bold text-slate-500 uppercase">Tổng Topic [{activeSheetTab || scheduleConfig.googleSheets?.sheetName || 'topics'}]</div>
                        <div className="text-base font-black text-slate-900 mt-0.5">{sheetsOverview?.total ?? 0}</div>
                      </div>
                      <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-100 shadow-xs">
                        <div className="text-[10px] font-bold text-emerald-600 uppercase">Đã Đăng (Done)</div>
                        <div className="text-base font-black text-emerald-700 mt-0.5">{sheetsOverview?.done ?? 0}</div>
                      </div>
                      <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-100 shadow-xs">
                        <div className="text-[10px] font-bold text-amber-600 uppercase">Đang Xử Lý</div>
                        <div className="text-base font-black text-amber-700 mt-0.5">{sheetsOverview?.inProgress ?? 0}</div>
                      </div>
                      <div className="bg-white/90 p-2.5 rounded-xl border border-emerald-100 shadow-xs">
                        <div className="text-[10px] font-bold text-indigo-600 uppercase">Chờ Đăng (Pending)</div>
                        <div className="text-base font-black text-indigo-700 mt-0.5">{sheetsOverview?.pending ?? 0}</div>
                      </div>
                    </div>

                    {/* Phân chia Sheet riêng từng kênh */}
                    <div className="mt-4 pt-3 border-t border-emerald-200/60 bg-white/70 rounded-xl p-3">
                      <h5 className="text-xs font-black text-slate-800 mb-2 flex items-center gap-1.5">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        Phân Chia Nguồn Sheet Riêng Cho Từng Kênh:
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200">
                          <label className="block text-[11px] font-black text-blue-900 mb-1">Fanpage lấy từ:</label>
                          <select
                            value={scheduleConfig.googleSheets?.channelSheetMapping?.fanpage || scheduleConfig.googleSheets?.sheetName || 'topics'}
                            onChange={(e) => handleUpdateChannelSheetMapping('fanpage', e.target.value)}
                            className="w-full bg-white border border-blue-300 text-blue-900 text-xs font-bold rounded-lg px-2.5 py-1.5 outline-hidden cursor-pointer"
                          >
                            {availableSheets.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                        <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200">
                          <label className="block text-[11px] font-black text-indigo-900 mb-1">{facebookGroupCount} Nhóm lấy từ:</label>
                          <select
                            value={scheduleConfig.googleSheets?.channelSheetMapping?.groups || scheduleConfig.googleSheets?.sheetName || 'topics'}
                            onChange={(e) => handleUpdateChannelSheetMapping('groups', e.target.value)}
                            className="w-full bg-white border border-indigo-300 text-indigo-900 text-xs font-bold rounded-lg px-2.5 py-1.5 outline-hidden cursor-pointer"
                          >
                            {availableSheets.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      disabled={sheetsSyncing}
                      onClick={() => handleSyncGoogleSheets(activeSheetTab)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-2 cursor-pointer shadow-sm"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${sheetsSyncing ? 'animate-spin' : ''}`} />
                      {sheetsSyncing ? 'Đang đồng bộ...' : `Đồng Bộ Dữ Liệu Sheet [${activeSheetTab || scheduleConfig.googleSheets?.sheetName || 'topics'}]`}
                    </button>
                  </div>
                </div>
              )}

              {/* Sub-tab 3: Groq / Gemini & Mascot AI */}
              {workflowActiveTab === 'ai_config' && (
                <div className="space-y-6">
                  {/* Selector AI Provider */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-2">Chọn Nhà Cung Cấp AI Viết Bài:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setScheduleConfig({ ...scheduleConfig, aiProvider: 'groq' })}
                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                          (scheduleConfig.aiProvider || 'groq') === 'groq'
                            ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">⚡</span>
                            <span className="text-xs font-extrabold text-slate-900">Groq Cloud AI</span>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 uppercase tracking-wide">
                            Miễn Phí 100%
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                          Tốc độ phản hồi cực nhanh (LPU). Dùng model <b>Llama 3.3 70B</b> thông minh hàng đầu, không lo bị cạn hạn ngạch (quota) đột ngột.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setScheduleConfig({ ...scheduleConfig, aiProvider: 'gemini' })}
                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative ${
                          scheduleConfig.aiProvider === 'gemini'
                            ? 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">✨</span>
                            <span className="text-xs font-extrabold text-slate-900">Google Gemini AI</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            Google AI Studio
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                          Model Gemini 2.5 Flash / Pro của Google. Yêu cầu API key cá nhân và phụ thuộc hạn ngạch free tier của Google.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Groq Settings */}
                  {(scheduleConfig.aiProvider || 'groq') === 'groq' && (
                    <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 text-sm font-black">
                          ⚡
                        </div>
                        <div className="text-xs text-amber-900 leading-relaxed">
                          <p className="font-extrabold text-[13px] text-amber-950">Cách lấy Groq API Key miễn phí (mất 20 giây):</p>
                          <ol className="list-decimal list-inside space-y-1 mt-1 text-slate-700 font-medium">
                            <li>Truy cập <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline font-bold hover:text-indigo-800">console.groq.com/keys</a></li>
                            <li>Đăng nhập bằng tài khoản Google hoặc GitHub.</li>
                            <li>Bấm <b>Create API Key</b>, đặt tên tùy ý rồi copy chuỗi key bắt đầu bằng <code className="bg-amber-100 px-1.5 py-0.5 rounded text-amber-900 font-mono">gsk_...</code> dán vào ô bên dưới.</li>
                          </ol>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">Groq API Key chính:</label>
                          <div className="relative">
                            <input
                              type={showGroqKeySecret ? 'text' : 'password'}
                              value={scheduleConfig.groqApiKey || ''}
                              onChange={(e) => setScheduleConfig({ ...scheduleConfig, groqApiKey: e.target.value })}
                              placeholder="gsk_..."
                              className="liquid-input w-full rounded-xl px-4 py-2.5 text-xs font-mono text-slate-900 pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowGroqKeySecret(!showGroqKeySecret)}
                              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="mt-1.5 text-[11px] text-slate-500">Key chính dùng để gọi Llama 3.3 viết bài.</p>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">Groq API key dự phòng:</label>
                          <div className="flex gap-2">
                            <input
                              type="password"
                              value={newGroqApiKey}
                              onChange={(e) => setNewGroqApiKey(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddBackupKey('groq', newGroqApiKey);
                                }
                              }}
                              placeholder="Dán key gsk_... dự phòng..."
                              className="liquid-input min-w-0 flex-1 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-900"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddBackupKey('groq', newGroqApiKey)}
                              className="shrink-0 rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700 cursor-pointer shadow-xs"
                              title="Thêm và lưu key dự phòng"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          {newGroqApiKey.trim() ? (
                            <p className="mt-1 text-[11px] font-bold text-amber-700">
                              👉 Bấm nút [+] hoặc phím Enter để lưu ngay vào cấu hình!
                            </p>
                          ) : null}
                          {(scheduleConfig.groqApiKeys || []).length > 0 ? (
                            <div className="mt-2 space-y-1.5">
                              {(scheduleConfig.groqApiKeys || []).map((key: string, index: number) => (
                                <div key={`${key.slice(-6)}-${index}`} className="flex items-center justify-between rounded-lg border border-amber-200 bg-white px-3 py-2">
                                  <span className="text-xs font-mono text-slate-600">Dự phòng #{index + 1}: ••••••••{key.slice(-4)}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveBackupKey('groq', index)}
                                    className="text-slate-400 hover:text-rose-600 cursor-pointer"
                                    title="Xóa key dự phòng"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-2 text-[11px] text-slate-400">Chưa có key dự phòng.</p>
                          )}
                        </div>

                        <div className="col-span-full">
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">Model Groq AI:</label>
                          <select
                            value={scheduleConfig.groqModel || 'llama-3.3-70b-versatile'}
                            onChange={(e) => setScheduleConfig({ ...scheduleConfig, groqModel: e.target.value })}
                            className="liquid-input w-full rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900"
                          >
                            <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Khuyên dùng - Cực thông minh, viết tiếng Việt sắc sảo, 128k context)</option>
                            <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (Siêu tốc độ phản hồi mili-giây, miễn phí)</option>
                            <option value="mixtral-8x7b-32768">mixtral-8x7b-32768 (Context 32k, suy luận logic)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Gemini Settings */}
                  {scheduleConfig.aiProvider === 'gemini' && (
                    <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-2xl p-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">Google Gemini API Key chính:</label>
                          <div className="relative">
                            <input
                              type={showGeminiKeySecret ? 'text' : 'password'}
                              value={scheduleConfig.geminiApiKey || ''}
                              onChange={(e) => setScheduleConfig({ ...scheduleConfig, geminiApiKey: e.target.value })}
                              placeholder="Nhập Gemini API Key..."
                              className="liquid-input w-full rounded-xl px-4 py-2.5 text-xs font-mono text-slate-900 pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowGeminiKeySecret(!showGeminiKeySecret)}
                              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="mt-1.5 text-[11px] text-slate-500">Key này được dùng trước. Khi hết quota, hệ thống sẽ chuyển sang key dự phòng.</p>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">Gemini API key dự phòng:</label>
                          <div className="flex gap-2">
                            <input
                              type="password"
                              value={newGeminiApiKey}
                              onChange={(e) => setNewGeminiApiKey(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddBackupKey('gemini', newGeminiApiKey);
                                }
                              }}
                              placeholder="Dán API key dự phòng..."
                              className="liquid-input min-w-0 flex-1 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-900"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddBackupKey('gemini', newGeminiApiKey)}
                              className="shrink-0 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 cursor-pointer shadow-xs"
                              title="Thêm và lưu key dự phòng"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          {newGeminiApiKey.trim() ? (
                            <p className="mt-1 text-[11px] font-bold text-indigo-700">
                              👉 Bấm nút [+] hoặc phím Enter để lưu ngay vào cấu hình!
                            </p>
                          ) : null}
                          {(scheduleConfig.geminiApiKeys || []).length > 0 ? (
                            <div className="mt-2 space-y-1.5">
                              {(scheduleConfig.geminiApiKeys || []).map((key: string, index: number) => (
                                <div key={`${key.slice(-6)}-${index}`} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
                                  <span className="text-xs font-mono text-slate-600">Dự phòng #{index + 1}: ••••••••{key.slice(-4)}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveBackupKey('gemini', index)}
                                    className="text-slate-400 hover:text-rose-600 cursor-pointer"
                                    title="Xóa key dự phòng"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-2 text-[11px] text-slate-400">Chưa có key dự phòng.</p>
                          )}
                        </div>

                        <div className="col-span-full">
                          <label className="block text-xs font-bold text-slate-700 mb-1.5">Model Gemini:</label>
                          <select
                            value={scheduleConfig.model || 'gemini-2.5-flash'}
                            onChange={(e) => setScheduleConfig({ ...scheduleConfig, model: e.target.value })}
                            className="liquid-input w-full rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900"
                          >
                            <option value="gemini-2.5-flash">gemini-2.5-flash (Khuyên dùng - Cực nhanh &amp; Chuẩn)</option>
                            <option value="gemini-2.5-pro">gemini-2.5-pro (Mạnh mẽ, văn phong chuyên sâu)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Common Settings: Poster & Mascot */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Tỉ lệ ảnh tạo bởi ChatGPT:</label>
                      <select
                        value={scheduleConfig.aspectRatio || '4:5'}
                        onChange={(e) => setScheduleConfig({ ...scheduleConfig, aspectRatio: e.target.value })}
                        className="liquid-input w-full rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900"
                      >
                        <option value="4:5">4:5 (Khuyên dùng - Chuẩn giao diện bài viết Facebook)</option>
                        <option value="16:9">16:9 (Ngang - Phù hợp bài tin tức)</option>
                        <option value="1:1">1:1 (Vuông - Chuẩn đa nền tảng)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Mascot Du (Gấu robot đỏ công nghệ):</label>
                      <select
                        value={scheduleConfig.hasMascotDu ? 'true' : 'false'}
                        onChange={(e) => setScheduleConfig({ ...scheduleConfig, hasMascotDu: e.target.value === 'true' })}
                        className="liquid-input w-full rounded-xl px-4 py-2.5 text-xs font-bold text-slate-900"
                      >
                        <option value="true">BẬT Mascot Du (3D Vinyl Chú Gấu Robot Đỏ DUDI)</option>
                        <option value="false">TẮT (Chụp ảnh người thật Photorealistic)</option>
                      </select>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="col-span-full pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 mt-2">
                    <button
                      type="button"
                      disabled={testingAi || scheduleLoading}
                      onClick={handleTestAi}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-xs flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${testingAi ? 'animate-spin text-indigo-600' : 'text-slate-400'}`} />
                      {testingAi ? 'Đang thử nghiệm...' : `⚡ Test Viết Bài Thử Nghiệm với ${(scheduleConfig.aiProvider || 'groq') === 'groq' ? 'Groq' : 'Gemini'}`}
                    </button>

                    <button
                      type="button"
                      disabled={scheduleLoading}
                      onClick={() => handleSaveScheduleConfig(scheduleConfig)}
                      className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold shadow-md flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Check className="w-4 h-4" /> Lưu Cấu Hình AI
                    </button>
                  </div>
                </div>
              )}
            </div>

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
                        Bắn cảnh báo nếu các cổng 3001, 3002 hoặc n8n bị tắt/dừng đột ngột.
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
                    placeholder={`VD: Tài khoản ${(groupsData.accounts?.length || 0) + 1} (Tự động lấy khi dán link)...`}
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
