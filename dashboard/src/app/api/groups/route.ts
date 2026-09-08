import { NextRequest, NextResponse } from 'next/server';
import { readJsonFile, writeJsonFile, GROUPS_CONFIG_PATH, POST_HISTORY_PATH } from '@/lib/server-utils';

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

export interface GroupAccountItem {
  id: string;
  name: string;
  enabled?: boolean;
  profileDir?: string;
  groupUrls?: string[];
  lastGroupIndex?: number;
  lastPostedAt?: string | null;
}

export interface GroupsConfig {
  accounts: GroupAccountItem[];
  centralPool?: CentralPoolItem[];
}

interface PostHistoryEntry {
  id: string;
  timestamp: string;
  type: string;
  channel: string;
  targetUrl?: string | null;
  targetName?: string | null;
  status: 'success' | 'failed';
  error?: string | null;
  details?: Record<string, unknown>;
}

interface PostHistoryFile {
  entries: PostHistoryEntry[];
}

function normalizeUrl(raw: string): string {
  try {
    let trimmed = raw.trim();
    if (!trimmed) return '';
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      trimmed = `https://${trimmed}`;
    }
    const parsed = new URL(trimmed);
    if (parsed.hostname.includes('facebook.com')) {
      parsed.hostname = 'www.facebook.com';
    }
    parsed.search = '';
    parsed.hash = '';
    const pathname = parsed.pathname.replace(/\/+$/, '').toLowerCase();
    parsed.pathname = pathname;
    return parsed.toString().replace(/\/+$/, '');
  } catch {
    return raw.trim().split('?')[0].split('#')[0].replace(/\/+$/, '').toLowerCase();
  }
}

function getStableId(url: string): string {
  let hash = 0;
  const str = normalizeUrl(url);
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return `pool_${Math.abs(hash).toString(36)}`;
}

function getLatestHistoryMap(): Map<string, PostHistoryEntry> {
  const historyData = readJsonFile<PostHistoryFile>(POST_HISTORY_PATH, { entries: [] });
  const map = new Map<string, PostHistoryEntry>();
  if (!Array.isArray(historyData.entries)) return map;

  const sorted = [...historyData.entries].sort((a, b) => {
    return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
  });

  for (const entry of sorted) {
    if (entry.channel === 'groups' && entry.targetUrl) {
      const norm = normalizeUrl(entry.targetUrl);
      if (!map.has(norm)) {
        map.set(norm, entry);
      }
    }
  }
  return map;
}

