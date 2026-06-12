# PathwayForge

A gamified platform for learning biological pathways. You **recall a pathway step by step** — naming each molecule in order lights up the chain — and a final **conceptual lock-in question** seals it. Light up enough pathways and they **bridge** into one giant interconnected map. Built for biochem, endocrinology, and anything that lives or dies by pathway memorization.

Three modes share one map state:

- **Sandbox** — search a pathway, recall its sequence to light it, answer the lock-in question to lock it, then connect lit pathways through shared nodes (e.g. Pyruvate → Acetyl-CoA bridges Glycolysis and the Krebs cycle).
- **Test** — pick an organelle, name the pathway it houses, pass a checkpoint. A progress bar tracks how much of each region you've mastered.
- **Forum** — discussion threads, with per-node filtering (hit “Discuss” on any molecule to jump to its thread).

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
```

## Deploy to GitHub Pages

**Option A — automatic (recommended).** Push to GitHub, then in the repo go to
**Settings → Pages → Source → “GitHub Actions.”** Every push to `main` builds and
publishes via `.github/workflows/deploy.yml`. Your site lands at
`https://<you>.github.io/<repo>/`.

**Option B — manual.**

```bash
npm run deploy   # builds and pushes dist/ to the gh-pages branch
```

(`base: "./"` in `vite.config.js` uses relative asset paths, so it works under any
repo name without further config.)

## Adding a pathway (the only file you touch: `src/data/content.js`)

Append an entry to `pathways`. A minimal linear pathway needs no coordinates —
the layout engine auto-places it as a tidy chain inside its region:

```js
{
  id: "ppp",
  name: "Pentose Phosphate Pathway",
  location: "Cytoplasm",
  region: "cytoplasm",
  color: "#f472b6",
  aliases: ["ppp", "pentose phosphate", "hmp shunt"],
  layout: "chain",
  nodes: [
    { id: "g6p",   label: "Glucose-6-P",  accept: ["g6p"], anchor: true },  // reusing id "g6p" makes a SHARED junction with glycolysis
    { id: "6pg",   label: "6-Phosphogluconate", accept: ["6pg", "6 phosphogluconate"] },
    { id: "ru5p",  label: "Ribulose-5-P",  accept: ["ru5p", "ribulose 5 phosphate"] },
  ],
  lockIn: {
    q: "What enzyme is the rate-limiting step of the PPP?",
    accept: ["g6pd", "glucose 6 phosphate dehydrogenase"],
    reveal: "Glucose-6-phosphate dehydrogenase (G6PD)",
  },
}
```

Key points:
- **Order = recall order.** The first node is the free anchor; the learner recalls the rest.
- **Shared nodes**: reuse the same `id` in two pathways and it becomes a junction. Keep shared nodes in the same `region` for clean layout.
- **Explicit coords** (`x`, `y` on nodes) override auto-layout — use them for hand-tuned maps or rings.
- **Rings**: set `layout: "ring"` and provide explicit `edges` plus node coords (see the Krebs entry).

To connect two pathways, add a bridge to `bridges` with either `drawEdge: [fromId, toId]`
(draws a new glowing line) or `junction: nodeId` (highlights a shared node), plus a
question and accepted answers.

Regions (organelles / systems) live in `regions` — each has a bounding box, a tint,
and the pathways it contains (used by Test mode and auto-layout).

## Stack

React 18 · Vite · Tailwind CSS · lucide-react. No graph library — nodes are placed
by a small layout engine (`src/lib/layout.js`) so each pathway reads as its real
shape. Forum data is in-memory for now; swap in a datastore when you want persistence.
