/* =========================================================
 * storage.js — Persistance : localStorage + export/import
 * saveLocal / loadLocal / downloadFile / DEFAULT_STATE
 * ======================================================= */
const STORAGE_KEY = "vibe-lab-state-v1";

const saveLocal = (d) => localStorage.setItem(STORAGE_KEY, JSON.stringify(d));

const loadLocal = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; } catch { return null; }
};

function downloadFile(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "vibe-lab-save.json"; a.click();
  URL.revokeObjectURL(url);
}

const DEFAULT_STATE = { pseudo: "Explorateur", score: 0, best: 0, volume: 60, theme: "nuit" };