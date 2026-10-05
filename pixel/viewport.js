/* =========================================================
 * pixel/viewport.js — viewport zoom/pan du canvas
 * view = { scale, ox, oy } : position du pixel (0,0) du doc
 * à l'écran : screen = (pixel * scale) + o
 * Fonctions pures (transformations) + clamp du pan.
 * ======================================================= */

const PIX_MIN_SCALE = 4;
const PIX_MAX_SCALE = 64;

const newView = (scale) => ({ scale: scale || 24, ox: 0, oy: 0 });

/* pixel → écran (px CSS) */
const toScreen = (view, x, y) => ({ x: x * view.scale + view.ox, y: y * view.scale + view.oy });

/* écran (px CSS, relatif au canvas) → pixel flottant */
const toPixel = (view, sx, sy) => ({ x: (sx - view.ox) / view.scale, y: (sy - view.oy) / view.scale });

const clampScale = (s) => Math.min(PIX_MAX_SCALE, Math.max(PIX_MIN_SCALE, Math.round(s * 100) / 100));

/* zoom autour d'un point pivot (px écran) — le pivot reste fixe */
function zoomAt(view, factor, pivot) {
  const ns = clampScale(view.scale * factor);
  if (ns === view.scale) return view;
  if (!pivot) pivot = { x: 0, y: 0 };
  const k = ns / view.scale;
  return { scale: ns, ox: pivot.x - (pivot.x - view.ox) * k, oy: pivot.y - (pivot.y - view.oy) * k };
}

/* maintient le document visible : rembobine le pan si possible */
function clampPan(view, doc, cw, ch) {
  const dw = doc.width * view.scale, dh = doc.height * view.scale;
  let { ox, oy } = view;
  if (dw <= cw) ox = (cw - dw) / 2;
  else ox = Math.min(0, Math.max(cw - dw, ox));
  if (dh <= ch) oy = (ch - dh) / 2;
  else oy = Math.min(0, Math.max(ch - dh, oy));
  return { ...view, ox, oy };
}

/* vue initiale : doc ajusté au conteneur (fit), centré */
function fitView(doc, cw, ch) {
  const s = Math.max(PIX_MIN_SCALE, Math.min(PIX_MAX_SCALE, Math.floor(Math.min(cw / doc.width, ch / doc.height))));
  return clampPan({ scale: s, ox: 0, oy: 0 }, doc, cw, ch);
}

/* distance & milieu de deux pointeurs */
function pinchInfo(a, b) {
  const dx = b.clientX - a.clientX, dy = b.clientY - a.clientY;
  return { dist: Math.hypot(dx, dy), cx: (a.clientX + b.clientX) / 2, cy: (a.clientY + b.clientY) / 2 };
}

/* facteur de zoom depuis la distance précédente → nouvelle */
const pinchFactor = (prev, next) => (prev > 0 && next > 0 ? next / prev : 1);
