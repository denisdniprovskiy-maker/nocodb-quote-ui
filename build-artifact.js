'use strict';

// Builds a self-contained Claude Artifact page with a read-only snapshot of the CRM data.
// Artifact pages cannot call NocoDB themselves (their CSP blocks external requests), so the
// data is fetched here and embedded. Run `npm run build:artifact`, then publish OUT_FILE.

const fs = require('node:fs');
const path = require('node:path');
const { TOKEN, TABLES, UpstreamError, fetchAllRecords, describeNetworkError } = require('./nocodb');

const PUBLIC_DIR = path.join(__dirname, 'public');
const OUT_FILE = path.join(__dirname, 'dist', 'oblik-zamovlen.html');

// Only the fields the UI reads go into the published page.
const SNAPSHOT_FIELDS = {
  quotes: ['Quote_ID', 'Notes', 'Amount', 'Date/Time', 'Author', 'Company', 'Contact', 'Products', 'Opportunity', 'CreatedAt', 'UpdatedAt'],
  opportunities: ['Opportunity_ID', 'Description', 'Company', 'Contact', 'Product', 'Stage', 'Amount', 'Owner', 'CreatedAt', 'UpdatedAt'],
  products: ['Product_ID', 'Customer ID', 'Name', 'Description', 'Category', 'Image', 'Price', 'CreatedAt', 'UpdatedAt'],
  companies: ['Company_ID', 'Name', 'URL', 'Address', 'CreatedAt', 'UpdatedAt'],
  contacts: ['Contact_ID', 'First Name', 'Last Name', 'Title', 'Email', 'Phone', 'Company', 'Status', 'CreatedAt', 'UpdatedAt'],
  activity: ['Activity_ID', 'Type', 'Date/Time', 'Author', 'Contact', 'Company', 'CreatedAt', 'UpdatedAt'],
};

const slimLink = (link) => ({ id: link.id, fields: link.fields || {} });

// Empty values are dropped (the UI treats a missing field as empty). Links keep only their id
// and display value; to-many links (e.g. Quotes.Products) stay arrays. Reverse links such as
// Products.Quotes are not listed above: the UI rebuilds them from the other side.
function toSnapshotRecord(entity, record) {
  const fields = {};
  for (const name of SNAPSHOT_FIELDS[entity]) {
    const value = record.fields[name];
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) fields[name] = value.map(slimLink);
    else fields[name] = typeof value === 'object' ? slimLink(value) : value;
  }
  return { id: record.id, fields };
}

// JSON inside <script type="application/json"> must not be able to close the tag, and the
// publish step rejects raw U+FFFD, so both are written as escapes.
const safeJson = (value) =>
  JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
    .replace(/\uFFFD/g, '\\ufffd');

async function main() {
  if (!TOKEN) throw new Error('NOCODB_TOKEN не задано у файлі .env');

  const tables = {};
  for (const entity of Object.keys(TABLES)) {
    const records = await fetchAllRecords(entity);
    tables[entity] = { records: records.map((r) => toSnapshotRecord(entity, r)) };
    console.log(`${entity.padEnd(14)} ${records.length}`);
  }

  const read = (file) => fs.readFileSync(path.join(PUBLIC_DIR, file), 'utf8');
  const body = read('index.html').match(/<body>([\s\S]*?)<script src="app\.js"><\/script>/);
  if (!body) throw new Error('Не вдалося знайти розмітку <body> у public/index.html');

  const snapshot = { fetchedAt: new Date().toISOString(), tables };
  const html = `<title>Облік замовлень</title>
<style>
${read('styles.css')}
</style>
${body[1].trim()}
<script type="application/json" id="snapshot">${safeJson(snapshot)}</script>
<script>
${read('app.js')}
</script>
`;

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, html);
  console.log(`\n${path.relative(process.cwd(), OUT_FILE)}: ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB, знімок від ${snapshot.fetchedAt}`);
}

main().catch((err) => {
  const fromNocoDB = err instanceof UpstreamError || err?.cause;
  console.error(fromNocoDB ? describeNetworkError(err) : err.message || err);
  process.exit(1);
});
