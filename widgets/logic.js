/* =========================================================
 * widgets/logic.js — Logique des widgets (sans UI)
 * Met à jour l'état partagé + persiste à chaque changement
 * ======================================================= */
function useWidgetsLogic({ state, setState }) {
  const setPseudo = (v) => { const ns = { ...state, pseudo: v }; setState(ns); saveLocal(ns); };
  const setVolume = (v) => { const ns = { ...state, volume: v }; setState(ns); saveLocal(ns); };
  const toggleTheme = () => {
    const ns = { ...state, theme: state.theme === "nuit" ? "jour" : "nuit" };
    setState(ns); saveLocal(ns);
  };
  return { setPseudo, setVolume, toggleTheme };
}
