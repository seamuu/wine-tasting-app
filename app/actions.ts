"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { bucketForPrice, POSITIONS, type Position } from "@/lib/card";
import { fetchPolet, draftKey } from "@/lib/vinmonopolet";
import { CATEGORIES, optionOrder, type QuizWine } from "@/lib/quiz";
import type { QuizCategory } from "@/app/generated/prisma/enums";

const str = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : undefined;
};
const int = (v: FormDataEntryValue | null) => {
  const s = str(v);
  if (s === undefined) return undefined;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : undefined;
};

export async function createEvent(form: FormData) {
  const event = await prisma.event.create({
    data: {
      name: str(form.get("name")) ?? "Untitled tasting",
      idSet: str(form.get("idSet")) ?? "house",
      revealMode: str(form.get("revealMode")) === "OPEN" ? "OPEN" : "BLIND",
    },
  });
  redirect(`/t/${event.id}`);
}

/**
 * Setup changes. Three of these — the vocabulary, the number of wines and the
 * card version — are printed onto paper, so changing them after the pack is run
 * off invalidates it. The setup screen says so; nothing here blocks it, because
 * "I printed the wrong thing and need to fix it" is the likelier case.
 */
export async function updateEvent(form: FormData) {
  const id = String(form.get("eventId"));
  const wineCount = int(form.get("wineCount"));
  await prisma.event.update({
    where: { id },
    data: {
      name: str(form.get("name")),
      idSet: str(form.get("idSet")),
      revealMode: form.get("revealMode") == null
        ? undefined
        : str(form.get("revealMode")) === "OPEN" ? "OPEN" : "BLIND",
      wineCount: wineCount == null ? undefined : Math.min(8, Math.max(2, wineCount)),
      guestCount: form.get("guestCount") == null ? undefined : (int(form.get("guestCount")) ?? null),
      priceOnCard: form.has("priceOnCard") ? str(form.get("priceOnCard")) === "1" : undefined,
    },
  });
  revalidatePath(`/t/${id}`, "layout");
}

export async function deleteEvent(form: FormData) {
  const id = str(form.get("eventId"));
  if (id) await prisma.event.delete({ where: { id } });
  revalidatePath("/");
  redirect("/");
}

/**
 * Add a wine. A Vinmonopolet link fills everything in; without one you get a
 * name and nothing else, which is fine — the flavour round still scores, you
 * just have to set the price bucket yourself.
 */
export async function addWine(form: FormData) {
  const eventId = String(form.get("eventId"));
  const asked = str(form.get("position")) ?? "A";
  const position = (POSITIONS.includes(asked as Position) ? asked : "A") as Position;
  const side = str(form.get("side")) === "RED" ? "RED" : "WHITE";
  const url = str(form.get("sourceUrl"));

  type WineFields = {
    name: string;
    producer?: string; vintage?: number; country?: string; region?: string;
    appellation?: string; grapes?: string; tastingNote?: string;
    sourceUrl?: string; sourceRef?: string;
    priceNok?: string; alcohol?: string; sugarGl?: string; acidGl?: string;
    priceBucket?: number;
    keyBody?: number; keyAcidity?: number; keyTannin?: number;
    keySweetness?: number; keyAlcohol?: number;
  };

  let data: WineFields = { name: str(form.get("name")) ?? "Unnamed wine" };
  let lookupError: string | undefined;

  if (url) {
    try {
      const w = await fetchPolet(url);
      data = {
        name: str(form.get("name")) ?? w.name ?? "Unnamed wine",
        producer: w.producer,
        vintage: w.vintage,
        country: w.country,
        region: w.region,
        appellation: w.appellation,
        grapes: w.grapes,
        tastingNote: w.tastingNote,
        sourceUrl: w.sourceUrl,
        sourceRef: w.sourceRef,
        priceNok: w.priceNok?.toFixed(2),
        alcohol: w.alcohol?.toFixed(2),
        sugarGl: w.sugarGl?.toFixed(2),
        acidGl: w.acidGl?.toFixed(2),
        priceBucket: w.priceNok != null ? bucketForPrice(w.priceNok) : undefined,
        ...draftKey(w),
      };
    } catch (e) {
      lookupError = e instanceof Error ? e.message : "lookup failed";
      data.sourceUrl = url;
    }
  }

  await prisma.wine.upsert({
    where: { eventId_position: { eventId, position } },
    create: { eventId, position, side, ...data },
    update: { side, ...data },
  });

  revalidatePath(`/t/${eventId}`, "layout");
  if (lookupError) redirect(`/t/${eventId}?tab=wines&lookup=failed`);
}

/**
 * Only writes fields the submitted form actually carried. An HTML form sends
 * nothing for an unticked checkbox and nothing for an input it doesn't contain,
 * so a partial form — the aroma key on its own, say — would otherwise blank the
 * producer and flip the wine's side to white on its way past.
 */
