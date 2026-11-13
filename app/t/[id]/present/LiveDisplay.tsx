"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Refresh only the read-only display; host forms never get reset by polling. */
export default function LiveDisplay({ following, children }: { following: boolean; children: React.ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    if (!following) return;
    const refresh = () => { if (document.visibilityState === "visible") router.refresh(); };
    const interval = setInterval(refresh, 3000);
    document.addEventListener("visibilitychange", refresh);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", refresh); };
  }, [following, router]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.target instanceof HTMLInputElement) return;
      if (event.key.toLowerCase() === "f") {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen?.().catch(() => {});
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return <>{children}</>;
}

export function FullscreenButton() {
  return <button className="btn btn-sm btn-quiet" type="button" onClick={() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  }}>Fullscreen ↗</button>;
}
