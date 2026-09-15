import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getBridgeDir() {
  const candidates = [
    path.resolve(__dirname, '..'),
    path.resolve(__dirname),
    path.resolve(process.cwd()),
    path.resolve(process.cwd(), 'desktop-bridge'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, 'group-server.mjs')) && fs.existsSync(path.join(c, 'personal-server.mjs'))) {
      return c;
    }
  }
  return path.resolve(__dirname, '..');
}

const BRIDGE_DIR = getBridgeDir();
const GOOGLE_CREDS_PATH = path.join(BRIDGE_DIR, 'configs', 'google-service-account.json');

function base64Url(input) {
  return Buffer.from(input).toString('base64url');
}

export function extractSpreadsheetId(urlOrId) {
  if (!urlOrId) return '1tx_RHyRfBgGuYTvO3Tr_08Hrp6SelIsfN9hTQaT3jUY';
  const trimmed = urlOrId.trim();
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  return trimmed;
}

export function colIndexToLetter(index) {
  let temp = index;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

function isPostUrl(value) {
  return /^https?:\/\//i.test(String(value || '').trim());
}

function hasLegacyPostLinkIdCollision(headers, rows) {
  const postLinkColIdx = headers.indexOf('post_link');
  if (postLinkColIdx === -1 || headers.includes('id')) return false;

  const populatedValues = rows
    .slice(1)
    .map((row) => String(row[postLinkColIdx] || '').trim())
    .filter(Boolean);
  const numericIdCount = populatedValues.filter((value) => /^\d+$/.test(value)).length;

  return numericIdCount >= 2 && numericIdCount > populatedValues.length / 2;
}

let cachedToken = null;
let tokenExpiresAt = 0;

export async function getGoogleAccessToken() {
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  if (!fs.existsSync(GOOGLE_CREDS_PATH)) {
    throw new Error('Chưa tìm thấy file google-service-account.json trong configs');
  }

  const creds = JSON.parse(fs.readFileSync(GOOGLE_CREDS_PATH, 'utf-8'));
  const email = creds.email || creds.client_email;
  const rawKey = creds.privateKey || creds.private_key;
  if (!email || !rawKey) {
    throw new Error('Google service account thiếu email hoặc privateKey');
  }

  const privateKey = rawKey.replace(/\\n/g, '\n');
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  const signature = signer.sign(privateKey, 'base64url');
  const jwt = `${unsigned}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const data = await res.json();
  if (!data.access_token) {
    throw new Error('Lỗi xác thực Google OAuth: ' + (data.error_description || data.error || JSON.stringify(data)));
  }

  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
  return cachedToken;
}

/**
 * Lấy danh sách tất cả các Sheet tabs có trong bảng tính (vd: ['topics', 'content_calendar'])
 */
export async function getSpreadsheetSheetsList(spreadsheetId = null) {
  const sid = extractSpreadsheetId(spreadsheetId);
  const token = await getGoogleAccessToken();
  const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sid}?fields=sheets.properties.title`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (data.error) {
    throw new Error(`Google Sheets API Error: ${data.error.message}`);
  }
  return (data.sheets || []).map((s) => s.properties.title);
}

/**
 * Đọc toàn bộ danh sách topic từ Google Sheet và thống kê trạng thái (hỗ trợ cả 'topics' và 'content_calendar')
 */
export async function getSheetTopicsOverview(spreadsheetId = null, sheetName = 'topics') {
  const sid = extractSpreadsheetId(spreadsheetId);
  const sname = sheetName || 'topics';
  const token = await getGoogleAccessToken();

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sid}/values/${encodeURIComponent(sname)}!A1:Z`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();

  if (data.error) {
    throw new Error(`Google Sheets API Error (${data.error.code}): ${data.error.message}`);
  }

  const rows = data.values || [];
  if (rows.length < 2) {
    return {
      spreadsheetId: sid,
      sheetName: sname,
      total: 0,
      done: 0,
      inProgress: 0,
      pending: 0,
      nextTopic: null,
      rows: [],
    };
  }

  const header = rows[0].map((h) => String(h || '').trim().toLowerCase());
  const idCol = header.indexOf('id');
  const topicCol = header.indexOf('topic');
  const categoryCol = header.indexOf('category');
  const keywordsCol = header.indexOf('keywords');
  const statusCol = header.indexOf('status');
  const publishedAtCol = header.indexOf('published_at');
  const slotCol = header.indexOf('slot');
  const dayCol = header.indexOf('day');

  let doneCount = 0;
  let inProgressCount = 0;
  let pendingCount = 0;
  let nextTopic = null;

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const status = (statusCol !== -1 ? r[statusCol] : '').trim().toLowerCase();
    const topicText = (topicCol !== -1 ? r[topicCol] : '').trim();
    if (!topicText) continue;

    if (status === 'done') {
      doneCount++;
    } else if (status === 'in_progress') {
      inProgressCount++;
      if (!nextTopic && topicText) {
        nextTopic = {
          rowIndex: i + 1,
          sheetName: sname,
          id: idCol !== -1 ? r[idCol] || String(i) : String(i),
          topic: topicText,
          category: categoryCol !== -1 ? r[categoryCol] || '' : '',
          keywords: keywordsCol !== -1 ? r[keywordsCol] || '' : '',
          slot: slotCol !== -1 ? r[slotCol] || '' : '',
          day: dayCol !== -1 ? r[dayCol] || '' : '',
          status,
          publishedAt: publishedAtCol !== -1 ? r[publishedAtCol] || '' : '',
        };
      }
    } else {
      pendingCount++;
      if (!nextTopic && topicText) {
        nextTopic = {
          rowIndex: i + 1,
          sheetName: sname,
          id: idCol !== -1 ? r[idCol] || String(i) : String(i),
          topic: topicText,
          category: categoryCol !== -1 ? r[categoryCol] || '' : '',
          keywords: keywordsCol !== -1 ? r[keywordsCol] || '' : '',
          slot: slotCol !== -1 ? r[slotCol] || '' : '',
          day: dayCol !== -1 ? r[dayCol] || '' : '',
          status: status || 'pending',
          publishedAt: publishedAtCol !== -1 ? r[publishedAtCol] || '' : '',
        };
      }
    }
  }

  return {
    spreadsheetId: sid,
    sheetName: sname,
    total: rows.length - 1,
    done: doneCount,
    inProgress: inProgressCount,
    pending: pendingCount,
    nextTopic,
  };
}

/**
 * Lấy topic tiếp theo để đăng bài
 */
export async function getNextTopicFromSheet(spreadsheetId = null, sheetName = 'topics') {
  const overview = await getSheetTopicsOverview(spreadsheetId, sheetName);
  return overview.nextTopic;
}

export function getVietnamDateTimeString(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const d = new Date(date);
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const vn = new Date(utc + 7 * 3600000);
  const YYYY = vn.getFullYear();
  const MM = pad(vn.getMonth() + 1);
  const DD = pad(vn.getDate());
  const HH = pad(vn.getHours());
  const mm = pad(vn.getMinutes());
  const ss = pad(vn.getSeconds());
  return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${ss}`;
}

