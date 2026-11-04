// Constantes et helpers purs partagés par l'interface.

export const OWNER_COLOR = '#ef4444';
export const ONLINE_WINDOW_MS = 45_000;

export const ROLE_COLORS = ['#ef4444', '#38bdf8', '#a78bfa', '#f472b6', '#facc15', '#34d399', '#fb923c', '#0f172a'];

// Bannières par défaut (index 0 = vert de la page Paramètres).
export const BANNER_GRADIENTS = [
  'linear-gradient(120deg,#22c55e 0%,#15803d 45%,#052e16 100%)',
  'linear-gradient(135deg,#bae6fd 0%,#c7d2fe 100%)',
  'linear-gradient(135deg,#6366f1 0%,#a855f7 100%)',
  'linear-gradient(135deg,#f97316 0%,#ec4899 100%)',
  'linear-gradient(135deg,#14b8a6 0%,#84cc16 100%)',
  'linear-gradient(135deg,#334155 0%,#0f172a 100%)',
];

export function isOnline(user) {
  return !!user && Date.now() - (user.last_activity || 0) < ONLINE_WINDOW_MS;
}

export function fullName(user) {
  return user ? `${user.pseudo}#${user.tag}` : '';
}

export function bannerStyle(user) {
  const b = user?.banner || {};
  if ((b.type === 'image' || b.type === 'url') && b.value) {
    const safe = String(b.value).replace(/["\\()]/g, '');
    return { backgroundImage: `url("${safe}")`, backgroundSize: 'cover', backgroundPosition: 'center' };
  }
  return { background: BANNER_GRADIENTS[b.index ?? 0] ?? BANNER_GRADIENTS[0] };
}

// Dégradés saturés pour les avatars sans photo (la lettre doit rester lisible en blanc).
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#22c55e,#15803d)',
  'linear-gradient(135deg,#6366f1,#a855f7)',
  'linear-gradient(135deg,#0ea5e9,#2563eb)',
  'linear-gradient(135deg,#f97316,#ec4899)',
  'linear-gradient(135deg,#14b8a6,#65a30d)',
  'linear-gradient(135deg,#475569,#0f172a)',
];

export function avatarGradient(seed = '') {
  let h = 0;
  for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
}

export function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

// Horodatage affiché dans les messages : 2026-11-04 11:47:48
export function formatStamp(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
