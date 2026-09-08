import { NextResponse } from 'next/server';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { BRIDGE_DIR } from '@/lib/server-utils';

export async function POST() {
  try {
    const psScript = path.join(BRIDGE_DIR, 'kill-and-restart.ps1');
    spawn('powershell.exe', ['-ExecutionPolicy', 'Bypass', '-File', psScript], {
      detached: true,
      stdio: 'ignore',
      cwd: BRIDGE_DIR,
    }).unref();

    return NextResponse.json({ ok: true, message: 'Đang khởi động lại toàn bộ hệ thống (Dashboard 3000 + 3 Server Bridge)...' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
