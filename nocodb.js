'use strict';

// Shared read-only NocoDB access for server.js (live proxy) and build-artifact.js (snapshot).
// Loads .env on require and only ever issues GET requests.

const fs = require('node:fs');
const path = require('node:path');

loadEnv(path.join(__dirname, '.env'));

const NOCODB_URL = (process.env.NOCODB_URL || 'https://app.nocodb.com').replace(/\/+$/, '');
const BASE_ID = process.env.NOCODB_BASE_ID || 'pbje4jyruzt4csb';
const TOKEN = process.env.NOCODB_TOKEN;

const PAGE_SIZE = 100; // NocoDB v3 caps pageSize at 100
const MAX_PAGES = 500;
const MIN_REQUEST_INTERVAL_MS = 400;
const MAX_RETRIES = 4;

const TABLES = {
  activity: 'mm57w7v7zqqft4c',
  opportunities: 'mx1mt4x1hoi2fkm',
  products: 'mr6oh68zooj8s3t',
  quotes: 'm3dyeoquca1l9b3',
  companies: 'mverd6x9bht6j4s',
  contacts: 'm8p3qzcy661rnh9',
};

class UpstreamError extends Error {
  constructor(status, detail) {
    super(`NocoDB responded with ${status}`);
    this.status = status;
    this.detail = detail;
  }
}

function loadEnv(file) {
  let text;
  try {
    text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  } catch {
    return;
  }
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// NocoDB Cloud allows 5 requests per second per user and answers 429 with a 30s
// Retry-After. All upstream calls therefore run one at a time through a single queue,
// spaced apart, and a 429 pauses the whole queue instead of letting every caller retry.
let lastStartAt = 0;
let cooldownUntil = 0;
let queueTail = Promise.resolve();

function runQueued(task) {
  const run = queueTail.then(async () => {
    const wait = Math.max(cooldownUntil, lastStartAt + MIN_REQUEST_INTERVAL_MS) - Date.now();
    if (wait > 0) await sleep(wait);
    lastStartAt = Date.now();
    return task();
  });
  queueTail = run.catch(() => {});
  return run;
}

async function upstreamGet(url) {
  for (let attempt = 0; ; attempt++) {
    const res = await runQueued(async () => {
      const r = await fetch(url, { headers: { 'xc-token': TOKEN, accept: 'application/json' } });
      return { ok: r.ok, status: r.status, headers: r.headers, text: await r.text() };
    });
    const body = res.text;
    if (res.ok) return JSON.parse(body);

    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= MAX_RETRIES) throw new UpstreamError(res.status, body.slice(0, 300));

    const retryAfter = Number(res.headers.get('retry-after'));
    const delay = retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** attempt;
    if (res.status === 429) {
      cooldownUntil = Math.max(cooldownUntil, Date.now() + delay);
      console.warn(`[nocodb] rate limited, pausing requests for ${Math.ceil(delay / 1000)}s`);
    } else {
      await sleep(delay);
    }
  }
}

// Junction-table fields NocoDB adds to responses; the UI never needs them.
function slimRecord(record) {
  const fields = {};
  for (const [key, value] of Object.entries(record.fields || {})) {
    if (key.startsWith('_nc_m2m_') || key === 'nc_order') continue;
    fields[key] = value;
  }
  return { id: record.id, fields };
}

async function fetchAllRecords(entity) {
  const records = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
      sort: JSON.stringify([{ field: 'Id', direction: 'asc' }]),
    });
    const body = await upstreamGet(`${NOCODB_URL}/api/v3/data/${BASE_ID}/${TABLES[entity]}/records?${params}`);
    for (const record of body.records || []) records.push(slimRecord(record));
    if (body.nestedNext) console.warn(`[nocodb] ${entity}: some linked-record lists on page ${page} are truncated`);
    if (!body.next) break;
  }
  return records;
}

// Turns a fetch/TLS failure into a message the UI or the console can show.
function describeNetworkError(err) {
  if (err instanceof UpstreamError) {
    return err.status === 401 || err.status === 403
      ? 'NocoDB відхилив токен доступу. Перевірте NOCODB_TOKEN у файлі .env.'
      : `NocoDB повернув помилку ${err.status}.`;
  }
  const code = String(err?.cause?.code || '');
  return /CERT|SIGNATURE|SELF_SIGNED/.test(code)
    ? 'Не вдалося перевірити сертифікат NocoDB. Запускайте Node з параметром --use-system-ca (див. npm-скрипти).'
    : 'Не вдалося з’єднатися з NocoDB. Перевірте підключення до інтернету.';
}

module.exports = { TOKEN, TABLES, UpstreamError, fetchAllRecords, describeNetworkError };
