"use client";

import { useFormStatus } from "react-dom";

export default function RevealSubmit({ position }: { position: string }) {
  const { pending } = useFormStatus();
  return <button className="btn btn-primary" type="submit" name="intent" value="reveal" disabled={pending}>
    {pending ? "Saving…" : `Save & reveal wine ${position} →`}
  </button>;
}
