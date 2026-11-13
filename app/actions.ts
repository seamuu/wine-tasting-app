"use server";

import { demoAnswerRows, PRACTICE_WINES } from "@/lib/demo";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { bucketForPrice, ID_SETS, POSITIONS, type Position } from "@/lib/card";
import { fetchPolet, draftKey } from "@/lib/vinmonopolet";
import type { Prisma } from "@/app/generated/prisma/client";
import { CATEGORIES, optionOrder, playable, type QuizWine } from "@/lib/quiz";
import { isRoundStep, nextRound } from "@/lib/rounds";
import { mapMode, mapEnabled, mapRoundReady, parseCell, pointCell } from "@/lib/map";
import type { QuizCategory } from "@/app/generated/prisma/enums";
import { randomUUID } from "node:crypto";
import { UNNAMED_TASTER, tasterLabel } from "@/lib/taster";

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
      revealMode: "BLIND",
      priceOnCard: false,
      mapMode: "EUROPE",
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
  const existing = await prisma.event.findUnique({ where: { id }, include: {
    wines: { include: { _count: { select: { submissions: true, guessesAbout: true, mapGuesses: true } } } },
  } });
  if (!existing) return;
  const started = existing.wines.some((wine) => wine.stage !== "UPCOMING" || wine._count.submissions > 0 || wine._count.guessesAbout > 0);
  const changesPrintedCard = wineCount != null && wineCount !== existing.wineCount
    || form.has("idSet") && str(form.get("idSet")) !== existing.idSet
    || form.has("priceOnCard") && (str(form.get("priceOnCard")) === "1") !== existing.priceOnCard;
  const requestedMap = form.has("mapMode") ? mapMode(form.get("mapMode")) : undefined;
  const mapLocked = existing.wines.some((wine) => wine.stage === "LOCKED" || wine.stage === "REVEALED" || wine._count.guessesAbout > 0 || wine._count.mapGuesses > 0);
  if (mapLocked && requestedMap != null && requestedMap !== existing.mapMode) redirect(`/t/${id}?tab=setup&settingsError=map`);
  if (started && changesPrintedCard) redirect(`/t/${id}?tab=setup&settingsError=started`);
  await prisma.event.update({
    where: { id },
    data: {
      name: str(form.get("name")),
      idSet: str(form.get("idSet")),
      revealMode: "BLIND",
      mapMode: requestedMap,
      wineCount: wineCount == null ? undefined : Math.min(8, Math.max(2, wineCount)),
      guestCount: form.get("guestCount") == null ? undefined : (int(form.get("guestCount")) ?? null),
      priceOnCard: form.has("priceOnCard") ? str(form.get("priceOnCard")) === "1" : undefined,
    },
  });
  revalidatePath(`/t/${id}`, "layout");
  const nextStep = str(form.get("nextSetupStep"));
  if (nextStep === "teams" || nextStep === "print") redirect(`/t/${id}?tab=setup&step=${nextStep}`);
}

