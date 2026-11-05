// Constantes et helpers purs partagés par l'interface.

export const OWNER_COLOR = '#ef4444';
export const ONLINE_WINDOW_MS = 15_000;

export const ROLE_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
  '#f43f5e', '#94a3b8', '#f8fafc',
];

// Bannières par défaut (index 0 = vert de la page Paramètres).
export const BANNER_GRADIENTS = [
  'linear-gradient(120deg,#007454 0%,#00412f 45%,#002f22 100%)',
  'linear-gradient(135deg,#bae6fd 0%,#c7d2fe 100%)',
  'linear-gradient(135deg,#6366f1 0%,#a855f7 100%)',
  'linear-gradient(135deg,#f97316 0%,#ec4899 100%)',
  'linear-gradient(135deg,#14b8a6 0%,#84cc16 100%)',
  'linear-gradient(135deg,#334155 0%,#0f172a 100%)',
];

// Connecté = heartbeat récent. Le statut choisi par le membre s'y ajoute.
export function connected(user) {
  return !!user && Date.now() - (user.last_activity || 0) < ONLINE_WINDOW_MS;
}

// 'online' | 'game' | 'away' | 'offline' : ce que tout le monde voit.
export function statusKey(user) {
  if (!connected(user) || user.status === 'offline') return 'offline';
  if (user.status === 'game') return 'game';
  if (user.status === 'away') return 'away';
  return 'online';
}

export const isOnline = (user) => statusKey(user) !== 'offline';

export const STATUS_LABEL = { online: 'En ligne', game: 'En game', away: 'Absent', offline: 'Hors ligne' };
export const STATUS_DOT = { online: 'bg-brand-500', game: 'bg-violet-500', away: 'bg-amber-400', offline: 'bg-slate-300' };
export const statusLabel = (user) => STATUS_LABEL[statusKey(user)];
// Couleur du texte de statut (lisible sur fond sombre).
export const STATUS_TEXT = { online: '#00875f', game: '#7c3aed', away: '#b45309', offline: '#64748b' };
export const statusColor = (user) => STATUS_TEXT[statusKey(user)];

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
  'linear-gradient(135deg,#007454,#00412f)',
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
