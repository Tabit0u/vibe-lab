/* =========================================================
 * pixel/io.js — persistance & fichiers
 * localStorage, export .json, export .png, import .json
 * ======================================================= */

const savePixelLocal = (d) => localStorage.setItem(PIXEL_KEY, JSON.stringify(d));

function loadPixelLocal() {
  try { const s = localStorage.getItem(PIXEL_KEY); return s ? docFromJson(s) : null; } catch (e) { return null; }
}

/* téléchargement générique d'un blob */
function downloadBlob(content, filename, mime) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime || "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const exportPixelJson = (doc) => downloadBlob(JSON.stringify(doc, null, 2), "vibe-pixel.json", "application/json");

/* import d'un fichier .json → doc validé (Promise) */
function importPixelJsonFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("no file"));
    const r = new FileReader();
    r.onload = () => {
      try { resolve(docFromJson(r.result)); }
      catch (err) { reject(err); }
    };
    r.onerror = () => reject(r.error || new Error("read error"));
    r.readAsText(file);
  });
}

function exportPngFile(doc, filename, scale) {
  const c = document.createElement("canvas");
  drawDoc(c, doc, { scale: scale });
  c.toBlob((b) => { if (b) downloadBlob(b, filename || "vibe-pixel.png"); }, "image/png");
}
