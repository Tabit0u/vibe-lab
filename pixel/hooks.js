/* =========================================================
 * pixel/hooks.js — hooks React : état doc + actions calques
 * usePixelDoc   : doc + autosave + opérations arbre/groupes
 * usePaintSession : outil, couleur, brosse, gestion pointeur
 * ======================================================= */

function usePixelDoc(busEmit) {
  const [hist, setHist] = useState(() => newHistory(loadPixelLocal() || newPixelDoc(16, 16)));
  const doc = hist.present;
  const [selId, setSelId] = useState(null);

  useEffect(() => { savePixelLocal(doc); }, [doc]);

  /* commit = nouvelle entrée undo ; coalesce = maj sans entrée (traction en cours) */
  const commit = (fn) => setHist((h) => pushHistory(h, fn(h.present)));
  const coalesce = (fn) => setHist((h) => coalesceHistory(h, fn(h.present)));
  const setDoc = coalesce;

  const undo = () => setHist((h) => undoHistory(h));
  const redo = () => setHist((h) => redoHistory(h));

  const entries = useMemo(() => walkNodes(doc.root, null, []), [doc]);
  const sel = useMemo(() => entries.find((e) => e.node.id === selId) || null, [entries, selId]);
  const paintLayer = useMemo(() => {
    if (sel && sel.node.type === "layer") return sel.node;
    if (sel && sel.node.children) { const l = firstLayer(sel.node.children); if (l) return l; }
    return firstLayer(doc.root);
  }, [doc, sel]);

  /* remplace tout le doc (nouveau / import) et réinitialise la sélection */
  const replaceDoc = (d) => { commit(() => d); setSelId(null); };

  /* opérations calques */
  const setNodeProps = (id, fn) => commit((d) => ({ ...d, root: updateNode(d.root, id, fn) }));

  const renameNode = (id, name) => {
    const n = name.trim();
    if (n) setNodeProps(id, (node) => ({ ...node, name: n }));
  };

  const addLayer = () => {
    commit((d) => {
      const layer = makeLayer(d.width, d.height, "Calque " + (countLayers(d.root) + 1));
      const target = sel && sel.node.type === "group" ? sel.node.id : null;
      return { ...d, root: insertNode(d.root, target, layer, 0) };
    });
    busEmit("pixel:layer-added", {});
  };

  const addGroup = () => {
    commit((d) => {
      const g = makeGroup("Groupe " + (listGroups(d.root).length + 1));
      return { ...d, root: insertNode(d.root, null, g, 0) };
    });
    busEmit("pixel:group-added", {});
  };

  const delNode = (id) => {
    commit((d) => ({ ...d, root: removeNode(d.root, id) }));
    if (selId === id) setSelId(null);
    busEmit("pixel:node-deleted", {});
  };

  const moveNodeBy = (id, dir) => commit((d) => ({ ...d, root: moveNode(d.root, id, dir) }))

  const reparent = (id, targetId) => {
    commit((d) => ({ ...d, root: reparentNode(d.root, id, targetId) }));
    busEmit("pixel:reparented", {});
  };

  const applyChecker = (color) => {
    if (!paintLayer) return;
    const layerId = paintLayer.id;
    commit((d) => {
      const cc = colorToChar(d.palette, color);
      return { ...d, palette: cc.palette, root: updateLayerRows(d.root, layerId, () => checkerRows(d.width, d.height, cc.ch)) };
    });
    busEmit("pixel:checker", {});
  };

  return {
    doc, setDoc, commit, replaceDoc, selId, setSelId, entries, sel, paintLayer,
    undo, redo, canUndo: canUndo(hist), canRedo: canRedo(hist),
    setNodeProps, renameNode, addLayer, addGroup, delNode, moveNodeBy, reparent, applyChecker,
  };
}

