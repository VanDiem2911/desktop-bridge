import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { spawn } from 'node:child_process';
import http from 'node:http';

function resolveBridgeDir(): string {
  const candidates = [
    path.resolve(process.cwd(), '..'),
    path.resolve(process.cwd()),
    path.resolve(process.cwd(), 'desktop-bridge'),
    path.resolve(process.cwd(), '..', 'desktop-bridge'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'group-server.mjs')) && fs.existsSync(path.join(c, 'server.mjs'))) {
      return c;
    }
  }
  return path.resolve(process.cwd(), '..');
}

// Đường dẫn thư mục gốc desktop-bridge (Tự động thích ứng trên mọi máy)
export const BRIDGE_DIR = resolveBridgeDir();
function resolveConfigPath(filename: string, exampleFilename?: string): string {
  const configsPath = path.join(BRIDGE_DIR, 'configs', filename);
  const rootPath = path.join(BRIDGE_DIR, filename);

  if (fs.existsSync(configsPath)) return configsPath;
  if (fs.existsSync(rootPath)) return rootPath;

  // Nếu chưa tồn tại, copy từ example vào configs/
  const configsDir = path.join(BRIDGE_DIR, 'configs');
  if (!fs.existsSync(configsDir)) {
    try { fs.mkdirSync(configsDir, { recursive: true }); } catch {}
  }
  if (exampleFilename) {
    const exampleInConfigs = path.join(configsDir, exampleFilename);
    const exampleInRoot = path.join(BRIDGE_DIR, exampleFilename);
    const examplePath = fs.existsSync(exampleInConfigs) ? exampleInConfigs : exampleInRoot;
    if (fs.existsSync(examplePath)) {
      try { fs.copyFileSync(examplePath, configsPath); } catch {}
    }
  }
  return configsPath;
}

export const GROUPS_CONFIG_PATH = resolveConfigPath('groups-config.json', 'groups-config.example.json');
export const PERSONAL_CONFIG_PATH = resolveConfigPath('personal-config.json', 'personal-config.example.json');
export const CHATGPT_CONFIG_PATH = resolveConfigPath('chatgpt-config.json', 'chatgpt-config.example.json');
export const FANPAGE_CONFIG_PATH = resolveConfigPath('fanpage-config.json', 'fanpage-config.example.json');
export const BOT_CONFIG_PATH = resolveConfigPath('bot-config.json', 'bot-config.example.json');
export const SCHEDULE_CONFIG_PATH = path.join(BRIDGE_DIR, 'configs', 'schedule-config.json');
export const POST_HISTORY_PATH = path.join(BRIDGE_DIR, 'configs', 'post-history.json');
export const CREDENTIALS_CONFIG_PATH = path.join(BRIDGE_DIR, 'configs', 'credentials-config.json');

/** Cổng mặc định cho các server nội bộ — có thể ghi đè qua serverPorts trong schedule-config.json */
const DEFAULT_SERVER_PORTS = {
  fanpageServer: 3001,  // server.mjs — Fanpage & ChatGPT
  groupsServer: 3002,   // group-server.mjs — Facebook Groups
  botServer: 3004,      // bot-server.mjs — Telegram Bot & Scheduler
};

export interface ServerPorts {
  fanpageServer: number;
  groupsServer: number;
  botServer: number;
}

/**
 * Đọc port cấu hình từ schedule-config.json (trường serverPorts).
 * Nếu chưa khai báo → dùng port mặc định để backward-compatible.
 */
export function getServerPorts(): ServerPorts {
  try {
    const raw = JSON.parse(fs.readFileSync(SCHEDULE_CONFIG_PATH, 'utf-8')) as Record<string, unknown>;
    const sp = (raw.serverPorts || {}) as Partial<ServerPorts>;
    return {
      fanpageServer: sp.fanpageServer || DEFAULT_SERVER_PORTS.fanpageServer,
      groupsServer:  sp.groupsServer  || DEFAULT_SERVER_PORTS.groupsServer,
      botServer:     sp.botServer     || DEFAULT_SERVER_PORTS.botServer,
    };
  } catch {
    return { ...DEFAULT_SERVER_PORTS };
  }
}

export interface BotConfig {
  botToken?: string;
  chatId?: string;
  allowedChatIds?: string[];
  enableAlerts?: boolean;
  enableDailyDigest?: boolean;
  dailyDigestTime?: string;
  alertOnServerDown?: boolean;
  alertOnCheckpoint?: boolean;
  alertOnJobError?: boolean;
  checkIntervalSeconds?: number;
}


