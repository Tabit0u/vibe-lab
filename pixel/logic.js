/* =========================================================
 * pixel/logic.js — Pixel Studio : logique pure (sans UI)
 * ---------------------------------------------------------
 * Format du document (.json lisible et éditable à la main) :
 * {
 *   "version": 1,
 *   "width": 16, "height": 16,
 *   "palette": ["#ffffff", "#000000", ...],
 *   "root": [
 *     { "id": 1, "type": "layer", "name": "Calque 1", "alpha": 1, "visible": true,
 *       "rows": ["....1...", ...] },
 *     { "id": 2, "type": "group", "name": "Groupe", "alpha": 1, "visible": true,
 *       "children": [ ...calques/groupes... ] }
 *   ]
 * }
 * - 1 pixel = 1 caractère par ligne : "." = transparent,
 *   sinon index de palette en base62 (0-9 a-z A-Z, cf. PIX_CHARS)
 * - alpha : 0 → 1 (opacité du calque ou du groupe)
 * - ordre du tableau = ordre d'empilement (dernier = au-dessus)
 * ======================================================= */

/* compat : expose les hooks React en globaux si nécessaire */
(function () {
  if (typeof useState === "undefined" && window.React) {
    ["useState", "useEffect", "useRef", "useMemo", "useCallback"].forEach(function (k) {
      if (React[k]) window[k] = React[k];
    });
  }
})();

const PIXEL_KEY = "vibe-lab-pixel-v1";
const PIX_CHARS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const PIX_EMPTY = ".";

let _uid = Math.floor(Math.random() * 1e6);
const uid = () => ++_uid;

const pixChar = (i) => PIX_CHARS[i] || PIX_CHARS[PIX_CHARS.length - 1];
const pixIndex = (c) => PIX_CHARS.indexOf(c);
const clamp01 = (v) => Math.min(1, Math.max(0, +v || 0));

const emptyRows = (w, h) => Array.from({ length: h }, () => PIX_EMPTY.repeat(w));

function makeLayer(w, h, name) {
  return { id: uid(), type: "layer", name: name || "Calque", alpha: 1, visible: true, rows: emptyRows(w, h) };
}
function makeGroup(name) {
  return { id: uid(), type: "group", name: name || "Groupe", alpha: 1, visible: true, children: [] };
}

