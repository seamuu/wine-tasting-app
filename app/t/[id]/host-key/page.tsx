import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { optionOrder } from "@/lib/quiz";

export const dynamic = "force-dynamic";
const REGIONS: Record<string, { name: string; grid: string }> = {
  "21132301": { name: "Champagne", grid: "G2–G3" },
  "10644301": { name: "Burgundy / Bourgogne", grid: "H6" },
  "20576901": { name: "Burgundy / Bourgogne", grid: "H5–H6 (broad)" },
  "16786001": { name: "Burgundy or France*", grid: "Not an exact-square answer" },
  "20063201": { name: "Burgundy / Bourgogne", grid: "H5" },
  "19899302": { name: "Bordeaux / Sauternes", grid: "D8" },
};

export default async function HostKey({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id }, include: { wines: { orderBy: { position: "asc" } } } });
  if (!event) notFound();
  const priceOrder = optionOrder(id, "PRICE", event.wines);
  const noteOrder = optionOrder(id, "NOTE", event.wines);
  return <main className="host-print">
    <div className="no-print"><Link href={`/t/${id}/quiz-preview`}>← Team print pack</Link></div>
    <header><div className="kicker">{event.name} · host only</div><h1>Wine order &amp; answer key</h1><p>Keep this sheet away from the teams. Use only the pack generated for this tasting; the option numbers differ from the test pack.</p></header>
    <table><thead><tr><th>Glass</th><th>Bottle</th><th>Accepted region / reference grid</th><th>Note no.</th><th>Price no. / bottle price</th></tr></thead><tbody>{event.wines.map(wine => {
      const region = REGIONS[wine.sourceRef ?? ""];
      return <tr key={wine.id}><th>{wine.position}</th><td>{wine.name}<small>{wine.sourceRef} · {wine.side === "RED" ? "red" : "white / sparkling"}</small></td><td>{region?.name ?? wine.region ?? wine.country ?? "Check origin"}<small>{region?.grid ?? "Region-level answer"}</small></td><td>{noteOrder.findIndex(item => item.id === wine.id) + 1}</td><td>{priceOrder.findIndex(item => item.id === wine.id) + 1}<small>kr {Number(wine.priceNok).toFixed(2)} · {wine.sourceRef === "19899302" ? "37.5" : "75"} cl</small></td></tr>;
    })}</tbody></table>
    <section><h2>Scoring</h2><p>Map: <b>1 point for the correct region</b>. A correct region counts even if the grid square is imperfect. Accept Burgundy for any of the Burgundy wines; no village or vineyard required. Note: <b>1 point</b> for the matching description. Price: <b>1 point</b> for the matching purchase price. No half-points. {event.wines.length * 3} possible points across {event.wines.length} wines.</p><p>Score the team sheets on paper. The app’s existing automatic quiz scoring has different map and category rules. Use it for tasting-card collection and wine reveals.</p></section>
    <section><h2>Before pouring</h2><ol><li>Check the actual labels against this list, including vintages. The vintages here came from the current Polet listings.</li><li>Cover each bottle and label it with its glass letter. Keep the same letters all evening.</li><li>Deal each person a different two-part card name and one role sheet. Everyone keeps their name throughout the tasting.</li><li>For each wine: individual cards first, team discussion, then collect the team’s answers before the reveal.</li></ol></section>
    <section className="note"><p><b>* Pascerette:</b> Polet lists France, while the producer is based in Burgundy. A more precise grape origin for this cuvée has not been confirmed. Accept France or Burgundy for this bottle so an unsupported precision does not cost anyone a point. No exact grid square is required.</p></section>
    <footer>Print one copy for the host. All six wine facts and prices are copied from the receipt tasting. Tea is excluded.</footer>
    <style>{`
      @page{size:A4 portrait;margin:12mm}.host-print{max-width:186mm;margin:20px auto;color:#29221c;font:10pt/1.45 system-ui,sans-serif}.kicker{font:8pt monospace;text-transform:uppercase;letter-spacing:.1em;color:#761b30}h1{font:28pt Georgia,serif;margin:3mm 0}h2{font:14pt Georgia,serif;margin:5mm 0 2mm}header p{font-size:9pt;color:#6b6056}table{width:100%;border-collapse:collapse;margin-top:5mm;font-size:8.5pt}th,td{border:1px solid #d9cfc0;padding:2.5mm;text-align:left;vertical-align:top}thead th{background:#f8f4ed;font-size:8pt}tbody th{font:17pt Georgia,serif}td small{display:block;color:#6b6056;font-size:7.5pt;margin-top:1mm}section p,section li{font-size:9pt}ol{padding-left:5mm}li{margin-bottom:2mm}.note{padding:2mm 3mm;background:#f8f4ed}.note p{font-size:8pt;margin:0}footer{border-top:1px solid #d9cfc0;padding-top:3mm;margin-top:5mm;font-size:7pt;color:#6b6056}.no-print{margin-bottom:1rem}@media print{body{background:white}.host-print{margin:0}.no-print{display:none}thead{display:table-header-group}tr,section{break-inside:avoid}*{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
    `}</style>
  </main>;
}
