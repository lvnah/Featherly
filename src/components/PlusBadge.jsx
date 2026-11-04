// Badge PLUS simple et net : pastille vert clair avec une petite feuille, sans effet.
export default function PlusBadge({ className = '' }) {
  return (
    <span
      title="Membre PLUS"
      className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-brand-700 ring-1 ring-brand-200 ${className}`}
    >
      <svg viewBox="0 0 32 32" className="h-2.5 w-2.5" aria-hidden="true">
        <path d="M6 24C6 12 14 6 27 5c0 13-6 21-18 21-1 0-2 0-3-2z" fill="currentColor" />
      </svg>
      PLUS
    </span>
  );
}
