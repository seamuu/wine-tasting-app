import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveScan } from "@/app/actions";
import { toPayload, type ScanResult } from "@/lib/scan-payload";
import { PRICE_BUCKETS, POSITIONS, type Position } from "@/lib/card";
import { tasterLabel } from "@/lib/taster";

/** Lightweight live collection status; never refreshes the host's forms. */
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const eventId = query.get("eventId"), position = query.get("position");
  if (!eventId || !position) return NextResponse.json({ error: "eventId and position are required" }, { status: 400 });
  if (!POSITIONS.includes(position as Position)) return NextResponse.json({ error: "Invalid wine position" }, { status: 400 });
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: {
    teams: { select: { memberCount: true } },
    wines: { where: { position: position as Position }, select: { submissions: { orderBy: { createdAt: "desc" }, include: { taster: true } } } },
  } });
  if (!event?.wines.length) return NextResponse.json({ error: "Tasting or wine not found" }, { status: 404 });
  const cards = event.wines[0].submissions.map(card => ({ id: card.id, at: card.createdAt.toISOString(), position, wine: "Bottle hidden",
    taster: tasterLabel(card.taster), status: card.status, note: card.reviewNote }));
  return NextResponse.json({ count: cards.length, expected: event.teams.reduce((sum, team) => sum + team.memberCount, 0),
    reviewed: cards.filter(card => card.status === "NEEDS_REVIEW").length, cards }, { headers: { "Cache-Control": "no-store" } });
}

/** Save a scanner reading only after the host taps Confirm & save.
 * The static scanner posts once and notifies the app of the saved record,
 * so counters update without refreshing the host or resetting the summary.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as
    { eventId?: string; result?: ScanResult; buckets?: string[]; expectedPosition?: string } | null;
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

  if (body.expectedPosition && payload.winePosition !== body.expectedPosition)
    return NextResponse.json({ ok: false, error: `This card is for wine ${payload.winePosition}. You’re collecting wine ${body.expectedPosition}.` }, { status: 422 });

  const res = await saveScan(payload);
  if (!res.ok) return NextResponse.json(res, { status: 409 });
  const wine = await prisma.wine.findUniqueOrThrow({ where: { eventId_position: { eventId: body.eventId, position: payload.winePosition } } });
  const [submission, count, teamSizes] = await Promise.all([
    prisma.submission.findUniqueOrThrow({ where: { id: res.submissionId } }),
    prisma.submission.count({ where: { wineId: wine.id } }),
    prisma.team.aggregate({ where: { eventId: body.eventId }, _sum: { memberCount: true } }),
  ]);
  return NextResponse.json({ ...res, count, expected: teamSizes._sum.memberCount ?? 0, card: {
    id: submission.id, at: submission.createdAt.toISOString(), position: payload.winePosition,
    wine: res.wine, taster: res.taster, status: submission.status, note: submission.reviewNote,
  } });
}
