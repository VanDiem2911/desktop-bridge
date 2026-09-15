import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logPostActivity } from './history-logger.mjs';
import { getNextTopicFromSheet, updateSheetTopicStatus, getVietnamDateTimeString } from './google-sheets.mjs';

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
const SCHEDULE_CONFIG_PATH = path.join(BRIDGE_DIR, 'configs', 'schedule-config.json');
const FANPAGE_CONFIG_PATH = path.join(BRIDGE_DIR, 'configs', 'fanpage-config.json');
const PERSONAL_CONFIG_PATH = path.join(BRIDGE_DIR, 'configs', 'personal-config.json');
const BOT_CONFIG_PATH = path.join(BRIDGE_DIR, 'configs', 'bot-config.json');

export function loadScheduleConfig() {
  try {
    if (fs.existsSync(SCHEDULE_CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(SCHEDULE_CONFIG_PATH, 'utf-8'));
    }
  } catch (err) {
    console.error('[AutoPilot] Lỗi đọc schedule-config.json:', err.message);
  }
  return {
    enabled: true,
    geminiApiKey: '',
    model: 'gemini-2.5-flash',
    scheduleTimes: ['08:30', '11:30', '14:30', '19:30'],
    channels: { fanpage: true, groups: true, personal: false },
    aspectRatio: '4:5',
    hasMascotDu: true,
    topics: [],
    lastRunAt: null,
    lastTopic: null,
    lastRunStatus: null,
  };
}

