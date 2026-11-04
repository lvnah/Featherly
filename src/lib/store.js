// Store applicatif : remplace la base MySQL + sessions PHP de la version d'origine.
// Persistance dans localStorage, synchronisation entre onglets et polling (sync()).
// Les actions ci-dessous jouent le rôle des endpoints : elles valident les règles
// métier et lèvent une Error(message) affichable à l'utilisateur.
// Pour passer en temps réel serveur, remplacer `commit`/`sync` par une API (Supabase, WebSocket...).

import { uid, randomTag, OWNER_COLOR, slugChannel } from './util';

const KEY = 'hevenly:v1';
const listeners = new Set();
let state;
let lastRaw = null;

function seed() {
  const now = Date.now();
  return {
    session: { user_id: null },
    users: [
      { id: 'u_lina', pseudo: 'Lina', tag: '0001', avatar: '', bio: 'Fondatrice de Hevenly ✨', is_plus: 1, banner: { type: 'gradient', index: 1 }, last_activity: 0 },
      { id: 'u_maxime', pseudo: 'Maxime', tag: '1234', avatar: '', bio: 'Toujours en vocal.', is_plus: 0, banner: { type: 'gradient', index: 2 }, last_activity: 0 },
      { id: 'u_sofia', pseudo: 'Sofia', tag: '5678', avatar: '', bio: 'Lecture et musique.', is_plus: 0, banner: { type: 'gradient', index: 4 }, last_activity: 0 },
      { id: 'u_hugo', pseudo: 'Hugo', tag: '4321', avatar: '', bio: '', is_plus: 0, banner: { type: 'gradient', index: 3 }, last_activity: 0 },
    ],
    servers: [
      { id: 's_lounge', name: 'Hevenly Lounge', icon: '', is_public: 1, owner_id: 'u_lina', invite_code: 'HEVENLY1' },
    ],
    memberships: [
      { server_id: 's_lounge', user_id: 'u_lina', role_ids: [] },
      { server_id: 's_lounge', user_id: 'u_maxime', role_ids: ['r_mod'] },
      { server_id: 's_lounge', user_id: 'u_sofia', role_ids: [] },
      { server_id: 's_lounge', user_id: 'u_hugo', role_ids: [] },
    ],
    roles: [{ id: 'r_mod', server_id: 's_lounge', name: 'Modérateur', color: '#38bdf8', can_manage_channels: 1 }],
    channels: [
      { id: 'c_general', server_id: 's_lounge', name: 'général', type: 'text' },
      { id: 'c_memes', server_id: 's_lounge', name: 'memes', type: 'text' },
      { id: 'c_vocal', server_id: 's_lounge', name: 'lounge-vocal', type: 'voice' },
    ],
    messages: [
      { id: 'm_1', channel_id: 'c_general', user_id: 'u_lina', content: 'Bienvenue sur Hevenly ! 🌿', created_at: now - 600000 },
      { id: 'm_2', channel_id: 'c_general', user_id: 'u_maxime', content: 'Trop content d’être là.', created_at: now - 300000 },
    ],
    friendships: [
      { id: 'f_1', from: 'u_maxime', to: 'u_lina', status: 'accepted' },
      { id: 'f_2', from: 'u_sofia', to: 'u_lina', status: 'pending' },
    ],
    dms: [],
    voice: [],
    reports: [],
  };
}

function commit(next) {
  state = next;
  lastRaw = JSON.stringify(state);
  try {
    localStorage.setItem(KEY, lastRaw);
  } catch {
    /* stockage indisponible : l'état reste en mémoire */
  }
  listeners.forEach((l) => l());
}

function mutate(fn) {
  const draft = structuredClone(state);
  const result = fn(draft); // si fn lève une erreur, rien n'est commité
  commit(draft);
  return result;
}

