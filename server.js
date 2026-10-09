'use strict';

// Read-only local server for the Quote Order Management UI.
// Serves ./public and proxies GET /api/records/:entity to NocoDB. The NocoDB token
// never leaves this process, and every non-GET request is rejected.

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { TOKEN, TABLES, UpstreamError, fetchAllRecords, describeNetworkError } = require('./nocodb');

const PUBLIC_DIR = path.join(__dirname, 'public');
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT) || 5180;
const CACHE_TTL_MS = 5 * 60 * 1000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'",
};

const cache = new Map(); // entity -> { at, pending, promise }
const lastGood = new Map(); // entity -> last successful payload, served if a refresh fails

function getRecords(entity, refresh) {
  const hit = cache.get(entity);
  if (hit && (hit.pending || (!refresh && Date.now() - hit.at < CACHE_TTL_MS))) return hit.promise;

  const entry = { at: Date.now(), pending: true };
  entry.promise = fetchAllRecords(entity).then(
    (records) => {
      entry.pending = false;
      entry.at = Date.now();
      const payload = { entity, records, fetchedAt: new Date(entry.at).toISOString() };
      lastGood.set(entity, payload);
      return payload;
    },
    (err) => {
      if (cache.get(entity) === entry) cache.delete(entity);
      const previous = lastGood.get(entity);
      if (previous) {
        console.warn(`[nocodb] refresh of ${entity} failed, serving data from ${previous.fetchedAt}`);
        return { ...previous, stale: true };
      }
      throw err;
    },
  );
  cache.set(entity, entry);
  return entry.promise;
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    ...SECURITY_HEADERS,
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

function serveStatic(pathname, res) {
  let rel;
  try {
    rel = decodeURIComponent(pathname);
  } catch {
    return sendJson(res, 400, { error: 'Некоректна адреса' });
  }
  if (rel === '/') rel = '/index.html';

  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return sendJson(res, 403, { error: 'Доступ заборонено' });

  fs.readFile(file, (err, buf) => {
    if (err) return sendJson(res, 404, { error: 'Не знайдено' });
    res.writeHead(200, {
      ...SECURITY_HEADERS,
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(buf);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return sendJson(res, 405, { error: 'Лише перегляд: дозволені тільки GET-запити.' });
  }

  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname === '/api/health') {
      return sendJson(res, 200, { ok: true, configured: Boolean(TOKEN), entities: Object.keys(TABLES) });
    }

    const match = url.pathname.match(/^\/api\/records\/([a-z]+)$/);
    if (match) {
      const entity = match[1];
      if (!Object.hasOwn(TABLES, entity)) return sendJson(res, 404, { error: 'Невідомий розділ' });
      if (!TOKEN) return sendJson(res, 500, { error: 'NOCODB_TOKEN не задано у файлі .env' });
      return sendJson(res, 200, await getRecords(entity, url.searchParams.has('refresh')));
    }

    if (url.pathname.startsWith('/api/')) return sendJson(res, 404, { error: 'Не знайдено' });
    return serveStatic(url.pathname, res);
  } catch (err) {
    if (err instanceof UpstreamError) console.error(`[nocodb] ${err.message}: ${err.detail}`);
    else console.error(err);
    return sendJson(res, 502, { error: describeNetworkError(err) });
  }
});

server.on('error', (err) => {
  if (err.code !== 'EADDRINUSE') throw err;
  console.error(
    `Port ${PORT} is already in use: the UI is probably already running at http://${HOST}:${PORT}.\n` +
      'Stop the other copy (Ctrl+C in its terminal) or start this one on another port, e.g. PORT=5181 in .env.',
  );
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`Quote Order Management UI (read-only): http://${HOST}:${PORT}`);
  if (!TOKEN) console.warn('Warning: NOCODB_TOKEN is not set in .env — data requests will fail.');
});
