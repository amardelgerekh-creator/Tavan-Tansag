# Firebase catalog and inquiry foundation

The selected stack is GitHub, Firebase and Vercel. Firebase project: `tavan-tansag-30560` (Spark). The chosen Firestore database is `tavan-tansag-preview`, using Enterprise Native mode in Tokyo (`asia-northeast1`). Choosing these settings does not confirm that the remote database has been created, seeded or tested.

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

## Remote setup still to verify

1. Authenticate the approved Firebase CLI account and verify project `tavan-tansag-30560`.
2. Create or inspect the named Enterprise Native database `tavan-tansag-preview` in `asia-northeast1`. Confirm its actual edition and API mode before applying the integration.
3. Review and apply rules that allow only the intended public catalog reads, deny public writes and protect every other collection.
4. Review `firebase/seed.json`: it contains only sanitized sample documents. `firebase/seed-write.json` is the create-only REST commit payload; existing documents must not be overwritten by an initial import.
5. Import the reviewed samples with an authorized administrative tool. Never place a privileged token in Vercel solely to support public catalog reads.
6. Test real anonymous reads, denied writes, private-collection denial, sample filtering, error behavior and absence of raw provenance.
7. Set `CATALOG_SOURCE=firebase` with the project/database IDs in the isolated Vercel preview and verify the deployed pages. Keep indexing and inquiries off.

The selected Spark plan and database edition are deployment constraints to verify with the actual project. Do not interpret the integration code as confirmation of quotas, entitlement, billing status or successful provisioning.

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
