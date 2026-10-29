# Firebase catalog and inquiry foundation

The selected stack is GitHub, Firebase and Vercel. Firebase project: `tavan-tansag-30560` (Spark). The named Firestore database `tavan-tansag-preview` is confirmed as `ENTERPRISE`, `FIRESTORE_NATIVE`, Tokyo (`asia-northeast1`), with `freeTier=true`. Firebase CLI/MCP authentication, rules compilation/deployment, sample import, direct remote access checks and the deployed website's Firestore catalog reads have succeeded.

The current Firebase integration covers a sanitized, read-only catalog. **Firebase inquiry storage, staff authentication, CRM permissions and notification delivery are not implemented.** The inquiry service remains disabled even if `INQUIRIES_ENABLED=true` is set.

## Configuration

| Variable | Purpose |
|---|---|
| `CATALOG_SOURCE` | `file` for local development; `firebase` for Firestore reads. |
| `CATALOG_INCLUDE_SAMPLES` | `true` includes explicitly marked samples in an isolated preview; `false` is the default. This does not grant database access. |
| `FIREBASE_PROJECT_ID` | `tavan-tansag-30560`. Server configuration, not a credential. |
| `FIRESTORE_DATABASE_ID` | `tavan-tansag-preview`. A named database, not `(default)`. |
| `INQUIRIES_ENABLED` | Keep `false`. The Firebase storage implementation is absent, so changing this cannot enable intake. |
| `SITE_INDEXABLE` | Keep `false` for sample content. Search directives are not access control. |
| `NEXT_PUBLIC_SITE_URL` | Site URL for metadata; if omitted, the app uses Vercel's deployment URL when available. |
| `SITE_ORIGIN` | Optional exact origin for browser inquiry requests, with no path or trailing slash. |

Catalog reads require no API key or service-account credential. The server calls the Firestore Enterprise Native REST pipeline as an unauthenticated reader, subject to the database's access rules. Keep all privileged write credentials outside the app's public environment, source code and browser bundles.

Place local values in the root `.env.local`, not under `src/`. Set equivalent values for the intended Vercel environment. Do not give production data access to an untrusted preview.

## Public catalog boundary

`catalog_public` must contain **only information intended for public disclosure**: the record code, slug, category, bilingual name/description/observations, image path, verification/publication status and approved descriptive attributes. It must never contain customer details, internal notes, cost, Drive source links or review questions.

A field projection in a query is not field-level security. Anyone authorized to read a document can potentially request that document through another supported query. The security boundary is the sanitized collection plus restrictive database rules. Raw provenance stays in the server-side source records; runtime validation also strips it before browser props are created. Repository access is a separate boundary.

The publication rules distinguish `sample` + `needs_review` from `published` + `verified`. Both Mongolian and English content are required. In an isolated preview, sample records may be deliberately readable; a production rule set must exclude them. No anonymous write access is required.

The cloud reader validates the returned public shape, uses a request-time read and reports a catalog-unavailable state on configuration, provider or data errors. It never disguises a failed Firebase read by displaying the local file instead. `CATALOG_SOURCE=file` remains an explicit offline development mode.

## Verified remote setup and deployment

- Firebase CLI and MCP are authenticated with the approved account `amardelgerekh@gmail.com`; the target project and named database were verified.
- The CLI rules dry run compiled successfully, followed by a successful rules deployment.
- Ten sanitized `catalog_public` documents were committed at `2026-10-29T08:38:55.427302Z` with create-only preconditions. An administrative reread exactly matched the reviewed seed. `firebase/seed.json` contains the sanitized records; `firebase/seed-write.json` is the initial create-only REST commit payload. Do not overwrite existing documents when replaying an initial import.
- `verify-read.ts` passed against the actual remote database: the allowed anonymous sample query returned 10 records, while the published-only query returned 0.
- `verify-access.ts --probe-writes` confirmed the exact 10 public documents and allowed fields. Unfiltered, incomplete and draft catalog queries returned 403. Reads of private inquiries, customers and nested private data returned 403. Two anonymous create probes returned 403 and created no documents.
- Vercel Production and Preview now have `CATALOG_SOURCE=firebase`, `CATALOG_INCLUDE_SAMPLES=true`, `FIREBASE_PROJECT_ID=tavan-tansag-30560` and `FIRESTORE_DATABASE_ID=tavan-tansag-preview`. No Firebase secret key is used. Indexing and inquiries remain disabled.

Code commit `7316e3b` was deployed through GitHub. Vercel deployment `dpl_BEhYd2F7vfK4aiVQgDwdmc3eoQqv` is READY at [tavan-tansag-preview.vercel.app](https://tavan-tansag-preview.vercel.app). Build logs confirm that catalog, home, inquiry and product routes render dynamically on demand. Both language catalogs returned 10 distinct product slugs; the checked home, catalog, product and inquiry pages returned HTTP 200 with `private, no-cache, no-store` responses. Online browser inspection confirmed the visible 10-item catalog. Pages remain noindex, robots disallows crawling, and the inquiry API returns `503 NOT_CONFIGURED` while its form is disabled.

Both Vercel environments currently target the same sample-only preview database. The Vercel environment name “Production” does not make this a real customer-data production system. Use a separately reviewed data and rules boundary before introducing real customer information or opening inquiries. No billing upgrade was performed.

## Inquiry API: prepared contract, unavailable persistence

`POST /api/inquiries` accepts JSON with an `Idempotency-Key` header. The prepared fields are name, contact method, contact value, message, locale, optional product code and an empty honeypot field.

Validation covers the supported fields, name/contact/message lengths, email or phone syntax, locale, product-code shape, origin and a bounded request body. Errors return no provider credentials or customer records. Origin checks are a browser boundary, not proof that an automated client is legitimate.

For a well-formed request, the current service returns `503`, `ok:false`, `NOT_CONFIGURED`. It creates **no** contact, inquiry, stock reservation, payment, order or notification. The page disables submission and offers the store's known Facebook contact. The API stays closed independently of the UI and enabled flag.

Success, retry and throttling branches may be exercised through injected synthetic test dependencies. Those tests establish the HTTP contract only; they do not establish Firebase transactions, idempotency, rate limiting or access controls.

## Firebase work required before opening intake

- Implement atomic inquiry/contact/activity writes with durable idempotency and payload-conflict handling.
- Enforce bot and abuse controls, including rate limits shared across server instances.
- Add staff identity, server-controlled roles and record-level authorization for owner, sales and editor workflows.
- Build protected CRM read/write screens. Unverified contact strings must not automatically grant access to an existing customer's history.
- Add a notification outbox and delivery worker with safe retries; no email delivery is present now.
- Agree on data minimization, retention, deletion handling, backup/recovery and the final privacy notice.
- Verify these behaviors against the actual isolated Firebase environment before enabling any public intake path.

Earlier PostgreSQL/Supabase migration or PGlite results do not validate Firebase. Current verification evidence and its limits belong in `docs/verification.md`.
