# Custom domain: tavantansag.com

Configured 29 October 2026 for Vercel team `tavan-tansag`, project `tavan-tansag-preview`.

## DNS at GoDaddy

| Type | Name | Value | TTL |
| --- | --- | --- | --- |
| A | @ | 216.198.79.1 | 1 hour |
| A | @ | 64.29.17.1 | 1 hour |
| CNAME | www | b01846780b9e5025.vercel-dns-017.com. | 1 hour |

These values came from `vercel domains verify` for this project, not a generic DNS example. The old GoDaddy `WebsiteBuilder Site` A entry was replaced. GoDaddy nameservers `ns35.domaincontrol.com` and `ns36.domaincontrol.com`, SOA, `_domainconnect` and `_dmarc` records remain unchanged. No MX or AAAA records were present before the change. No registrar transfer or nameserver change was performed.

## Vercel

- Both apex and www are verified project domains, with valid DNS configuration.
- `www.tavantansag.com` redirects to `tavantansag.com` with HTTP 308, preserving path and query.
- Production-only `NEXT_PUBLIC_SITE_URL=https://tavantansag.com` is configured. Preview/Development values were not modified.
- `SITE_ORIGIN` remains absent; current request-origin validation already supports the custom domain.
- Production rebuilt and deployed as `dpl_EQujWYUnzusdjVxhueJGaeR7gsrS` (READY).
- The existing `SITE_INDEXABLE=false`, Firebase settings and inactive inquiry flow remain unchanged.

## Verification

Google Public DNS and Cloudflare DNS both returned the new apex A records and www CNAME. Vercel reported both domains configured correctly and verified.

HTTPS was tested with ordinary certificate verification using `curl --resolve` against the verified Vercel IP addresses because this computer's default resolver/browser still returned the old GoDaddy site during propagation. No TLS verification bypass was used.

- `https://tavantansag.com/` returned 307 to `/mn`.
- `/mn` returned 200, the branded website, canonical `https://tavantansag.com/mn`, and noindex/nofollow.
- MN and EN catalogs returned 200 with exactly 10 unique product links each and canonical URLs on the new domain.
- Requests were tested on both apex IP addresses.
- `https://www.tavantansag.com/en/collection?category=saddles` returned 308 to `https://tavantansag.com/en/collection?category=saddles` with a valid certificate.
- `/robots.txt` returned 200 and `Disallow: /`.

At completion, this computer's browser still showed the former GoDaddy landing page due to cached DNS. This is a propagation limitation, not a claim that the new domain rendered in that browser. GoDaddy indicated updates generally take effect within an hour and may take up to 48 hours globally.

Saved DNS readback screenshot: `docs/previews/godaddy-domain-connected.png`.
