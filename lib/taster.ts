/** Unnamed cards have independent identities so they cannot overwrite one
 * another or accidentally become one person's scores across several wines. */
export const UNNAMED_TASTER = "__unnamed__";
export const isUnnamedTaster = (t: { idA: string }) => t.idA === UNNAMED_TASTER;
export const tasterLabel = (t: { idA: string; idB: string; name?: string | null }) =>
  t.name?.trim() || (isUnnamedTaster(t) ? "Unnamed card" : `${t.idA} ${t.idB}`);
