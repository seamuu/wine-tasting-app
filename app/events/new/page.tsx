"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FLIGHT_POSITIONS } from "@/lib/mappings";

type WineRow = { flightPosition: string; name: string; producer: string; vintage: string };

const emptyWine = (letter: string): WineRow => ({
  flightPosition: letter,
  name: "",
  producer: "",
  vintage: "",
});

export default function NewEventPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [wines, setWines] = useState<WineRow[]>(FLIGHT_POSITIONS.map(emptyWine));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function updateWine(i: number, patch: Partial<WineRow>) {
    setWines((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        date,
        wines: wines
          .filter((w) => w.name.trim())
          .map((w) => ({
            flightPosition: w.flightPosition,
            name: w.name,
            producer: w.producer || undefined,
            vintage: w.vintage ? Number(w.vintage) : undefined,
          })),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Something went wrong.");
      return;
    }
    const { event } = await res.json();
    router.push(`/events/${event.id}`);
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <span className="font-mono text-xs uppercase tracking-widest text-accent">
          New event
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">Set up a tasting</h1>
        <p className="text-sm text-muted">
          Wines map to the blind A–D letters already printed on the card —
          whichever wine you pour first is A, and so on.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-mono text-xs uppercase tracking-wide text-muted">Event name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Thursday flight"
              className="rounded-md border border-line bg-surface px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-mono text-xs uppercase tracking-wide text-muted">Date</span>
            <input
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-md border border-line bg-surface px-3 py-2"
            />
          </label>
        </div>

        <div className="flex flex-col gap-3">
          <span className="font-mono text-xs uppercase tracking-wide text-muted">Wines</span>
          {wines.map((w, i) => (
            <div key={w.flightPosition} className="flex items-center gap-2">
              <span className="w-6 shrink-0 font-mono font-semibold text-accent">
                {w.flightPosition}
              </span>
              <input
                placeholder="Wine name"
                value={w.name}
                onChange={(e) => updateWine(i, { name: e.target.value })}
                className="flex-1 rounded-md border border-line bg-surface px-3 py-2 text-sm"
              />
              <input
                placeholder="Producer (optional)"
                value={w.producer}
                onChange={(e) => updateWine(i, { producer: e.target.value })}
                className="flex-1 rounded-md border border-line bg-surface px-3 py-2 text-sm"
              />
              <input
                placeholder="Vintage"
                inputMode="numeric"
                value={w.vintage}
                onChange={(e) => updateWine(i, { vintage: e.target.value })}
                className="w-24 rounded-md border border-line bg-surface px-3 py-2 text-sm"
              />
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-accent">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-fit rounded-md bg-accent px-5 py-2 text-sm font-semibold text-accent-soft disabled:opacity-50"
        >
          {saving ? "Creating…" : "Create event"}
        </button>
      </form>
    </main>
  );
}
