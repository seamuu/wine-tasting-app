import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createEvent, createPracticeTasting } from "./actions";
import SubmitButton from "./SubmitButton";

export const dynamic = "force-dynamic";

export default async function Home() {
  const events = await prisma.event.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { wines: true, submissions: true } } },
  });

  return (
    <main className="page">
      <div className="masthead">
        <div>
          <div className="eyebrow">Blind wine tasting</div>
          <h1>Wine Flight</h1>
        </div>
        <a className="btn btn-primary" href="#create-tasting">New tasting →</a>
      </div>

      <div className="home-flow">
        <section>
          <div className="section-title">Your tastings</div>
          {events.length === 0 ? (
            <p className="empty">Create your first tasting below.</p>
          ) : (
            <div className="grid-wines">
              {events.map((e) => (
                <Link key={e.id} href={`/t/${e.id}`} className="card" style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                  <div className="spread">
                    <h3>{e.name}</h3>
                  </div>
                  <p className="small" style={{ marginTop: ".35rem" }}>
                    {e._count.wines} {e._count.wines === 1 ? "wine" : "wines"} ·{" "}
                    {e._count.submissions} {e._count.submissions === 1 ? "card" : "cards"} scanned ·{" "}
                    {new Date(e.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="card" id="create-tasting">
          <div className="section-title">Start a new tasting</div>
          <form action={createEvent} className="stack" style={{ gap: "1rem" }}>
            <label className="field">
              <span className="label">Tasting name</span>
              <input type="text" name="name" placeholder="Friday night, four reds" required />
            </label>

            <p className="lede">Add teams and wines to set up the quiz. Each person fills in a tasting card. Scan the cards, enter the team answers, then reveal the wine.</p>

            <div><SubmitButton pending="Creating…">Create tasting →</SubmitButton></div>
          </form>
          <details className="demo-option"><summary>Try a demo first</summary>
            <p className="small">Two fictional wines, sample team answers and filled-in cards. Each new demo starts fresh.</p>
            <form action={createPracticeTasting}><SubmitButton pending="Creating demo…">Create demo tasting →</SubmitButton></form>
          </details>
        </section>
      </div>
    </main>
  );
}
