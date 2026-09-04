"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { bucketForPrice } from "@/lib/card";
import { fetchPolet, draftKey } from "@/lib/vinmonopolet";

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
  const position = (str(form.get("position")) ?? "A") as "A" | "B" | "C" | "D";
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

  revalidatePath(`/t/${eventId}`);
  if (lookupError) redirect(`/t/${eventId}?tab=wines&lookup=failed`);
}

export async function updateWine(form: FormData) {
  const id = String(form.get("wineId"));
  const wine = await prisma.wine.update({
    where: { id },
    data: {
      name: str(form.get("name")),
      producer: str(form.get("producer")) ?? null,
      vintage: int(form.get("vintage")) ?? null,
      teaser: str(form.get("teaser")) ?? null,
      side: str(form.get("side")) === "RED" ? "RED" : "WHITE",
      priceBucket: int(form.get("priceBucket")) ?? null,
      keyBody: int(form.get("keyBody")) ?? null,
      keyAcidity: int(form.get("keyAcidity")) ?? null,
      keyTannin: int(form.get("keyTannin")) ?? null,
      keySweetness: int(form.get("keySweetness")) ?? null,
      keyAlcohol: int(form.get("keyAlcohol")) ?? null,
    },
  });
  revalidatePath(`/t/${wine.eventId}`);
}

export async function deleteWine(form: FormData) {
  const id = String(form.get("wineId"));
  const wine = await prisma.wine.delete({ where: { id } });
  revalidatePath(`/t/${wine.eventId}`);
}

/** Move a wine through upcoming → pouring → locked → revealed. */
export async function setStage(form: FormData) {
  const id = String(form.get("wineId"));
  const stage = String(form.get("stage")) as
    "UPCOMING" | "POURING" | "LOCKED" | "REVEALED";
  const wine = await prisma.wine.update({
    where: { id },
    data: { stage, ...(stage === "LOCKED" ? { keyLockedAt: new Date() } : {}) },
  });
  revalidatePath(`/t/${wine.eventId}`);
}

export type ScanPayload = {
  eventId: string;
  winePosition: "A" | "B" | "C" | "D";
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

  revalidatePath(`/t/${payload.eventId}`);
  return { ok: true as const, taster: `${taster.idA} ${taster.idB}`, wine: wine.name };
}

export async function nameTaster(form: FormData) {
  const id = String(form.get("tasterId"));
  const taster = await prisma.taster.update({
    where: { id },
    data: { name: str(form.get("name")) ?? null },
  });
  revalidatePath(`/t/${taster.eventId}`);
}
