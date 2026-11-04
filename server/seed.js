// Compte administrateur de base (lvnah#0000), créé au démarrage s'il n'existe pas.
// Le mot de passe n'est jamais écrit dans le code : il est lu dans la variable ADMIN_PASSWORD.
import { db } from './db.js';
import { hashPassword } from './auth.js';
import { randomBytes } from 'node:crypto';

export const ADMIN_PSEUDO = 'lvnah';
export const ADMIN_TAG = '0000';

export function ensureAdmin() {
  const password = process.env.ADMIN_PASSWORD || '';
  const existing = db
    .prepare('SELECT id FROM users WHERE pseudo = ? COLLATE NOCASE AND tag = ?')
    .get(ADMIN_PSEUDO, ADMIN_TAG);
  if (existing) {
    db.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').run(existing.id);
    return;
  }
  if (!password || password.length < 8) {
    console.warn(`Compte administrateur ${ADMIN_PSEUDO}#${ADMIN_TAG} non créé : définissez ADMIN_PASSWORD (8 caractères minimum).`);
    return;
  }
  const now = Date.now();
  db.prepare(
    `INSERT INTO users (id, pseudo, tag, password_hash, is_plus, is_admin, banner_type, banner_value, last_activity, created_at)
     VALUES (?, ?, ?, ?, 1, 1, 'gradient', '0', 0, ?)`,
  ).run(`u_${randomBytes(8).toString('hex')}`, ADMIN_PSEUDO, ADMIN_TAG, hashPassword(password), now);
  console.log(`Compte administrateur créé : ${ADMIN_PSEUDO}#${ADMIN_TAG}`);
}
