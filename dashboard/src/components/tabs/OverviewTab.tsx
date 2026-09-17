'use client';

import React from 'react';
import {
  Radio,
  Share2,
  Bot,
  Sparkles,
  Globe,
  ArrowUpRight,
  Layers,
} from 'lucide-react';
import { ServerStatus, AccountItem, GroupAccount } from '@/types/dashboard';

interface OverviewTabProps {
  status: ServerStatus | null;
  groupsData: {
    accounts?: GroupAccount[];
    totalGroups?: number;
  };
  chatgptAccounts: AccountItem[];
  facebookGroupCount: number;
  totalAccountsCount: number;
  handleOpenChrome: (profileDir: string, port: number, url?: string) => Promise<void>;
  setActiveTab: (tab: 'overview' | 'analytics' | 'accounts' | 'groups' | 'schedule' | 'bot') => void;
}

export default function OverviewTab({
  status,
  groupsData,
  chatgptAccounts,
  facebookGroupCount,
  totalAccountsCount,
  handleOpenChrome,
  setActiveTab,
}: OverviewTabProps) {
  return (
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
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                status?.servers?.fanpageGpt?.active
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  status?.servers?.fanpageGpt?.active ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              ></span>
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
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                status?.servers?.fbGroups?.active
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  status?.servers?.fbGroups?.active ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              ></span>
              Port 3002
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Tự động đăng xoay vòng {groupsData?.accounts?.length || 7} tài khoản nhóm
          </p>
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
              <Sparkles className="w-3.5 h-3.5 text-violet-600" /> {chatgptAccounts?.length || 0} Tài khoản
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
            {chatgptAccounts?.map((acc, idx) => (
              <button
                key={acc.id}
                onClick={() => handleOpenChrome(acc.profileDir, acc.port, 'https://chatgpt.com/')}
                className="flex items-center justify-between p-4 rounded-2xl bg-white/70 hover:bg-white border border-slate-200/90 hover:border-blue-300 text-xs font-bold text-slate-800 shadow-xs hover:shadow-md transition-all group"
              >
                <span className="flex items-center gap-2.5 text-slate-800">
                  <span
                    className={`w-8 h-8 rounded-xl flex items-center justify-center border font-bold ${
                      idx === 0
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                        : idx === 1
                        ? 'bg-violet-50 text-violet-600 border-violet-100'
                        : 'bg-sky-50 text-sky-600 border-sky-100'
                    }`}
                  >
                    🤖
                  </span>
                  <span>
                    {acc.name} <span className="text-[11px] text-slate-400 font-normal">(Port {acc.port})</span>
                  </span>
                </span>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </button>
            ))}

            <button
              onClick={() => handleOpenChrome('n8n-chatgpt-profile', 9222, 'https://www.facebook.com/')}
              className="flex items-center justify-between p-4 rounded-2xl bg-white/70 hover:bg-white border border-slate-200/90 hover:border-blue-300 text-xs font-bold text-slate-800 shadow-xs hover:shadow-md transition-all group"
            >
              <span className="flex items-center gap-2.5 text-slate-800">
                <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 font-bold">
                  📄
                </span>
                <span>Facebook Fanpage Profile</span>
              </span>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </button>

            <button
              onClick={() => setActiveTab('accounts')}
              className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100/70 hover:to-indigo-100/70 border border-blue-200/80 text-xs font-bold text-blue-800 shadow-xs hover:shadow-md transition-all group"
            >
              <span className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                  👥
                </span>
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
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Share2 className="w-4 h-4" /> Quản lý Link Nhóm FB
          </button>
        </div>
      </div>
    </div>
  );
}