export async function resetResults(form: FormData) {
  const id = str(form.get("eventId"));
  if (!id || form.get("confirmReset") !== "yes") return;
  await prisma.$transaction(async (tx) => {
    await tx.submission.deleteMany({ where: { eventId: id } });
    await tx.teamGuess.deleteMany({ where: { team: { eventId: id } } });
    await tx.teamMapGuess.deleteMany({ where: { team: { eventId: id } } });
    await tx.wine.updateMany({ where: { eventId: id }, data: { stage: "UPCOMING", keyLockedAt: null } });
    await tx.event.update({ where: { id }, data: { activePosition: "A", runStep: "COLLECT", revealMode: "BLIND" } });
  });
  revalidatePath(`/t/${id}`, "layout");
  revalidatePath("/");
  redirect(`/t/${id}?tab=setup&reset=saved`);
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
  const event = await prisma.event.findUnique({ where: { id: eventId }, include: { wines: { include: { _count: { select: { submissions: true, guessesAbout: true, mapGuesses: true } } } } } });
  if (!event || !POSITIONS.slice(0, event.wineCount).includes(position)) return;
  if (event.wines.some((wine) => wine.position === position || wine.stage !== "UPCOMING" || wine._count.submissions > 0 || wine._count.guessesAbout > 0 || wine._count.mapGuesses > 0)) {
    redirect(`/t/${eventId}?tab=wines&lookup=occupied`);
  }

  type WineFields = {
    name: string;
    producer?: string; vintage?: number; country?: string; region?: string;
    appellation?: string; grapes?: string; tastingNote?: string;
    sourceUrl?: string; sourceRef?: string;
    priceNok?: string; alcohol?: string; sugarGl?: string; acidGl?: string;
    colour?: string; smell?: string; taste?: string; storage?: string;
    bodyRaw?: number; acidRaw?: number; tanninRaw?: number; sweetRaw?: number;
    foodPairing?: string[]; grapeNotes?: Prisma.InputJsonValue;
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
        colour: w.colour, smell: w.smell, taste: w.taste, storage: w.storage,
        bodyRaw: w.bodyRaw, acidRaw: w.acidRaw, tanninRaw: w.tanninRaw, sweetRaw: w.sweetRaw,
        foodPairing: w.foodPairing ?? [],
        // Prisma types Json columns as its own input union; a plain array of
        // objects satisfies it at runtime but not structurally.
        grapeNotes: w.grapeNotes as unknown as Prisma.InputJsonValue | undefined,
        priceBucket: w.priceNok != null ? bucketForPrice(w.priceNok) : undefined,
        ...draftKey(w),
      };
    } catch (e) {
      lookupError = e instanceof Error ? e.message : "lookup failed";
      data.sourceUrl = url;
    }
  }

  try {
    await prisma.wine.create({ data: { eventId, position, side, ...data } });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      redirect(`/t/${eventId}?tab=wines&lookup=occupied`);
    }
    throw error;
  }

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
  text("country"); text("region"); text("appellation"); text("grapes"); text("tastingNote");
  if (form.has("priceNok")) {
    const raw = str(form.get("priceNok"));
    const price = raw ? Number(raw.replace(",", ".")) : null;
    if (price != null && (!Number.isFinite(price) || price < 0)) return;
    data.priceNok = price;
    data.priceBucket = price == null ? null : bucketForPrice(price);
  }
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
  const existing = await prisma.wine.findUnique({ where: { id }, include: { event: { include: { wines: { include: { _count: { select: { submissions: true, guessesAbout: true, mapGuesses: true } } } } } } } });
  if (!existing) return;
  if (existing.event.wines.some((wine) => wine.stage !== "UPCOMING" || wine._count.submissions || wine._count.guessesAbout || wine._count.mapGuesses)) {
    redirect(`/t/${existing.eventId}?tab=wines&lookup=occupied`);
  }
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
  idA: string | null;
  idB: string | null;
  scanId?: string;
  submissionId?: string;
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
 * Named cards replace that person's card for the wine. Each unnamed reading
 * gets its own identity, with a stable scan key for safe retries.
 */
export async function saveScan(payload: ScanPayload) {
  return persistCard(payload, payload.needsReview ? "NEEDS_REVIEW" : "CONFIRMED");
}

