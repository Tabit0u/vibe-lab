/* =========================================================
 * files/ui.jsx — Affichage de l'onglet 💾
 * (votre texte modifié "ZZYYXXXXZZ" est conservé ici)
 * ======================================================= */
function FilesPanel({ state, setState, busEmit }) {
  const { fileInput, exportJson, pickImport, importFile } = useFilesLogic({ state, setState, busEmit });

  return (
    <div className="flex flex-col gap-4 text-sm">
      <p className="text-slate-300">ZZYYXXXXZZ Sauvegarde automatique en local (localStorage). Exporte ou importe un fichier .json pour tester la persistance.</p>
      <pre className="overflow-x-auto rounded-xl border border-slate-700 bg-black/60 p-3 font-mono text-[11px] text-cyan-300">
        {JSON.stringify(state, null, 2)}
      </pre>
      <button onClick={exportJson}
        className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold active:scale-95">⬇ Exporter en .json</button>
      <button onClick={pickImport}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold active:scale-95">⬆ Importer un fichier</button>
      <input ref={fileInput} type="file" accept=".json" onChange={importFile} className="hidden" />
    </div>
  );
}
