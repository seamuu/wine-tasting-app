import { CATEGORIES } from "./quiz";

export const PRACTICE_WINES = { WHITE: 'Practice white (fictional)', RED: 'Practice red (fictional)' } as const;
const practiceNames = new Set<string>([
  ...Object.values(PRACTICE_WINES),
  'Practice white \u2014 fictional', 'Practice red \u2014 fictional',
]);

type DemoEvent = { idSet: string; wineCount: number; wines: { id: string; position: string; name: string }[]; teams: { id: string; name?: string }[] };
export function isDemoTasting(event: DemoEvent) {
  return event.idSet === 'colours' && event.wineCount === 2 && event.wines.length === 2
    && event.wines.every(wine => practiceNames.has(wine.name));
}
/** Deliberately mixed sample answers: first team 7/8, second team 4/8. */
export function demoAnswerRows(event: DemoEvent) {
  if (!isDemoTasting(event)) return [];
  return [...event.teams].sort((a,b)=>(a.name ?? a.id).localeCompare(b.name ?? b.id)).flatMap((team, index) => event.wines.flatMap(wine => CATEGORIES.map(category => {
    const correct = index === 0 ? !(wine.position === 'B' && category === 'PRICE') : category === 'PRICE' || category === 'NOTE';
    return { teamId: team.id, wineId: wine.id, category, choiceId: correct ? wine.id : event.wines.find(other => other.id !== wine.id)!.id };
  })));
}