export async function updateWine(form: FormData) {
  const id = String(form.get("wineId"));

  const data: Record<string, unknown> = {};
  const text = (field: string) => { if (form.has(field)) data[field] = str(form.get(field)) ?? null; };
  const whole = (field: string) => { if (form.has(field)) data[field] = int(form.get(field)) ?? null; };

  if (form.has("name")) data.name = str(form.get("name")) ?? undefined; // never blank the name
  text("producer"); text("teaser");
  whole("vintage"); whole("priceBucket");
  whole("keyBody"); whole("keyAcidity"); whole("keyTannin");
  whole("keySweetness"); whole("keyAlcohol");
  if (form.has("side")) data.side = str(form.get("side")) === "RED" ? "RED" : "WHITE";
  // a hidden marker, because "no boxes ticked" and "no boxes on this form" look
  // identical in the payload
  if (form.has("keyFlavoursPresent")) data.keyFlavours = form.getAll("keyFlavours").map(String);

  const wine = await prisma.wine.update({ where: { id }, data });
  revalidatePath(`/t/${wine.eventId}`, "layout");
}

/**
 * Throw away one card's reading. Test scans happen - the host photographs a
 * half-filled card to check the camera works - and without this they sit in the
 * results as a taster who scored badly on a wine they never drank.
 */
export async function deleteSubmission(form: FormData) {
  const id = String(form.get("submissionId"));
  const gone = await prisma.submission.delete({ where: { id } });
  // A taster who only ever existed because of that card goes with it, rather
  // than lingering in the standings with nothing behind them.
  const left = await prisma.submission.count({ where: { tasterId: gone.tasterId } });
  if (left === 0) await prisma.taster.delete({ where: { id: gone.tasterId } });
  revalidatePath(`/t/${gone.eventId}`, "layout");
}

export async function deleteWine(form: FormData) {
  const id = String(form.get("wineId"));
  const wine = await prisma.wine.delete({ where: { id } });
  revalidatePath(`/t/${wine.eventId}`, "layout");
}

/** Move a wine through upcoming → pouring → locked → revealed. */
export async function setStage(form: FormData) {
  const id = String(form.get("wineId"));
  const stage = String(form.get("stage")) as
    "UPCOMING" | "POURING" | "LOCKED" | "REVEALED";
  // Stepping back before LOCKED drops the lock timestamp too, so a wine that
  // was locked by mistake is genuinely back to being poured rather than
  // carrying a lock time for a lock that no longer applies.
  const wine = await prisma.wine.update({
    where: { id },
    data: {
      stage,
      ...(stage === "LOCKED" ? { keyLockedAt: new Date() } : {}),
      ...(stage === "UPCOMING" || stage === "POURING" ? { keyLockedAt: null } : {}),
    },
  });
  revalidatePath(`/t/${wine.eventId}`, "layout");
}

export type ScanPayload = {
  eventId: string;
  winePosition: Position;
  idA: string;
  idB: string;
  side: "WHITE" | "RED";
  priceBucket: number | null;
  body: number | null;
  acidity: number | null;
  tannin: number | null;
  sweetness: number | null;
  alcohol: number | null;
  rating: number | null;
  flavours: string[];
  needsReview: boolean;
  reviewNote?: string;
  readings?: unknown;
};

/**
 * Save one scanned card. The taster is created on first sight — nobody is
 * registered up front, they just mark two bubbles and appear.
 */
export async function saveScan(payload: ScanPayload) {
  const wine = await prisma.wine.findUnique({
    where: { eventId_position: { eventId: payload.eventId, position: payload.winePosition } },
  });
  if (!wine) return { ok: false as const, error: `No wine ${payload.winePosition} in this tasting yet.` };

  const taster = await prisma.taster.upsert({
    where: { eventId_idA_idB: { eventId: payload.eventId, idA: payload.idA, idB: payload.idB } },
    create: { eventId: payload.eventId, idA: payload.idA, idB: payload.idB },
    update: {},
  });

  const values = {
    side: payload.side,
    priceBucket: payload.priceBucket,
    body: payload.body,
    acidity: payload.acidity,
    tannin: payload.tannin,
    sweetness: payload.sweetness,
    alcohol: payload.alcohol,
    rating: payload.rating,
    flavours: payload.flavours,
    status: payload.needsReview ? ("NEEDS_REVIEW" as const) : ("CONFIRMED" as const),
    reviewNote: payload.reviewNote ?? null,
    readings: (payload.readings ?? undefined) as never,
  };

  await prisma.submission.upsert({
    where: { wineId_tasterId: { wineId: wine.id, tasterId: taster.id } },
    create: { eventId: payload.eventId, wineId: wine.id, tasterId: taster.id, ...values },
    update: values,
  });

  revalidatePath(`/t/${payload.eventId}`, "layout");
  return { ok: true as const, taster: `${taster.idA} ${taster.idB}`, wine: wine.name };
}

