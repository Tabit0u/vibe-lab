/* =========================================================
 * pixel/render.js — rendu canvas du document
 * drawDoc : compose calques/groupes sur un canvas 2D
 * ======================================================= */

function drawDoc(canvas, doc, opts) {
  if (!canvas) return;
  const o = opts || {};
  const s = o.scale || 1;
  const w = doc.width, h = doc.height;
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
