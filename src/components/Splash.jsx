import { useEffect } from 'react';
import Logo from './Logo';

// Écran d'arrivée après connexion : fond blanc, logo qui se révèle, puis fondu vers l'application.
export default function Splash({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="splash-screen fixed inset-0 z-[100] flex items-center justify-center bg-white" aria-hidden="true">
      <Logo animated className="h-44 w-44" />
    </div>
  );
}