export function getState() {
  return state;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Relit le stockage (autres onglets) et notifie seulement en cas de changement.
export function sync() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw && raw !== lastRaw) {
      lastRaw = raw;
      state = JSON.parse(raw);
      listeners.forEach((l) => l());
    }
  } catch {
    /* ignore */
  }
}

(function init() {
  let raw = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    /* ignore */
  }
  if (raw) {
    try {
      state = JSON.parse(raw);
      lastRaw = raw;
      return;
    } catch {
      /* données corrompues : on repart de la démo */
    }
  }
  state = seed();
  lastRaw = JSON.stringify(state);
})();

// ---------- Sélecteurs purs (prennent l'état en paramètre) ----------

export const getMe = (s) => s.users.find((u) => u.id === s.session.user_id) || null;
export const getUser = (s, id) => s.users.find((u) => u.id === id) || null;
export const membership = (s, serverId, userId) =>
  s.memberships.find((m) => m.server_id === serverId && m.user_id === userId) || null;
export const isMember = (s, serverId, userId) => !!membership(s, serverId, userId);
export const serversOf = (s, userId) =>
  s.servers.filter((srv) => isMember(s, srv.id, userId));
export const membersOf = (s, serverId) =>
  s.memberships.filter((m) => m.server_id === serverId).map((m) => getUser(s, m.user_id)).filter(Boolean);
export const rolesOf = (s, serverId) => s.roles.filter((r) => r.server_id === serverId);

export function friendshipBetween(s, a, b) {
  return (
    s.friendships.find(
      (f) => (f.from === a && f.to === b) || (f.from === b && f.to === a),
    ) || null
  );
}
export const isFriend = (s, a, b) => friendshipBetween(s, a, b)?.status === 'accepted';
export const friendsOf = (s, userId) =>
  s.friendships
    .filter((f) => f.status === 'accepted' && (f.from === userId || f.to === userId))
    .map((f) => getUser(s, f.from === userId ? f.to : f.from))
    .filter(Boolean);
export const pendingReceived = (s, userId) =>
  s.friendships.filter((f) => f.status === 'pending' && f.to === userId);
export const pendingSent = (s, userId) =>
  s.friendships.filter((f) => f.status === 'pending' && f.from === userId);

export function hasDmHistory(s, a, b) {
  return s.dms.some((d) => (d.from === a && d.to === b) || (d.from === b && d.to === a));
}

export function canManageChannels(s, serverId, userId) {
  const srv = s.servers.find((x) => x.id === serverId);
  if (!srv) return false;
  if (srv.owner_id === userId) return true;
  const m = membership(s, serverId, userId);
  if (!m) return false;
  return s.roles.some((r) => r.server_id === serverId && m.role_ids.includes(r.id) && r.can_manage_channels);
}

// Couleur de pseudo : rouge pour le propriétaire, sinon couleur du premier rôle coloré.
export function roleColorOf(s, serverId, userId) {
  const srv = s.servers.find((x) => x.id === serverId);
  if (srv?.owner_id === userId) return OWNER_COLOR;
  const m = membership(s, serverId, userId);
  if (!m) return null;
  const role = rolesOf(s, serverId).find((r) => m.role_ids.includes(r.id));
  return role?.color ?? null;
}

// Ordre d'affichage : propriétaire, puis rôles dans leur ordre de création.
export function roleRank(s, serverId, userId) {
  const srv = s.servers.find((x) => x.id === serverId);
  if (srv?.owner_id === userId) return -1;
  const m = membership(s, serverId, userId);
  const roles = rolesOf(s, serverId);
  const idx = roles.findIndex((r) => m?.role_ids.includes(r.id));
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
}

// ---------- Actions ----------

export function login(userId) {
  mutate((s) => {
    const u = getUser(s, userId);
    if (!u) throw new Error('Compte introuvable.');
    s.session.user_id = userId;
    u.last_activity = Date.now();
  });
}

export function logout() {
  mutate((s) => {
    const uid_ = s.session.user_id;
    const u = getUser(s, uid_);
    if (u) u.last_activity = 0;
    s.voice = s.voice.filter((v) => v.user_id !== uid_);
    s.session.user_id = null;
  });
}

