/** Quantities match the prepared PDFs and the eight-person tasting. */
export const PRINT_PACKS: Record<string, { guests: number; teams: number; wines: number }> = {
  "imeto-julebord": { guests: 8, teams: 2, wines: 6 },
};

export const TASTING_CARD_PDFS = [
  { file: "white-tasting-cards.pdf", title: "White cards", instruction: "16 A4 sheets → 32 white cards" },
  { file: "red-tasting-cards.pdf", title: "Red cards", instruction: "8 A4 sheets → 16 red cards" },
] as const;

export const PRINT_PDFS = [
  { file: "quiz-pack.pdf", title: "Quiz pack", instruction: "2 copies, single-sided." },
  { file: "map-master.pdf", title: "Map", instruction: "2 copies, colour." },
  { file: "name-badges.pdf", title: "Name tags", instruction: "1 A4 sheet, single-sided. Cut out 8 tags; 2 spare." },
] as const;

export function printFileUrl(id: string, file: string) {
  return `/print/${encodeURIComponent(id)}/${encodeURIComponent(file)}`;
}