function usePaintSession(doc, setDoc, commit, paintLayer, busEmit) {
  const [tool, setTool] = useState("brush");
  const [color, setColor] = useState("#000000");
  const [brush, setBrush] = useState(1);
  const [view, setView] = useState(() => newView(24));
  const drawing = useRef(false);
  /* suivi du pinch/pan : pointeurs actifs + dernier état */
  const pointers = useRef(new Map());
  const gesture = useRef({ pinchDist: 0, pan: null, painted: false });
  /* refs vers undo/redo pour les raccourcis clavier */
  const undoRef = useRef(null);
  const redoRef = useRef(null);
  const setUndoRedo = (undo, redo) => { undoRef.current = undo; redoRef.current = redo; };

  /* doc via ref : callbacks stables, aucun re-render en cascade */
  const docRef = useRef(doc);
  docRef.current = doc;

  const setCanvasSize = useCallback((cw, ch) => {
    setView((v) => clampPan(v, docRef.current, cw, ch));
  }, []);

  const fitToCanvas = useCallback((cw, ch) => setView(fitView(docRef.current, cw, ch)), []);

  const zoomBy = useCallback((factor, pivot) => setView((v) => zoomAt(v, factor, pivot)), []);

  /* conversion cellule : tient compte du viewport (zoom/pan) */
  const cellFromEvent = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const p = toPixel(view, e.clientX - r.left, e.clientY - r.top);
    return { x: Math.floor(p.x), y: Math.floor(p.y) };
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
    /* 1er coup du tracé → entrée undo ; suivants → fusion dans la même entrée */
    if (drawing.current && gesture.current.painted) setDoc((d) => paintAt(d, layerId, c, tool, color, brush));
    else { commit((d) => paintAt(d, layerId, c, tool, color, brush)); gesture.current.painted = true; }
  };

  /* raccourcis clavier : Ctrl+Z undo, Ctrl+Y / Ctrl+Shift+Z redo */
  const onKeydown = (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === "z" && !e.shiftKey) { e.preventDefault(); undoRef.current(); }
    else if ((k === "y") || (k === "z" && e.shiftKey)) { e.preventDefault(); redoRef.current(); }
  };

  /* ---- gestures : 1 doigt = peindre, 2 doigts = pinch zoom + pan ---- */
  const updateGesture = (e) => {
    const pts = pointers.current;
    if (pts.size === 2) {
      const [a, b] = Array.from(pts.values());
      return pinchInfo(a, b);
    }
    return null;
  };

  const handlers = {
    onPointerDown: (e) => {
      pointers.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
      if (pointers.current.size === 1) {
        /* pas de peinture au contact : on attend un mouvement (drag) ou le relâchement (tap),
           sinon un pixel est peint dès que le 2e doigt pose pour le pinch */
        drawing.current = true;
        gesture.current.painted = false;
        gesture.current.slop = { x: e.clientX, y: e.clientY, done: false };
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
      } else {
        /* 2e doigt : on arrête le tracé, on démarre le pinch */
        drawing.current = false;
        gesture.current.pan = null;
        const info = updateGesture(e);
        if (info) gesture.current.pinchDist = info.dist;
      }
    },
    onPointerMove: (e) => {
      if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
      if (pointers.current.size >= 2) {
        const [a, b] = Array.from(pointers.current.values());
        const info = pinchInfo(a, b);
        const rect = e.currentTarget.getBoundingClientRect();
        /* zoom pinch autour du milieu des deux doigts */
        setView((v) => {
          let nv = zoomAt(v, pinchFactor(gesture.current.pinchDist, info.dist), { x: info.cx - rect.left, y: info.cy - rect.top });
          /* pan : suit le déplacement du milieu */
          if (gesture.current.pan) {
            nv = { ...nv, ox: nv.ox + (info.cx - gesture.current.pan.cx), oy: nv.oy + (info.cy - gesture.current.pan.cy) };
          }
          gesture.current.pinchDist = info.dist;
          gesture.current.pan = { cx: info.cx, cy: info.cy };
          return clampPan(nv, doc, rect.width, rect.height);
        });
      } else if (drawing.current) {
        /* touch slop : ignorer les micro-mouvements (< ~6 px) avant de peindre */
        const s = gesture.current.slop;
        if (s && !s.done) {
          const dx = e.clientX - s.x, dy = e.clientY - s.y;
          if (dx * dx + dy * dy < 36) return;
          s.done = true;
        }
        paintCell(e);
      }
    },
    onPointerUp: (e) => {
      pointers.current.delete(e.pointerId);
      if (pointers.current.size === 0) {
        /* tap sans mouvement ni 2e doigt → on peint la cellule maintenant */
        if (drawing.current && !gesture.current.painted) paintCell(e);
        drawing.current = false;
        gesture.current.pan = null;
      } else if (pointers.current.size === 1) {
        /* retour à 1 doigt : on ne reprend pas le tracé (évite les traits parasites) */
        drawing.current = false;
        gesture.current.pan = null;
        gesture.current.pinchDist = 0;
      }
    },
    onPointerCancel: (e) => {
      pointers.current.delete(e.pointerId);
      drawing.current = false;
      gesture.current.pan = null;
      gesture.current.pinchDist = 0;
    },
    /* zoom molette (desktop) autour du curseur */
    onWheel: (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const r = e.currentTarget.getBoundingClientRect();
      zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15, { x: e.clientX - r.left, y: e.clientY - r.top });
    },
  };

  return {
    tool, setTool, color, setColor, brush, setBrush,
    view, setView, setCanvasSize, fitToCanvas, zoomBy, handlers,
    setUndoRedo, onKeydown,
  };
}
