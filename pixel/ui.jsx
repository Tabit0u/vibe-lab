/* =========================================================
 * pixel/ui.jsx — Affichage de l'onglet 🎨 Pixel Studio
 * Assemblage uniquement : logique pure dans pixel/{constants,
 * encoding, document, tree, paint, render, io}.js,
 * hooks dans pixel/hooks.js, composants dans components.jsx
 * ======================================================= */
function PixelStudio({ busEmit }) {
  const canvasRef = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState("");
  const [pngScale, setPngScale] = useState(8);
  const [newSize, setNewSize] = useState(16);

  const px = usePixelDoc(busEmit);
  const { doc, replaceDoc, selId, setSelId, entries, applyChecker } = px;
  const session = usePaintSession(doc, px.setDoc, px.paintLayer, busEmit);
  const { tool, setTool, color, setColor, brush, setBrush, view, setCanvasSize, fitToCanvas, zoomBy } = session;

  /* renommage inline */
  const startRename = (node) => { setEditingId(node.id); setDraft(node.name); };
  const commitRename = () => {
    if (editingId == null) return;
    px.renameNode(editingId, draft);
    setEditingId(null);
  };

  /* save / load */
  const exportPng = () => { exportPngFile(doc, "vibe-pixel.png", pngScale); busEmit("pixel:png", { scale: pngScale }); };
  const exportJson = () => { exportPixelJson(doc); busEmit("pixel:exported", {}); };
  const importJson = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    importPixelJsonFile(f)
      .then((d) => { replaceDoc(d); busEmit("pixel:imported", {}); })
      .catch(() => busEmit("pixel:error", {}));
    e.target.value = "";
  };
  const resetDoc = () => replaceDoc(newPixelDoc(newSize, newSize));

  return (
    <div className="flex flex-col gap-3 text-sm">
      <PixelCanvas doc={doc} view={view} canvasRef={canvasRef}
                   setCanvasSize={setCanvasSize} fitToCanvas={fitToCanvas} zoomBy={zoomBy}
                   handlers={session.handlers} />

      <div className="flex flex-wrap items-center gap-1.5">
        <PaintToolbar tool={tool} setTool={setTool} brush={brush} setBrush={setBrush} color={color} setColor={setColor} />
        <ViewportBar view={view} fitToCanvas={() => fitToCanvas(canvasRef.current ? canvasRef.current.clientWidth : 0, canvasRef.current ? canvasRef.current.clientHeight : 0)} zoomBy={zoomBy} />
      </div>

      <PaletteBar palette={doc.palette} color={color} setColor={setColor} />

      {/* damier + calques */}
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => applyChecker(color)} className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold active:scale-95" title="Remplir le calque en damier">▦ Damier</button>
        <button onClick={px.addLayer} className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold active:scale-95">➕ Calque</button>
        <button onClick={px.addGroup} className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold active:scale-95">📁 Groupe</button>
      </div>

      <LayerTree
        doc={doc} entries={entries} selId={selId}
        editingId={editingId} draft={draft} setDraft={setDraft}
        onSelect={(id) => { setSelId(id); setEditingId(null); }}
        onStartRename={startRename}
        onCommitRename={commitRename}
        onToggleVisible={(id) => px.setNodeProps(id, (n) => ({ ...n, visible: !n.visible }))}
        onAlpha={(id, v) => px.setNodeProps(id, (n) => ({ ...n, alpha: v }))}
        onMove={px.moveNodeBy}
        onDelete={px.delNode}
        onReparent={px.reparent} />

      <SaveLoadBar
        pngScale={pngScale} setPngScale={setPngScale}
        newSize={newSize} setNewSize={setNewSize}
        onExportPng={exportPng} onExportJson={exportJson}
        onImportJson={importJson} onNewDoc={resetDoc} />
    </div>
  );
}
