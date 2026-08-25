import { NextResponse } from 'next/server';
import { isPortOpen } from '@/lib/server-utils';

export async function GET() {
  try {
    const [srv3001, srv3002, srv3003, gpt1, gpt2] = await Promise.all([
      isPortOpen(3001),
      isPortOpen(3002),
      isPortOpen(3003),
      isPortOpen(9222),
      isPortOpen(9242),
    ]);

    return NextResponse.json({
      ok: true,
      servers: {
        fanpageGpt: { port: 3001, name: 'Fanpage & ChatGPT', active: srv3001 },
        fbGroups: { port: 3002, name: 'Facebook Groups', active: srv3002 },
        fbPersonal: { port: 3003, name: 'Trang Cá Nhân & GPT', active: srv3003 },
      },
      chromeGpt: {
        acc1: { port: 9222, active: gpt1 },
        acc2: { port: 9242, active: gpt2 },
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
