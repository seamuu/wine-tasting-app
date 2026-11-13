import { redirect } from "next/navigation";

/** Older links go to the printing step in Setup. */
export default async function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/t/${id}?tab=setup&step=print#setup-print`);
}
