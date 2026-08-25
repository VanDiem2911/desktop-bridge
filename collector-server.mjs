import http from 'node:http';
import { exec } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3005;

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/save-groups') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const groups = JSON.parse(body);
        const jsonPath = path.join(__dirname, 'groups_extracted.json');
        const docxPath = path.resolve(__dirname, '..', 'Danh_sach_151_nhom_Facebook.docx');
        
        fs.writeFileSync(jsonPath, JSON.stringify(groups, null, 2), 'utf-8');
        console.log(`[Collector] Nhận được ${groups.length} nhóm. Đang tạo file Word (.docx)...`);

        const pythonScript = path.join(__dirname, 'generate_docx.py');
        exec(`python "${pythonScript}" "${jsonPath}" "${docxPath}"`, (err, stdout, stderr) => {
          if (err) {
            console.error('[Error] Lỗi khi tạo file docx:', err.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
            return;
          }
          console.log(`[Collector] Đã tạo thành công: ${docxPath}`);
          
          // Mở thư mục chứa file docx cho người dùng
          exec(`explorer.exe /select,"${docxPath}"`);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            ok: true,
            total: groups.length,
            docxPath: docxPath,
          }));
        });
      } catch (err) {
        console.error('[Error] Lỗi parse JSON:', err.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[Collector Server] Đang lắng nghe tại http://127.0.0.1:${PORT}`);
});
