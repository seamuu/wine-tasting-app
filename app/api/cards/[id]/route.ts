import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { tasterName } = await req.json();
  const card = await prisma.card.update({
    where: { id },
    data: { tasterName: tasterName || null },
  });
  return NextResponse.json({ card });
}
