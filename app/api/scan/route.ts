import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveScan } from "@/app/actions";
import { toPayload, type ScanResult } from "@/lib/scan-payload";
import { PRICE_BUCKETS } from "@/lib/card";

/**
 * File a reading straight from the scanner.
 *
 * The Scan tab also files, by catching a postMessage from the embedded scanner
 * — but that depends on the React page around it being alive, and it is not
 * always: a dev-server restart leaves an open tab holding dead JavaScript, and
 * the card then reads perfectly and files nowhere. The scanner itself is plain
 * static HTML that always runs, so it posts here as well. Both paths land on
 * the same upsert, keyed on taster and wine, so a card filed twice is one row.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as
    { eventId?: string; result?: ScanResult; buckets?: string[] } | null;
  if (!body?.eventId || !body.result)
    return NextResponse.json({ ok: false, error: "eventId and result are required" }, { status: 400 });

  const wines = await prisma.wine.findMany({
    where: { eventId: body.eventId },
    select: { position: true, name: true, side: true },
    orderBy: { position: "asc" },
  });
  if (!wines.length)
    return NextResponse.json({ ok: false, error: "No wines in this tasting yet." }, { status: 409 });

  const payload = toPayload(
    body.eventId, body.result, body.buckets ?? [...PRICE_BUCKETS],
    wines.map((w) => ({ ...w, count: 0 })));
  if ("error" in payload) return NextResponse.json({ ok: false, error: payload.error }, { status: 422 });

  const res = await saveScan(payload);
  return NextResponse.json(res, { status: res.ok ? 200 : 409 });
}
