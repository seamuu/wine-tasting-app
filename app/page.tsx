import Link from "next/link";

function StepCard({
  step,
  title,
  href,
  cta,
  children,
}: {
  step: string;
  title: string;
  href: string;
  cta: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-6">
      <span className="font-mono text-xs uppercase tracking-widest text-accent">
        Step {step}
      </span>
      <h2 className="font-semibold text-lg">{title}</h2>
      <p className="text-sm text-muted leading-relaxed flex-1">{children}</p>
      <Link
        href={href}
        className="inline-flex w-fit items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-soft"
      >
        {cta}
      </Link>
    </div>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-2">
        <span className="font-mono text-xs uppercase tracking-widest text-accent">
          card-v1 &middot; MVP
        </span>
        <h1 className="text-3xl font-semibold tracking-tight">Wine Flight</h1>
        <p className="max-w-prose text-muted leading-relaxed">
          Print a card for each taster, hand out pens, then photograph the
          filled cards afterward — no phones during the tasting itself.
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2">
        <StepCard
          step="1"
          title="Print the card"
          href="/card-v1.html"
          cta="Open printable card"
        >
          One A5 card per taster, up to four wines a side. Corner marks let
          a photo be straightened out automatically later.
        </StepCard>
        <StepCard
          step="2"
          title="Scan a filled card"
          href="/scan-test.html"
          cta="Open scan tool"
        >
          Photograph a filled card and read every bubble back — corner
          detection, perspective correction and scoring all run on this
          device, no upload required.
        </StepCard>
      </div>

      <section className="flex items-center justify-between gap-4 rounded-xl border border-line bg-surface p-6">
        <div>
          <p className="font-semibold">Events</p>
          <p className="text-sm text-muted">
            Set up a tasting, scan cards into it, and share the dashboard.
          </p>
        </div>
        <Link
          href="/events"
          className="shrink-0 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-soft"
        >
          View events
        </Link>
      </section>
    </main>
  );
}
