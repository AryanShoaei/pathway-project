import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Search, Network, Brain, MessageSquare, CheckCircle2, Lock, Unlock,
  ZoomIn, ZoomOut, Crosshair, X, Send, Zap, Target, ArrowLeft, Plus,
  Sparkles, Eye, ListOrdered,
} from "lucide-react";
import content from "./data/content.js";
import { answerMatches, pathwayByAlias } from "./lib/match.js";
import { computeLayout, edgesFor } from "./lib/layout.js";

const { pathways, bridges, regions } = content;
const byId = Object.fromEntries(pathways.map((p) => [p.id, p]));
const allNodes = {}; // id -> node def (first definition wins for label)
pathways.forEach((p) => p.nodes.forEach((n) => { if (!allNodes[n.id]) allNodes[n.id] = n; }));

/* palette */
const C = {
  bg: "#070b16", bg2: "#0a1022", panel: "#0d1430", panelSoft: "#0f1838",
  edge: "#1d2b54", edgeSoft: "#16213f", text: "#dde6ff", dim: "#8a97c4",
  faint: "#566091", unlit: "#39456e", grid: "rgba(56,189,248,0.05)",
  good: "#34d399", bad: "#fb7185", accent: "#38bdf8",
};
const VIEW = { w: 1200, h: 800 };

