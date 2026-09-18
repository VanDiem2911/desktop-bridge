import { NextRequest, NextResponse } from 'next/server';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import {
  readJsonFile,
  writeJsonFile,
  GROUPS_CONFIG_PATH,
  PERSONAL_CONFIG_PATH,
  CHATGPT_CONFIG_PATH,
  FANPAGE_CONFIG_PATH,
  checkChromeTabStatus,
  fetchFacebookTitle,
} from '@/lib/server-utils';

interface FanpageAccount {
  id: number | string;
  name: string;
  pageUrl: string;
  profileDir?: string;
  port?: number;
  enabled?: boolean;
  desc?: string;
}

interface GroupAccount {
  id: string;
  name: string;
  profileUrl?: string;
  profileDir?: string;
  port?: number;
  enabled?: boolean;
  roleGroup?: string;
  originalRoleGroup?: string;
  groupUrls?: string[];
  lastGroupIndex?: number;
  lastPostedAt?: string | null;
  [key: string]: unknown;
}

function parseFacebookUrls(value: unknown): string[] {
  const values = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(/\r?\n/)
      : [];

  return [...new Set(
    values
      .filter((url): url is string => typeof url === 'string')
      .map((url) => url.trim())
      .filter((url) => /^https?:\/\//i.test(url)),
  )];
}

function assignUniqueFacebookProfiles(
  fanpages: FanpageAccount[],
  groups: Array<Record<string, unknown>>,
): boolean {
  const usedPorts = new Set<number>();
  const usedProfiles = new Set<string>();
  let nextPort = 9223;
  let changed = false;

  for (const account of [...fanpages, ...groups]) {
    const currentPort = Number(account.port);
    const currentProfile = typeof account.profileDir === 'string' ? account.profileDir : '';
    const hasUniquePort = Number.isInteger(currentPort) && currentPort >= 9223 && !usedPorts.has(currentPort);
    const hasUniqueProfile = Boolean(currentProfile) && !usedProfiles.has(currentProfile);

    if (hasUniquePort && hasUniqueProfile) {
      usedPorts.add(currentPort);
      usedProfiles.add(currentProfile);
      continue;
    }

    while (usedPorts.has(nextPort)) nextPort++;
    account.port = nextPort;
    account.profileDir = `n8n-fb-profile-${nextPort}`;
    usedPorts.add(nextPort);
    usedProfiles.add(`n8n-fb-profile-${nextPort}`);
    nextPort++;
    changed = true;
  }

  return changed;
}


function getFanpageConfig(): { accounts: FanpageAccount[] } {
  const raw = readJsonFile<Record<string, unknown>>(FANPAGE_CONFIG_PATH, {});
  if (Array.isArray(raw.accounts) && raw.accounts.length > 0) {
    return { accounts: raw.accounts as FanpageAccount[] };
  }
  if (raw.name || raw.pageUrl) {
    return {
      accounts: [
        {
          id: 1,
          name: (raw.name as string) || 'Facebook Fanpage Chính',
          pageUrl: (raw.pageUrl as string) || 'https://www.facebook.com/',
          profileDir: (raw.profileDir as string) || 'n8n-chatgpt-profile',
          port: (raw.port as number) || 9222,
          enabled: raw.enabled !== false,
          desc: (raw.desc as string) || 'Profile Chrome xuất bản bài viết lên Fanpage chính',
        },
      ],
    };
  }
  return {
    accounts: [
      {
        id: 1,
        name: 'Facebook Fanpage Chính',
        pageUrl: 'https://www.facebook.com/',
        profileDir: 'n8n-chatgpt-profile',
        port: 9222,
        enabled: true,
        desc: 'Profile Chrome xuất bản bài viết lên Fanpage chính',
      },
    ],
  };
}

export async function GET() {
  try {
    const groupsConfig = readJsonFile<{ accounts: Array<Record<string, unknown>> }>(GROUPS_CONFIG_PATH, { accounts: [] });
    const personalConfig = readJsonFile<{ activeAccount?: number; accounts: Array<Record<string, unknown>> }>(PERSONAL_CONFIG_PATH, { accounts: [] });
    const fanpageConfig = getFanpageConfig();
    const chatgptConfig = readJsonFile<{ accounts: Array<Record<string, unknown>> }>(CHATGPT_CONFIG_PATH, {
      accounts: [
        { id: 1, name: 'ChatGPT Tài khoản 1', profileDir: 'n8n-chatgpt-profile', port: 9222, enabled: true },
        { id: 2, name: 'ChatGPT Tài khoản 2', profileDir: 'n8n-chatgpt-profile-2', port: 9242, enabled: true },
      ],
    });

    if (assignUniqueFacebookProfiles(fanpageConfig.accounts, groupsConfig.accounts || [])) {
      writeJsonFile(FANPAGE_CONFIG_PATH, fanpageConfig);
      writeJsonFile(GROUPS_CONFIG_PATH, groupsConfig);
    }

    const localAppData = path.join(os.homedir(), 'AppData', 'Local');

    const chatgptItems = (chatgptConfig.accounts || []).map((acc, index) => {
      const num = index + 1;
      const profileDir = (acc.profileDir as string) || (num === 1 ? 'n8n-chatgpt-profile' : `n8n-chatgpt-profile-${num}`);
      const profilePath = path.join(localAppData, profileDir);
      const profileExists = fs.existsSync(profilePath);
      const port = (acc.port as number) || (num === 1 ? 9222 : 9240 + num);

      return {
        id: `gpt_${acc.id || num}`,
        rawId: String(acc.id || num),
        name: (acc.name as string) || `ChatGPT Tài khoản ${num}`,
        port,
        profileDir,
        url: 'https://chatgpt.com/',
        desc: `Tài khoản ChatGPT xen kẽ số ${num} (Port ${port})`,
        enabled: acc.enabled !== false,
        profileExists,
        isConfigured: profileExists,
      };
    });

    const fanpageItems = (fanpageConfig.accounts || []).map((acc, index) => {
      const num = index + 1;
      const profileDir = (acc.profileDir as string) || (num === 1 ? 'n8n-chatgpt-profile' : `n8n-fanpage-profile-${num}`);
      const profilePath = path.join(localAppData, profileDir);
      const profileExists = fs.existsSync(profilePath);
      const port = (acc.port as number) || (num === 1 ? 9222 : 9250 + num);
      const pageUrl = (acc.pageUrl as string) || 'https://www.facebook.com/';

      return {
        id: `fanpage_${acc.id || num}`,
        rawId: String(acc.id || num),
        name: (acc.name as string) || `Fanpage ${num}`,
        port,
        profileDir,
        url: pageUrl,
        pageUrl,
        desc: (acc.desc as string) || `Link Fanpage: ${pageUrl} (Port ${port})`,
        enabled: acc.enabled !== false,
        profileExists,
        isConfigured: Boolean(pageUrl && pageUrl.startsWith('https://www.facebook.com/')),
      };
    });

    const groupItems = (groupsConfig.accounts || []).map((acc, index) => {
      const num = index + 1;
      const profileDir = (acc.profileDir as string) || `n8n-fb-group-profile-${num}`;
      const profilePath = path.join(localAppData, profileDir);
      const profileExists = fs.existsSync(profilePath);
      const groupUrls = Array.isArray(acc.groupUrls) ? acc.groupUrls : [];
      const isConfigured = profileExists || groupUrls.length > 0;

      return {
        id: (acc.id as string) || `acc_${num}`,
        rawId: (acc.id as string) || `acc_${num}`,
        accIndex: num,
        name: (acc.name as string) || `Tài khoản Group ${num}`,
        port: (acc.port as number) || (9222 + num),
        profileDir,
        url: 'https://www.facebook.com/',
        groupCount: groupUrls.length,
        enabled: acc.enabled !== false,
        profileExists,
        isConfigured,
        desc: `Profile Chrome riêng biệt số ${num}`,
      };
    });

    const personalItems = (personalConfig.accounts || []).map((acc, index) => {
      const num = index + 1;
      const pDir = (acc.profileDir as string) || `n8n-personal-profile-${num}`;
      const pExists = fs.existsSync(path.join(localAppData, pDir));
      const pUrl = (acc.profileUrl as string) || 'https://www.facebook.com/';
      const port = (acc.port as number) || (9230 + index);

      return {
        id: `personal_acc_${acc.id || num}`,
        rawId: String(acc.id || num),
        name: (acc.name as string) || `Facebook Cá nhân ${acc.id || num}`,
        port,
        profileDir: pDir,
        url: pUrl,
        profileUrl: pUrl,
        desc: (acc.description as string) || `Trang cá nhân: ${pUrl} (Port ${port})`,
        enabled: acc.enabled !== false,
        profileExists: pExists,
        isConfigured: Boolean(pUrl && pUrl.startsWith('https://www.facebook.com/')),
      };
    });

    const categories = [
      {
        category: 'chatgpt',
        categoryName: `🤖 Tài khoản ChatGPT (${chatgptItems.length} Tài khoản Xen Kẽ)`,
        description: 'Các tài khoản ChatGPT tự động luân phiên xen kẽ và dự phòng khi hết token',
        items: chatgptItems,
      },
      {
        category: 'fanpage',
        categoryName: `📄 Facebook Fanpage (${fanpageItems.length} Tài khoản Fanpage)`,
        description: 'Profile Chrome xuất bản bài viết lên Fanpage',
        items: fanpageItems,
      },
      {
        category: 'groups',
        categoryName: `👥 Facebook Groups (${groupItems.length} Tài khoản đăng nhóm)`,
        description: 'Các Profile Chrome riêng biệt để xoay vòng đăng bài nhóm',
        items: groupItems,
      },
    ];

    // Kiểm tra trạng thái port online & trạng thái tab login qua CDP song song
    const checkPromises: Promise<void>[] = [];
    for (const cat of categories) {
      const service = cat.category === 'chatgpt' ? 'chatgpt' : 'facebook';
      for (const item of cat.items) {
        checkPromises.push(
          (async () => {
            const status = await checkChromeTabStatus(item.port, service);
            const itemObj = item as Record<string, unknown>;
            itemObj.isReady = status.isReady;
            itemObj.loginStatus = status.loginStatus;
            itemObj.currentUrl = status.currentUrl;
          })(),
        );
      }
    }
    await Promise.all(checkPromises);

    return NextResponse.json({ ok: true, categories });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, accountId, enabled, name, profileDir, port, pageUrl, profileUrl, description, groupUrlsText } = body;

    // ================= CHATGPT CRUD =================
    if (action === 'toggle_chatgpt') {
      const config = readJsonFile<{ accounts: Array<{ id: number | string; enabled?: boolean; name: string }> }>(CHATGPT_CONFIG_PATH, { accounts: [] });
      const rawId = String(accountId).replace('gpt_', '');
      const target = config.accounts.find((a) => String(a.id) === rawId);
      if (target) {
        target.enabled = Boolean(enabled);
        writeJsonFile(CHATGPT_CONFIG_PATH, config);
        return NextResponse.json({ ok: true, message: `Đã ${enabled ? 'bật' : 'tắt'} tài khoản ${target.name}` });
      }
      return NextResponse.json({ ok: false, error: 'Không tìm thấy tài khoản ChatGPT' }, { status: 404 });
    }

    if (action === 'add_chatgpt') {
      const config = readJsonFile<{ accounts: Array<{ id: number; name: string; profileDir: string; port: number; enabled?: boolean }> }>(CHATGPT_CONFIG_PATH, { accounts: [] });
      const nextId = config.accounts.length > 0 ? Math.max(...config.accounts.map(a => Number(a.id) || 0)) + 1 : 1;
      const newAcc = {
        id: nextId,
        name: name?.trim() || `ChatGPT Tài khoản ${nextId}`,
        profileDir: profileDir?.trim() || `n8n-chatgpt-profile-${nextId}`,
        port: port ? Number(port) : (nextId === 1 ? 9222 : 9240 + nextId),
        enabled: enabled !== false,
      };
      config.accounts.push(newAcc);
      writeJsonFile(CHATGPT_CONFIG_PATH, config);
      return NextResponse.json({ ok: true, message: `Đã thêm tài khoản "${newAcc.name}" thành công!`, data: config });
    }

    if (action === 'delete_chatgpt') {
      const config = readJsonFile<{ accounts: Array<{ id: number | string; name: string }> }>(CHATGPT_CONFIG_PATH, { accounts: [] });
      const rawId = String(accountId).replace('gpt_', '');
      const idx = config.accounts.findIndex((a) => String(a.id) === rawId);
      if (idx === -1) return NextResponse.json({ ok: false, error: 'Không tìm thấy tài khoản ChatGPT để xóa' }, { status: 404 });
      const removed = config.accounts.splice(idx, 1);
      writeJsonFile(CHATGPT_CONFIG_PATH, config);
      return NextResponse.json({ ok: true, message: `Đã xóa tài khoản "${removed[0]?.name || accountId}"!`, data: config });
    }

    if (action === 'update_chatgpt') {
      const config = readJsonFile<{ accounts: Array<{ id: number | string; name: string; profileDir: string; port: number; enabled?: boolean }> }>(CHATGPT_CONFIG_PATH, { accounts: [] });
      const rawId = String(accountId).replace('gpt_', '');
      const target = config.accounts.find((a) => String(a.id) === rawId);
      if (!target) return NextResponse.json({ ok: false, error: 'Không tìm thấy tài khoản ChatGPT' }, { status: 404 });
      if (name) target.name = name.trim();
      if (profileDir) target.profileDir = profileDir.trim();
      if (port) target.port = Number(port);
      if (enabled !== undefined) target.enabled = Boolean(enabled);
      writeJsonFile(CHATGPT_CONFIG_PATH, config);
      return NextResponse.json({ ok: true, message: `Đã cập nhật ${target.name}`, data: config });
    }

    // ================= FANPAGE CRUD =================
    if (action === 'toggle_fanpage') {
      const config = getFanpageConfig();
      const rawId = String(accountId).replace('fanpage_', '');
      const target = config.accounts.find((a) => String(a.id) === rawId);
      if (target) {
        target.enabled = Boolean(enabled);
        writeJsonFile(FANPAGE_CONFIG_PATH, config);
        return NextResponse.json({ ok: true, message: `Đã ${enabled ? 'bật' : 'tắt'} Fanpage "${target.name}"` });
      }
      return NextResponse.json({ ok: false, error: 'Không tìm thấy tài khoản Fanpage' }, { status: 404 });
    }

    if (action === 'add_fanpage') {
      const config = getFanpageConfig();
      const nextId = config.accounts.length > 0 ? Math.max(...config.accounts.map(a => Number(a.id) || 0)) + 1 : 1;
      let finalName = name?.trim();
      const cleanUrl = pageUrl?.trim() || 'https://www.facebook.com/';
      if (!finalName && cleanUrl && cleanUrl !== 'https://www.facebook.com/') {
        finalName = await fetchFacebookTitle(cleanUrl);
      }
      if (!finalName) {
        finalName = `Facebook Fanpage ${nextId}`;
      }

      const newAcc: FanpageAccount = {
        id: nextId,
        name: finalName,
        pageUrl: cleanUrl,
        profileDir: profileDir?.trim() || 'n8n-fb-group-profile-1',
        port: port ? Number(port) : 9223,
        enabled: enabled !== false,
        desc: description?.trim() || `Fanpage: ${cleanUrl} (Dùng chung phiên FB: Port ${port || 9223})`,
      };
      config.accounts.push(newAcc);
      writeJsonFile(FANPAGE_CONFIG_PATH, config);
      return NextResponse.json({ ok: true, message: `Đã thêm Fanpage "${newAcc.name}" thành công!`, data: config });
    }

    // ================= TÀI KHOẢN FACEBOOK TOÀN NĂNG (CHO CẢ FANPAGE & GROUPS) =================
    if (action === 'add_unified_facebook_account') {
      const {
        name,
        profileUrl,
        enableFanpage = true,
        fanpageUrls,
        fanpageUrlsText,
        enableGroups = true,
        groupUrls,
        groupUrlsText,
        profileDir: customProfileDir,
      } = body;
      const existingFanpages = getFanpageConfig().accounts;
      const existingGroups = readJsonFile<{ accounts?: GroupAccount[] }>(GROUPS_CONFIG_PATH, { accounts: [] }).accounts || [];
      const usedPorts = new Set([...existingFanpages, ...existingGroups].map((account) => Number(account.port)).filter(Number.isInteger));
      let targetPort = 9223;
      while (usedPorts.has(targetPort)) targetPort++;
      const targetProfileDir = customProfileDir?.trim() || `n8n-fb-profile-${targetPort}`;
      const parsedFanpageUrls = parseFacebookUrls(fanpageUrls ?? fanpageUrlsText);
      const parsedGroupUrls = parseFacebookUrls(groupUrls ?? groupUrlsText);

      if (!enableFanpage && !enableGroups) {
        return NextResponse.json({ ok: false, error: 'Hãy chọn ít nhất một nơi để dùng tài khoản Facebook.' }, { status: 400 });
      }

      let createdFanpages = 0;
      let createdGroups = 0;

      // 1. Thêm vào Fanpage nếu có danh sách link fanpage
      if (enableFanpage) {
        const fpConfig = getFanpageConfig();
        const fanpageUrlsToCreate = parsedFanpageUrls.length > 0
          ? parsedFanpageUrls
          : ['https://www.facebook.com/'];
        for (const cleanFpUrl of fanpageUrlsToCreate) {
          const nextId = fpConfig.accounts.length > 0 ? Math.max(...fpConfig.accounts.map(a => Number(a.id) || 0)) + 1 : 1;
          const fpTitle = cleanFpUrl === 'https://www.facebook.com/' ? '' : await fetchFacebookTitle(cleanFpUrl);
          fpConfig.accounts.push({
            id: nextId,
            name: fpTitle || `Facebook Fanpage ${nextId}`,
            pageUrl: cleanFpUrl,
            profileDir: targetProfileDir,
            port: targetPort,
            enabled: true,
            desc: `Liên kết với tài khoản Facebook: ${name || 'Chính'} (Port ${targetPort})`,
          });
          createdFanpages++;
        }
        writeJsonFile(FANPAGE_CONFIG_PATH, fpConfig);
      }

      // 2. Thêm vào Groups khi người dùng chọn kênh này.
      if (enableGroups) {
        const grpConfig = readJsonFile<{ accounts?: GroupAccount[] }>(GROUPS_CONFIG_PATH, { accounts: [] });
        if (!Array.isArray(grpConfig.accounts)) grpConfig.accounts = [];
        const nextGroupNumber = grpConfig.accounts.reduce((max, account) => {
          const match = account.id.match(/(\d+)$/);
          return Math.max(max, match ? Number(match[1]) : 0);
        }, 0) + 1;

        grpConfig.accounts.push({
          id: `acc_${nextGroupNumber}`,
          name: name?.trim() || `Tài khoản FB ${nextGroupNumber}`,
          profileUrl: profileUrl?.trim() || undefined,
          profileDir: targetProfileDir,
          port: targetPort,
          enabled: true,
          roleGroup: 'group_1',
          originalRoleGroup: 'group_1',
          groupUrls: parsedGroupUrls,
          lastGroupIndex: -1,
          lastPostedAt: null,
        });
        createdGroups++;
        writeJsonFile(GROUPS_CONFIG_PATH, grpConfig);
      }

      return NextResponse.json({
        ok: true,
        message: `Đã thêm tài khoản Facebook thành công! (${createdFanpages} Fanpage, ${createdGroups} Tài khoản Group - Cùng dùng chung phiên đăng nhập: ${targetProfileDir})`,
      });
    }

    if (action === 'delete_fanpage') {
      const config = getFanpageConfig();
      const rawId = String(accountId).replace('fanpage_', '');
      const idx = config.accounts.findIndex((a) => String(a.id) === rawId);
      if (idx === -1) return NextResponse.json({ ok: false, error: 'Không tìm thấy Fanpage để xóa' }, { status: 404 });
      const removed = config.accounts.splice(idx, 1);
      writeJsonFile(FANPAGE_CONFIG_PATH, config);
      return NextResponse.json({ ok: true, message: `Đã xóa Fanpage "${removed[0]?.name || accountId}"!`, data: config });
    }

    if (action === 'update_fanpage') {
      const config = getFanpageConfig();
      const rawId = String(accountId || '').replace('fanpage_', '');
      const target = config.accounts.find((a) => String(a.id) === rawId) || config.accounts[0];
      if (!target) return NextResponse.json({ ok: false, error: 'Không tìm thấy cấu hình Fanpage' }, { status: 404 });
      if (name) target.name = name.trim();
      if (pageUrl) target.pageUrl = pageUrl.trim();
      if (profileDir) target.profileDir = profileDir.trim();
      if (port) target.port = Number(port);
      if (description) target.desc = description.trim();
      if (enabled !== undefined) target.enabled = Boolean(enabled);
      writeJsonFile(FANPAGE_CONFIG_PATH, config);
      return NextResponse.json({ ok: true, message: `Đã cập nhật "${target.name}" thành công!`, data: config });
    }

    // ================= PERSONAL (CÁ NHÂN) CRUD =================
    if (action === 'toggle_personal') {
      const config = readJsonFile<{ activeAccount?: number; accounts: Array<{ id: number | string; enabled?: boolean; name: string }> }>(PERSONAL_CONFIG_PATH, { accounts: [] });
      const rawId = String(accountId).replace('personal_acc_', '');
      const target = config.accounts.find((a) => String(a.id) === rawId);
      if (target) {
        target.enabled = Boolean(enabled);
        writeJsonFile(PERSONAL_CONFIG_PATH, config);
        return NextResponse.json({ ok: true, message: `Đã ${enabled ? 'bật' : 'tắt'} tài khoản cá nhân ${target.name}` });
      }
      return NextResponse.json({ ok: false, error: 'Không tìm thấy tài khoản cá nhân' }, { status: 404 });
    }

    if (action === 'add_personal') {
      const config = readJsonFile<{ activeAccount?: number; accounts: Array<{ id: number; name: string; profileUrl: string; profileDir: string; port: number; enabled?: boolean; description?: string }> }>(PERSONAL_CONFIG_PATH, { accounts: [] });
      const nextId = config.accounts.length > 0 ? Math.max(...config.accounts.map(a => Number(a.id) || 0)) + 1 : 1;
      let finalName = name?.trim();
      const cleanUrl = (profileUrl || pageUrl)?.trim() || 'https://www.facebook.com/';
      if (!finalName && cleanUrl && cleanUrl !== 'https://www.facebook.com/') {
        finalName = await fetchFacebookTitle(cleanUrl);
      }
      if (!finalName) {
        finalName = `Facebook Cá nhân ${nextId}`;
      }

      const newAcc = {
        id: nextId,
        name: finalName,
        profileUrl: cleanUrl,
        profileDir: profileDir?.trim() || `n8n-personal-profile-${nextId}`,
        port: port ? Number(port) : (9230 + nextId - 1),
        enabled: enabled !== false,
        description: description?.trim() || `Trang cá nhân: ${cleanUrl} (Port ${port || (9230 + nextId - 1)})`,
      };
      config.accounts.push(newAcc);
      writeJsonFile(PERSONAL_CONFIG_PATH, config);
      return NextResponse.json({ ok: true, message: `Đã thêm tài khoản cá nhân "${newAcc.name}" thành công!`, data: config });
    }

    if (action === 'delete_personal') {
      const config = readJsonFile<{ activeAccount?: number; accounts: Array<{ id: number | string; name: string }> }>(PERSONAL_CONFIG_PATH, { accounts: [] });
      const rawId = String(accountId).replace('personal_acc_', '');
      const idx = config.accounts.findIndex((a) => String(a.id) === rawId);
      if (idx === -1) return NextResponse.json({ ok: false, error: 'Không tìm thấy tài khoản cá nhân để xóa' }, { status: 404 });
      const removed = config.accounts.splice(idx, 1);
      writeJsonFile(PERSONAL_CONFIG_PATH, config);
      return NextResponse.json({ ok: true, message: `Đã xóa tài khoản "${removed[0]?.name || accountId}"!`, data: config });
    }

    if (action === 'update_personal') {
      const config = readJsonFile<{ activeAccount?: number; accounts: Array<{ id: number | string; name: string; profileUrl?: string; profileDir?: string; port?: number; enabled?: boolean; description?: string }> }>(PERSONAL_CONFIG_PATH, { accounts: [] });
      const rawId = String(accountId).replace('personal_acc_', '');
      const target = config.accounts.find((a) => String(a.id) === rawId);
      if (!target) return NextResponse.json({ ok: false, error: 'Không tìm thấy tài khoản Facebook Cá nhân' }, { status: 404 });
      if (name) target.name = name.trim();
      if (profileUrl) target.profileUrl = profileUrl.trim();
      if (pageUrl) target.profileUrl = pageUrl.trim();
      if (profileDir) target.profileDir = profileDir.trim();
      if (port) target.port = Number(port);
      if (description) target.description = description.trim();
      if (enabled !== undefined) target.enabled = Boolean(enabled);
      writeJsonFile(PERSONAL_CONFIG_PATH, config);
      return NextResponse.json({ ok: true, message: `Đã cập nhật ${target.name} thành công!`, data: config });
    }

    // ================= GROUPS CRUD =================
    if (action === 'toggle_group') {
      const config = readJsonFile<{ accounts: Array<{ id: string; enabled?: boolean }> }>(GROUPS_CONFIG_PATH, { accounts: [] });
      const target = config.accounts.find((a) => a.id === accountId);
      if (target) {
        target.enabled = Boolean(enabled);
        writeJsonFile(GROUPS_CONFIG_PATH, config);
        return NextResponse.json({ ok: true, message: `Đã ${enabled ? 'bật' : 'tắt'} tài khoản ${target.id}` });
      }
      return NextResponse.json({ ok: false, error: 'Không tìm thấy tài khoản nhóm' }, { status: 404 });
    }

    if (action === 'add_group') {
      const config = readJsonFile<{ accounts: Array<{ id: string; name: string; profileDir: string; groupUrls: string[]; enabled?: boolean }> }>(GROUPS_CONFIG_PATH, { accounts: [] });
      const existingIndices = config.accounts.map(a => {
        const match = a.id.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      });
      const nextIndex = existingIndices.length > 0 ? Math.max(...existingIndices) + 1 : 1;
      const lines = (groupUrlsText || '')
        .split('\n')
        .map((l: string) => l.trim())
        .filter((l: string) => l.startsWith('http'));

      const newAcc = {
        id: `acc_${nextIndex}`,
        name: name?.trim() || `Tài khoản ${nextIndex}`,
        enabled: enabled !== false,
        profileDir: profileDir?.trim() || `n8n-fb-group-profile-${nextIndex}`,
        groupUrls: lines,
      };
      config.accounts.push(newAcc);
      writeJsonFile(GROUPS_CONFIG_PATH, config);
      return NextResponse.json({ ok: true, message: `Đã thêm "${newAcc.name}" thành công!`, data: config });
    }

    if (action === 'delete_group') {
      const config = readJsonFile<{ accounts: Array<{ id: string; name: string }> }>(GROUPS_CONFIG_PATH, { accounts: [] });
      const idx = config.accounts.findIndex((a) => a.id === accountId);
      if (idx === -1) return NextResponse.json({ ok: false, error: 'Không tìm thấy tài khoản nhóm để xóa' }, { status: 404 });
      const removed = config.accounts.splice(idx, 1);
      writeJsonFile(GROUPS_CONFIG_PATH, config);
      return NextResponse.json({ ok: true, message: `Đã xóa tài khoản "${removed[0]?.name || accountId}"!`, data: config });
    }

    if (action === 'update_group') {
      const config = readJsonFile<{ accounts: Array<{ id: string; name: string; profileDir?: string; enabled?: boolean }> }>(GROUPS_CONFIG_PATH, { accounts: [] });
      const target = config.accounts.find((a) => a.id === accountId);
      if (!target) return NextResponse.json({ ok: false, error: 'Không tìm thấy tài khoản nhóm' }, { status: 404 });
      if (name) target.name = name.trim();
      if (profileDir) target.profileDir = profileDir.trim();
      if (enabled !== undefined) target.enabled = Boolean(enabled);
      writeJsonFile(GROUPS_CONFIG_PATH, config);
      return NextResponse.json({ ok: true, message: `Đã cập nhật "${target.name}"!`, data: config });
    }

    return NextResponse.json({ ok: false, error: 'Action không hợp lệ' }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
