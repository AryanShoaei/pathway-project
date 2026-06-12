/* ============================================================================
   content.js — ALL learning content lives here.

   To add a new pathway, append an entry to `pathways`. That's it.

   PATHWAY SCHEMA
   ------------------------------------------------------------------
   id        string   unique key (no spaces)
   name      string   display name
   location  string   shown under the name (e.g. "Cytoplasm")
   region    string   id of a region in `regions` (used by Test mode + layout)
   color     string   hex — the pathway's neon "lit" color (its recall cue)
   aliases   string[] accepted names when searching / identifying it
   layout    string   "chain" | "ring"  (how nodes are auto-placed)
   nodes     Node[]   the molecules/steps. ORDER = recall order.
   lockIn    {q, accept[], reveal}  the conceptual question that locks it in
   edges?    [from,to][]  optional. If omitted, edges are drawn between
                          consecutive nodes (perfect for linear chains).
   ring?     {center:{x,y}, radius}  required if layout==="ring"

   NODE SCHEMA
   ------------------------------------------------------------------
   id      string    unique across ALL pathways. Reuse the SAME id in two
                     pathways to make a SHARED junction node (e.g. acetylcoa).
   label   string    display label
   accept  string[]  accepted typed answers (case/spacing/punctuation-insensitive)
   x?, y?  number    optional explicit position. If every node in a pathway
                     omits x/y, the layout engine auto-places it as a tidy
                     chain inside its region. Provide x/y for hand-tuned maps.
   anchor? boolean   if true, this node is GIVEN for free at the start of recall
                     (the user recalls the steps that follow it).

   The first node is treated as the anchor by default.
============================================================================ */

export const regions = {
  cytoplasm: {
    id: "cytoplasm",
    label: "Cytoplasm",
    tint: "#38bdf8",
    rect: { x: 70, y: 60, w: 200, h: 700 },
    pathways: ["glycolysis"],
    prompt:
      "Name the pathway that breaks glucose down to pyruvate, generating ATP anaerobically here in the cytoplasm.",
  },
  mitochondria: {
    id: "mitochondria",
    label: "Mitochondria",
    tint: "#a78bfa",
    rect: { x: 290, y: 120, w: 620, h: 620 },
    pathways: ["krebs", "betaOxidation"],
    prompt:
      "Name a pathway housed inside the mitochondria. Light up every pathway here to master the organelle.",
  },
  endocrine: {
    id: "endocrine",
    label: "Endocrine Axis",
    tint: "#34d399",
    rect: { x: 940, y: 60, w: 220, h: 700 },
    pathways: ["hptAxis"],
    prompt:
      "Name the hormone axis that regulates metabolism through the thyroid.",
  },
};

