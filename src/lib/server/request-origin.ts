const productionOrigins = new Set([
  "https://tavantansag.com",
  "https://tavan-tansag-preview.vercel.app",
]);

/** Exact known production aliases only; configured environments never trust the request host. */
export function requestOriginAllowed(request: Request, configured?: string, allowMissing = false): boolean {
  const origin = request.headers.get("origin");
  if (origin === null) return allowMissing;
  if (configured && productionOrigins.has(configured)) return productionOrigins.has(origin);
  // The request URL fallback is for local development without SITE_ORIGIN.
  return origin === (configured ?? new URL(request.url).origin);
}