export function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Lỗi đọc file ${filePath}:`, message);
  }
  return fallback;
}

export function writeJsonFile(filePath: string, data: unknown) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function getChromeExecutable(): string {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    ...(process.env.LOCALAPPDATA ? [path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe')] : []),
    ...(process.env.PROGRAMFILES ? [path.join(process.env.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe')] : []),
    ...(process.env['PROGRAMFILES(X86)'] ? [path.join(process.env['PROGRAMFILES(X86)'], 'Google', 'Chrome', 'Application', 'chrome.exe')] : []),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return candidates[0] || 'chrome.exe';
}

export function isPortOpen(port: number, timeoutMs = 800): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/`, { timeout: timeoutMs }, () => {
      resolve(true);
    });
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.on('error', () => resolve(false));
  });
}

export interface ChromeTabStatus {
  isReady: boolean;
  loginStatus: 'logged_in' | 'not_logged_in' | 'no_tab' | 'offline';
  currentUrl?: string;
}

function evalCdpJs(wsUrl: string, expression: string, timeoutMs = 1200): Promise<unknown> {
  return new Promise((resolve) => {
    let timer: NodeJS.Timeout | null = null;
    let ws: WebSocket | null = null;
    const cleanup = () => {
      if (timer) clearTimeout(timer);
      if (ws) {
        try {
          ws.close();
        } catch {}
      }
    };

    timer = setTimeout(() => {
      cleanup();
      resolve(null);
    }, timeoutMs);

    try {
      ws = new WebSocket(wsUrl);
      ws.onopen = () => {
        ws?.send(
          JSON.stringify({
            id: 1,
            method: 'Runtime.evaluate',
            params: { expression, returnByValue: true },
          }),
        );
      };
      ws.onmessage = (event) => {
        try {
          const res = JSON.parse(String(event.data));
          cleanup();
          resolve(res.result?.result?.value);
        } catch {
          cleanup();
          resolve(null);
        }
      };
      ws.onerror = () => {
        cleanup();
        resolve(null);
      };
    } catch {
      cleanup();
      resolve(null);
    }
  });
}

export async function checkChromeTabStatus(
  port: number,
  service: 'chatgpt' | 'facebook',
  timeoutMs = 1500,
): Promise<ChromeTabStatus> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`http://127.0.0.1:${port}/json`, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      return { isReady: false, loginStatus: 'offline' };
    }

    const tabs = (await res.json()) as Array<{
      type?: string;
      url?: string;
      title?: string;
      faviconUrl?: string;
      webSocketDebuggerUrl?: string;
    }>;

    if (!Array.isArray(tabs)) {
      return { isReady: true, loginStatus: 'no_tab' };
    }

    if (service === 'chatgpt') {
      const gptTab = tabs.find((t) => t.type === 'page' && t.url && t.url.includes('chatgpt.com'));
      if (!gptTab) {
        return { isReady: true, loginStatus: 'no_tab' };
      }

      const url = gptTab.url || '';
      if (url.includes('/auth/login') || url.includes('/login') || url.includes('/auth/ext_callback')) {
        return { isReady: true, loginStatus: 'not_logged_in', currentUrl: url };
      }

      if (gptTab.faviconUrl && gptTab.faviconUrl.includes('unauth-mweb')) {
        return { isReady: true, loginStatus: 'not_logged_in', currentUrl: url };
      }

      if (gptTab.webSocketDebuggerUrl) {
        const evalResult = (await evalCdpJs(
          gptTab.webSocketDebuggerUrl,
          `(() => {
            const hasLoginBtn = Array.from(document.querySelectorAll('button, a')).some(el => {
              const txt = (el.innerText || '').trim();
              return txt === 'Log in' || txt === 'Đăng nhập' || txt === 'Sign up for free' || txt === 'Sign up';
            });
            const hasUserMenu = Boolean(document.querySelector('[data-testid="user-profile"], [data-testid="profile-button"], button[aria-label*="User menu"], button[aria-label*="Tài khoản"], button[aria-label*="Profile"]'));
            const isUnauthFavicon = Boolean(document.querySelector('link[href*="unauth-mweb"]'));
            return hasUserMenu || (!hasLoginBtn && !isUnauthFavicon);
          })()`,
        )) as boolean | null;

        if (evalResult !== null) {
          return {
            isReady: true,
            loginStatus: evalResult ? 'logged_in' : 'not_logged_in',
            currentUrl: url,
          };
        }
      }

      return { isReady: true, loginStatus: 'logged_in', currentUrl: url };
    }

    if (service === 'facebook') {
      const fbTab = tabs.find((t) => t.type === 'page' && t.url && (t.url.includes('facebook.com') || t.url.includes('fb.com')));
      if (!fbTab) {
        return { isReady: true, loginStatus: 'no_tab' };
      }

      const url = fbTab.url || '';
      if (url.includes('/login') || url.includes('/checkpoint') || url.includes('login.php')) {
        return { isReady: true, loginStatus: 'not_logged_in', currentUrl: url };
      }

      if (fbTab.webSocketDebuggerUrl) {
        const evalResult = (await evalCdpJs(
          fbTab.webSocketDebuggerUrl,
          `(() => {
            const isLoginPage = Boolean(
              window.location.pathname.includes('/login') ||
              window.location.pathname.includes('/checkpoint') ||
              document.querySelector('form#login_form, input[name="email"], input[name="pass"], button[name="login"]')
            );
            const hasUserCookie = document.cookie.includes('c_user');
            const hasFbNav = Boolean(document.querySelector('[aria-label*="Trang chủ"], [aria-label*="Home"], [aria-label*="Tài khoản của bạn"], [aria-label*="Your profile"], [role="navigation"]'));
            return hasUserCookie || (hasFbNav && !isLoginPage);
          })()`,
        )) as boolean | null;

        if (evalResult !== null) {
          return {
            isReady: true,
            loginStatus: evalResult ? 'logged_in' : 'not_logged_in',
            currentUrl: url,
          };
        }
      }

      return { isReady: true, loginStatus: 'logged_in', currentUrl: url };
    }

    return { isReady: true, loginStatus: 'no_tab' };
  } catch {
    return { isReady: false, loginStatus: 'offline' };
  }
}

