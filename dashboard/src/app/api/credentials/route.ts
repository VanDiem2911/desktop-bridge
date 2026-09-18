import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import {
  CREDENTIALS_CONFIG_PATH,
  CHATGPT_CONFIG_PATH,
  PERSONAL_CONFIG_PATH,
  GROUPS_CONFIG_PATH,
  readJsonFile,
  writeJsonFile,
} from '@/lib/server-utils';
import { CredentialsData, ChatGptCredential, FacebookCredential } from '@/types/dashboard';

interface RawChatGptAccount {
  id: number | string;
  name: string;
  profileDir?: string;
  port?: number;
  enabled?: boolean;
}

interface RawPersonalAccount {
  id: number | string;
  name: string;
  profileUrl?: string;
  profileDir?: string;
  port?: number;
  enabled?: boolean;
  description?: string;
}

interface RawGroupAccount {
  id: string;
  name: string;
  port?: number;
  profileDir?: string;
  profileUrl?: string;
  status?: string;
}

function getOrInitCredentials(): CredentialsData {
  if (fs.existsSync(CREDENTIALS_CONFIG_PATH)) {
    const data = readJsonFile<CredentialsData>(CREDENTIALS_CONFIG_PATH, { chatgpt: [], facebook: [] });
    return {
      chatgpt: Array.isArray(data.chatgpt) ? data.chatgpt : [],
      facebook: Array.isArray(data.facebook) ? data.facebook : [],
    };
  }

  // Khởi tạo tự động từ các config hiện có nếu chưa có file credentials
  const initialGpt: ChatGptCredential[] = [];
  const initialFb: FacebookCredential[] = [];

  try {
    const gptConfig = readJsonFile<{ accounts?: RawChatGptAccount[] }>(CHATGPT_CONFIG_PATH, { accounts: [] });
    if (Array.isArray(gptConfig.accounts)) {
      for (const acc of gptConfig.accounts) {
        initialGpt.push({
          id: `gpt-${acc.id}`,
          name: acc.name || `ChatGPT Tài khoản ${acc.id}`,
          email: '',
          password: '',
          plan: 'Plus',
          status: acc.enabled !== false ? 'active' : 'backup',
          port: acc.port || 9222,
          profileDir: acc.profileDir || `n8n-chatgpt-profile-${acc.id}`,
          notes: 'Tự động liên kết với Chrome Profile ChatGPT',
          updatedAt: new Date().toISOString(),
        });
      }
    }
  } catch {}

  try {
    const personalConfig = readJsonFile<{ accounts?: RawPersonalAccount[] }>(PERSONAL_CONFIG_PATH, { accounts: [] });
    if (Array.isArray(personalConfig.accounts)) {
      for (const acc of personalConfig.accounts) {
        initialFb.push({
          id: `fb-personal-${acc.id}`,
          name: acc.name ? `FB Cá nhân ${acc.name}` : `Nick FB ${acc.id}`,
          type: 'personal',
          account: '',
          password: '',
          twoFactorSecret: '',
          profileUrl: acc.profileUrl || '',
          port: acc.port || 9230,
          profileDir: acc.profileDir || `n8n-personal-profile-${acc.id}`,
          status: acc.enabled !== false ? 'active' : 'backup',
          notes: acc.description || 'Tự động liên kết với Chrome Profile Trang cá nhân',
          updatedAt: new Date().toISOString(),
        });
      }
    }
  } catch {}

  try {
    const groupsConfig = readJsonFile<{ accounts?: RawGroupAccount[] }>(GROUPS_CONFIG_PATH, { accounts: [] });
    if (Array.isArray(groupsConfig.accounts)) {
      for (const acc of groupsConfig.accounts) {
        const exists = initialFb.some((f) => f.id === `fb-group-${acc.id}` || f.profileDir === acc.profileDir);
        if (!exists) {
          initialFb.push({
            id: `fb-group-${acc.id}`,
            name: acc.name || `FB Group ${acc.id}`,
            type: 'via',
            account: '',
            password: '',
            twoFactorSecret: '',
            profileUrl: acc.profileUrl || '',
            port: acc.port,
            profileDir: acc.profileDir,
            status: acc.status === 'quarantine' ? 'checkpoint' : 'active',
            notes: 'Tài khoản đăng bài Nhóm Facebook',
            updatedAt: new Date().toISOString(),
          });
        }
      }
    }
  } catch {}

  const initialData: CredentialsData = {
    chatgpt: initialGpt,
    facebook: initialFb,
  };

  const configsDir = path.dirname(CREDENTIALS_CONFIG_PATH);
  if (!fs.existsSync(configsDir)) {
    try { fs.mkdirSync(configsDir, { recursive: true }); } catch {}
  }
  writeJsonFile(CREDENTIALS_CONFIG_PATH, initialData);

  return initialData;
}

