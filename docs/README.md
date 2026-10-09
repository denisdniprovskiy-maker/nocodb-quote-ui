# Облік замовлень — Quote Order Management UI

A read-only web UI, in Ukrainian, for the NocoDB CRM base `pbje4jyruzt4csb`. It covers
Quotes, Opportunities, Products, Companies, Contacts and Activity.

## Run

Requires Node.js 22.15+ (no npm dependencies).

1. Copy `.env.example` to `.env` and put your NocoDB API token into `NOCODB_TOKEN`.
   `.env` is git-ignored; never commit it.
2. Start the server:

   ```bash
   npm start
   ```

3. Open http://127.0.0.1:5180.

`npm start` runs `node --use-system-ca server.js`. The flag makes Node trust the operating
system's certificate store. Without it, HTTPS calls to NocoDB fail with
`UNABLE_TO_VERIFY_LEAF_SIGNATURE` on machines where antivirus software or a corporate proxy
re-signs HTTPS traffic.

## Claude Artifact (snapshot)

The same UI can be published as a Claude Artifact. Artifact pages can't call external
hosts, so this version embeds a **snapshot** of the data and never contacts NocoDB.
Build it with:

```bash
npm run build:artifact
```

That command writes `dist/oblik-zamovlen.html` (git-ignored, because it contains the
data), which is then published as the artifact. Only the fields the UI displays are
included in the snapshot. Anyone who can open the artifact can read that data.

## Configuration (`.env`)

| Variable         | Required | Default                  |
|------------------|----------|--------------------------|
| `NOCODB_TOKEN`   | yes      | —                        |
| `NOCODB_URL`     | no       | `https://app.nocodb.com` |
| `NOCODB_BASE_ID` | no       | `pbje4jyruzt4csb`        |
| `PORT` / `HOST`  | no       | `5180` / `127.0.0.1`     |

## How it works

- `server.js` serves `public/` and exposes `GET /api/records/:entity`. It pages through
  NocoDB (100 rows per request) and caches each table for 5 minutes. The **Оновити**
  button forces a reload.
- The token stays on the server. The browser never receives it.
- **Read-only:** the server rejects every method except GET/HEAD with `405`, and it only
  issues GET requests to NocoDB.
- NocoDB Cloud allows 5 requests/second per user and blocks for 30 s on a 429. The
  server sends requests one at a time, about 2 per second, and pauses the whole queue
  on a 429. A cold start takes roughly 10–15 s.
- Relations are resolved in the browser. Real link fields are used where they exist.
  Text code references (e.g. `Opportunities.Company`) are matched by code; 10-digit
  rounded float IDs count as a match. A reference that can't be matched is shown with a
  dashed underline.