export function saveScheduleConfig(config) {
  try {
    const dir = path.dirname(SCHEDULE_CONFIG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SCHEDULE_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[AutoPilot] Lỗi ghi schedule-config.json:', err.message);
    return false;
  }
}

export function shouldIncludeDu(sheetName, fallback = true) {
  const name = String(sheetName || '').trim().toLowerCase().replace(/-/g, '_');
  if (name === 'topics' || name === 'topic') return false;
  if (name === 'content_calendar') return true;
  return fallback !== false;
}

export function stripMarkdown(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // Xóa ** in đậm
    .replace(/\*(.*?)\*/g, '$1')     // Xóa * in nghiêng
    .replace(/_{2}(.*?)_{2}/g, '$1') // Xóa __
    .replace(/_(.*?)_/g, '$1')       // Xóa _
    .replace(/^#{1,6}\s*/gm, '')     // Xóa # tiêu đề
    .replace(/^>\s?/gm, '')          // Xóa > quote
    .replace(/^---+\s*$/gm, '')      // Xóa ---
    .replace(/`([^`]+)`/g, '$1')     // Xóa backtick
    .trim();
}

function shouldTryNextGeminiKey(status, errorBody) {
  if (status === 401 || status === 429) return true;
  if (status !== 403) return false;
  return /quota|resource_exhausted|rate limit|api key|permission denied/i.test(errorBody);
}

/**
 * 1. Gọi Google Gemini API để viết nội dung bài Facebook & sinh Prompt ảnh ChatGPT
 */
export async function generateContentWithGemini(topic = null, config = null) {
  const cfg = config || loadScheduleConfig();
  const apiKeys = [...new Set([
    cfg.geminiApiKey,
    ...(Array.isArray(cfg.geminiApiKeys) ? cfg.geminiApiKeys : []),
  ].map((key) => String(key || '').trim()).filter(Boolean))];
  if (apiKeys.length === 0) {
    throw new Error('Chưa cấu hình Gemini API Key. Vui lòng nhập key trong cài đặt Lịch Trình.');
  }

  const model = cfg.model || 'gemini-2.5-flash';
  const hasMascotDu = shouldIncludeDu(
    topic?.sheetName || cfg.googleSheets?.sheetName,
    cfg.hasMascotDu,
  );
  const company = cfg.companyInfo || {
    name: 'DUDI SOFTWARE TECHNOLOGY CO., LTD',
    hotline: '0909 163 821',
    address1: '232 Nguyễn Thị Minh Khai, Phường Xuân Hòa, TP.HCM',
    address2: '49/2 Đường 14, Phường Thủ Đức, TP.HCM',
    mst: '0318776997',
    website: 'https://dudisoftware.com',
    email: 'contact@dudisoftware.com',
    hashtags: '#website #seo #landingpage #marketing #dudisoftware',
  };

  let topicText = '';
  let extraTopicContext = '';
  if (topic && typeof topic === 'object') {
    topicText = topic.topic || '';
    if (topic.category) extraTopicContext += `\n- Phân loại ngành/chủ đề: ${topic.category}`;
    if (topic.keywords) extraTopicContext += `\n- Từ khóa SEO cần làm nổi bật trong bài: ${topic.keywords}`;
  } else if (typeof topic === 'string') {
    topicText = topic.trim();
  }

  const selectedTopic = topicText || (cfg.topics && cfg.topics.length > 0
    ? cfg.topics[Math.floor(Math.random() * cfg.topics.length)]
    : 'Tối ưu hóa hiệu quả kinh doanh và tự động hóa quy trình cho doanh nghiệp SME');

  const mascotInstructions = hasMascotDu
    ? `
Mascot Du Guidelines for imagePrompt:
- Must feature Du (DUDI Software technology bear mascot): glossy black visor with two cyan LED eyes, white chin, red helmet with round bear ears, blue circuit details, red robotic vinyl body, red tail with silver ring.
- Outfit: Sleek grey or red business suit with tie, high-tech corporate look.
- Style: Premium commercial advertising 3D vinyl render, glossy realistic materials, cinematic studio lighting, modern tech office / server background softly blurred.
- Composition: Mascot positioned on right side (40-50%), left side clean and uncluttered.
- Include instruction to use the uploaded Du reference image.
`
    : `
Photorealistic Guidelines for imagePrompt:
- Do not include Du, a bear mascot, or a mascot reference image.
- High-end professional commercial photography of modern Vietnamese business executives in tech workspace.
- Cinematic studio lighting, realistic reflections, modern software dashboards.
`;

  const systemPrompt = `
Bạn là Giám đốc Marketing & Chuyên gia Content cấp cao của ${company.name}.
Nhiệm vụ: Viết một bài đăng Facebook chuyên nghiệp, cuốn hút và sinh Prompt tạo ảnh cho ChatGPT (DALL-E 3) về chủ đề: "${selectedTopic}".${extraTopicContext}

QUY TẮC ĐỊNH DẠNG NỘI DUNG FACEBOOK (BẮT BUỘC):
- TUYỆT ĐỐI KHÔNG dùng cú pháp markdown như ** (dấu hoa thị hai bên để in đậm) hoặc * hoặc ### vì Facebook không hỗ trợ markdown và sẽ bị lộ dấu ** trên bài viết.
- Thay vào đó hãy dùng emoji sinh động, gạch đầu dòng rõ ràng, hoặc VIẾT HOA tiêu đề/từ khóa quan trọng để làm nổi bật (Ví dụ: "✨ HIỂU KHÁCH HÀNG SÂU SẮC HƠN: AI phân tích dữ liệu...").

YÊU CẦU ĐẦU RA BẮT BUỘC:
Chỉ trả về DUY NHẤT một chuỗi JSON hợp lệ với cấu trúc sau (không kèm markdown ngoài JSON):
{
  "title": "Tiêu đề ngắn gọn của bài viết (dưới 12 từ)",
  "caption": "Nội dung bài viết Facebook đầy đủ TUYỆT ĐỐI KHÔNG CÓ DẤU ** bao gồm:\\n- Icon mở đầu ấn tượng, nêu trực diện nỗi đau/nhu cầu của khách hàng\\n- Phân tích giải pháp/lợi ích cốt lõi (3 - 5 gạch đầu dòng ngắn gọn, sắc bén, có emoji)\\n- Lời kêu gọi hành động (CTA) rõ ràng\\n- Hotline & Zalo: ${company.hotline}\\n- Hashtags: ${company.hashtags}\\n\\n${company.name}\\n🏢 ${company.address1}\\n🏢 ${company.address2}\\n🧾 MST: ${company.mst}\\n📞 Hotline: ${company.hotline}\\n🌐 ${company.website}\\n📧 ${company.email}",
  "imagePrompt": "A single comprehensive English prompt for ChatGPT DALL-E 3. ${mascotInstructions.replace(/\n/g, ' ')}",
  "headline": "Tiêu đề tiếng Việt ngắn trên poster ảnh (dưới 9 từ)",
  "subheadline": "Phụ đề tiếng Việt hỗ trợ (dưới 14 từ)"
}
`;

  let data = null;
  let lastError = null;
  for (let index = 0; index < apiKeys.length; index++) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKeys[index]}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.7 },
        }),
      },
    );
    if (response.ok) {
      data = await response.json();
      if (index > 0) console.log(`[AutoPilot] Đã chuyển sang Gemini API key dự phòng #${index + 1}.`);
      break;
    }

    const errorBody = await response.text();
    lastError = `Gemini API Error (${response.status}): ${errorBody}`;
    if (shouldTryNextGeminiKey(response.status, errorBody) && index < apiKeys.length - 1) {
      console.warn(`[AutoPilot] Gemini API key #${index + 1} không khả dụng, đang thử key dự phòng.`);
      continue;
    }
    throw new Error(lastError);
  }
  if (!data) throw new Error(lastError || 'Gemini không trả về nội dung hợp lệ.');
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) throw new Error('Gemini không trả về nội dung hợp lệ.');

  const parsed = JSON.parse(rawText);
  const cleanedCaption = stripMarkdown(parsed.caption);
  const headlineText = parsed.headline || parsed.title || selectedTopic;
  const subheadlineText = parsed.subheadline || '';

  // Đính kèm trực tiếp Headline & Subheadline tiếng Việt vào imagePrompt để ChatGPT chắc chắn vẽ đúng nội dung chủ đề
  const promptWithText = [
    parsed.imagePrompt,
    `VIETNAMESE POSTER TEXT OVERLAY:`,
    `- PRIMARY HEADLINE (BOLD, LARGE, CLEAN SANS-SERIF): "${headlineText}"`,
    subheadlineText ? `- SUB-HEADLINE: "${subheadlineText}"` : '',
    `- CRITICAL REQUIREMENT: Render the exact Vietnamese headline "${headlineText}" prominently on the poster with correct Vietnamese diacritics. No typos.`
  ].filter(Boolean).join('\n');

  return {
    topic: selectedTopic,
    title: parsed.title,
    caption: cleanedCaption,
    imagePrompt: promptWithText,
    headline: headlineText,
    subheadline: subheadlineText,
  };
}

