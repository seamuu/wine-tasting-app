import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { optionOrder } from "@/lib/quiz";
import { pricePuzzleClues } from "@/lib/price-puzzle";
import { PRINT_PACKS } from "@/lib/print-packs";
import { REGION_CLUES, AROMA_CLUES, CLUE_SOURCES, PRODUCTION_CLUES } from "@/lib/quiz-clues";
import "./sheets.css";

export const dynamic = "force-dynamic";

function SheetHeader({ number, title, subtitle, eventName }: { number: number; title: string; subtitle: string; eventName: string }) {
  return <header className="clue-head"><div><div className="clue-kicker">{eventName} · {String(number).padStart(2, "0")} / 04</div><h2>{title}</h2><p>{subtitle}</p></div>
    <div className="clue-person"><Image src="/illustrations/wine-editorial-v2.png" width={2172} height={724} unoptimized loading="eager" alt="Abstract editorial collage with terracotta and sage paper shapes, map contours and a looping ink line" />{number === 1 && <div>Team <span /></div>}</div>
  </header>;
}
function SourceFooter({ children, source = "grapes" }: { children: React.ReactNode; source?: keyof typeof CLUE_SOURCES }) {
  return <footer className="clue-footer"><span>{children}</span><span>Reference: <a href={CLUE_SOURCES[source]}>Vinmonopolet{source === "champagne" ? " / Comité Champagne" : ""}</a></span></footer>;
}
function FranceMap() {
  const x = 28, y = 28, width = 944, height = 894;
  return <svg viewBox="0 0 1000 950" className="mock-france-map" role="img" aria-label="French wine regions with a grid, columns A to J and rows 1 to 10. Region names remain visible as hints.">
    <title>France wine regions · grid A–J, 1–10</title>
    <image href="/maps/france-jancis-reference.png" x={x} y={y} width={width} height={height} preserveAspectRatio="xMidYMid meet" />
    {Array.from({ length: 11 }, (_, i) => <g key={i} stroke="#245a6a" strokeWidth=".8" opacity=".4">
      <line x1={x + i * width / 10} x2={x + i * width / 10} y1={y} y2={y + height} />
      <line x1={x} x2={x + width} y1={y + i * height / 10} y2={y + i * height / 10} />
    </g>)}
    {Array.from({ length: 10 }, (_, i) => <g key={i} fill="#245a6a" fontFamily="monospace" fontWeight="700" fontSize="13" textAnchor="middle">
      <text x={x + (i + .5) * width / 10} y="19">{String.fromCharCode(65 + i)}</text>
      <text x={x + (i + .5) * width / 10} y="942">{String.fromCharCode(65 + i)}</text>
      <text x="12" y={y + (i + .5) * height / 10 + 4}>{i + 1}</text>
      <text x="988" y={y + (i + .5) * height / 10 + 4}>{i + 1}</text>
    </g>)}
  </svg>;
}