async function persistCard(payload: ScanPayload, status: "CONFIRMED" | "NEEDS_REVIEW" | "MANUAL") {
  const wine = await prisma.wine.findUnique({
    where: { eventId_position: { eventId: payload.eventId, position: payload.winePosition } },
  });
  if (!wine) return { ok: false as const, error: `No wine ${payload.winePosition} in this tasting yet.` };

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
    status,
    reviewNote: payload.reviewNote ?? null,
    readings: (payload.readings ?? undefined) as never,
  };

  const { taster, submission } = await prisma.$transaction(async tx => {
    const previous = payload.submissionId ? await tx.submission.findFirst({
      where: { id: payload.submissionId, eventId: payload.eventId, wineId: wine.id }, include: { taster: true },
    }) : null;
    const named = payload.idA?.trim() && payload.idB?.trim();
    const scanId = typeof payload.scanId === "string" && /^[\w-]{16,80}$/.test(payload.scanId) ? payload.scanId : randomUUID();
    const identity = named ? { idA: payload.idA!.trim(), idB: payload.idB!.trim() }
      : previous ? { idA: previous.taster.idA, idB: previous.taster.idB }
        : { idA: UNNAMED_TASTER, idB: `${wine.id}:${scanId}` };
    const taster = await tx.taster.upsert({
      where: { eventId_idA_idB: { eventId: payload.eventId, ...identity } },
      create: { eventId: payload.eventId, ...identity }, update: {},
    });
    const submission = await tx.submission.upsert({
      where: { wineId_tasterId: { wineId: wine.id, tasterId: taster.id } },
      create: { eventId: payload.eventId, wineId: wine.id, tasterId: taster.id, ...values }, update: values,
    });
    if (previous && previous.id !== submission.id) {
      await tx.submission.delete({ where: { id: previous.id } });
      if (previous.tasterId !== taster.id && !await tx.submission.count({ where: { tasterId: previous.tasterId } })) {
        await tx.taster.delete({ where: { id: previous.tasterId } });
      }
    }
    return { taster, submission };
  });

  revalidatePath(`/t/${payload.eventId}`, "layout");
  return { ok: true as const, taster: tasterLabel(taster), wine: `Wine ${wine.position}`, submissionId: submission.id };
}

/**
 * The paper card, typed in. Used when a photo will not read — a crease, a
 * shadow, a biro that skipped — and the alternative is losing the card.
 *
 * Named entries use the same identity as a scan. Unnamed entries are independent;
 * correcting a saved card keeps its original identity and replaces that card.
 */
