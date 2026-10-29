# Inquiry and CRM foundation

The website is an inquiry catalog. A successful submission creates a contact, an inquiry, an optional product link, a first activity, and one notification job in one database transaction. It does not create an order, take payment, reserve stock, or send an email.

The app supports a local bilingual sample catalog and request-time Supabase catalog reads. Staff sign-in, a CRM administration screen, staff write operations, and a notification worker remain separate implementation steps.

## Configuration

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Project API URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public | Prepared for future browser catalog/auth access under RLS; intake does not require it. |
| `SUPABASE_SECRET_KEY` | Server only | Modern Supabase secret API key used only by the inquiry server. Never prefix it with `NEXT_PUBLIC_`. |
| `INQUIRIES_ENABLED` | Server only | Must equal `true` to permit storage. Leave false/unset while reviewing sample content. |
| `SITE_ORIGIN` | Server only, optional | Exact public origin such as `https://example.com`, without a path or trailing slash. If omitted, the request URL origin is used. |

All three of the URL, secret key, and explicit enabled flag are required. Missing configuration produces `503 NOT_CONFIGURED`; it never produces a successful reference. The UI must retain the entered message and offer the store's known contact channel. Keep the switch off until the production store is ready to receive and follow up inquiries.

This code deliberately has no fallback from `SUPABASE_SECRET_KEY` to a legacy service-role environment variable. Supabase supports modern secret keys for server workloads; these bypass RLS and belong exclusively on the server. See [Supabase API key guidance](https://supabase.com/docs/guides/api/api-keys).

Use separate development/preview and production database projects and environment variables. Do not expose a production secret to an untrusted pull-request preview. This task has not created a project, configured secrets, applied a remote migration, or deployed the site.

## Database setup

1. Review `supabase/migrations/202610290001_foundation.sql` and apply it to a new development Supabase database using a database-owner connection or the SQL editor. The migration is transactional and should be applied once through migration tracking.
2. Run `node supabase/generate-seed.mjs` locally to generate `supabase/seed.sql` from `data/catalog.json`.
3. Review and apply the seed to the development database. It inserts samples only and does not overwrite existing product codes. Replaying it is safe. It never infers price, material, period, maker, weight, or stock from an image.
4. Test with the SQL assertions below and a development environment before enabling intake.

The sample seed is intentionally hidden from anonymous catalog queries. To publish a record, staff must verify its facts, set `verification_status='verified'`, publish the product, and publish each approved translation. A database constraint rejects a published but unverified product. The intake function accepts only published product codes. It will reject a sample/draft code as `UNKNOWN_PRODUCT`; general inquiries omit `productId`.

Set `CATALOG_SOURCE=supabase` with the project URL and server secret to read the database at request time. `CATALOG_INCLUDE_SAMPLES=true` allows `sample` + `needs_review` records only in the isolated test project, alongside published + verified products. Otherwise only published + verified products with both published translations appear. Explicit query projection and runtime validation exclude provenance, costs and private notes from browser props. A failed cloud read shows a generic bilingual error and never silently falls back to the local JSON file. File mode remains the local development default.

## Public request contract

`POST /api/inquiries` with `Content-Type: application/json` and `Idempotency-Key: <random UUID>`:

```json
{
  "name": "Бат Болд",
  "contactMethod": "email",
  "contactValue": "visitor@example.com",
  "message": "Энэ эдлэлийн талаар зөвлөгөө авах хүсэлтэй байна.",
  "locale": "mn",
  "productId": "TT-001",
  "website": ""
}
```

`productId` and `website` are optional. `website` is a hidden honeypot and must stay empty. `locale` is `mn` or `en`. `contactMethod` is `email` or `phone`.

Validation limits: trimmed name 2–100 characters; contact value 5–160 characters; message 10–2,000 characters; product code `TT-` followed by 3–6 digits. Emails must be syntactically valid. Phone values allow an optional leading `+` and common separators, at most 30 characters and 7–15 digits. The entire request is limited to 12,000 bytes, including streamed requests without Content-Length. Unknown fields are rejected, so callers cannot submit staff roles or a CRM stage.

Use a fresh idempotency key for a new submission. Keep it while retrying an unchanged message after a network failure; create a new key when the user edits the payload. Keys accept 16–128 letters, digits, underscores, or hyphens. Never reuse one key for unrelated visitors or messages.

| HTTP status | Result | UI behavior |
| --- | --- | --- |
| `201` | `{ "ok": true, "reference": "TT-…" }` | Newly saved inquiry; show the reference. |
| `200` | Same success shape | The same submission was already saved; show the original reference. |
| `400` | `VALIDATION_ERROR`, `INVALID_IDEMPOTENCY_KEY`, `INVALID_JSON`, or `UNKNOWN_PRODUCT` | Correct the relevant input or contact the store about the sample. |
| `403` | `ORIGIN_DENIED` | Request came from another browser origin. |
| `409` | `IDEMPOTENCY_CONFLICT` | Payload changed under the same key; use a new key. |
| `413` / `415` | `PAYLOAD_TOO_LARGE` / `UNSUPPORTED_MEDIA_TYPE` | Reduce the input or send JSON. |
| `429` | `RATE_LIMITED`, with `Retry-After: 900` | Keep the message; ask the visitor to try later. |
| `503` | `NOT_CONFIGURED` or `PERSISTENCE_UNAVAILABLE` | Keep the message and provide direct store contact. Never say it was sent. |

Responses are marked `Cache-Control: no-store`. Error responses do not expose Supabase error details, contact records, or keys. Origin checks are a browser boundary, not proof that an automated client is legitimate.

## Data and permissions

| Table | Purpose / access |
| --- | --- |
| `public.products`, `public.product_translations` | Public descriptive catalog only; anonymous users see published records/translations. Staff can read drafts according to their role. |
| `private.product_details` | Source provenance, review questions, cost and internal notes. Service access only in this foundation. |
| `private.staff_roles` | Server-controlled owner/sales/editor assignments. Customers and staff cannot assign themselves roles. |
| `private.contacts` | Contact name and preferred channel; marketing consent defaults false. No auth identity is attached from an unverified email or phone. |
| `private.inquiries`, `private.inquiry_items` | Inquiry queue and selected product. Stages: new, contacted, qualified, quoted, waiting, won, closed, spam. |
| `private.activities`, `private.tasks` | Activity trail and follow-up tasks. Only the initial creation activity is automated now. |
| `private.notification_jobs` | Transactional outbox. Every saved inquiry gets exactly one pending job. |
| `private.intake_rate_limits` | Persistent, HMAC-keyed intake counters. No raw contact details in the counter key. |

The `private` schema must remain outside Supabase's exposed API schemas. Owner role can read all CRM inquiries and contacts; sales can read only assigned inquiries and their related contact/items/activities/tasks; editor and ordinary authenticated accounts cannot read CRM data. Tables have RLS and explicit grants. There are no direct staff write grants in this foundation. A future CRM must use authenticated, authorized server operations and enforce these permissions; it must not trust a role or user ID supplied in a form.

Bootstrap the first owner through an administrator database connection after creating the actual Supabase Auth user. Substitute the known Auth UUID; do not accept the UUID or role from a public endpoint:

```sql
insert into private.staff_roles (user_id, role)
values ('REPLACE_WITH_ACTUAL_AUTH_USER_UUID'::uuid, 'owner');
```

The public `submit_inquiry` RPC is executable only by `service_role`. It has a fixed empty search path and schema-qualified data references. Anonymous and ordinary authenticated clients cannot call it. See [Supabase database function security](https://supabase.com/docs/guides/database/functions) and [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Reliability and operations

- A transaction-scoped advisory lock plus a unique idempotency key prevents duplicate records on retries. A payload fingerprint makes reuse of a key with different content an error. The check happens before the rate counter, so retries do not consume additional quota.
- A single transaction writes contact, inquiry, optional item, activity and notification job. A failure rolls them all back. A reference is returned only after the RPC succeeds.
- The API stops waiting for its database request after eight seconds. A network timeout can happen after the database has committed; retrying the unchanged request with its original key recovers the same reference.
- Unverified contact strings are never used to attach a visitor to a previous customer's history. Each new inquiry gets a new contact record. Any future merge must be a reviewed staff operation.
- A normalized contact channel is limited to five new inquiries per 15-minute window in the database, across server instances. This does not stop attackers rotating contact addresses. Before public launch, add and test deployment-level request throttling/bot protection and agree on the store's abuse response and data retention settings.
- The outbox does not yet send mail. A future worker must claim jobs safely, retry transient failures and deduplicate delivery by job ID. Until then, staff must review the database queue; do not promise email alerts.
- The secret key is used to HMAC the rate key. Rotating it changes rate buckets; old counters are not reused. Old rate rows and customer records need an agreed retention/cleanup process before production.

## Verification

HTTP tests run with `npm test` (or `node --import tsx --test tests/inquiries.test.ts`). They exercise unavailable storage, persistence failures, confirmation behavior, retries, throttling, unpublished products, strict validation, origins and body limits.

`supabase/tests/inquiry_security.sql` is an integration assertion script for a disposable local/test Supabase database after the migration. Run it as the database owner with stop-on-error enabled. It creates synthetic users/data inside a transaction and rolls everything back. It tests real RPC writes, retry deduplication, outbox creation, rollback, rate counters, public visibility and owner/sales/editor/customer/anonymous access boundaries. Do not run test fixtures on the production project.

For a local PostgreSQL engine without Docker, an optional PGlite harness is included:

```sh
npm install --prefix /private/tmp/tavan-tansag-sql-check --ignore-scripts --no-audit --no-fund @electric-sql/pglite
TAVAN_SQL_TEST_MODULE=/private/tmp/tavan-tansag-sql-check/node_modules/@electric-sql/pglite/dist/index.js node supabase/tests/run-sql-check.mjs
```

This harness uses an isolated in-memory database and emulates the relevant Supabase roles and `auth.uid()` contract. It validates PostgreSQL DDL, transactional behavior, grants and RLS. It does not validate the live Supabase API, JWT verification, real concurrent database connections, deployment configuration or email delivery. Those checks remain required in the development project before launch.
