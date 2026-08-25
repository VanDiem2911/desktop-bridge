import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nextBin = path.join(__dirname, 'node_modules', 'next', 'dist', 'bin', 'next');
const logFile = path.join(__dirname, 'dashboard.log');
const out = fs.openSync(logFile, 'a');

const child = spawn(process.execPath, [nextBin, 'start', '-H', '127.0.0.1', '-p', '3000'], {
  cwd: __dirname,
  stdio: ['ignore', out, out],
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
