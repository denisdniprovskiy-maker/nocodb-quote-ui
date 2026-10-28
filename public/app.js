'use strict';

/* =============================================================================
   Облік замовлень — інтерфейс лише для перегляду.
   Дані надходять з локального сервера (server.js), який читає NocoDB.
   ============================================================================= */

const PAGE_SIZE = 25;
const RELATED_LIMIT = 10;
const ENTITY_ORDER = ['quotes', 'opportunities', 'products', 'companies', 'contacts', 'activity'];

/* ---------- Іконки ---------- */

const ICON_PATHS = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  quote: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  box: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  activity: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  mail: '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  back: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
  external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
  arrow: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
};

const icon = (name) =>
  `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name] || ''}</svg>`;

/* ---------- Словники ---------- */

const STAGE_LABELS = {
  Prospecting: 'Пошук клієнта',
  Qualification: 'Кваліфікація',
  'Needs Analysis': 'Аналіз потреб',
  Proposal: 'Пропозиція',
  'Proposal/Price Quote': 'Цінова пропозиція',
  Negotiation: 'Переговори',
  'Negotiation/Review': 'Переговори',
  'Closed Won': 'Успішно закритий',
  'Closed Lost': 'Втрачений',
};
const ACTIVITY_TYPE_LABELS = { Call: 'Дзвінок', Meeting: 'Зустріч', Email: 'Лист', Task: 'Завдання', Note: 'Нотатка' };
const ACTIVITY_TYPE_ICONS = { Call: 'phone', Meeting: 'calendar', Email: 'mail' };
const CONTACT_STATUS_LABELS = { Active: 'Активний', Lead: 'Потенційний клієнт', Customer: 'Клієнт', Inactive: 'Неактивний' };

// Quotes.Payment_Status — текстове поле, тому порівнюємо без урахування регістру,
// а невідоме значення показуємо як є (нейтральним кольором).
const PAYMENT_STATUSES = {
  'waiting for payment': { key: 'waiting', label: 'Очікує оплати', tone: 'warning' },
  paid: { key: 'paid', label: 'Оплачено', tone: 'good' },
  canceled: { key: 'canceled', label: 'Скасовано', tone: 'neutral' },
  cancelled: { key: 'canceled', label: 'Скасовано', tone: 'neutral' },
};

const MONTHS_SHORT = ['січ.', 'лют.', 'бер.', 'квіт.', 'трав.', 'черв.', 'лип.', 'серп.', 'вер.', 'жовт.', 'лист.', 'груд.'];
const MONTHS_LONG = ['Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень', 'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'];

/* ---------- Форматування ---------- */

const collator = new Intl.Collator('uk', { numeric: true, sensitivity: 'base' });
const fmt = {
  number: new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 2 }),
  money: new Intl.NumberFormat('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  compact: new Intl.NumberFormat('uk-UA', { notation: 'compact', maximumFractionDigits: 1 }),
  date: new Intl.DateTimeFormat('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' }),
  dateTime: new Intl.DateTimeFormat('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
  time: new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit' }),
};

const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const isBlank = (v) =>
  v === null || v === undefined || (typeof v === 'string' && v.trim() === '') || (typeof v === 'number' && !Number.isFinite(v));
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const tr = (map, v) => (isBlank(v) ? '' : map[v] || String(v));

const DASH = '<span class="muted">—</span>';
const text = (v) => (isBlank(v) ? DASH : esc(v));
const money = (v) => (isNum(v) ? fmt.money.format(v) : DASH);
const date = (d) => (d ? fmt.date.format(d) : DASH);
const dateTime = (d) => (d ? fmt.dateTime.format(d) : DASH);
const compactNumber = (v) => (Math.abs(v) >= 10000 ? fmt.compact.format(v) : fmt.number.format(v));
const monthShort = (d) => `${MONTHS_SHORT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
const monthLong = (d) => `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
const sumOf = (rows, get) => rows.reduce((acc, r) => (isNum(get(r)) ? acc + get(r) : acc), 0);

function plural(n, one, few, many) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
const ordersWord = (n) => plural(n, 'замовлення', 'замовлення', 'замовлень');
const recordsWord = (n) => plural(n, 'запис', 'записи', 'записів');

/* ---------- Розбір значень ---------- */

function parseIsoDate(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(v ?? ''));
  return m ? new Date(+m[1], m[2] - 1, +m[3]) : null;
}

// Activity.Date/Time зберігається як текст у форматі M/D/YYYY H:mm:ss.
function parseUsDateTime(v) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(String(v ?? '').trim());
  if (!m) return null;
  return new Date(+m[3], m[1] - 1, +m[2], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
}

