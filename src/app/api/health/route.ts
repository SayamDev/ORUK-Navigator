import { NextResponse } from "next/server";

import { getDatabase } from "@/server/database/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await getDatabase().unsafe("select 1");
    return NextResponse.json(
      { status: "ok" },
      { status: 200, headers: { "cache-control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { status: "unavailable" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