/**
 * 2. Gọi ChatGPT Web Bridge để tạo ảnh
 */
export async function generateImageWithChatGPT(imagePrompt, aspectRatio = '4:5', hasMascotDu = true, preferredAccount = null) {
  let ports = [3001, 3003]; // Thử port 3001 trước, nếu bận hoặc lỗi thử 3003
  if (preferredAccount === 'acc_2' || preferredAccount === '2' || preferredAccount === 3003 || preferredAccount === 9242) {
    ports = [3003, 3001];
  } else if (preferredAccount === 'acc_1' || preferredAccount === '1' || preferredAccount === 3001 || preferredAccount === 9222) {
    ports = [3001, 3003];
  }
  let lastError = null;

  for (const port of ports) {
    try {
      console.log(`[AutoPilot] Đang gửi yêu cầu tạo ảnh ChatGPT tới Bridge Port ${port}...`);
      const res = await fetch(`http://127.0.0.1:${port}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_chatgpt_image',
          prompt: hasMascotDu
            ? `${imagePrompt}\nInclude Du using the uploaded Du reference image.`
            : `${imagePrompt}\nDo not include Du or any bear mascot. Do not use a Du reference image.`,
          aspectRatio: aspectRatio || '4:5',
          referenceImageUrl: hasMascotDu
            ? 'https://res.cloudinary.com/dbwahdjzg/image/upload/v1789449519/nail_DU_hjqnmq.png'
            : null,
        }),
      });

      const data = await res.json();
      if (data && data.imageBase64) {
        return {
          imageBase64: data.imageBase64,
          mimeType: data.mimeType || 'image/png',
          fileName: data.fileName || 'chatgpt_image.png',
          account: data.account || `ChatGPT Port ${port}`,
        };
      }
      if (data && data.error) {
        lastError = new Error(data.error);
      }
    } catch (e) {
      lastError = e;
      console.warn(`[AutoPilot] Bridge Port ${port} không khả dụng:`, e.message);
    }
  }

  throw new Error(lastError ? lastError.message : 'Không thể kết nối đến cả 2 Server ChatGPT Bridge (3001, 3003)');
}

/**
 * 3. Đăng bài lên các kênh Facebook đã chọn (Tích hợp tài khoản từ QL Tài Khoản)
 */
export async function publishToFacebookChannels({ caption, imageBase64, channels = {}, accounts = {} }) {
  const cleanPostCaption = stripMarkdown(caption);
  const results = [];

  // 1. Facebook Fanpage (Port 3001)
  if (channels.fanpage) {
    try {
      console.log('[AutoPilot] Đang đăng bài lên Facebook Fanpage (Port 3001)...');
      let pageUrl = null;
      let targetProfileDir = null;

      if (fs.existsSync(FANPAGE_CONFIG_PATH)) {
        try {
          const fpConf = JSON.parse(fs.readFileSync(FANPAGE_CONFIG_PATH, 'utf-8'));
          let selected = null;
          if (accounts.fanpage) {
            selected = (fpConf.accounts || []).find((a) => String(a.id) === String(accounts.fanpage) || a.name === accounts.fanpage);
          }
          if (!selected) {
            selected = (fpConf.accounts || []).find((a) => a.enabled !== false);
          }
          if (selected) {
            pageUrl = selected.pageUrl || selected.url;
            targetProfileDir = selected.profileDir;
          }
        } catch {}
      }

      const res = await fetch('http://127.0.0.1:3001/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'publish_facebook_page',
          caption: cleanPostCaption,
          imageBase64,
          ...(pageUrl ? { pageUrl } : {}),
          ...(targetProfileDir ? { profileDir: targetProfileDir } : {}),
        }),
      });

      const data = await res.json();
      results.push({
        channel: 'fanpage',
        channelName: 'Facebook Fanpage',
        success: Boolean(data.ok),
        postUrl: data.postUrl || data.successList?.[0]?.postUrl || data.results?.[0]?.postUrl || null,
        publishedAt: data.publishedAt || data.successList?.[0]?.publishedAt || data.results?.[0]?.publishedAt || null,
        error: data.ok ? null : data.error || 'Lỗi đăng Fanpage',
      });
    } catch (err) {
      results.push({
        channel: 'fanpage',
        channelName: 'Facebook Fanpage',
        success: false,
        error: err.message,
      });
    }
  }

  // 2. Facebook Groups (Port 3002)
  if (channels.groups) {
    try {
      console.log('[AutoPilot] Đang đăng bài lên Facebook Groups (Port 3002)...');
      let targetAccounts = accounts.groups; // string[] or string or undefined
      const res = await fetch('http://127.0.0.1:3002/post-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption: cleanPostCaption,
          imageBase64,
          ...(targetAccounts ? { targetAccounts } : {}),
        }),
      });

      const data = await res.json();
      results.push({
        channel: 'groups',
        channelName: 'Facebook Groups',
        success: Boolean(data.ok),
        postUrl: data.postUrl || data.postUrls?.[0] || null,
        publishedAt: data.publishedAt || data.results?.[0]?.timestamp || null,
        error: data.ok ? null : data.error || 'Lỗi đăng Groups',
      });
    } catch (err) {
      results.push({
        channel: 'groups',
        channelName: 'Facebook Groups',
        success: false,
        error: err.message,
      });
    }
  }

  // 3. Facebook Cá Nhân (Port 3003)
  if (channels.personal) {
    try {
      console.log('[AutoPilot] Đang đăng bài lên Trang Cá Nhân (Port 3003)...');
      let profileUrl = null;
      let targetProfileDir = null;

      if (fs.existsSync(PERSONAL_CONFIG_PATH)) {
        try {
          const pConf = JSON.parse(fs.readFileSync(PERSONAL_CONFIG_PATH, 'utf-8'));
          let selected = null;
          if (accounts.personal) {
            selected = (pConf.accounts || []).find((a) => String(a.id) === String(accounts.personal) || a.name === accounts.personal);
          }
          if (!selected) {
            selected = (pConf.accounts || []).find((a) => a.enabled !== false);
          }
          if (selected) {
            profileUrl = selected.profileUrl || selected.url;
            targetProfileDir = selected.profileDir;
          }
        } catch {}
      }

      const res = await fetch('http://127.0.0.1:3003/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'publish_facebook_personal',
          caption: cleanPostCaption,
          imageBase64,
          ...(profileUrl ? { profileUrl, pageUrl: profileUrl } : {}),
          ...(targetProfileDir ? { profileDir: targetProfileDir } : {}),
        }),
      });

      const data = await res.json();
      results.push({
        channel: 'personal',
        channelName: 'Facebook Cá Nhân',
        success: Boolean(data.ok),
        postUrl: data.postUrl || null,
        publishedAt: data.publishedAt || null,
        error: data.ok ? null : data.error || 'Lỗi đăng Cá nhân',
      });
    } catch (err) {
      results.push({
        channel: 'personal',
        channelName: 'Facebook Cá Nhân',
        success: false,
        error: err.message,
      });
    }
  }

  return results;
}

/**
 * 4. Gửi thông báo Telegram khi hoàn tất hoặc gặp sự cố
 */
async function notifyTelegram(message, imageBase64 = null) {
  try {
    if (fs.existsSync(BOT_CONFIG_PATH)) {
      const bConf = JSON.parse(fs.readFileSync(BOT_CONFIG_PATH, 'utf-8'));
      if (bConf.botToken && bConf.chatId) {
        await fetch('http://127.0.0.1:3004/alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Auto-Pilot Báo Cáo Đăng Bài',
            details: message,
            imageBase64,
            channel: 'Auto-Pilot Scheduler',
          }),
        });
      }
    }
  } catch {}
}

let currentCycleProgress = {
  active: false,
  step: 0,
  stepName: 'Sẵn sàng',
  detail: 'Hệ thống đang sẵn sàng hoạt động',
  progress: 0,
  startTime: 0,
  lastResult: null,
};

export function getAutoPilotProgress() {
  return currentCycleProgress;
}

/**
 * 5. Chu trình chạy đầy đủ (Auto-Pilot Complete Cycle)
 * Hỗ trợ nhận options từ n8n-style Workflow runner: { topic, channels, accounts }
 */
export async function runAutoPilotCycle(optionsOrTopic = null) {
  const startTime = Date.now();
  const config = loadScheduleConfig();

  let customTopic = null;
  let customChannels = null;
  let customAccounts = null;

  if (typeof optionsOrTopic === 'string') {
    customTopic = optionsOrTopic;
  } else if (optionsOrTopic && typeof optionsOrTopic === 'object') {
    customTopic = optionsOrTopic.topic || null;https://127.0.0.1:49193/static/artifacts/9b39ac91-da53-45c2-adaa-c318c761ac31/.user_uploaded/media_1789452147918.png?csrf=a96ba88b-5c67-4966-9376-3826c056281e
    if (optionsOrTopic.channels) customChannels = optionsOrTopic.channels;
    if (optionsOrTopic.accounts) customAccounts = optionsOrTopic.accounts;
  }

  // Lấy sheetName được chỉ định trực tiếp từ payload (nếu có)
  const requestedSheetName = (optionsOrTopic && typeof optionsOrTopic === 'object')
    ? optionsOrTopic.sheetName
    : null;

  const effectiveChannels = customChannels || config.channels || { fanpage: true, groups: true, personal: false };
  const effectiveAccounts = customAccounts || {};

  console.log(`\n=================================================`);
  console.log(`[AutoPilot] BẮT ĐẦU CHU TRÌNH TỰ ĐỘNG KHÉP KÍN (n8n Engine)`);
  console.log(`Thời gian: ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`);
  console.log(`Kênh hoạt động: Fanpage: ${Boolean(effectiveChannels.fanpage)}, Groups: ${Boolean(effectiveChannels.groups)}, Cá nhân: ${Boolean(effectiveChannels.personal)}`);
  console.log(`=================================================`);

  let contentData = null;
  let imageData = null;
  let publishResults = [];

  try {
    currentCycleProgress = {
      active: true,
      step: 1,
      stepName: 'Đọc chủ đề',
      detail: 'Đang kiểm tra và lấy chủ đề từ Google Sheet...',
      progress: 15,
      startTime,
      lastResult: null,
    };

    // Xác định topic bài viết: Ưu tiên customTopic -> Google Sheet -> Danh sách nhập tay
    let activeTopic = customTopic;
    let googleSheetRowToUpdate = null;

    // Xác định tab Google Sheet cần lấy topic (hỗ trợ nhiều tab như 'topics', 'content_calendar')
    let targetSheetName = requestedSheetName || config.googleSheets?.sheetName || 'topics';
    if (!requestedSheetName && config.googleSheets?.channelSheetMapping) {
      if (effectiveChannels.fanpage && !effectiveChannels.groups && !effectiveChannels.personal && config.googleSheets.channelSheetMapping.fanpage) {
        targetSheetName = config.googleSheets.channelSheetMapping.fanpage;
      } else if (effectiveChannels.groups && !effectiveChannels.fanpage && !effectiveChannels.personal && config.googleSheets.channelSheetMapping.groups) {
        targetSheetName = config.googleSheets.channelSheetMapping.groups;
      } else if (effectiveChannels.personal && !effectiveChannels.fanpage && !effectiveChannels.groups && config.googleSheets.channelSheetMapping.personal) {
        targetSheetName = config.googleSheets.channelSheetMapping.personal;
      }
    }

    if (!activeTopic && config.googleSheets?.enabled && config.googleSheets?.topicSource === 'google_sheet') {
      try {
        console.log(`[AutoPilot] Đang tìm kiếm topic chưa đăng từ Google Sheet (${targetSheetName})...`);
        const sheetTopic = await getNextTopicFromSheet(config.googleSheets.spreadsheetId, targetSheetName);
        if (sheetTopic) {
          activeTopic = sheetTopic;
          googleSheetRowToUpdate = sheetTopic.rowIndex;
          console.log(`[AutoPilot] 🎯 Đã lấy topic từ Google Sheet [${targetSheetName}] (Dòng ${sheetTopic.rowIndex}, ID: ${sheetTopic.id}): "${sheetTopic.topic}"`);
          await updateSheetTopicStatus({
            spreadsheetId: config.googleSheets.spreadsheetId,
            sheetName: targetSheetName,
            rowIndex: sheetTopic.rowIndex,
            status: 'in_progress',
          });
        } else {
          console.warn(`[AutoPilot] Tất cả topic trong Google Sheet [${targetSheetName}] đều đã được đăng! Dùng kho topic dự phòng.`);
        }
      } catch (sheetErr) {
        console.error(`[AutoPilot Google Sheet Error: ${targetSheetName}]`, sheetErr.message);
      }
    }

    const hasMascotDu = shouldIncludeDu(targetSheetName, config.hasMascotDu);
    const contentConfig = {
      ...config,
      hasMascotDu,
      googleSheets: { ...config.googleSheets, sheetName: targetSheetName },
    };

    // Bước 1: Gemini viết bài
    currentCycleProgress = {
      ...currentCycleProgress,
      step: 2,
      stepName: 'Gemini AI viết bài',
      detail: `Gemini đang sáng tạo nội dung bài viết chuẩn SEO & prompt ảnh cho chủ đề: "${typeof activeTopic === 'object' ? activeTopic.topic : activeTopic || 'Mặc định'}"...`,
      progress: 35,
    };
    console.log(`[AutoPilot 1/3] Đang gọi Gemini AI viết bài & sinh prompt ảnh...`);
    contentData = await generateContentWithGemini(activeTopic, contentConfig);
    console.log(`[AutoPilot] Đã viết xong: "${contentData.title}"`);

    // Bước 2: ChatGPT tạo ảnh
    currentCycleProgress = {
      ...currentCycleProgress,
      step: 3,
      stepName: 'ChatGPT tạo ảnh poster',
      detail: 'ChatGPT Web Robot đang sinh poster hình ảnh thực tế chất lượng cao...',
      progress: 60,
    };
    console.log(`[AutoPilot 2/3] Đang gửi Prompt sang ChatGPT Web Bridge...`);
    const preferredGptAcc = effectiveAccounts.chatgpt;
    imageData = await generateImageWithChatGPT(contentData.imagePrompt, config.aspectRatio, hasMascotDu, preferredGptAcc);
    console.log(`[AutoPilot] Tạo ảnh thành công (${imageData.account})!`);

    // Bước 3: Xuất bản lên các kênh Facebook đã cấu hình
    currentCycleProgress = {
      ...currentCycleProgress,
      step: 4,
      stepName: 'Xuất bản Facebook',
      detail: 'Đang xuất bản bài viết và ảnh lên Fanpage, Groups và Trang cá nhân...',
      progress: 85,
    };
    console.log(`[AutoPilot 3/3] Đang xuất bản bài viết lên các kênh đã chọn...`);
    publishResults = await publishToFacebookChannels({
      caption: contentData.caption,
      imageBase64: imageData.imageBase64,
      channels: effectiveChannels,
      accounts: effectiveAccounts,
    });

    const isAllSuccess = publishResults.length === 0 || publishResults.every((r) => r.success);
    const isAnySuccess = publishResults.some((r) => r.success);
    const durationSec = Math.round((Date.now() - startTime) / 1000);

    // Lấy link bài viết từ kết quả xuất bản (ưu tiên Fanpage -> Cá nhân -> Groups)
    const fanResult = publishResults.find((r) => r.channel === 'fanpage' && r.success && r.postUrl);
    const perResult = publishResults.find((r) => r.channel === 'personal' && r.success && r.postUrl);
    const grpResult = publishResults.find((r) => r.channel === 'groups' && r.success && r.postUrl);
    const primaryPublishResult = fanResult || perResult || grpResult || publishResults.find((r) => r.success);
    const finalPostUrl = primaryPublishResult?.postUrl || null;
    const publishedDate = primaryPublishResult?.publishedAt ? new Date(primaryPublishResult.publishedAt) : null;
    const publishedAtVn = publishedDate && !Number.isNaN(publishedDate.getTime())
      ? getVietnamDateTimeString(publishedDate)
      : getVietnamDateTimeString();

    // Cập nhật Google Sheet nếu có ít nhất 1 kênh thành công
    currentCycleProgress = {
      ...currentCycleProgress,
      step: 5,
      stepName: 'Cập nhật Google Sheet',
      detail: 'Đang lưu link bài viết, thời gian đăng vào Google Sheet và gửi báo cáo Telegram...',
      progress: 95,
    };

    if (googleSheetRowToUpdate && config.googleSheets?.autoUpdateStatus !== false) {
      try {
        await updateSheetTopicStatus({
          spreadsheetId: config.googleSheets.spreadsheetId,
          sheetName: targetSheetName,
          rowIndex: googleSheetRowToUpdate,
          status: isAnySuccess ? 'done' : 'pending',
          publishedAt: isAnySuccess ? publishedAtVn : null,
          postUrl: isAnySuccess ? finalPostUrl : null,
        });
        console.log(`[AutoPilot] ✅ Đã cập nhật [${targetSheetName}] dòng ${googleSheetRowToUpdate} trong Google Sheet (status: ${isAnySuccess ? 'done' : 'pending'}${isAnySuccess ? `, published_at: ${publishedAtVn}, post_link: ${finalPostUrl || 'N/A'}` : ''})!`);
      } catch (upErr) {
        console.error('[AutoPilot] Lỗi cập nhật Google Sheet sau khi đăng:', upErr.message);
      }
    }

    // Cập nhật trạng thái cấu hình
    config.lastRunAt = new Date().toISOString();
    config.lastTopic = contentData.topic;
    config.lastRunStatus = isAllSuccess ? 'success' : 'partial_success';
    saveScheduleConfig(config);

    // Gửi thông báo Telegram
    const channelsSummary = publishResults.map((r) => `• ${r.channelName}: ${r.success ? '✅ Thành công' : `❌ Lỗi (${r.error})`}`).join('\n');
    const postLinkMsg = finalPostUrl ? `\n🔗 <b>Link bài viết:</b> ${finalPostUrl}` : '';
    const telegramMsg = `🎉 <b>AUTO-PILOT ĐÃ HOÀN TẤT ĐĂNG BÀI!</b>\n\n📌 <b>Chủ đề:</b> ${contentData.title}\n⏱️ <b>Thời gian xử lý:</b> ${durationSec}s${postLinkMsg}\n\n<b>Kết quả kênh:</b>\n${channelsSummary}`;
    await notifyTelegram(telegramMsg, imageData.imageBase64);

    currentCycleProgress = {
      active: false,
      step: 6,
      stepName: 'Hoàn tất xuất sắc',
      detail: 'Toàn bộ quy trình từ viết bài đến đăng và lưu Google Sheet đã thành công!',
      progress: 100,
      lastResult: {
        title: contentData.title,
        postUrl: finalPostUrl,
        durationSec,
        publishResults,
      },
    };

    return {
      success: true,
      title: contentData.title,
      topic: contentData.topic,
      caption: contentData.caption,
      imagePrompt: contentData.imagePrompt,
      imageBase64: imageData.imageBase64,
      publishResults,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    const durationSec = Math.round((Date.now() - startTime) / 1000);
    console.error('[AutoPilot Error]', error.message);
    currentCycleProgress = {
      active: false,
      step: -1,
      stepName: 'Gặp sự cố',
      detail: error.message,
      progress: 0,
      lastResult: null,
    };

    config.lastRunAt = new Date().toISOString();
    config.lastRunStatus = 'failed';
    saveScheduleConfig(config);

    await notifyTelegram(`⚠️ <b>LỖI TIẾN TRÌNH AUTO-PILOT!</b>\n\n❌ <b>Lỗi:</b> <code>${error.message}</code>\n⏱️ <b>Thời gian chạy:</b> ${durationSec}s`);

    throw error;
  }
}

/**
 * 6. Thực thi một Node riêng biệt (Single Node Step Test giống n8n)
 */
export async function executeSingleNode(nodeType, payload = {}, config = null) {
  const cfg = config || loadScheduleConfig();
  const startTime = Date.now();

  switch (nodeType) {
    case 'sheets': {
      if (!cfg.googleSheets?.spreadsheetId) throw new Error('Chưa cấu hình Spreadsheet ID trong Google Sheets');
      const topic = await getNextTopicFromSheet(cfg.googleSheets.spreadsheetId, cfg.googleSheets.sheetName || 'topics');
      return {
        ok: true,
        node: 'sheets',
        durationMs: Date.now() - startTime,
        data: topic || { message: 'Không còn topic pending nào trong Sheet' },
      };
    }

    case 'gemini': {
      const topic = payload.topic || (cfg.topics && cfg.topics.length > 0 ? cfg.topics[0] : 'Tối ưu hóa kinh doanh thông minh với AI');
      const content = await generateContentWithGemini(topic, cfg);
      return {
        ok: true,
        node: 'gemini',
        durationMs: Date.now() - startTime,
        data: content,
      };
    }

    case 'chatgpt': {
      const prompt = payload.prompt || 'Mascot Du 3D vinyl bear in high-tech corporate office, cinematic studio lighting';
      const ratio = payload.aspectRatio || cfg.aspectRatio || '4:5';
      const mascot = shouldIncludeDu(
        payload.sheetName || cfg.googleSheets?.sheetName,
        payload.hasMascotDu !== undefined ? payload.hasMascotDu : cfg.hasMascotDu,
      );
      const preferredAccount = payload.chatgptAccount;
      const image = await generateImageWithChatGPT(prompt, ratio, mascot, preferredAccount);
      return {
        ok: true,
        node: 'chatgpt',
        durationMs: Date.now() - startTime,
        data: image,
      };
    }

    case 'groups': {
      const { caption, imageBase64, targetAccounts } = payload;
      if (!caption) throw new Error('Thiếu nội dung caption bài đăng');
      const res = await fetch('http://127.0.0.1:3002/post-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption,
          imageBase64,
          ...(targetAccounts ? { targetAccounts } : {}),
        }),
      });
      const data = await res.json();
      return {
        ok: Boolean(data.ok || !data.error),
        node: 'groups',
        durationMs: Date.now() - startTime,
        data,
      };
    }

    case 'fanpage': {
      const { caption, imageBase64, pageUrl, profileDir } = payload;
      if (!caption) throw new Error('Thiếu nội dung caption bài đăng');
      const res = await fetch('http://127.0.0.1:3001/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'publish_facebook_page',
          caption,
          imageBase64,
          ...(pageUrl ? { pageUrl } : {}),
          ...(profileDir ? { profileDir } : {}),
        }),
      });
      const data = await res.json();
      return {
        ok: Boolean(data.ok),
        node: 'fanpage',
        durationMs: Date.now() - startTime,
        data,
      };
    }

    case 'personal': {
      const { caption, imageBase64, profileUrl, profileDir } = payload;
      if (!caption) throw new Error('Thiếu nội dung caption bài đăng');
      const res = await fetch('http://127.0.0.1:3003/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'publish_facebook_personal',
          caption,
          imageBase64,
          ...(profileUrl ? { profileUrl, pageUrl: profileUrl } : {}),
          ...(profileDir ? { profileDir } : {}),
        }),
      });
      const data = await res.json();
      return {
        ok: Boolean(data.ok),
        node: 'personal',
        durationMs: Date.now() - startTime,
        data,
      };
    }

    case 'update_sheet': {
      const { rowIndex, status = 'done', publishedAt, postUrl } = payload;
      if (cfg.googleSheets?.spreadsheetId && rowIndex) {
        await updateSheetTopicStatus({
          spreadsheetId: cfg.googleSheets.spreadsheetId,
          sheetName: cfg.googleSheets.sheetName || 'topics',
          rowIndex,
          status,
          publishedAt: publishedAt || getVietnamDateTimeString(),
          postUrl: postUrl || null,
        });
      }
      return {
        ok: true,
        node: 'update_sheet',
        durationMs: Date.now() - startTime,
        message: 'Đã cập nhật trạng thái dòng Sheet thành công',
      };
    }

    default:
      throw new Error(`Loại node không hợp lệ: ${nodeType}`);
  }
}
