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
  facebookAccountId?: string;
  enabled?: boolean;
  status?: string;
  checkpointReason?: string;
  checkpointUrl?: string;
  checkpointAt?: string;
  desc?: string;
}

interface GroupAccount {
  id: string;
  name: string;
  profileUrl?: string;
  profileDir?: string;
  port?: number;
  facebookAccountId?: string;
  enabled?: boolean;
  status?: string;
  checkpointReason?: string;
  checkpointUrl?: string;
  checkpointAt?: string;
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

function getFanpageConfig(): { accounts: FanpageAccount[] } {
  const raw = readJsonFile<Record<string, unknown>>(FANPAGE_CONFIG_PATH, {});
  if (Array.isArray(raw.accounts)) {
    return { accounts: raw.accounts as FanpageAccount[] };
  }
  if (raw.name || raw.pageUrl) {
    return {
      accounts: [
        {
          id: 1,
          name: (raw.name as string) || 'Facebook Fanpage Chính',
          pageUrl: (raw.pageUrl as string) || 'https://www.facebook.com/',
          profileDir: (raw.profileDir as string) || 'n8n-fb-profile-9223',
          port: (raw.port as number) || 9223,
          enabled: raw.enabled !== false,
          desc: (raw.desc as string) || 'Profile Chrome xuất bản bài viết lên Fanpage chính',
        },
      ],
    };
  }
  return {
    accounts: [],
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

    const localAppData = path.join(os.homedir(), 'AppData', 'Local');

    // 1. ChatGPT Items
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
        originalCategory: 'chatgpt' as const,
      };
    });

    // 2. HỢP NHẤT TOÀN BỘ TÀI KHOẢN FACEBOOK (Fanpage, Groups, Personal) VÀO 1 NƠI
    interface UnifiedFbItem {
      id: string;
      rawId?: string;
      name: string;
      port: number;
      profileDir: string;
      url: string;
      pageUrl?: string;
      profileUrl?: string;
      canPostFanpage: boolean;
      canPostGroup: boolean;
      groupUrls: string[];
      groupCount: number;
      roleGroup?: string;
      originalRoleGroup?: string;
      enabled: boolean;
      status: string;
      checkpointReason: string;
      checkpointUrl: string;
      checkpointAt: string;
      originalCategory: 'facebook' | 'fanpage' | 'groups' | 'personal';
      desc?: string;
      profileExists: boolean;
      isConfigured: boolean;
      loginStatus?: string;
      isReady?: boolean;
      currentUrl?: string;
    }

    const unifiedMap = new Map<string, UnifiedFbItem>();

    // A. Nạp từ fanpage-config.json
    (fanpageConfig.accounts || []).forEach((fp, idx) => {
      const p = Number(fp.port) || 0;
      const key = p > 0 ? `port_${p}` : `fp_${fp.id || idx + 1}`;
      const pageUrl = fp.pageUrl || 'https://www.facebook.com/';
      const profileDir = fp.profileDir || (p > 0 ? `n8n-fb-profile-${p}` : `n8n-fb-profile-9223`);
      const profilePath = path.join(localAppData, profileDir);

      unifiedMap.set(key, {
        id: `fb_acc_${fp.id || idx + 1}`,
        rawId: String(fp.id || idx + 1),
        name: fp.name || `Tài khoản Facebook ${idx + 1}`,
        port: p,
        profileDir,
        url: pageUrl,
        pageUrl,
        canPostFanpage: true,
        canPostGroup: false,
        groupUrls: [],
        groupCount: 0,
        roleGroup: 'group_1',
        enabled: fp.enabled !== false,
        status: (fp.status as string) || 'active',
        checkpointReason: (fp.checkpointReason as string) || '',
        checkpointUrl: (fp.checkpointUrl as string) || '',
        checkpointAt: (fp.checkpointAt as string) || '',
        originalCategory: 'facebook',
        desc: fp.desc || `Port ${p}`,
        profileExists: fs.existsSync(profilePath),
        isConfigured: true,
      });
    });

    // B. Hợp nhất từ groups-config.json
    (groupsConfig.accounts || []).forEach((grp, idx) => {
      const p = Number(grp.port) || 0;
      const grpUrls = Array.isArray(grp.groupUrls) ? (grp.groupUrls as string[]) : [];
      const profileDir = (grp.profileDir as string) || (p > 0 ? `n8n-fb-profile-${p}` : `n8n-fb-group-profile-${idx + 1}`);
      const profilePath = path.join(localAppData, profileDir);
      const pUrl = (grp.profileUrl as string) || 'https://www.facebook.com/';

      // Tìm xem đã có nick nào cùng port hoặc cùng tên trong unifiedMap chưa
      let matchedKey = p > 0 && unifiedMap.has(`port_${p}`) ? `port_${p}` : undefined;
      if (!matchedKey) {
        for (const [k, item] of unifiedMap.entries()) {
          if (item.name.toLowerCase().trim() === String(grp.name || '').toLowerCase().trim()) {
            matchedKey = k;
            break;
          }
        }
      }

      if (matchedKey) {
        const existing = unifiedMap.get(matchedKey)!;
        existing.canPostGroup = true;
        existing.groupUrls = grpUrls;
        existing.groupCount = grpUrls.length;
        existing.roleGroup = (grp.roleGroup as string) || existing.roleGroup || 'group_1';
        existing.originalRoleGroup = (grp.originalRoleGroup as string) || existing.originalRoleGroup;
        if (!existing.url || existing.url === 'https://www.facebook.com/') {
          existing.url = pUrl;
        }
        if (grp.status === 'checkpoint' || grp.roleGroup === 'quarantine') {
          existing.status = 'checkpoint';
          existing.checkpointReason = (grp.checkpointReason as string) || (grp.quarantineReason as string) || existing.checkpointReason;
        }
      } else {
        const key = p > 0 ? `port_${p}` : `grp_${grp.id || idx + 1}`;
        unifiedMap.set(key, {
          id: String(grp.id || `acc_${idx + 1}`),
          rawId: String(grp.id || `acc_${idx + 1}`),
          name: (grp.name as string) || `Tài khoản Nhóm ${idx + 1}`,
          port: p,
          profileDir,
          url: pUrl,
          canPostFanpage: false,
          canPostGroup: true,
          groupUrls: grpUrls,
          groupCount: grpUrls.length,
          roleGroup: (grp.roleGroup as string) || 'group_1',
          originalRoleGroup: (grp.originalRoleGroup as string) || 'group_1',
          enabled: grp.enabled !== false,
          status: (grp.status as string) || (grp.roleGroup === 'quarantine' ? 'checkpoint' : 'active'),
          checkpointReason: (grp.checkpointReason as string) || (grp.quarantineReason as string) || '',
          checkpointUrl: (grp.checkpointUrl as string) || '',
          checkpointAt: (grp.checkpointAt as string) || '',
          originalCategory: 'facebook',
          desc: `Tài khoản đăng nhóm`,
          profileExists: fs.existsSync(profilePath),
          isConfigured: true,
        });
      }
    });

    // C. Hợp nhất từ personal-config.json
    (personalConfig.accounts || []).forEach((pers, idx) => {
      const p = Number(pers.port) || 0;
      let matchedKey = p > 0 && unifiedMap.has(`port_${p}`) ? `port_${p}` : undefined;
      if (!matchedKey) {
        for (const [k, item] of unifiedMap.entries()) {
          if (item.name.toLowerCase().trim() === String(pers.name || '').toLowerCase().trim()) {
            matchedKey = k;
            break;
          }
        }
      }
      if (matchedKey) {
        const existing = unifiedMap.get(matchedKey)!;
        if (pers.profileUrl && (!existing.url || existing.url === 'https://www.facebook.com/')) {
          existing.url = String(pers.profileUrl);
        }
      }
    });

    // D. ĐẢM BẢO QUY TẮC: MỖI ACC FB LÀ 1 PORT KHÁC NHAU!
    const allFbAccounts = Array.from(unifiedMap.values());
    const usedPorts = new Set<number>();
    let nextAvailablePort = 9223;
    let portsAutoFixed = false;

    for (const acc of allFbAccounts) {
      if (!acc.port || acc.port < 9223 || usedPorts.has(acc.port)) {
        while (usedPorts.has(nextAvailablePort)) {
          nextAvailablePort++;
        }
        acc.port = nextAvailablePort;
        acc.profileDir = `n8n-fb-profile-${nextAvailablePort}`;
        usedPorts.add(nextAvailablePort);
        nextAvailablePort++;
        portsAutoFixed = true;
      } else {
        usedPorts.add(acc.port);
      }
    }

    // Nếu có tài khoản bị trùng port được cấp lại port độc lập, lưu ngay vào file config
    if (portsAutoFixed) {
      for (const acc of allFbAccounts) {
        if (acc.canPostFanpage) {
          const fpTarget = fanpageConfig.accounts.find(a => String(a.id) === String(acc.rawId) || a.name === acc.name);
          if (fpTarget) {
            fpTarget.port = acc.port;
            fpTarget.profileDir = acc.profileDir;
          }
        }
        if (acc.canPostGroup) {
          const grpTarget = (groupsConfig.accounts as Array<Record<string, unknown>>).find(a => String(a.id) === String(acc.rawId) || a.name === acc.name);
          if (grpTarget) {
            grpTarget.port = acc.port;
            grpTarget.profileDir = acc.profileDir;
          }
        }
      }
      writeJsonFile(FANPAGE_CONFIG_PATH, fanpageConfig);
      writeJsonFile(GROUPS_CONFIG_PATH, groupsConfig);
    }

    // 3. Kiểm tra trạng thái kết nối qua CDP song song
    interface CheckableAccountItem {
      port: number;
      isReady?: boolean;
      loginStatus?: string;
      currentUrl?: string;
      status?: string;
      checkpointReason?: string;
      checkpointUrl?: string;
    }

    const allItemsToCheck = [...chatgptItems, ...allFbAccounts];
    const checkPromises: Promise<void>[] = [];
    for (const item of allItemsToCheck) {
      const isGpt = item.id.startsWith('gpt_');
      const service = isGpt ? 'chatgpt' : 'facebook';
      checkPromises.push(
        (async () => {
          const status = await checkChromeTabStatus(item.port, service);
          const itemObj = item as unknown as CheckableAccountItem;
          itemObj.isReady = status.isReady;
          itemObj.loginStatus = status.loginStatus;
          itemObj.currentUrl = status.currentUrl;

          if (status.loginStatus === 'checkpoint') {
            itemObj.status = 'checkpoint';
            if (!itemObj.checkpointReason) {
              itemObj.checkpointReason = 'Phát hiện trang Checkpoint: Hãy xác nhận bạn là người thật';
            }
            itemObj.checkpointUrl = status.currentUrl;
          }
        })(),
      );
    }
    await Promise.all(checkPromises);

    // 4. Phân nhóm: Checkpoint vs Hoạt động bình thường
    const checkpointItems: UnifiedFbItem[] = [];
    const activeFacebookItems: UnifiedFbItem[] = [];

    for (const item of allFbAccounts) {
      if (item.status === 'checkpoint' || item.loginStatus === 'checkpoint' || item.roleGroup === 'quarantine') {
        checkpointItems.push({
          ...item,
          originalCategory: item.canPostFanpage && !item.canPostGroup ? 'fanpage' : item.canPostGroup && !item.canPostFanpage ? 'groups' : 'facebook',
        });
      } else {
        activeFacebookItems.push(item);
      }
    }

    const categories = [];

    // Khối cảnh báo checkpoint (chỉ hiện khi có nick dính checkpoint)
    if (checkpointItems.length > 0) {
      categories.push({
        category: 'checkpoint',
        categoryName: `🛡️ Acc Yêu Cầu Xác Thực (${checkpointItems.length} Tài khoản dính Checkpoint)`,
        description: 'Các tài khoản Facebook bị Facebook yêu cầu xác minh người thật. Đã đưa ra khỏi danh sách đăng bài để tránh bị khóa vĩnh viễn.',
        items: checkpointItems,
      });
    }

    // Khối tài khoản Facebook duy nhất tập trung
    categories.push({
      category: 'facebook',
      categoryName: `👤 Tài khoản Facebook (${activeFacebookItems.length} Tài khoản hoạt động)`,
      description: 'Quản lý toàn bộ tài khoản Facebook tập trung. Chọn quyền Đăng Fanpage hoặc Đăng Nhóm cho từng tài khoản. Mỗi tài khoản có Port và Profile Chrome riêng biệt.',
      items: activeFacebookItems,
    });

    // Khối ChatGPT
    categories.push({
      category: 'chatgpt',
      categoryName: `🤖 Tài khoản ChatGPT (${chatgptItems.length} Tài khoản Xen Kẽ)`,
      description: 'Các tài khoản ChatGPT tự động luân phiên xen kẽ tạo ảnh AI',
      items: chatgptItems,
    });

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

    // ================= TẬP TRUNG: LƯU TÀI KHOẢN FACEBOOK TOÀN DIỆN (THÊM / SỬA) =================
    if (action === 'save_unified_fb_account') {
      const {
        id,
        name: accName,
        url: accUrl,
        port: accPort,
        profileDir: accProfileDir,
        canPostFanpage = true,
        fanpageUrl,
        canPostGroup = true,
        groupUrls,
        groupUrlsText: grpUrlsText,
        roleGroup = 'group_1',
        enabled: accEnabled = true,
      } = body;

      const fpConfig = getFanpageConfig();
      const grpConfig = readJsonFile<{ accounts?: GroupAccount[] }>(GROUPS_CONFIG_PATH, { accounts: [] });
      if (!Array.isArray(grpConfig.accounts)) grpConfig.accounts = [];

      // Tính port riêng biệt không trùng
      const allExistingPorts = new Set<number>();
      fpConfig.accounts.forEach(a => { if (a.port) allExistingPorts.add(Number(a.port)); });
      grpConfig.accounts.forEach(a => { if (a.port) allExistingPorts.add(Number(a.port)); });

      let targetPort = Number(accPort) || 0;
      if (!targetPort) {
        targetPort = 9223;
        while (allExistingPorts.has(targetPort)) targetPort++;
      }
      const targetProfileDir = accProfileDir?.trim() || `n8n-fb-profile-${targetPort}`;
      const finalName = accName?.trim() || `Tài khoản Facebook (Port ${targetPort})`;
      const cleanMainUrl = (accUrl || '').trim() || 'https://www.facebook.com/';
      const cleanFanpageUrl = (fanpageUrl || '').trim() || cleanMainUrl;

      const parsedGroupUrls = parseFacebookUrls(groupUrls ?? grpUrlsText);

      // 1. Xử lý Fanpage Config
      const existingFpIdx = fpConfig.accounts.findIndex(a => 
        (id && (String(a.id) === String(id) || `fb_acc_${a.id}` === String(id))) || 
        Number(a.port) === targetPort || 
        a.name.toLowerCase().trim() === finalName.toLowerCase()
      );

      if (canPostFanpage) {
        if (existingFpIdx >= 0) {
          fpConfig.accounts[existingFpIdx] = {
            ...fpConfig.accounts[existingFpIdx],
            name: finalName,
            pageUrl: cleanFanpageUrl,
            port: targetPort,
            profileDir: targetProfileDir,
            enabled: accEnabled,
            status: 'active',
          };
        } else {
          const nextFpId = fpConfig.accounts.length > 0 ? Math.max(...fpConfig.accounts.map(a => Number(a.id) || 0)) + 1 : 1;
          fpConfig.accounts.push({
            id: nextFpId,
            name: finalName,
            pageUrl: cleanFanpageUrl,
            port: targetPort,
            profileDir: targetProfileDir,
            enabled: accEnabled,
            status: 'active',
            desc: `Port ${targetPort}`,
          });
        }
      } else if (existingFpIdx >= 0) {
        fpConfig.accounts.splice(existingFpIdx, 1);
      }
      writeJsonFile(FANPAGE_CONFIG_PATH, fpConfig);

      // 2. Xử lý Groups Config
      const existingGrpIdx = grpConfig.accounts.findIndex(a => 
        (id && (a.id === String(id) || `fb_acc_${a.id}` === String(id))) || 
        Number(a.port) === targetPort || 
        a.name.toLowerCase().trim() === finalName.toLowerCase()
      );

      if (canPostGroup) {
        if (existingGrpIdx >= 0) {
          grpConfig.accounts[existingGrpIdx] = {
            ...grpConfig.accounts[existingGrpIdx],
            name: finalName,
            profileUrl: cleanMainUrl,
            port: targetPort,
            profileDir: targetProfileDir,
            roleGroup: roleGroup || 'group_1',
            groupUrls: parsedGroupUrls.length > 0 ? parsedGroupUrls : (grpConfig.accounts[existingGrpIdx].groupUrls || []),
            enabled: accEnabled,
            status: 'active',
          };
        } else {
          const nextGrpNum = grpConfig.accounts.reduce((max, a) => {
            const m = String(a.id).match(/\d+/);
            return Math.max(max, m ? Number(m[0]) : 0);
          }, 0) + 1;
          grpConfig.accounts.push({
            id: `acc_${nextGrpNum}`,
            name: finalName,
            profileUrl: cleanMainUrl,
            port: targetPort,
            profileDir: targetProfileDir,
            roleGroup: roleGroup || 'group_1',
            originalRoleGroup: roleGroup || 'group_1',
            groupUrls: parsedGroupUrls,
            lastGroupIndex: -1,
            enabled: accEnabled,
            status: 'active',
          });
        }
      } else if (existingGrpIdx >= 0) {
        grpConfig.accounts.splice(existingGrpIdx, 1);
      }
      writeJsonFile(GROUPS_CONFIG_PATH, grpConfig);

      return NextResponse.json({
        ok: true,
        message: `Đã lưu tài khoản "${finalName}" (Port ${targetPort}) thành công!`,
      });
    }

    // ================= XÓA TÀI KHOẢN FACEBOOK TOÀN DIỆN =================
    if (action === 'delete_unified_fb_account') {
      const { id, port: accPort, name: accName } = body;
      const p = Number(accPort) || 0;
      let deleted = false;

      // 1. Xóa khỏi fanpage-config
      const fpConfig = getFanpageConfig();
      const fpIdx = fpConfig.accounts.findIndex(a => 
        (id && (String(a.id) === String(id) || `fb_acc_${a.id}` === String(id) || `fanpage_${a.id}` === String(id))) || 
        (p > 0 && Number(a.port) === p) || 
        (accName && a.name.toLowerCase().trim() === String(accName).toLowerCase().trim())
      );
      if (fpIdx >= 0) {
        fpConfig.accounts.splice(fpIdx, 1);
        writeJsonFile(FANPAGE_CONFIG_PATH, fpConfig);
        deleted = true;
      }

      // 2. Xóa khỏi groups-config
      const grpConfig = readJsonFile<{ accounts?: GroupAccount[] }>(GROUPS_CONFIG_PATH, { accounts: [] });
      if (Array.isArray(grpConfig.accounts)) {
        const grpIdx = grpConfig.accounts.findIndex(a => 
          (id && (a.id === String(id) || `fb_acc_${a.id}` === String(id))) || 
          (p > 0 && Number(a.port) === p) || 
          (accName && a.name.toLowerCase().trim() === String(accName).toLowerCase().trim())
        );
        if (grpIdx >= 0) {
          grpConfig.accounts.splice(grpIdx, 1);
          writeJsonFile(GROUPS_CONFIG_PATH, grpConfig);
          deleted = true;
        }
      }

      // 3. Xóa khỏi personal-config
      const persConfig = readJsonFile<{ activeAccount?: number; accounts?: Array<Record<string, unknown>> }>(PERSONAL_CONFIG_PATH, { accounts: [] });
      if (Array.isArray(persConfig.accounts)) {
        const persIdx = persConfig.accounts.findIndex(a => 
          (id && (String(a.id) === String(id) || `fb_acc_${a.id}` === String(id) || `personal_acc_${a.id}` === String(id))) || 
          (p > 0 && Number(a.port) === p) || 
          (accName && String(a.name || '').toLowerCase().trim() === String(accName).toLowerCase().trim())
        );
        if (persIdx >= 0) {
          persConfig.accounts.splice(persIdx, 1);
          writeJsonFile(PERSONAL_CONFIG_PATH, persConfig);
          deleted = true;
        }
      }

      return NextResponse.json({
        ok: true,
        message: deleted ? `Đã xóa tài khoản Facebook "${accName || id || p}" thành công!` : 'Đã xóa tài khoản.',
      });
    }

    // ================= BẬT / TẮT TÀI KHOẢN FACEBOOK TOÀN DIỆN =================
    if (action === 'toggle_unified_fb_account') {
      const { id, port: accPort, enabled: nextState } = body;
      const p = Number(accPort) || 0;

      const fpConfig = getFanpageConfig();
      const fpTarget = fpConfig.accounts.find(a => 
        (id && (String(a.id) === String(id) || `fb_acc_${a.id}` === String(id) || `fanpage_${a.id}` === String(id))) || 
        (p > 0 && Number(a.port) === p)
      );
      if (fpTarget) {
        fpTarget.enabled = Boolean(nextState);
        writeJsonFile(FANPAGE_CONFIG_PATH, fpConfig);
      }

      const grpConfig = readJsonFile<{ accounts?: GroupAccount[] }>(GROUPS_CONFIG_PATH, { accounts: [] });
      if (Array.isArray(grpConfig.accounts)) {
        const grpTarget = grpConfig.accounts.find(a => 
          (id && (a.id === String(id) || `fb_acc_${a.id}` === String(id))) || 
          (p > 0 && Number(a.port) === p)
        );
        if (grpTarget) {
          grpTarget.enabled = Boolean(nextState);
          writeJsonFile(GROUPS_CONFIG_PATH, grpConfig);
        }
      }

      const persConfig = readJsonFile<{ activeAccount?: number; accounts?: Array<Record<string, unknown>> }>(PERSONAL_CONFIG_PATH, { accounts: [] });
      if (Array.isArray(persConfig.accounts)) {
        const persTarget = persConfig.accounts.find(a => 
          (id && (String(a.id) === String(id) || `fb_acc_${a.id}` === String(id) || `personal_acc_${a.id}` === String(id))) || 
          (p > 0 && Number(a.port) === p)
        );
        if (persTarget) {
          persTarget.enabled = Boolean(nextState);
          writeJsonFile(PERSONAL_CONFIG_PATH, persConfig);
        }
      }

      return NextResponse.json({
        ok: true,
        message: `Đã ${nextState ? 'bật' : 'tắt'} tài khoản Facebook!`,
      });
    }

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

      const existingFanpages = config.accounts || [];
      const existingGroups = readJsonFile<{ accounts?: GroupAccount[] }>(GROUPS_CONFIG_PATH, { accounts: [] }).accounts || [];
      const usedPorts = new Set([...existingFanpages, ...existingGroups].map((account) => Number(account.port)).filter(Number.isInteger));

      let targetPort = port ? Number(port) : 0;
      if (!targetPort) {
        targetPort = 9223;
        while (usedPorts.has(targetPort)) targetPort++;
      }
      const targetProfileDir = profileDir?.trim() || `n8n-fb-profile-${targetPort}`;

      const newAcc: FanpageAccount = {
        id: nextId,
        name: finalName,
        pageUrl: cleanUrl,
        profileDir: targetProfileDir,
        port: targetPort,
        enabled: enabled !== false,
        desc: description?.trim() || `Profile Chrome riêng cho Fanpage (Port ${targetPort})`,
      };
      config.accounts.push(newAcc);
      writeJsonFile(FANPAGE_CONFIG_PATH, config);
      return NextResponse.json({ ok: true, message: `Đã thêm Fanpage "${newAcc.name}" (Port ${targetPort}) thành công!`, data: config });
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
      const facebookAccountId = `fb_${targetPort}`;
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
            facebookAccountId,
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
          facebookAccountId,
          enabled: true,
          desc: `Liên kết với tài khoản Facebook: ${name || 'Chính'} (Port ${targetPort})`,
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

    // ================= XỬ LÝ CHECKPOINT / YÊU CẦU XÁC THỰC =================
    if (action === 'mark_checkpoint') {
      const { category, accountId, reason, checkpointUrl } = body;
      const cpReason = reason?.trim() || 'Người dùng báo dính checkpoint (Hãy xác nhận bạn là người thật)';
      const cpTime = new Date().toISOString();

      if (category === 'fanpage') {
        const config = getFanpageConfig();
        const rawId = String(accountId).replace('fanpage_', '');
        const target = config.accounts.find((a) => String(a.id) === rawId);
        if (target) {
          target.status = 'checkpoint';
          target.checkpointReason = cpReason;
          target.checkpointUrl = checkpointUrl || '';
          target.checkpointAt = cpTime;
          target.enabled = false;
          writeJsonFile(FANPAGE_CONFIG_PATH, config);
          return NextResponse.json({ ok: true, message: `Đã đưa Fanpage "${target.name}" vào danh sách "Acc yêu cầu xác thực"` });
        }
      } else if (category === 'groups') {
        const config = readJsonFile<{ accounts?: GroupAccount[] }>(GROUPS_CONFIG_PATH, { accounts: [] });
        const target = (config.accounts || []).find((a) => a.id === accountId);
        if (target) {
          if (target.roleGroup !== 'quarantine') {
            target.originalRoleGroup = target.roleGroup || 'group_1';
          }
          target.roleGroup = 'quarantine';
          target.status = 'checkpoint';
          target.checkpointReason = cpReason;
          target.quarantineReason = cpReason;
          target.checkpointUrl = checkpointUrl || '';
          target.checkpointAt = cpTime;
          target.enabled = false;
          writeJsonFile(GROUPS_CONFIG_PATH, config);
          return NextResponse.json({ ok: true, message: `Đã đưa tài khoản Group "${target.name}" vào danh sách "Acc yêu cầu xác thực"` });
        }
      } else if (category === 'personal') {
        const config = readJsonFile<{ accounts?: Array<Record<string, unknown>> }>(PERSONAL_CONFIG_PATH, { accounts: [] });
        const rawId = String(accountId).replace('personal_acc_', '');
        const target = (config.accounts || []).find((a) => String(a.id) === rawId);
        if (target) {
          target.status = 'checkpoint';
          target.checkpointReason = cpReason;
          target.checkpointUrl = checkpointUrl || '';
          target.checkpointAt = cpTime;
          target.enabled = false;
          writeJsonFile(PERSONAL_CONFIG_PATH, config);
          return NextResponse.json({ ok: true, message: `Đã đưa tài khoản cá nhân "${target.name}" vào danh sách "Acc yêu cầu xác thực"` });
        }
      }

      return NextResponse.json({ ok: false, error: 'Không tìm thấy tài khoản để đưa vào mục xác thực' }, { status: 404 });
    }

    if (action === 'resolve_checkpoint') {
      const { category, accountId } = body;
      let restoredName = '';

      // Kiểm tra trong Fanpage
      const fpConfig = getFanpageConfig();
      const rawFpId = String(accountId).replace(/^fanpage_/, '').replace(/^fb_acc_/, '');
      const fpTarget = fpConfig.accounts.find((a) => String(a.id) === rawFpId || `fb_acc_${a.id}` === String(accountId) || `fanpage_${a.id}` === String(accountId));
      if (fpTarget) {
        fpTarget.status = 'active';
        fpTarget.enabled = true;
        delete fpTarget.checkpointReason;
        delete fpTarget.checkpointUrl;
        delete fpTarget.checkpointAt;
        writeJsonFile(FANPAGE_CONFIG_PATH, fpConfig);
        restoredName = fpTarget.name;
      }

      // Kiểm tra trong Groups
      const grpConfig = readJsonFile<{ accounts?: GroupAccount[] }>(GROUPS_CONFIG_PATH, { accounts: [] });
      const rawGrpId = String(accountId).replace(/^fb_acc_/, '');
      const grpTarget = (grpConfig.accounts || []).find((a) => a.id === accountId || a.id === rawGrpId || `fb_acc_${a.id}` === String(accountId));
      if (grpTarget) {
        grpTarget.status = 'active';
        grpTarget.enabled = true;
        grpTarget.roleGroup = grpTarget.originalRoleGroup || 'group_1';
        delete grpTarget.checkpointReason;
        delete grpTarget.quarantineReason;
        delete grpTarget.quarantineUntil;
        delete grpTarget.checkpointUrl;
        delete grpTarget.checkpointAt;
        writeJsonFile(GROUPS_CONFIG_PATH, grpConfig);
        restoredName = grpTarget.name;
      }

      // Kiểm tra trong Personal
      const persConfig = readJsonFile<{ accounts?: Array<Record<string, unknown>> }>(PERSONAL_CONFIG_PATH, { accounts: [] });
      const rawPersId = String(accountId).replace(/^personal_acc_/, '').replace(/^fb_acc_/, '');
      const persTarget = (persConfig.accounts || []).find((a) => String(a.id) === rawPersId || `fb_acc_${a.id}` === String(accountId));
      if (persTarget) {
        persTarget.status = 'active';
        persTarget.enabled = true;
        delete persTarget.checkpointReason;
        delete persTarget.checkpointUrl;
        delete persTarget.checkpointAt;
        writeJsonFile(PERSONAL_CONFIG_PATH, persConfig);
        restoredName = String(persTarget.name || '');
      }

      if (restoredName) {
        return NextResponse.json({
          ok: true,
          message: `Đã khôi phục tài khoản "${restoredName}" thành công! Tài khoản đã quay trở lại danh sách đăng bài.`,
        });
      }

      return NextResponse.json({ ok: false, error: 'Không tìm thấy tài khoản cần khôi phục' }, { status: 404 });
    }

    return NextResponse.json({ ok: false, error: 'Action không hợp lệ' }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
