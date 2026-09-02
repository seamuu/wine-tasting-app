import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { colorToEnum, animalToEnum } from "@/lib/mappings";

interface FieldResult {
  value: number | null;
  review: boolean;
}
interface BlockResult {
  letter: string;
  body: FieldResult;
  acidity: FieldResult;
  tannin: FieldResult;
  sweetness: FieldResult;
  overall: FieldResult;
}
interface ScanPayload {
  blockResults: BlockResult[];
  tasterResult: {
    color: { value: string | null; review: boolean };
    animal: { value: string | null; review: boolean };
  };
}

// Ingests exactly the shape scan-test.html's window.__lastRun produces —
// the organizer's browser posts this after confirming the read-back.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const payload = (await req.json()) as ScanPayload;

  const { color, animal } = payload.tasterResult;
  if (!color.value || color.review || !animal.value || animal.review) {
    return NextResponse.json(
      { error: "Taster ID is ambiguous — fix the corner alignment or re-photograph before saving." },
      { status: 422 }
    );
  }

  const wines = await prisma.wine.findMany({ where: { eventId } });
  const wineByLetter = new Map(wines.map((w) => [w.flightPosition, w]));

  const card = await prisma.card.upsert({
    where: {
      eventId_tasterColor_tasterAnimal: {
        eventId,
        tasterColor: colorToEnum(color.value),
        tasterAnimal: animalToEnum(animal.value),
      },
    },
    create: {
      eventId,
      tasterColor: colorToEnum(color.value),
      tasterAnimal: animalToEnum(animal.value),
      scanStatus: "NEEDS_REVIEW",
    },
    update: { scanStatus: "NEEDS_REVIEW" },
  });

  let anyReview = false;
  for (const block of payload.blockResults) {
    const wine = wineByLetter.get(block.letter as never);
    if (!wine) continue; // this event's flight is shorter than 4 wines — fine, just skip
    const fields = ["body", "acidity", "tannin", "sweetness", "overall"] as const;
    for (const f of fields) if (block[f].review) anyReview = true;

    await prisma.rating.upsert({
      where: { cardId_wineId: { cardId: card.id, wineId: wine.id } },
      create: {
        cardId: card.id,
        wineId: wine.id,
        body: block.body.value,
        acidity: block.acidity.value,
        tannin: block.tannin.value,
        sweetness: block.sweetness.value,
        overall: block.overall.value,
        bodyReview: block.body.review,
        acidityReview: block.acidity.review,
        tanninReview: block.tannin.review,
        sweetnessReview: block.sweetness.review,
        overallReview: block.overall.review,
      },
      update: {
        body: block.body.value,
        acidity: block.acidity.value,
        tannin: block.tannin.value,
        sweetness: block.sweetness.value,
        overall: block.overall.value,
        bodyReview: block.body.review,
        acidityReview: block.acidity.review,
        tanninReview: block.tannin.review,
        sweetnessReview: block.sweetness.review,
        overallReview: block.overall.review,
      },
    });
  }

  await prisma.card.update({
    where: { id: card.id },
    data: { scanStatus: anyReview ? "NEEDS_REVIEW" : "CONFIRMED" },
  });

  return NextResponse.json({ cardId: card.id, needsReview: anyReview });
}
