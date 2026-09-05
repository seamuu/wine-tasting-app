import { updateEvent } from "../../actions";
import { ID_SETS, POSITIONS, printMath } from "@/lib/card";

type Wine = {
  id: string; position: string; name: string; side: string;
  priceBucket: number | null; keyFlavours: string[];
  keyBody: number | null; keyAcidity: number | null; keyTannin: number | null;
  keySweetness: number | null; keyAlcohol: number | null;
};

type EventRow = {
  id: string; name: string; idSet: string; revealMode: string;
  wineCount: number; guestCount: number | null; wines: Wine[];
};

function Check({ done, children, warn }: { done: boolean; children: React.ReactNode; warn?: boolean }) {
  const colour = done ? "var(--olive)" : warn ? "var(--warn)" : "var(--ink-soft)";
  return (
    <li style={{ display: "flex", gap: ".6rem", alignItems: "baseline", color: colour, marginBottom: ".4rem" }}>
      <span aria-hidden style={{ fontWeight: 700 }}>{done ? "✓" : warn ? "!" : "○"}</span>
      <span className="small" style={{ color: "inherit" }}>{children}</span>
    </li>
  );
}

/**
 * Everything that has to be decided before paper comes out of the printer, in
 * the order it has to be decided, with the arithmetic done for you.
 *
 * The vocabulary and the number of wines are printed onto the card, so they are
 * grouped together and flagged as such — changing either after printing means
 * printing again, and that is the one mistake this screen exists to prevent.
 */
