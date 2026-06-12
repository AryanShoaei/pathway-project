/* ============================================================================
   match.js — forgiving answer matching.
   Normalizes case, spacing, and punctuation so "Glucose-6-P" == "glucose 6 p".
============================================================================ */

export const norm = (s) =>
  (s || "")
    .toLowerCase()
    .replace(/α/g, "alpha")
    .replace(/β/g, "beta")
    .replace(/[^a-z0-9]/g, "");

/** Does `input` match any accepted answer? */
export function answerMatches(input, accept = []) {
  const n = norm(input);
  if (!n) return false;
  return accept.some((a) => norm(a) === n);
}

/** Find a pathway id whose name/aliases match `input`, limited to `pool`. */
export function pathwayByAlias(input, pool, pathways) {
  const n = norm(input);
  if (!n) return null;
  for (const id of pool) {
    const p = pathways.find((x) => x.id === id);
    if (!p) continue;
    if (norm(p.name) === n || p.aliases.some((a) => norm(a) === n)) return id;
  }
  return null;
}
