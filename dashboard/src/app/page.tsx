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
  KeyRound,
} from 'lucide-react';

import {
  HistoryEntry,
  AnalyticsStats,
  ServerStatus,
  AccountItem,
  AccountCategory,
  RotationConfig,
  GroupAccount,
  CentralPoolItem,
  PoolStats,
  ScheduleConfig,
  BotConfig,
  CredentialsData,
} from '@/types/dashboard';
import { parseErrorMessage } from '@/lib/error-parser';

import OverviewTab from '@/components/tabs/OverviewTab';
import AnalyticsTab from '@/components/tabs/AnalyticsTab';
import AccountsTab from '@/components/tabs/AccountsTab';
import CredentialsTab from '@/components/tabs/CredentialsTab';
import GroupsTab from '@/components/tabs/GroupsTab';
import ScheduleTab from '@/components/tabs/ScheduleTab';
import BotTab from '@/components/tabs/BotTab';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'accounts' | 'credentials' | 'groups' | 'schedule' | 'bot'>('overview');
  const [status, setStatus] = useState<ServerStatus | null>(null);

  // Credentials State (ChatGPT & Facebook accounts and passwords)
  const [credentialsData, setCredentialsData] = useState<CredentialsData | null>(null);
  const [credentialsLoading, setCredentialsLoading] = useState(false);

  // Analytics Date Filter State
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterDatePreset, setFilterDatePreset] = useState('all');

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
    autoTopicGeneration: {
      enabled: true,
      niche: 'Thiết kế Website chuẩn SEO, Chuyển đổi số & AI Marketing doanh nghiệp',
      quantityPerRun: 5,
      targetSheet: 'topics',
      triggerMode: 'auto_refill' as 'auto_refill' | 'scheduled',
      minPendingThreshold: 3,
      scheduleTime: '07:00',
      lastGeneratedAt: null as string | null,
      lastGeneratedCount: 0,
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
  const [topicGenLoading, setTopicGenLoading] = useState<boolean>(false);
  const [topicGenNiche, setTopicGenNiche] = useState<string>('Thiết kế Website chuẩn SEO, Chuyển đổi số & AI Marketing doanh nghiệp');
  const [topicGenNicheMode, setTopicGenNicheMode] = useState<string>('Thiết kế Website chuẩn SEO, Chuyển đổi số & AI Marketing doanh nghiệp');
  const [topicGenCustomNiche, setTopicGenCustomNiche] = useState<string>('');
  const [topicGenCount, setTopicGenCount] = useState<number>(5);
  const [topicGenSheet, setTopicGenSheet] = useState<string>('topics');
  const [topicGenPromptMode, setTopicGenPromptMode] = useState<string>('default');
  const [topicGenCustomPrompt, setTopicGenCustomPrompt] = useState<string>('');
  const [topicGenCustomPromptText, setTopicGenCustomPromptText] = useState<string>('');
  const [lastGeneratedTopics, setLastGeneratedTopics] = useState<Array<{ id: string; topic: string; category: string; keywords: string; status: string }>>([]);

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
  const fetchAnalytics = async (
    page = 1,
    overrideFilters?: {
      channel?: string;
      status?: string;
      gpt?: string;
      search?: string;
      startDate?: string;
      endDate?: string;
      datePreset?: string;
    },
  ) => {
    setAnalyticsLoading(true);
    try {
      const channel = overrideFilters?.channel !== undefined ? overrideFilters.channel : filterChannel;
      const status = overrideFilters?.status !== undefined ? overrideFilters.status : filterStatus;
      const chatgpt = overrideFilters?.gpt !== undefined ? overrideFilters.gpt : filterGpt;
      const search = overrideFilters?.search !== undefined ? overrideFilters.search : analyticsSearch;
      const startDate = overrideFilters?.startDate !== undefined ? overrideFilters.startDate : filterStartDate;
      const endDate = overrideFilters?.endDate !== undefined ? overrideFilters.endDate : filterEndDate;
      const datePreset = overrideFilters?.datePreset !== undefined ? overrideFilters.datePreset : filterDatePreset;

      if (overrideFilters?.startDate !== undefined) setFilterStartDate(overrideFilters.startDate);
      if (overrideFilters?.endDate !== undefined) setFilterEndDate(overrideFilters.endDate);
      if (overrideFilters?.datePreset !== undefined) setFilterDatePreset(overrideFilters.datePreset);

      const params = new URLSearchParams({
        channel,
        status,
        chatgpt,
        search,
        startDate,
        endDate,
        datePreset,
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

  // Load Credentials (ChatGPT & FB Accounts/Passwords)
  const fetchCredentials = async () => {
    try {
      setCredentialsLoading(true);
      const res = await fetch('/api/credentials');
      const data = await res.json();
      if (data.ok) {
        setCredentialsData(data.data);
      }
    } catch (err) {
      console.error('Lỗi tải mật khẩu & tài khoản:', err);
    } finally {
      setCredentialsLoading(false);
    }
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

  const handleGenerateTopics = async () => {
    if (topicGenLoading) return;
    setTopicGenLoading(true);
    try {
      const targetSheet = topicGenSheet || activeSheetTab || scheduleConfig.googleSheets?.sheetName || 'topics';
      const effectiveNiche = topicGenNicheMode === 'custom'
        ? (topicGenCustomNiche.trim() || topicGenNiche)
        : topicGenNiche;
      const effectivePrompt = topicGenPromptMode === 'custom'
        ? topicGenCustomPromptText.trim()
        : topicGenCustomPrompt;

      showToast(`Đang yêu cầu AI nghiên cứu ${topicGenCount} chủ đề mới về [${effectiveNiche}]...`, 'info');
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-topics',
          niche: effectiveNiche,
          count: topicGenCount,
          sheetName: targetSheet,
          customPrompt: effectivePrompt,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.error || 'Không thể tạo chủ đề');
      }
      const count = data.result?.count || data.count || topicGenCount;
      const topics = data.result?.topics || data.topics || [];
      setLastGeneratedTopics(topics);
      showToast(`🎉 Đã tạo & nạp thành công ${count} chủ đề mới vào Google Sheet [${targetSheet}]!`, 'success');
      await handleSyncGoogleSheets(targetSheet);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('Lỗi tạo chủ đề: ' + msg, 'error');
    } finally {
      setTopicGenLoading(false);
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
    fetchCredentials();
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
              <Users className="w-4 h-4" /> Quản lý Profile Chrome
            </button>
            <button
              onClick={() => { setActiveTab('credentials'); fetchCredentials(); }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                activeTab === 'credentials'
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/25 font-bold'
                  : 'text-slate-600 hover:text-violet-700 hover:bg-white/60'
              }`}
            >
              <KeyRound className="w-4 h-4" /> Mật khẩu & TK (FB/GPT)
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

        {/* ==================== TAB 1: TỔNG QUAN (OVERVIEW) ==================== */}
        {activeTab === 'overview' && (
          <OverviewTab
            status={status}
            groupsData={groupsData}
            chatgptAccounts={chatgptAccounts}
            facebookGroupCount={facebookGroupCount}
            totalAccountsCount={totalAccountsCount}
            handleOpenChrome={handleOpenChrome}
            setActiveTab={setActiveTab}
          />
        )}

        {/* ==================== TAB 2: BÁO CÁO THỐNG KÊ & LỊCH SỬ (ANALYTICS) ==================== */}
        {activeTab === 'analytics' && (
          <AnalyticsTab
            analyticsData={analyticsData}
            analyticsLoading={analyticsLoading}
            fetchAnalytics={fetchAnalytics}
            handleClearHistory={handleClearHistory}
            handleDeleteHistoryEntry={handleDeleteHistoryEntry}
            handleExportHistory={handleExportHistory}
            copiedId={copiedId}
            copyToClipboard={copyToClipboard}
          />
        )}

        {/* ==================== TAB 3: QUẢN LÝ TÀI KHOẢN ==================== */}
        {activeTab === 'accounts' && (
          <AccountsTab
            accounts={accounts}
            groupsData={groupsData}
            handleChangeRoleGroup={handleChangeRoleGroup}
            handleReleaseQuarantine={handleReleaseQuarantine}
            formatCountdown={formatCountdown}
            handleSwitchActiveGroup={handleSwitchActiveGroup}
            handleToggleRotation={handleToggleRotation}
            fetchAccounts={fetchAccounts}
            handleOpenChrome={handleOpenChrome}
            handleDeleteAccount={handleDeleteAccount}
            handleDeleteChatGpt={handleDeleteChatGpt}
            handleDeleteFanpage={handleDeleteFanpage}
            handleDeletePersonal={handleDeletePersonal}
            handleToggleAccount={handleToggleAccount}
            setDetectedGroupName={setDetectedGroupName}
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
            handleAutoDetectPageName={(url, isEdit) => handleAutoDetectFbName(url, isEdit ? 'editFanpage' : 'newFanpage')}
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
            handleAutoDetectPersonalName={(url, isEdit) => handleAutoDetectFbName(url, isEdit ? 'editPersonal' : 'newPersonal')}
            isEditPersonalOpen={isEditPersonalOpen}
            setIsEditPersonalOpen={setIsEditPersonalOpen}
            editingPersonal={editingPersonal}
            setEditingPersonal={setEditingPersonal}
            handleUpdatePersonal={handleUpdatePersonal}
          />
        )}

        {/* ==================== TAB: QUẢN LÝ MẬT KHẨU & TÀI KHOẢN (CREDENTIALS) ==================== */}
        {activeTab === 'credentials' && (
          <CredentialsTab
            credentialsData={credentialsData}
            credentialsLoading={credentialsLoading}
            fetchCredentials={fetchCredentials}
            handleOpenChrome={handleOpenChrome}
            showToast={showToast}
          />
        )}

        {/* ==================== TAB 4: QUẢN LÝ LINK NHÓM FACEBOOK ==================== */}
        {activeTab === 'groups' && (
          <GroupsTab
            isDetectingName={isDetectingName}
            handleAutoDetectFbName={handleAutoDetectFbName}
            setIsAddAccountOpen={setIsAddAccountOpen}
            handleExportCsv={handleExportCsv}
            handleExportTxt={handleExportTxt}
            handlePoolDistribute={handlePoolDistribute}
            setActiveTab={setActiveTab}
            groupsData={groupsData}
            fetchGroups={fetchGroups}
            poolStats={poolStats}
            groupViewMode={groupViewMode}
            setGroupViewMode={setGroupViewMode}
            selectedGroupAcc={selectedGroupAcc}
            setSelectedGroupAcc={setSelectedGroupAcc}
            groupSearch={groupSearch}
            setGroupSearch={setGroupSearch}
            poolSearch={poolSearch}
            setPoolSearch={setPoolSearch}
            poolFilterAccount={poolFilterAccount}
            setPoolFilterAccount={setPoolFilterAccount}
            poolFilterPostStatus={poolFilterPostStatus}
            setPoolFilterPostStatus={setPoolFilterPostStatus}
            poolFilterJoinStatus={poolFilterJoinStatus}
            setPoolFilterJoinStatus={setPoolFilterJoinStatus}
            handleToggleAccount={handleToggleAccount}
            handlePoolDeleteItem={handlePoolDeleteItem}
            handleReleaseQuarantine={handleReleaseQuarantine}
            handlePoolImport={handlePoolImport}
            handlePoolRevoke={handlePoolRevoke}
            handlePoolUpdateStatus={handlePoolUpdateStatus}
            handleRemoveGroup={handleRemoveGroup}
            handleCopyExportLinks={handleCopyExportLinks}
            getExportablePoolItems={getExportablePoolItems}
            handleOpenChrome={handleOpenChrome}
            copyToClipboard={copyToClipboard}
            copiedId={copiedId}
            isAddGroupOpen={isAddGroupOpen}
            setIsAddGroupOpen={setIsAddGroupOpen}
            newGroupUrl={newGroupUrl}
            setNewGroupUrl={setNewGroupUrl}
            handleAddGroup={handleAddGroup}
            isBulkGroupOpen={isBulkGroupOpen}
            setIsBulkGroupOpen={setIsBulkGroupOpen}
            bulkGroupText={bulkGroupText}
            setBulkGroupText={setBulkGroupText}
            bulkMode={bulkMode}
            setBulkMode={setBulkMode}
            handleBulkImport={handleBulkImport}
            isPoolImportOpen={isPoolImportOpen}
            setIsPoolImportOpen={setIsPoolImportOpen}
            poolImportText={poolImportText}
            setPoolImportText={setPoolImportText}
            poolImportAssignAcc={poolImportAssignAcc}
            setPoolImportAssignAcc={setPoolImportAssignAcc}
            poolImportAutoDistribute={poolImportAutoDistribute}
            setPoolImportAutoDistribute={setPoolImportAutoDistribute}
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
            isExportModalOpen={isExportModalOpen}
            setIsExportModalOpen={setIsExportModalOpen}
            exportFilterAcc={exportFilterAcc}
            setExportFilterAcc={setExportFilterAcc}
            exportFilterPostStatus={exportFilterPostStatus}
            setExportFilterPostStatus={setExportFilterPostStatus}
            exportFilterJoinStatus={exportFilterJoinStatus}
            setExportFilterJoinStatus={setExportFilterJoinStatus}
            exportCopied={exportCopied}
          />
        )}

        {/* ==================== TAB 5: LỊCH TRÌNH TỰ ĐỘNG & WORKFLOW ENGINE ==================== */}
        {activeTab === 'schedule' && (
          <ScheduleTab
            availableSheets={availableSheets}
            facebookGroupCount={facebookGroupCount}
            activeSheetTab={activeSheetTab}
            setActiveSheetTab={setActiveSheetTab}
            showToast={showToast}
            handleToggleChannel={handleToggleChannel}
            customRunTopic={customRunTopic}
            setCustomRunTopic={setCustomRunTopic}
            triggerResult={triggerResult}
            liveProgress={liveProgress}
            scheduleConfig={scheduleConfig}
            setScheduleConfig={setScheduleConfig}
            handleSaveScheduleConfig={handleSaveScheduleConfig}
            scheduleNextRun={scheduleNextRun}
            isSchedulerRunning={isSchedulerRunning}
            scheduleLoading={scheduleLoading}
            scheduleTriggering={scheduleTriggering}
            channelNextRuns={channelNextRuns}
            newFanpageTime={newFanpageTime}
            setNewFanpageTime={setNewFanpageTime}
            newGroupsTime={newGroupsTime}
            setNewGroupsTime={setNewGroupsTime}
            newPersonalTime={newPersonalTime}
            setNewPersonalTime={setNewPersonalTime}
            workflowAccounts={workflowAccounts}
            setWorkflowAccounts={setWorkflowAccounts}
            workflowPreset={workflowPreset}
            setWorkflowPreset={setWorkflowPreset}
            isWorkflowExecuting={isWorkflowExecuting}
            activeWorkflowNode={activeWorkflowNode}
            nodeExecutionStates={nodeExecutionStates}
            inspectingNodeData={inspectingNodeData}
            setInspectingNodeData={setInspectingNodeData}
            workflowActiveTab={workflowActiveTab}
            setWorkflowActiveTab={setWorkflowActiveTab}
            handleAddChannelTime={handleAddChannelTime}
            handleRemoveChannelTime={handleRemoveChannelTime}
            handleSlotSheetChange={handleSlotSheetChange}
            renderSlotSheetSelect={renderSlotSheetSelect}
            handleTriggerAutoPilot={handleTriggerAutoPilot}
            handleSyncGoogleSheets={handleSyncGoogleSheets}
            sheetsOverview={sheetsOverview}
            sheetsSyncing={sheetsSyncing}
            handleSwitchSheetTab={handleSwitchSheetTab}
            handleUpdateChannelSheetMapping={handleUpdateChannelSheetMapping}
            topicGenLoading={topicGenLoading}
            topicGenNiche={topicGenNiche}
            setTopicGenNiche={setTopicGenNiche}
            topicGenNicheMode={topicGenNicheMode}
            setTopicGenNicheMode={setTopicGenNicheMode}
            topicGenCustomNiche={topicGenCustomNiche}
            setTopicGenCustomNiche={setTopicGenCustomNiche}
            topicGenCount={topicGenCount}
            setTopicGenCount={setTopicGenCount}
            topicGenSheet={topicGenSheet}
            setTopicGenSheet={setTopicGenSheet}
            topicGenPromptMode={topicGenPromptMode}
            setTopicGenPromptMode={setTopicGenPromptMode}
            topicGenCustomPrompt={topicGenCustomPrompt}
            setTopicGenCustomPrompt={setTopicGenCustomPrompt}
            topicGenCustomPromptText={topicGenCustomPromptText}
            setTopicGenCustomPromptText={setTopicGenCustomPromptText}
            lastGeneratedTopics={lastGeneratedTopics}
            handleGenerateTopics={handleGenerateTopics}
            showGeminiKeySecret={showGeminiKeySecret}
            setShowGeminiKeySecret={setShowGeminiKeySecret}
            newGeminiApiKey={newGeminiApiKey}
            setNewGeminiApiKey={setNewGeminiApiKey}
            showGroqKeySecret={showGroqKeySecret}
            setShowGroqKeySecret={setShowGroqKeySecret}
            newGroqApiKey={newGroqApiKey}
            setNewGroqApiKey={setNewGroqApiKey}
            handleAddBackupKey={handleAddBackupKey}
            handleRemoveBackupKey={handleRemoveBackupKey}
            handleTestAi={handleTestAi}
            testingAi={testingAi}
            accounts={accounts}
            copiedId={copiedId}
            copyToClipboard={copyToClipboard}
          />
        )}

        {/* ==================== TAB 6: TELEGRAM BOT & GIÁM SÁT TỪ XA ==================== */}
        {activeTab === 'bot' && (
          <BotTab
            botConfig={botConfig}
            setBotConfig={setBotConfig}
            isBotRunning={isBotRunning}
            botLoading={botLoading}
            botTesting={botTesting}
            showTokenSecret={showTokenSecret}
            setShowTokenSecret={setShowTokenSecret}
            botInfo={botInfo}
            handleSaveBotConfig={handleSaveBotConfig}
            handleTestBotMessage={handleTestBotMessage}
            handleTriggerDigest={handleTriggerDigest}
            fetchBotConfig={fetchBotConfig}
            status={status}
            fetchStatus={fetchStatus}
            copiedId={copiedId}
            copyToClipboard={copyToClipboard}
          />
        )}

      </main>
    </div>
  );
}
