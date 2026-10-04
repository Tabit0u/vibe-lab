/* =========================================================
 * game.js — Onglet 🎯 : mini-jeu "Cible rapide"
 * ======================================================= */
function ReactionGame({ state, setState, busEmit }) {
  const [target, setTarget] = useState({ x: 50, y: 50 });
  const [playing, setPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { setPlaying(false); busEmit("game:end", { score: state.score }); return 10; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [playing, state.score]);

  const hit = () => {
    if (!playing) return;
    setTarget({ x: 8 + Math.random() * 84, y: 8 + Math.random() * 84 });
    setState((s) => {
      const ns = { ...s, score: s.score + 1, best: Math.max(s.best, s.score + 1) };
      saveLocal(ns);
      return ns;
    });
    busEmit("target:hit", {});
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => { setPlaying(!playing); if (!playing) { setState((s) => ({ ...s, score: 0 })); busEmit("game:start", {}); } }}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white active:scale-95"
        >{playing ? "Stop" : "▶ Jouer (10 s)"}</button>
        <span className="text-sm text-slate-300">
          Score : <b className="text-white">{state.score}</b> · Record : <b className="text-white">{state.best}</b> · ⏱ {playing ? timeLeft : 0}s
        </span>
      </div>
      <div onPointerDown={hit} className="relative h-72 w-full overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
        {playing ? (
          <button style={{ left: target.x + "%", top: target.y + "%" }}
            className="absolute h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-pink-500 to-violet-500 shadow-lg shadow-violet-500/40 active:scale-90" />
        ) : (
          <p className="flex h-full items-center justify-center text-sm text-slate-400 px-6 text-center">
            Appuie sur « Jouer » puis touche les cibles le plus vite possible 🎯
          </p>
        )}
      </div>
    </div>
  );
}
