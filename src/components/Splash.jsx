import { useEffect } from 'react';
import Logo from './Logo';

const WORD = 'Feathery';
const SPLASH_MS = 3000;

// Arrivée après connexion : le logo se matérialise, un reflet le traverse,
// le nom s'écrit lettre par lettre, puis l'écran se dissout vers l'application.
export default function Splash({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, SPLASH_MS);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="splash-screen fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-ink" aria-hidden="true">
      <div className="splash-glow pointer-events-none absolute h-72 w-72 rounded-full bg-brand-300/40 blur-3xl" />
      <div className="splash-mark relative h-40 w-40 overflow-hidden">
        <Logo animated className="h-full w-full" />
        <span className="splash-sheen pointer-events-none absolute inset-0" />
      </div>
      <p className="splash-word flex text-3xl font-extrabold tracking-tight text-brand-700">
        {WORD.split('').map((ch, i) => (
          <span key={i} className="splash-letter inline-block" style={{ animationDelay: `${1.05 + i * 0.07}s` }}>
            {ch}
          </span>
        ))}
      </p>
    </div>
  );
}
