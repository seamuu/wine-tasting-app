import { NextResponse } from "next/server";
import { searchPolet } from "@/lib/vinmonopolet";

/** Search the Polet from the add-a-wine box. */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  if (q.trim().length < 2) return NextResponse.json({ hits: [] });

  try {
    return NextResponse.json({ hits: await searchPolet(q) });
  } catch (e) {
    return NextResponse.json(
      { hits: [], error: e instanceof Error ? e.message : "search failed" },
      { status: 502 });
  }
}
