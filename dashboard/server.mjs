import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import next from 'next';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const host = '127.0.0.1';
const port = 3000;

process.on('uncaughtException', (err) => {
  console.error('[Dashboard Express UncaughtException]', err);
});

process.on('beforeExit', (code) => {
  console.log('[Dashboard Server beforeExit]', code);
});

process.on('exit', (code) => {
  console.log('[Dashboard Server exit]', code);
});

console.log('Đang khởi tạo Next.js Production Engine...');
const nextApp = next({ dev: false, dir: __dirname });
const handle = nextApp.getRequestHandler();

await nextApp.prepare();

const app = express();

app.use((req, res) => {
  return handle(req, res);
});

app.listen(port, host, () => {
  console.log('====================================================');
  console.log(`🚀 Next.js Control Center Dashboard: http://${host}:${port}`);
  console.log('====================================================');
});