export function register(pseudo) {
  const name = pseudo.trim();
  if (name.length < 2 || name.length > 24) throw new Error('Le pseudo doit faire entre 2 et 24 caractères.');
  return mutate((s) => {
    const id = uid('u');
    s.users.push({
      id,
      pseudo: name,
      tag: randomTag(),
      avatar: '',
      bio: '',
      is_plus: 0,
      banner: { type: 'gradient', index: 0 },
      last_activity: Date.now(),
    });
    s.session.user_id = id;
    return id;
  });
}

// Heartbeat de présence : appelé régulièrement pour rester « en ligne ».
export function touch() {
  mutate((s) => {
    const u = getMe(s);
    if (u) u.last_activity = Date.now();
  });
}

export function updateProfile(patch) {
  mutate((s) => {
    const u = getMe(s);
    if (!u) throw new Error('Vous devez être connecté.');
    if (patch.pseudo !== undefined) {
      const p = patch.pseudo.trim();
      if (p.length < 2 || p.length > 24) throw new Error('Le pseudo doit faire entre 2 et 24 caractères.');
      u.pseudo = p;
    }
    if (patch.tag !== undefined && patch.tag !== u.tag) {
      if (!u.is_plus) throw new Error('Le tag personnalisé est réservé aux membres PLUS.');
      if (!/^\d{4}$/.test(patch.tag)) throw new Error('Le tag doit contenir exactement 4 chiffres.');
      u.tag = patch.tag;
    }
    if (patch.avatar !== undefined) u.avatar = patch.avatar.trim();
    if (patch.bio !== undefined) u.bio = patch.bio.slice(0, 190);
    if (patch.banner !== undefined) {
      if (patch.banner.type === 'url' && !u.is_plus) throw new Error('La bannière personnalisée est réservée aux membres PLUS.');
      u.banner = patch.banner;
    }
  });
}

// Simulation du statut PLUS (il n'existe pas de paiement dans cette version).
export function togglePlus() {
  mutate((s) => {
    const u = getMe(s);
    if (u) u.is_plus = u.is_plus ? 0 : 1;
  });
}

// ----- Amis -----

export function findUserByTag(s, query) {
  const [pseudo = '', tag = ''] = String(query).split('#').map((x) => x.trim());
  return s.users.find((u) => u.pseudo.toLowerCase() === pseudo.toLowerCase() && u.tag === tag) || null;
}

export function sendFriendRequest(targetId) {
  mutate((s) => {
    const me = getMe(s);
    if (!me) throw new Error('Vous devez être connecté.');
    if (targetId === me.id) throw new Error('Vous ne pouvez pas vous ajouter vous-même.');
    if (!getUser(s, targetId)) throw new Error('Utilisateur introuvable.');
    const existing = friendshipBetween(s, me.id, targetId);
    if (existing?.status === 'accepted') throw new Error('Vous êtes déjà amis.');
    if (existing) throw new Error('Une demande est déjà en attente.');
    s.friendships.push({ id: uid('f'), from: me.id, to: targetId, status: 'pending' });
  });
}

export function respondFriendRequest(friendshipId, accept) {
  mutate((s) => {
    if (accept) {
      const f = s.friendships.find((x) => x.id === friendshipId);
      if (f) f.status = 'accepted';
    } else {
      s.friendships = s.friendships.filter((x) => x.id !== friendshipId);
    }
  });
}

export function removeFriend(otherId) {
  mutate((s) => {
    const me = getMe(s);
    s.friendships = s.friendships.filter(
      (f) => !((f.from === me.id && f.to === otherId) || (f.from === otherId && f.to === me.id)),
    );
  });
}

// ----- Messages privés -----