function syncAndEnrichConfig(config: GroupsConfig): { config: GroupsConfig; poolStats: Record<string, number> } {
  if (!Array.isArray(config.accounts)) config.accounts = [];
  if (!Array.isArray(config.centralPool)) config.centralPool = [];

  let isDirty = false;
  const historyMap = getLatestHistoryMap();
  const accountMap = new Map(config.accounts.map((a) => [a.id, a.name]));

  const existingUrls = new Set<string>();
  for (const item of config.centralPool) {
    if (!item.id) {
      item.id = getStableId(item.url);
      isDirty = true;
    }
    existingUrls.add(normalizeUrl(item.url));
  }

  // 1. Tự động nạp các link đang có trong các accounts vào centralPool nếu chưa có
  for (const acc of config.accounts) {
    const urls = Array.isArray(acc.groupUrls) ? acc.groupUrls : [];
    for (const rawUrl of urls) {
      const norm = normalizeUrl(rawUrl);
      if (!existingUrls.has(norm) && norm.startsWith('http')) {
        const newItem: CentralPoolItem = {
          id: getStableId(rawUrl),
          url: rawUrl.trim(),
          addedAt: new Date().toISOString(),
          assignedAccountId: acc.id,
          assignedAccountName: acc.name,
          joinedStatus: 'unknown',
          lastPostStatus: 'not_posted',
        };
        config.centralPool.push(newItem);
        existingUrls.add(norm);
        isDirty = true;
      }
    }
  }

  // 2. Làm giàu dữ liệu cho centralPool từ historyMap
  for (const item of config.centralPool) {
    const norm = normalizeUrl(item.url);
    if (item.assignedAccountId) {
      item.assignedAccountName = accountMap.get(item.assignedAccountId) || item.assignedAccountId;
    } else {
      item.assignedAccountName = null;
    }

    const hist = historyMap.get(norm);
    if (hist) {
      item.lastPostStatus = hist.status === 'success' ? 'success' : 'failed';
      item.lastPostedAt = hist.timestamp;
      item.lastPostError = hist.error || null;

      // Suy luận trạng thái nhóm nếu chưa được đặt rõ ràng
      if (!item.joinedStatus || item.joinedStatus === 'unknown') {
        if (hist.status === 'success') {
          item.joinedStatus = 'joined';
        } else if (hist.error) {
          const err = hist.error.toLowerCase();
          if (err.includes('chưa tham gia nhóm')) {
            item.joinedStatus = 'not_joined';
          } else if (err.includes('phê duyệt') || err.includes('chờ duyệt') || err.includes('yêu cầu tham gia')) {
            item.joinedStatus = 'pending';
          }
        }
      }
    } else if (!item.lastPostStatus) {
      item.lastPostStatus = 'not_posted';
    }

    if (!item.joinedStatus) {
      item.joinedStatus = 'unknown';
    }
  }

  // Tự động lưu lại nếu có link mới được nạp vào centralPool
  if (isDirty) {
    try {
      writeJsonFile(GROUPS_CONFIG_PATH, config);
    } catch {}
  }

  // 3. Tính toán thống kê
  const total = config.centralPool.length;
  const assigned = config.centralPool.filter((i) => Boolean(i.assignedAccountId)).length;
  const unassigned = total - assigned;
  const postedSuccess = config.centralPool.filter((i) => i.lastPostStatus === 'success').length;
  const postedFailed = config.centralPool.filter((i) => i.lastPostStatus === 'failed').length;
  const notPosted = config.centralPool.filter((i) => !i.lastPostStatus || i.lastPostStatus === 'not_posted').length;
  const joined = config.centralPool.filter((i) => i.joinedStatus === 'joined').length;
  const pending = config.centralPool.filter((i) => i.joinedStatus === 'pending').length;
  const notJoined = config.centralPool.filter((i) => i.joinedStatus === 'not_joined').length;

  return {
    config,
    poolStats: {
      total,
      assigned,
      unassigned,
      postedSuccess,
      postedFailed,
      notPosted,
      joined,
      pending,
      notJoined,
    },
  };
}

