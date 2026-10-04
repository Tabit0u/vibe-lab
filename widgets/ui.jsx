/* =========================================================
 * widgets/ui.jsx — Affichage de l'onglet 🧩 + flux de signaux
 * ======================================================= */
function WidgetPanel({ state, setState, log }) {
  const { setPseudo, setVolume, toggleTheme } = useWidgetsLogic({ state, setState });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pseudo</label>
        <input value={state.pseudo}
          onChange={(e) => setPseudo(e.target.value)}
          className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none" />
        <label className="flex items-center justify-between text-sm text-slate-200">Volume
          <input type="range" min="0" max="100" value={state.volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-40 accent-violet-500" />
        </label>
        <label className="flex items-center justify-between text-sm text-slate-200">
          Thème {state.theme === "nuit" ? "🌙" : "☀️"}
          <button onClick={toggleTheme}
            className={"relative h-6 w-11 rounded-full transition " + (state.theme === "nuit" ? "bg-violet-600" : "bg-slate-600")}>
            <span className={"absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all " + (state.theme === "nuit" ? "left-[22px]" : "left-0.5")} />
          </button>
        </label>
      </div>
      <div className="rounded-xl border border-slate-700 bg-black/60 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Flux de signaux (temps réel)</p>
        </div>
      </div>
    </div>
  );
}
