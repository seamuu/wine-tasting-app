"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TasterNameField({
  cardId,
  initialName,
}: {
  cardId: string;
  initialName: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialName);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (value === initialName) return;
    setSaving(true);
    await fetch(`/api/cards/${cardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tasterName: value }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      placeholder="Who is this?"
      disabled={saving}
      className="rounded-md border border-line bg-surface px-2 py-1 text-sm disabled:opacity-50"
    />
  );
}
