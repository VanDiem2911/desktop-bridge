import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';

// Danh sách 50 ảnh mascot DUDI từ Google Drive: https://drive.google.com/drive/folders/16KN6FZqNbVOEd1MhjTFv_n1-n28Qq7vY
export const GOOGLE_DRIVE_DU_IDS = [
  '1xPJ88Cz8f0EyBtvYUveUBVlsv_qCfnR1', // 0aeb64d0-1897-4533-9b1e-102087f17536.png
  '1TlscbOhGchHZ5mJiAIs9Y2Nd6cO3O5uo', // 0bcd0255-6636-4d9c-b815-2c28c7cfc7d9.png
  '1QA5DY2tPZRgsraLN3dQabK7AJjNh3gxN', // 0bfb4506-9033-4ddc-85d5-d3cd2359ad20.png
  '1ijFISLLHpGMhEYzGLIVuzzawn-v5BAil', // 0d63820e-f2f8-4791-aa12-2cf020c23fd9.png
  '1mKyG1zzZeHZFhsaA8oSsA5xfUDmH-bGG', // 0e52d437-edcc-4145-be21-0d2a6df99343.png
  '1bQ7oQpOoQdEs9Iq0ky36sm7S2o9xI9Hf', // 1c1d79e1-f5f5-44b9-bb9e-85bfeb1b8cf6.png
  '1cbLE0t5y8vUtwrwJ599Q_4r_ZjDR6_6v', // 1d358e13-a683-4f5c-a7bb-4a748b92dcea.png
  '1veukSxqJrJJmy-65utFzJRukKAZ1IDHQ', // 1d02694f-903f-4b6f-b55d-0c8d649431a3.png
  '1VqkMkxcBIkUA6iXX_0473tTbR_8trNVC', // 1dad3c99-1f59-4a30-93f2-da7c3a5d548c.png
  '1FJOMpMUqEE8XuMeP7hUNwuZsjsH6OrYO', // 1ebebef0-ade7-4189-bacb-67617c9f8f9f.png
  '1kHLcjG2EKr6Fb8TVs66YfEiO8ePtVQrG', // 2a377615-6861-4718-9af4-62581f16c7b1.png
  '1BIg_hrE3MuF1edgfjYSmo41Q8hyiSSWC', // 2b176300-6ecc-4717-b216-59a4dc7be711.png
  '1_rh4qn4J2cZOG0wBe5SChZHIXpzXrHrf', // 3accbc64-6032-4ce2-af85-af99ca24d009.png
  '1Gy6VoKFlniwrVIB38ExCxJumizK4-hmA', // 4b3fbc51-28b5-4a98-acaf-6dd7e49d65a4.png
  '1QwCOpZpbrYmuiAneymO7rx59Ud-zDPWu', // 4d81c4e4-9c85-479e-98d9-8c21b596d09e.png
  '169J8fFIprkINTSJKxxk7HnwDcLPGseV-', // 4e0bfa65-db39-4ec4-b741-cccae95b5264.png
  '1ESKUBSw6R_EcdCT3Z9sGa_pHtBRNvDBS', // 4f1a027e-c1df-462c-993a-9a1a15a82d12.png
  '14c3lpnad40nBp0CS5dvmQjezjXnLlCyM', // 4fde10b8-6ec6-4be4-b313-d2afee96a246.png
  '1RgBx4mEdUSHbbvYDkgLLeT37b9bmw43l', // 5b3c0f1d-6d85-4a53-8ad6-2986a208f393.png
  '1aWxxCwRms3Wd2Cz0ziarq3wulYr8bm_W', // 5bbdaa22-ae4b-48b9-bf15-e59f51dd7490.png
  '12r7KVo7pWJqM6Z9rIY0ouJQSEzoWDH4q', // 5e2786cc-49b1-49bd-98c6-98f0ae3142f0.png
  '1i_vy-vnN9dV8UZeXizntEgQuCffHJzDT', // 5f6a4691-923c-4269-a0d4-fb5810f858ca.png
  '1o_pFUEVi9xkVAkxQ-4K2uXQ-QNK1njw7', // 6b5df704-6411-4068-85ec-9d94219cf019.png
  '1UPREMADYVi9NZyAhm1U2kTEoQTl2023b', // 6b586058-98e5-43e4-8631-e7ae89e17a7f.png
  '1_M9O3ueDvP_uWkPY1rrqrJTBumCypRs1', // 6c9c9ecb-717a-4dc7-a22c-4f05462dc098.png
  '1bRqQrd9Gsqvhn47u3YLsUOygpVe91noO', // 6ed3abc0-fcba-4bd0-855b-c0941d5db8c1.png
  '11ZImbyme0ICrHZuvnOgSwE5OMMKSkPPy', // 6fc6f2c5-2348-4593-89d9-ad8364308afc.png
  '1RYAkapekIZk-qaLXJJcbYFHurHpdLACz', // 7f6208df-39ae-4979-8bc4-13ad2be775dd.png
  '14qlX6yH-av6G7hwRRcMYg9jR1Z8WUG9t', // 08b7b700-a54b-47ea-b4ee-bbe4fb6b8415.png
  '1M0mtCll2CKgeW5fvvqjiPTh_ikT1JMMr', // 8f0e31c4-aad9-4b79-9536-22f861ab6ecc.png
  '1ZkHIAK4m6623Y1eyBz797If4xSliINA8', // 33a2e236-2640-431d-997a-e44f4beee44e.png
  '1rxtz4IjGwJdM2kohgsh-1xQKjkrhknMN', // 33e327c8-99ef-4b9a-bb77-3ca35203fb11.png
  '1fhV_NN6dwBp_QYoFvaqbW0Fq_e1pg5sv', // 44d19776-3c22-4d39-882b-356622d7805a.png
  '1AnEfFAmH0qdq9TTaE5uOsNANXFcZgJq1', // 54d79b31-20d3-419a-b643-be76efd9e91c.png
  '1rI29GBS3NRcONeg6IcHzVDnd8rc73fkt', // 61c1cdbc-7d49-494c-acbd-829e8073c2e4.png
  '1wjdIRcr6LwMSFSQdAg_vFi_d9L8Y_EIp', // 63dc4509-ad43-4c5e-b3fc-ae0517fa7190.png
  '1SL-MP-mcLxhrXimxFwV1s4JSm_i1dm8f', // 078a3f85-6fa9-44e9-ab48-0497192bea1d (1).png
  '1j3l5dPnWeYcBrWKisEYz81OBeKrBGb7L', // 078a3f85-6fa9-44e9-ab48-0497192bea1d.png
  '1hzUsTUQ_zsEdxsB58qWNDnTgcrDPf14J', // 92b2e901-115b-4616-8e50-ff3f621573c4.png
  '1ii3na3mrR64SNrC9vFCsW9CMDFjNPghd', // 95f667ad-61f5-4120-99a1-54f420c4c710.png
  '1nuDOtseoG2rb9sf_ZU5IPkusNaav_1Mf', // 96ec10c8-96ab-4640-b211-3c85cfef3326.png
  '1nY5rS9KapH2boJNRjozlg5PbjE4BWa7J', // 97e73b67-3e00-4d27-af42-764a2baec473.png
  '1135UkH056BvyRw9yxpdFcebvxZXQlpVF', // 0128a3ce-aa02-4885-9197-639ce08991ed.png
  '1MExDx0Uw3iKpG5-6Yt1QFkfvC31gR5z0', // 133db003-13ed-4af3-8fa9-5c08b5ecb7c6.png
  '1IfGPpC-DAMS4bpSHu54lIV4p2HxwZ8_W', // 223eee1c-2d82-4c9b-9e57-a7cbab882298.png
  '1VbZ34Te-9B1SiADOX_WtvQeec_MtNL7f', // 352e97fd-f21e-4114-bd9e-6325d4e6ebc2.png
  '1mZaVAmo3z6bR3ZKXoZjoAfFU6nI0o9d0', // 0419f47a-11d2-4d59-859c-3fd955ac1cb1.png
  '1-ITk4ePUEQbtBMq-fX4FiqIgydQeoiWu', // 429b8b6d-11de-4f2d-b1f5-6c77410a5c8c.png
  '11xilaoIPz6qbnJaNFS3TmVmCs5x6Yo2X', // 545c249e-4dd2-47a8-9b38-78e4f0e20e15.png
  '1I8swqVsnbRgOOV_wJ1QG-VGnG3UjUNsS', // 600d778a-0586-4282-aaa6-9b8b6d56aaee.png
];