function saveCredentials(data: CredentialsData) {
  const configsDir = path.dirname(CREDENTIALS_CONFIG_PATH);
  if (!fs.existsSync(configsDir)) {
    try { fs.mkdirSync(configsDir, { recursive: true }); } catch {}
  }
  writeJsonFile(CREDENTIALS_CONFIG_PATH, data);
}

export async function GET() {
  try {
    const data = getOrInitCredentials();
    return NextResponse.json({ ok: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { service, item } = body as { service: 'chatgpt' | 'facebook'; item: Record<string, any> };

    if (!service || !item) {
      return NextResponse.json({ ok: false, error: 'Thiếu service hoặc thông tin tài khoản' }, { status: 400 });
    }

    const data = getOrInitCredentials();
    const id = item.id || `${service === 'chatgpt' ? 'gpt' : 'fb'}_${Date.now()}`;
    const newItem = {
      ...item,
      id,
      updatedAt: new Date().toISOString(),
    };

    if (service === 'chatgpt') {
      data.chatgpt.unshift(newItem as ChatGptCredential);
    } else {
      data.facebook.unshift(newItem as FacebookCredential);
    }

    saveCredentials(data);
    return NextResponse.json({ ok: true, message: 'Đã thêm tài khoản thành công!', item: newItem });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { service, item } = body as { service: 'chatgpt' | 'facebook'; item: Record<string, any> };

    if (!service || !item || !item.id) {
      return NextResponse.json({ ok: false, error: 'Thiếu ID hoặc thông tin tài khoản' }, { status: 400 });
    }

    const data = getOrInitCredentials();
    const updatedAt = new Date().toISOString();

    if (service === 'chatgpt') {
      const idx = data.chatgpt.findIndex((c) => c.id === item.id);
      if (idx === -1) {
        return NextResponse.json({ ok: false, error: 'Không tìm thấy tài khoản ChatGPT' }, { status: 404 });
      }
      data.chatgpt[idx] = { ...data.chatgpt[idx], ...item, updatedAt };
    } else {
      const idx = data.facebook.findIndex((f) => f.id === item.id);
      if (idx === -1) {
        return NextResponse.json({ ok: false, error: 'Không tìm thấy tài khoản Facebook' }, { status: 404 });
      }
      data.facebook[idx] = { ...data.facebook[idx], ...item, updatedAt };
    }

    saveCredentials(data);
    return NextResponse.json({ ok: true, message: 'Đã cập nhật thông tin tài khoản!' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { service, id } = body as { service: 'chatgpt' | 'facebook'; id: string };

    if (!service || !id) {
      return NextResponse.json({ ok: false, error: 'Thiếu service hoặc ID tài khoản' }, { status: 400 });
    }

    const data = getOrInitCredentials();

    if (service === 'chatgpt') {
      data.chatgpt = data.chatgpt.filter((c) => c.id !== id);
    } else {
      data.facebook = data.facebook.filter((f) => f.id !== id);
    }

    saveCredentials(data);
    return NextResponse.json({ ok: true, message: 'Đã xóa tài khoản khỏi danh bạ mật khẩu!' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
