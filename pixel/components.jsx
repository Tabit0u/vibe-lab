/* =========================================================
 * pixel/components.jsx — composants UI de Pixel Studio
 * <PixelCanvas> <PaintToolbar> <PaletteBar> <LayerTree>
 * <SaveLoadBar> — composants purs, pilotés par props
 * ======================================================= */

function PixelCanvas({ doc, view, setCanvasSize, fitToCanvas, zoomBy, handlers, canvasRef }) {
  useEffect(() => {
    drawDoc(canvasRef.current, doc, { checker: true, view: view });
  }, [doc, view]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const apply = () => setCanvasSize(c.clientWidth, c.clientHeight);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(c);
    return () => ro.disconnect();
  }, [setCanvasSize]);

  return (
    <div className="relative overflow-hidden rounded-xl bg-slate-800/50 p-2">
      <canvas ref={canvasRef}
              {...handlers}
              className="block h-[46vh] w-full touch-none rounded-md shadow-lg"
              style={{ imageRendering: "pixelated" }} />
      {/* aide tactile */}
      <p className="pointer-events-none absolute bottom-3 left-0 right-0 text-center text-[10px] text-slate-400/70">
        1 doigt : peindre · 2 doigts : zoomer / déplacer
      </p>
    </div>
  );
}

function ViewportBar({ view, fitToCanvas, zoomBy }) {
  const btn = "rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200 active:scale-95";
  return (
    <div className="flex items-center gap-1.5">
      <button onClick={() => zoomBy(1 / 1.25)} className={btn} title="Dézoomer">➖</button>
      <span className="min-w-[3rem] text-center font-mono text-[11px] text-slate-400">×{view.scale}</span>
      <button onClick={() => zoomBy(1.25)} className={btn} title="Zoomer">➕</button>
      <button onClick={fitToCanvas} className={btn} title="Ajuster">⤢</button>
    </div>
  );
}

function PaintToolbar({ tool, setTool, brush, setBrush, color, setColor }) {
  const tools = [
    { id: "brush", label: "🖌 Pinceau" },
    { id: "eraser", label: "🧽 Gomme" },
    { id: "picker", label: "💧 Pipette" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tools.map((t) => (
        <button key={t.id} onClick={() => setTool(t.id)}
                className={"rounded-lg px-2.5 py-1.5 text-xs font-semibold active:scale-95 " + (tool === t.id ? "bg-violet-600 text-white" : "bg-slate-800 text-slate-300")}>
          {t.label}
        </button>
      ))}
      <div className="flex items-center gap-1 rounded-lg bg-slate-800 px-2 py-1">
        <span className="text-[11px] text-slate-400">Brosse</span>
        {[1, 2, 3, 4].map((s) => (
          <button key={s} onClick={() => setBrush(s)}
                  className={"h-6 w-6 rounded text-xs font-bold " + (brush === s ? "bg-violet-600 text-white" : "bg-slate-700 text-slate-300")}>
            {s}
          </button>
        ))}
      </div>
      <input type="color" value={color} onChange={(e) => setColor(e.target.value)}
             className="h-8 w-10 cursor-pointer rounded border-0 bg-slate-800 p-0.5" title="Color picker" />
      <span className="font-mono text-[11px] text-slate-400">{color}</span>
    </div>
  );
}

function PaletteBar({ palette, color, setColor }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {palette.map((c, i) => (
        <button key={c + i} onClick={() => setColor(c)} title={c}
                className={"h-7 w-7 rounded border-2 " + (color.toLowerCase() === c.toLowerCase() ? "border-violet-400" : "border-slate-700")}
                style={{ background: c }} />
      ))}
    </div>
  );
}