function parseTimestamp(v) {
  if (isBlank(v)) return null;
  const d = new Date(String(v).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseNumber(v) {
  if (isNum(v)) return v;
  const n = parseFloat(String(v ?? '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

// Текстові посилання (Contacts.Company, Opportunities.Company тощо) містять коди записів.
// Частина кодів — дробові числа, які в одних таблицях збережені повністю, а в інших
// округлені до 10 значущих цифр, тому порівнюємо їх у нормалізованому вигляді.
function normCode(v) {
  if (isBlank(v)) return '';
  const s = String(v).trim();
  if (/^0\.\d+$/.test(s)) return Number(s).toPrecision(10);
  return s.toLowerCase();
}

/* ---------- Модель даних ---------- */

const db = { loaded: false, fetchedAt: null, byId: {} };

const NAMES = {
  quotes: (q) => `Замовлення ${q.Quote_ID || '#' + q.id}`,
  opportunities: (o) => `Лід ${o.Opportunity_ID || '#' + o.id}`,
  products: (p) => p.Name || p.Product_ID || `Продукт #${p.id}`,
  companies: (c) => c.Name || c.Company_ID || `Компанія #${c.id}`,
  contacts: (c) =>
    [c['First Name'], c['Last Name']].filter((v) => !isBlank(v)).join(' ') || c.Contact_ID || `Контакт #${c.id}`,
  activity: (a) =>
    `${tr(ACTIVITY_TYPE_LABELS, a.Type) || 'Активність'}${a.$date ? ' · ' + fmt.dateTime.format(a.$date) : ''}`,
};
const nameOf = (key, rec) => (rec ? NAMES[key](rec) : '');

function buildModel(raw) {
  for (const key of ENTITY_ORDER) {
    db[key] = raw[key].records.map((r) => ({ id: r.id, ...r.fields }));
    db.byId[key] = new Map(db[key].map((r) => [r.id, r]));
  }

  const linked = (key, link) =>
    link && typeof link === 'object' && !Array.isArray(link) ? db.byId[key].get(link.id) || null : null;
  // Зв'язок «до багатьох» приходить масивом; одиночний об'єкт — формат поля до переходу на many-to-many.
  const linkedMany = (key, links) =>
    [...new Set((Array.isArray(links) ? links : [links]).map((l) => linked(key, l)).filter(Boolean))];
  const indexByCode = (list, field) => {
    const map = new Map();
    for (const r of list) {
      const code = normCode(r[field]);
      if (code && !map.has(code)) map.set(code, r);
    }
    return map;
  };

  for (const c of db.companies) Object.assign(c, { $quotes: [], $activities: [], $contacts: [], $opportunities: [] });
  for (const c of db.contacts) Object.assign(c, { $quotes: [], $activities: [], $opportunities: [] });
  for (const p of db.products) Object.assign(p, { $quotes: [], $opportunities: [], $price: parseNumber(p.Price) });
  for (const o of db.opportunities) o.$quotes = [];

  // Справжні зв'язки (LinkToAnotherRecord) — з боку замовлень та активностей.
  for (const q of db.quotes) {
    q.$date = parseIsoDate(q['Date/Time']);
    q.$company = linked('companies', q.Company);
    q.$contact = linked('contacts', q.Contact);
    q.$products = linkedMany('products', q.Products ?? q.Product);
    q.$opportunity = linked('opportunities', q.Opportunity);
    q.$company?.$quotes.push(q);
    q.$contact?.$quotes.push(q);
    for (const p of q.$products) p.$quotes.push(q);
    q.$opportunity?.$quotes.push(q);
  }
  for (const a of db.activity) {
    a.$date = parseUsDateTime(a['Date/Time']);
    a.$company = linked('companies', a.Company);
    a.$contact = linked('contacts', a.Contact);
    a.$company?.$activities.push(a);
    a.$contact?.$activities.push(a);
  }

  // Поля, які можуть бути як зв'язком, так і текстовим кодом запису
  // (частину з них у NocoDB поступово перетворюють на справжні зв'язки).
  const byCode = {
    companies: indexByCode(db.companies, 'Company_ID'),
    contacts: indexByCode(db.contacts, 'Contact_ID'),
    products: indexByCode(db.products, 'Product_ID'),
  };
  const resolve = (key, value) =>
    value && typeof value === 'object' ? linked(key, value) : byCode[key].get(normCode(value)) || null;

  for (const c of db.contacts) {
    c.$company = resolve('companies', c.Company);
    c.$company?.$contacts.push(c);
  }
  for (const o of db.opportunities) {
    o.$company = resolve('companies', o.Company);
    o.$contact = resolve('contacts', o.Contact);
    o.$product = resolve('products', o.Product);
    o.$company?.$opportunities.push(o);
    o.$contact?.$opportunities.push(o);
    o.$product?.$opportunities.push(o);
  }

  for (const key of ENTITY_ORDER) {
    for (const r of db[key]) {
      r.$search = VIEWS[key].search(r).filter((v) => !isBlank(v)).join(' \u0001 ').toLowerCase();
    }
  }
}

/* ---------- Будівельні блоки розмітки ---------- */

// Текст посилання, яке не вдалося зіставити із записом: текстовий код або відображуване поле зв'язку.
function refText(v) {
  if (isBlank(v)) return '';
  if (typeof v !== 'object') return String(v);
  const shown = Object.values(v.fields || {}).find((x) => !isBlank(x));
  return shown !== undefined ? String(shown) : v.id !== undefined ? `#${v.id}` : '';
}

const refLabel = (key, rec, raw) => (rec ? NAMES[key](rec) : refText(raw));

function ref(key, rec, raw) {
  if (rec) return `<a class="ref" href="#/${key}/${rec.id}">${esc(NAMES[key](rec))}</a>`;
  const fallback = refText(raw);
  if (!isBlank(fallback)) {
    return `<span class="unresolved" tabindex="0" data-tip="Запис із кодом «${esc(fallback)}» не знайдено">${esc(fallback)}</span>`;
  }
  return DASH;
}

const refList = (key, recs) => (recs.length ? recs.map((r) => ref(key, r)).join(', ') : DASH);

const primaryLink = (key, rec, label) =>
  `<a class="row-link" href="#/${key}/${rec.id}">${esc(label ?? NAMES[key](rec))}</a>`;
const pill = (v) => (isBlank(v) ? DASH : `<span class="pill">${esc(v)}</span>`);

function paymentInfo(v) {
  if (isBlank(v)) return null;
  const raw = String(v).trim();
  return PAYMENT_STATUSES[raw.toLowerCase()] || { key: 'other', label: raw, tone: 'neutral' };
}
const paymentLabel = (v) => paymentInfo(v)?.label || '';
const isWaitingForPayment = (q) => paymentInfo(q.Payment_Status)?.key === 'waiting';
function paymentPill(v) {
  const info = paymentInfo(v);
  if (!info) return DASH;
  return `<span class="status status-${info.tone}"><span class="status-dot" aria-hidden="true"></span>${esc(info.label)}</span>`;
}

/* ---------- Перевірка оплати (підтвердження з вебхука) ---------- */

// Результати перевірок за id замовлення: { state: 'loading' | 'done' | 'error', result?, message? }.
const paymentChecks = new Map();

// Кнопка доступна лише в живій версії (артефакт не може звертатися до зовнішніх сайтів)
// і лише для замовлень, що очікують оплати. Перевірка лише читає дані: статус у NocoDB
// не змінюється.
const canCheckPayment = (q) => !SNAPSHOT && !isBlank(q.Quote_ID) && (isBlank(q.Payment_Status) || isWaitingForPayment(q));

function paymentOutcome(check) {
  if (check.state === 'error') return { tone: 'neutral', icon: '?', label: 'Не вдалося перевірити', detail: check.message };
  const r = check.result;
  switch (r.outcome) {
    case 'found': {
      const when = r.payment.receivedAt ? fmt.dateTime.format(new Date(r.payment.receivedAt)) : '';
      return {
        tone: 'good', icon: '✓', label: 'Оплата замовлення знайдена!',
        detail: `Надійшло ${when}, сума ${fmt.money.format(parseNumber(r.payment.amount))}. Статус у NocoDB не змінено.`,
      };
    }
    case 'already-paid':
      return { tone: 'neutral', icon: '?', label: 'Замовлення вже оплачене', detail: 'У NocoDB у замовлення вже статус «Оплачено». Оновіть дані.' };
    case 'not-found':
      return {
        tone: 'critical', icon: '✕', label: 'На жаль, оплата не знайдена',
        detail: r.matches?.length ? 'Є записи про це замовлення, але без підтвердження оплати.' : 'Підтвердження оплати для цього замовлення не надходило.',
      };
    case 'amount-mismatch': {
      const latest = r.matches.find((m) => m.confirmed);
      const got = parseNumber(latest?.amount);
      return {
        tone: 'warning', icon: '!', label: 'Оплату знайдено, але сума не збігається',
        detail: `Отримано ${isNum(got) ? fmt.money.format(got) : '—'}, у замовленні ${isNum(r.amount) ? fmt.money.format(r.amount) : '—'}. Статус не змінено.`,
      };
    }
    case 'not-waiting':
      return { tone: 'neutral', icon: '?', label: 'Статус змінився', detail: `У NocoDB зараз статус «${paymentLabel(r.status)}». Оновіть дані.` };
    default:
      return null;
  }
}

function paymentCheckControl(q) {
  if (!canCheckPayment(q)) return '';
  const check = paymentChecks.get(q.id);
  if (check?.state === 'loading') return '<button type="button" class="check-btn" disabled>Перевіряю…</button>';
  const button = `<button type="button" class="check-btn" data-check-payment="${q.id}">${check ? 'Перевірити ще раз' : 'Перевірити оплату'}</button>`;
  const v = check && paymentOutcome(check);
  if (!v) return button;
  return `<span class="status status-${v.tone}" tabindex="0" data-tip="${esc(v.detail)}"><span class="status-icon" aria-hidden="true">${v.icon}</span>${esc(v.label)}</span>${button}`;
}

const paymentCell = (q) => {
  const control = paymentCheckControl(q);
  return control ? `<span class="payment-cell">${paymentPill(q.Payment_Status)}${control}</span>` : paymentPill(q.Payment_Status);
};

// Таблиця знайдених записів вебхука на сторінці замовлення (після перевірки).
function paymentChecksSection(q) {
  const check = paymentChecks.get(q.id);
  if (!check || check.state !== 'done' || !Array.isArray(check.result.matches)) return '';
  const rows = check.result.matches;
  const body = rows.length
    ? `<div class="table-wrap"><table class="data-table"><thead><tr>
        <th scope="col">Надійшло</th><th scope="col">Дата оплати</th><th scope="col" class="num">Сума</th><th scope="col">Підтверджено</th>
      </tr></thead><tbody>${rows
        .map((m) => `<tr>
          <td class="nowrap">${m.receivedAt ? dateTime(new Date(m.receivedAt)) : DASH}</td>
          <td class="nowrap">${date(parseIsoDate(m.date))}</td>
          <td class="num">${money(parseNumber(m.amount))}</td>
          <td>${m.confirmed ? '<span class="status status-good"><span class="status-icon" aria-hidden="true">✓</span>Так</span>' : '<span class="status status-critical"><span class="status-icon" aria-hidden="true">✕</span>Ні</span>'}</td>
        </tr>`)
        .join('')}</tbody></table></div>`
    : `<div class="card-body">${emptyInline('Записів про оплату цього замовлення у вебхуку немає.')}</div>`;
  return `<section class="card related">
    <header class="card-head"><h2>Надходження оплат</h2><span class="count-badge">${fmt.number.format(rows.length)}</span>
      <span class="card-note">перевірено ${esc(fmt.dateTime.format(new Date(check.result.checkedAt)))}</span></header>
    ${body}
  </section>`;
}

async function runPaymentCheck(id) {
  const q = db.byId.quotes.get(id);
  if (!q || paymentChecks.get(id)?.state === 'loading') return;
  paymentChecks.set(id, { state: 'loading' });
  rerenderInPlace();
  try {
    let res;
    try {
      res = await fetch(`/api/quotes/${id}/payment`, { headers: { accept: 'application/json' } });
    } catch {
      throw new Error('Немає зв’язку з локальним сервером. Перевірте, чи запущено server.js.');
    }
    const body = await res.json().catch(() => null);
    if (!res.ok || !body) throw new Error(body?.error || `Сервер повернув помилку ${res.status}.`);
    paymentChecks.set(id, { state: 'done', result: body });
  } catch (err) {
    paymentChecks.set(id, { state: 'error', message: err.message });
  }
  rerenderInPlace();
}

// Перемальовує поточну сторінку без прокрутки вгору (список — лише таблицю, щоб не втратити фокус).
function rerenderInPlace() {
  hideTip();
  if (route.name === 'list') return renderListRegion(route.key);
  const y = window.scrollY;
  render();
  window.scrollTo(0, y);
}
const countCell = (n) => (n ? fmt.number.format(n) : '<span class="muted">0</span>');
const clampText = (v) => (isBlank(v) ? DASH : `<span class="clamp">${esc(v)}</span>`);
const emptyInline = (msg) => `<p class="empty-inline">${esc(msg)}</p>`;

function webLink(url) {
  if (isBlank(url)) return DASH;
  const raw = String(url).trim();
  const href = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const u = new URL(href);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return esc(raw);
    const label = raw.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
    return `<a class="ext" href="${esc(u.href)}" target="_blank" rel="noopener noreferrer">${esc(label)}${icon('external')}</a>`;
  } catch {
    return esc(raw);
  }
}

function mailLink(v) {
  if (isBlank(v)) return DASH;
  const s = String(v).trim();
  return /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(s) ? `<a href="mailto:${esc(s)}">${esc(s)}</a>` : esc(s);
}

function phoneLink(v) {
  if (isBlank(v)) return DASH;
  const s = String(v).trim();
  const dial = s.replace(/[^\d+]/g, '');
  return dial.length >= 5 ? `<a class="nowrap" href="tel:${esc(dial)}">${esc(s)}</a>` : esc(s);
}

/* ---------- Опис розділів ---------- */

const col = (key, label, value, opts = {}) => ({ key, label, value, ...opts });

const VIEWS = {
  quotes: {
    title: 'Замовлення',
    icon: 'quote',
    description: 'Усі замовлення з прив’язкою до компаній, контактів, продуктів та лідів.',
    columns: [
      col('number', 'Номер', (q) => q.Quote_ID, { render: (q) => primaryLink('quotes', q, q.Quote_ID || '#' + q.id), mono: true, nowrap: true }),
      col('date', 'Дата', (q) => q.$date, { render: (q) => date(q.$date), nowrap: true }),
      col('company', 'Компанія', (q) => nameOf('companies', q.$company), { render: (q) => ref('companies', q.$company) }),
      col('contact', 'Контакт', (q) => nameOf('contacts', q.$contact), { render: (q) => ref('contacts', q.$contact) }),
      col('product', 'Продукти', (q) => q.$products.map(NAMES.products).join(', '), { render: (q) => refList('products', q.$products) }),
      col('amount', 'Сума', (q) => q.Amount, { render: (q) => money(q.Amount), num: true }),
      col('payment', 'Оплата', (q) => paymentLabel(q.Payment_Status), { render: paymentCell }),
      col('author', 'Автор', (q) => q.Author, { muted: true }),
    ],
    defaultSort: { key: 'date', dir: 'desc' },
    filters: [
      { key: 'payment', label: 'Оплата', value: (q) => paymentLabel(q.Payment_Status) },
      { key: 'author', label: 'Автор', value: (q) => q.Author },
      { key: 'product', label: 'Продукт', value: (q) => q.$products.map(NAMES.products) },
    ],
    search: (q) => [
      q.Quote_ID, q.Notes, q.Author, q.Payment_Status, paymentLabel(q.Payment_Status),
      nameOf('companies', q.$company), nameOf('contacts', q.$contact), ...q.$products.map(NAMES.products),
      q.$opportunity?.Opportunity_ID, q.$opportunity?.Description,
    ],
    summary: (rows) => {
      const waiting = rows.filter(isWaitingForPayment);
      const total = `Сума: ${money(sumOf(rows, (q) => q.Amount))}`;
      return waiting.length
        ? `${total} · очікують оплати: ${fmt.number.format(waiting.length)} на ${money(sumOf(waiting, (q) => q.Amount))}`
        : total;
    },
    secondary: (q) => [
      q.$date && fmt.date.format(q.$date), nameOf('companies', q.$company),
      isNum(q.Amount) && fmt.money.format(q.Amount), paymentLabel(q.Payment_Status),
    ],
  },

  opportunities: {
    title: 'Ліди',
    icon: 'target',
    description: 'Потенційні продажі клієнтам: етап, сума та відповідальний менеджер.',
    columns: [
      col('number', 'Номер', (o) => o.Opportunity_ID, { render: (o) => primaryLink('opportunities', o, o.Opportunity_ID || '#' + o.id), mono: true }),
      col('description', 'Опис', (o) => o.Description, { render: (o) => clampText(o.Description), wide: true }),
      col('company', 'Компанія', (o) => refLabel('companies', o.$company, o.Company), { render: (o) => ref('companies', o.$company, o.Company) }),
      col('stage', 'Етап', (o) => tr(STAGE_LABELS, o.Stage), { render: (o) => pill(tr(STAGE_LABELS, o.Stage)) }),
      col('amount', 'Сума', (o) => o.Amount, { render: (o) => money(o.Amount), num: true }),
      col('owner', 'Відповідальний', (o) => o.Owner, { muted: true }),
      col('quotes', 'Замовлення', (o) => o.$quotes.length, { render: (o) => countCell(o.$quotes.length), num: true }),
    ],
    defaultSort: { key: 'amount', dir: 'desc' },
    filters: [
      { key: 'stage', label: 'Етап', value: (o) => tr(STAGE_LABELS, o.Stage) },
      { key: 'owner', label: 'Відповідальний', value: (o) => o.Owner },
    ],
    search: (o) => [
      o.Opportunity_ID, o.Description, refText(o.Company), refText(o.Contact), refText(o.Product), o.Owner, tr(STAGE_LABELS, o.Stage),
      nameOf('companies', o.$company), nameOf('contacts', o.$contact), nameOf('products', o.$product),
    ],
    summary: (rows) => `Сума: ${money(sumOf(rows, (o) => o.Amount))}`,
    secondary: (o) => [o.Description, refLabel('companies', o.$company, o.Company), isNum(o.Amount) && fmt.money.format(o.Amount)],
  },

  products: {
    title: 'Продукти',
    icon: 'box',
    description: 'Каталог продуктів із цінами та кількістю замовлень.',
    columns: [
      col('name', 'Назва', (p) => NAMES.products(p), { render: (p) => primaryLink('products', p) }),
      col('sku', 'Артикул', (p) => p['Customer ID'], { mono: true }),
      col('category', 'Категорія', (p) => p.Category, { render: (p) => pill(p.Category) }),
      col('price', 'Ціна', (p) => p.$price, { render: (p) => money(p.$price), num: true }),
      col('quotes', 'Замовлення', (p) => p.$quotes.length, { render: (p) => countCell(p.$quotes.length), num: true }),
      col('code', 'Код продукту', (p) => p.Product_ID, { mono: true, muted: true }),
    ],
    defaultSort: { key: 'name', dir: 'asc' },
    filters: [{ key: 'category', label: 'Категорія', value: (p) => p.Category }],
    search: (p) => [p.Name, p.Product_ID, p['Customer ID'], p.Description, p.Category],
    secondary: (p) => [p.Category, isNum(p.$price) && fmt.money.format(p.$price), p['Customer ID']],
  },

  companies: {
    title: 'Компанії',
    icon: 'building',
    description: 'Клієнти та партнери: контакти, замовлення та історія взаємодій.',
    columns: [
      col('name', 'Назва', (c) => NAMES.companies(c), { render: (c) => primaryLink('companies', c) }),
      col('url', 'Сайт', (c) => c.URL, { render: (c) => webLink(c.URL) }),
      col('address', 'Адреса', (c) => c.Address, { muted: true }),
      col('contacts', 'Контакти', (c) => c.$contacts.length, { render: (c) => countCell(c.$contacts.length), num: true }),
      col('quotes', 'Замовлення', (c) => c.$quotes.length, { render: (c) => countCell(c.$quotes.length), num: true }),
      col('activities', 'Активності', (c) => c.$activities.length, { render: (c) => countCell(c.$activities.length), num: true }),
    ],
    defaultSort: { key: 'name', dir: 'asc' },
    filters: [{ key: 'hasQuotes', label: 'Замовлення', value: (c) => (c.$quotes.length ? 'Є замовлення' : 'Без замовлень') }],
    search: (c) => [c.Name, c.Company_ID, c.URL, c.Address],
    secondary: (c) => [c.URL, c.Address],
  },

  contacts: {
    title: 'Контакти',
    icon: 'users',
    description: 'Контактні особи клієнтів.',
    columns: [
      col('name', 'Ім’я та прізвище', (c) => NAMES.contacts(c), { render: (c) => primaryLink('contacts', c) }),
      col('title', 'Посада', (c) => c.Title),
      col('company', 'Компанія', (c) => refLabel('companies', c.$company, c.Company), { render: (c) => ref('companies', c.$company, c.Company) }),
      col('email', 'Email', (c) => c.Email, { render: (c) => mailLink(c.Email) }),
      col('phone', 'Телефон', (c) => c.Phone, { render: (c) => phoneLink(c.Phone), nowrap: true }),
      col('status', 'Статус', (c) => tr(CONTACT_STATUS_LABELS, c.Status), { render: (c) => pill(tr(CONTACT_STATUS_LABELS, c.Status)) }),
      col('quotes', 'Замовлення', (c) => c.$quotes.length, { render: (c) => countCell(c.$quotes.length), num: true }),
    ],
    defaultSort: { key: 'name', dir: 'asc' },
    filters: [{ key: 'status', label: 'Статус', value: (c) => tr(CONTACT_STATUS_LABELS, c.Status) }],
    search: (c) => [
      NAMES.contacts(c), c.Contact_ID, c.Title, c.Email, c.Phone, refText(c.Company),
      nameOf('companies', c.$company), tr(CONTACT_STATUS_LABELS, c.Status),
    ],
    secondary: (c) => [c.Title, refLabel('companies', c.$company, c.Company), c.Email],
  },

  activity: {
    title: 'Активності',
    icon: 'activity',
    description: 'Дзвінки, зустрічі та листи з клієнтами.',
    columns: [
      col('type', 'Тип', (a) => tr(ACTIVITY_TYPE_LABELS, a.Type), { render: (a) => primaryLink('activity', a, tr(ACTIVITY_TYPE_LABELS, a.Type) || 'Активність') }),
      col('date', 'Дата й час', (a) => a.$date, { render: (a) => (a.$date ? dateTime(a.$date) : text(a['Date/Time'])), nowrap: true }),
      col('contact', 'Контакт', (a) => nameOf('contacts', a.$contact), { render: (a) => ref('contacts', a.$contact) }),
      col('company', 'Компанія', (a) => nameOf('companies', a.$company), { render: (a) => ref('companies', a.$company) }),
      col('author', 'Автор', (a) => a.Author, { muted: true }),
      col('code', 'Код', (a) => a.Activity_ID, { mono: true, muted: true }),
    ],
    defaultSort: { key: 'date', dir: 'desc' },
    filters: [
      { key: 'type', label: 'Тип', value: (a) => tr(ACTIVITY_TYPE_LABELS, a.Type) },
      { key: 'author', label: 'Автор', value: (a) => a.Author },
    ],
    search: (a) => [a.Activity_ID, tr(ACTIVITY_TYPE_LABELS, a.Type), a.Type, a.Author, nameOf('contacts', a.$contact), nameOf('companies', a.$company)],
    secondary: (a) => [nameOf('contacts', a.$contact), nameOf('companies', a.$company), a.Author],
  },
};

/* ---------- Пошук, фільтри, сортування ---------- */

const BLANK_KEY = '\u0000blank';
const listState = {};
const expandedSections = new Set();

function stateFor(key) {
  if (!listState[key]) listState[key] = { q: '', page: 1, sort: { ...VIEWS[key].defaultSort }, filters: {} };
  return listState[key];
}

const splitTerms = (q) => String(q || '').toLowerCase().split(/\s+/).filter(Boolean);
const matchesTerms = (r, terms) => terms.every((t) => r.$search.includes(t));
// Значення фільтра може бути й масивом (кілька продуктів у замовленні): запис підходить,
// якщо серед його значень є вибране.
function filterKeys(v) {
  const list = (Array.isArray(v) ? v : [v]).filter((x) => !isBlank(x)).map(String);
  return list.length ? list : [BLANK_KEY];
}

function filterRows(key, st) {
  const terms = splitTerms(st.q);
  const filters = VIEWS[key].filters || [];
  return db[key].filter(
    (r) =>
      (!terms.length || matchesTerms(r, terms)) &&
      filters.every((f) => !st.filters[f.key] || filterKeys(f.value(r)).includes(st.filters[f.key])),
  );
}

function filterOptions(key, filter) {
  const counts = new Map();
  for (const r of db[key]) {
    for (const k of new Set(filterKeys(filter.value(r)))) counts.set(k, (counts.get(k) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count, label: value === BLANK_KEY ? 'Не вказано' : value }))
    .sort((a, b) => (a.value === BLANK_KEY) - (b.value === BLANK_KEY) || collator.compare(a.label, b.label));
}

function compareValues(a, b) {
  const x = a instanceof Date ? a.getTime() : a;
  const y = b instanceof Date ? b.getTime() : b;
  if (typeof x === 'number' && typeof y === 'number') return x - y;
  return collator.compare(String(x), String(y));
}

function sortRows(rows, view, sort) {
  const column = view.columns.find((c) => c.key === sort.key) || view.columns[0];
  const dir = sort.dir === 'desc' ? -1 : 1;
  return rows
    .map((r) => [r, column.value(r)])
    .sort(([ra, a], [rb, b]) => {
      const blankA = isBlank(a);
      const blankB = isBlank(b);
      if (blankA || blankB) return blankA === blankB ? ra.id - rb.id : blankA ? 1 : -1; // порожні — завжди внизу
      return compareValues(a, b) * dir || ra.id - rb.id;
    })
    .map(([r]) => r);
}

/* ---------- Таблиці ---------- */

const cellClass = (c) =>
  [c.num && 'num', c.mono && 'mono', c.muted && 'muted-cell', c.nowrap && 'nowrap', c.wide && 'wide'].filter(Boolean).join(' ');

function renderCell(c, r) {
  if (c.render) return c.render(r);
  return text(c.value(r));
}

function renderTable(key, columns, rows, sort) {
  const head = columns
    .map((c) => {
      if (!sort) return `<th scope="col" class="${cellClass(c)}">${esc(c.label)}</th>`;
      const active = sort.key === c.key;
      const ariaSort = active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none';
      const indicator = active ? (sort.dir === 'asc' ? '↑' : '↓') : '↕';
      return `<th scope="col" class="${cellClass(c)}" aria-sort="${ariaSort}">
        <button type="button" class="th-sort${active ? ' is-active' : ''}" data-sort="${c.key}">${esc(c.label)}<span class="sort-ind" aria-hidden="true">${indicator}</span></button>
      </th>`;
    })
    .join('');
  const body = rows
    .map((r) => `<tr data-href="#/${key}/${r.id}">${columns.map((c) => `<td class="${cellClass(c)}">${renderCell(c, r)}</td>`).join('')}</tr>`)
    .join('');
  return `<div class="table-wrap"><table class="data-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function pager(page, pages) {
  return `<nav class="pager" aria-label="Сторінки">
    <button type="button" class="btn btn-sm" data-page="${page - 1}"${page <= 1 ? ' disabled' : ''}>← Попередня</button>
    <span class="pager-info">Сторінка ${page} з ${pages}</span>
    <button type="button" class="btn btn-sm" data-page="${page + 1}"${page >= pages ? ' disabled' : ''}>Наступна →</button>
  </nav>`;
}

/* ---------- Сторінка списку ---------- */

function renderList(key) {
  const view = VIEWS[key];
  const st = stateFor(key);
  setTitle(view.title);

  const filters = (view.filters || [])
    .map((f) => {
      const current = st.filters[f.key] || '';
      const options = filterOptions(key, f)
        .map((o) => `<option value="${esc(o.value)}"${o.value === current ? ' selected' : ''}>${esc(o.label)} (${o.count})</option>`)
        .join('');
      return `<label class="select-field"><span>${esc(f.label)}</span><select data-filter="${f.key}"><option value="">Усі</option>${options}</select></label>`;
    })
    .join('');

  viewEl.innerHTML = `
    <header class="page-head">
      <h1>${icon(view.icon)}${esc(view.title)}</h1>
      <p class="page-sub">${esc(view.description)}</p>
    </header>
    <div class="toolbar">
      <label class="search-field">${icon('search')}
        <input type="search" data-list-search value="${esc(st.q)}" placeholder="Пошук у розділі…" aria-label="Пошук у розділі «${esc(view.title)}»" autocomplete="off">
      </label>
      ${filters}
      <button type="button" class="btn btn-ghost btn-sm" data-reset-list>Скинути</button>
    </div>
    <section id="list-region" aria-live="polite"></section>`;
  renderListRegion(key);
}

function renderListRegion(key) {
  const view = VIEWS[key];
  const st = stateFor(key);
  const region = document.getElementById('list-region');
  if (!region) return;

  const rows = sortRows(filterRows(key, st), view, st.sort);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  st.page = Math.min(Math.max(1, st.page), pages);
  const start = (st.page - 1) * PAGE_SIZE;
  const pageRows = rows.slice(start, start + PAGE_SIZE);

  const filtered = Boolean(st.q) || Object.values(st.filters).some(Boolean);
  const resetBtn = viewEl.querySelector('[data-reset-list]');
  if (resetBtn) resetBtn.hidden = !filtered;

  if (!rows.length) {
    region.innerHTML = `<div class="card empty">
      <h2>${filtered ? 'Нічого не знайдено' : 'Записів поки немає'}</h2>
      ${filtered ? '<p>Спробуйте змінити пошуковий запит або фільтри.</p>' : ''}
    </div>`;
    return;
  }

  region.innerHTML = `<div class="card table-card">
    ${renderTable(key, view.columns, pageRows, st.sort)}
    <footer class="table-foot">
      <span>Показано ${fmt.number.format(start + 1)}–${fmt.number.format(start + pageRows.length)} з ${fmt.number.format(rows.length)}${view.summary ? ` · ${view.summary(rows)}` : ''}</span>
      ${pages > 1 ? pager(st.page, pages) : ''}
    </footer>
  </div>`;
}

/* ---------- Сторінки записів ---------- */

function kv(pairs) {
  return `<dl class="kv">${pairs
    .filter(Boolean)
    .map(([label, value]) => `<dt>${esc(label)}</dt><dd>${value}</dd>`)
    .join('')}</dl>`;
}

const card = (title, body) =>
  `<section class="card"><header class="card-head"><h2>${esc(title)}</h2></header><div class="card-body">${body}</div></section>`;
const metric = (label, value) =>
  `<div class="metric"><span class="metric-label">${esc(label)}</span><span class="metric-value">${value}</span></div>`;

function detailHeader(key, { kicker, title, subtitle, metrics }) {
  const view = VIEWS[key];
  return `
    <nav class="crumbs" aria-label="Навігація"><a href="#/${key}">${icon('back')}${esc(view.title)}</a></nav>
    <header class="detail-head">
      <div class="detail-title">
        <span class="kicker">${icon(view.icon)}${esc(kicker)}</span>
        <h1>${esc(title)}</h1>
        ${subtitle ? `<p class="page-sub">${subtitle}</p>` : ''}
      </div>
      ${metrics ? `<div class="metrics">${metrics}</div>` : ''}
    </header>`;
}

function related(key, title, rows, columnKeys, sectionId) {
  const view = VIEWS[key];
  const columns = columnKeys.map((k) => view.columns.find((c) => c.key === k)).filter(Boolean);
  const expandKey = `${routeHash}|${sectionId}`;
  const expanded = expandedSections.has(expandKey);
  const sorted = sortRows(rows, view, view.defaultSort);
  const shown = expanded ? sorted : sorted.slice(0, RELATED_LIMIT);

  const body = rows.length
    ? renderTable(key, columns, shown) +
      (rows.length > RELATED_LIMIT
        ? `<div class="card-foot"><button type="button" class="btn btn-ghost btn-sm" data-expand="${esc(expandKey)}">${expanded ? 'Згорнути' : `Показати всі (${fmt.number.format(rows.length)})`}</button></div>`
        : '')
    : `<div class="card-body">${emptyInline('Немає пов’язаних записів')}</div>`;

  return `<section class="card related">
    <header class="card-head"><h2>${icon(view.icon)}${esc(title)}</h2><span class="count-badge">${fmt.number.format(rows.length)}</span></header>
    ${body}
  </section>`;
}

function recordMeta(r) {
  const created = parseTimestamp(r.CreatedAt);
  const updated = parseTimestamp(r.UpdatedAt);
  const parts = [created && `Створено: ${fmt.dateTime.format(created)}`, updated && `Змінено: ${fmt.dateTime.format(updated)}`].filter(Boolean);
  return parts.length ? `<p class="record-meta">${esc(parts.join(' · '))}</p>` : '';
}

const DETAILS = {
  quotes(q) {
    const { $company: c, $contact: p, $opportunity: o } = q;
    const subtitle =
      [q.$date && `від ${fmt.date.format(q.$date)}`, q.Author && `автор: ${q.Author}`].filter(Boolean).map(esc).join(' · ') +
      (paymentInfo(q.Payment_Status) ? ` ${paymentPill(q.Payment_Status)}` : '');
    return `${detailHeader('quotes', { kicker: 'Замовлення', title: NAMES.quotes(q), subtitle, metrics: metric('Сума замовлення', money(q.Amount)) })}
      <div class="detail-grid">
        ${card('Деталі замовлення', kv([
          ['Номер замовлення', text(q.Quote_ID)],
          ['Дата', date(q.$date)],
          ['Сума', money(q.Amount)],
          ['Оплата', paymentCell(q)],
          ['Автор', text(q.Author)],
          ['Примітки', text(q.Notes)],
        ]))}
        ${card('Компанія', c ? kv([['Назва', ref('companies', c)], ['Сайт', webLink(c.URL)], ['Адреса', text(c.Address)]]) : emptyInline('Компанію не вказано'))}
        ${card('Контакт', p ? kv([['Ім’я', ref('contacts', p)], ['Посада', text(p.Title)], ['Email', mailLink(p.Email)], ['Телефон', phoneLink(p.Phone)]]) : emptyInline('Контакт не вказано'))}
        ${card('Лід', o ? kv([
          ['Номер', ref('opportunities', o)],
          ['Опис', text(o.Description)],
          ['Етап', pill(tr(STAGE_LABELS, o.Stage))],
          ['Сума ліда', money(o.Amount)],
          ['Відповідальний', text(o.Owner)],
        ]) : emptyInline('Замовлення не прив’язане до ліда'))}
      </div>
      ${paymentChecksSection(q)}
      ${related('products', 'Продукти', q.$products, ['name', 'sku', 'category', 'price'], 'products')}
      ${recordMeta(q)}`;
  },

  opportunities(o) {
    const quotesSum = sumOf(o.$quotes, (q) => q.Amount);
    return `${detailHeader('opportunities', {
      kicker: 'Лід',
      title: NAMES.opportunities(o),
      subtitle: [tr(STAGE_LABELS, o.Stage), o.Owner && `відповідальний: ${o.Owner}`].filter(Boolean).map(esc).join(' · '),
      metrics: metric('Сума ліда', money(o.Amount)) + metric('Сума замовлень', money(quotesSum)),
    })}
      <div class="detail-grid">
        ${card('Опис', isBlank(o.Description) ? emptyInline('Опис відсутній') : `<p class="description">${esc(o.Description)}</p>`)}
        ${card('Деталі ліда', kv([
          ['Номер', text(o.Opportunity_ID)],
          ['Етап', pill(tr(STAGE_LABELS, o.Stage))],
          ['Сума', money(o.Amount)],
          ['Відповідальний', text(o.Owner)],
          ['Компанія', ref('companies', o.$company, o.Company)],
          ['Контакт', ref('contacts', o.$contact, o.Contact)],
          ['Продукт', ref('products', o.$product, o.Product)],
        ]))}
      </div>
      ${related('quotes', 'Замовлення', o.$quotes, ['number', 'date', 'company', 'product', 'amount', 'payment'], 'quotes')}
      ${recordMeta(o)}`;
  },

  products(p) {
    return `${detailHeader('products', {
      kicker: 'Продукт',
      title: NAMES.products(p),
      subtitle: [p.Category, p['Customer ID'] && `артикул ${p['Customer ID']}`].filter(Boolean).map(esc).join(' · '),
      metrics: metric('Ціна', money(p.$price)) + metric('Замовлень', fmt.number.format(p.$quotes.length)),
    })}
      <div class="detail-grid">
        ${card('Деталі продукту', kv([
          ['Назва', text(p.Name)],
          ['Код продукту', `<span class="mono">${text(p.Product_ID)}</span>`],
          ['Артикул', text(p['Customer ID'])],
          ['Категорія', text(p.Category)],
          ['Ціна', money(p.$price)],
          ['Зображення', isBlank(p.Image) ? DASH : `<span class="muted mono">${esc(p.Image)}</span>`],
        ]))}
        ${card('Опис', isBlank(p.Description) ? emptyInline('Опис відсутній') : `<p class="description">${esc(p.Description)}</p>`)}
      </div>
      ${related('quotes', 'Замовлення', p.$quotes, ['number', 'date', 'company', 'contact', 'amount', 'payment'], 'quotes')}
      ${p.$opportunities.length ? related('opportunities', 'Ліди', p.$opportunities, ['number', 'description', 'stage', 'amount'], 'opps') : ''}
      ${recordMeta(p)}`;
  },

  companies(c) {
    return `${detailHeader('companies', {
      kicker: 'Компанія',
      title: NAMES.companies(c),
      subtitle: isBlank(c.Address) ? '' : esc(c.Address),
      metrics: metric('Замовлень', fmt.number.format(c.$quotes.length)) + metric('Сума замовлень', money(sumOf(c.$quotes, (q) => q.Amount))),
    })}
      <div class="detail-grid">
        ${card('Деталі компанії', kv([
          ['Назва', text(c.Name)],
          ['Код компанії', `<span class="mono">${text(c.Company_ID)}</span>`],
          ['Сайт', webLink(c.URL)],
          ['Адреса', text(c.Address)],
        ]))}
        ${card('Коротко', kv([
          ['Контакти', fmt.number.format(c.$contacts.length)],
          ['Замовлення', fmt.number.format(c.$quotes.length)],
          ['Ліди', fmt.number.format(c.$opportunities.length)],
          ['Активності', fmt.number.format(c.$activities.length)],
        ]))}
      </div>
      ${related('contacts', 'Контакти', c.$contacts, ['name', 'title', 'email', 'phone', 'status'], 'contacts')}
      ${related('quotes', 'Замовлення', c.$quotes, ['number', 'date', 'contact', 'product', 'amount', 'payment'], 'quotes')}
      ${c.$opportunities.length ? related('opportunities', 'Ліди', c.$opportunities, ['number', 'description', 'stage', 'amount'], 'opps') : ''}
      ${related('activity', 'Активності', c.$activities, ['type', 'date', 'contact', 'author'], 'activities')}
      ${recordMeta(c)}`;
  },

  contacts(p) {
    return `${detailHeader('contacts', {
      kicker: 'Контакт',
      title: NAMES.contacts(p),
      subtitle: [p.Title, refLabel('companies', p.$company, p.Company)].filter((v) => !isBlank(v)).map(esc).join(' · '),
      metrics: metric('Замовлень', fmt.number.format(p.$quotes.length)) + metric('Активностей', fmt.number.format(p.$activities.length)),
    })}
      <div class="detail-grid">
        ${card('Контактні дані', kv([
          ['Ім’я', text(p['First Name'])],
          ['Прізвище', text(p['Last Name'])],
          ['Посада', text(p.Title)],
          ['Email', mailLink(p.Email)],
          ['Телефон', phoneLink(p.Phone)],
        ]))}
        ${card('Компанія та статус', kv([
          ['Компанія', ref('companies', p.$company, p.Company)],
          ['Статус', pill(tr(CONTACT_STATUS_LABELS, p.Status))],
          ['Код контакту', `<span class="mono">${text(p.Contact_ID)}</span>`],
        ]))}
      </div>
      ${related('quotes', 'Замовлення', p.$quotes, ['number', 'date', 'company', 'product', 'amount', 'payment'], 'quotes')}
      ${p.$opportunities.length ? related('opportunities', 'Ліди', p.$opportunities, ['number', 'description', 'stage', 'amount'], 'opps') : ''}
      ${related('activity', 'Активності', p.$activities, ['type', 'date', 'company', 'author'], 'activities')}
      ${recordMeta(p)}`;
  },

  activity(a) {
    return `${detailHeader('activity', {
      kicker: 'Активність',
      title: tr(ACTIVITY_TYPE_LABELS, a.Type) || 'Активність',
      subtitle: esc(a.$date ? fmt.dateTime.format(a.$date) : a['Date/Time'] || ''),
    })}
      <div class="detail-grid">
        ${card('Деталі активності', kv([
          ['Тип', pill(tr(ACTIVITY_TYPE_LABELS, a.Type))],
          ['Дата й час', a.$date ? dateTime(a.$date) : text(a['Date/Time'])],
          ['Автор', text(a.Author)],
          ['Код', `<span class="mono">${text(a.Activity_ID)}</span>`],
        ]))}
        ${card('Учасники', kv([
          ['Контакт', ref('contacts', a.$contact)],
          ['Посада', text(a.$contact?.Title)],
          ['Компанія', ref('companies', a.$company)],
        ]))}
      </div>
      ${recordMeta(a)}`;
  },
};

function renderDetail(key, id) {
  const rec = db.byId[key].get(id);
  if (!rec) {
    setTitle('Запис не знайдено');
    viewEl.innerHTML = `<nav class="crumbs"><a href="#/${key}">${icon('back')}${esc(VIEWS[key].title)}</a></nav>
      <div class="state"><h2>Запис не знайдено</h2><p>Можливо, його було видалено в NocoDB.</p></div>`;
    return;
  }
  setTitle(NAMES[key](rec));
  viewEl.innerHTML = DETAILS[key](rec);
}

/* ---------- Графіки ---------- */

function niceTicks(max, count = 4) {
  if (max <= 0) return [0, 1];
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = Math.max(1, [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw));
  const ticks = [];
  for (let t = 0; t < max + step; t += step) ticks.push(t);
  return ticks;
}

function quotesByMonth(maxMonths = 18) {
  const buckets = new Map();
  for (const q of db.quotes) {
    if (!q.$date) continue;
    const k = q.$date.getFullYear() * 12 + q.$date.getMonth();
    const b = buckets.get(k) || { count: 0, sum: 0 };
    b.count++;
    if (isNum(q.Amount)) b.sum += q.Amount;
    buckets.set(k, b);
  }
  if (!buckets.size) return [];
  const keys = [...buckets.keys()];
  const last = Math.max(...keys);
  const first = Math.max(Math.min(...keys), last - (maxMonths - 1));
  const out = [];
  for (let k = first; k <= last; k++) {
    out.push({ date: new Date(Math.floor(k / 12), k % 12, 1), ...(buckets.get(k) || { count: 0, sum: 0 }) });
  }
  return out;
}

function columnChart(data) {
  if (!data.length) return emptyInline('Немає даних');
  const max = Math.max(...data.map((d) => d.count));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const every = Math.ceil(data.length / 9);
  const peak = data.findIndex((d) => d.count === max);

  const grid = ticks
    .map((t) => `<div class="gridline${t === 0 ? ' is-base' : ''}" style="bottom:${(t / top) * 100}%"><span>${fmt.number.format(t)}</span></div>`)
    .join('');
  const cols = data
    .map((d, i) => {
      const tip = `${monthLong(d.date)}: ${d.count} ${ordersWord(d.count)}${d.sum ? `, сума ${fmt.money.format(d.sum)}` : ''}`;
      return `<div class="col" tabindex="0" data-tip="${esc(tip)}" aria-label="${esc(tip)}">
        <div class="col-bar" style="height:${(d.count / top) * 100}%">${i === peak && max > 0 ? `<span class="col-value">${d.count}</span>` : ''}</div>
      </div>`;
    })
    .join('');
  const labels = data.map((d, i) => `<span>${i % every === 0 ? esc(monthShort(d.date)) : ''}</span>`).join('');

  return `<div class="colchart">
    <div class="colchart-plot"><div class="colchart-grid" aria-hidden="true">${grid}</div><div class="colchart-cols">${cols}</div></div>
    <div class="colchart-labels" aria-hidden="true">${labels}</div>
  </div>`;
}

function hbarChart(items) {
  if (!items.length) return emptyInline('Немає даних');
  const max = Math.max(...items.map((i) => i.value)) || 1;
  return `<ul class="hbars">${items
    .map(
      (i) => `<li class="hbar" data-tip="${esc(i.tip)}">
        <a class="hbar-label" href="${i.href}">${esc(i.label)}</a>
        <div class="hbar-track"><span class="hbar-fill" style="--p:${(i.value / max).toFixed(4)}"></span><span class="hbar-value">${fmt.number.format(i.value)}</span></div>
      </li>`,
    )
    .join('')}</ul>`;
}

/* ---------- Огляд ---------- */

function renderDashboard() {
  setTitle('Огляд');
  const quoteSum = sumOf(db.quotes, (q) => q.Amount);
  const waitingQuotes = db.quotes.filter(isWaitingForPayment);
  const waitingSum = sumOf(waitingQuotes, (q) => q.Amount);
  const paidCount = db.quotes.filter((q) => paymentInfo(q.Payment_Status)?.key === 'paid').length;
  const oppSum = sumOf(db.opportunities, (o) => o.Amount);
  const latestActivity = db.activity.reduce((m, a) => (a.$date && (!m || a.$date > m) ? a.$date : m), null);

  const tiles = [
    { href: '#/quotes', label: 'Замовлення', value: fmt.number.format(db.quotes.length), sub: `${fmt.number.format(paidCount)} оплачено · ${fmt.number.format(waitingQuotes.length)} очікують` },
    { href: '#/quotes', label: 'Сума замовлень', value: compactNumber(quoteSum), tip: fmt.money.format(quoteSum), sub: `очікує оплати: ${compactNumber(waitingSum)}` },
    { href: '#/opportunities', label: 'Ліди', value: fmt.number.format(db.opportunities.length), sub: `на суму ${compactNumber(oppSum)}`, tip: fmt.money.format(oppSum) },
    { href: '#/companies', label: 'Компанії', value: fmt.number.format(db.companies.length), sub: `${fmt.number.format(db.companies.filter((c) => c.$quotes.length).length)} із замовленнями` },
    { href: '#/contacts', label: 'Контакти', value: fmt.number.format(db.contacts.length), sub: `${fmt.number.format(db.contacts.filter((c) => c.$quotes.length).length)} із замовленнями` },
    { href: '#/activity', label: 'Активності', value: fmt.number.format(db.activity.length), sub: latestActivity ? `остання ${fmt.date.format(latestActivity)}` : 'немає записів' },
  ];

  const topProducts = [...db.products]
    .filter((p) => p.$quotes.length)
    .sort((a, b) => b.$quotes.length - a.$quotes.length || collator.compare(NAMES.products(a), NAMES.products(b)))
    .slice(0, 6)
    .map((p) => {
      const sum = sumOf(p.$quotes, (q) => q.Amount);
      return {
        label: NAMES.products(p),
        href: `#/products/${p.id}`,
        value: p.$quotes.length,
        tip: `${NAMES.products(p)}: ${p.$quotes.length} ${ordersWord(p.$quotes.length)}${sum ? `, сума ${fmt.money.format(sum)}` : ''}`,
      };
    });

  const recentQuotes = sortRows(db.quotes, VIEWS.quotes, { key: 'date', dir: 'desc' }).slice(0, 8);
  const recentActivities = sortRows(db.activity, VIEWS.activity, { key: 'date', dir: 'desc' }).slice(0, 6);
  const quoteCols = ['number', 'date', 'company', 'product', 'amount', 'payment'].map((k) => VIEWS.quotes.columns.find((c) => c.key === k));

  const feed = recentActivities
    .map((a) => {
      const who = [nameOf('contacts', a.$contact), nameOf('companies', a.$company)].filter(Boolean).join(' · ') || a.Author || '';
      return `<li><a class="feed-item" href="#/activity/${a.id}">
        <span class="feed-icon">${icon(ACTIVITY_TYPE_ICONS[a.Type] || 'activity')}</span>
        <span class="feed-title">${esc(tr(ACTIVITY_TYPE_LABELS, a.Type) || 'Активність')}<span class="feed-time">${esc(a.$date ? fmt.dateTime.format(a.$date) : a['Date/Time'] || '')}</span></span>
        <span class="feed-sub">${esc(who)}</span>
      </a></li>`;
    })
    .join('');

  viewEl.innerHTML = `
    <header class="page-head">
      <h1>${icon('grid')}Огляд</h1>
      <p class="page-sub">Зведена інформація щодо замовлень, лідів і клієнтів.</p>
    </header>
    <div class="stats">
      ${tiles
        .map(
          (t) => `<a class="stat" href="${t.href}">
            <span class="stat-label">${esc(t.label)}</span>
            <span class="stat-value"${t.tip ? ` data-tip="${esc(t.tip)}"` : ''}>${esc(t.value)}</span>
            <span class="stat-sub">${esc(t.sub)}</span>
          </a>`,
        )
        .join('')}
    </div>
    <div class="dash-grid">
      <section class="card">
        <header class="card-head"><h2>Замовлення за місяцями</h2><span class="card-note">кількість замовлень</span></header>
        <div class="card-body">${columnChart(quotesByMonth())}</div>
      </section>
      <section class="card">
        <header class="card-head"><h2>Найпопулярніші продукти</h2><span class="card-note">кількість замовлень</span></header>
        <div class="card-body">${hbarChart(topProducts)}</div>
      </section>
    </div>
    <div class="dash-grid">
      <section class="card related">
        <header class="card-head"><h2>${icon('quote')}Останні замовлення</h2><a class="card-link" href="#/quotes">Усі замовлення ${icon('arrow')}</a></header>
        ${recentQuotes.length ? renderTable('quotes', quoteCols, recentQuotes) : `<div class="card-body">${emptyInline('Замовлень поки немає')}</div>`}
      </section>
      <section class="card related">
        <header class="card-head"><h2>${icon('activity')}Останні активності</h2><a class="card-link" href="#/activity">Усі ${icon('arrow')}</a></header>
        ${feed ? `<ul class="feed">${feed}</ul>` : `<div class="card-body">${emptyInline('Активностей поки немає')}</div>`}
      </section>
    </div>`;
}

/* ---------- Глобальний пошук ---------- */

function renderSearch(q) {
  setTitle('Пошук');
  const terms = splitTerms(q);
  if (!terms.length) {
    viewEl.innerHTML = `<div class="state"><h2>Введіть пошуковий запит</h2><p>Шукайте за номером замовлення, назвою компанії, ім’ям контакту, продуктом тощо.</p></div>`;
    return;
  }

  const groups = ENTITY_ORDER.map((key) => ({
    key,
    rows: sortRows(db[key].filter((r) => matchesTerms(r, terms)), VIEWS[key], VIEWS[key].defaultSort),
  })).filter((g) => g.rows.length);
  const total = groups.reduce((n, g) => n + g.rows.length, 0);

  const cards = groups
    .map(({ key, rows }) => {
      const view = VIEWS[key];
      const items = rows
        .slice(0, 5)
        .map((r) => {
          const secondary = view.secondary(r).filter((v) => !isBlank(v) && v !== false).join(' · ');
          return `<li><a class="result" href="#/${key}/${r.id}"><strong>${esc(NAMES[key](r))}</strong>${secondary ? `<span>${esc(secondary)}</span>` : ''}</a></li>`;
        })
        .join('');
      return `<section class="card related">
        <header class="card-head"><h2>${icon(view.icon)}${esc(view.title)}</h2><span class="count-badge">${fmt.number.format(rows.length)}</span>
          <a class="card-link" href="#/${key}" data-apply-search="${key}">Відкрити в розділі ${icon('arrow')}</a></header>
        <ul class="result-list">${items}</ul>
      </section>`;
    })
    .join('');

  viewEl.innerHTML = `
    <header class="page-head">
      <h1>${icon('search')}Результати пошуку</h1>
      <p class="page-sub">За запитом «${esc(q)}» знайдено ${fmt.number.format(total)} ${recordsWord(total)}.</p>
    </header>
    ${total ? `<div class="results">${cards}</div>` : `<div class="card empty"><h2>Нічого не знайдено</h2><p>Спробуйте інше слово або частину номера.</p></div>`}`;
}

/* ---------- Маршрутизація та оболонка ---------- */

const viewEl = document.getElementById('view');
const navEl = document.getElementById('nav');
const updatedAtEl = document.getElementById('updated-at');
const refreshBtn = document.getElementById('refresh-btn');
const searchForm = document.getElementById('global-search');
const searchInput = document.getElementById('global-search-input');
const tipEl = document.getElementById('tooltip');
const toastEl = document.getElementById('toast');

let route = { name: 'dashboard' };

// Поточний маршрут зберігаємо самі: у пісочниці артефакта зміна location.hash
// не гарантована, тому history — лише бонус для кнопки «Назад» у браузері.
let routeHash = location.hash || '#/';

function navigate(hash) {
  if (hash !== routeHash) {
    routeHash = hash;
    try {
      history.pushState(null, '', hash);
    } catch {
      /* обмежений фрейм: маршрут лишається в пам'яті */
    }
  }
  onRouteChange();
}

function onRouteChange() {
  render();
  window.scrollTo(0, 0);
  viewEl.focus({ preventScroll: true });
}

function parseRoute() {
  const hash = routeHash.replace(/^#\/?/, '');
  if (!hash) return { name: 'dashboard' };
  if (hash === 'search' || hash.startsWith('search/')) {
    let q = hash.slice('search/'.length);
    try { q = decodeURIComponent(q); } catch { /* залишаємо як є */ }
    return { name: 'search', q };
  }
  const [key, id] = hash.split('/');
  if (Object.hasOwn(VIEWS, key)) return id ? { name: 'detail', key, id: Number(id) } : { name: 'list', key };
  return { name: 'notfound' };
}

function setTitle(title) {
  document.title = `${title} · Облік замовлень`;
}

function renderNav() {
  const items = [
    { key: 'dashboard', href: '#/', label: 'Огляд', icon: 'grid' },
    ...ENTITY_ORDER.map((key) => ({ key, href: `#/${key}`, label: VIEWS[key].title, icon: VIEWS[key].icon })),
  ];
  navEl.innerHTML = items
    .map(
      (i) => `<a class="nav-item" href="${i.href}" data-nav="${i.key}">${icon(i.icon)}<span class="nav-label">${esc(i.label)}</span>${
        db.loaded && i.key !== 'dashboard' ? `<span class="nav-count">${fmt.number.format(db[i.key].length)}</span>` : ''
      }</a>`,
    )
    .join('');
  updateNavActive();
}

function updateNavActive() {
  const current = route.name === 'dashboard' ? 'dashboard' : route.key;
  for (const a of navEl.querySelectorAll('.nav-item')) {
    const on = a.dataset.nav === current;
    a.classList.toggle('is-active', on);
    if (on) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
}

function render() {
  route = parseRoute();
  hideTip();
  updateNavActive();
  if (route.name === 'search') searchInput.value = route.q;
  if (!db.loaded) return;

  switch (route.name) {
    case 'dashboard': return renderDashboard();
    case 'list': return renderList(route.key);
    case 'detail': return renderDetail(route.key, route.id);
    case 'search': return renderSearch(route.q);
    default:
      setTitle('Сторінку не знайдено');
      viewEl.innerHTML = `<div class="state"><h2>Сторінку не знайдено</h2><p><a href="#/">Повернутися до огляду</a></p></div>`;
  }
}

/* ---------- Завантаження даних ---------- */

let loading = false;
let slowLoad = false;
let loadProgress = { done: 0, total: ENTITY_ORDER.length };

function renderLoading(done, total) {
  loadProgress = { done, total };
  viewEl.innerHTML = `<div class="state">
    <div class="spinner" aria-hidden="true"></div>
    <h2>Завантаження даних…</h2>
    <p>Отримано ${done} з ${total} розділів</p>
    ${slowLoad ? '<p class="muted">NocoDB обмежує частоту запитів, тому завантаження може тривати до хвилини.</p>' : ''}
  </div>`;
}

function renderLoadError(message) {
  setTitle('Помилка');
  viewEl.innerHTML = `<div class="state state-error">
    <h2>Не вдалося завантажити дані</h2>
    <p>${esc(message)}</p>
    <button type="button" class="btn btn-primary" data-retry>Спробувати ще раз</button>
  </div>`;
}

let toastTimer = null;
function showToast(message) {
  toastEl.textContent = message;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastEl.hidden = true; }, 6000);
}

// Опублікований артефакт містить знімок даних у <script id="snapshot"> і не звертається до мережі.
function readSnapshot() {
  const el = document.getElementById('snapshot');
  if (!el) return null;
  try {
    return JSON.parse(el.textContent);
  } catch {
    return null;
  }
}

const SNAPSHOT = readSnapshot();

function loadSnapshot() {
  buildModel(SNAPSHOT.tables);
  db.loaded = true;
  db.fetchedAt = new Date(SNAPSHOT.fetchedAt);
  updatedAtEl.textContent = `Знімок даних від ${fmt.dateTime.format(db.fetchedAt)}`;
  renderNav();
  render();
}

async function loadData(refresh = false) {
  if (loading) return;
  loading = true;
  refreshBtn.disabled = true;
  refreshBtn.classList.add('is-busy');
  slowLoad = false;
  if (!db.loaded) renderLoading(0, ENTITY_ORDER.length);
  const slowTimer = setTimeout(() => {
    slowLoad = true;
    if (!db.loaded) renderLoading(loadProgress.done, loadProgress.total);
  }, 8000);

  try {
    let done = 0;
    const entries = await Promise.all(
      ENTITY_ORDER.map(async (key) => {
        let res;
        try {
          res = await fetch(`/api/records/${key}${refresh ? '?refresh=1' : ''}`, { headers: { accept: 'application/json' } });
        } catch {
          throw new Error('Немає зв’язку з локальним сервером. Перевірте, чи запущено server.js.');
        }
        const body = await res.json().catch(() => null);
        if (!res.ok || !body) throw new Error(body?.error || `Сервер повернув помилку ${res.status}.`);
        done++;
        if (!db.loaded) renderLoading(done, ENTITY_ORDER.length);
        return [key, body];
      }),
    );

    buildModel(Object.fromEntries(entries));
    db.loaded = true;
    db.fetchedAt = new Date(Math.min(...entries.map(([, b]) => Date.parse(b.fetchedAt) || Date.now())));
    updatedAtEl.textContent = `Дані станом на ${fmt.time.format(db.fetchedAt)}`;
    renderNav();
    render();
    if (entries.some(([, b]) => b.stale)) {
      showToast('Не вдалося отримати свіжі дані з NocoDB, тому показано попередню версію. Спробуйте оновити пізніше.');
    }
  } catch (err) {
    if (db.loaded) showToast(`Не вдалося оновити дані. ${err.message}`);
    else renderLoadError(err.message);
  } finally {
    clearTimeout(slowTimer);
    loading = false;
    refreshBtn.disabled = false;
    refreshBtn.classList.remove('is-busy');
  }
}

/* ---------- Підказки (tooltip) ---------- */

let tipTarget = null;

function placeTip(x, y) {
  const pad = 12;
  const rect = tipEl.getBoundingClientRect();
  let left = x + pad;
  let top = y - rect.height - pad;
  if (left + rect.width > window.innerWidth - 8) left = x - rect.width - pad;
  if (top < 8) top = y + pad;
  tipEl.style.left = `${Math.max(8, left)}px`;
  tipEl.style.top = `${Math.max(8, top)}px`;
}

function showTip(target, x, y) {
  tipTarget = target;
  tipEl.textContent = target.dataset.tip;
  tipEl.hidden = false;
  placeTip(x, y);
}

function hideTip() {
  tipTarget = null;
  tipEl.hidden = true;
}

document.addEventListener('pointerover', (e) => {
  const target = e.target.closest?.('[data-tip]');
  if (target && target !== tipTarget) showTip(target, e.clientX, e.clientY);
  else if (!target && tipTarget) hideTip();
});
document.addEventListener('pointermove', (e) => {
  if (tipTarget) placeTip(e.clientX, e.clientY);
});
document.documentElement.addEventListener('pointerleave', hideTip);
document.addEventListener('focusin', (e) => {
  const target = e.target.closest?.('[data-tip]');
  if (!target) return;
  const r = target.getBoundingClientRect();
  showTip(target, r.left + r.width / 2, r.top);
});
document.addEventListener('focusout', hideTip);
window.addEventListener('scroll', hideTip, { passive: true });

/* ---------- Події ---------- */

viewEl.addEventListener('input', (e) => {
  if (!e.target.matches('[data-list-search]') || route.name !== 'list') return;
  const st = stateFor(route.key);
  st.q = e.target.value;
  st.page = 1;
  renderListRegion(route.key);
});

viewEl.addEventListener('change', (e) => {
  const select = e.target.closest('select[data-filter]');
  if (!select || route.name !== 'list') return;
  const st = stateFor(route.key);
  st.filters[select.dataset.filter] = select.value;
  st.page = 1;
  renderListRegion(route.key);
});

viewEl.addEventListener('click', (e) => {
  const sortBtn = e.target.closest('[data-sort]');
  if (sortBtn && route.name === 'list') {
    const st = stateFor(route.key);
    const column = VIEWS[route.key].columns.find((c) => c.key === sortBtn.dataset.sort);
    st.sort = st.sort.key === column.key
      ? { key: column.key, dir: st.sort.dir === 'asc' ? 'desc' : 'asc' }
      : { key: column.key, dir: column.num ? 'desc' : 'asc' };
    renderListRegion(route.key);
    return;
  }

  const pageBtn = e.target.closest('[data-page]');
  if (pageBtn && route.name === 'list') {
    stateFor(route.key).page = Number(pageBtn.dataset.page);
    renderListRegion(route.key);
    viewEl.querySelector('.toolbar')?.scrollIntoView({ block: 'start' });
    return;
  }

  if (e.target.closest('[data-reset-list]') && route.name === 'list') {
    delete listState[route.key];
    renderList(route.key);
    return;
  }

  const checkBtn = e.target.closest('[data-check-payment]');
  if (checkBtn) {
    runPaymentCheck(Number(checkBtn.dataset.checkPayment));
    return;
  }

  const expandBtn = e.target.closest('[data-expand]');
  if (expandBtn) {
    const k = expandBtn.dataset.expand;
    if (expandedSections.has(k)) expandedSections.delete(k);
    else expandedSections.add(k);
    const y = window.scrollY;
    render();
    window.scrollTo(0, y);
    return;
  }

  const applySearch = e.target.closest('[data-apply-search]');
  if (applySearch && route.name === 'search') {
    const st = stateFor(applySearch.dataset.applySearch);
    st.q = route.q;
    st.page = 1;
    return; // далі спрацює звичайний перехід за посиланням
  }

  if (e.target.closest('[data-retry]')) {
    loadData();
    return;
  }

  // Клік по рядку таблиці відкриває запис (крім кліків по посиланнях і кнопках усередині).
  const row = e.target.closest('tr[data-href]');
  if (row && !e.target.closest('a, button, input, select')) {
    if (window.getSelection()?.toString()) return; // користувач виділяє текст
    navigate(row.dataset.href);
  }
});

searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const q = searchInput.value.trim();
  navigate(`#/search/${encodeURIComponent(q)}`);
});

refreshBtn.addEventListener('click', () => loadData(true));

// Внутрішні посилання (#/...) обробляємо самі, щоб навігація працювала і в артефакті.
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href^="#"]');
  if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  navigate(link.getAttribute('href'));
});

for (const type of ['popstate', 'hashchange']) {
  window.addEventListener(type, () => {
    const hash = location.hash || '#/';
    if (hash === routeHash) return;
    routeHash = hash;
    onRouteChange();
  });
}

/* ---------- Старт ---------- */

searchForm.insertAdjacentHTML('afterbegin', icon('search'));
refreshBtn.insertAdjacentHTML('afterbegin', icon('refresh'));
document.getElementById('readonly-badge').innerHTML = `${icon('eye')}Лише перегляд`;

if (parseRoute().name === 'notfound') routeHash = '#/';
route = parseRoute();
renderNav();
if (SNAPSHOT) {
  refreshBtn.hidden = true;
  loadSnapshot();
} else {
  loadData();
}
