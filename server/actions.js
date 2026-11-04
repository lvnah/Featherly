// Actions métier : toutes les règles sont appliquées côté serveur.
// Chaque action reçoit (me, payload) et lève HttpError(status, message) en cas d'échec.
import { randomBytes } from 'node:crypto';
import { db } from './db.js';
import { hashPassword, verifyPassword, createSession, deleteSession } from './auth.js';
import { publicUser } from './sync.js';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const fail = (message, status = 400) => {
  throw new HttpError(status, message);
};
const one = (sql, ...p) => db.prepare(sql).get(...p);
const all = (sql, ...p) => db.prepare(sql).all(...p);
const run = (sql, ...p) => db.prepare(sql).run(...p);
const newId = (prefix) => `${prefix}_${randomBytes(8).toString('hex')}`;
const now = () => Date.now();
const text = (value, min, max, message) => {
  const t = String(value ?? '').trim();
  if (t.length < min || t.length > max) fail(message);
  return t;
};
const transaction = (fn) => {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
};

const requireAdmin = (me) => {
  if (!me.is_admin) fail('Accès réservé aux administrateurs.', 403);
};
const getServer = (id) => one('SELECT * FROM servers WHERE id = ?', id);
const isMember = (serverId, userId) =>
  !!one('SELECT 1 FROM memberships WHERE server_id = ? AND user_id = ?', serverId, userId);
