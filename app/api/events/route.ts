import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FLIGHT_POSITIONS } from "@/lib/mappings";

export async function GET() {
  const events = await prisma.event.findMany({
    orderBy: { date: "desc" },
    include: { wines: true, cards: true },
  });
  return NextResponse.json({ events });
}

interface WineInput {
  flightPosition: string;
  name: string;
  producer?: string;
  vintage?: number;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, date, wines } = body as {
    name?: string;
    date?: string;
    wines?: WineInput[];
  };

  if (!name || !date) {
    return NextResponse.json({ error: "name and date are required" }, { status: 400 });
  }
  const cleanWines = (wines ?? []).filter(
    (w) => w.name?.trim() && FLIGHT_POSITIONS.includes(w.flightPosition as never)
  );
  if (cleanWines.length === 0) {
    return NextResponse.json({ error: "at least one wine is required" }, { status: 400 });
  }

  const event = await prisma.event.create({
    data: {
      name,
      date: new Date(date),
      wines: {
        create: cleanWines.map((w) => ({
          flightPosition: w.flightPosition as never,
          name: w.name,
          producer: w.producer || null,
          vintage: w.vintage || null,
        })),
      },
    },
    include: { wines: true },
  });

  return NextResponse.json({ event }, { status: 201 });
}
