// Serveur HTTP : API JSON (/api/*) + fichiers statiques du build (dist/) en production.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { userFromToken } from './auth.js';
import { buildSnapshot } from './sync.js';
import { HttpError, login, logout, register, runAction } from './actions.js';
import { db } from './db.js';
import { ensureAdmin } from './seed.js';

ensureAdmin();

const PORT = Number(process.env.PORT || 3001);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(root, 'dist');
const MAX_BODY = 1024 * 1024;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
};

function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

function readJson(req) {
  return new Promise((resolveBody, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new HttpError(413, 'Requête trop volumineuse.'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!chunks.length) return resolveBody({});
      try {
        resolveBody(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new HttpError(400, 'JSON invalide.'));
      }
    });
    req.on('error', reject);
  });
}

const bearer = (req) => (req.headers.authorization || '').replace(/^Bearer\s+/i, '') || null;

function requireUser(req) {
  const user = userFromToken(bearer(req));
  if (!user) throw new HttpError(401, 'Session expirée, reconnectez-vous.');
  return user;
}

async function handleApi(req, res, path) {
  if (req.method === 'POST' && path === '/api/auth/register') {
    return send(res, 201, register(await readJson(req)));
  }
  if (req.method === 'POST' && path === '/api/auth/login') {
    return send(res, 200, login(await readJson(req)));
  }
  if (req.method === 'POST' && path === '/api/auth/logout') {
    logout(bearer(req));
    return send(res, 200, { ok: true });
  }
  if (req.method === 'GET' && path === '/api/sync') {
    const me = requireUser(req);
    // Le heartbeat de présence : chaque synchronisation (toutes les 2 s) rafraîchit last_activity.
    db.prepare('UPDATE users SET last_activity = ? WHERE id = ?').run(Date.now(), me.id);
    const fresh = db.prepare('SELECT * FROM users WHERE id = ?').get(me.id);
    return send(res, 200, buildSnapshot(fresh));
  }
  const match = path.match(/^\/api\/actions\/([A-Za-z]+)$/);
  if (req.method === 'POST' && match) {
    const me = requireUser(req);
    const result = runAction(match[1], me, await readJson(req));
    return send(res, 200, { ok: true, result: result ?? null });
  }
  throw new HttpError(404, 'Route inconnue.');
}

async function serveStatic(res, path) {
  if (!(await stat(DIST).catch(() => null))) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Build absent : lancez `npm run build` ou utilisez le serveur de dev Vite.');
  }
  const safe = normalize(decodeURIComponent(path)).replace(/^(\.\.[/\\])+/, '');
  let file = join(DIST, safe === '/' || safe === '.' ? 'index.html' : safe);
  if (!file.startsWith(DIST)) return send(res, 403, { error: 'Accès refusé.' });
  if (!(await stat(file).catch(() => null))?.isFile()) file = join(DIST, 'index.html'); // routes SPA
  const body = await readFile(file);
  res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
  res.end(body);
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url.pathname);
    } else {
      await serveStatic(res, url.pathname);
    }
  } catch (err) {
    if (err instanceof HttpError) {
      if (!res.headersSent) send(res, err.status, { error: err.message });
    } else {
      console.error(err);
      if (!res.headersSent) send(res, 500, { error: 'Erreur interne du serveur.' });
    }
  }
}).listen(PORT, () => console.log(`Hevenly API sur http://localhost:${PORT}`));
