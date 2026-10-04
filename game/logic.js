/* =========================================================
 * game/logic.js — Logique du mini-jeu "Cible rapide" (sans UI)
 * État, timer, score, record — 100 % testable sans affichage
 * ======================================================= */
function useGameLogic({ setState, busEmit }) {
  const [target, setTarget] = useState({ x: 50, y: 50 });
  const [playing, setPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { setPlaying(false); busEmit("game:end", { score: getCurrentScore() }); return 10; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [playing]);

  // Score courant lu depuis l'état partagé (via closure)
  let _scoreRef = useRef(0);
  const getCurrentScore = () => _scoreRef.current;
  const setCurrentScore = (v) => { _scoreRef.current = v; };

  const start = () => {
    setPlaying(true);
    setState((s) => ({ ...s, score: 0 }));
    busEmit("game:start", {});
  };
  const stop = () => setPlaying(false);
  const toggle = () => (playing ? stop() : start());

  const hit = () => {
    if (!playing) return;
    setTarget({ x: 8 + Math.random() * 84, y: 8 + Math.random() * 84 });
    setState((s) => {
      const ns = { ...s, score: s.score + 1, best: Math.max(s.best, s.score + 1) };
      setCurrentScore(ns.score);
      saveLocal(ns);
      return ns;
    });
    busEmit("target:hit", {});
  };

  return { target, playing, timeLeft, toggle, hit };
}
