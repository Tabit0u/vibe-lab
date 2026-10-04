/* =========================================================
 * pixel/ui.jsx — Affichage de l'onglet 🎨 Pixel Studio
 * (logique pure dans pixel/logic.js)
 * ======================================================= */
function PixelStudio({ busEmit }) {
  const [doc, setDoc] = useState(() => loadPixelLocal() || newPixelDoc(16, 16));
  const [selId, setSelId] = useState(null);
  const [tool, setTool] = useState("brush");
  const [color, setColor] = useState("#000000");
  const [brush, setBrush] = useState(1);
  const [pngScale, setPngScale] = useState(8);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState("");
  const [newSize, setNewSize] = useState(16);
  const canvasRef = useRef(null);
  const fileRef = useRef(null);
  const drawing = useRef(false);

  const entries = useMemo(() => walkNodes(doc.root, null, []), [doc]);
  const sel = useMemo(() => entries.find((e) => e.node.id === selId) || null, [entries, selId]);
  const paintLayer = useMemo(() => {
    if (sel && sel.node.type === "layer") return sel.node;
    if (sel && sel.node.children) { const l = firstLayer(sel.node.children); if (l) return l; }
    return firstLayer(doc.root);
  }, [doc, sel]);

  useEffect(() => { savePixelLocal(doc); }, [doc]);
  useEffect(() => { drawDoc(canvasRef.current, doc, { checker: true }); }, [doc]);

  /* couleur courante → caractère de palette (ajout auto si absente) */
  const colorCharIn = (d) => {
    let palette = d.palette;
    let ci = palette.indexOf(color);
    if (ci === -1) {
      if (palette.length >= PIX_CHARS.length) ci = palette.length - 1;
      else { palette = palette.concat([color]); ci = palette.length - 1; }
    }
    return { palette: palette, ch: pixChar(ci) };
  };

  const cellFromEvent = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return {
      x: Math.floor(((e.clientX - r.left) / r.width) * doc.width),
      y: Math.floor(((e.clientY - r.top) / r.height) * doc.height),
    };
  };

  const paintCell = (e) => {
    const c = cellFromEvent(e);
    if (c.x < 0 || c.y < 0 || c.x >= doc.width || c.y >= doc.height) return;
    if (tool === "picker") {
      const picked = pickColor(doc, c.x, c.y);
      if (picked) { setColor(picked); setTool("brush"); }
      busEmit("pixel:picked", {});
      return;
    }
    if (!paintLayer) return;
    const layerId = paintLayer.id;
    setDoc((d) => {
      const cc = tool === "eraser" ? { palette: d.palette, ch: PIX_EMPTY } : colorCharIn(d);
      return { ...d, palette: cc.palette, root: updateLayerRows(d.root, layerId, (rows) => paintSquare(rows, c.x, c.y, cc.ch, brush)) };
    });
  };

  const applyChecker = () => {
    if (!paintLayer) return;
    const layerId = paintLayer.id;
    setDoc((d) => {
      const cc = colorCharIn(d);
      return { ...d, palette: cc.palette, root: updateLayerRows(d.root, layerId, () => checkerRows(d.width, d.height, cc.ch)) };
    });
    busEmit("pixel:checker", {});
  };

  const onDown = (e) => {
    drawing.current = true;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
    paintCell(e);
  };
  const onMove = (e) => { if (drawing.current) paintCell(e); };
  const onUp = () => { drawing.current = false; };

  /* ---- opérations calques ---- */
  const setNodeProps = (id, fn) => setDoc((d) => ({ ...d, root: updateNode(d.root, id, fn) }));

  const startRename = (node) => { setEditingId(node.id); setDraft(node.name); };
  const commitRename = () => {
    if (editingId == null) return;
    const name = draft.trim();
    if (name) setNodeProps(editingId, (n) => ({ ...n, name: name }));
    setEditingId(null);
  };

  const addLayer = () => {
    const target = sel && sel.node.type === "group" ? sel.node.id : null;
    setDoc((d) => {
      const count = walkNodes(d.root, null, []).filter((x) => x.node.type === "layer").length;
      const layer = makeLayer(d.width, d.height, "Calque " + (count + 1));
      return { ...d, root: insertNode(d.root, sel && sel.node.type === "group" ? sel.node.id : null, layer, 0) };
    });
    busEmit("pixel:layer-added", {});
  };
  const addGroup = () => {
    setDoc((d) => {
      const g = makeGroup("Groupe " + (listGroups(d.root).length + 1));
      return { ...d, root: insertNode(d.root, null, g, 0) };
    });
    busEmit("pixel:group-added", {});
  };
  const delNode = (id) => {
    setDoc((d) => ({ ...d, root: removeNode(d.root, id) }));
    if (selId === id) setSelId(null);
    busEmit("pixel:node-deleted", {});
  };
  const reparent = (id, targetId) => {
    setDoc((d) => {
      const entry = walkNodes(d.root, null, []).find((x) => x.node.id === id);
      if (!entry) return d;
      const node = entry.node;
      const groups = listGroups(d.root).filter((g) => g.id !== id && descendantIds(node).indexOf(g.id) === -1);
      const target = targetId === "root" ? null : groups.filter((g) => String(g.id) === String(targetId))[0] || null;
      if (!target && targetId !== "root") return d;
      const removed = removeNode(d.root, id);
      return { ...d, root: insertNode(removed, target ? target.id : null, node, 0) };
    });
    busEmit("pixel:reparented", {});
  };

  /* ---- save / load ---- */
  const exportPng = () => { exportPngFile(doc, "vibe-pixel.png", pngScale); busEmit("pixel:png", { scale: pngScale }); };
  const exportJson = () => { exportPixelJson(doc); busEmit("pixel:exported", {}); };
  const importJson = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try { setDoc(docFromJson(r.result)); setSelId(null); busEmit("pixel:imported", {}); }
      catch (err) { busEmit("pixel:error", {}); }
    };
    r.readAsText(f);
    e.target.value = "";
  };
  const resetDoc = () => { const d = newPixelDoc(newSize, newSize); setDoc(d); setSelId(null); };

  /* ---- rendu de l'arbre de calques ---- */
  const parentValue = (id) => {
    const entry = entries.filter((x) => x.node.id === id)[0];
    return entry && entry.parent ? String(entry.parent.id) : "root";
  };
  const groupOptions = (node) => {
    const opts = [{ id: "root", name: "⬅ racine" }];
    listGroups(doc.root)
      .filter((g) => g.id !== node.id && descendantIds(node).indexOf(g.id) === -1)
      .forEach((g) => opts.push({ id: String(g.id), name: "📁 " + g.name }));
    return opts;
  };

  const renderNodes = (list, depth) => list.map((node) => {
    const isSel = node.id === selId;
    return (
      <div key={node.id}>
        <div className={"flex items-center gap-1 rounded-lg px-1.5 py-1 " + (isSel ? "bg-violet-600/30 ring-1 ring-violet-500" : "bg-slate-800/60")}
             style={{ marginLeft: depth * 12 }}>
          <button onClick={() => setNodeProps(node.id, (n) => ({ ...n, visible: !n.visible }))}
                  className="w-6 text-xs" title="Visibilité">{node.visible ? "👁" : "🚫"}</button>
          {editingId === node.id ? (
            <input autoFocus value={draft}
                   onChange={(e) => setDraft(e.target.value)}
                   onBlur={commitRename}
                   onKeyDown={(e) => { if (e.key === "Enter") commitRename(); }}
                   className="min-w-0 flex-1 rounded bg-slate-900 px-1 text-xs text-white" />
          ) : (
            <button onClick={() => { setSelId(node.id); setEditingId(null); }}
                    className={"min-w-0 flex-1 truncate text-left text-xs " + (isSel ? "text-white" : "text-slate-300")}>
              {node.type === "group" ? "📁 " : ""}{node.name}
            </button>
          )}
          <button onClick={() => startRename(node)} className="w-5 text-[11px] text-slate-400" title="Renommer">✎</button>
          <button onClick={() => setDoc((d) => ({ ...d, root: moveNode(d.root, node.id, -1) }))} className="w-5 text-[11px] text-slate-400" title="Monter">↑</button>
          <button onClick={() => setDoc((d) => ({ ...d, root: moveNode(d.root, node.id, 1) }))} className="w-5 text-[11px] text-slate-400" title="Descendre">↓</button>
          <button onClick={() => delNode(node.id)} className="w-5 text-[11px] text-slate-400" title="Supprimer">🗑</button>
        </div>
        {isSel && (
          <div className="mt-1 mb-1 flex items-center gap-2 rounded-lg bg-slate-800/30 px-2 py-1 text-[11px] text-slate-400"
               style={{ marginLeft: depth * 12 }}>
            <span className="whitespace-nowrap">Opacité</span>
            <input type="range" min="0" max="100" value={Math.round(clamp01(node.alpha) * 100)}
                   onChange={(e) => setNodeProps(node.id, (n) => ({ ...n, alpha: e.target.value / 100 }))}
                   className="min-w-0 flex-1 accent-violet-500" />
            <select value={parentValue(node.id)} onChange={(e) => reparent(node.id, e.target.value)}
                    className="min-w-0 max-w-[45%] rounded bg-slate-900 px-1 py-0.5 text-[11px] text-slate-300" title="Reparenter">
              {groupOptions(node).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
        )}
        {node.children && renderNodes(node.children, depth + 1)}
      </div>
    );
  });

  return (
    <div className="flex flex-col gap-3 text-sm">
      {/* canvas */}
      <div className="flex justify-center rounded-xl bg-slate-800/50 p-2">
        <canvas ref={canvasRef}
                onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
                className="rounded-md shadow-lg"
                style={{ width: "100%", maxWidth: Math.min(340, doc.width * 24) + "px", touchAction: "none", imageRendering: "pixelated" }} />
      </div>

      {/* outils */}
      <div className="flex flex-wrap items-center gap-1.5">
        {[
          { id: "brush", label: "🖌 Pinceau" },
          { id: "eraser", label: "🧽 Gomme" },
          { id: "picker", label: "💧 Pipette" },
        ].map((t) => (
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

      {/* palette */}
      <div className="flex flex-wrap gap-1.5">
        {doc.palette.map((c, i) => (
          <button key={c + i} onClick={() => setColor(c)} title={c}
                  className={"h-7 w-7 rounded border-2 " + (color.toLowerCase() === c.toLowerCase() ? "border-violet-400" : "border-slate-700")}
                  style={{ background: c }} />
        ))}
      </div>

      {/* damier + calques */}
      <div className="flex flex-wrap gap-1.5">
        <button onClick={applyChecker} className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold active:scale-95" title="Remplir le calque en damier">▦ Damier</button>
        <button onClick={addLayer} className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold active:scale-95">➕ Calque</button>
        <button onClick={addGroup} className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold active:scale-95">📁 Groupe</button>
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] text-slate-400">
          Calques (bas de liste = devant) · clic : sélectionner · ✎ renommer · ↑↓ déplacer · select : reparenter · 🗑 supprimer
        </p>
        {renderNodes(doc.root, 0)}
      </div>

      {/* save / load */}
      <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-800 pt-3">
        <button onClick={exportPng} className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold active:scale-95">⬇ PNG</button>
        <select value={pngScale} onChange={(e) => setPngScale(Number(e.target.value))} className="rounded-lg bg-slate-800 px-1.5 py-1.5 text-xs">
          {[1, 4, 8, 16].map((s) => <option key={s} value={s}>×{s}</option>)}
        </select>
        <button onClick={exportJson} className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold active:scale-95">⬇ .json</button>
        <button onClick={() => fileRef.current && fileRef.current.click()} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold active:scale-95">⬆ .json</button>
        <button onClick={resetDoc} className="rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-semibold active:scale-95">🆕 Nouveau</button>
        <select value={newSize} onChange={(e) => setNewSize(Number(e.target.value))} className="rounded-lg bg-slate-800 px-1.5 py-1.5 text-xs">
          {[8, 16, 24, 32].map((s) => <option key={s} value={s}>{s}×{s}</option>)}
        </select>
        <input ref={fileRef} type="file" accept=".json,application/json" onChange={importJson} className="hidden" />
      </div>
      <p className="text-[11px] text-slate-500">
        Auto-save localStorage · le .json est éditable à la main : palette + 1 caractère par pixel ("." = transparent)
      </p>
    </div>
  );
}
