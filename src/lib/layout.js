/* ============================================================================
   layout.js — turns content into {nodeId: {x, y}} positions.

   Rules:
   1. Any node with explicit x/y uses them (hand-tuned maps).
   2. Shared nodes (same id in two pathways) are positioned once; the first
      definition with coords wins.
   3. A pathway whose nodes lack coords is auto-placed as a tidy vertical
      chain inside its region, stacked in a fresh column so it never overlaps
      a previously placed pathway in that region.
============================================================================ */

const GAP = 64; // vertical spacing for auto-placed chains

export function computeLayout(pathways, regions) {
  const pos = {};

  // pass 1 — honor explicit coordinates
  for (const p of pathways) {
    for (const n of p.nodes) {
      if (n.x != null && n.y != null && pos[n.id] == null) {
        pos[n.id] = { x: n.x, y: n.y };
      }
    }
  }

  // track how many auto-columns we've used per region
  const colsUsed = {};

  // pass 2 — auto-place any pathway with unpositioned nodes
  for (const p of pathways) {
    const missing = p.nodes.filter((n) => pos[n.id] == null);
    if (missing.length === 0) continue;

    const region = regions[p.region];
    const box = region ? region.rect : { x: 60, y: 60, w: 240, h: 700 };
    const col = (colsUsed[p.region] = (colsUsed[p.region] || 0) + 1) - 1;
    const x = box.x + 60 + col * 150;
    let y = box.y + 70;

    for (const n of p.nodes) {
      if (pos[n.id] == null) {
        pos[n.id] = { x, y };
      }
      y += GAP;
    }
  }

  return pos;
}

/** Build the list of edges to draw for a pathway (explicit, else consecutive). */
export function edgesFor(p) {
  if (p.edges) return p.edges;
  const e = [];
  for (let i = 0; i < p.nodes.length - 1; i++) {
    e.push([p.nodes[i].id, p.nodes[i + 1].id]);
  }
  return e;
}
