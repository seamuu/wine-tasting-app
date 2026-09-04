import { NextResponse } from "next/server";
import { fetchPolet, draftKey, isPoletUrl } from "@/lib/vinmonopolet";
import { bucketForPrice } from "@/lib/card";

/** Preview what a Vinmonopolet link would fill in, without saving anything. */
export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get("url");
  if (!url || !isPoletUrl(url))
    return NextResponse.json({ error: "Pass a vinmonopolet.no product URL" }, { status: 400 });
  try {
    const wine = await fetchPolet(url);
    return NextResponse.json({
      wine,
      priceBucket: wine.priceNok != null ? bucketForPrice(wine.priceNok) : null,
      draftKey: draftKey(wine),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "lookup failed" }, { status: 502 });
  }
}
