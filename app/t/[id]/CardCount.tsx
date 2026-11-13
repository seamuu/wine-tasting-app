"use client";

import { useEffect, useState } from "react";

/** Update collection progress without refreshing the host's active scan. */
export default function CardCount({ eventId, position, initial, expected, remaining = false }: {
  eventId: string; position: string; initial: number; expected: number; remaining?: boolean;
}) {
  const [count, setCount] = useState(initial);
  useEffect(() => {
    const update = (event: Event) => {
      const detail = (event as CustomEvent<{ eventId: string; position: string; count: number }>).detail;
      if (detail?.eventId === eventId && detail.position === position) setCount(detail.count);
    };
    window.addEventListener("wine-flight:card-count", update);
    return () => window.removeEventListener("wine-flight:card-count", update);
  }, [eventId, position]);
  return remaining ? <>{count} {count === 1 ? "card" : "cards"} collected. You can continue now.</> : <>{count}/{expected} cards</>;
}
