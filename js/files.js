/* =========================================================
 * files.js — Onglet 💾 : save/load localStorage + export .json
 * ======================================================= */
function FilesPanel({ state, setState, busEmit }) {
  const fileInput = useRef(null);

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

  return (
    <div className="flex flex-col gap-4 text-sm">
      <p className="text-slate-300">ZZYYXXXXZZ Sauvegarde automatique en local (localStorage). Exporte ou importe un fichier .json pour tester la persistance.</p>
      <pre className="overflow-x-auto rounded-xl border border-slate-700 bg-black/60 p-3 font-mono text-[11px] text-cyan-300">
        {JSON.stringify(state, null, 2)}
      </pre>
      <button onClick={() => { downloadFile(state); busEmit("file:exported", {}); }}
        className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold active:scale-95">⬇ Exporter en .json</button>
      <button onClick={() => fileInput.current?.click()}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold active:scale-95">⬆ Importer un fichier</button>
      <input ref={fileInput} type="file" accept=".json" onChange={importFile} className="hidden" />
    </div>
  );
}