let currentDriveDuIndex = Math.floor(Math.random() * GOOGLE_DRIVE_DU_IDS.length);

export function getNextDriveReferenceUrl() {
  const fileId = GOOGLE_DRIVE_DU_IDS[currentDriveDuIndex % GOOGLE_DRIVE_DU_IDS.length];
  currentDriveDuIndex = (currentDriveDuIndex + 1) % GOOGLE_DRIVE_DU_IDS.length;
  return `https://lh3.googleusercontent.com/d/${fileId}`;
}

export function resolveReferenceImageUrl(rawUrl) {
  if (rawUrl === null || rawUrl === false) return null;
  // Tự động xoay vòng lấy ảnh mẫu ngẫu nhiên/tuần tự từ Google Drive (50 ảnh mẫu có sẵn bối cảnh và mascot DU)
  const picked = getNextDriveReferenceUrl();
  console.log(`[Drive Reference] 🎯 Sử dụng ảnh mẫu từ Google Drive (#${currentDriveDuIndex}/${GOOGLE_DRIVE_DU_IDS.length}): ${picked}`);
  return picked;
}

export function extractCardTextFromPrompt(prompt) {
  if (!prompt || typeof prompt !== 'string') return { headline: 'Giải Pháp Công Nghệ Tối Ưu', subheadline: '' };

  let headline = '';
  let subheadline = '';

  const headlinePatterns = [
    /(?:PRIMARY\s+HEADLINE|TIÊU\s+ĐỀ\s+CHÍNH|TIÊU\s+ĐỀ|HEADLINE|PRIMARY\s+VIETNAMESE\s+HEADLINE)[^:\n]*:\s*["“]?([^"”\n\r]+)["”]?/i,
    /(?:headline|tiêu\s+đề)\s*["“]([^"”\n\r]+)["”]/i,
  ];
  for (const p of headlinePatterns) {
    const m = prompt.match(p);
    if (m && m[1].trim()) {
      headline = m[1].trim();
      break;
    }
  }

  const subheadlinePatterns = [
    /(?:SUB-HEADLINE|SUBHEADLINE|PHỤ\s+ĐỀ|NỘI\s+DUNG|SUPPORTING\s+SENTENCE|SECONDARY\s+VIETNAMESE|SUB-TITLE)[^:\n]*:\s*["“]?([^"”\n\r]+)["”]?/i,
    /(?:supporting|phụ\s+đề|sub-headline)\s*["“]([^"”\n\r]+)["”]/i,
  ];
  for (const p of subheadlinePatterns) {
    const m = prompt.match(p);
    if (m && m[1].trim()) {
      subheadline = m[1].trim();
      break;
    }
  }

  if (!headline) {
    const quotes = [...prompt.matchAll(/["“]([^"”\r\n]{4,80})["”]/g)].map(m => m[1].trim());
    if (quotes.length > 0) {
      headline = quotes[0];
      if (quotes.length > 1) {
        subheadline = quotes[1];
      }
    }
  }

  if (!headline) {
    const cleanLines = prompt
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('Create') && !l.startsWith('Using') && !l.startsWith('⚠️') && !l.startsWith('Generate') && !l.startsWith('Preferred') && !l.startsWith('Do not'));
    headline = cleanLines[0] || 'Giải Pháp Công Nghệ Tối Ưu';
    if (cleanLines.length > 1) subheadline = cleanLines[1];
  }

  headline = headline.replace(/^["'\s]+|["'\s]+$/g, '').slice(0, 80);
  subheadline = subheadline.replace(/^["'\s]+|["'\s]+$/g, '').slice(0, 120);

  return { headline, subheadline };
}

export function fetchImageBuffer(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to fetch image: HTTP ${response.statusCode}`));
        return;
      }
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve({ buffer: Buffer.concat(chunks), mimeType: response.headers['content-type'] || 'image/png' }));
      response.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Đính kèm ảnh tham chiếu vào ChatGPT bằng cách upload file qua nút đính kèm hoặc input file.
 * Trả về true nếu upload thành công và đã xuất hiện preview trên giao diện.
 */
export async function attachReferenceImage(page, referenceImageUrl) {
  let tempFilePath = null;
  try {
    console.log('Đang tải ảnh tham chiếu từ URL:', referenceImageUrl);
    const { buffer, mimeType } = await fetchImageBuffer(referenceImageUrl);
    const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
    const fileName = `du-reference-${Date.now()}.${ext}`;
    tempFilePath = path.join(os.tmpdir(), fileName);
    await fs.promises.writeFile(tempFilePath, buffer);
    console.log(`Đã lưu ảnh tạm thời tại: ${tempFilePath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);

    const plusSelectors = [
      '#composer-plus-btn',
      'button[data-testid="composer-plus-btn"]',
      'button[aria-label*="Add content" i]',
      'button[aria-label*="Thêm nội dung" i]',
      'button[aria-label*="Attach" i]',
      'button[aria-label*="Đính kèm" i]',
      'button[aria-label*="Upload" i]',
      'button[aria-label*="Tải tệp" i]',
      'button[aria-label*="Tải lên" i]',
      '[data-testid="composer-footer-attachment-button"]',
    ];

    const attachmentPreviewSelectors = [
      'button[aria-label*="Remove" i]',
      'button[aria-label*="Xóa" i]',
      'button[aria-label*="Delete" i]',
      'button[aria-label*="Hủy" i]',
      '[data-testid*="attachment"]',
      '[data-testid*="file"]',
      'div[class*="attachment"]',
      'div[class*="thumbnail"]',
      'form img[alt*="reference" i]',
      'form img[src*="blob:"]',
      'form img',
    ];

    async function checkIsAttached() {
      for (const sel of attachmentPreviewSelectors) {
        const loc = page.locator(sel).first();
        if ((await loc.count()) > 0) {
          try {
            if (await loc.isVisible()) return true;
          } catch {}
        }
      }
      return false;
    }

    // Cách 1: Nạp file trực tiếp vào input file của composer nếu có
    const composerFileInput = page.locator('form input[type="file"], input[type="file"][multiple], input[type="file"]').first();
    if ((await composerFileInput.count()) > 0) {
      try {
        await composerFileInput.setInputFiles(tempFilePath);
        console.log('Đã nạp file vào input file. Đang chờ ChatGPT tải ảnh lên...');
        const startWait = Date.now();
        while (Date.now() - startWait < 8000) {
          if (await checkIsAttached()) {
            console.log('✅ Đã đính kèm ảnh con DU thành công (xác nhận qua preview)!');
            await delay(1500);
            return true;
          }
          await delay(600);
        }
        const hasFiles = await composerFileInput.evaluate((el) => el.files && el.files.length > 0).catch(() => false);
        if (hasFiles) {
          console.log('✅ Input file đã nhận file ảnh thành công!');
          await delay(1500);
          return true;
        }
      } catch (err) {
        console.warn('Thử setInputFiles trực tiếp chưa được:', err.message);
      }
    }

    // Cách 2: Bấm nút (+) đính kèm và đón sự kiện filechooser
    for (const btnSel of plusSelectors) {
      const btn = page.locator(btnSel).first();
      if ((await btn.count()) > 0 && (await btn.isVisible())) {
        console.log(`Tìm thấy nút đính kèm (${btnSel}), đang mở để tải ảnh...`);
        const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 3500 }).catch(() => null);
        await btn.click();
        await delay(800);

        let fileChooser = await fileChooserPromise;
        if (fileChooser) {
          console.log('Bắt được filechooser từ nút đính kèm, đang nạp ảnh...');
          await fileChooser.setFiles(tempFilePath);
        } else {
          const menuItems = [
            'button[role="menuitem"]:has-text("Upload")',
            'button[role="menuitem"]:has-text("Tải lên")',
            'div[role="menuitem"]:has-text("Upload")',
            'div[role="menuitem"]:has-text("Tải lên")',
            '[role="menuitem"]',
          ];

          for (const itemSel of menuItems) {
            const item = page.locator(itemSel).first();
            if ((await item.count()) > 0 && (await item.isVisible())) {
              const menuChooserPromise = page.waitForEvent('filechooser', { timeout: 3500 }).catch(() => null);
              await item.click();
              fileChooser = await menuChooserPromise;
              if (fileChooser) {
                console.log('Bắt được filechooser từ menu, đang nạp ảnh...');
                await fileChooser.setFiles(tempFilePath);
                break;
              }
            }
          }
        }

        if (!fileChooser) {
          const freshFileInput = page.locator('input[type="file"]').last();
          if ((await freshFileInput.count()) > 0) {
            await freshFileInput.setInputFiles(tempFilePath);
            console.log('Đã nạp file vào input xuất hiện sau khi mở menu.');
          }
        }

        const waitUploadStart = Date.now();
        while (Date.now() - waitUploadStart < 12000) {
          if (await checkIsAttached()) {
            console.log('✅ Đã đính kèm ảnh con DU thành công (xác nhận qua preview)!');
            await delay(2000);
            return true;
          }
          await delay(1000);
        }
        break;
      }
    }

    if (await checkIsAttached()) {
      console.log('✅ Đã đính kèm ảnh tham chiếu thành công!');
      return true;
    }

    console.warn('⚠️ Không thể xác nhận ảnh tham chiếu con DU đã được đính kèm vào ChatGPT.');
    return false;
  } catch (error) {
    console.error('Lỗi khi đính kèm ảnh tham chiếu:', error.message);
    return false;
  } finally {
    if (tempFilePath) {
      setTimeout(() => {
        fs.promises.unlink(tempFilePath).catch(() => {});
      }, 30000);
    }
  }
}