export function sendDM(toId, content) {
  const text = content.trim();
  if (!text) return;
  if (text.length > 1000) throw new Error('Message trop long (1000 caractères max).');
  mutate((s) => {
    const me = getMe(s);
    if (!isFriend(s, me.id, toId) && !hasDmHistory(s, me.id, toId)) {
      throw new Error('Ajoutez cet utilisateur en ami pour lui écrire.');
    }
    s.dms.push({ id: uid('d'), from: me.id, to: toId, content: text, created_at: Date.now() });
  });
}

// ----- Serveurs -----

export function createServer({ name, icon = '', isPublic = true, customCode = '' }) {
  const cleanName = name.trim();
  if (!cleanName || cleanName.length > 16) throw new Error('Le nom doit faire entre 1 et 16 caractères.');
  return mutate((s) => {
    const me = getMe(s);
    if (!me) throw new Error('Vous devez être connecté.');
    let code;
    if (customCode.trim()) {
      if (!me.is_plus) throw new Error('Le code personnalisé est réservé aux membres PLUS.');
      code = customCode.trim().toUpperCase();
      if (!/^[A-Z0-9-]{4,20}$/.test(code)) throw new Error('Code : 4 à 20 caractères (lettres, chiffres, tirets).');
      if (s.servers.some((x) => x.invite_code === code)) throw new Error('Ce code est déjà utilisé.');
    } else {
      do {
        code = Math.random().toString(36).slice(2, 10).toUpperCase();
      } while (s.servers.some((x) => x.invite_code === code));
    }
    const id = uid('s');
    s.servers.push({ id, name: cleanName, icon: icon.trim(), is_public: isPublic ? 1 : 0, owner_id: me.id, invite_code: code });
    s.memberships.push({ server_id: id, user_id: me.id, role_ids: [] });
    s.channels.push(
      { id: uid('c'), server_id: id, name: 'général', type: 'text' },
      { id: uid('c'), server_id: id, name: 'vocal', type: 'voice' },
    );
    return id;
  });
}

export function joinServer(code) {
  return mutate((s) => {
    const me = getMe(s);
    const srv = s.servers.find((x) => x.invite_code === code.trim().toUpperCase());
    if (!srv) throw new Error('Code d’invitation invalide.');
    if (isMember(s, srv.id, me.id)) throw new Error('Vous êtes déjà membre de ce serveur.');
    s.memberships.push({ server_id: srv.id, user_id: me.id, role_ids: [] });
    return srv.id;
  });
}

export function regenerateInvite(serverId) {
  // Réservé au propriétaire : génère un nouveau code automatique.
  mutate((s) => {
    const me = getMe(s);
    const srv = s.servers.find((x) => x.id === serverId);
    if (!srv || srv.owner_id !== me.id) throw new Error('Action réservée au propriétaire.');
    let code;
    do {
      code = Math.random().toString(36).slice(2, 10).toUpperCase();
    } while (s.servers.some((x) => x.invite_code === code));
    srv.invite_code = code;
  });
}

export function createChannel(serverId, name, type) {
  const clean = slugChannel(name);
  if (!clean) throw new Error('Nom de salon invalide.');
  mutate((s) => {
    const me = getMe(s);
    if (!canManageChannels(s, serverId, me.id)) throw new Error('Permission insuffisante.');
    s.channels.push({ id: uid('c'), server_id: serverId, name: clean, type: type === 'voice' ? 'voice' : 'text' });
  });
}

export function deleteChannel(channelId) {
  mutate((s) => {
    const me = getMe(s);
    const ch = s.channels.find((c) => c.id === channelId);
    if (!ch) throw new Error('Salon introuvable.');
    if (!canManageChannels(s, ch.server_id, me.id)) throw new Error('Permission insuffisante.');
    const count = s.channels.filter((c) => c.server_id === ch.server_id).length;
    if (count <= 1) throw new Error('Impossible de supprimer le dernier salon.');
    s.channels = s.channels.filter((c) => c.id !== channelId);
    s.messages = s.messages.filter((m) => m.channel_id !== channelId);
    s.voice = s.voice.filter((v) => v.channel_id !== channelId);
  });
}

