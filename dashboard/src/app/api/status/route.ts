import { NextResponse } from 'next/server';
import { isPortOpen, getServerPorts, CHATGPT_CONFIG_PATH, readJsonFile } from '@/lib/server-utils';

export async function GET() {
  try {
    const ports = getServerPorts();
    const chatgptConfig = readJsonFile<{ accounts: Array<{ port?: number; id?: number }> }>(CHATGPT_CONFIG_PATH, { accounts: [] });
    const gptPorts = (chatgptConfig.accounts || []).slice(0, 2).map(a => a.port || 0);
    const gpt1Port = gptPorts[0] || 9222;
    const gpt2Port = gptPorts[1] || 9242;

    const [srv3001, gpt1, gpt2] = await Promise.all([
      isPortOpen(ports.fanpageServer),
      isPortOpen(gpt1Port),
      isPortOpen(gpt2Port),
    ]);

    return NextResponse.json({
      ok: true,
      servers: {
        fanpageGpt: { port: ports.fanpageServer, name: 'ChatGPT & FB Cá Nhân', active: srv3001 },
        fbGroups: { port: ports.groupsServer, name: 'Facebook Groups', active: false },
      },
      chromeGpt: {
        acc1: { port: gpt1Port, active: gpt1 },
        acc2: { port: gpt2Port, active: gpt2 },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
