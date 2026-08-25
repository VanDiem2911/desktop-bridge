import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import next from 'next';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dashDir = path.join(__dirname, 'dashboard');

const host = '127.0.0.1';
const port = 3000;

const nextApp = next({ dev: false, dir: dashDir });
const handle = nextApp.getRequestHandler();

console.log('Đang khởi tạo Next.js Production Engine...');
await nextApp.prepare();

const app = express();

app.all('*', (req, res) => {
  return handle(req, res);
});

app.listen(port, host, () => {
  console.log('====================================================');
  console.log(`🚀 Next.js Control Center Dashboard: http://${host}:${port}`);
  console.log('====================================================');
});
