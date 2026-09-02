"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function ScanPanel({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    async function onMessage(e: MessageEvent) {
      if (!e.data || e.data.source !== "wine-flight-scan") return;
      setStatus("saving");
      setMessage(null);
      const res = await fetch(`/api/events/${eventId}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blockResults: e.data.blockResults,
          tasterResult: e.data.tasterResult,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(body.error || "Couldn't save that scan.");
        return;
      }
      setStatus("saved");
      setMessage(
        body.needsReview
          ? "Saved — some fields need a manual look (see the roster below)."
          : "Saved — every field read cleanly."
      );
      router.refresh();
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [eventId, router]);

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-xl border border-line">
        <iframe
          ref={iframeRef}
          src="/scan-test.html"
          className="h-[600px] w-full"
          title="Scan a card"
        />
      </div>
      {message && (
        <p className={`text-sm ${status === "error" ? "text-accent" : "text-muted"}`}>
          {status === "saving" ? "Saving…" : message}
        </p>
      )}
    </div>
  );
}