/* ========================================================================== */
export default function App() {
  const [mode, setMode] = useState("sandbox");

  // shared, persists across modes
  const [placed, setPlaced] = useState(new Set());
  const [progress, setProgress] = useState({}); // pid -> steps recalled (0 = only anchor)
  const [lit, setLit] = useState(new Set());
  const [connected, setConnected] = useState(new Set());

  // view
  const [panel, setPanel] = useState(null); // {type, ...}
  const [search, setSearch] = useState("");
  const [hover, setHover] = useState(null);
  const [forumFilter, setForumFilter] = useState(null);
  const [toast, setToast] = useState(null);

  const positions = useMemo(() => computeLayout(pathways, regions), []);

  const flash = useCallback((msg, ok = true) => {
    setToast({ msg, ok, key: Date.now() });
    setTimeout(() => setToast(null), 2200);
  }, []);

  /* ----- derived: which nodes are lit, and their color ----- */
  const nodeLit = useCallback((nid) => {
    for (const p of pathways) {
      if (!p.nodes.some((n) => n.id === nid)) continue;
      if (lit.has(p.id)) return true;
      if (placed.has(p.id)) {
        const idx = p.nodes.findIndex((n) => n.id === nid);
        if (idx <= (progress[p.id] || 0)) return true;
      }
    }
    return false;
  }, [lit, placed, progress]);

  const nodeColor = useCallback((nid) => {
    for (const p of pathways) {
      if (p.nodes.some((n) => n.id === nid)) {
        if (lit.has(p.id) || (placed.has(p.id) && p.nodes.findIndex((n) => n.id === nid) <= (progress[p.id] || 0)))
          return p.color;
      }
    }
    return C.unlit;
  }, [lit, placed, progress]);

  /* ----- bridge availability ----- */
  const availableBridge = useMemo(() => {
    for (const b of bridges) if (lit.has(b.a) && lit.has(b.b) && !connected.has(b.id)) return b;
    return null;
  }, [lit, connected]);

  /* ----- actions ----- */
  const addPathway = (pid) => {
    if (!pid) return;
    if (placed.has(pid)) { flash(`${byId[pid].name} is already on the map`, false); return; }
    setPlaced((s) => new Set(s).add(pid));
    setProgress((pr) => ({ ...pr, [pid]: 0 }));
    setSearch("");
    const p = byId[pid];
    setPanel(p.nodes.length > 1 ? { type: "recall", pid } : { type: "concept", pid });
  };

  const onSearch = () => {
    const pid = pathwayByAlias(search, pathways.map((p) => p.id), pathways);
    if (!pid) { flash("No pathway by that name (try Glycolysis, Krebs, β-Oxidation, HPT)", false); return; }
    addPathway(pid);
  };

  const lightPathway = (pid) => {
    setLit((s) => new Set(s).add(pid));
    setPlaced((s) => new Set(s).add(pid));
    setProgress((pr) => ({ ...pr, [pid]: byId[pid].nodes.length - 1 }));
  };

  /* ----- answer router ----- */
  const submit = (raw, onWrong) => {
    if (!panel) return;
    const { type, pid, rid } = panel;
    const p = pid ? byId[pid] : null;

    if (type === "recall") {
      const nextIdx = (progress[pid] || 0) + 1;
      const nextNode = p.nodes[nextIdx];
      if (answerMatches(raw, nextNode.accept)) {
        const np = nextIdx;
        setProgress((pr) => ({ ...pr, [pid]: np }));
        if (np >= p.nodes.length - 1) setPanel({ type: "concept", pid });
      } else onWrong?.();
    } else if (type === "concept") {
      if (answerMatches(raw, p.lockIn.accept)) {
        lightPathway(pid);
        setPanel(null);
        flash(`${p.name} locked in ⚡`);
      } else onWrong?.();
    } else if (type === "bridge") {
      const b = bridges.find((x) => x.id === panel.bid);
      if (answerMatches(raw, b.accept)) {
        setConnected((s) => new Set(s).add(b.id));
        setPanel(null);
        flash(`Bridged ${byId[b.a].name} ↔ ${byId[b.b].name} 🔗`);
      } else onWrong?.();
    } else if (type === "testIdentify") {
      const region = regions[rid];
      const target = pathwayByAlias(raw, region.pathways.filter((x) => !lit.has(x)), pathways);
      if (target) setPanel({ type: "testConcept", pid: target, rid });
      else onWrong?.("Not a remaining pathway in this region");
    } else if (type === "testConcept") {
      if (answerMatches(raw, p.lockIn.accept)) {
        lightPathway(pid);
        setPanel(null);
        flash(`${p.name} mastered ✓`);
      } else onWrong?.();
    }
  };

  const reveal = () => {
    if (panel?.type !== "recall") return;
    const p = byId[panel.pid];
    const nextIdx = (progress[panel.pid] || 0) + 1;
    setProgress((pr) => ({ ...pr, [panel.pid]: nextIdx }));
    if (nextIdx >= p.nodes.length - 1) setPanel({ type: "concept", pid: panel.pid });
  };

  const openDiscuss = (nid, label) => { setForumFilter({ nodeId: nid, label }); setMode("forum"); };
  const resetAll = () => {
    setPlaced(new Set()); setProgress({}); setLit(new Set());
    setConnected(new Set()); setPanel(null); flash("Map reset");
  };

  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: "'Inter',system-ui,sans-serif" }}
      className="w-full h-screen flex flex-col overflow-hidden">
      <TopBar mode={mode} setMode={setMode} lit={lit} onReset={resetAll} />
      <div className="flex-1 flex min-h-0">
        <Sidebar mode={mode} lit={lit} placed={placed} progress={progress} connected={connected}
          availableBridge={availableBridge}
          onStartBridge={(b) => setPanel({ type: "bridge", bid: b.id })} />

        <main className="flex-1 min-w-0 relative" style={{ background: C.bg2 }}>
          {mode === "forum" ? (
            <Forum filter={forumFilter} clearFilter={() => setForumFilter(null)} />
          ) : (
            <>
              {mode === "sandbox" && (
                <SandboxBar search={search} setSearch={setSearch} onSubmit={onSearch}
                  onPick={addPathway} placed={placed} />
              )}
              {mode === "test" && (
                <TestBar lit={lit} onChallenge={(rid) => {
                  if (regions[rid].pathways.every((x) => lit.has(x))) flash(`${regions[rid].label} fully mastered`);
                  else setPanel({ type: "testIdentify", rid });
                }} />
              )}
              <MapCanvas mode={mode} positions={positions} placed={placed} lit={lit}
                connected={connected} nodeLit={nodeLit} nodeColor={nodeColor}
                hover={hover} setHover={setHover} onDiscuss={openDiscuss} />
            </>
          )}
        </main>

        {panel && mode !== "forum" && (
          <RightPanel panel={panel} progress={progress} onSubmit={submit}
            onReveal={reveal} onClose={() => setPanel(null)} flash={flash} />
        )}
      </div>
      {toast && <Toast toast={toast} />}
    </div>
  );
}

