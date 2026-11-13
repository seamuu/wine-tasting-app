/** Coordinates are commune centres, not vineyard boundaries. Region shapes are
 * schematic orientation aids. They do not define appellations or quiz cells. */
export type FranceWineRegion = "champagne" | "burgundy" | "bordeaux" | "loire" | "alsace" | "rhone";
export type WineMapLocation = {
  region: FranceWineRegion;
  title: string;
  place: string;
  caption: string;
  producerBase?: boolean;
  point?: { longitude: number; latitude: number };
};

export function franceMapPoint(longitude: number, latitude: number) {
  return { x: 32 + (longitude + 6) / 16 * 556, y: 32 + (51.7 - latitude) / 10.7 * 530 };
}

function area(points: [number, number][]) {
  return points.map(([lon, lat], index) => {
    const { x, y } = franceMapPoint(lon, lat);
    return `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ") + "Z";
}

export const FRANCE_WINE_REGIONS: {
  id: FranceWineRegion; name: string; colour: string; shape: string; label: [number, number];
}[] = [
  { id: "champagne", name: "Champagne", colour: "#83a58b", label: [385, 117], shape:
    area([[3.0,49.08],[3.5,49.28],[3.6,49.43],[4.25,49.43],[4.65,49.13],[4.5,48.73],[4.0,48.65],[3.7,48.93],[3.25,48.9]]) +
    area([[4.2,48.33],[4.65,48.38],[4.7,47.98],[4.3,47.9],[4.15,48.1]]) },
  { id: "burgundy", name: "Burgundy", colour: "#c18178", label: [488, 271], shape:
    area([[3.5,48.02],[3.95,48.06],[4.1,47.85],[3.85,47.65],[3.5,47.7]]) +
    area([[4.65,47.4],[5.08,47.38],[5.0,46.93],[5.05,46.7],[4.95,46.28],[4.65,46.23],[4.45,46.5],[4.55,46.88],[4.65,47.2]]) },
  { id: "bordeaux", name: "Bordeaux", colour: "#cea56e", label: [218, 433], shape:
    area([[-0.95,45.48],[-0.65,45.42],[-0.53,45.06],[-0.05,45.03],[0.25,44.86],[0.0,44.63],[-0.15,44.43],[-0.65,44.4],[-0.86,44.7],[-0.85,45.08]]) },
  { id: "loire", name: "Loire", colour: "#9cac84", label: [230, 223], shape:
    area([[-1.8,47.18],[-1.35,47.43],[-0.65,47.56],[0.2,47.48],[0.7,47.6],[1.4,47.8],[1.9,48.0],[2.25,47.75],[2.45,47.46],[3.0,47.45],[3.02,47.05],[2.56,47.02],[2.17,47.34],[1.8,47.6],[1.4,47.55],[0.8,47.32],[0.25,47.21],[-0.65,47.3],[-1.4,47.13]]) },
  { id: "alsace", name: "Alsace", colour: "#91b3b3", label: [522, 178], shape:
    area([[7.28,47.63],[7.55,47.63],[7.72,48.14],[7.87,48.69],[7.61,48.82],[7.36,48.23]]) },
  { id: "rhone", name: "Rhône", colour: "#b599ac", label: [455, 409], shape:
    area([[4.65,45.65],[4.95,45.65],[4.97,45.04],[5.02,44.63],[5.35,44.5],[5.35,44.13],[4.82,43.86],[4.32,44.05],[4.42,44.42],[4.65,44.72],[4.63,45.13]]) },
];
