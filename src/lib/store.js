// Store client : état issu de GET /api/sync (rafraîchi toutes les 2 s), actions = POST /api/actions/:name.
// Le serveur reste l'autorité : les règles sont appliquées côté API (server/actions.js).
import { api, getToken, setToken } from './api';

let state = null;
let lastJson = null;
const listeners = new Set();

export function getState() {
  return state;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(next, json) {
  state = next;
  lastJson = json;
  listeners.forEach((l) => l());
}

// Relit l'état depuis l'API ; ne notifie que si quelque chose a changé.
export async function refresh() {
  if (!getToken()) {
    if (state) emit(null, null);
    return;
  }
  try {
    const snap = await api('/api/sync');
    const json = JSON.stringify(snap);
    if (json === lastJson) return;
    emit({ ...snap, session: { user_id: snap.me.id } }, json);
  } catch (err) {
    if (err.status === 401) {
      setToken(null);
      emit(null, null);
    }
  }
}

async function act(name, payload = {}) {
  const res = await api(`/api/actions/${name}`, { method: 'POST', body: payload });
  await refresh();
  return res.result;
}

// ---------- Authentification ----------

export async function register(pseudo, password) {
  const res = await api('/api/auth/register', { method: 'POST', body: { pseudo, password }, auth: false });
  setToken(res.token);
  await refresh();
}

export async function login(fullName, password) {
  const res = await api('/api/auth/login', { method: 'POST', body: { fullName, password }, auth: false });
  setToken(res.token);
  await refresh();
}

export async function logout() {
  try {
    await api('/api/auth/logout', { method: 'POST' });
  } catch {
    /* session déjà expirée */
  }
  setToken(null);
  emit(null, null);
}

// ---------- Sélecteurs purs ----------

export const getMe = (s) => s.users.find((u) => u.id === s.session.user_id) || null;
export const getUser = (s, id) => s.users.find((u) => u.id === id) || null;
export const membership = (s, serverId, userId) =>
  s.memberships.find((m) => m.server_id === serverId && m.user_id === userId) || null;
export const isMember = (s, serverId, userId) => !!membership(s, serverId, userId);
export const serversOf = (s, userId) => s.servers.filter((srv) => isMember(s, srv.id, userId));
export const membersOf = (s, serverId) =>
  s.memberships.filter((m) => m.server_id === serverId).map((m) => getUser(s, m.user_id)).filter(Boolean);
export const rolesOf = (s, serverId) => s.roles.filter((r) => r.server_id === serverId);

export function friendshipBetween(s, a, b) {
  return s.friendships.find((f) => (f.from === a && f.to === b) || (f.from === b && f.to === a)) || null;
}
export const isFriend = (s, a, b) => friendshipBetween(s, a, b)?.status === 'accepted';
export const friendsOf = (s, userId) =>
  s.friendships
    .filter((f) => f.status === 'accepted' && (f.from === userId || f.to === userId))
    .map((f) => getUser(s, f.from === userId ? f.to : f.from))
    .filter(Boolean);
export const pendingReceived = (s, userId) => s.friendships.filter((f) => f.status === 'pending' && f.to === userId);
export const pendingSent = (s, userId) => s.friendships.filter((f) => f.status === 'pending' && f.from === userId);

export function canManageChannels(s, serverId, userId) {
  const srv = s.servers.find((x) => x.id === serverId);
  if (!srv) return false;
  if (srv.owner_id === userId) return true;
  const m = membership(s, serverId, userId);
  if (!m) return false;
  return s.roles.some((r) => r.server_id === serverId && m.role_ids.includes(r.id) && r.can_manage_channels);
}

export function roleColorOf(s, serverId, userId) {
  const srv = s.servers.find((x) => x.id === serverId);
  if (srv?.owner_id === userId) return '#ef4444';
  const m = membership(s, serverId, userId);
  if (!m) return null;
  return rolesOf(s, serverId).find((r) => m.role_ids.includes(r.id))?.color ?? null;
}

export function roleNameOf(s, serverId, userId) {
  const srv = s.servers.find((x) => x.id === serverId);
  if (srv?.owner_id === userId) return 'Owner';
  const m = membership(s, serverId, userId);
  return rolesOf(s, serverId).find((r) => m?.role_ids.includes(r.id))?.name ?? 'Membre';
}

export function roleRank(s, serverId, userId) {
  const srv = s.servers.find((x) => x.id === serverId);
  if (srv?.owner_id === userId) return -1;
  const m = membership(s, serverId, userId);
  const idx = rolesOf(s, serverId).findIndex((r) => m?.role_ids.includes(r.id));
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
}

export function hasDmHistory(s, a, b) {
  return s.dms.some((d) => (d.from === a && d.to === b) || (d.from === b && d.to === a));
}

// ---------- Actions (aliases vers l'API) ----------

export const updateProfile = (patch) => act('updateProfile', patch);
export const togglePlus = () => act('togglePlus');
export const sendFriendRequest = (targetId) => act('sendFriendRequest', { targetId });
export const sendFriendRequestByTag = (query) => act('sendFriendRequest', { query });
export const respondFriendRequest = (id, accept) => act('respondFriendRequest', { id, accept });
export const removeFriend = (userId) => act('removeFriend', { userId });
export const sendDM = (toId, content) => act('sendDM', { toId, content });
export const createServer = (payload) => act('createServer', payload);
export const joinServer = (code) => act('joinServer', { code });
export const regenerateInvite = (serverId) => act('regenerateInvite', { serverId });
export const createChannel = (serverId, name, type) => act('createChannel', { serverId, name, type });
export const deleteChannel = (channelId) => act('deleteChannel', { channelId });
export const sendMessage = (channelId, content) => act('sendMessage', { channelId, content });
export const joinVoice = (channelId) => act('joinVoice', { channelId });
export const leaveVoice = () => act('leaveVoice');
export const createRole = (serverId, role) => act('createRole', { serverId, ...role });
export const toggleRole = (serverId, userId, roleId) => act('toggleRole', { serverId, userId, roleId });
export const kickMember = (serverId, userId) => act('kickMember', { serverId, userId });
export const reportUser = (targetId, reason) => act('reportUser', { targetId, reason });
