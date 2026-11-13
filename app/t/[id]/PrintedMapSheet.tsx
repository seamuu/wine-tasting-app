import { Fragment } from "react";
import GridMap from "../../components/GridMap";
import { MAPS, type ActiveMapMode } from "@/lib/map";

/** Deliberately receives only wine letters, never the host's target locations. */
export default function PrintedMapSheet({ eventName, teamName, positions, mode }: {
  eventName: string; teamName: string; positions: string[]; mode: ActiveMapMode;
}) {
  return <section className="qs-sheet qs-map-sheet">
    <header className="printed-map-head"><div><div className="label">{eventName} · map round</div>
      <h2>{teamName} · where in {mode === "EUROPE" ? "Europe" : "the world"}?</h2></div><span>{MAPS[mode].version}</span></header>
    <p className="printed-map-instructions">Mark each wine’s letter in the square you think it comes from. Write the grid reference below: <b>letter first, number second</b>, e.g. F4. Hand in one wine at a time, before its reveal.</p>
    <GridMap mode={mode} />
    <table className="printed-map-answers"><thead><tr><th>Glass</th><th>Grid square</th><th>Glass</th><th>Grid square</th></tr></thead>
      <tbody>{Array.from({ length: Math.ceil(positions.length / 2) }, (_, i) => <tr key={i}>
        {[positions[i * 2], positions[i * 2 + 1]].map((position, j) => <Fragment key={j}><td>{position ? `Wine ${position}` : ""}</td><td key={`cell-${j}`}><span>{position ? "………" : ""}</span></td></Fragment>)}
      </tr>)}</tbody>
    </table>
    <p className="printed-map-rules"><b>Right square: 1 point.</b> Any touching square, including diagonals: ½ point. Other squares or a blank: 0. Squares may be used more than once. The world map wraps east–west; top and bottom do not touch.</p>
    <footer className="printed-map-credit">Country outlines: Natural Earth · No place names or answers are printed · {MAPS[mode].version}</footer>
  </section>;
}
