import { NextRequest, NextResponse } from 'next/server';
import { openChromeProfile } from '@/lib/server-utils';

export async function POST(req: NextRequest) {
  try {
    const { profileDir, port, url = 'https://www.facebook.com/' } = await req.json();
    if (!profileDir || !port) {
      return NextResponse.json({ error: 'profileDir và port là bắt buộc' }, { status: 400 });
    }

    openChromeProfile(profileDir, port, url);
    return NextResponse.json({ ok: true, message: `Đang mở Chrome cho ${profileDir} (Port ${port})...` });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