export async function saveManualCard(form: FormData) {
  const eventId = String(form.get("eventId"));
  const asked = str(form.get("winePosition")) ?? "A";
  const position = (POSITIONS.includes(asked as Position) ? asked : "A") as Position;
  const idA = str(form.get("idA"));
  const idB = str(form.get("idB"));

  const returnTo = str(form.get("returnTo")) === "run"
    ? `/t/${eventId}/run?wine=${position}&step=COLLECT` : `/t/${eventId}?tab=scan`;

  const wine = await prisma.wine.findUnique({
    where: { eventId_position: { eventId, position } },
  });
  if (!wine) redirect(`${returnTo}&manual=nowine`);

  const saved = await persistCard({
    eventId, winePosition: position, idA: idA ?? null, idB: idB ?? null,
    submissionId: str(form.get("submissionId")), needsReview: false,
    side: wine.side,
    priceBucket: int(form.get("priceBucket")) ?? null,
    body: int(form.get("body")) ?? null,
    acidity: int(form.get("acidity")) ?? null,
    tannin: int(form.get("tannin")) ?? null,
    sweetness: int(form.get("sweetness")) ?? null,
    alcohol: int(form.get("alcohol")) ?? null,
    rating: int(form.get("rating")) ?? null,
    flavours: form.getAll("flavours").map(String),
  }, "MANUAL");
  if (!saved.ok) redirect(`${returnTo}&manual=nowine`);
  redirect(`${returnTo}&manual=saved`);
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

  const teamId = str(form.get("teamId"));
  const team = teamId
    ? await prisma.team.findFirst({ where: { id: teamId, eventId } })
    : await prisma.team.upsert({
      where: { eventId_name: { eventId, name } },
      create: { eventId, name }, update: {},
    });
  if (!team) return;

  const wines = await prisma.wine.findMany({
    where: { eventId }, orderBy: { position: "asc" },
  });

  const writes: { category: QuizCategory; wineId: string; choiceId: string }[] = [];
  const clears: { category: QuizCategory; wineId: string }[] = [];

  for (const category of CATEGORIES) {
    if (!playable(wines, category)) continue;
    const order = optionOrder(eventId, category, wines as unknown as QuizWine[]);
    for (const wine of wines) {
      const field = `g:${category}:${wine.id}`;
      // A per-wine form must never clear answers from another round.
      if (!form.has(field)) continue;
      const raw = str(form.get(field));
      const slot = raw == null ? NaN : Number(raw);
      if (!Number.isInteger(slot) || !order[slot]) { clears.push({ category, wineId: wine.id }); continue; }
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
  const team = await prisma.$transaction(async (tx) => {
    const team = await tx.team.delete({ where: { id: String(form.get("teamId")) } });
    const total = await tx.team.aggregate({ where: { eventId: team.eventId }, _sum: { memberCount: true } });
    await tx.event.update({ where: { id: team.eventId }, data: { guestCount: total._sum.memberCount } });
    return team;
  });
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

/** Save the host's cursor atomically with the reveal. Repeated submits do not
 * skip a step: a stale form always returns to the current round. */
export async function advanceRound(form: FormData) {
  const eventId = String(form.get("eventId"));
  const event = await prisma.event.findUnique({
    where: { id: eventId }, include: { wines: { orderBy: { position: "asc" } }, teams: true },
  });
  if (!event) return;
  const fromPosition = String(form.get("fromPosition"));
  const fromStep = String(form.get("fromStep"));
  if (event.activePosition !== fromPosition || event.runStep !== fromStep || !isRoundStep(fromStep)) {
    redirect(`/t/${eventId}/run?notice=stale`);
  }
  const next = nextRound(event.wines, fromPosition, fromStep);
  if (!next) redirect(`/t/${eventId}/run`);
  const ids = ID_SETS[event.idSet] ?? ID_SETS.house;
  const guests = event.teams.reduce((sum, team) => sum + team.memberCount, 0);
  if (event.wines.length !== event.wineCount || event.teams.length === 0
    || !POSITIONS.slice(0, event.wineCount).every((position) => event.wines.some((wine) => wine.position === position))
    || (!CATEGORIES.some((category) => playable(event.wines, category)) && !mapRoundReady(event.wines, event.mapMode))
    || (mapEnabled(event.mapMode) && !mapRoundReady(event.wines, event.mapMode)) || guests > ids.a.length * ids.b.length) {
    redirect(`/t/${eventId}/run?notice=setup`);
  }
  await prisma.$transaction(async (tx) => {
    const cursor = await tx.event.updateMany({
      where: { id: eventId, activePosition: event.activePosition, runStep: fromStep },
      data: { activePosition: next.position as typeof event.activePosition, runStep: next.step, revealMode: "BLIND" },
    });
    if (!cursor.count) return;
    const wine = event.wines.find((w) => w.position === next.position)!;
    if (next.step === "ANSWERS") {
      await tx.wine.update({ where: { id: wine.id }, data: {
        stage: wine.stage === "REVEALED" ? "REVEALED" : "LOCKED", keyLockedAt: new Date(),
      } });
    } else if (next.step === "REVEAL") {
      await tx.wine.update({ where: { id: wine.id }, data: { stage: "REVEALED" } });
    } else if (next.step === "COLLECT") {
      await tx.wine.update({ where: { id: wine.id }, data: { stage: "POURING" } });
    }
  });
  revalidatePath(`/t/${eventId}`, "layout");
  redirect(`/t/${eventId}/run`);
}

/** Save all teams for one glass before revealing it. Earlier wines are untouched. */
export async function saveRoundAnswers(form: FormData) {
  const eventId = String(form.get("eventId"));
  const position = String(form.get("fromPosition"));
  const event = await prisma.event.findUnique({ where: { id: eventId },
    include: { wines: { orderBy: { position: "asc" } }, teams: true } });
  if (!event) return;
  const wine = event.wines.find((w) => w.position === position);
  if (!wine) return;
  if (form.get("intent") === "reveal" && (event.activePosition !== position || event.runStep !== "ANSWERS")) {
    redirect(`/t/${eventId}/run?notice=stale`);
  }
  if (wine.stage !== "REVEALED" && (event.activePosition !== position || event.runStep === "COLLECT")) {
    redirect(`/t/${eventId}/run?notice=stale`);
  }
  const writes: { teamId: string; category: QuizCategory; choiceId: string | null }[] = [];
  for (const category of CATEGORIES.filter((c) => playable(event.wines, c))) {
    const order = optionOrder(eventId, category, event.wines);
    for (const team of event.teams) {
      const field = `t:${team.id}:${category}`;
      if (!form.has(field)) continue;
      const raw = str(form.get(field));
      const slot = raw == null ? null : Number(raw);
      if (slot != null && (!Number.isInteger(slot) || !order[slot])) {
        redirect(`/t/${eventId}/run?notice=invalid`);
      }
      writes.push({ teamId: team.id, category, choiceId: slot == null ? null : order[slot].id });
    }
  }
  const mode = mapMode(event.mapMode);
  const mapWrites: { teamId: string; cell: string | null }[] = [];
  if (mapEnabled(mode)) {
    if (!mapRoundReady(event.wines, mode)) redirect(`/t/${eventId}/run?notice=setup`);
    for (const team of event.teams) {
      const field = `m:${team.id}`;
      if (!form.has(field)) continue;
      const raw = str(form.get(field));
      const parsed = raw ? parseCell(raw, mode) : null;
      if (raw && !parsed) redirect(`/t/${eventId}/run?wine=${position}&step=ANSWERS&notice=map`);
      mapWrites.push({ teamId: team.id, cell: parsed?.cell ?? null });
    }
  }
  await prisma.$transaction([
    ...writes.map(({ teamId, category, choiceId }) => choiceId == null
      ? prisma.teamGuess.deleteMany({ where: { teamId, wineId: wine.id, category } })
      : prisma.teamGuess.upsert({ where: { teamId_wineId_category: { teamId, wineId: wine.id, category } },
        create: { teamId, wineId: wine.id, category, choiceId }, update: { choiceId } })),
    ...mapWrites.map(({ teamId, cell }) => cell == null
      ? prisma.teamMapGuess.deleteMany({ where: { teamId, wineId: wine.id } })
      : prisma.teamMapGuess.upsert({ where: { teamId_wineId: { teamId, wineId: wine.id } },
        create: { teamId, wineId: wine.id, cell }, update: { cell } })),
  ]);
  revalidatePath(`/t/${eventId}`, "layout");
  if (form.get("intent") === "reveal") await advanceRound(form);
  redirect(`/t/${eventId}/run?wine=${position}&step=ANSWERS&notice=saved`);
}

/** Team sizes are the guest count, so print quantities and scan progress agree. */
export async function saveTeam(form: FormData) {
  const eventId = String(form.get("eventId"));
  const id = str(form.get("teamId"));
  const name = str(form.get("name"));
  const memberCount = Number(form.get("memberCount"));
  if (!name || !Number.isInteger(memberCount) || memberCount < 1 || memberCount > 100) {
    redirect(`/t/${eventId}?tab=setup&teamError=invalid`);
  }
  const duplicate = await prisma.team.findUnique({ where: { eventId_name: { eventId, name } } });
  if (duplicate && duplicate.id !== id) redirect(`/t/${eventId}?tab=setup&teamError=duplicate`);
  try {
    await prisma.$transaction(async (tx) => {
      if (id) await tx.team.updateMany({ where: { id, eventId }, data: { name, memberCount } });
      else await tx.team.create({ data: { eventId, name, memberCount } });
      const total = await tx.team.aggregate({ where: { eventId }, _sum: { memberCount: true } });
      await tx.event.update({ where: { id: eventId }, data: { guestCount: total._sum.memberCount } });
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      redirect(`/t/${eventId}?tab=setup&teamError=duplicate`);
    }
    throw error;
  }
  revalidatePath(`/t/${eventId}`, "layout");
}

/** Refresh an existing bottle without replacing its identity or any cards. */
export async function refreshWine(form: FormData) {
  const wine = await prisma.wine.findUnique({ where: { id: String(form.get("wineId")) } });
  if (!wine?.sourceUrl) return;
  let failed = false;
  try {
    const w = await fetchPolet(wine.sourceUrl);
    if (!w.name) throw new Error("No product found");
    await prisma.wine.update({ where: { id: wine.id }, data: {
      name: w.name, producer: w.producer, vintage: w.vintage, country: w.country,
      region: w.region, appellation: w.appellation, grapes: w.grapes, tastingNote: w.tastingNote,
      priceNok: w.priceNok, alcohol: w.alcohol, sugarGl: w.sugarGl, acidGl: w.acidGl,
      colour: w.colour, smell: w.smell, taste: w.taste, storage: w.storage,
      bodyRaw: w.bodyRaw, acidRaw: w.acidRaw, tanninRaw: w.tanninRaw, sweetRaw: w.sweetRaw,
      foodPairing: w.foodPairing, grapeNotes: w.grapeNotes as Prisma.InputJsonValue | undefined,
      priceBucket: w.priceNok == null ? undefined : bucketForPrice(w.priceNok),
      ...draftKey(w),
    } });
  } catch { failed = true; }
  revalidatePath(`/t/${wine.eventId}`, "layout");
  redirect(`/t/${wine.eventId}?tab=wines&refresh=${failed ? "failed" : "saved"}`);
}

/** Map answers are host-confirmed points; no grape or country is geocoded into a guessed region. */
export async function setWineMapPoint(form: FormData) {
  const wine = await prisma.wine.findUnique({ where: { id: String(form.get("wineId")) }, include: { event: true } });
  if (!wine || !mapEnabled(wine.event.mapMode)) return;
  const lat = str(form.get("mapLatitude")), lon = str(form.get("mapLongitude"));
  const mapLatitude = lat == null ? NaN : Number(lat), mapLongitude = lon == null ? NaN : Number(lon);
  if (!pointCell({ mapLatitude, mapLongitude }, wine.event.mapMode)) {
    redirect(`/t/${wine.eventId}?tab=wines&mapError=invalid`);
  }
  await prisma.wine.update({ where: { id: wine.id }, data: { mapLatitude, mapLongitude } });
  revalidatePath(`/t/${wine.eventId}`, "layout");
}

/** A separate, fictional tasting for the printable scanner practice cards. */
export async function createPracticeTasting() {
  const event = await prisma.$transaction(async tx => {
  const created = await tx.event.create({ include: { teams: true, wines: true }, data: {
    name: "Demo tasting", idSet: "colours", wineCount: 2, guestCount: 2,
    priceOnCard: false, revealMode: "BLIND", mapMode: "OFF",
    teams: { create: [{ name: "Foxes", memberCount: 1 }, { name: "Owls", memberCount: 1 }] },
    wines: { create: [
      { position: "A", side: "WHITE", name: PRACTICE_WINES.WHITE, priceNok: 150,
        country: "Frankrike", appellation: "Practice region A", grapes: "Chardonnay",
        tastingNote: "Practice note: lemon and apple.", keyFlavours: ["Citrus fruit|Lemon", "Orchard fruit|Apple"], keyBody: 2, keyAcidity: 4, keyTannin: 1, keySweetness: 1, keyAlcohol: 2 },
      { position: "B", side: "RED", name: PRACTICE_WINES.RED, priceNok: 250,
        country: "Italia", appellation: "Practice region B", grapes: "Gamay",
        tastingNote: "Practice note: cherry and plum.", keyFlavours: ["Red fruit|Cherry", "Black fruit|Plum"], keyBody: 4, keyAcidity: 3, keyTannin: 4, keySweetness: 1, keyAlcohol: 4 },
    ] },
  } });
  await tx.teamGuess.createMany({ data: demoAnswerRows(created), skipDuplicates: true });
  return created;
  });
  redirect(`/t/${event.id}/run`);
}
