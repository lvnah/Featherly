import Logo from './Logo';

// Petit logo vert clair à côté du pseudo des membres PLUS (équivalent du badge Nitro).
export default function PlusBadge({ className = '' }) {
  return (
    <span title="Membre PLUS" className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 ring-1 ring-brand-300 ${className}`}>
      <Logo className="h-3 w-3" />
    </span>
  );
}
