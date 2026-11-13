import { CATEGORIES, playable, type Category, type QuizWine } from "./quiz";
import { mapMode, mapRoundReady, mapScore, pointCell, parseCell, type MapGuess } from "./map";
export type ScoringCategory = Category | "MAP";
export const SCORE_TITLES: Record<ScoringCategory, string> = {
  PRICE: "Price", ORIGIN: "Origin", NOTE: "The note", GRAPE: "Grapes", MAP: "Map",
};

export type TeamAnswer = { category: string; wineId: string; choiceId: string };
export type QuizTeam = { id: string; name: string; memberCount: number; guesses: TeamAnswer[]; mapGuesses?: MapGuess[] };

/** One point for each factual answer. Opinions never affect team points. */
export function teamStandings(allWines: QuizWine[], scoredWines: QuizWine[], teams: QuizTeam[], selectedMapMode: unknown = "OFF") {
  const mode = mapMode(selectedMapMode);
  const hasMap = mapRoundReady(allWines, mode);
  const categories: ScoringCategory[] = CATEGORIES.filter((category) => playable(allWines, category));
  if (hasMap) categories.push("MAP");
  const wineIds = new Set(scoredWines.map((wine) => wine.id));
  const rows = teams.map((team) => {
    const perCategory = Object.fromEntries(categories.map((category) => [category, { right: 0, answered: 0, of: scoredWines.length }])) as Partial<Record<ScoringCategory, { right: number; answered: number; of: number }>>;
    const perWine = scoredWines.map((wine) => {
      let right = 0, answered = 0;
      for (const category of categories) {
        if (category === "MAP") {
          if (hasMap) {
            const guess = team.mapGuesses?.find((g) => g.wineId === wine.id);
            if (guess && parseCell(guess.cell, mode)) {
              answered += 1;
              perCategory.MAP!.answered += 1;
              const points = mapScore(guess.cell, pointCell(wine, mode), mode);
              right += points;
              perCategory.MAP!.right += points;
            }
          }
          continue;
        }
        const guess = team.guesses.find((g) => g.wineId === wine.id && g.category === category);
        if (guess && allWines.some((w) => w.id === guess.choiceId)) {
          answered += 1;
          perCategory[category]!.answered += 1;
          if (guess.choiceId === wine.id) { right += 1; perCategory[category]!.right += 1; }
        }
      }
      return { wineId: wine.id, position: wine.position, right, answered, of: categories.length };
    });
    const right = perWine.reduce((n, wine) => n + wine.right, 0);
    const answered = perWine.reduce((n, wine) => n + wine.answered, 0);
    const of = wineIds.size * categories.length;
    return { team, right, answered, of, average: scoredWines.length ? right / scoredWines.length : 0, perCategory, perWine, rank: 0 };
  }).sort((a, b) => b.right - a.right || a.team.name.localeCompare(b.team.name));
  rows.forEach((row, i) => { row.rank = i > 0 && row.right === rows[i - 1].right ? rows[i - 1].rank : i + 1; });
  const specialists = categories.flatMap((category) => {
    const top = Math.max(0, ...rows.map((row) => row.perCategory[category]!.right));
    return top > 0 ? [{ category, right: top, of: scoredWines.length,
      teams: rows.filter((row) => row.perCategory[category]!.right === top).map((row) => row.team.name) }] : [];
  });
  return { categories, rows, specialists };
}
