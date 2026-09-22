'use client';

import React, { useState } from 'react';
import {
  Workflow,
  Clock,
  Radio,
  Activity,
  Zap,
  RefreshCw,
  Send,
  CheckCircle2,
  ExternalLink,
  Sliders,
  Share2,
  FileSpreadsheet,
  Plus,
  Users,
  Sparkles,
  Eye,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import { ScheduleConfig, AccountCategory } from '@/types/dashboard';

interface ScheduleTabProps {
  availableSheets: string[];
  facebookGroupCount: number;
  activeSheetTab: string;
  setActiveSheetTab: (val: string) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  handleToggleChannel: (channelKey: 'fanpage' | 'groups' | 'personal') => void;
  customRunTopic: string;
  setCustomRunTopic: (val: string) => void;
  triggerResult: any;
  liveProgress: any;
  scheduleConfig: any;
  setScheduleConfig: React.Dispatch<React.SetStateAction<any>>;
  handleSaveScheduleConfig: (newCfg: any) => Promise<void>;
  scheduleNextRun: { time: string | null; label: string; diffMinutes: number | null };
  isSchedulerRunning: boolean;
  scheduleLoading: boolean;
  scheduleTriggering: boolean;
  channelNextRuns: Record<string, { time: string | null; label: string; diffMinutes: number | null }>;
  newFanpageTime: string;
  setNewFanpageTime: (val: string) => void;
  newGroupsTime: string;
  setNewGroupsTime: (val: string) => void;
  newPersonalTime: string;
  setNewPersonalTime: (val: string) => void;
  workflowAccounts: any;
  setWorkflowAccounts: React.Dispatch<React.SetStateAction<any>>;
  workflowPreset: string;
  setWorkflowPreset: (val: string) => void;
  isWorkflowExecuting: boolean;
  activeWorkflowNode: string | null;
  nodeExecutionStates: Record<string, any>;
  inspectingNodeData: { id: string; name: string; data: any } | null;
  setInspectingNodeData: (val: { id: string; name: string; data: any } | null) => void;
  workflowActiveTab: 'canvas' | 'times' | 'sheets' | 'ai_config';
  setWorkflowActiveTab: (val: 'canvas' | 'times' | 'sheets' | 'ai_config') => void;
  handleAddChannelTime: (channelKey: 'fanpage' | 'groups' | 'personal', timeStr: string, targetAccountIds?: string[] | string, targetSheet?: string) => void;
  handleRemoveChannelTime: (channelKey: 'fanpage' | 'groups' | 'personal', timeStr: string) => void;
  handleSlotSheetChange: (channelKey: 'fanpage' | 'groups' | 'personal', time: string, sheetName: string) => void;
  handleSlotAccountChange?: (channelKey: 'fanpage' | 'groups' | 'personal', time: string, accountId: string) => void;
  handleSlotAccountsToggle?: (channelKey: 'fanpage' | 'groups' | 'personal', time: string, accountId: string) => void;
  handleSlotAccountsSet?: (channelKey: 'fanpage' | 'groups' | 'personal', time: string, accountIds: string[]) => void;
  renderSlotSheetSelect: (channelKey: 'fanpage' | 'groups' | 'personal', time: string) => React.ReactNode;
  handleTriggerAutoPilot: (customTopic?: string, channelKey?: 'fanpage' | 'groups' | 'personal') => Promise<void>;
  handleSyncGoogleSheets: (targetName?: string) => Promise<void>;
  sheetsOverview: {
    availableTabs?: Array<{ title: string; sheetId: number; rowCount?: number }>;
    sheetUrl?: string;
    activeTab?: string;
    previewRows?: any[];
    columns?: string[];
    channelMappings?: Record<string, string>;
    status?: string;
    totalItems?: number;
    pendingItems?: number;
    pending?: number;
    total?: number;
    done?: number;
    inProgress?: number;
    publishedItems?: number;
    errorItems?: number;
    nextTopic?: any;
  } | null;
  sheetsSyncing: boolean;
  handleSwitchSheetTab: (sheetName: string) => Promise<void>;
  handleUpdateChannelSheetMapping: (channel: 'fanpage' | 'groups' | 'personal', sheetName: string) => Promise<void>;
  topicGenLoading: boolean;
  topicGenNiche: string;
  setTopicGenNiche: (val: string) => void;
  topicGenNicheMode: string;
  setTopicGenNicheMode: (val: string) => void;
  topicGenCustomNiche: string;
  setTopicGenCustomNiche: (val: string) => void;
  topicGenCount: number;
  setTopicGenCount: (val: number) => void;
  topicGenSheet: string;
  setTopicGenSheet: (val: string) => void;
  topicGenPromptMode: string;
  setTopicGenPromptMode: (val: string) => void;
  topicGenCustomPrompt: string;
  setTopicGenCustomPrompt: (val: string) => void;
  topicGenCustomPromptText: string;
  setTopicGenCustomPromptText: (val: string) => void;
  lastGeneratedTopics: Array<{ id: string; topic: string; category: string; keywords: string; status: string }>;
  handleGenerateTopics: () => Promise<void>;
  showGeminiKeySecret: boolean;
  setShowGeminiKeySecret: (val: boolean) => void;
  newGeminiApiKey: string;
  setNewGeminiApiKey: (val: string) => void;
  showGroqKeySecret: boolean;
  setShowGroqKeySecret: (val: boolean) => void;
  newGroqApiKey: string;
  setNewGroqApiKey: (val: string) => void;
  handleAddBackupKey: (provider: 'groq' | 'gemini', rawKey: string) => Promise<void>;
  handleRemoveBackupKey: (provider: 'groq' | 'gemini', index: number) => Promise<void>;
  handleTestAi: () => Promise<void>;
  testingAi: boolean;
  accounts: AccountCategory[];
  copiedId: string | null;
  copyToClipboard: (text: string, id: string) => void;
}

export default function ScheduleTab({
  availableSheets,
  facebookGroupCount,
  activeSheetTab,
  setActiveSheetTab,
  showToast,
  handleToggleChannel,
  customRunTopic,
  setCustomRunTopic,
  triggerResult,
  liveProgress,
  scheduleConfig,
  setScheduleConfig,
  handleSaveScheduleConfig,
  scheduleNextRun,
  isSchedulerRunning,
  scheduleLoading,
  scheduleTriggering,
  channelNextRuns,
  newFanpageTime,
  setNewFanpageTime,
  newGroupsTime,
  setNewGroupsTime,
  newPersonalTime,
  setNewPersonalTime,
  workflowAccounts,
  setWorkflowAccounts,
  workflowPreset,
  setWorkflowPreset,
  isWorkflowExecuting,
  activeWorkflowNode,
  nodeExecutionStates,
  inspectingNodeData,
  setInspectingNodeData,
  workflowActiveTab,
  setWorkflowActiveTab,
  handleAddChannelTime,
  handleRemoveChannelTime,
  handleSlotSheetChange,
  handleSlotAccountChange,
  handleSlotAccountsToggle,
  handleSlotAccountsSet,
  renderSlotSheetSelect,
  handleTriggerAutoPilot,
  handleSyncGoogleSheets,
  sheetsOverview,
  sheetsSyncing,
  handleSwitchSheetTab,
  handleUpdateChannelSheetMapping,
  topicGenLoading,
  topicGenNiche,
  setTopicGenNiche,
  topicGenNicheMode,
  setTopicGenNicheMode,
  topicGenCustomNiche,
  setTopicGenCustomNiche,
  topicGenCount,
  setTopicGenCount,
  topicGenSheet,
  setTopicGenSheet,
  topicGenPromptMode,
  setTopicGenPromptMode,
  topicGenCustomPrompt,
  setTopicGenCustomPrompt,
  topicGenCustomPromptText,
  setTopicGenCustomPromptText,
  lastGeneratedTopics,
  handleGenerateTopics,
  showGeminiKeySecret,
  setShowGeminiKeySecret,
  newGeminiApiKey,
  setNewGeminiApiKey,
  showGroqKeySecret,
  setShowGroqKeySecret,
  newGroqApiKey,
  setNewGroqApiKey,
  handleAddBackupKey,
  handleRemoveBackupKey,
  handleTestAi,
  testingAi,
  accounts,
  copiedId,
  copyToClipboard,
}: ScheduleTabProps) {
  const [selectedNewFanpageAccounts, setSelectedNewFanpageAccounts] = useState<string[]>([]);
  const [selectedNewFanpageSheet, setSelectedNewFanpageSheet] = useState<string>('topics');

  const fanpageAccounts = React.useMemo(() => {
    const list: Array<{ id: string; name: string; port?: number }> = [];
    (accounts || []).forEach((cat) => {
      if (cat.category === 'facebook' || cat.category === 'fanpage') {
        (cat.items || []).forEach((item) => {
          if (item.enabled !== false && item.canPostFanpage !== false) {
            list.push({ id: item.id, name: item.name, port: item.port });
          }
        });
      }
    });
    return list;
  }, [accounts]);

  const toggleNewFanpageAccount = (accId: string) => {
    setSelectedNewFanpageAccounts((prev) =>
      prev.includes(accId) ? prev.filter((id) => id !== accId) : [...prev, accId]
    );
  };

  const selectAllNewFanpageAccounts = () => {
    setSelectedNewFanpageAccounts(fanpageAccounts.map((a) => a.id));
  };

  const clearNewFanpageAccounts = () => {
    setSelectedNewFanpageAccounts([]);
  };

  return (
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
                      placeholder={sheetsOverview?.nextTopic ? `Mặc định: "${(sheetsOverview.nextTopic?.topic || '').substring(0, 30)}..."` : "Nhập chủ đề tùy chọn (để trống: tự lấy từ Sheet)..."}
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
                      title="Bấm để Bật/Tắt Facebook Groups (Đăng bài trong nhóm)"
                    >
                      {scheduleConfig.channels?.groups ? '✓ FB Nhóm' : '✕ FB Nhóm'}
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

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
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

                      {/* List of Times with Account and Sheet */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <label className="block text-[11px] font-bold text-slate-700">Khung giờ Fanpage &amp; phân bổ tài khoản:</label>
                          <span className="text-[10px] text-blue-700 font-bold bg-blue-100/80 px-2 py-0.5 rounded-md">
                            1 giờ chọn được 1 hoặc nhiều nick
                          </span>
                        </div>
                        
                        <div className="space-y-2.5">
                          {(scheduleConfig.channelSchedules?.fanpage?.times || ['08:00', '16:00']).map((t: string) => {
                            const rawAccounts = scheduleConfig.channelSchedules?.fanpage?.accountsByTime?.[t]
                              ?? scheduleConfig.channelSchedules?.fanpage?.accountByTime?.[t];
                            const slotAccounts: string[] = Array.isArray(rawAccounts)
                              ? rawAccounts
                              : (rawAccounts ? [String(rawAccounts)] : []);

                            const currentSheet = scheduleConfig.channelSchedules?.fanpage?.sheetByTime?.[t]
                              || scheduleConfig.googleSheets?.channelSheetMapping?.fanpage
                              || scheduleConfig.googleSheets?.sheetName || 'topics';

                            return (
                              <div
                                key={t}
                                className="bg-white p-3 rounded-xl border border-blue-200/90 shadow-2xs space-y-2.5"
                              >
                                <div className="flex items-center justify-between gap-2 border-b border-blue-50 pb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-100 text-blue-900 font-black text-xs border border-blue-200 shadow-2xs">
                                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                                      {t}
                                    </span>
                                    <span className="text-[11px] font-bold text-slate-600">
                                      {slotAccounts.length > 0
                                        ? `Đang chọn ${slotAccounts.length} nick`
                                        : 'Tự động (Nick đầu tiên)'}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {/* Sheet Selector */}
                                    <div className="flex items-center gap-1">
                                      <span className="text-[10px] text-slate-500 font-semibold">Sheet:</span>
                                      <select
                                        value={currentSheet}
                                        onChange={(e) => handleSlotSheetChange('fanpage', t, e.target.value)}
                                        className="bg-blue-50 border border-blue-200 text-blue-900 text-[11px] font-bold rounded-lg px-2 py-1 max-w-[130px] truncate outline-hidden cursor-pointer"
                                        title="Chọn Sheet chứa chủ đề/bài viết cho khung giờ này"
                                      >
                                        {availableSheets.map((s) => (
                                          <option key={s} value={s}>{s}</option>
                                        ))}
                                      </select>
                                    </div>

                                    {/* Delete Slot */}
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveChannelTime('fanpage', t)}
                                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                      title={`Xóa khung giờ ${t}`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Account Selection Chips for this slot */}
                                <div>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-[10px] font-semibold text-slate-500">
                                      Chọn tài khoản chạy khung giờ này:
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => handleSlotAccountsSet?.('fanpage', t, fanpageAccounts.map((a) => a.id))}
                                        className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                                        title="Chọn tất cả các tài khoản Fanpage cho giờ này"
                                      >
                                        Tất cả ({fanpageAccounts.length})
                                      </button>
                                      <span className="text-slate-300">|</span>
                                      <button
                                        type="button"
                                        onClick={() => handleSlotAccountsSet?.('fanpage', t, [])}
                                        className="text-[10px] font-bold text-slate-500 hover:underline cursor-pointer"
                                        title="Chỉ chạy nick mặc định đầu tiên"
                                      >
                                        Mặc định
                                      </button>
                                    </div>
                                  </div>

                                  <div className="flex flex-wrap gap-1.5">
                                    {fanpageAccounts.map((acc) => {
                                      const isSelected = slotAccounts.includes(acc.id);
                                      return (
                                        <button
                                          key={acc.id}
                                          type="button"
                                          onClick={() => handleSlotAccountsToggle?.('fanpage', t, acc.id)}
                                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                                            isSelected
                                              ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                          }`}
                                          title={isSelected ? `Bấm để BỎ tài khoản ${acc.name}` : `Bấm để CHỌN tài khoản ${acc.name}`}
                                        >
                                          {isSelected ? (
                                            <Check className="w-3 h-3 text-white" />
                                          ) : (
                                            <span className="w-2.5 h-2.5 rounded-full border border-slate-300" />
                                          )}
                                          <span>{acc.name}</span>
                                          <span className={`text-[10px] font-mono ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                                            ({acc.id})
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Add Time Form */}
                      <div className="bg-white/90 p-3.5 rounded-xl border border-blue-200/80 space-y-3">
                        <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Plus className="w-3.5 h-3.5 text-blue-600" /> Thêm khung giờ mới (chọn 1 hoặc nhiều nick):
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={selectAllNewFanpageAccounts}
                              className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                            >
                              Chọn tất cả
                            </button>
                            <span className="text-slate-300">|</span>
                            <button
                              type="button"
                              onClick={clearNewFanpageAccounts}
                              className="text-[10px] font-bold text-slate-500 hover:underline cursor-pointer"
                            >
                              Bỏ chọn
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Giờ đăng</label>
                            <input
                              type="time"
                              value={newFanpageTime}
                              onChange={(e) => setNewFanpageTime(e.target.value)}
                              className="liquid-input rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Chọn loại bài (Sheet)</label>
                            <select
                              value={selectedNewFanpageSheet}
                              onChange={(e) => setSelectedNewFanpageSheet(e.target.value)}
                              className="bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold rounded-xl px-2.5 py-1.5 w-full truncate outline-hidden cursor-pointer"
                            >
                              {availableSheets.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-1.5">
                            Chọn tài khoản FB ({selectedNewFanpageAccounts.length > 0 ? `${selectedNewFanpageAccounts.length} nick được chọn` : 'Chưa chọn -> Mặc định nick đầu'}):
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {fanpageAccounts.map((acc) => {
                              const isSelected = selectedNewFanpageAccounts.includes(acc.id);
                              return (
                                <button
                                  key={acc.id}
                                  type="button"
                                  onClick={() => toggleNewFanpageAccount(acc.id)}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                                    isSelected
                                      ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                                  }`}
                                >
                                  {isSelected ? (
                                    <Check className="w-3 h-3 text-white" />
                                  ) : (
                                    <span className="w-2.5 h-2.5 rounded-full border border-slate-300" />
                                  )}
                                  <span>{acc.name}</span>
                                  <span className={`text-[10px] font-mono ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                                    ({acc.id})
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (!newFanpageTime) return;
                            handleAddChannelTime('fanpage', newFanpageTime, selectedNewFanpageAccounts, selectedNewFanpageSheet);
                            setSelectedNewFanpageAccounts([]);
                          }}
                          className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> Thêm Khung Giờ Này
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

                    {/* CARD 2: GROUPS SCHEDULE - ĐĂNG BÀI TRONG NHÓM */}
                    <div className="p-5 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 shadow-xs space-y-4">
                      <div className="flex items-center justify-between border-b border-indigo-200/80 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
                            <Users className="w-4 h-4" />
                          </span>
                          <div>
                            <h4 className="font-extrabold text-sm text-slate-900">Facebook Groups (Đăng bài trong nhóm)</h4>
                            <span className="text-[10px] font-bold text-indigo-700">Port 3002 • Xoay vòng {facebookGroupCount || 101} nhóm Facebook</span>
                          </div>
                        </div>

                        {/* Interactive Toggle Switch */}
                        <button
                          type="button"
                          onClick={() => handleToggleChannel('groups')}
                          className="flex items-center gap-2 cursor-pointer group select-none p-1 rounded-xl hover:bg-indigo-100/50 transition-all"
                          title={scheduleConfig.channels?.groups ? 'Bấm để TẮT đăng Nhóm Facebook' : 'Bấm để BẬT đăng Nhóm Facebook'}
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
                        <label className="block text-[11px] font-bold text-slate-700">Khung giờ đăng Nhóm hiện tại:</label>
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
                          <Plus className="w-3.5 h-3.5" /> Thêm Giờ Đăng Nhóm
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={scheduleTriggering}
                        onClick={() => handleTriggerAutoPilot(customRunTopic, 'groups')}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" /> 🚀 ĐĂNG NGAY VÀO NHÓM (TEST)
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

                  {/* Card: Tự Động Nghiên Cứu & Bổ Sung Chủ Đề Vào Google Sheet */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-purple-50/70 to-pink-50/80 border border-indigo-200/80 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-indigo-200/60">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-xs">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                            Tự Động Tìm Kiếm &amp; Nạp Chủ Đề Vào Google Sheet
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700">
                              AI Content Researcher
                            </span>
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            AI tự động phân tích thị trường, nghiên cứu chủ đề chuẩn SEO, không trùng lặp và ghi thẳng vào Google Sheet cho Auto-Pilot viết bài
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Lĩnh vực / Từ khóa (Dropdown + Tự nhập) */}
                      <div className="md:col-span-2 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="block text-xs font-bold text-slate-700">
                            🎯 Chọn Lĩnh vực / Ngành hàng nghiên cứu:
                          </label>
                          <span className="text-[10px] font-semibold text-indigo-600">
                            {topicGenNicheMode === 'custom' ? '✍️ Đang nhập tùy chỉnh' : '📋 Đang chọn mẫu sẵn'}
                          </span>
                        </div>
                        <select
                          value={topicGenNicheMode}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTopicGenNicheMode(val);
                            if (val !== 'custom') {
                              setTopicGenNiche(val);
                            }
                          }}
                          className="w-full bg-white border border-indigo-200 text-xs font-bold text-slate-900 rounded-xl px-3 py-2.5 outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all shadow-xs cursor-pointer"
                        >
                          <option value="Thiết kế Website chuẩn SEO, Chuyển đổi số & AI Marketing doanh nghiệp">
                            🌐 Thiết kế Website chuẩn SEO, Chuyển đổi số &amp; AI Marketing (Mặc định)
                          </option>
                          <option value="Thiết kế Website bán hàng chuẩn SEO, Tối ưu chuyển đổi & UI/UX">
                            🛒 Thiết kế Website bán hàng, Landing Page tăng tỷ lệ chuyển đổi
                          </option>
                          <option value="Giải pháp Chuyển đổi số & Tự động hóa quy trình cho doanh nghiệp SME">
                            ⚡ Chuyển đổi số toàn diện &amp; Tự động hóa quy trình cho SME
                          </option>
                          <option value="Phần mềm CRM & Hệ thống quản trị bán hàng đa kênh thông minh">
                            📊 Phần mềm CRM &amp; Quản trị khách hàng, bán hàng đa kênh
                          </option>
                          <option value="Ứng dụng AI đột phá giúp tăng x3 năng suất kinh doanh 2026">
                            🤖 Ứng dụng AI &amp; Công nghệ đột phá giúp tăng x3 năng suất 2026
                          </option>
                          <option value="Bảo mật Website, Tối ưu tốc độ tải trang & SEO Top Google">
                            🔒 Bảo mật Website, Tối ưu tốc độ tải trang &amp; Đẩy Top Google
                          </option>
                          <option value="Chiến lược Marketing Facebook, Viral Content & Thu hút khách hàng">
                            📢 Chiến lược Marketing Facebook, Bài viết Viral &amp; Thu hút khách hàng
                          </option>
                          <option value="custom">✍️ Khác (Tự nhập lĩnh vực / từ khóa riêng của bạn)...</option>
                        </select>

                        {/* Ô nhập khi chọn Khác */}
                        {topicGenNicheMode === 'custom' && (
                          <div className="pt-1 animate-in fade-in duration-200">
                            <input
                              type="text"
                              value={topicGenCustomNiche}
                              onChange={(e) => {
                                setTopicGenCustomNiche(e.target.value);
                                setTopicGenNiche(e.target.value);
                              }}
                              placeholder="Nhập lĩnh vực của bạn (ví dụ: Mỹ phẩm thiên nhiên, Thiết kế nội thất, Bất động sản cao cấp, Khóa học ngoại ngữ...)"
                              className="w-full bg-indigo-50/70 border border-indigo-300 text-xs font-bold text-indigo-950 rounded-xl px-3.5 py-2 outline-hidden focus:border-indigo-500 focus:bg-white transition-all shadow-xs"
                              autoFocus
                            />
                          </div>
                        )}
                      </div>

                      {/* Sheet đích & Số lượng */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-700">Sheet đích:</label>
                          <select
                            value={topicGenSheet}
                            onChange={(e) => setTopicGenSheet(e.target.value)}
                            className="w-full bg-white border border-indigo-200 text-xs font-bold text-indigo-950 rounded-xl px-2.5 py-2.5 outline-hidden focus:border-indigo-500 cursor-pointer shadow-xs"
                          >
                            {availableSheets.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-700">Số lượng tạo:</label>
                          <select
                            value={topicGenCount}
                            onChange={(e) => setTopicGenCount(Number(e.target.value))}
                            className="w-full bg-white border border-indigo-200 text-xs font-bold text-indigo-950 rounded-xl px-2.5 py-2.5 outline-hidden focus:border-indigo-500 cursor-pointer shadow-xs"
                          >
                            <option value={3}>3 chủ đề</option>
                            <option value={5}>5 chủ đề</option>
                            <option value={10}>10 chủ đề</option>
                            <option value={15}>15 chủ đề</option>
                            <option value={20}>20 chủ đề</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Yêu cầu thêm (Dropdown + Tự nhập) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-slate-700">
                          💡 Phong cách &amp; Yêu cầu sáng tạo bổ sung:
                        </label>
                        <span className="text-[10px] font-semibold text-indigo-600">
                          {topicGenPromptMode === 'custom' ? '✍️ Đang nhập tùy chỉnh' : '✨ Phong cách gợi ý'}
                        </span>
                      </div>
                      <select
                        value={topicGenPromptMode}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTopicGenPromptMode(val);
                          const PRESETS: Record<string, string> = {
                            default: '',
                            pain_point: 'Phân tích trực diện nỗi đau của khách hàng và đưa ra giải pháp thực chiến',
                            common_mistakes: 'Tập trung vào các sai lầm phổ biến khiến mất khách & cách khắc phục triệt để',
                            case_study: 'Dẫn chứng số liệu thực tế, case study thành công & tối ưu chi phí đầu tư ROI',
                            expert_tips: 'Bí quyết chuyên gia, hướng dẫn từng bước (Step-by-step) ngắn gọn, dễ áp dụng ngay',
                            trend_2026: 'Đón đầu xu hướng công nghệ & kinh doanh đột phá mới nhất năm 2026',
                          };
                          if (val !== 'custom') {
                            setTopicGenCustomPrompt(PRESETS[val] || '');
                          }
                        }}
                        className="w-full bg-white border border-indigo-200 text-xs font-bold text-slate-900 rounded-xl px-3 py-2 outline-hidden focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all shadow-xs cursor-pointer"
                      >
                        <option value="default">✨ (Mặc định) AI tự động phân tích &amp; tối ưu góc nhìn hấp dẫn nhất</option>
                        <option value="pain_point">🎯 Phân tích trực diện nỗi đau của khách hàng và đưa ra giải pháp thực chiến</option>
                        <option value="common_mistakes">⚠️ Tập trung vào các sai lầm phổ biến khiến mất khách &amp; cách khắc phục</option>
                        <option value="case_study">📈 Dẫn chứng số liệu thực tế, case study thành công &amp; cam kết ROI</option>
                        <option value="expert_tips">🧠 Bí quyết chuyên gia, hướng dẫn từng bước (Step-by-step) dễ áp dụng</option>
                        <option value="trend_2026">🚀 Đón đầu xu hướng công nghệ &amp; kinh doanh mới nhất năm 2026</option>
                        <option value="custom">✍️ Khác (Tự nhập yêu cầu riêng của bạn)...</option>
                      </select>

                      {/* Ô nhập khi chọn Khác */}
                      {topicGenPromptMode === 'custom' && (
                        <div className="pt-1 animate-in fade-in duration-200">
                          <input
                            type="text"
                            value={topicGenCustomPromptText}
                            onChange={(e) => {
                              setTopicGenCustomPromptText(e.target.value);
                              setTopicGenCustomPrompt(e.target.value);
                            }}
                            placeholder="Nhập yêu cầu riêng (ví dụ: Giọng văn hài hước, phân tích so sánh chi phí, nhấn mạnh ưu đãi trong tháng...)"
                            className="w-full bg-indigo-50/70 border border-indigo-300 text-xs font-medium text-slate-900 rounded-xl px-3.5 py-2 outline-hidden focus:border-indigo-500 focus:bg-white transition-all shadow-xs"
                            autoFocus
                          />
                        </div>
                      )}
                    </div>

                    {/* Cơ chế tự động hóa: Auto-Refill & Scheduled */}
                    <div className="p-3.5 rounded-xl bg-white/85 border border-indigo-100 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-indigo-600" />
                          Cài Đặt Tự Động Nạp Chủ Đề Vào Google Sheet:
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-500">Chế độ tự động:</span>
                          <button
                            type="button"
                            onClick={() => {
                              const updatedAuto = {
                                ...scheduleConfig.autoTopicGeneration,
                                enabled: !(scheduleConfig.autoTopicGeneration?.enabled ?? true),
                              };
                              const newCfg = { ...scheduleConfig, autoTopicGeneration: updatedAuto as any };
                              setScheduleConfig(newCfg);
                              handleSaveScheduleConfig(newCfg);
                              showToast(`Đã ${updatedAuto.enabled ? 'BẬT' : 'TẮT'} tự động nạp chủ đề!`, 'success');
                            }}
                            className={`px-2.5 py-1 rounded-full text-xs font-black transition-all cursor-pointer ${
                              (scheduleConfig.autoTopicGeneration?.enabled ?? true)
                                ? 'bg-emerald-500 text-white shadow-xs'
                                : 'bg-slate-200 text-slate-500'
                            }`}
                          >
                            {(scheduleConfig.autoTopicGeneration?.enabled ?? true) ? '✓ ĐANG BẬT' : '✕ ĐÃ TẮT'}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                        {/* Auto-Refill */}
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-700">🔄 Tự động bù khi sắp hết:</span>
                            <input
                              type="radio"
                              name="triggerMode"
                              checked={(scheduleConfig.autoTopicGeneration?.triggerMode ?? 'auto_refill') === 'auto_refill'}
                              onChange={() => {
                                const updatedAuto = { ...scheduleConfig.autoTopicGeneration, triggerMode: 'auto_refill' as const };
                                const newCfg = { ...scheduleConfig, autoTopicGeneration: updatedAuto as any };
                                setScheduleConfig(newCfg);
                                handleSaveScheduleConfig(newCfg);
                              }}
                              className="accent-indigo-600 cursor-pointer"
                            />
                          </div>
                          <p className="text-[11px] text-slate-500 leading-snug">
                            Khi số chủ đề Chờ đăng trong Sheet còn ít hơn{' '}
                            <input
                              type="number"
                              min={1}
                              max={20}
                              value={scheduleConfig.autoTopicGeneration?.minPendingThreshold ?? 3}
                              onChange={(e) => {
                                const val = Math.max(1, parseInt(e.target.value) || 3);
                                const updatedAuto = { ...scheduleConfig.autoTopicGeneration, minPendingThreshold: val };
                                const newCfg = { ...scheduleConfig, autoTopicGeneration: updatedAuto as any };
                                setScheduleConfig(newCfg);
                                handleSaveScheduleConfig(newCfg);
                              }}
                              className="w-12 px-1 py-0.5 text-center font-bold text-indigo-700 bg-white border border-indigo-300 rounded mx-1"
                            />{' '}
                            bài, hệ thống sẽ tự nạp thêm {topicGenCount} bài mới.
                          </p>
                        </div>

                        {/* Scheduled Time */}
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-700">⏰ Nạp định kỳ hàng ngày:</span>
                            <input
                              type="radio"
                              name="triggerMode"
                              checked={scheduleConfig.autoTopicGeneration?.triggerMode === 'scheduled'}
                              onChange={() => {
                                const updatedAuto = { ...scheduleConfig.autoTopicGeneration, triggerMode: 'scheduled' as const };
                                const newCfg = { ...scheduleConfig, autoTopicGeneration: updatedAuto as any };
                                setScheduleConfig(newCfg);
                                handleSaveScheduleConfig(newCfg);
                              }}
                              className="accent-indigo-600 cursor-pointer"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-500">Khung giờ chạy:</span>
                            <input
                              type="time"
                              value={scheduleConfig.autoTopicGeneration?.scheduleTime || '07:00'}
                              onChange={(e) => {
                                const updatedAuto = { ...scheduleConfig.autoTopicGeneration, scheduleTime: e.target.value };
                                const newCfg = { ...scheduleConfig, autoTopicGeneration: updatedAuto as any };
                                setScheduleConfig(newCfg);
                                handleSaveScheduleConfig(newCfg);
                              }}
                              className="bg-white border border-indigo-300 rounded px-2 py-0.5 text-xs font-bold text-indigo-900"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Nút Kích Hoạt Tìm Kiếm & Nạp Ngay */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Chủ đề được nạp vào Sheet sẽ tự động kích hoạt viết bài theo khung giờ cài đặt ở tab <b>Lịch trình</b>.</span>
                      </div>
                      <button
                        type="button"
                        disabled={topicGenLoading}
                        onClick={handleGenerateTopics}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-md hover:shadow-lg transition-all disabled:opacity-50"
                      >
                        {topicGenLoading ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Đang AI Nghiên Cứu &amp; Nạp Vào Sheet...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            🚀 Tìm Kiếm &amp; Nạp {topicGenCount} Chủ Đề Ngay
                          </>
                        )}
                      </button>
                    </div>

                    {/* Danh sách chủ đề vừa nạp gần nhất */}
                    {lastGeneratedTopics && lastGeneratedTopics.length > 0 && (
                      <div className="pt-3 border-t border-indigo-200/60 space-y-2">
                        <div className="flex items-center justify-between text-xs font-extrabold text-slate-700">
                          <span>🎉 Vừa nạp thành công {lastGeneratedTopics.length} chủ đề mới:</span>
                          <span className="text-[10px] text-indigo-600 font-bold">Đã lưu vào Google Sheet</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                          {lastGeneratedTopics.map((t, idx) => (
                            <div key={idx} className="p-2.5 rounded-xl bg-white border border-indigo-100 shadow-2xs flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-slate-900 leading-snug">
                                  {idx + 1}. {t.topic}
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                                  <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold">{t.category}</span>
                                  <span className="truncate">Từ khóa: {t.keywords}</span>
                                </div>
                              </div>
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0">
                                ✓ Pending
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
  );
}
