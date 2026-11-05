import { useEffect, useRef, useState } from 'react';
import { EUROPE_COUNTRIES } from '../lib/countries';
import Flag from './Flag';
import { Icon } from './ui';

// Liste déroulante des pays européens, avec drapeaux.
export default function CountrySelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = EUROPE_COUNTRIES.find(([code]) => code === value);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="field flex items-center justify-between gap-3 text-left"
      >
        <span className="flex min-w-0 items-center gap-2">
          {current ? <Flag code={current[0]} name={current[1]} /> : null}
          <span className={`truncate ${current ? 'text-slate-900' : 'text-slate-400'}`}>{current ? current[1] : 'Choisir un pays'}</span>
        </span>
        <Icon name="arrow" className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? '-rotate-90' : 'rotate-90'}`} />
      </button>
      {open && (
        <ul role="listbox" className="panel thin-scroll absolute left-0 right-0 z-30 mt-2 max-h-72 overflow-y-auto p-2">
          <li>
            <button type="button" onClick={() => { onChange(''); setOpen(false); }} className="flex w-full items-center rounded-2xl px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-50">
              Aucun pays
            </button>
          </li>
          {EUROPE_COUNTRIES.map(([code, name]) => (
            <li key={code}>
              <button
                type="button"
                role="option"
                aria-selected={code === value}
                onClick={() => { onChange(code); setOpen(false); }}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left text-sm font-semibold transition ${code === value ? 'bg-brand-100 text-brand-800' : 'text-slate-700 hover:bg-slate-50'}`}
              >
                <Flag code={code} name={name} />
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
