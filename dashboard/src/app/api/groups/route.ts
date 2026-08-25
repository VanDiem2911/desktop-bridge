import { NextRequest, NextResponse } from 'next/server';
import { readJsonFile, writeJsonFile, GROUPS_CONFIG_PATH } from '@/lib/server-utils';

interface GroupAccountItem {
  id: string;
  name: string;
  enabled?: boolean;
  profileDir?: string;
  groupUrls?: string[];
  lastGroupIndex?: number;
  lastPostedAt?: string | null;
}

interface GroupsConfig {
  accounts: GroupAccountItem[];
}

export async function GET() {
  try {
    const config = readJsonFile<GroupsConfig>(GROUPS_CONFIG_PATH, { accounts: [] });
    return NextResponse.json({ ok: true, data: config });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;
    const config = readJsonFile<GroupsConfig>(GROUPS_CONFIG_PATH, { accounts: [] });

    // 1. Thêm tài khoản Group mới
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
      return NextResponse.json({ ok: true, message: `Đã thêm tài khoản "${newAcc.name}" thành công!`, data: config });
    }

    // 2. Xóa tài khoản Group
    if (action === 'delete_account') {
      const { accountId } = body;
      const index = config.accounts.findIndex((a) => a.id === accountId);
      if (index === -1) {
        return NextResponse.json({ ok: false, error: 'Không tìm thấy tài khoản để xóa' }, { status: 404 });
      }
      const removed = config.accounts.splice(index, 1);
      writeJsonFile(GROUPS_CONFIG_PATH, config);
      return NextResponse.json({ ok: true, message: `Đã xóa tài khoản "${removed[0]?.name || accountId}"!`, data: config });
    }

    // 3. Toggle Bật/Tắt tài khoản
    if (action === 'toggle_account') {
      const { accountId, enabled } = body;
      const target = config.accounts.find((a) => a.id === accountId);
      if (!target) {
        return NextResponse.json({ ok: false, error: 'Không tìm thấy tài khoản' }, { status: 404 });
      }
      target.enabled = Boolean(enabled);
      writeJsonFile(GROUPS_CONFIG_PATH, config);
      return NextResponse.json({ ok: true, message: `Đã ${target.enabled ? 'bật' : 'tắt'} ${target.name}`, data: config });
    }

    // 4. Cập nhật thông tin tài khoản
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
      return NextResponse.json({ ok: true, message: `Đã cập nhật ${target.name}`, data: config });
    }

    // 5. Thêm 1 link nhóm
    if (action === 'add') {
      const { accountId, groupUrl } = body;
      const acc = config.accounts.find((a) => a.id === accountId);
      if (!acc) return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 });
      if (!acc.groupUrls) acc.groupUrls = [];
      const cleanUrl = groupUrl.trim();
      if (!acc.groupUrls.includes(cleanUrl)) {
        acc.groupUrls.push(cleanUrl);
        writeJsonFile(GROUPS_CONFIG_PATH, config);
      }
      return NextResponse.json({ ok: true, message: 'Đã thêm link nhóm!', data: config });
    }

    // 6. Xóa link nhóm
    if (action === 'remove') {
      const { accountId, groupUrl } = body;
      const acc = config.accounts.find((a) => a.id === accountId);
      if (!acc) return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 });
      acc.groupUrls = (acc.groupUrls || []).filter((u: string) => u !== groupUrl);
      writeJsonFile(GROUPS_CONFIG_PATH, config);
      return NextResponse.json({ ok: true, message: 'Đã xóa link nhóm!', data: config });
    }

    // 7. Bulk import link nhóm
    if (action === 'bulk') {
      const { accountId, groupUrlsText, mode = 'append' } = body;
      const acc = config.accounts.find((a) => a.id === accountId);
      if (!acc) return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 });
      const lines: string[] = groupUrlsText
        .split('\n')
        .map((l: string) => l.trim())
        .filter((l: string) => l.startsWith('http'));

      if (mode === 'replace') {
        acc.groupUrls = Array.from(new Set(lines));
      } else {
        acc.groupUrls = Array.from(new Set([...(acc.groupUrls || []), ...lines]));
      }
      writeJsonFile(GROUPS_CONFIG_PATH, config);
      return NextResponse.json({ ok: true, message: `Đã cập nhật ${acc.groupUrls?.length || 0} nhóm!`, data: config });
    }

    if (action === 'save_all') {
      if (Array.isArray(body.accounts)) {
        config.accounts = body.accounts;
        writeJsonFile(GROUPS_CONFIG_PATH, config);
        return NextResponse.json({ ok: true, message: 'Đã lưu toàn bộ danh sách nhóm!', data: config });
      }
    }

    return NextResponse.json({ error: 'Action không hợp lệ' }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
