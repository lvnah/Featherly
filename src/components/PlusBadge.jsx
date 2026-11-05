import { LOGO_URL } from '../lib/brand';

// Badge PLUS : le logo seul dans une pastille, avec un halo vert néon. Pas de texte.
export default function PlusBadge({ className = '' }) {
  return (
    <span
      title="Membre PLUS"
      aria-label="Membre PLUS"
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface shadow-[0_0_8px_2px_rgba(47,174,131,0.6)] ring-1 ring-brand-300 ${className}`}
    >
      <img src={LOGO_URL} alt="" className="h-3.5 w-3.5 object-contain" />
    </span>
  );
}