/* ============================== TOP BAR ================================== */
function TopBar({ mode, setMode, lit, onReset }) {
  const tabs = [
    { id: "sandbox", label: "Sandbox", icon: Network },
    { id: "test", label: "Test", icon: Brain },
    { id: "forum", label: "Forum", icon: MessageSquare },
  ];
  return (
    <header className="flex items-center justify-between px-5 py-3 border-b"
      style={{ background: C.panel, borderColor: C.edge }}>
      <div className="flex items-center gap-3">
        <div className="grid place-items-center rounded-lg" style={{ width: 34, height: 34,
          background: "#0a1430", boxShadow: "0 0 18px rgba(34,211,238,0.45)", border: "1px solid #22d3ee" }}>
          <Zap size={18} style={{ color: "#22d3ee" }} />
        </div>
        <div>
          <div className="font-semibold tracking-tight" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>PathwayForge</div>
          <div className="text-[11px]" style={{ color: C.faint }}>recall the sequence · light up the map</div>
        </div>
      </div>
      <nav className="flex items-center gap-1 p-1 rounded-xl" style={{ background: C.bg2, border: `1px solid ${C.edge}` }}>
        {tabs.map((t) => {
          const Icon = t.icon; const active = mode === t.id;
          return (
            <button key={t.id} onClick={() => setMode(t.id)}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm transition-all"
              style={{ background: active ? "#13224a" : "transparent", color: active ? "#fff" : C.dim,
                boxShadow: active ? "0 0 14px rgba(56,189,248,0.25)" : "none" }}>
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </nav>
      <div className="flex items-center gap-3">
        <span className="text-[11px] px-3 py-1 rounded-full" style={{ background: C.bg2, color: C.dim, border: `1px solid ${C.edge}` }}>
          {lit.size}/{pathways.length} lit
        </span>
        <button onClick={onReset} className="text-[11px] px-3 py-1 rounded-full" style={{ color: C.faint, border: `1px solid ${C.edge}` }}>Reset</button>
      </div>
    </header>
  );
}

/* ============================== SIDEBAR ================================= */
function Sidebar({ mode, lit, placed, progress, connected, availableBridge, onStartBridge }) {
  const goal = {
    sandbox: "Search a pathway, recall each step in order to light it up, then answer the lock-in question to lock it. Connect lit pathways through shared nodes.",
    test: "Pick an organelle, name the pathway it houses, and pass the checkpoint to permanently light that region.",
    forum: "Discuss mnemonics and tricky steps. Hit “Discuss” on any node to jump to its thread.",
  }[mode];

  return (
    <aside className="w-64 shrink-0 flex flex-col border-r overflow-y-auto" style={{ background: C.panel, borderColor: C.edge }}>
      <Section title="Active goal"><p className="text-xs leading-relaxed" style={{ color: C.dim }}>{goal}</p></Section>
      <Section title="Pathways">
        <div className="flex flex-col gap-2">
          {pathways.map((p) => {
            const isLit = lit.has(p.id);
            const onMap = placed.has(p.id);
            const steps = p.nodes.length - 1;
            const done = Math.min(progress[p.id] || 0, steps);
            return (
              <div key={p.id} className="px-3 py-2 rounded-lg" style={{ background: isLit ? "#0b1838" : C.bg2,
                border: `1px solid ${isLit ? p.color : C.edge}`, boxShadow: isLit ? `0 0 14px ${p.color}33` : "none" }}>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: isLit ? p.color : C.unlit, boxShadow: isLit ? `0 0 8px ${p.color}` : "none" }} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm truncate" style={{ color: isLit ? "#fff" : C.dim }}>{p.name}</div>
                    <div className="text-[10px]" style={{ color: C.faint }}>{p.location}</div>
                  </div>
                  {isLit ? <Unlock size={14} style={{ color: p.color }} /> : onMap ? <Lock size={14} style={{ color: C.faint }} /> : null}
                </div>
                {onMap && !isLit && (
                  <div className="mt-2">
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: C.bg }}>
                      <div className="h-full rounded-full" style={{ width: `${(done / steps) * 100}%`, background: p.color }} />
                    </div>
                    <div className="text-[10px] mt-1" style={{ color: C.faint }}>{done}/{steps} steps recalled</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {availableBridge && mode === "sandbox" && (
        <Section title="Bridge ready">
          <button onClick={() => onStartBridge(availableBridge)} className="w-full text-left px-3 py-3 rounded-lg pulse-soft"
            style={{ background: "#101c3e", border: "1px solid #38bdf8", boxShadow: "0 0 18px rgba(56,189,248,0.3)" }}>
            <div className="flex items-center gap-2 text-sm" style={{ color: "#7dd3fc" }}><Sparkles size={14} /> Connect pathways</div>
            <div className="text-[11px] mt-1" style={{ color: C.dim }}>{byId[availableBridge.a].name} ↔ {byId[availableBridge.b].name}</div>
          </button>
        </Section>
      )}

      <Section title="Connections">
        {connected.size === 0 ? <p className="text-xs" style={{ color: C.faint }}>No bridges built yet.</p> : (
          <div className="flex flex-col gap-1.5">
            {[...connected].map((bid) => { const b = bridges.find((x) => x.id === bid);
              return <div key={bid} className="flex items-center gap-2 text-[11px]" style={{ color: C.dim }}>
                <CheckCircle2 size={13} style={{ color: C.good }} />{byId[b.a].name} ↔ {byId[b.b].name}</div>; })}
          </div>
        )}
      </Section>
    </aside>
  );
}
function Section({ title, children }) {
  return (
    <div className="px-4 py-4 border-b" style={{ borderColor: C.edgeSoft }}>
      <div className="text-[10px] uppercase tracking-widest mb-3" style={{ color: C.faint, letterSpacing: "0.15em" }}>{title}</div>
      {children}
    </div>
  );
}

/* ============================ SANDBOX / TEST BARS ====================== */
function SandboxBar({ search, setSearch, onSubmit, onPick, placed }) {
  const suggestions = pathways.filter((p) => !placed.has(p.id));
  return (
    <div className="absolute top-4 left-4 right-4 z-20 flex flex-col gap-2 pointer-events-none">
      <div className="flex items-center gap-2 pointer-events-auto" style={{ maxWidth: 460 }}>
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: C.panel, border: `1px solid ${C.edge}` }}>
          <Search size={16} style={{ color: C.faint }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onSubmit()}
            placeholder="Search a pathway… e.g. Glycolysis" className="bg-transparent outline-none text-sm flex-1" style={{ color: C.text }} />
          <button onClick={onSubmit} className="px-3 py-1 rounded-lg text-xs" style={{ background: "#13224a", color: "#7dd3fc" }}>Add</button>
        </div>
      </div>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 pointer-events-auto">
          {suggestions.map((p) => (
            <button key={p.id} onClick={() => onPick(p.id)} className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px]"
              style={{ background: C.panel, border: `1px solid ${C.edge}`, color: C.dim }}>
              <Plus size={11} style={{ color: p.color }} /> {p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
function TestBar({ lit, onChallenge }) {
  return (
    <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap gap-3 pointer-events-none">
      {Object.values(regions).map((r) => {
        const total = r.pathways.length;
        const done = r.pathways.filter((p) => lit.has(p)).length;
        const pct = Math.round((done / total) * 100);
        const mastered = done === total;
        return (
          <button key={r.id} onClick={() => onChallenge(r.id)} className="pointer-events-auto text-left px-4 py-3 rounded-xl"
            style={{ background: C.panel, border: `1px solid ${mastered ? r.tint : C.edge}`, minWidth: 220, boxShadow: mastered ? `0 0 16px ${r.tint}44` : "none" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-2 text-sm" style={{ color: "#fff" }}><Target size={14} style={{ color: r.tint }} /> {r.label}</span>
              <span className="text-[11px]" style={{ color: mastered ? r.tint : C.dim }}>{pct}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: C.bg2 }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: r.tint, boxShadow: `0 0 8px ${r.tint}` }} />
            </div>
            <div className="text-[10px] mt-1.5" style={{ color: C.faint }}>{done}/{total} pathways mastered</div>
          </button>
        );
      })}
    </div>
  );
}

/* ============================== MAP CANVAS ============================== */
function MapCanvas({ mode, positions, placed, lit, connected, nodeLit, nodeColor, hover, setHover, onDiscuss }) {
  const [cam, setCam] = useState({ tx: 0, ty: 0, k: 1 });
  const drag = useRef(null);
  const onDown = (e) => (drag.current = { x: e.clientX, y: e.clientY, tx: cam.tx, ty: cam.ty });
  const onMove = (e) => { if (drag.current) setCam((c) => ({ ...c, tx: drag.current.tx + (e.clientX - drag.current.x), ty: drag.current.ty + (e.clientY - drag.current.y) })); };
  const onUp = () => (drag.current = null);
  const zoom = (f) => setCam((c) => ({ ...c, k: Math.min(2.4, Math.max(0.45, c.k * f)) }));

  const visible = pathways.filter((p) => (mode === "test" ? lit.has(p.id) : placed.has(p.id)));
  const nodeIds = new Set();
  visible.forEach((p) => p.nodes.forEach((n) => nodeIds.add(n.id)));

  return (
    <div className="absolute inset-0">
      <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} className="w-full h-full select-none"
        style={{ cursor: drag.current ? "grabbing" : "grab" }}
        onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}
        onWheel={(e) => zoom(e.deltaY < 0 ? 1.12 : 0.89)}>
        <defs>
          <pattern id="grid" width="34" height="34" patternUnits="userSpaceOnUse">
            <path d="M 34 0 L 0 0 0 34" fill="none" stroke={C.grid} strokeWidth="1" />
          </pattern>
        </defs>
        <rect x={-3000} y={-3000} width={9000} height={9000} fill="url(#grid)" onPointerDown={onDown} />

        <g transform={`translate(${cam.tx},${cam.ty}) scale(${cam.k})`}>
          {/* regions */}
          {Object.values(regions).map((r) => {
            const done = r.pathways.filter((p) => lit.has(p)).length;
            const pct = done / r.pathways.length;
            const show = mode === "test" || r.pathways.some((p) => placed.has(p));
            if (!show) return null;
            return (
              <g key={r.id}>
                <rect x={r.rect.x} y={r.rect.y} width={r.rect.w} height={r.rect.h} rx="20"
                  fill={r.tint} fillOpacity={0.04 + pct * 0.08} stroke={r.tint}
                  strokeOpacity={mode === "test" ? 0.5 : 0.22} strokeWidth="1.5"
                  strokeDasharray={mode === "test" ? "none" : "6 6"} />
                <text x={r.rect.x + 14} y={r.rect.y + 26} fontSize="13" fill={r.tint} fillOpacity="0.85"
                  style={{ fontFamily: "'Space Grotesk',sans-serif", letterSpacing: "0.05em" }}>{r.label.toUpperCase()}</text>
              </g>
            );
          })}

          {/* pathway edges */}
          {visible.map((p) => edgesFor(p).map(([a, b], i) => {
            const A = positions[a], B = positions[b]; if (!A || !B) return null;
            const litEdge = nodeLit(a) && nodeLit(b);
            return <Edge key={`${p.id}-${i}`} a={A} b={B} color={litEdge ? p.color : C.unlit} lit={litEdge} />;
          }))}

          {/* bridge edges + junctions */}
          {[...connected].map((bid) => {
            const b = bridges.find((x) => x.id === bid);
            if (b.drawEdge) { const [a, c] = b.drawEdge; const A = positions[a], B = positions[c];
              return A && B ? <Edge key={bid} a={A} b={B} color="#7dd3fc" lit bridge /> : null; }
            if (b.junction) { const n = positions[b.junction];
              return n ? <circle key={`j-${bid}`} cx={n.x} cy={n.y} r="34" fill="none" stroke="#7dd3fc" strokeWidth="1.5" className="ring-pulse" /> : null; }
            return null;
          })}

          {/* nodes */}
          {[...nodeIds].map((nid) => {
            const pos = positions[nid]; if (!pos) return null;
            const color = nodeColor(nid); const isLit = color !== C.unlit;
            return <NodeDot key={nid} pos={pos} label={allNodes[nid]?.label || nid} color={color} lit={isLit}
              hovered={hover === nid} onEnter={() => setHover(nid)} onLeave={() => setHover(null)}
              onDiscuss={() => onDiscuss(nid, allNodes[nid]?.label || nid)} />;
          })}
        </g>
      </svg>

      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-20">
        <CamBtn onClick={() => zoom(1.2)}><ZoomIn size={16} /></CamBtn>
        <CamBtn onClick={() => zoom(0.83)}><ZoomOut size={16} /></CamBtn>
        <CamBtn onClick={() => setCam({ tx: 0, ty: 0, k: 1 })}><Crosshair size={16} /></CamBtn>
      </div>

      {mode === "sandbox" && placed.size === 0 && (
        <div className="absolute inset-0 grid place-items-center pointer-events-none">
          <div className="text-center" style={{ color: C.faint }}>
            <Network size={40} className="mx-auto mb-3" style={{ opacity: 0.4 }} />
            <p className="text-sm">Search a pathway above to begin building your map.</p>
          </div>
        </div>
      )}
    </div>
  );
}
function CamBtn({ children, onClick }) {
  return <button onClick={onClick} className="grid place-items-center rounded-lg" style={{ width: 36, height: 36, background: C.panel, border: `1px solid ${C.edge}`, color: C.dim }}>{children}</button>;
}
function Edge({ a, b, color, lit, bridge }) {
  return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color}
    strokeWidth={lit ? (bridge ? 2.4 : 2) : 1.4} strokeOpacity={lit ? 0.9 : 0.4}
    strokeDasharray={lit ? "7 9" : "none"} className={lit ? "edge-flow" : ""}
    style={lit ? { filter: `drop-shadow(0 0 4px ${color})` } : {}} />;
}
function NodeDot({ pos, label, color, lit, hovered, onEnter, onLeave, onDiscuss }) {
  const r = 9;
  return (
    <g transform={`translate(${pos.x},${pos.y})`} onPointerEnter={onEnter} onPointerLeave={onLeave}
      style={{ cursor: "pointer" }} onPointerDown={(e) => e.stopPropagation()}>
      {lit && <circle r={r + 7} fill={color} fillOpacity="0.12" className="pulse-soft" />}
      <circle r={r} fill={lit ? color : C.panel} stroke={lit ? "#fff" : C.unlit} strokeOpacity={lit ? 0.7 : 1}
        strokeWidth="1.5" style={lit ? { filter: `drop-shadow(0 0 6px ${color})` } : {}} />
      <text x="0" y={-18} textAnchor="middle" fontSize="12" fill={lit ? "#fff" : C.faint}
        style={{ fontFamily: "'JetBrains Mono',monospace", fontWeight: 500 }}>{label}</text>
      {hovered && (
        <g transform="translate(16,-8)">
          <rect width="78" height="22" rx="6" fill={C.panel} stroke={C.edge} />
          <text x="9" y="15" fontSize="11" fill="#7dd3fc" style={{ cursor: "pointer" }}
            onPointerDown={(e) => { e.stopPropagation(); onDiscuss(); }}>⤷ Discuss</text>
        </g>
      )}
    </g>
  );
}

/* ============================== RIGHT PANEL ============================= */
function RightPanel({ panel, progress, onSubmit, onReveal, onClose, flash }) {
  const [val, setVal] = useState("");
  const [shake, setShake] = useState(false);
  const inputRef = useRef(null);
  useEffect(() => { setVal(""); inputRef.current?.focus(); }, [panel]);

  const wrong = (msg) => { setShake(true); setTimeout(() => setShake(false), 350); flash(msg || "Not quite — try again", false); };
  const go = () => { onSubmit(val, wrong); setVal(""); };

  let title, sub, prompt, accent = C.accent, isRecall = false, stepInfo = null;
  const p = panel.pid ? byId[panel.pid] : null;

  if (panel.type === "recall") {
    accent = p.color; isRecall = true;
    const cur = progress[panel.pid] || 0;
    const steps = p.nodes.length - 1;
    const prev = p.nodes[cur].label;
    title = "Recall the sequence"; sub = p.name;
    prompt = `Starting from ${p.nodes[0].label}, name each step in order. What comes after ${prev}?`;
    stepInfo = { cur, steps };
  } else if (panel.type === "concept" || panel.type === "testConcept") {
    accent = p.color; title = panel.type === "concept" ? "Lock-in question" : "Checkpoint"; sub = p.name; prompt = p.lockIn.q;
  } else if (panel.type === "bridge") {
    const b = bridges.find((x) => x.id === panel.bid);
    title = "Bridge question"; sub = `${byId[b.a].name} ↔ ${byId[b.b].name}`; prompt = b.q;
  } else if (panel.type === "testIdentify") {
    const r = regions[panel.rid]; accent = r.tint; title = "Identify the pathway"; sub = r.label; prompt = r.prompt;
  }

  return (
    <aside className="w-80 shrink-0 flex flex-col border-l" style={{ background: C.panel, borderColor: C.edge }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: C.edgeSoft }}>
        <span className="flex items-center gap-2 text-[10px] uppercase tracking-widest" style={{ color: accent, letterSpacing: "0.15em" }}>
          {isRecall ? <ListOrdered size={13} /> : <Sparkles size={13} />} {title}
        </span>
        <button onClick={onClose} style={{ color: C.faint }}><X size={16} /></button>
      </div>

      <div className="p-4 flex flex-col gap-4">
        <div>
          <div className="text-sm font-medium mb-1" style={{ color: "#fff" }}>{sub}</div>
          <div className="w-12 h-0.5 rounded-full" style={{ background: accent, boxShadow: `0 0 8px ${accent}` }} />
        </div>

        {isRecall && stepInfo && (
          <div>
            <div className="flex gap-1 mb-1.5">
              {Array.from({ length: stepInfo.steps }).map((_, i) => (
                <div key={i} className="flex-1 h-1 rounded-full" style={{ background: i < stepInfo.cur ? accent : C.edge,
                  boxShadow: i < stepInfo.cur ? `0 0 6px ${accent}` : "none" }} />
              ))}
            </div>
            <div className="text-[11px]" style={{ color: C.faint }}>Step {stepInfo.cur + 1} of {stepInfo.steps}</div>
          </div>
        )}

        <p className="text-sm leading-relaxed" style={{ color: C.text }}>{prompt}</p>

        <input ref={inputRef} value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && go()}
          placeholder="Type your answer…" className={`px-3 py-2.5 rounded-lg outline-none text-sm ${shake ? "shake" : ""}`}
          style={{ background: C.bg2, border: `1px solid ${shake ? C.bad : C.edge}`, color: C.text }} />

        <div className="flex gap-2">
          <button onClick={go} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: accent, color: "#04101f", boxShadow: `0 0 18px ${accent}55` }}>
            <CheckCircle2 size={16} /> Submit
          </button>
          {isRecall && (
            <button onClick={onReveal} className="flex items-center justify-center gap-1.5 px-3 rounded-lg text-sm"
              style={{ background: C.bg2, border: `1px solid ${C.edge}`, color: C.dim }} title="Reveal this step">
              <Eye size={15} />
            </button>
          )}
        </div>

        <p className="text-[11px] leading-relaxed" style={{ color: C.faint }}>
          {isRecall ? "Each correct molecule lights up the chain. Reveal a step if you're stuck — then the lock-in question seals the pathway."
            : "Answers are case-insensitive and accept common synonyms."}
        </p>
      </div>
    </aside>
  );
}

/* ================================ FORUM ================================ */
const SEED_THREADS = [
  { id: 1, nodeId: "g6p", title: "Hexokinase vs Glucokinase — keeping them straight", author: "mehdi_s", body: "Hexokinase: low Km, everywhere, inhibited by G6P. Glucokinase: high Km, liver/β-cells, not inhibited. 'Gluco = Gut/liver, Greedy (high Km).'" },
  { id: 2, nodeId: "acetylcoa", title: "Why Acetyl-CoA is the hub of everything", author: "premed_p", body: "Carbs, fats, and ketogenic amino acids all funnel into Acetyl-CoA. If you memorize one junction, make it this." },
  { id: 3, nodeId: "isocitrate", title: "IDH is the rate-limiting step — here's why", author: "ranchbio", body: "Isocitrate dehydrogenase is regulated by ADP/Ca²⁺ (activate) and ATP/NADH (inhibit). It's the committed oxidative step." },
  { id: 4, nodeId: null, title: "Best mnemonic for the full TCA order?", author: "studygrind", body: "Citrate Is Krebs' Starting Substrate For Making Oxaloacetate. Drop yours below." },
  { id: 5, nodeId: "tsh", title: "TSH vs TRH — which is pituitary?", author: "endo_nerd", body: "TRH from hypothalamus → TSH from anterior pituitary → T3/T4 from thyroid → negative feedback on both. The 'T' that's released second is pituitary." },
];
function Forum({ filter, clearFilter }) {
  const [threads, setThreads] = useState(SEED_THREADS);
  const [open, setOpen] = useState(null);
  const [draft, setDraft] = useState("");
  const shown = filter ? threads.filter((t) => t.nodeId === filter.nodeId) : threads;
  const post = () => { if (!draft.trim()) return;
    setThreads((ts) => [{ id: Date.now(), nodeId: filter?.nodeId || null, title: draft.trim(), author: "you", body: "(new thread)" }, ...ts]);
    setDraft(""); };
  return (
    <div className="absolute inset-0 overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-5">
          <h2 className="text-lg font-semibold" style={{ fontFamily: "'Space Grotesk',sans-serif" }}>Discussion</h2>
          {filter && <button onClick={clearFilter} className="flex items-center gap-1.5 text-xs mt-1" style={{ color: "#7dd3fc" }}>
            <ArrowLeft size={12} /> Filtered to “{filter.label}” — show all</button>}
        </div>
        <div className="flex items-center gap-2 mb-5 px-3 py-2 rounded-xl" style={{ background: C.panel, border: `1px solid ${C.edge}` }}>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && post()}
            placeholder={filter ? `Start a thread about ${filter.label}…` : "Start a new thread…"}
            className="bg-transparent outline-none text-sm flex-1" style={{ color: C.text }} />
          <button onClick={post} className="grid place-items-center rounded-lg" style={{ width: 32, height: 32, background: "#13224a", color: "#7dd3fc" }}><Send size={15} /></button>
        </div>
        <div className="flex flex-col gap-3">
          {shown.length === 0 && <p className="text-sm" style={{ color: C.faint }}>No threads here yet — start the first one above.</p>}
          {shown.map((t) => (
            <button key={t.id} onClick={() => setOpen(open === t.id ? null : t.id)} className="text-left px-4 py-3 rounded-xl"
              style={{ background: C.panel, border: `1px solid ${C.edge}` }}>
              <div className="text-sm font-medium" style={{ color: "#fff" }}>{t.title}</div>
              <div className="text-[11px] mt-0.5" style={{ color: C.faint }}>
                {allNodes[t.nodeId]?.label ? `${allNodes[t.nodeId].label} · ` : ""}@{t.author}</div>
              {open === t.id && <p className="text-sm mt-3 leading-relaxed" style={{ color: C.dim }}>{t.body}</p>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================================ TOAST ================================ */
function Toast({ toast }) {
  return (
    <div className="fixed bottom-6 left-1/2 px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 fade-up z-50"
      style={{ transform: "translateX(-50%)", background: C.panel, border: `1px solid ${toast.ok ? C.good : C.bad}`,
        color: toast.ok ? "#bbf7d0" : "#fecdd3", boxShadow: `0 0 22px ${toast.ok ? "rgba(52,211,153,0.3)" : "rgba(251,113,133,0.3)"}` }}>
      {toast.ok ? <CheckCircle2 size={15} style={{ color: C.good }} /> : <X size={15} style={{ color: C.bad }} />}{toast.msg}
    </div>
  );
}
