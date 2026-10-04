/* =========================================================
 * app.js — App principale : onglets + assemblage
 * ======================================================= */
function App() {
  const [state, setState] = useState(loadLocal() || DEFAULT_STATE);
  const [tab, setTab] = useState("jeu");
  const [log, setLog] = useState([]);

  const busEmit = useCallback((event, payload) => {
    bus.emit(event, payload);
    setLog((l) => ["⚡ " + event + " " + JSON.stringify(payload).slice(0, 50), ...l].slice(0, 20));
  }, []);

  const tabs = [
    { id: "jeu", label: "🎯 Mini-jeu" },
    { id: "widgets", label: "🧩 Widgets" },
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

      <nav className="flex gap-1 rounded-xl bg-slate-800 p-1">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={"flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition " + (tab === t.id ? "bg-violet-600 text-white" : "text-slate-300")}>
            {t.label}
          </button>
        ))}
      </nav>

      <main className="flex-1">
        {tab === "jeu" && <ReactionGame state={state} setState={setState} busEmit={busEmit} />}
        {tab === "widgets" && <WidgetPanel state={state} setState={setState} log={log} />}
        {tab === "fichiers" && <FilesPanel state={state} setState={setState} busEmit={busEmit} />}
      </main>

      <footer className="text-center text-[11px] text-slate-500">Vibe Lab v0.3 — fait avec Vibe, testé depuis ton téléphone 📱</footer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