export function sendMessage(channelId, content) {
  const text = content.trim();
  if (!text) return;
  if (text.length > 2000) throw new Error('Message trop long (2000 caractères max).');
  mutate((s) => {
    const me = getMe(s);
    const ch = s.channels.find((c) => c.id === channelId);
    if (!ch || ch.type !== 'text') throw new Error('Salon texte introuvable.');
    if (!isMember(s, ch.server_id, me.id)) throw new Error('Vous n’êtes pas membre de ce serveur.');
    s.messages.push({ id: uid('m'), channel_id: channelId, user_id: me.id, content: text, created_at: Date.now() });
  });
}

// Un seul salon vocal actif par utilisateur.
export function joinVoice(channelId) {
  mutate((s) => {
    const me = getMe(s);
    const ch = s.channels.find((c) => c.id === channelId);
    if (!ch || ch.type !== 'voice') throw new Error('Salon vocal introuvable.');
    if (!isMember(s, ch.server_id, me.id)) throw new Error('Vous n’êtes pas membre de ce serveur.');
    s.voice = s.voice.filter((v) => v.user_id !== me.id);
    s.voice.push({ user_id: me.id, channel_id: channelId });
  });
}

export function leaveVoice() {
  mutate((s) => {
    const me = getMe(s);
    s.voice = s.voice.filter((v) => v.user_id !== me.id);
  });
}

const ROLE_DEFAULT = '#38bdf8';

export function createRole(serverId, { name, color, can_manage_channels }) {
  const clean = name.trim();
  if (!clean || clean.length > 20) throw new Error('Le nom du rôle doit faire entre 1 et 20 caractères.');
  mutate((s) => {
    const me = getMe(s);
    const srv = s.servers.find((x) => x.id === serverId);
    if (!srv || srv.owner_id !== me.id) throw new Error('Action réservée au propriétaire.');
    s.roles.push({ id: uid('r'), server_id: serverId, name: clean, color: color || ROLE_DEFAULT, can_manage_channels: can_manage_channels ? 1 : 0 });
  });
}

export function toggleRole(serverId, userId, roleId) {
  mutate((s) => {
    const me = getMe(s);
    const srv = s.servers.find((x) => x.id === serverId);
    if (!srv || srv.owner_id !== me.id) throw new Error('Action réservée au propriétaire.');
    const m = membership(s, serverId, userId);
    if (!m) throw new Error('Ce membre ne fait pas partie du serveur.');
    m.role_ids = m.role_ids.includes(roleId)
      ? m.role_ids.filter((r) => r !== roleId)
      : [...m.role_ids, roleId];
  });
}

export function kickMember(serverId, userId) {
  mutate((s) => {
    const me = getMe(s);
    const srv = s.servers.find((x) => x.id === serverId);
    if (!srv || srv.owner_id !== me.id) throw new Error('Action réservée au propriétaire.');
    if (userId === me.id) throw new Error('Vous ne pouvez pas vous exclure vous-même.');
    s.memberships = s.memberships.filter((m) => !(m.server_id === serverId && m.user_id === userId));
    const chIds = s.channels.filter((c) => c.server_id === serverId).map((c) => c.id);
    s.voice = s.voice.filter((v) => !(v.user_id === userId && chIds.includes(v.channel_id)));
  });
}

// ----- Signalements -----

export function reportUser(targetId, reason) {
  const clean = reason.trim();
  if (clean.length < 3 || clean.length > 300) throw new Error('Motif : entre 3 et 300 caractères.');
  mutate((s) => {
    const me = getMe(s);
    if (targetId === me.id) throw new Error('Vous ne pouvez pas vous signaler vous-même.');
    s.reports.push({ id: uid('r'), reporter_id: me.id, target_user_id: targetId, reason: clean, created_at: Date.now() });
  });
}
