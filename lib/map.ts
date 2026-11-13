/** Stable, versioned grids shared by the printed sheet, host and reveal. */
export const MAP_MODES = ["OFF", "EUROPE", "WORLD"] as const;
export type MapMode = (typeof MAP_MODES)[number];
export type ActiveMapMode = Exclude<MapMode, "OFF">;
export const MAPS = {
  EUROPE: { title: "Europe", version: "europe-v1", west: -15, east: 50, south: 30, north: 65, columns: 13, rows: 10, width: 1000, height: 810 },
  WORLD: { title: "World", version: "world-v1", west: -180, east: 180, south: -60, north: 85, columns: 24, rows: 10, width: 1000, height: 465 },
} as const;
export const MAP_FRAME = { x: 42, y: 34, width: 916, bottom: 34 };
export type MapPoint = { mapLatitude?: number | null; mapLongitude?: number | null };
export type MapGuess = { wineId: string; cell: string };
export const mapMode = (value: unknown): MapMode => MAP_MODES.includes(value as MapMode) ? value as MapMode : "OFF";
export const mapEnabled = (mode: unknown): mode is ActiveMapMode => mode === "EUROPE" || mode === "WORLD";

export function parseCell(value: unknown, mode: ActiveMapMode): { cell: string; column: number; row: number } | null {
  if (typeof value !== "string") return null;
  const match = value.trim().toUpperCase().match(/^([A-X])\s*([1-9]|10)$/);
  if (!match) return null;
  const column = match[1].charCodeAt(0) - 65, row = Number(match[2]) - 1;
  return column < MAPS[mode].columns && row < MAPS[mode].rows ? { cell: `${match[1]}${row + 1}`, column, row } : null;
}

export function pointCell(point: MapPoint, mode: ActiveMapMode): string | null {
  const { mapLatitude: lat, mapLongitude: lon } = point;
  const grid = MAPS[mode];
  if (lat == null || lon == null || !Number.isFinite(lat) || !Number.isFinite(lon)
    || lat < grid.south || lat > grid.north || lon < grid.west || lon > grid.east) return null;
  const column = Math.min(grid.columns - 1, Math.floor((lon - grid.west) / (grid.east - grid.west) * grid.columns));
  const row = Math.min(grid.rows - 1, Math.floor((grid.north - lat) / (grid.north - grid.south) * grid.rows));
  return `${String.fromCharCode(65 + column)}${row + 1}`;
}

export function cellPoint(cell: string, mode: ActiveMapMode): Required<MapPoint> | null {
  const parsed = parseCell(cell, mode);
  if (!parsed) return null;
  const grid = MAPS[mode];
  return {
    mapLatitude: grid.north - (parsed.row + .5) / grid.rows * (grid.north - grid.south),
    mapLongitude: grid.west + (parsed.column + .5) / grid.columns * (grid.east - grid.west),
  };
}

export function mapRoundReady(wines: MapPoint[], mode: unknown): mode is ActiveMapMode {
  return mapEnabled(mode) && wines.length >= 2 && wines.every((wine) => pointCell(wine, mode) != null);
}

/** Neighbours include diagonals; opposite edges of the world wrap in longitude. */
export function mapScore(guess: unknown, target: unknown, mode: ActiveMapMode): number {
  const a = parseCell(guess, mode), b = parseCell(target, mode);
  if (!a || !b) return 0;
  const raw = Math.abs(a.column - b.column);
  const dx = mode === "WORLD" ? Math.min(raw, MAPS[mode].columns - raw) : raw;
  const dy = Math.abs(a.row - b.row);
  return dx === 0 && dy === 0 ? 1 : dx <= 1 && dy <= 1 ? .5 : 0;
}

export function mapPointToSvg(point: MapPoint, mode: ActiveMapMode) {
  if (!pointCell(point, mode)) return null;
  const grid = MAPS[mode], height = grid.height - MAP_FRAME.y - MAP_FRAME.bottom;
  return {
    x: MAP_FRAME.x + (point.mapLongitude! - grid.west) / (grid.east - grid.west) * MAP_FRAME.width,
    y: MAP_FRAME.y + (grid.north - point.mapLatitude!) / (grid.north - grid.south) * height,
  };
}

export function svgToMapPoint(x: number, y: number, mode: ActiveMapMode): Required<MapPoint> | null {
  const grid = MAPS[mode], height = grid.height - MAP_FRAME.y - MAP_FRAME.bottom;
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < MAP_FRAME.x || x > MAP_FRAME.x + MAP_FRAME.width
    || y < MAP_FRAME.y || y > MAP_FRAME.y + height) return null;
  return {
    mapLatitude: grid.north - (y - MAP_FRAME.y) / height * (grid.north - grid.south),
    mapLongitude: grid.west + (x - MAP_FRAME.x) / MAP_FRAME.width * (grid.east - grid.west),
  };
}

const europeanNames = new Set(["albania", "andorra", "armenia", "azerbaijan", "belarus", "belgia", "belgium", "bosniaandherzegovina", "bosniahercegovina", "bulgaria", "croatia", "cyprus", "danmark", "denmark", "england", "estland", "estonia", "finland", "france", "frankrike", "georgia", "germany", "greece", "hellas", "hungary", "iceland", "ireland", "irland", "island", "italia", "italy", "kosovo", "kroatia", "kypros", "latvia", "litauen", "lithuania", "luxembourg", "luxemburg", "malta", "moldova", "monaco", "montenegro", "nederland", "netherlands", "nordmakedonia", "northmacedonia", "norway", "norge", "osterrike", "austria", "poland", "polen", "portugal", "romania", "russia", "russland", "sanmarino", "serbia", "slovakia", "slovenia", "spain", "spania", "storbritannia", "sverige", "sweden", "switzerland", "sveits", "tsjekkia", "czechia", "czechrepublic", "turkey", "tyrkia", "tyskland", "uk", "ukraine", "ukraina", "unitedkingdom", "ungarn"]);
export function outsideEurope(country: string | null | undefined): boolean {
  if (!country?.trim()) return false;
  const normalized = country.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ø/g, "o").replace(/[^a-z]/g, "");
  return !europeanNames.has(normalized);
}
