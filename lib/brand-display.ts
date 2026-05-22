/** Display-safe brand names (feeds often prefix stray quotes, e.g. 'S Max Mara). */
export function sanitizeBrandName(name: string): string {
  let n = name.replace(/^[''`"]+\s*/g, "").trim();
  if (/^'?s\s+max\s+mara$/i.test(n)) n = "S Max Mara";
  if (/^'?s\s*max$/i.test(n)) n = "S Max Mara";
  if (/^max\s+mara$/i.test(n)) n = "Max Mara";
  if (/^weekend\s+max\s+mara$/i.test(n)) n = "Weekend Max Mara";
  if (/^marant\s+etoile$/i.test(n) || /^marant\s+étoile$/i.test(n)) n = "Marant Étoile";
  if (/^etoile\s+isabel\s+marant$/i.test(n) || /^étoile\s+isabel\s+marant$/i.test(n)) n = "Étoile Isabel Marant";
  return n;
}