/**
 * The paper card, typed in. Used when a photo will not read — a crease, a
 * shadow, a biro that skipped — and the alternative is losing the card.
 *
 * It goes through the same upsert as a scan, so entering one by hand and then
 * getting the photo to work later simply replaces it, in either order.
 */
export async function saveManualCard(form: FormData) {
  const eventId = String(form.get("eventId"));
  const asked = str(form.get("winePosition")) ?? "A";
  const position = (POSITIONS.includes(asked as Position) ? asked : "A") as Position;
  const idA = str(form.get("idA"));
  const idB = str(form.get("idB"));

  if (!idA || !idB) redirect(`/t/${eventId}?tab=scan&manual=who`);

  const wine = await prisma.wine.findUnique({
    where: { eventId_position: { eventId, position } },
  });
  if (!wine) redirect(`/t/${eventId}?tab=scan&manual=nowine`);

  const taster = await prisma.taster.upsert({
    where: { eventId_idA_idB: { eventId, idA, idB } },
    create: { eventId, idA, idB },
    update: {},
  });

  const values = {
    side: wine.side,
    priceBucket: int(form.get("priceBucket")) ?? null,
    body: int(form.get("body")) ?? null,
    acidity: int(form.get("acidity")) ?? null,
    tannin: int(form.get("tannin")) ?? null,
    sweetness: int(form.get("sweetness")) ?? null,
    alcohol: int(form.get("alcohol")) ?? null,
    rating: int(form.get("rating")) ?? null,
    flavours: form.getAll("flavours").map(String),
    status: "MANUAL" as const,
    reviewNote: null,
  };

  await prisma.submission.upsert({
    where: { wineId_tasterId: { wineId: wine.id, tasterId: taster.id } },
    create: { eventId, wineId: wine.id, tasterId: taster.id, ...values },
    update: values,
  });

  revalidatePath(`/t/${eventId}`, "layout");
  redirect(`/t/${eventId}?tab=scan&manual=saved`);
}

/**
 * Type in one team's answer sheet.
 *
 * Hand-entered rather than scanned: there are only two sheets and sixteen
 * answers on each, so a reader for a one-off layout would cost more than it
 * saves — and would be the newest, least-proven thing in the room on the night.
 *
 * The form carries option numbers as printed; this resolves them to the wine
 * whose answer that was, so scoring is a comparison of two ids.
 */
export async function saveTeamGuesses(form: FormData) {
  const eventId = String(form.get("eventId"));
  const name = str(form.get("teamName")) ?? "Team 1";

  const team = await prisma.team.upsert({
    where: { eventId_name: { eventId, name } },
    create: { eventId, name },
    update: {},
  });

  const wines = await prisma.wine.findMany({
    where: { eventId }, orderBy: { position: "asc" },
  });

  const writes: { category: QuizCategory; wineId: string; choiceId: string }[] = [];
  const clears: { category: QuizCategory; wineId: string }[] = [];

  for (const category of CATEGORIES) {
    const order = optionOrder(eventId, category, wines as unknown as QuizWine[]);
    for (const wine of wines) {
      const raw = str(form.get(`g:${category}:${wine.id}`));
      const slot = raw == null ? NaN : parseInt(raw, 10);
      if (!Number.isFinite(slot) || !order[slot]) { clears.push({ category, wineId: wine.id }); continue; }
      writes.push({ category, wineId: wine.id, choiceId: order[slot].id });
    }
  }

  await prisma.$transaction([
    ...clears.map(({ category, wineId }) =>
      prisma.teamGuess.deleteMany({ where: { teamId: team.id, wineId, category } })),
    ...writes.map(({ category, wineId, choiceId }) =>
      prisma.teamGuess.upsert({
        where: { teamId_wineId_category: { teamId: team.id, wineId, category } },
        create: { teamId: team.id, wineId, category, choiceId },
        update: { choiceId },
      })),
  ]);

  revalidatePath(`/t/${eventId}`, "layout");
}

export async function renameTeam(form: FormData) {
  const id = String(form.get("teamId"));
  const name = str(form.get("name"));
  if (!name) return;
  const team = await prisma.team.update({ where: { id }, data: { name } });
  revalidatePath(`/t/${team.eventId}`, "layout");
}

export async function deleteTeam(form: FormData) {
  const team = await prisma.team.delete({ where: { id: String(form.get("teamId")) } });
  revalidatePath(`/t/${team.eventId}`, "layout");
}

export async function nameTaster(form: FormData) {
  const id = String(form.get("tasterId"));
  const taster = await prisma.taster.update({
    where: { id },
    data: { name: str(form.get("name")) ?? null },
  });
  revalidatePath(`/t/${taster.eventId}`, "layout");
}
