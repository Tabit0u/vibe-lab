/* =========================================================
 * pixel/render.js — rendu canvas du document
 * drawDoc : compose calques/groupes sur un canvas 2D
 * ======================================================= */

function drawDoc(canvas, doc, opts) {
  if (!canvas) return;
  const o = opts || {};
  /* deux modes : vue ajustée (export PNG, scale fixé) ou viewport zoom/pan */
  const view = o.view || null;
  const w = doc.width, h = doc.height;
  if (view) {
    /* taille CSS ≠ taille bitmap : on dessine à la résolution device */
    const dpr = (window.devicePixelRatio || 1);
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    canvas.width = Math.max(1, Math.round(cw * dpr));
    canvas.height = Math.max(1, Math.round(ch * dpr));
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    const s = view.scale, ox = view.ox, oy = view.oy;
    if (o.checker) {
      const x0 = Math.max(0, Math.floor(-ox / s)), x1 = Math.min(w, Math.ceil((cw - ox) / s));
      const y0 = Math.max(0, Math.floor(-oy / s)), y1 = Math.min(h, Math.ceil((ch - oy) / s));
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? "#f1f5f9" : "#cbd5e1";
        ctx.fillRect(ox + x * s, oy + y * s, s, s);
      }
    }
    const drawNode = (node, alpha, visible) => {
      if (!visible || !node.visible) return;
      const a = alpha * clamp01(node.alpha);
      if (node.type === "group") { node.children.forEach((c) => drawNode(c, a, true)); return; }
      ctx.globalAlpha = a;
      const x0 = Math.max(0, Math.floor(-ox / s)), x1 = Math.min(w, Math.ceil((cw - ox) / s));
      const y0 = Math.max(0, Math.floor(-oy / s)), y1 = Math.min(h, Math.ceil((ch - oy) / s));
      for (let y = y0; y < y1; y++) {
        const row = node.rows[y] || "";
        for (let x = x0; x < x1; x++) {
          const ch2 = row[x];
          if (!ch2 || ch2 === PIX_EMPTY) continue;
          const col = doc.palette[pixIndex(ch2)];
          if (!col) continue;
          ctx.fillStyle = col;
          ctx.fillRect(ox + x * s, oy + y * s, s, s);
        }
      }
      ctx.globalAlpha = 1;
    };
    doc.root.forEach((n) => drawNode(n, 1, true));
    /* grille pixel si zoom suffisant */
    if (s >= 12) {
      ctx.strokeStyle = "rgba(15,23,42,0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= w; x++) { const px = ox + x * s; if (px < 0 || px > cw) continue; ctx.moveTo(px, Math.max(0, oy)); ctx.lineTo(px, Math.min(ch, oy + h * s)); }
      for (let y = 0; y <= h; y++) { const py = oy + y * s; if (py < 0 || py > ch) continue; ctx.moveTo(Math.max(0, ox), py); ctx.lineTo(Math.min(cw, ox + w * s), py); }
      ctx.stroke();
    }
    return;
  }
  const s = o.scale || 1;
  canvas.width = w * s;
  canvas.height = h * s;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (o.checker) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? "#f1f5f9" : "#cbd5e1";
      ctx.fillRect(x * s, y * s, s, s);
    }
  }
  const drawNode = (node, alpha, visible) => {
    if (!visible || !node.visible) return;
    const a = alpha * clamp01(node.alpha);
    if (node.type === "group") { node.children.forEach((c) => drawNode(c, a, true)); return; }
    ctx.globalAlpha = a;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const ch = node.rows[y] && node.rows[y][x];
      if (!ch || ch === PIX_EMPTY) continue;
      const col = doc.palette[pixIndex(ch)];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x * s, y * s, s, s);
    }
    ctx.globalAlpha = 1;
  };
  doc.root.forEach((n) => drawNode(n, 1, true));
}
