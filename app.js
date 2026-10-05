/* =========================================================
 * app.js — Assemblage : onglets + état partagé + flux signaux
 * ======================================================= */
function App() {
  const [state, setState] = useState(loadLocal() || DEFAULT_STATE);
  const [resetting, setResetting] = useState(false);
  const [tab, setTab] = useState("jeu");
  const [log, setLog] = useState([]);

  const busEmit = useCallback((event, payload) => {
    bus.emit(event, payload);
    setLog((l) => ["⚡ " + event + " " + JSON.stringify(payload).slice(0, 50), ...l].slice(0, 20));
  }, []);

  /* purge totale : caches + service workers, puis recharge */
  const resetApp = async () => {
    if (resetting) return;
    setResetting(true);
    try {
      if (navigator.serviceWorker) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
        regs.forEach((r) => { try { r.active && r.active.postMessage("vibe-lab-reset"); } catch (e) {} });
      }
      if (window.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch (e) {}
    location.reload(true);
  };

  const tabs = [
    { id: "jeu", label: "🎯 Mini-jeu" },
    { id: "widgets", label: "🧩 Widgets" },
    { id: "pixel", label: "🎨 Pixel" },
    { id: "fichiers", label: "💾 Fichiers" },
  ];

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 p-4 text-white">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Vibe Lab</h1>
          <p className="text-xs text-slate-400">UI · Signaux · Sauvegarde — exploration mobile</p>
        </div>
        <span className="rounded-full bg-violet-600/20 px-2 py-1 text-xs text-violet-300">{state.pseudo}</span>
      </header>

      <nav className="flex gap-1 overflow-x-auto rounded-xl bg-slate-800 p-1">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={"flex-1 whitespace-nowrap rounded-lg px-2 py-2 text-[11px] font-semibold transition " + (tab === t.id ? "bg-violet-600 text-white" : "text-slate-300")}>
            {t.label}
          </button>
        ))}
      </nav>

      <main className="flex-1">
        {tab === "jeu" && <ReactionGame state={state} setState={setState} busEmit={busEmit} />}
        {tab === "widgets" && <WidgetPanel state={state} setState={setState} log={log} />}
        {tab === "pixel" && <PixelStudio busEmit={busEmit} />}
        {tab === "fichiers" && <FilesPanel state={state} setState={setState} busEmit={busEmit} />}
      </main>

      <footer className="flex items-center justify-center gap-2 text-center text-[11px] text-slate-500">
        <span>Vibe Lab v0.6 — fait avec Vibe, testé depuis ton téléphone 📱</span>
        <button onClick={resetApp} disabled={resetting}
                className="rounded-lg bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-400 active:scale-95 disabled:opacity-50"
                title="Vide le cache et recharge la dernière version">{resetting ? "⏳" : "♻ Réinit."}</button>
      </footer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