export const pathways = [
  /* ----------------------------- GLYCOLYSIS ---------------------------- */
  {
    id: "glycolysis",
    name: "Glycolysis",
    location: "Cytoplasm",
    region: "cytoplasm",
    color: "#22d3ee",
    aliases: ["glycolysis", "glycolisis", "embden-meyerhof", "embden meyerhof"],
    layout: "chain",
    nodes: [
      { id: "glucose",  label: "Glucose",          accept: ["glucose"], x: 170, y: 100, anchor: true },
      { id: "g6p",      label: "Glucose-6-P",       accept: ["g6p", "glucose 6 phosphate", "glucose-6-phosphate"], x: 170, y: 168 },
      { id: "f6p",      label: "Fructose-6-P",      accept: ["f6p", "fructose 6 phosphate", "fructose-6-phosphate"], x: 170, y: 236 },
      { id: "f16bp",    label: "Fructose-1,6-BP",   accept: ["f16bp", "fbp", "fructose 1 6 bisphosphate", "fructose-1,6-bisphosphate"], x: 170, y: 304 },
      { id: "g3p",      label: "G3P",               accept: ["g3p", "glyceraldehyde 3 phosphate", "glyceraldehyde-3-phosphate", "gap"], x: 170, y: 372 },
      { id: "bpg13",    label: "1,3-BPG",           accept: ["1 3 bpg", "1,3-bpg", "1 3 bisphosphoglycerate", "bisphosphoglycerate"], x: 170, y: 440 },
      { id: "pg3",      label: "3-PG",              accept: ["3 pg", "3-pg", "3 phosphoglycerate", "3-phosphoglycerate"], x: 170, y: 508 },
      { id: "pg2",      label: "2-PG",              accept: ["2 pg", "2-pg", "2 phosphoglycerate", "2-phosphoglycerate"], x: 170, y: 576 },
      { id: "pep",      label: "PEP",               accept: ["pep", "phosphoenolpyruvate"], x: 170, y: 644 },
      { id: "pyruvate", label: "Pyruvate",          accept: ["pyruvate"], x: 170, y: 712 },
    ],
    lockIn: {
      q: "What is the rate-limiting enzyme of glycolysis?",
      accept: ["pfk", "pfk1", "pfk-1", "phosphofructokinase", "phosphofructokinase 1", "phosphofructokinase-1"],
      reveal: "Phosphofructokinase-1 (PFK-1)",
    },
  },

  /* ------------------------------- KREBS ------------------------------- */
  {
    id: "krebs",
    name: "Krebs Cycle",
    location: "Mitochondria",
    region: "mitochondria",
    color: "#fb923c",
    aliases: ["krebs", "krebs cycle", "citric acid cycle", "tca", "tca cycle", "cac"],
    layout: "ring",
    ring: { center: { x: 650, y: 330 }, radius: 150 },
    nodes: [
      { id: "acetylcoa",   label: "Acetyl-CoA",     accept: ["acetyl coa", "acetyl-coa", "acetylcoa"], x: 430, y: 560, anchor: true },
      { id: "citrate",     label: "Citrate",        accept: ["citrate", "citric acid"] },
      { id: "isocitrate",  label: "Isocitrate",     accept: ["isocitrate"] },
      { id: "akg",         label: "α-Ketoglutarate",accept: ["akg", "alpha ketoglutarate", "α-ketoglutarate", "alpha-ketoglutarate", "ketoglutarate"] },
      { id: "succinylcoa", label: "Succinyl-CoA",   accept: ["succinyl coa", "succinyl-coa", "succinylcoa"] },
      { id: "succinate",   label: "Succinate",      accept: ["succinate"] },
      { id: "fumarate",    label: "Fumarate",       accept: ["fumarate"] },
      { id: "malate",      label: "Malate",         accept: ["malate"] },
      { id: "oaa",         label: "Oxaloacetate",   accept: ["oaa", "oxaloacetate"] },
    ],
    // explicit edges: entry + ring closure
    edges: [
      ["acetylcoa", "citrate"], ["citrate", "isocitrate"], ["isocitrate", "akg"],
      ["akg", "succinylcoa"], ["succinylcoa", "succinate"], ["succinate", "fumarate"],
      ["fumarate", "malate"], ["malate", "oaa"], ["oaa", "citrate"],
    ],
    lockIn: {
      q: "What is the rate-limiting enzyme of the Krebs cycle?",
      accept: ["isocitrate dehydrogenase", "idh"],
      reveal: "Isocitrate dehydrogenase (IDH)",
    },
  },

  /* ---------------------------- β-OXIDATION ---------------------------- */
  {
    id: "betaOxidation",
    name: "β-Oxidation",
    location: "Mitochondria",
    region: "mitochondria",
    color: "#e879f9",
    aliases: ["beta oxidation", "b-oxidation", "β-oxidation", "fatty acid oxidation", "fao"],
    layout: "chain",
    nodes: [
      { id: "facyl",       label: "Fatty Acyl-CoA",     accept: ["fatty acyl coa", "fatty acyl-coa", "acyl coa", "acyl-coa"], x: 360, y: 700, anchor: true },
      { id: "enoyl",       label: "trans-Δ2-Enoyl-CoA", accept: ["enoyl coa", "enoyl-coa", "trans enoyl coa", "trans-enoyl-coa"], x: 360, y: 640 },
      { id: "hydroxyacyl", label: "3-Hydroxyacyl-CoA",  accept: ["3 hydroxyacyl coa", "hydroxyacyl coa", "3-hydroxyacyl-coa", "l-3-hydroxyacyl-coa"], x: 360, y: 612 },
      { id: "ketoacyl",    label: "3-Ketoacyl-CoA",     accept: ["3 ketoacyl coa", "ketoacyl coa", "3-ketoacyl-coa", "beta ketoacyl coa"], x: 380, y: 586 },
      { id: "acetylcoa",   label: "Acetyl-CoA",         accept: ["acetyl coa", "acetyl-coa", "acetylcoa"], x: 430, y: 560 },
    ],
    lockIn: {
      q: "What cofactor shuttles long-chain fatty acids into the mitochondria?",
      accept: ["carnitine", "l-carnitine", "l carnitine"],
      reveal: "Carnitine (the carnitine shuttle, via CPT-1)",
    },
  },

  /* ------------------------- HPT AXIS (ENDOCRINE) ----------------------- */
  {
    id: "hptAxis",
    name: "HPT Axis",
    location: "Endocrine",
    region: "endocrine",
    color: "#4ade80",
    aliases: ["hpt", "hpt axis", "thyroid axis", "hypothalamic pituitary thyroid", "hypothalamic-pituitary-thyroid"],
    layout: "chain",
    nodes: [
      { id: "hypothalamus", label: "Hypothalamus",   accept: ["hypothalamus"], x: 1050, y: 130, anchor: true },
      { id: "trh",          label: "TRH",            accept: ["trh", "thyrotropin releasing hormone", "thyrotropin-releasing hormone"], x: 1050, y: 235 },
      { id: "pituitary",    label: "Ant. Pituitary", accept: ["pituitary", "anterior pituitary", "ant pituitary"], x: 1050, y: 345 },
      { id: "tsh",          label: "TSH",            accept: ["tsh", "thyroid stimulating hormone", "thyrotropin"], x: 1050, y: 455 },
      { id: "thyroid",      label: "Thyroid",        accept: ["thyroid", "thyroid gland"], x: 1050, y: 565 },
      { id: "t3t4",         label: "T3 / T4",        accept: ["t3", "t4", "t3/t4", "t3 t4", "thyroxine", "thyroid hormone"], x: 1050, y: 675 },
    ],
    lockIn: {
      q: "Which hormones exert negative feedback on the hypothalamus and pituitary?",
      accept: ["t3", "t4", "t3/t4", "t3 t4", "thyroxine", "thyroid hormone"],
      reveal: "T3 / T4 (thyroid hormone)",
    },
  },
];

/* --------------------------------- BRIDGES --------------------------------
   A bridge becomes available once BOTH pathways are lit. Answering its
   question connects them. drawEdge draws a new glowing line; junction
   highlights a shared node instead.                                         */
export const bridges = [
  {
    id: "glyco_krebs",
    a: "glycolysis",
    b: "krebs",
    drawEdge: ["pyruvate", "acetylcoa"],
    q: "Which enzyme complex converts pyruvate into Acetyl-CoA?",
    accept: ["pdh", "pdc", "pyruvate dehydrogenase", "pyruvate dehydrogenase complex"],
    reveal: "Pyruvate dehydrogenase complex (PDH)",
  },
  {
    id: "krebs_betaox",
    a: "krebs",
    b: "betaOxidation",
    junction: "acetylcoa",
    q: "Both pathways converge on which 2-carbon acetyl carrier?",
    accept: ["acetyl coa", "acetyl-coa", "acetylcoa"],
    reveal: "Acetyl-CoA",
  },
];

export default { pathways, bridges, regions };
