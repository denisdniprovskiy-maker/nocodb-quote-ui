'use strict';

// Read-only local server for the Quote Order Management UI.
// Serves ./public and proxies GET /api/records/:entity to NocoDB. The NocoDB token
// never leaves this process, and every non-GET request is rejected.

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { TOKEN, TABLES, UpstreamError, fetchAllRecords, getRecord, describeNetworkError } = require('./nocodb');

const PUBLIC_DIR = path.join(__dirname, 'public');
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT) || 5180;
const CACHE_TTL_MS = 5 * 60 * 1000;

// Payment confirmations arrive at webhook.site as GET requests with the query parameters
// orderNumber (= Quote_ID), amount, date and paymentConfirmed ("true"/"false").
// Anyone with the token can read those requests, so it lives in .env, not in the code.
const PAYMENT_WEBHOOK_TOKEN = process.env.PAYMENT_WEBHOOK_TOKEN;
const PAYMENTS_CACHE_MS = 10 * 1000;
const PAYMENTS_MAX_PAGES = 20;

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

async function fetchPaymentRequests() {
  const all = [];
  for (let page = 1; page <= PAYMENTS_MAX_PAGES; page++) {
    const url = `https://webhook.site/token/${encodeURIComponent(PAYMENT_WEBHOOK_TOKEN)}/requests?sorting=newest&per_page=100&page=${page}`;
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`webhook.site responded with ${res.status}`);
    const body = await res.json();
    const data = body.data || [];
    all.push(...data);
    if (body.is_last_page !== false || !data.length) break;
  }
  return all;
}

let paymentsCache = null; // { at, promise }

function getPaymentRequests() {
  if (paymentsCache && Date.now() - paymentsCache.at < PAYMENTS_CACHE_MS) return paymentsCache.promise;
  const entry = { at: Date.now(), promise: fetchPaymentRequests() };
  entry.promise.catch(() => {
    if (paymentsCache === entry) paymentsCache = null;
  });
  paymentsCache = entry;
  return entry.promise;
}

// webhook.site reports created_at as "YYYY-MM-DD HH:mm:ss" in UTC.
function webhookTimeToIso(value) {
  const d = new Date(`${String(value).replace(' ', 'T')}Z`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

async function findPayments(orderNumber) {
  const wanted = orderNumber.trim().toLowerCase();
  const requests = await getPaymentRequests();
  return requests
    .filter((r) => String(r.query?.orderNumber ?? '').trim().toLowerCase() === wanted)
    .map((r) => ({
      receivedAt: webhookTimeToIso(r.created_at),
      amount: r.query.amount ?? null,
      date: r.query.date ?? null,
      confirmed: String(r.query.paymentConfirmed ?? '').trim().toLowerCase() === 'true',
    }));
}

const isWaitingStatus = (v) => {
  const s = String(v ?? '').trim().toLowerCase();
  return s === '' || s === 'waiting for payment';
};
const isPaidStatus = (v) => String(v ?? '').trim().toLowerCase() === 'paid';

// Read-only payment check: the server reads the quote from NocoDB and looks for a
// confirmed payment on webhook.site. Nothing is written anywhere.
async function checkPayment(id) {
  const quote = await getRecord('quotes', id);
  const { Quote_ID: orderNumber, Amount: amount, Payment_Status: status } = quote.fields;
  if (isPaidStatus(status)) return { outcome: 'already-paid', status: 'Paid' };
  if (!isWaitingStatus(status)) return { outcome: 'not-waiting', status };
  if (!orderNumber) return { outcome: 'not-found', matches: [] };

  paymentsCache = null; // always read the latest confirmations for an explicit check
  const matches = await findPayments(String(orderNumber));
  const confirmed = matches.filter((m) => m.confirmed);
  if (!confirmed.length) return { outcome: 'not-found', matches };

  const sameAmount = (m) => {
    const paid = Number(String(m.amount ?? '').replace(',', '.'));
    return typeof amount === 'number' && Number.isFinite(paid) && Math.abs(paid - amount) < 0.005;
  };
  const payment = confirmed.find(sameAmount);
  if (!payment) return { outcome: 'amount-mismatch', matches, amount };
  return { outcome: 'found', payment, matches };
}

async function handleCheckPayment(res, rawId) {
  if (!TOKEN) return sendJson(res, 500, { error: 'NOCODB_TOKEN не задано у файлі .env' });
  if (!PAYMENT_WEBHOOK_TOKEN) {
    return sendJson(res, 503, { error: 'Перевірку оплат не налаштовано: додайте PAYMENT_WEBHOOK_TOKEN у файл .env і перезапустіть сервер.' });
  }
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return sendJson(res, 400, { error: 'Некоректний номер замовлення' });
  try {
    return sendJson(res, 200, { id, checkedAt: new Date().toISOString(), ...(await checkPayment(id)) });
  } catch (err) {
    if (err instanceof UpstreamError) {
      console.error(`[payments] NocoDB ${err.message}: ${err.detail}`);
      return sendJson(res, 502, { error: err.status === 404 ? 'Замовлення не знайдено в NocoDB.' : describeNetworkError(err) });
    }
    console.error('[payments]', err.message || err);
    return sendJson(res, 502, { error: 'Не вдалося перевірити оплату (webhook.site або NocoDB недоступні). Спробуйте ще раз.' });
  }
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
  const url = new URL(req.url, 'http://localhost');

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return sendJson(res, 405, { error: 'Лише перегляд: дозволені тільки GET-запити.' });
  }

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

    const paymentCheck = url.pathname.match(/^\/api\/quotes\/([^/]+)\/payment$/);
    if (paymentCheck) return handleCheckPayment(res, paymentCheck[1]);

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