export default function SetupTab({ event }: { event: EventRow }) {
  const idSet = ID_SETS[event.idSet] ?? ID_SETS.house;
  const capacity = idSet.a.length * idSet.b.length;
  const guests = event.guestCount ?? 0;
  const { cards, sheets } = printMath(guests || 0, event.wineCount);

  const keyed = event.wines.filter((w) =>
    w.priceBucket != null || w.keyFlavours.length > 0 ||
    w.keyBody != null || w.keyAcidity != null || w.keyTannin != null ||
    w.keySweetness != null || w.keyAlcohol != null).length;

  const allWinesIn = event.wines.length >= event.wineCount;
  const overCapacity = guests > capacity;
  const printUrl = `/card-v2.html?ids=${event.idSet}&wines=${event.wineCount}`;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(300px,360px)", gap: "2.5rem", alignItems: "start" }}>
      <section className="stack" style={{ gap: "2rem" }}>
        <div>
          <div className="section-title">The night</div>
          <form action={updateEvent} className="stack" style={{ gap: "1rem" }}>
            <input type="hidden" name="eventId" value={event.id} />

            <label className="field">
              <span className="label">Name</span>
              <input type="text" name="name" defaultValue={event.name} />
            </label>

            <div className="row" style={{ gap: ".8rem", alignItems: "flex-start" }}>
              <label className="field" style={{ flex: 1, minWidth: "150px" }}>
                <span className="label">How many people</span>
                <input type="number" name="guestCount" min={1} max={capacity}
                       defaultValue={event.guestCount ?? ""} placeholder="e.g. 9" />
                <span className="small">Used to work out the print run and to tell you when every card is in.</span>
              </label>

              <label className="field" style={{ flex: 1, minWidth: "150px" }}>
                <span className="label">When is the wine revealed</span>
                <select name="revealMode" defaultValue={event.revealMode}>
                  <option value="BLIND">Blind — hidden until you reveal it</option>
                  <option value="OPEN">Open — shown from the start</option>
                </select>
                <span className="small">
                  {event.revealMode === "BLIND"
                    ? "The present screen shows only the letter, so the laptop is safe to leave facing the room."
                    : "Every screen shows the bottle. A guided tasting rather than a guessing game."}
                </span>
              </label>
            </div>

            <button className="btn btn-primary" type="submit" style={{ alignSelf: "flex-start" }}>Save</button>
          </form>
        </div>

        <div>
          <div className="section-title">Printed onto the card</div>
          <p className="lede" style={{ marginBottom: "1rem" }}>
            These two end up on paper. Change them after printing and the pack is wrong — the
            letters won&rsquo;t match the flight, or the names won&rsquo;t match the room.
          </p>
          <form action={updateEvent} className="stack" style={{ gap: "1rem" }}>
            <input type="hidden" name="eventId" value={event.id} />

            <label className="field">
              <span className="label">How many wines</span>
              <select name="wineCount" defaultValue={event.wineCount}>
                {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <option key={n} value={n}>{n} — letters A to {POSITIONS[n - 1]}</option>
                ))}
              </select>
            </label>

            <label className="field">
              <span className="label">What people are called</span>
              <select name="idSet" defaultValue={event.idSet}>
                {Object.entries(ID_SETS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label} — {v.a.length * v.b.length} people</option>
                ))}
              </select>
            </label>

            <div>
              <span className="label">The {capacity} names on this card</span>
              <div className="row" style={{ gap: ".3rem", marginTop: ".45rem" }}>
                {idSet.a.map((a) => idSet.b.map((b) => (
                  <span key={`${a}-${b}`} className="pill" style={{ fontSize: ".7rem" }}>{a} {b}</span>
                )))}
              </div>
            </div>

            <button className="btn btn-primary" type="submit" style={{ alignSelf: "flex-start" }}>Save</button>
          </form>
        </div>
      </section>

      <section className="stack" style={{ gap: "1.5rem" }}>
        <div className="card">
          <div className="section-title">Print the pack</div>

          {guests === 0 ? (
            <p className="small">Say how many people are coming and this works out the print run.</p>
          ) : (
            <>
              <p className="serif" style={{ fontSize: "2.1rem", margin: ".1rem 0", lineHeight: 1.1 }}>
                {sheets} <span style={{ fontSize: "1rem" }}>A4 sheets</span>
              </p>
              <p className="small">
                {guests} {guests === 1 ? "person" : "people"} × {event.wineCount}{" "}
                {event.wineCount === 1 ? "wine" : "wines"} = {cards} cards, two to a sheet.
              </p>
              <p className="small" style={{ marginTop: ".5rem" }}>
                <b style={{ color: "var(--ink)" }}>Double-sided</b>, flipped on the short edge —
                white on the front, red on the back. Everyone takes one card per wine and uses
                whichever side matches what&rsquo;s in the glass.
              </p>
            </>
          )}

          {overCapacity && (
            <p className="note" style={{ marginTop: ".9rem" }}>
              {guests} people but only {capacity} names in <b>{idSet.label}</b>. Two people would
              share a name and their cards would merge. Pick a bigger set or trim the guest list.
            </p>
          )}

          <div className="row" style={{ marginTop: "1rem" }}>
            <a className="btn btn-primary" href={printUrl} target="_blank" rel="noreferrer">
              Open the card ↗
            </a>
            <a className="btn" href={`${printUrl}&print=a4`} target="_blank" rel="noreferrer">
              Straight to A4 ↗
            </a>
          </div>
          <p className="small" style={{ marginTop: ".7rem" }}>
            Print <b style={{ color: "var(--ink)" }}>one sheet first</b>, fill it in, and scan it
            before running off the rest.
          </p>
        </div>

        <div className="card">
          <div className="section-title">Name cards</div>
          <p className="small" style={{ marginBottom: ".8rem" }}>
            {capacity} little cards, one per pair, {Math.ceil(capacity / 10)} sheets of A4. Cut
            them up and let people take one at the door — that&rsquo;s who they are for the night.
            There&rsquo;s also a pick-your-own version where the two halves are separate decks.
          </p>
          <a className="btn" href={`/names.html?ids=${event.idSet}`} target="_blank" rel="noreferrer">
            Open the name cards ↗
          </a>
        </div>

        <div className="card">
          <div className="section-title">Ready?</div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            <Check done={guests > 0 && !overCapacity} warn={overCapacity}>
              {guests > 0 ? `${guests} people` : "Guest count not set"}
            </Check>
            <Check done={allWinesIn} warn={event.wines.length > event.wineCount}>
              {event.wines.length} of {event.wineCount} wines added
              {event.wines.length > event.wineCount && " — more wines than letters on the card"}
            </Check>
            <Check done={keyed === event.wines.length && event.wines.length > 0}>
              {keyed} of {event.wines.length} have an answer key
              {keyed < event.wines.length && " — the rest get scored against the room"}
            </Check>
            <Check done={false}>Test card printed and scanned</Check>
          </ul>
          <p className="small" style={{ marginTop: ".8rem" }}>
            Nothing here blocks you. A wine with no key still scores — everyone is measured
            against what the room agreed on instead.
          </p>
        </div>
      </section>
    </div>
  );
}