/**
 * Cập nhật trạng thái topic trong Google Sheet linh hoạt theo tên cột động
 */
export async function updateSheetTopicStatus({
  spreadsheetId = null,
  sheetName = 'topics',
  rowIndex,
  status = 'done',
  publishedAt = null,
  postUrl = null,
}) {
  if (!rowIndex || rowIndex < 2) {
    throw new Error('rowIndex không hợp lệ để cập nhật Google Sheet');
  }

  const sid = extractSpreadsheetId(spreadsheetId);
  const sname = sheetName || 'topics';
  const token = await getGoogleAccessToken();
  const dateStr = publishedAt || getVietnamDateTimeString();

  // Đọc cả dữ liệu để phát hiện trường hợp cột ID cũ bị đổi nhầm tên thành post_link.
  const headerUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sid}/values/${encodeURIComponent(sname)}!A1:Z`;
  const hRes = await fetch(headerUrl, { headers: { Authorization: `Bearer ${token}` } });
  const hData = await hRes.json();
  if (hData.error) {
    throw new Error(`Google Sheets API Error (${hData.error.code}): ${hData.error.message}`);
  }

  const sheetRows = hData.values || [];
  const headers = (sheetRows[0] || []).map((h) => String(h || '').trim().toLowerCase());

  let statusColIdx = headers.indexOf('status');
  let publishedAtColIdx = headers.indexOf('published_at');
  let postLinkColIdx = headers.indexOf('post_link');

  const valueRanges = [];

  // Bản cũ từng ghi header post_link đè lên cột ID đầu tiên. Khôi phục cột ID,
  // chuyển các URL đã có sang cột post_link mới ở cuối bảng và giữ nguyên số ID.
  if (hasLegacyPostLinkIdCollision(headers, sheetRows)) {
    const legacyIdColIdx = postLinkColIdx;
    postLinkColIdx = headers.length;

    valueRanges.push({
      range: `${sname}!${colIndexToLetter(legacyIdColIdx)}1`,
      values: [['id']],
    });
    valueRanges.push({
      range: `${sname}!${colIndexToLetter(postLinkColIdx)}1`,
      values: [['post_link']],
    });

    for (let dataIndex = 1; dataIndex < sheetRows.length; dataIndex++) {
      const legacyValue = sheetRows[dataIndex][legacyIdColIdx];
      if (!isPostUrl(legacyValue)) continue;

      const sheetRowIndex = dataIndex + 1;
      valueRanges.push({
        range: `${sname}!${colIndexToLetter(legacyIdColIdx)}${sheetRowIndex}`,
        values: [[String(dataIndex)]],
      });
      valueRanges.push({
        range: `${sname}!${colIndexToLetter(postLinkColIdx)}${sheetRowIndex}`,
        values: [[legacyValue]],
      });
    }
  }

  // 1. Cập nhật Status
  if (statusColIdx !== -1) {
    const colLetter = colIndexToLetter(statusColIdx);
    valueRanges.push({
      range: `${sname}!${colLetter}${rowIndex}`,
      values: [[status]],
    });
  }

  // 2. Cập nhật Published At
  if (status === 'done' && publishedAtColIdx !== -1) {
    const colLetter = colIndexToLetter(publishedAtColIdx);
    valueRanges.push({
      range: `${sname}!${colLetter}${rowIndex}`,
      values: [[dateStr]],
    });
  }

  // 3. Cập nhật Post Link
  if (status === 'done' && postUrl) {
    if (postLinkColIdx === -1) {
      postLinkColIdx = headers.length;
      const colLetter = colIndexToLetter(postLinkColIdx);
      valueRanges.push({
        range: `${sname}!${colLetter}1`,
        values: [['post_link']],
      });
      valueRanges.push({
        range: `${sname}!${colLetter}${rowIndex}`,
        values: [[postUrl]],
      });
    } else {
      const colLetter = colIndexToLetter(postLinkColIdx);
      valueRanges.push({
        range: `${sname}!${colLetter}${rowIndex}`,
        values: [[postUrl]],
      });
    }
  }

  const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sid}/values:batchUpdate`;
  const res = await fetch(batchUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      valueInputOption: 'USER_ENTERED',
      data: valueRanges,
    }),
  });

  const resJson = await res.json();
  if (resJson.error) {
    throw new Error(`Google Sheets API Error (${resJson.error.code}): ${resJson.error.message}`);
  }

  const savedPublishedAt = status === 'done' ? dateStr : null;
  const savedPostUrl = status === 'done' ? postUrl : null;
  console.log(`[GoogleSheet] ✅ Đã cập nhật ${sname} dòng ${rowIndex}: status=${status}${savedPublishedAt ? `, published_at=${savedPublishedAt}` : ''}${savedPostUrl ? `, post_link=${savedPostUrl}` : ''}`);
  return {
    ok: true,
    sheetName: sname,
    rowIndex,
    status,
    publishedAt: savedPublishedAt,
    postUrl: savedPostUrl,
  };
}
