import { useId } from "react";
import geometry from "@/lib/france-map-geometry.json";
import { FRANCE_WINE_REGIONS, franceMapPoint, type WineMapLocation } from "@/lib/france-wine-map";

/** A reveal illustration, independent of the tasting's scored map mode. */
export default function FranceWineMap({ location, position }: { location: WineMapLocation; position: string }) {
  const id = useId();
  const point = location.point && franceMapPoint(location.point.longitude, location.point.latitude);
  return <figure className="origin-map">
    <header>
      <div className="label">{location.producerBase ? "The producer’s base" : "Where it’s from"}</div>
      <h3>{location.title}</h3>
      <p>{location.place}</p>
    </header>
    <svg viewBox="0 0 620 600" className="origin-map-art" role="img" aria-labelledby={`${id}-title ${id}-desc`}>
      <title id={`${id}-title`}>{`Wine ${position}: ${location.title}, France`}</title>
      <desc id={`${id}-desc`}>{`${location.place}. ${location.caption} The highlighted area shows ${FRANCE_WINE_REGIONS.find(r => r.id === location.region)?.name}; wine regions are drawn approximately.`}</desc>
      <defs>
        <clipPath id={`${id}-frame`}><rect x="24" y="24" width="572" height="548" rx="3" /></clipPath>
        <clipPath id={`${id}-land`}><path d={geometry.france} /></clipPath>
        <pattern id={`${id}-grid`} width="57.2" height="54.8" patternUnits="userSpaceOnUse" x="24" y="24">
          <path d="M57.2 0H0V54.8" fill="none" stroke="#6e9290" strokeWidth=".7" opacity=".25" />
        </pattern>
      </defs>
      <g clipPath={`url(#${id}-frame)`}>
        <rect x="24" y="24" width="572" height="548" fill="#eef0e8" />
        <g className="origin-map-neighbours">{geometry.neighbours.map(country => <path key={country.name} d={country.path} />)}</g>
        <path className="origin-map-land" d={geometry.france} />
        <g clipPath={`url(#${id}-land)`}>
          {FRANCE_WINE_REGIONS.map(region => <path key={region.id} d={region.shape} fill={region.colour}
            className={`origin-map-region ${region.id === location.region ? "is-current" : ""}`}>
            <title>{`${region.name}${region.id === location.region ? " · highlighted for this wine" : ""}`}</title>
          </path>)}
          <g className="origin-map-rivers">{geometry.rivers.map((river, index) => <path key={`${river.name}-${index}`} d={river.path} />)}</g>
        </g>
        <rect x="24" y="24" width="572" height="548" fill={`url(#${id}-grid)`} />
        <path d={geometry.france} className="origin-map-coast" />
        <text className="origin-map-country" x="290" y="349" textAnchor="middle">FRANCE</text>
        <g className="origin-map-labels">{FRANCE_WINE_REGIONS.map(region => <text key={region.id}
          x={region.label[0]} y={region.label[1]} textAnchor="middle"
          className={region.id === location.region ? "is-current" : ""}>{region.name}</text>)}</g>
        <text className="origin-map-sea" x="112" y="342" transform="rotate(-70 112 342)">Atlantic</text>
        <text className="origin-map-sea" x="404" y="549" textAnchor="middle">Mediterranean</text>
        <text className="origin-map-border-label" x="277" y="547">SPAIN</text>
        <text className="origin-map-border-label" x="545" y="359" transform="rotate(40 545 359)">ITALY</text>
        <g className="origin-map-compass" transform="translate(74 104)">
          <text y="-29" textAnchor="middle">N</text><path d="M0 -20V20M-12 8L0 -20L12 8" />
        </g>
        {point && <g className={`origin-map-pin ${location.producerBase ? "is-producer" : ""}`}
          transform={`translate(${point.x} ${point.y})`}>
          <circle className="origin-map-pin-halo" r="23" />
          <circle className="origin-map-pin-dot" r="13" />
          <text textAnchor="middle" y="5">{position}</text>
        </g>}
      </g>
      <rect x="24" y="24" width="572" height="548" rx="3" className="origin-map-frame" />
    </svg>
    <figcaption><p>{location.caption}</p><small>Wine regions shown approximately · <a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Natural Earth</a></small></figcaption>
  </figure>;
}
