import { NextRequest, NextResponse } from 'next/server';
import { fetchFacebookTitle } from '@/lib/server-utils';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url')?.trim();

    if (!url) {
      return NextResponse.json({ ok: false, error: 'Thiếu tham số url' }, { status: 400 });
    }

    const name = await fetchFacebookTitle(url);
    return NextResponse.json({ ok: true, name: name || '' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = body.url?.trim();

    if (!url) {
      return NextResponse.json({ ok: false, error: 'Thiếu tham số url' }, { status: 400 });
    }

    const name = await fetchFacebookTitle(url);
    return NextResponse.json({ ok: true, name: name || '' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
