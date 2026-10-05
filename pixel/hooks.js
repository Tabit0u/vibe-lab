/* =========================================================
 * pixel/hooks.js — hooks React : état doc + actions calques
 * usePixelDoc   : doc + autosave + opérations arbre/groupes
 * usePaintSession : outil, couleur, brosse, gestion pointeur
 * ======================================================= */

function usePixelDoc(busEmit) {
  const [doc, setDoc] = useState(() => loadPixelLocal() || newPixelDoc(16, 16));
  const [selId, setSelId] = useState(null);

  useEffect(() => { savePixelLocal(doc); }, [doc]);

  const entries = useMemo(() => walkNodes(doc.root, null, []), [doc]);
  const sel = useMemo(() => entries.find((e) => e.node.id === selId) || null, [entries, selId]);
  const paintLayer = useMemo(() => {
    if (sel && sel.node.type === "layer") return sel.node;
    if (sel && sel.node.children) { const l = firstLayer(sel.node.children); if (l) return l; }
    return firstLayer(doc.root);
  }, [doc, sel]);

  /* remplace tout le doc (nouveau / import) et réinitialise la sélection */
  const replaceDoc = (d) => { setDoc(d); setSelId(null); };

  /* opérations calques */
  const setNodeProps = (id, fn) => setDoc((d) => ({ ...d, root: updateNode(d.root, id, fn) }));

  const renameNode = (id, name) => {
    const n = name.trim();
    if (n) setNodeProps(id, (node) => ({ ...node, name: n }));
  };

  const addLayer = () => {
    setDoc((d) => {
      const layer = makeLayer(d.width, d.height, "Calque " + (countLayers(d.root) + 1));
      const target = sel && sel.node.type === "group" ? sel.node.id : null;
      return { ...d, root: insertNode(d.root, target, layer, 0) };
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

  const moveNodeBy = (id, dir) => setDoc((d) => ({ ...d, root: moveNode(d.root, id, dir) }));

  const reparent = (id, targetId) => {
    setDoc((d) => ({ ...d, root: reparentNode(d.root, id, targetId) }));
    busEmit("pixel:reparented", {});
  };

  const applyChecker = (color) => {
    if (!paintLayer) return;
    const layerId = paintLayer.id;
    setDoc((d) => {
      const cc = colorToChar(d.palette, color);
      return { ...d, palette: cc.palette, root: updateLayerRows(d.root, layerId, () => checkerRows(d.width, d.height, cc.ch)) };
    });
    busEmit("pixel:checker", {});
  };

  return {
    doc, setDoc, replaceDoc, selId, setSelId, entries, sel, paintLayer,
    setNodeProps, renameNode, addLayer, addGroup, delNode, moveNodeBy, reparent, applyChecker,
  };
}

function usePaintSession(doc, setDoc, paintLayer, busEmit) {
  const [tool, setTool] = useState("brush");
  const [color, setColor] = useState("#000000");
  const [brush, setBrush] = useState(1);
  const drawing = useRef(false);

  const cellFromEvent = (e, canvas) => {
    const r = canvas.getBoundingClientRect();
    return {
      x: Math.floor(((e.clientX - r.left) / r.width) * doc.width),
      y: Math.floor(((e.clientY - r.top) / r.height) * doc.height),
    };
  };

  const paintCell = (e, setDoc) => {
    const c = cellFromEvent(e, e.currentTarget);
    if (c.x < 0 || c.y < 0 || c.x >= doc.width || c.y >= doc.height) return;
    if (tool === "picker") {
      const picked = pickColor(doc, c.x, c.y);
      if (picked) { setColor(picked); setTool("brush"); }
      busEmit("pixel:picked", {});
      return;
    }
    if (!paintLayer) return;
    const layerId = paintLayer.id;
    setDoc((d) => paintAt(d, layerId, c, tool, color, brush));
  };

  const handlers = {
    onPointerDown: (e) => {
      drawing.current = true;
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
      paintCell(e);
    },
    onPointerMove: (e) => { if (drawing.current) paintCell(e); },
    onPointerUp: () => { drawing.current = false; },
    onPointerCancel: () => { drawing.current = false; },
  };

  return { tool, setTool, color, setColor, brush, setBrush, handlers };
}
