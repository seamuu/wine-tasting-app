/** One saved cursor, shared by the host and the room's live display. */
export const ROUND_STEPS = ["COLLECT", "ANSWERS", "REVEAL", "TASTING", "QUIZ", "STANDINGS"] as const;
export type RoundStep = (typeof ROUND_STEPS)[number];
export const STEP_LABELS: Record<RoundStep, string> = {
  COLLECT: "Collect cards", ANSWERS: "Team answers", REVEAL: "The wine",
  TASTING: "Tasting results", QUIZ: "Quiz results", STANDINGS: "Standings",
};
export const RESULT_STEPS = ROUND_STEPS.slice(2);
export function isRoundStep(value: unknown): value is RoundStep {
  return ROUND_STEPS.includes(value as RoundStep);
}

export function nextRound(
  wines: { position: string }[], position: string, step: RoundStep,
): { position: string; step: RoundStep } | null {
  const sorted = [...wines].sort((a, b) => a.position.localeCompare(b.position));
  const wineIndex = sorted.findIndex((wine) => wine.position === position);
  if (wineIndex < 0) return null;
  const stepIndex = ROUND_STEPS.indexOf(step);
  if (stepIndex < ROUND_STEPS.length - 1) return { position, step: ROUND_STEPS[stepIndex + 1] };
  const next = sorted[wineIndex + 1];
  return next ? { position: next.position, step: "COLLECT" } : null;
}

/** A historical summary must never include results from a later glass. */
export function revealedThrough<T extends { position: string; stage: string }>(wines: T[], position: string): T[] {
  return wines.filter((wine) => wine.stage === "REVEALED" && wine.position <= position)
    .sort((a, b) => a.position.localeCompare(b.position));
}
