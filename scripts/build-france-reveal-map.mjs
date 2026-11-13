// node scripts/build-france-reveal-map.mjs <countries.geojson> <rivers.geojson>
// Natural Earth public-domain geography; no wine identities in the base asset.
import { readFile, writeFile } from "node:fs/promises";
import { loadTs } from "./load-ts.mjs";
const { franceMapPoint } = await loadTs("../lib/france-wine-map.ts");
if (process.argv.length < 4) throw new Error("Pass Natural Earth countries and rivers GeoJSON files");
const countries = JSON.parse(await readFile(process.argv[2], "utf8"));
const rivers = JSON.parse(await readFile(process.argv[3], "utf8"));
const project = ([lon, lat]) => {
  const { x, y } = franceMapPoint(lon, lat);
  return [x, y];
};
const line = points => points.map(([x,y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
const polygon = feature => {
  const polygons = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  return polygons.filter(poly => poly[0].some(([lon,lat]) => lon > -7 && lon < 11 && lat > 40 && lat < 53))
    .map(poly => poly.map(ring => line(ring.map(project)) + "Z").join(" ")).join(" ");
};
// Retain a point when it adds at least 1.5 SVG units to the line. Keep endpoints.
const simplify = points => points.filter((p,i) => i === 0 || i === points.length - 1 ||
  Math.hypot(p[0] - points[i - 1][0], p[1] - points[i - 1][1]) > 1.5 || i % 6 === 0);
const geometry = {
  france: polygon(countries.features.find(f => f.properties.ADMIN === "France")),
  neighbours: countries.features.filter(f => ["Spain","Italy","Switzerland","Germany","Belgium","Luxembourg","United Kingdom"].includes(f.properties.ADMIN))
    .map(f => ({ name: f.properties.ADMIN, path: polygon(f) })),
  rivers: rivers.features.filter(f => ["Seine","Loire","Garonne","Dordogne","Rhône"].includes(f.properties.name))
    .flatMap(f => {
      const lines = f.geometry.type === "LineString" ? [f.geometry.coordinates] : f.geometry.coordinates;
      return lines.filter(points => points.some(([lon,lat]) => lon > -6 && lon < 8 && lat > 42 && lat < 51))
        .map(points => ({ name: f.properties.name, path: line(simplify(points.map(project))) }));
    }),
};
await writeFile(new URL("../lib/france-map-geometry.json", import.meta.url), JSON.stringify(geometry));
console.log(`Built France, ${geometry.neighbours.length} neighbours and ${geometry.rivers.length} river segments.`);
