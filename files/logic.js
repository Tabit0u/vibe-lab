/* =========================================================
 * files/logic.js — Logique save/load (sans UI)
 * ======================================================= */
function useFilesLogic({ state, setState, busEmit }) {
  const fileInput = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const exportJson = () => { downloadFile(stateRef.current); busEmit("file:exported", {}); };
  const pickImport = () => fileInput.current?.click();

  const importFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        setState(data); saveLocal(data); busEmit("file:imported", { pseudo: data.pseudo });
      } catch { busEmit("file:error", {}); }
    };
    reader.readAsText(file);
  };

  return { fileInput, exportJson, pickImport, importFile };
}
