import { PRINT_PACKS, PRINT_PDFS, TASTING_CARD_PDFS, printFileUrl } from "@/lib/print-packs";

export default function PrintDownloads({ eventId }: { eventId: string }) {
  if (!PRINT_PACKS[eventId]) return null;
  return <div className="setup-print-downloads">
    <div>
      <b>Tasting cards</b>
      <div className="row" style={{ marginTop: ".5rem" }}>{TASTING_CARD_PDFS.map(file => <div key={file.file}>
        <a className="btn" href={printFileUrl(eventId, file.file)} target="_blank" rel="noreferrer">{file.title} ↗</a>
        <p className="small">{file.instruction}</p>
      </div>)}</div>
      <p className="small">Single-sided, A4 landscape, 100%. Two A5 cards per sheet. Cut in half.</p>
    </div>
    {PRINT_PDFS.map(file => <div key={file.file}>
      <a className="btn" href={printFileUrl(eventId, file.file)} target="_blank" rel="noreferrer">{file.title} ↗</a>
      <p className="small">{file.instruction}</p>
    </div>)}
  </div>;
}
