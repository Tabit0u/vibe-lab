/* =========================================================
 * pixel/document.js — création & validation d'un document
 * Format (.json lisible et éditable à la main) :
 * { version, width, height, palette, root }
 * root = liste de calques ("layer") et groupes ("group")
 * ordre du tableau = ordre d'empilement (dernier = au-dessus)
 * ======================================================= */

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
    palette: PIX_DEFAULT_PALETTE.slice(),
    root: [makeLayer(w, h, "Calque 1")],
  };
}

/* validation tolérante aux éditions à la main */
function docFromJson(input) {
  const raw = typeof input === "string" ? JSON.parse(input) : input;
  const w = Math.min(PIX_MAX_SIZE, Math.max(1, Math.floor(raw.width) || 16));
  const h = Math.min(PIX_MAX_SIZE, Math.max(1, Math.floor(raw.height) || 16));
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
