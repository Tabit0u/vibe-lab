/* =========================================================
 * pixel/paint.js — outils de peinture (fonctions pures)
 * brush / eraser / picker + résolution couleur → caractère
 * ======================================================= */

/* couleur courante → caractère de palette (ajout auto si absente) */
function colorToChar(palette, color) {
  let p = palette;
  let ci = p.indexOf(color);
  if (ci === -1) {
    if (p.length >= PIX_CHARS.length) ci = p.length - 1;
    else { p = p.concat([color]); ci = p.length - 1; }
  }
  return { palette: p, ch: pixChar(ci) };
}

/* pipette : couleur visible au pixel (x, y), du calque du dessus */
function pickColor(doc, x, y) {
  const stack = [];
  const collect = (list, alpha, visible) => {
    (list || []).forEach((n) => {
      if (!visible || !n.visible) return;
      const a = alpha * clamp01(n.alpha);
      if (n.type === "group") collect(n.children, a, true);
      else stack.push({ node: n, alpha: a });
    });
  };
  collect(doc.root, 1, true);
  for (let i = stack.length - 1; i >= 0; i--) {
    const ch = stack[i].node.rows[y] && stack[i].node.rows[y][x];
    if (ch && ch !== PIX_EMPTY) {
      const c = doc.palette[pixIndex(ch)];
      if (c) return c;
    }
  }
  return null;
}

/* applique un coup de pinceau sur un doc — pur, immuable */
function paintAt(doc, layerId, cell, tool, color, brush) {
  const cc = tool === "eraser" ? { palette: doc.palette, ch: PIX_EMPTY } : colorToChar(doc.palette, color);
  return {
    ...doc,
    palette: cc.palette,
    root: updateLayerRows(doc.root, layerId, (rows) => paintSquare(rows, cell.x, cell.y, cc.ch, brush)),
  };
}