export function openChromeProfile(profileDir: string, port: number, url = 'https://www.facebook.com/') {
  const chromePath = getChromeExecutable();
  const profilePath = path.join(os.homedir(), 'AppData', 'Local', profileDir);

  spawn(
    chromePath,
    [
      '--remote-debugging-address=127.0.0.1',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profilePath}`,
      '--start-maximized',
      url,
    ],
    { detached: true, stdio: 'ignore' },
  ).unref();
}

function decodeHtmlEntities(str: string): string {
  if (!str) return '';
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&#([0-9]+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

export function extractFallbackNameFromUrl(url: string): string {
  try {
    const cleanUrl = url.replace(/[?#].*$/, '').replace(/\/+$/, '');
    const parts = cleanUrl.split('/').filter(Boolean);
    const lastPart = parts[parts.length - 1];
    if (!lastPart || lastPart === 'facebook.com' || lastPart === 'groups') return '';
    return lastPart
      .replace(/[-_.]+/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  } catch {
    return '';
  }
}

export async function fetchFacebookTitle(url: string): Promise<string> {
  if (!url || typeof url !== 'string' || !url.includes('facebook.com')) return '';

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(6000),
    });

    const html = await res.text();
    const ogTitle = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i)
                 || html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i);
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);

    let raw = ogTitle ? ogTitle[1] : (titleMatch ? titleMatch[1] : '');
    raw = decodeHtmlEntities(raw);

    // Xóa hậu tố đặc trưng của Facebook
    const clean = raw
      .replace(/\s*(\||\-)\s*(Trang chủ\s*\|\s*)?Facebook.*$/i, '')
      .replace(/\s*(\||\-)\s*(Home\s*\|\s*)?Facebook.*$/i, '')
      .replace(/\s*(\||\-)\s*Meta.*$/i, '')
      .trim();

    const lower = clean.toLowerCase();
    if (
      clean &&
      lower !== 'facebook' &&
      lower !== 'error' &&
      !lower.includes('log in') &&
      !lower.includes('đăng nhập') &&
      !lower.includes('security check')
    ) {
      return clean;
    }
  } catch {
    // ignore
  }

  const slug = extractFallbackNameFromUrl(url);
  if (slug) {
    return url.includes('/groups/') ? `Nhóm ${slug}` : `Fanpage ${slug}`;
  }
  return '';
}