const requireOwner = (serverId, me) => {
  const srv = getServer(serverId);
  if (!srv) fail('Espace introuvable.', 404);
  if (srv.owner_id !== me.id) fail('Action réservée au propriétaire.', 403);
  return srv;
};
export const canManageChannels = (serverId, userId) => {
  const srv = getServer(serverId);
  if (!srv) return false;
  if (srv.owner_id === userId) return true;
  return !!one(
    `SELECT 1 FROM member_roles mr JOIN roles r ON r.id = mr.role_id
     WHERE mr.server_id = ? AND mr.user_id = ? AND r.can_manage_channels = 1`,
    serverId,
    userId,
  );
};
const randomCode = () => {
  let code;
  do {
    code = randomBytes(5).toString('hex').toUpperCase();
  } while (one('SELECT 1 FROM servers WHERE invite_code = ?', code));
  return code;
};
const httpUrl = (value, max, message) => {
  const v = String(value ?? '').trim().slice(0, max);
  if (v && !/^https?:\/\//i.test(v)) fail(message);
  return v;
};

const handlers = {
  updateProfile(me, p) {
    const pseudo = p.pseudo !== undefined
      ? text(p.pseudo, 2, 24, 'Le pseudo doit faire entre 2 et 24 caractères.')
      : me.pseudo;
    let tag = me.tag;
    if (p.tag !== undefined && p.tag !== me.tag) {
      if (!me.is_plus) fail('Le tag personnalisé est réservé aux membres PLUS.', 403);
      if (!/^\d{4}$/.test(p.tag)) fail('Le tag doit contenir exactement 4 chiffres.');
      tag = p.tag;
    }
    if (one('SELECT 1 FROM users WHERE pseudo = ? COLLATE NOCASE AND tag = ? AND id <> ?', pseudo, tag, me.id)) {
      fail('Ce pseudo et ce tag sont déjà utilisés.', 409);
    }
    const avatar = p.avatar !== undefined ? httpUrl(p.avatar, 500, 'L’avatar doit être une URL http(s).') : me.avatar;
    const bio = p.bio !== undefined ? String(p.bio).slice(0, 190) : me.bio;
    let bannerType = me.banner_type;
    let bannerValue = me.banner_value;
    if (p.banner !== undefined) {
      if (p.banner.type === 'url') {
        if (!me.is_plus) fail('La bannière personnalisée est réservée aux membres PLUS.', 403);
        bannerType = 'url';
        bannerValue = httpUrl(p.banner.value, 500, 'La bannière doit être une URL http(s).');
      } else {
        bannerType = 'gradient';
        bannerValue = String(Math.max(0, Math.min(5, Number(p.banner.index) || 0)));
      }
    }
    run(
      'UPDATE users SET pseudo = ?, tag = ?, avatar = ?, bio = ?, banner_type = ?, banner_value = ? WHERE id = ?',
      pseudo, tag, avatar, bio, bannerType, bannerValue, me.id,
    );
  },

  // Simulation du statut PLUS (pas de paiement). Désactivable via ALLOW_PLUS_SIMULATION=0.
  togglePlus(me) {
    if (process.env.ALLOW_PLUS_SIMULATION === '0') fail('Statut PLUS indisponible.', 403);
    run('UPDATE users SET is_plus = 1 - is_plus WHERE id = ?', me.id);
  },

  sendFriendRequest(me, p) {
    let target;
    if (p.targetId) {
      target = one('SELECT * FROM users WHERE id = ?', p.targetId);
    } else {
      const [pseudo = '', tag = ''] = String(p.query ?? '').split('#').map((x) => x.trim());
      target = one('SELECT * FROM users WHERE pseudo = ? COLLATE NOCASE AND tag = ?', pseudo, tag);
    }
    if (!target) fail('Utilisateur introuvable. Format attendu : Pseudo#1234', 404);
    if (target.id === me.id) fail('Vous ne pouvez pas vous ajouter vous-même.');
    const existing = one(
      'SELECT * FROM friendships WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)',
      me.id, target.id, target.id, me.id,
    );
    if (existing?.status === 'accepted') fail('Vous êtes déjà amis.', 409);
    if (existing) fail('Une demande est déjà en attente.', 409);
    run(
      'INSERT INTO friendships (id, from_id, to_id, status, created_at) VALUES (?, ?, ?, ?, ?)',
      newId('f'), me.id, target.id, 'pending', now(),
    );
  },

  respondFriendRequest(me, p) {
    const f = one('SELECT * FROM friendships WHERE id = ?', p.id);
    if (!f || (f.from_id !== me.id && f.to_id !== me.id)) fail('Demande introuvable.', 404);
    if (p.accept) {
      if (f.to_id !== me.id) fail('Seul le destinataire peut accepter.', 403);
      run("UPDATE friendships SET status = 'accepted' WHERE id = ?", f.id);
    } else {
      run('DELETE FROM friendships WHERE id = ?', f.id);
    }
  },

  removeFriend(me, p) {
    run(
      'DELETE FROM friendships WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)',
      me.id, p.userId, p.userId, me.id,
    );
  },

  sendDM(me, p) {
    const content = text(p.content, 1, 1000, 'Message vide ou trop long (1000 caractères max).');
    const friend = one(
      "SELECT 1 FROM friendships WHERE status = 'accepted' AND ((from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?))",
      me.id, p.toId, p.toId, me.id,
    );
    const history = one(
      'SELECT 1 FROM dms WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?) LIMIT 1',
      me.id, p.toId, p.toId, me.id,
    );
    if (!friend && !history) fail('Ajoutez cet utilisateur en ami pour lui écrire.', 403);
    run('INSERT INTO dms (id, from_id, to_id, content, created_at) VALUES (?, ?, ?, ?, ?)', newId('d'), me.id, p.toId, content, now());
  },

  createServer(me, p) {
    const name = text(p.name, 1, 16, 'Le nom doit faire entre 1 et 16 caractères.');
    const icon = httpUrl(p.icon, 500, 'L’icône doit être une URL http(s).');
    let code;
    if (String(p.customCode ?? '').trim()) {
      if (!me.is_plus) fail('Le code personnalisé est réservé aux membres PLUS.', 403);
      code = String(p.customCode).trim().toUpperCase();
      if (!/^[A-Z0-9-]{4,20}$/.test(code)) fail('Code : 4 à 20 caractères (lettres, chiffres, tirets).');
      if (one('SELECT 1 FROM servers WHERE invite_code = ?', code)) fail('Ce code est déjà utilisé.', 409);
    } else {
      code = randomCode();
    }
    const id = newId('s');
    return transaction(() => {
      run(
        'INSERT INTO servers (id, name, icon, is_public, owner_id, invite_code, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        id, name, icon, p.isPublic === false ? 0 : 1, me.id, code, now(),
      );
      run('INSERT INTO memberships (server_id, user_id, joined_at) VALUES (?, ?, ?)', id, me.id, now());
      run('INSERT INTO channels (id, server_id, name, type, created_at) VALUES (?, ?, ?, ?, ?)', newId('c'), id, 'général', 'text', now());
      run('INSERT INTO channels (id, server_id, name, type, created_at) VALUES (?, ?, ?, ?, ?)', newId('c'), id, 'vocal', 'voice', now() + 1);
      return { id };
    });
  },

  joinServer(me, p) {
    const srv = one('SELECT * FROM servers WHERE invite_code = ?', String(p.code ?? '').trim().toUpperCase());
    if (!srv) fail('Code d’invitation invalide.', 404);
    if (isMember(srv.id, me.id)) fail('Vous êtes déjà membre de cet espace.', 409);
    run('INSERT INTO memberships (server_id, user_id, joined_at) VALUES (?, ?, ?)', srv.id, me.id, now());
    return { id: srv.id };
  },

  regenerateInvite(me, p) {
    requireOwner(p.serverId, me);
    run('UPDATE servers SET invite_code = ? WHERE id = ?', randomCode(), p.serverId);
  },

  createChannel(me, p) {
    if (!canManageChannels(p.serverId, me.id)) fail('Permission insuffisante.', 403);
    const raw = String(p.name ?? '').trim();
    if (!/^[a-zA-Z0-9-]{1,16}$/.test(raw)) fail('Nom invalide (uniquement lettres, chiffres, tirets, max 16 caractères).');
    run(
      'INSERT INTO channels (id, server_id, name, type, created_at) VALUES (?, ?, ?, ?, ?)',
      newId('c'), p.serverId, raw.toLowerCase(), p.type === 'voice' ? 'voice' : 'text', now(),
    );
  },

  deleteChannel(me, p) {
    const ch = one('SELECT * FROM channels WHERE id = ?', p.channelId);
    if (!ch) fail('Salon introuvable.', 404);
    if (!canManageChannels(ch.server_id, me.id)) fail('Permission insuffisante.', 403);
    const count = one('SELECT COUNT(*) AS n FROM channels WHERE server_id = ?', ch.server_id).n;
    if (count <= 1) fail('Impossible de supprimer le dernier salon.');
    run('DELETE FROM channels WHERE id = ?', ch.id);
  },

  sendMessage(me, p) {
    const ch = one('SELECT * FROM channels WHERE id = ?', p.channelId);
    if (!ch || ch.type !== 'text') fail('Salon texte introuvable.', 404);
    if (!isMember(ch.server_id, me.id)) fail('Vous n’êtes pas membre de cet espace.', 403);
    const content = text(p.content, 1, 2000, 'Message vide ou trop long (2000 caractères max).');
    run('INSERT INTO messages (id, channel_id, user_id, content, created_at) VALUES (?, ?, ?, ?, ?)', newId('m'), ch.id, me.id, content, now());
  },

  joinVoice(me, p) {
    const ch = one('SELECT * FROM channels WHERE id = ?', p.channelId);
    if (!ch || ch.type !== 'voice') fail('Salon vocal introuvable.', 404);
    if (!isMember(ch.server_id, me.id)) fail('Vous n’êtes pas membre de cet espace.', 403);
    run('INSERT OR REPLACE INTO voice_connections (user_id, channel_id) VALUES (?, ?)', me.id, ch.id);
  },

  leaveVoice(me) {
    run('DELETE FROM voice_connections WHERE user_id = ?', me.id);
  },

  createRole(me, p) {
    requireOwner(p.serverId, me);
    const name = text(p.name, 1, 20, 'Le nom du rôle doit faire entre 1 et 20 caractères.');
    const color = /^#[0-9a-f]{6}$/i.test(p.color ?? '') ? p.color : '#38bdf8';
    run(
      'INSERT INTO roles (id, server_id, name, color, can_manage_channels, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      newId('r'), p.serverId, name, color, p.can_manage_channels ? 1 : 0, now(),
    );
  },

  // Un seul rôle par membre (roleId vide = retirer les rôles), comme assign_role de server.php.
  assignRole(me, p) {
    requireOwner(p.serverId, me);
    if (!isMember(p.serverId, p.userId)) fail('Ce membre ne fait pas partie de l’espace.', 404);
    run('DELETE FROM member_roles WHERE server_id = ? AND user_id = ?', p.serverId, p.userId);
    if (p.roleId) {
      const role = one('SELECT * FROM roles WHERE id = ? AND server_id = ?', p.roleId, p.serverId);
      if (!role) fail('Rôle introuvable.', 404);
      run('INSERT INTO member_roles (server_id, user_id, role_id) VALUES (?, ?, ?)', p.serverId, p.userId, p.roleId);
    }
  },

  updateRole(me, p) {
    requireOwner(p.serverId, me);
    const role = one('SELECT * FROM roles WHERE id = ? AND server_id = ?', p.roleId, p.serverId);
    if (!role) fail('Rôle introuvable.', 404);
    const name = text(p.name ?? role.name, 1, 20, 'Le nom du rôle doit faire entre 1 et 20 caractères.');
    const color = /^#[0-9a-f]{6}$/i.test(p.color ?? '') ? p.color : role.color;
    run('UPDATE roles SET name = ?, color = ?, can_manage_channels = ? WHERE id = ?', name, color, p.can_manage_channels ? 1 : 0, role.id);
  },

  deleteRole(me, p) {
    requireOwner(p.serverId, me);
    run('DELETE FROM roles WHERE id = ? AND server_id = ?', p.roleId, p.serverId);
  },

  // Supprimer un message : l'auteur ou le propriétaire de l'espace.
  deleteMessage(me, p) {
    const msg = one(
      'SELECT m.id, m.user_id, c.server_id FROM messages m JOIN channels c ON c.id = m.channel_id WHERE m.id = ?',
      p.messageId,
    );
    if (!msg) fail('Message introuvable.', 404);
    const srv = getServer(msg.server_id);
    if (srv.owner_id !== me.id && msg.user_id !== me.id) fail('Action non autorisée.', 403);
    run('DELETE FROM messages WHERE id = ?', msg.id);
  },

  updateServerIcon(me, p) {
    requireOwner(p.serverId, me);
    const icon = httpUrl(p.icon, 500, 'URL invalide.');
    if (!icon) fail('URL invalide.');
    run('UPDATE servers SET icon = ? WHERE id = ?', icon, p.serverId);
  },

  deleteServer(me, p) {
    requireOwner(p.serverId, me);
    run('DELETE FROM servers WHERE id = ?', p.serverId);
  },

  // Code personnalisé : réservé au propriétaire PLUS.
  updateInvite(me, p) {
    requireOwner(p.serverId, me);
    if (!me.is_plus) fail('Le code personnalisé est réservé aux membres PLUS.', 403);
    const code = String(p.code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length < 4 || code.length > 20) fail('Code : 4 à 20 caractères (lettres et chiffres).');
    if (one('SELECT 1 FROM servers WHERE invite_code = ? AND id <> ?', code, p.serverId)) {
      fail('Ce code est déjà utilisé par un autre espace.', 409);
    }
    run('UPDATE servers SET invite_code = ? WHERE id = ?', code, p.serverId);
  },

  kickMember(me, p) {
    requireOwner(p.serverId, me);
    if (p.userId === me.id) fail('Vous ne pouvez pas vous exclure vous-même.');
    transaction(() => {
      run(
        'DELETE FROM voice_connections WHERE user_id = ? AND channel_id IN (SELECT id FROM channels WHERE server_id = ?)',
        p.userId, p.serverId,
      );
      run('DELETE FROM memberships WHERE server_id = ? AND user_id = ?', p.serverId, p.userId);
    });
  },

  reportUser(me, p) {
    const reason = text(p.reason, 3, 300, 'Motif : entre 3 et 300 caractères.');
    if (p.targetId === me.id) fail('Vous ne pouvez pas vous signaler vous-même.');
    if (!one('SELECT 1 FROM users WHERE id = ?', p.targetId)) fail('Utilisateur introuvable.', 404);
    run(
      'INSERT INTO reports (id, reporter_id, target_user_id, reason, created_at, server_id) VALUES (?, ?, ?, ?, ?, ?)',
      newId('rp'), me.id, p.targetId, reason, now(), p.serverId ?? null,
    );
  },

  // ----- Administration (réservée à is_admin = 1) -----
  adminListUsers(me) {
    requireAdmin(me);
    return all('SELECT id, pseudo, tag, is_plus, is_admin, created_at, last_activity FROM users ORDER BY created_at DESC');
  },

  adminSetPlus(me, p) {
    requireAdmin(me);
    run('UPDATE users SET is_plus = ? WHERE id = ?', p.value ? 1 : 0, p.userId);
  },

  adminDeleteUser(me, p) {
    requireAdmin(me);
    if (p.userId === me.id) fail('Vous ne pouvez pas supprimer votre propre compte ici.');
    run('DELETE FROM users WHERE id = ?', p.userId);
  },

  adminListServers(me) {
    requireAdmin(me);
    return all(
      `SELECT s.id, s.name, s.icon, s.is_public, s.invite_code, s.created_at, u.pseudo AS owner_pseudo, u.tag AS owner_tag,
         (SELECT COUNT(*) FROM memberships m WHERE m.server_id = s.id) AS members
       FROM servers s JOIN users u ON u.id = s.owner_id ORDER BY s.created_at DESC`,
    );
  },

  adminDeleteServer(me, p) {
    requireAdmin(me);
    run('DELETE FROM servers WHERE id = ?', p.serverId);
  },

  adminListReports(me) {
    requireAdmin(me);
    return all(
      `SELECT r.id, r.reason, r.created_at, r.server_id,
         ru.pseudo AS reporter_pseudo, ru.tag AS reporter_tag,
         tu.id AS target_id, tu.pseudo AS target_pseudo, tu.tag AS target_tag,
         s.name AS server_name
       FROM reports r
       LEFT JOIN users ru ON ru.id = r.reporter_id
       LEFT JOIN users tu ON tu.id = r.target_user_id
       LEFT JOIN servers s ON s.id = r.server_id
       ORDER BY r.created_at DESC LIMIT 200`,
    );
  },

  adminDismissReport(me, p) {
    requireAdmin(me);
    run('DELETE FROM reports WHERE id = ?', p.reportId);
  },
};

export function runAction(name, me, payload) {
  const handler = handlers[name];
  if (!handler) fail('Action inconnue.', 404);
  return handler(me, payload ?? {});
}

// Authentification (hors session).
export function register({ pseudo, password }) {
  const name = text(pseudo, 2, 24, 'Le pseudo doit faire entre 2 et 24 caractères.');
  if (typeof password !== 'string' || password.length < 8 || password.length > 200) {
    fail('Le mot de passe doit faire entre 8 et 200 caractères.');
  }
  return transaction(() => {
    let tag = null;
    for (let i = 0; i < 50 && !tag; i += 1) {
      const candidate = String(1000 + Math.floor(Math.random() * 9000));
      if (!one('SELECT 1 FROM users WHERE pseudo = ? COLLATE NOCASE AND tag = ?', name, candidate)) tag = candidate;
    }
    if (!tag) fail('Pseudo saturé, choisissez-en un autre.', 409);
    const id = newId('u');
    run(
      'INSERT INTO users (id, pseudo, tag, password_hash, banner_type, banner_value, last_activity, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      id, name, tag, hashPassword(password), 'gradient', '0', now(), now(),
    );
    return { token: createSession(id), user: publicUser(one('SELECT * FROM users WHERE id = ?', id)) };
  });
}

export function login({ fullName, password }) {
  const [pseudo = '', tag = ''] = String(fullName ?? '').split('#').map((x) => x.trim());
  // Avec tag : Pseudo#1234. Sans tag : accepté seulement si le pseudo est unique.
  const user = tag
    ? one('SELECT * FROM users WHERE pseudo = ? COLLATE NOCASE AND tag = ?', pseudo, tag)
    : (() => {
        const rows = all('SELECT * FROM users WHERE pseudo = ? COLLATE NOCASE', pseudo);
        return rows.length === 1 ? rows[0] : null;
      })();
  if (!user || typeof password !== 'string' || !verifyPassword(password, user.password_hash)) {
    fail('Pseudo#tag ou mot de passe incorrect.', 401);
  }
  return { token: createSession(user.id), user: publicUser(user) };
}

export function logout(token) {
  deleteSession(token);
}