function LayerTree({ doc, entries, selId, editingId, draft, setDraft,
                     onSelect, onStartRename, onCommitRename,
                     onToggleVisible, onAlpha, onMove, onDelete, onReparent }) {
  const renderNodes = (list, depth) => list.map((node) => {
    const isSel = node.id === selId;
    return (
      <div key={node.id}>
        <div className={"flex items-center gap-1 rounded-lg px-1.5 py-1 " + (isSel ? "bg-violet-600/30 ring-1 ring-violet-500" : "bg-slate-800/60")}
             style={{ marginLeft: depth * 12 }}>
          <button onClick={() => onToggleVisible(node.id)}
                  className="w-6 text-xs" title="Visibilité">{node.visible ? "👁" : "🚫"}</button>
          {editingId === node.id ? (
            <input autoFocus value={draft}
                   onChange={(e) => setDraft(e.target.value)}
                   onBlur={onCommitRename}
                   onKeyDown={(e) => { if (e.key === "Enter") onCommitRename(); }}
                   className="min-w-0 flex-1 rounded bg-slate-900 px-1 text-xs text-white" />
          ) : (
            <button onClick={() => onSelect(node.id)}
                    className={"min-w-0 flex-1 truncate text-left text-xs " + (isSel ? "text-white" : "text-slate-300")}>
              {node.type === "group" ? "📁 " : ""}{node.name}
            </button>
          )}
          <button onClick={() => onStartRename(node)} className="w-5 text-[11px] text-slate-400" title="Renommer">✎</button>
          <button onClick={() => onMove(node.id, -1)} className="w-5 text-[11px] text-slate-400" title="Monter">↑</button>
          <button onClick={() => onMove(node.id, 1)} className="w-5 text-[11px] text-slate-400" title="Descendre">↓</button>
          <button onClick={() => onDelete(node.id)} className="w-5 text-[11px] text-slate-400" title="Supprimer">🗑</button>
        </div>
        {isSel && (
          <div className="mt-1 mb-1 flex items-center gap-2 rounded-lg bg-slate-800/30 px-2 py-1 text-[11px] text-slate-400"
               style={{ marginLeft: depth * 12 }}>
            <span className="whitespace-nowrap">Opacité</span>
            <input type="range" min="0" max="100" value={Math.round(clamp01(node.alpha) * 100)}
                   onChange={(e) => onAlpha(node.id, e.target.value / 100)}
                   className="min-w-0 flex-1 accent-violet-500" />
            <select value={parentValueOf(entries, node.id)} onChange={(e) => onReparent(node.id, e.target.value)}
                    className="min-w-0 max-w-[45%] rounded bg-slate-900 px-1 py-0.5 text-[11px] text-slate-300" title="Reparenter">
              {groupOptionsFor(doc.root, node).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        )}
        {node.children && renderNodes(node.children, depth + 1)}
      </div>
    );
  });
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[11px] text-slate-400">
        Calques (bas de liste = devant) · clic : sélectionner · ✎ renommer · ↑↓ déplacer · select : reparenter · 🗑 supprimer
      </p>
      {renderNodes(doc.root, 0)}
    </div>
  );
}

function SaveLoadBar({ pngScale, setPngScale, newSize, setNewSize,
                       onExportPng, onExportJson, onImportJson, onNewDoc }) {
  const fileRef = useRef(null);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-800 pt-3">
        <button onClick={onExportPng} className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold active:scale-95">⬇ PNG</button>
        <select value={pngScale} onChange={(e) => setPngScale(Number(e.target.value))} className="rounded-lg bg-slate-800 px-1 py-1.5 text-xs">
          {[1, 4, 8, 16].map((s) => <option key={s} value={s}>×{s}</option>)}
        </select>
        <button onClick={onExportJson} className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold active:scale-95">⬇ .json</button>
        <button onClick={() => fileRef.current && fileRef.current.click()} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold active:scale-95">⬆ .json</button>
        <button onClick={onNewDoc} className="rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-semibold active:scale-95">🆕 Nouveau</button>
        <select value={newSize} onChange={(e) => setNewSize(Number(e.target.value))} className="rounded-lg bg-slate-800 px-1 py-1.5 text-xs">
          {[8, 16, 24, 32].map((s) => <option key={s} value={s}>{s}×{s}</option>)}
        </select>
        <input ref={fileRef} type="file" accept=".json,application/json" onChange={onImportJson} className="hidden" />
      </div>
      <p className="text-[11px] text-slate-500">
        Auto-save localStorage · le .json est éditable à la main : palette + 1 caractère par pixel ("." = transparent)
      </p>
    </div>
  );
}
