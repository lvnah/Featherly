// Construit l'instantané de données visibles par un utilisateur (appelé par GET /api/sync).
import { db } from './db.js';

const all = (sql, ...p) => db.prepare(sql).all(...p);
const marks = (ids) => ids.map(() => '?').join(',') || 'NULL';

export function publicUser(u) {
  return {
    id: u.id,
    pseudo: u.pseudo,
    tag: u.tag,
    avatar: u.avatar,
    bio: u.bio,
    is_plus: u.is_plus,
    is_admin: u.is_admin ?? 0,
    banner:
      u.banner_type === 'image' || u.banner_type === 'url'
        ? { type: 'image', value: u.banner_value }
        : { type: 'gradient', index: Number(u.banner_value) || 0 },
    last_activity: u.last_activity,
  };
}

export function buildSnapshot(me) {
  const servers = all(
    `SELECT s.* FROM servers s JOIN memberships m ON m.server_id = s.id
     WHERE m.user_id = ? ORDER BY s.created_at`,
    me.id,
  );
  const sIds = servers.map((s) => s.id);
  const memberships = sIds.length
    ? all(`SELECT * FROM memberships WHERE server_id IN (${marks(sIds)})`, ...sIds)
    : [];
  const memberRoles = sIds.length
    ? all(`SELECT * FROM member_roles WHERE server_id IN (${marks(sIds)})`, ...sIds)
    : [];
  const roles = sIds.length
    ? all(`SELECT * FROM roles WHERE server_id IN (${marks(sIds)}) ORDER BY created_at, id`, ...sIds)
    : [];
  const channels = sIds.length
    ? all(`SELECT * FROM channels WHERE server_id IN (${marks(sIds)}) ORDER BY created_at, id`, ...sIds)
    : [];
  const cIds = channels.map((c) => c.id);
  // 100 derniers messages par salon.
  const messages = cIds.length
    ? all(
        `SELECT id, channel_id, user_id, content, created_at FROM (
           SELECT *, ROW_NUMBER() OVER (PARTITION BY channel_id ORDER BY created_at DESC) AS rn
           FROM messages WHERE channel_id IN (${marks(cIds)})
         ) WHERE rn <= 100 ORDER BY created_at`,
        ...cIds,
      )
    : [];
  const friendships = all('SELECT * FROM friendships WHERE from_id = ? OR to_id = ?', me.id, me.id);
  const dms = all(
    'SELECT * FROM dms WHERE from_id = ? OR to_id = ? ORDER BY created_at DESC LIMIT 2000',
    me.id,
    me.id,
  ).reverse();
  const voice = cIds.length
    ? all(`SELECT * FROM voice_connections WHERE channel_id IN (${marks(cIds)})`, ...cIds)
    : [];

  // Utilisateurs visibles : moi + membres de mes espaces + relations (amis, DM, vocal).
  const ids = new Set([me.id]);
  memberships.forEach((m) => ids.add(m.user_id));
  friendships.forEach((f) => ids.add(f.from_id).add(f.to_id));
  dms.forEach((d) => ids.add(d.from_id).add(d.to_id));
  voice.forEach((v) => ids.add(v.user_id));
  const uIds = [...ids];
  const users = all(`SELECT * FROM users WHERE id IN (${marks(uIds)})`, ...uIds);

  // Totaux globaux (agrégés, sans données personnelles) : membres inscrits et connectés.
  const counts = db
    .prepare('SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN last_activity > ? THEN 1 ELSE 0 END), 0) AS online FROM users')
    .get(Date.now() - 45_000);

  return {
    stats: { total: counts.total, online: counts.online },
    me: publicUser(me),
    users: users.map(publicUser),
    servers: servers.map((s) => ({
      id: s.id,
      name: s.name,
      icon: s.icon,
      is_public: s.is_public,
      owner_id: s.owner_id,
      invite_code: s.invite_code,
    })),
    memberships: memberships.map((m) => ({
      server_id: m.server_id,
      user_id: m.user_id,
      role_ids: memberRoles
        .filter((r) => r.server_id === m.server_id && r.user_id === m.user_id)
        .map((r) => r.role_id),
    })),
    roles: roles.map((r) => ({ ...r, can_manage_channels: r.can_manage_channels })),
    channels: channels.map((c) => ({ id: c.id, server_id: c.server_id, name: c.name, type: c.type })),
    messages,
    friendships: friendships.map((f) => ({ id: f.id, from: f.from_id, to: f.to_id, status: f.status })),
    dms: dms.map((d) => ({ id: d.id, from: d.from_id, to: d.to_id, content: d.content, created_at: d.created_at })),
    voice: voice.map((v) => ({ user_id: v.user_id, channel_id: v.channel_id })),
  };
}