export async function GET() {
  try {
    const rawConfig = readJsonFile<GroupsConfig>(GROUPS_CONFIG_PATH, { accounts: [], centralPool: [] });
    const { config, poolStats } = syncAndEnrichConfig(rawConfig);
    return NextResponse.json({ ok: true, data: config, stats: poolStats });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;
    const rawConfig = readJsonFile<GroupsConfig>(GROUPS_CONFIG_PATH, { accounts: [], centralPool: [] });
    const { config } = syncAndEnrichConfig(rawConfig);

    // ==========================================
    // 1. KHO CHUNG: IMPORT MỘT LOẠT LINK FB VÀO KHO
    // ==========================================
    if (action === 'pool_import') {
      const { urlsText = '', autoDistribute = false, assignedAccountId = null } = body;
      const lines = urlsText
        .split('\n')
        .map((l: string) => l.trim())
        .filter((l: string) => l.startsWith('http'));

      if (lines.length === 0) {
        return NextResponse.json({ ok: false, error: 'Vui lòng nhập ít nhất 1 đường link hợp lệ (bắt đầu bằng http)' }, { status: 400 });
      }

      if (!Array.isArray(config.centralPool)) config.centralPool = [];
      
      // Tập hợp tất cả các link đã có trong hệ thống (cả centralPool lẫn trong các accounts)
      const existingNorms = new Set<string>();
      for (const item of config.centralPool) {
        existingNorms.add(normalizeUrl(item.url));
      }
      for (const acc of config.accounts || []) {
        for (const u of acc.groupUrls || []) {
          existingNorms.add(normalizeUrl(u));
        }
      }

      let addedCount = 0;
      let duplicateCount = 0;
      const seenInBatch = new Set<string>();
      const targetAcc = assignedAccountId ? config.accounts.find((a) => a.id === assignedAccountId) : null;

      for (const rawUrl of lines) {
        const norm = normalizeUrl(rawUrl);
        if (!norm) continue;

        // Nếu link đã tồn tại trong hệ thống hoặc bị lặp ngay trong danh sách dán vào -> BỎ QUA KHÔNG THÊM
        if (existingNorms.has(norm) || seenInBatch.has(norm)) {
          duplicateCount++;
          continue;
        }

        seenInBatch.add(norm);
        existingNorms.add(norm);

        const newItem: CentralPoolItem = {
          id: `pool_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          url: rawUrl.trim(),
          addedAt: new Date().toISOString(),
          assignedAccountId: targetAcc ? targetAcc.id : null,
          assignedAccountName: targetAcc ? targetAcc.name : null,
          joinedStatus: 'unknown',
          lastPostStatus: 'not_posted',
        };
        config.centralPool.push(newItem);
        addedCount++;

        if (targetAcc) {
          if (!Array.isArray(targetAcc.groupUrls)) targetAcc.groupUrls = [];
          targetAcc.groupUrls.push(rawUrl.trim());
        }
      }

      // Tự động chia đều nếu bật cờ autoDistribute
      let distributeMsg = '';
      if (autoDistribute && addedCount > 0) {
        const enabledAccounts = config.accounts.filter((a) => a.enabled !== false);
        if (enabledAccounts.length > 0) {
          const unassigned = config.centralPool.filter((i) => !i.assignedAccountId);
          for (let i = 0; i < unassigned.length; i++) {
            const acc = enabledAccounts[i % enabledAccounts.length];
            unassigned[i].assignedAccountId = acc.id;
            unassigned[i].assignedAccountName = acc.name;
            if (!Array.isArray(acc.groupUrls)) acc.groupUrls = [];
            if (!acc.groupUrls.some((u) => normalizeUrl(u) === normalizeUrl(unassigned[i].url))) {
              acc.groupUrls.push(unassigned[i].url);
            }
          }
          distributeMsg = ` và đã tự động chia đều cho ${enabledAccounts.length} tài khoản đang bật!`;
        }
      }

      writeJsonFile(GROUPS_CONFIG_PATH, config);
      const { config: enriched, poolStats } = syncAndEnrichConfig(config);

      if (addedCount === 0) {
        return NextResponse.json({
          ok: true,
          message: `Toàn bộ ${duplicateCount} link nhập vào đều đã tồn tại trong hệ thống (trùng lặp), không thêm link nào!`,
          data: enriched,
          stats: poolStats,
          addedCount: 0,
          duplicateCount,
        });
      }

      const dupText = duplicateCount > 0 ? ` (đã tự động bỏ qua ${duplicateCount} link trùng với link cũ)` : '';
      return NextResponse.json({
        ok: true,
        message: `Đã import thành công ${addedCount} link mới vào kho chung${dupText}${distributeMsg}!`,
        data: enriched,
        stats: poolStats,
        addedCount,
        duplicateCount,
      });
    }

    // ==========================================
    // 2. KHO CHUNG: TỰ ĐỘNG CHIA ĐỀU CHO CÁC ACC
    // ==========================================
    if (action === 'pool_distribute') {
      const {
        targetAccountIds = [],
        mode = 'unassigned_only', // 'unassigned_only' | 'all'
      } = body;

      // Chọn các tài khoản nhận
      let targetAccounts: GroupAccountItem[] = [];
      if (Array.isArray(targetAccountIds) && targetAccountIds.length > 0) {
        targetAccounts = config.accounts.filter((a) => targetAccountIds.includes(a.id));
      } else {
        targetAccounts = config.accounts.filter((a) => a.enabled !== false);
      }

      if (targetAccounts.length === 0) {
        return NextResponse.json({ ok: false, error: 'Không có tài khoản nào được chọn hoặc đang bật để nhận link' }, { status: 400 });
      }

      if (!Array.isArray(config.centralPool)) config.centralPool = [];

      // Chọn danh sách link cần phân bổ
      const linksToDistribute = mode === 'all'
        ? config.centralPool
        : config.centralPool.filter((i) => !i.assignedAccountId);

      if (linksToDistribute.length === 0) {
        return NextResponse.json({
          ok: false,
          error: mode === 'all'
            ? 'Kho chung hiện tại chưa có link nào để chia'
            : 'Không có link nào ở trạng thái Chưa gán. Hãy chọn chế độ "Chia đều lại toàn bộ" nếu muốn phân bổ lại.',
        }, { status: 400 });
      }

      // Nếu chia lại toàn bộ, reset trước danh sách groupUrls của các accounts được chọn
      if (mode === 'all') {
        for (const acc of targetAccounts) {
          acc.groupUrls = [];
        }
      }

      // Thuật toán chia đều Round-Robin
      for (let i = 0; i < linksToDistribute.length; i++) {
        const item = linksToDistribute[i];
        const acc = targetAccounts[i % targetAccounts.length];
        item.assignedAccountId = acc.id;
        item.assignedAccountName = acc.name;

        if (!Array.isArray(acc.groupUrls)) acc.groupUrls = [];
        if (!acc.groupUrls.includes(item.url)) {
          acc.groupUrls.push(item.url);
        }
      }

      writeJsonFile(GROUPS_CONFIG_PATH, config);
      const { config: enriched, poolStats } = syncAndEnrichConfig(config);

      const perAccDetails = targetAccounts.map((a) => `${a.name}: ${a.groupUrls?.length || 0} link`).join(', ');

      return NextResponse.json({
        ok: true,
        message: `Đã chia đều ${linksToDistribute.length} link cho ${targetAccounts.length} tài khoản (${perAccDetails})!`,
        data: enriched,
        stats: poolStats,
      });
    }

    // ==========================================
    // 2.1 KHO CHUNG: THU HỒI LINK ĐÃ CHIA (REVOKE / UNASSIGN)
    // ==========================================
    if (action === 'pool_revoke') {
      const {
        mode = 'all', // 'all' | 'unposted_only'
        targetAccountId = null, // null = tất cả tài khoản, hoặc ID của tài khoản cụ thể
      } = body;

      if (!Array.isArray(config.centralPool)) config.centralPool = [];
      if (!Array.isArray(config.accounts)) config.accounts = [];

      let revokedCount = 0;
      const revokedUrls = new Set<string>();

      for (const item of config.centralPool) {
        // Chỉ xét link đang có gán nick
        if (!item.assignedAccountId) continue;

        // Nếu chỉ định cụ thể nick cần thu hồi
        if (targetAccountId && item.assignedAccountId !== targetAccountId) continue;

        // Nếu chỉ thu hồi các link chưa đăng bài thành công
        if (mode === 'unposted_only' && item.lastPostStatus === 'success') {
          continue;
        }

        revokedUrls.add(normalizeUrl(item.url));
        item.assignedAccountId = null;
        item.assignedAccountName = null;
        revokedCount++;
      }

      if (revokedCount === 0) {
        return NextResponse.json({
          ok: false,
          error: mode === 'unposted_only'
            ? 'Không tìm thấy link nào chưa đăng bài để thu hồi'
            : 'Hiện không có link nào đang được gán để thu hồi',
        }, { status: 400 });
      }

      // Gỡ bỏ các url đã thu hồi khỏi groupUrls của các accounts
      for (const acc of config.accounts) {
        if (!targetAccountId || acc.id === targetAccountId) {
          if (Array.isArray(acc.groupUrls)) {
            acc.groupUrls = acc.groupUrls.filter((u) => !revokedUrls.has(normalizeUrl(u)));
          }
        }
      }

      writeJsonFile(GROUPS_CONFIG_PATH, config);
      const { config: enriched, poolStats } = syncAndEnrichConfig(config);

      const modeText = mode === 'unposted_only' ? 'chưa đăng bài' : 'đã gán';
      return NextResponse.json({
        ok: true,
        message: `Đã thu hồi thành công ${revokedCount} link ${modeText} về Kho chung!`,
        data: enriched,
        stats: poolStats,
      });
    }

    // ==========================================
    // 3. KHO CHUNG: CẬP NHẬT TRẠNG THÁI / GÁN ACC CHO 1 LINK
    // ==========================================
    if (action === 'pool_update_item') {
      const { id, url, joinedStatus, assignedAccountId } = body;
      if (!Array.isArray(config.centralPool)) config.centralPool = [];

      const normUrl = url ? normalizeUrl(url) : '';
      let item = config.centralPool.find((i) => (id && i.id === id) || (normUrl && normalizeUrl(i.url) === normUrl));

      // Tự động thêm vào nếu chưa có nhưng có url
      if (!item && url) {
        item = {
          id: id || getStableId(url),
          url: url.trim(),
          addedAt: new Date().toISOString(),
          assignedAccountId: assignedAccountId || null,
          assignedAccountName: null,
          joinedStatus: joinedStatus || 'unknown',
          lastPostStatus: 'not_posted',
        };
        config.centralPool.push(item);
      }

      if (!item) {
        return NextResponse.json({ ok: false, error: 'Không tìm thấy link trong kho chung' }, { status: 404 });
      }

      if (joinedStatus) {
        item.joinedStatus = joinedStatus;
        item.joinedUpdatedAt = new Date().toISOString();
      }

      if (assignedAccountId !== undefined) {
        // Xóa link khỏi tài khoản cũ nếu có
        if (item.assignedAccountId) {
          const oldAcc = config.accounts.find((a) => a.id === item.assignedAccountId);
          if (oldAcc && Array.isArray(oldAcc.groupUrls)) {
            oldAcc.groupUrls = oldAcc.groupUrls.filter((u) => normalizeUrl(u) !== normalizeUrl(item.url));
          }
        }

        if (assignedAccountId) {
          const newAcc = config.accounts.find((a) => a.id === assignedAccountId);
          if (newAcc) {
            item.assignedAccountId = newAcc.id;
            item.assignedAccountName = newAcc.name;
            if (!Array.isArray(newAcc.groupUrls)) newAcc.groupUrls = [];
            if (!newAcc.groupUrls.includes(item.url)) newAcc.groupUrls.push(item.url);
          }
        } else {
          item.assignedAccountId = null;
          item.assignedAccountName = null;
        }
      }

      writeJsonFile(GROUPS_CONFIG_PATH, config);
      const { config: enriched, poolStats } = syncAndEnrichConfig(config);
      return NextResponse.json({ ok: true, message: 'Đã cập nhật thông tin link nhóm!', data: enriched, stats: poolStats });
    }

    // ==========================================
    // 4. KHO CHUNG: XÓA LINK KHỎI KHO
    // ==========================================
    if (action === 'pool_delete_item') {
      const { id, url } = body;
      if (!Array.isArray(config.centralPool)) config.centralPool = [];

      const index = config.centralPool.findIndex((i) => (id && i.id === id) || (url && normalizeUrl(i.url) === normalizeUrl(url)));
      if (index === -1) {
        return NextResponse.json({ ok: false, error: 'Không tìm thấy link để xóa' }, { status: 404 });
      }

      const [removed] = config.centralPool.splice(index, 1);
      const normRemoved = normalizeUrl(removed.url);

      // Xóa luôn khỏi bất kỳ account nào đang gán
      for (const acc of config.accounts) {
        if (Array.isArray(acc.groupUrls)) {
          acc.groupUrls = acc.groupUrls.filter((u) => normalizeUrl(u) !== normRemoved);
        }
      }

      writeJsonFile(GROUPS_CONFIG_PATH, config);
      const { config: enriched, poolStats } = syncAndEnrichConfig(config);
      return NextResponse.json({ ok: true, message: 'Đã xóa link khỏi kho chung!', data: enriched, stats: poolStats });
    }

    // ==========================================
    // 5. CÁC ACTION QUẢN LÝ TÀI KHOẢN CŨ (GIỮ NGUYÊN & ĐỒNG BỘ)
    // ==========================================
    if (action === 'add_account') {
      const { name, profileDir, groupUrls = [], enabled = true } = body;
      const nextIndex = config.accounts.length + 1;
      const id = `acc_${nextIndex}`;
      const newAcc: GroupAccountItem = {
        id,
        name: name?.trim() || `Tài khoản ${nextIndex}`,
        enabled: enabled !== false,
        profileDir: profileDir?.trim() || `n8n-fb-group-profile-${nextIndex}`,
        groupUrls: Array.isArray(groupUrls) ? groupUrls : [],
        lastGroupIndex: -1,
        lastPostedAt: null,
      };

      config.accounts.push(newAcc);
      writeJsonFile(GROUPS_CONFIG_PATH, config);
      const { config: enriched, poolStats } = syncAndEnrichConfig(config);
      return NextResponse.json({ ok: true, message: `Đã thêm tài khoản "${newAcc.name}" thành công!`, data: enriched, stats: poolStats });
    }

    if (action === 'delete_account') {
      const { accountId } = body;
      const index = config.accounts.findIndex((a) => a.id === accountId);
      if (index === -1) {
        return NextResponse.json({ ok: false, error: 'Không tìm thấy tài khoản để xóa' }, { status: 404 });
      }
      const removed = config.accounts.splice(index, 1);

      // Các link đang gán cho tài khoản này sẽ được giữ lại trong kho chung và chuyển về chưa gán
      if (Array.isArray(config.centralPool)) {
        for (const item of config.centralPool) {
          if (item.assignedAccountId === accountId) {
            item.assignedAccountId = null;
            item.assignedAccountName = null;
          }
        }
      }

      writeJsonFile(GROUPS_CONFIG_PATH, config);
      const { config: enriched, poolStats } = syncAndEnrichConfig(config);
      return NextResponse.json({ ok: true, message: `Đã xóa tài khoản "${removed[0]?.name || accountId}"!`, data: enriched, stats: poolStats });
    }

    if (action === 'toggle_account') {
      const { accountId, enabled } = body;
      const target = config.accounts.find((a) => a.id === accountId);
      if (!target) {
        return NextResponse.json({ ok: false, error: 'Không tìm thấy tài khoản' }, { status: 404 });
      }
      target.enabled = Boolean(enabled);
      writeJsonFile(GROUPS_CONFIG_PATH, config);
      const { config: enriched, poolStats } = syncAndEnrichConfig(config);
      return NextResponse.json({ ok: true, message: `Đã ${target.enabled ? 'bật' : 'tắt'} ${target.name}`, data: enriched, stats: poolStats });
    }

    if (action === 'update_account') {
      const { accountId, name, profileDir, enabled } = body;
      const target = config.accounts.find((a) => a.id === accountId);
      if (!target) {
        return NextResponse.json({ ok: false, error: 'Không tìm thấy tài khoản' }, { status: 404 });
      }
      if (name) target.name = name.trim();
      if (profileDir) target.profileDir = profileDir.trim();
      if (enabled !== undefined) target.enabled = Boolean(enabled);
      writeJsonFile(GROUPS_CONFIG_PATH, config);
      const { config: enriched, poolStats } = syncAndEnrichConfig(config);
      return NextResponse.json({ ok: true, message: `Đã cập nhật ${target.name}`, data: enriched, stats: poolStats });
    }

    if (action === 'add') {
      const { accountId, groupUrl } = body;
      if (!groupUrl || !groupUrl.trim().startsWith('http')) {
        return NextResponse.json({ ok: false, error: 'Đường dẫn link nhóm không hợp lệ (phải bắt đầu bằng http hoặc https)' }, { status: 400 });
      }

      const cleanUrl = groupUrl.trim();
      const normInput = normalizeUrl(cleanUrl);

      // Kiểm tra trùng lặp trong centralPool
      if (!Array.isArray(config.centralPool)) config.centralPool = [];
      const poolDuplicate = config.centralPool.find((i) => normalizeUrl(i.url) === normInput);

      // Kiểm tra trùng lặp trong danh sách groupUrls của các accounts
      let accDuplicateName = '';
      for (const a of config.accounts || []) {
        if ((a.groupUrls || []).some((u) => normalizeUrl(u) === normInput)) {
          accDuplicateName = a.name;
          break;
        }
      }

      if (poolDuplicate || accDuplicateName) {
        const whoHolds = poolDuplicate?.assignedAccountName
          ? `đang được gán cho Nick "${poolDuplicate.assignedAccountName}"`
          : accDuplicateName
            ? `đang có ở Nick "${accDuplicateName}"`
            : 'đang có sẵn trong Kho chung';
        return NextResponse.json({
          ok: false,
          error: `Link nhóm này đã tồn tại trong hệ thống (${whoHolds}), không cần thêm nữa!`,
        }, { status: 400 });
      }

      const targetAcc = accountId ? config.accounts.find((a) => a.id === accountId) : null;
      if (accountId && !targetAcc) {
        return NextResponse.json({ ok: false, error: 'Không tìm thấy tài khoản đã chọn' }, { status: 404 });
      }

      if (targetAcc) {
        if (!Array.isArray(targetAcc.groupUrls)) targetAcc.groupUrls = [];
        targetAcc.groupUrls.push(cleanUrl);
      }

      const newItem: CentralPoolItem = {
        id: `pool_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        url: cleanUrl,
        addedAt: new Date().toISOString(),
        assignedAccountId: targetAcc ? targetAcc.id : null,
        assignedAccountName: targetAcc ? targetAcc.name : null,
        joinedStatus: 'unknown',
        lastPostStatus: 'not_posted',
      };
      config.centralPool.push(newItem);

      writeJsonFile(GROUPS_CONFIG_PATH, config);
      const { config: enriched, poolStats } = syncAndEnrichConfig(config);
      return NextResponse.json({
        ok: true,
        message: targetAcc
          ? `Đã thêm link nhóm mới vào Nick "${targetAcc.name}"!`
          : 'Đã thêm link nhóm mới vào Kho chung!',
        data: enriched,
        stats: poolStats,
      });
    }

    if (action === 'remove') {
      const { accountId, groupUrl } = body;
      const acc = config.accounts.find((a) => a.id === accountId);
      if (!acc) return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 });
      acc.groupUrls = (acc.groupUrls || []).filter((u: string) => u !== groupUrl);

      // Cập nhật centralPool thành unassigned
      if (Array.isArray(config.centralPool)) {
        const pItem = config.centralPool.find((i) => normalizeUrl(i.url) === normalizeUrl(groupUrl));
        if (pItem && pItem.assignedAccountId === accountId) {
          pItem.assignedAccountId = null;
          pItem.assignedAccountName = null;
        }
      }

      writeJsonFile(GROUPS_CONFIG_PATH, config);
      const { config: enriched, poolStats } = syncAndEnrichConfig(config);
      return NextResponse.json({ ok: true, message: 'Đã gỡ link nhóm khỏi tài khoản!', data: enriched, stats: poolStats });
    }

    if (action === 'bulk') {
      const { accountId, groupUrlsText, mode = 'append' } = body;
      const acc = config.accounts.find((a) => a.id === accountId);
      if (!acc) return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 });
      const lines: string[] = groupUrlsText
        .split('\n')
        .map((l: string) => l.trim())
        .filter((l: string) => l.startsWith('http'));

      if (!Array.isArray(config.centralPool)) config.centralPool = [];

      // Kiểm tra trùng lặp
      const existingNorms = new Set<string>();
      if (mode !== 'replace') {
        for (const item of config.centralPool) {
          existingNorms.add(normalizeUrl(item.url));
        }
        for (const a of config.accounts) {
          for (const u of a.groupUrls || []) {
            existingNorms.add(normalizeUrl(u));
          }
        }
      }

      const newUrls: string[] = [];
      let duplicateCount = 0;
      const seenBatch = new Set<string>();

      for (const rawUrl of lines) {
        const norm = normalizeUrl(rawUrl);
        if (existingNorms.has(norm) || seenBatch.has(norm)) {
          duplicateCount++;
          continue;
        }
        seenBatch.add(norm);
        existingNorms.add(norm);
        newUrls.push(rawUrl);
      }

      if (mode === 'replace') {
        acc.groupUrls = newUrls;
      } else {
        if (!Array.isArray(acc.groupUrls)) acc.groupUrls = [];
        acc.groupUrls.push(...newUrls);
      }

      writeJsonFile(GROUPS_CONFIG_PATH, config);
      const { config: enriched, poolStats } = syncAndEnrichConfig(config);

      if (newUrls.length === 0 && duplicateCount > 0) {
        return NextResponse.json({
          ok: true,
          message: `Toàn bộ ${duplicateCount} link đều đã tồn tại trong hệ thống (trùng lặp), không thêm link nào!`,
          data: enriched,
          stats: poolStats,
        });
      }

      const dupText = duplicateCount > 0 ? ` (đã bỏ qua ${duplicateCount} link trùng lặp)` : '';
      return NextResponse.json({
        ok: true,
        message: `Đã cập nhật ${newUrls.length} link cho ${acc.name}${dupText}!`,
        data: enriched,
        stats: poolStats,
      });
    }

    if (action === 'save_all') {
      if (Array.isArray(body.accounts)) {
        config.accounts = body.accounts;
        writeJsonFile(GROUPS_CONFIG_PATH, config);
        const { config: enriched, poolStats } = syncAndEnrichConfig(config);
        return NextResponse.json({ ok: true, message: 'Đã lưu toàn bộ danh sách nhóm!', data: enriched, stats: poolStats });
      }
    }

    return NextResponse.json({ error: 'Action không hợp lệ' }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