function newPixelDoc(w, h) {
  w = w || 16; h = h || 16;
  return {
    version: 1,
    width: w,
    height: h,
    palette: ["#ffffff", "#000000", "#ef4444", "#f97316", "#facc15", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7", "#ec4899"],
    root: [makeLayer(w, h, "Calque 1")],
  };
}

/* ---- persistance & fichiers ---- */
const savePixelLocal = (d) => localStorage.setItem(PIXEL_KEY, JSON.stringify(d));

function loadPixelLocal() {
  try { const s = localStorage.getItem(PIXEL_KEY); return s ? docFromJson(s) : null; } catch (e) { return null; }
}

function downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const exportPixelJson = (doc) => downloadBlob(JSON.stringify(doc, null, 2), "vibe-pixel.json", "application/json");

/* ---- import / validation (tolérant aux éditions à la main) ---- */
function docFromJson(input) {
  const raw = typeof input === "string" ? JSON.parse(input) : input;
  const w = Math.min(64, Math.max(1, Math.floor(raw.width) || 16));
  const h = Math.min(64, Math.max(1, Math.floor(raw.height) || 16));
  let palette = Array.isArray(raw.palette) ? raw.palette.filter((c) => typeof c === "string" && c.charAt(0) === "#") : [];
  if (!palette.length) palette = ["#000000"];
  const fixRows = (rows) => {
    const out = [];
    for (let y = 0; y < h; y++) {
      const line = rows && typeof rows[y] === "string" ? rows[y] : "";
      out.push((line + PIX_EMPTY.repeat(w)).slice(0, w));
    }
    return out;
  };
  const fix = (n) => {
    if (n && n.type === "group") {
      return {
        id: n.id != null ? n.id : uid(),
        type: "group",
        name: String(n.name || "Groupe"),
        alpha: clamp01(n.alpha),
        visible: n.visible !== false,
        children: Array.isArray(n.children) ? n.children.map(fix) : [],
      };
    }
    return {
      id: n && n.id != null ? n.id : uid(),
      type: "layer",
      name: String((n && n.name) || "Calque"),
      alpha: clamp01(n && n.alpha),
      visible: !n || n.visible !== false,
      rows: fixRows(n && n.rows),
    };
  };
  const root = Array.isArray(raw.root) && raw.root.length ? raw.root.map(fix) : [makeLayer(w, h, "Calque 1")];
  return { version: 1, width: w, height: h, palette: palette.slice(0, PIX_CHARS.length), root };
}

/* ---- arbre de calques ---- */
function walkNodes(list, parent, acc) {
  (list || []).forEach((n) => {
    acc.push({ node: n, parent: parent || null });
    if (n.children) walkNodes(n.children, n, acc);
  });
  return acc;
}
const findNode = (root, id) => walkNodes(root, null, []).find((e) => e.node.id === id) || null;
const firstLayer = (root) => {
  const e = walkNodes(root, null, []).find((x) => x.node.type === "layer");
  return e ? e.node : null;
};
const listGroups = (root) => walkNodes(root, null, []).filter((e) => e.node.type === "group").map((e) => e.node);
const descendantIds = (node) => {
  const out = [];
  const walk = (n) => { out.push(n.id); (n.children || []).forEach(walk); };
  walk(node);
  return out;
};

function removeNode(root, id) {
  return (root || []).filter((n) => n.id !== id).map((n) => (n.children ? { ...n, children: removeNode(n.children, id) } : n));
}
function insertNode(root, parentId, node, index) {
  if (parentId == null) {
    const c = (root || []).slice();
    c.splice(Math.min(index, c.length), 0, node);
    return c;
  }
  return (root || []).map((n) => {
    if (n.id === parentId && n.children) {
      const c = n.children.slice();
      c.splice(Math.min(index, c.length), 0, node);
      return { ...n, children: c };
    }
    return n.children ? { ...n, children: insertNode(n.children, parentId, node, index) } : n;
  });
}
function moveNode(root, id, dir) {
  const mutate = (list) => {
    const i = list.findIndex((n) => n.id === id);
    if (i !== -1) {
      const j = i + dir;
      if (j < 0 || j >= list.length) return list;
      const c = list.slice();
      const n = c.splice(i, 1)[0];
      c.splice(j, 0, n);
      return c;
    }
    let changed = false;
    const out = list.map((n) => {
      if (!n.children) return n;
      const ch = mutate(n.children);
      if (ch !== n.children) { changed = true; return { ...n, children: ch }; }
      return n;
    });
    return changed ? out : list;
  };
  return mutate(root || []);
}
function updateNode(root, id, fn) {
  return (root || []).map((n) => (n.id === id ? fn(n) : (n.children ? { ...n, children: updateNode(n.children, id, fn) } : n)));
}
function updateLayerRows(root, id, fn) {
  return updateNode(root, id, (n) => ({ ...n, rows: fn(n.rows) }));
}

/* ---- pixels ---- */
function setPixel(rows, x, y, ch) {
  const h = rows.length, w = rows[0].length;
  if (x < 0 || y < 0 || x >= w || y >= h) return rows;
  if (rows[y][x] === ch) return rows;
  const out = rows.slice();
  out[y] = rows[y].slice(0, x) + ch + rows[y].slice(x + 1);
  return out;
}
function paintSquare(rows, x, y, ch, size) {
  let out = rows;
  const o = Math.floor((size - 1) / 2);
  for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) out = setPixel(out, x + dx - o, y + dy - o, ch);
  return out;
}
function checkerRows(w, h, ch) {
  return Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => ((x + y) % 2 === 0 ? ch : PIX_EMPTY)).join("")
  );
}
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

/* ---- rendu ---- */
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

function exportPngFile(doc, filename, scale) {
  const c = document.createElement("canvas");
  drawDoc(c, doc, { scale: scale });
  c.toBlob((b) => {
    const url = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = url; a.download = filename || "vibe-pixel.png"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, "image/png");
}
