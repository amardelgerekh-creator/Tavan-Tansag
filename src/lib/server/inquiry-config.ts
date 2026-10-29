/** No credentials are read by the browser; used only by server availability checks. */
type ServerEnvironment = Record<string, string | undefined>;

export function privateStorageConfigured(env: ServerEnvironment = process.env): boolean {
  return Boolean(
    /^[a-z][a-z0-9-]{4,62}$/.test(env.FIREBASE_PROJECT_ID ?? "") &&
    /^[a-zA-Z0-9_-]+$/.test(env.FIRESTORE_DATABASE_ID ?? "") &&
    /^\d+$/.test(env.GCP_PROJECT_NUMBER ?? "") &&
    /^[a-zA-Z0-9_-]+$/.test(env.GCP_WORKLOAD_IDENTITY_POOL_ID ?? "") &&
    /^[a-zA-Z0-9_-]+$/.test(env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID ?? "") &&
    /^[a-zA-Z0-9_-]+@[a-zA-Z0-9-]+\.iam\.gserviceaccount\.com$/.test(env.GCP_SERVICE_ACCOUNT_EMAIL ?? ""),
  );
}

export function defaultAssignee(env: ServerEnvironment = process.env): string {
  return (env.CRM_DEFAULT_ASSIGNEE || env.STAFF_EMAILS?.split(",")[0] || "").trim().toLowerCase();
}

export function intakeConfigured(env: ServerEnvironment = process.env): boolean {
  return env.INQUIRIES_ENABLED === "true" && privateStorageConfigured(env) &&
    (env.INQUIRY_HASH_SECRET?.length ?? 0) >= 32 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(defaultAssignee(env));
}
