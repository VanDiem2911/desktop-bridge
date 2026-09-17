import { NextRequest, NextResponse } from "next/server";
import { getServerPorts } from "@/lib/server-utils";

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get("target") || "fanpage";
  const pathSuffix = searchParams.get("path") || "/generate";

  const ports = getServerPorts();
  const port = target === "groups" ? ports.groupsServer : ports.fanpageServer;

  const upstreamUrl = ["http://127.0.0.1:", port, pathSuffix].join("");

  try {
    const body = await req.text();
    const upRes = await fetch(upstreamUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(120000),
    });
    const data = await upRes.text();
    return new NextResponse(data, {
      status: upRes.status,
      headers: { "Content-Type": upRes.headers.get("Content-Type") || "application/json" },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const label = target === "groups" ? "groups-server" : "fanpage-server";
    return NextResponse.json(
      { ok: false, error: "Khong the ket noi " + label + " (port " + port + "): " + msg },
      { status: 502 }
    );
  }
}