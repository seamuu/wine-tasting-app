import { MAPS, MAP_FRAME, parseCell, cellPoint, mapPointToSvg, svgToMapPoint, mapScore, type ActiveMapMode, type MapPoint } from "@/lib/map";

export type MapMarker = { cell: string; label: string; title: string };
export default function GridMap({ mode, selectedCell, point, markers = [], labels = false, reveal = false, onPick }: {
  mode: ActiveMapMode; selectedCell?: string | null; point?: MapPoint; markers?: MapMarker[];
  labels?: boolean; reveal?: boolean; onPick?: (point: Required<MapPoint>) => void;
}) {
  const grid = MAPS[mode], frameHeight = grid.height - MAP_FRAME.y - MAP_FRAME.bottom;
  const cellWidth = MAP_FRAME.width / grid.columns, cellHeight = frameHeight / grid.rows;
  const selected = selectedCell ? parseCell(selectedCell, mode) : null;
  const location = point ? mapPointToSvg(point, mode) : null;
  return <div className={`map-canvas map-${mode.toLowerCase()}`}>
    <svg className={`grid-map ${onPick ? "map-interactive" : ""}`} viewBox={`0 0 ${grid.width} ${grid.height}`} role="img"
      aria-label={`${grid.title} grid map, columns A to ${String.fromCharCode(64 + grid.columns)}, rows 1 to ${grid.rows}${onPick ? ". Click a location, or use arrow keys. You can also type a cell below." : ""}`}
      tabIndex={onPick ? 0 : undefined}
      onClick={onPick ? (event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        const value = svgToMapPoint((event.clientX - bounds.left) / bounds.width * grid.width, (event.clientY - bounds.top) / bounds.height * grid.height, mode);
        if (value) onPick(value);
      } : undefined}
      onKeyDown={onPick ? (event) => {
        const directions: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
        if (!directions[event.key]) return;
        event.preventDefault();
        const [dx, dy] = directions[event.key];
        const col = Math.max(0, Math.min(grid.columns - 1, (selected?.column ?? Math.floor(grid.columns / 2)) + dx));
        const row = Math.max(0, Math.min(grid.rows - 1, (selected?.row ?? Math.floor(grid.rows / 2)) + dy));
        onPick(cellPoint(`${String.fromCharCode(65 + col)}${row + 1}`, mode)!);
      } : undefined}>
      <title>{`${grid.title} · ${grid.version}`}</title>
      <image href={`/maps/${mode.toLowerCase()}.svg`} width={grid.width} height={grid.height} />
      {labels && <image href={`/maps/${mode.toLowerCase()}-labels.svg`} width={grid.width} height={grid.height} />}
      {Array.from({ length: grid.rows }, (_, row) => Array.from({ length: grid.columns }, (_, column) => {
        const cell = `${String.fromCharCode(65 + column)}${row + 1}`;
        const score = reveal && selected ? mapScore(cell, selected.cell, mode) : 0;
        return <rect key={cell} x={MAP_FRAME.x + column * cellWidth} y={MAP_FRAME.y + row * cellHeight} width={cellWidth} height={cellHeight}
          className={selected?.cell === cell ? "map-selected-cell" : score === .5 ? "map-neighbour-cell" : "map-grid-cell"}><title>{cell}</title></rect>;
      }))}
      {Array.from({ length: grid.columns }, (_, col) => <g key={col} className="map-grid-label">
        <text x={MAP_FRAME.x + (col + .5) * cellWidth} y={23} textAnchor="middle">{String.fromCharCode(65 + col)}</text>
        <text x={MAP_FRAME.x + (col + .5) * cellWidth} y={grid.height - 10} textAnchor="middle">{String.fromCharCode(65 + col)}</text>
      </g>)}
      {Array.from({ length: grid.rows }, (_, row) => <g key={row} className="map-grid-label">
        <text x={23} y={MAP_FRAME.y + (row + .5) * cellHeight + 5} textAnchor="middle">{row + 1}</text>
        <text x={grid.width - 22} y={MAP_FRAME.y + (row + .5) * cellHeight + 5} textAnchor="middle">{row + 1}</text>
      </g>)}
      {location && <g className="map-target-pin"><circle cx={location.x} cy={location.y} r={9} /><path d={`M${location.x - 14},${location.y}h28 M${location.x},${location.y - 14}v28`} /></g>}
      {markers.map((marker, i) => {
        const center = cellPoint(marker.cell, mode);
        if (!center) return null;
        const projected = mapPointToSvg(center, mode)!;
        const sameCell = markers.filter((m) => m.cell === marker.cell);
        const offset = sameCell.indexOf(marker) - (sameCell.length - 1) / 2;
        const x = projected.x + Math.sin(offset * 1.5) * cellWidth * .23;
        const y = projected.y + (sameCell.length > 1 ? Math.cos(offset * 1.5) * cellHeight * .22 : 0);
        return <g className="map-team-pin" key={`${marker.title}-${i}`}><title>{`${marker.title} · ${marker.cell}`}</title>
          <circle cx={x} cy={y} r={mode === "WORLD" ? 9 : 12} /><text x={x} y={y + 4} textAnchor="middle">{marker.label}</text></g>;
      })}
    </svg>
  </div>;
}
