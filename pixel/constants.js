/* =========================================================
 * pixel/constants.js — Pixel Studio : constantes & utilitaires
 * (chargé en premier, avant les autres modules pixel/)
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
const PIX_MAX_SIZE = 64;
const PIX_DEFAULT_PALETTE = ["#ffffff", "#000000", "#ef4444", "#f97316", "#facc15", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7", "#ec4899"];

let _uid = Math.floor(Math.random() * 1e6);
const uid = () => ++_uid;
const clamp01 = (v) => Math.min(1, Math.max(0, +v || 0));
const clampDim = (v) => Math.min(PIX_MAX_SIZE, Math.max(1, Math.round(+v) || 1));
