// Constantes et helpers purs partagés par toute l'application.

export const OWNER_COLOR = '#ef4444';
export const ONLINE_WINDOW_MS = 45_000;

export const ROLE_COLORS = [
  '#38bdf8',
  '#a78bfa',
  '#f472b6',
  '#facc15',
  '#34d399',
  '#fb923c',
  '#f8fafc',
];

// Dégradés des bannières par défaut (remplace les dégradés CSS de la version PHP).
export const BANNER_GRADIENTS = [
  'linear-gradient(135deg,#22c55e 0%,#0d9488 100%)',
  'linear-gradient(135deg,#6366f1 0%,#a855f7 100%)',
  'linear-gradient(135deg,#0ea5e9 0%,#2563eb 100%)',
  'linear-gradient(135deg,#f97316 0%,#ec4899 100%)',
  'linear-gradient(135deg,#14b8a6 0%,#84cc16 100%)',
  'linear-gradient(135deg,#334155 0%,#0f172a 100%)',
];

export function uid(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

export function randomTag() {
  return String(1000 + Math.floor(Math.random() * 9000));
}

export function isOnline(user) {
  return !!user && Date.now() - (user.last_activity || 0) < ONLINE_WINDOW_MS;
}

export function fullName(user) {
  return user ? `${user.pseudo}#${user.tag}` : '';
}

export function bannerStyle(user) {
  const b = user?.banner || {};
  if (b.type === 'url' && b.value) {
    const safe = String(b.value).replace(/["\\()]/g, '');
    return { backgroundImage: `url("${safe}")`, backgroundSize: 'cover', backgroundPosition: 'center' };
  }
  return { background: BANNER_GRADIENTS[b.index ?? 0] ?? BANNER_GRADIENTS[0] };
}

export function avatarGradient(seed = '') {
  let h = 0;
  for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return BANNER_GRADIENTS[h % BANNER_GRADIENTS.length];
}

export function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function slugChannel(name) {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '')
    .slice(0, 24);
}
