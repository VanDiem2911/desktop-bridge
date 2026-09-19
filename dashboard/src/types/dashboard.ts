export interface HistoryEntry {
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

export interface AnalyticsStats {
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

export interface ServerStatus {
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

export interface AccountItem {
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
  loginStatus?: 'logged_in' | 'not_logged_in' | 'checkpoint' | 'no_tab' | 'offline';
  currentUrl?: string;
  profileExists?: boolean;
  isConfigured?: boolean;
  groupCount?: number;
  enabled?: boolean;
  status?: string;
  checkpointReason?: string;
  checkpointUrl?: string;
  checkpointAt?: string;
  originalCategory?: 'facebook' | 'fanpage' | 'groups' | 'personal' | 'chatgpt';
  canPostFanpage?: boolean;
  canPostGroup?: boolean;
  groupUrls?: string[];
  roleGroup?: string;
}

export interface AccountCategory {
  category: string;
  categoryName: string;
  description: string;
  items: AccountItem[];
}

export interface RotationConfig {
  enabled: boolean;
  mode: 'daily_alternate' | 'manual';
  activeGroupToday: 'group_1' | 'group_2';
  lastRotatedDate?: string;
  quarantineDays?: number;
}

export interface GroupAccount {
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

export interface CentralPoolItem {
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

export interface PoolStats {
  total: number;
  assigned: number;
  unassigned: number;
  joined: number;
  pending: number;
  postedSuccess: number;
  postedFailed: number;
  notPosted?: number;
}

export interface ScheduleConfig {
  enabled: boolean;
  aiProvider: 'groq' | 'gemini';
  geminiApiKey: string;
  geminiApiKeys?: string[];
  groqApiKey: string;
  groqApiKeys?: string[];
  geminiModel?: string;
  model?: string;
  groqModel: string;
  scheduleTimes?: string[];
  channelSchedules?: {
    fanpage: { enabled: boolean; times: string[]; sheetByTime?: Record<string, string>; accountByTime?: Record<string, string> };
    groups: { enabled: boolean; times: string[]; sheetByTime?: Record<string, string>; accountByTime?: Record<string, string> };
    personal: { enabled: boolean; times: string[]; sheetByTime?: Record<string, string>; accountByTime?: Record<string, string> };
  };
  channels?: { fanpage: boolean; groups: boolean; personal: boolean };
  aspectRatio?: string;
  hasMascotDu?: boolean;
  customMascotPrompt?: string;
  googleSheets?: {
    enabled: boolean;
    topicSource: 'google_sheet' | 'manual_list';
    sheetUrl: string;
    spreadsheetId: string;
    sheetName: string;
    autoUpdateStatus: boolean;
    channelSheetMapping?: { fanpage?: string; groups?: string; personal?: string };
  };
  autoTopicGeneration?: {
    enabled: boolean;
    niche: string;
    quantityPerRun?: number;
    targetSheet?: string;
    triggerMode?: 'auto_refill' | 'scheduled';
    minPendingThreshold?: number;
    scheduleTime?: string;
    lastGeneratedAt?: string | null;
    lastGeneratedCount?: number;
    count?: number;
    sheetName?: string;
    customPrompt?: string;
    refillBelowCount?: number;
  };
  topics?: string[];
  companyInfo?: {
    name: string;
    hotline: string;
    address1: string;
    address2: string;
    mst: string;
    website: string;
    email: string;
    hashtags: string;
  };
  lastRunAt?: string | null;
  lastTopic?: string | null;
  lastRunStatus?: string | null;
  times?: string[];
  channelTimes?: {
    fanpage: string[];
    groups: string[];
    personal: string[];
  };
  channelSlots?: {
    fanpage?: Array<{ time: string; sheetName?: string }>;
    groups?: Array<{ time: string; sheetName?: string }>;
    personal?: Array<{ time: string; sheetName?: string }>;
  };
  channelSheets?: {
    fanpage?: string;
    groups?: string;
    personal?: string;
  };
  activeSheetTab?: string;
  groqBackupKeys?: string[];
  geminiBackupKeys?: string[];
  lastRun?: string | null;
}

export interface BotConfig {
  botToken?: string;
  token?: string;
  chatId: string;
  allowedChatIds?: string[];
  enableAlerts?: boolean;
  enableDailyDigest?: boolean;
  dailyDigestTime?: string;
  alertOnServerDown?: boolean;
  alertOnCheckpoint?: boolean;
  alertOnJobError?: boolean;
  alertOnNewMessages?: boolean;
  checkIntervalSeconds?: number;
  alerts?: {
    postFailure: boolean;
    rateLimitQuota: boolean;
    accountRotation: boolean;
    scheduleAlerts: boolean;
    watchdogAlerts: boolean;
  };
}

export interface ChatGptCredential {
  id: string;
  name: string;
  email: string;
  password?: string;
  plan?: 'Free' | 'Plus' | 'Team' | 'Enterprise';
  status?: 'active' | 'expired' | 'rate_limit' | 'backup';
  port?: number | string;
  profileDir?: string;
  notes?: string;
  updatedAt?: string;
}

export interface FacebookCredential {
  id: string;
  name: string;
  type?: 'personal' | 'fanpage' | 'via' | 'clone' | 'business';
  account: string; // Email / SĐT / UID
  password?: string;
  twoFactorSecret?: string; // 2FA Key
  profileUrl?: string;
  port?: number | string;
  profileDir?: string;
  status?: 'active' | 'checkpoint' | 'restricted' | 'locked' | 'backup';
  notes?: string;
  updatedAt?: string;
}

export interface CredentialsData {
  chatgpt: ChatGptCredential[];
  facebook: FacebookCredential[];
}

