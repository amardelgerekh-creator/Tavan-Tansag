# Firebase catalog, inquiries and staff CRM

The stack is GitHub, Firebase and Vercel. Firebase project `tavan-tansag-30560` uses Spark. Existing database `tavan-tansag-preview` is Enterprise Native in Tokyo (`asia-northeast1`). Its name is retained; it now also holds production enquiries in private collections. No billing upgrade was made.

## Public catalog

`catalog_public` contains ten sample records. Public reads use unauthenticated Firestore Enterprise REST pipelines constrained by deployed Security Rules. Private source/provenance fields are excluded from these documents. Anonymous writes and all private-collection access remain denied. Public catalog reads never use privileged credentials. Samples remain `sample` / `needs_review`; no price, material, age, availability or maker was invented. `SITE_INDEXABLE=false` remains appropriate until the store verifies them.

## Private storage and identity

Private collections: `inquiries`, nested `inquiries/{reference}/activity`, `inquiry_keys`, `inquiry_limits`, `catalog_reviews`, nested `catalog_reviews/{id}/activity`. Direct client reads/writes remain denied. Only server code uses Google Workload Identity Federation:

- Vercel issuer: `https://oidc.vercel.com/tavan-tansag`.
- Audience: `https://vercel.com/tavan-tansag`.
- Pool/provider: `tavan-vercel` / `vercel`, project number `1081274110553`.
- Exact allowed subject: `owner:tavan-tansag:project:tavan-tansag-preview:environment:production`.
- Service account: `tavan-website@tavan-tansag-30560.iam.gserviceaccount.com`.
- `roles/iam.workloadIdentityUser` granted only to that exact production principal.
- `roles/datastore.user` limited by IAM condition to `projects/tavan-tansag-30560/databases/tavan-tansag-preview`.

No service-account key exists. Preview/development identities have no private-data grant. This is server-side IAM authorization; Firestore Rules continue to protect unauthenticated/client requests. The service account can access data throughout this named database, so authorization and strict field validation remain required on every staff endpoint.

## Intake

`POST /api/inquiries` validates origin, JSON/body size, contact information, known public product, and retry key. It acknowledges success only after committing the enquiry, private idempotency record, two rate counters and creation audit together. A replay returns the original reference; changed content with the same key receives 409. Limits are three requests per normalized contact and ten per server-derived IP per fifteen-minute window. Contact/IP indexes use keyed hashes; raw IPs are not stored in enquiry documents. Limits are durable across server instances. These controls reduce simple abuse; they are not a CAPTCHA or a guarantee against distributed attacks.

Each request is initially assigned to the first `STAFF_EMAILS` entry (or `CRM_DEFAULT_ASSIGNEE` when configured). It is a consultation request, not a reservation or payment. No email/SMS is automatically sent; staff must check the CRM. Keeping notification delivery separate avoids reporting messages as delivered when no delivery provider exists.

## Staff

Routes: `/mn/staff`, `/en/staff`. Firebase web app: `1:1081274110553:web:455d2bb7d5f79f6f7dd748`. Only Google sign-in is enabled. Public web API/app identifiers are passed to the login component; no private credential is sent to the browser.

Every staff API call verifies a signed Firebase token (RS256, project audience/issuer, expiry and auth time), verified Google-provider email and explicit server allowlist. Current account lookup rejects disabled users and revoked sessions. No customer access is granted merely by knowing an email or reference. Client auth uses memory-only persistence. Responses are private/no-store and contain no public cacheable customer data.

`GET /api/staff/inquiries` supports status filters and stable pagination. `PATCH /api/staff/inquiries/{reference}` accepts only status, assignee, follow-up date, staff notes and expected revision. Assignee must be an allowed staff email. Customer fields are immutable through this endpoint. Concurrent edits return 409 instead of overwriting, and successful updates append an audit event atomically.

The initial staff allowlist is the authenticated project owner's Google account. Add additional staff only after the owner authorizes their exact Google addresses. Removal from `STAFF_EMAILS` takes effect when deployment configuration is applied; disabling/revoking Firebase access is checked on each API request. All allowed staff currently have the same enquiry-management permissions; there is no separate editor/manager role UI.

## Configuration

See `.env.example`. Production requires `INQUIRIES_ENABLED=true`, the five project/WIF identifiers, `INQUIRY_HASH_SECRET` (at least 32 random characters), `STAFF_EMAILS`, `FIREBASE_WEB_API_KEY`, and `FIREBASE_WEB_APP_ID`. Hash secret is stored as a Vercel sensitive environment variable. Do not rotate it casually: existing replay/rate records use the old keyed hashes. No secret is committed to Git.

Local preview uses the catalog fixture and closed intake by default. A localhost Google domain does not grant localhost private storage access. Firebase's deployed auth provider and authorized-domain configuration must be verified separately; this CLI version did not apply `auth.authorizedDomains`, so the exact production domains were also applied through the Auth Admin API.

## Operating limits and next work

### Catalog verification and operational reports (2026-10-30)

`GET /api/staff/catalog` loads the ten source-linked items and private review drafts only after staff authentication. `PATCH /api/staff/catalog/{id}` checks same origin, bounded strict JSON and expected revision. Draft saves update only private review+audit. Explicit publication requires bilingual names/descriptions, material, dimensions, condition, a price policy, availability, information/photo owners, evidence notes and current-reviewer facts/rights/distinct-item attestations. It commits public allowlisted fields, private review and audit together. Condition and priceMode are optional backward-compatible public additions. No existing item is automatically verified; unknown optional maker/age/weight remain null.

`GET /api/staff/metrics?days=7|30|90` authenticates staff then runs one Enterprise grouped aggregate query over all enquiries created in the selected rolling period. Counts are independent of list pagination; a group-limit sentinel fails instead of showing truncated totals. Output contains only counts/product IDs/status/language and follow-up categories, no names or contact data. Won means staff-marked sale, not independently verified payment or revenue. No page-view tracker or third-party analytics was added.

Inquiry `purpose` is a validated optional enum (general/visit/gift/international/care). New records store it; older records display general. General requests retain the previous replay fingerprint to preserve retries across the deployment. Other purpose changes conflict with reuse of the same key. Public service links carry purpose through language switching.

Sitemap includes services and the four guides only when SITE_INDEXABLE is deliberately enabled; unverified item pages remain excluded. Staff paths are disallowed in robots even in indexable mode. Optional GOOGLE_SITE_VERIFICATION accepts a real Search Console ownership code, but no code or verified ownership is invented.

The store must verify all ten catalog entries and supply additional actual views, specifications, stock and price policy. Single source images are zoomable, not fabricated multi-view galleries. Unverified pages stay excluded from search indexing. No marketing analytics, automatic email/SMS, inventory sync or online payment was added.

Data-retention duration and deletion procedures must be agreed with the store. Current application does not automatically delete enquiries, audit records or anti-abuse documents. A deletion request must be handled by an authorized operator across its enquiry/activity/replay data. Avoid putting unrelated sensitive information in staff notes. Backups, notification delivery and expanded staff roles require their own verified operational setup.
