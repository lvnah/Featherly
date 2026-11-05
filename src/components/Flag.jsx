import { useState } from 'react';

// Drapeau du pays (image légère, sans emoji). Si l'image ne charge pas, le code du pays s'affiche.
export default function Flag({ code, name = '', className = '' }) {
  const [broken, setBroken] = useState(false);
  if (!code) return null;
  if (broken) {
    return (
      <span title={name} className={`inline-flex h-3.5 min-w-[1.25rem] items-center justify-center rounded-[3px] bg-slate-100 px-1 text-[9px] font-extrabold uppercase text-slate-500 ${className}`}>
        {code}
      </span>
    );
  }
  return (
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      srcSet={`https://flagcdn.com/w80/${code}.png 2x`}
      alt={name}
      title={name}
      loading="lazy"
      onError={() => setBroken(true)}
      className={`inline-block h-3.5 w-5 rounded-[3px] object-cover shadow-sm ring-1 ring-black/5 ${className}`}
    />
  );
}
