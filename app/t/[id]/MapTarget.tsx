"use client";

import { useState } from "react";
import { setWineMapPoint } from "../../actions";
import SubmitButton from "../../SubmitButton";
import GridMap from "../../components/GridMap";
import { cellPoint, parseCell, pointCell, MAPS, type ActiveMapMode, type MapPoint } from "@/lib/map";

export default function MapTarget({ wineId, mode, initial, region, hasAnswers }: {
  wineId: string; mode: ActiveMapMode; initial: MapPoint; region: string; hasAnswers: boolean;
}) {
  const [point, setPoint] = useState<MapPoint>(initial);
  const [cell, setCell] = useState(pointCell(initial, mode) ?? "");
  const valid = parseCell(cell, mode)?.cell;
  return <details className="map-target-editor" open={!pointCell(initial, mode)}>
    <summary><b>Map answer</b> · {pointCell(initial, mode) ?? "choose the region’s square"}</summary>
    <p className="small">Find <b>{region || "the wine’s region"}</b> and click a representative spot. Confirm it below. Country labels are host-only hints; the team map has no names.</p>
    {hasAnswers && <p className="note">Changing this reference re-scores the saved map guesses. Keep the printed map area the same.</p>}
    <form action={setWineMapPoint} className="stack" style={{ gap: ".8rem" }}>
      <input type="hidden" name="wineId" value={wineId} />
      <input type="hidden" name="mapLatitude" value={valid ? point.mapLatitude ?? "" : ""} />
      <input type="hidden" name="mapLongitude" value={valid ? point.mapLongitude ?? "" : ""} />
      <GridMap mode={mode} labels selectedCell={valid} point={point} onPick={(value) => { setPoint(value); setCell(pointCell(value, mode)!); }} />
      <label className="field map-reference-input"><span className="label">Or type a grid reference</span>
        <input type="text" value={cell} onChange={(event) => {
          const value = event.target.value.toUpperCase(); setCell(value);
          const next = cellPoint(value, mode); if (next) setPoint(next);
        }} placeholder="e.g. F4" autoComplete="off" spellCheck={false} maxLength={5} aria-label="Map answer square" />
      </label>
      <p className="small">{MAPS[mode].title} map · right square: 1 point; neighbouring square, including diagonals: ½ point. The same square can be right for more than one wine.</p>
      <div><SubmitButton>Confirm map answer</SubmitButton></div>
    </form>
  </details>;
}
