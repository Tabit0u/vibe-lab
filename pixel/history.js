/* =========================================================
 * pixel/history.js — pile undo/redo (fonctions pures)
 * hist = { past: [doc], present: doc, future: [doc] }
 * Un "stroke" de peinture = une seule entrée : les pas
 * intermédiaires écrasent le présent sans pousser de copie.
 * ======================================================= */

const PIX_HISTORY_LIMIT = 100;

function newHistory(doc) {
  return { past: [], present: doc, future: [] };
}

/* pousse un nouvel état (nouvelle action utilisateur) */
function pushHistory(hist, doc) {
  const past = hist.past.concat([hist.present]).slice(-PIX_HISTORY_LIMIT);
  return { past: past, present: doc, future: [] };
}

/* met à jour l'état courant sans créer d'entrée (traction en cours) */
function coalesceHistory(hist, doc) {
  return { past: hist.past, present: doc, future: [] };
}

function canUndo(hist) { return hist.past.length > 0; }
function canRedo(hist) { return hist.future.length > 0; }

function undoHistory(hist) {
  if (!hist.past.length) return hist;
  return {
    past: hist.past.slice(0, -1),
    present: hist.past[hist.past.length - 1],
    future: [hist.present].concat(hist.future).slice(0, PIX_HISTORY_LIMIT),
  };
}

function redoHistory(hist) {
  if (!hist.future.length) return hist;
  return {
    past: hist.past.concat([hist.present]).slice(-PIX_HISTORY_LIMIT),
    present: hist.future[0],
    future: hist.future.slice(1),
  };
}
