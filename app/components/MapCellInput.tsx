"use client";

import { useState } from "react";
import GridMap from "./GridMap";
import { parseCell, pointCell, MAPS, type ActiveMapMode } from "@/lib/map";

export default function MapCellInput({ name, mode, initial = "" }: { name: string; mode: ActiveMapMode; initial?: string }) {
  const [cell, setCell] = useState(initial);
  const normalized = parseCell(cell, mode)?.cell;
  return <div className="stack" style={{ gap: ".5rem" }}>
    <label className="field"><span className="label">Map square</span>
      <input type="text" name={name} value={cell} onChange={(event) => setCell(event.target.value.toUpperCase())}
        placeholder="e.g. F4" maxLength={5} autoComplete="off" autoCapitalize="characters" spellCheck={false}
        pattern={`[A-${String.fromCharCode(64 + MAPS[mode].columns)}a-${String.fromCharCode(96 + MAPS[mode].columns)}]\\s*([1-9]|10)`} />
      <span className="small">Letter, then number. Leave blank for no answer. Squares can be used more than once.</span>
    </label>
    <details className="map-input-picker"><summary className="small">Or choose on the map</summary>
      <GridMap mode={mode} selectedCell={normalized} onPick={(point) => setCell(pointCell(point, mode)!)} />
    </details>
  </div>;
}