export default async function QuizPreview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id }, include: { wines: { orderBy: { position: "asc" } } } });
  if (!event) notFound();
  const wines = event.wines;
  const productionClues = PRODUCTION_CLUES.filter(clue => wines.some(wine => wine.sourceRef === clue.sourceRef));
  const priceClues = pricePuzzleClues(wines);
  const prices = optionOrder(id, "PRICE", wines);
  const notes = optionOrder(id, "NOTE", wines);
  const volume = (wineId: string) => wines.find(wine => wine.id === wineId)?.sourceRef === "19899302" ? "37.5" : "75";
  return <main className="quiz-mock">
    <div className="clue-toolbar"><div><div className="eyebrow">{event.name} · print preview</div><h1>Wine tasting quiz</h1><p>Three scored questions. Share the clues as a team. This pack is for paper scoring; the live quiz has not been changed.</p></div><div className="row">{PRINT_PACKS[id] && <Link className="btn btn-primary" href={`/t/${id}?tab=setup&step=print#setup-print`}>Print section →</Link>}<Link className="btn" href={`/t/${id}/preview`}>Wine reveals →</Link><a className="btn" href="#france-map">See the clue sheets ↓</a></div></div>
    <div className="clue-pack">
      <section className="clue-sheet clue-team" id="answer-sheet">
        <SheetHeader eventName={event.name} number={1} title="The team’s answers" subtitle="Write your answers before each reveal." />
        <div className="clue-captain"><b>Team captain</b><span />Final call if you disagree.</div>
        <div className="clue-score">1 point per answer · 3 per wine · {wines.length * 3} possible points.</div>
        <table className="clue-team-table"><thead><tr><th>Glass</th><th>Map square</th><th>Region</th><th>Note no.</th><th>Price no.</th><th>Points<br />host fills in</th></tr></thead><tbody>{wines.map(wine => <tr key={wine.id}><th>{wine.position}</th><td /><td /><td /><td /><td><span>/ 3</span></td></tr>)}</tbody></table>
        <p className="clue-small">Regions can repeat. Burgundy is enough; no village or vineyard needed.</p>
      </section>

      <section className="clue-sheet clue-map-sheet" id="france-map">
        <SheetHeader eventName={event.name} number={2} title="Map master" subtitle="Use the map and clues to pick a wine region." />
        <div className="clue-map-size"><FranceMap /></div>
        <table className="clue-region-table"><thead><tr><th>Region / where to look</th><th>Grapes and styles that could fit</th></tr></thead><tbody>{REGION_CLUES.map(region => <tr key={region.region}><th>{region.region}<small>{region.place}</small></th><td>{region.clue}</td></tr>)}</tbody></table>
        <div className="clue-map-instruction"><b>Write a square and a region.</b> Column letter first, then row number. More than one glass can come from the same region. These are examples of French styles; not every region above has a wine in the tasting.</div>
        <SourceFooter source="regions">Map: JancisRobinson.com, World Atlas of Wine, 8th ed. © Octopus Publishing Group. Supplied by Séamus; grid added. Burgundy counts as a region-level answer.</SourceFooter>
      </section>

      <section className="clue-sheet clue-nose-sheet" id="reference-note">
        <SheetHeader eventName={event.name} number={3} title="Aroma master" subtitle="Match the glass to one description." />
        <div className="clue-aroma-guide">{AROMA_CLUES.map(([smell, clue]) => <div key={smell}><b>{smell}</b><p>{clue}</p></div>)}</div>
        <div className="clue-vocab"><b>Read the Norwegian clues:</b> eple = apple · morell / kirsebær = cherry · bringebær = raspberry · jordbær = strawberry · urt = herb · fat = oak · bakverk = pastry · skogbunn = forest floor · frisk = fresh acidity · fyldig = full-bodied.</div>
        <h3>Six anonymous descriptions</h3>
        <ol className="clue-note-options">{notes.map(wine => <li key={wine.id}>{wine.tastingNote ?? "No tasting note added"}</li>)}</ol>
        <div className="clue-tip"><b>Stuck between two?</b> Compare the differences. Do both mention citrus, but only one mentions oak? Does one sound softer? Ask the team to compare the texture. Missing one aroma does not rule a description out.</div>
        <SourceFooter>One description per wine. Polet’s original Norwegian.</SourceFooter>
      </section>

      <section className="clue-sheet clue-price-sheet" id="reference-price">
        <SheetHeader eventName={event.name} number={4} title="Price master" subtitle="Match the glass to a bottle price." />
        <div className="clue-price-options">{prices.map((wine, index) => <div key={wine.id}><b>{index + 1}</b><strong>kr {Number(wine.priceNok).toFixed(2)}</strong><span>{volume(wine.id)} cl bottle</span></div>)}</div>
        {priceClues ? <>
          <h3>Clues for these six bottles</h3>
          <div className="clue-production-cards">{priceClues.map(clue => <article key={clue.title}><b>{clue.title}</b><p>{clue.text}</p></article>)}</div>
          <div className="clue-tip">Identify the styles, compare the tasting notes, then use each price once. These comparisons apply to the bottles we bought, not to wine prices in general.</div>
        </> : <>
          <h3>Production clues from this tasting</h3>
          <div className="clue-production-cards">{productionClues.map(clue => <article key={clue.sourceRef}><b>{clue.title}</b><p>{clue.text}</p></article>)}</div>
          <p className="clue-small">These explain winemaking, but do not determine an exact price. Price matching is a guess for this flight.</p>
        </>}
        <SourceFooter source="oak">Prices and bottle sizes from the receipt and Polet. Oak clues refer to Polet’s descriptions.</SourceFooter>
      </section>


    </div>
  </main>;
}
