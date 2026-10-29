import "server-only";
import { ExternalAccountClient } from "google-auth-library";
import { getVercelOidcToken } from "@vercel/oidc";
import { privateStorageConfigured } from "./inquiry-config";
import { createFirestoreGateway, PrivateStoreError } from "./firestore-protocol";

let authClient: ReturnType<typeof ExternalAccountClient.fromJSON>;

/** Keyless Vercel OIDC -> Google STS -> least-privilege service account. */
export async function getGoogleAccessToken(): Promise<string> {
  if (!privateStorageConfigured()) throw new PrivateStoreError("NOT_CONFIGURED");
  if (!authClient) {
    const audience = `//iam.googleapis.com/projects/${process.env.GCP_PROJECT_NUMBER}/locations/global/workloadIdentityPools/${process.env.GCP_WORKLOAD_IDENTITY_POOL_ID}/providers/${process.env.GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID}`;
    authClient = ExternalAccountClient.fromJSON({
      type: "external_account",
      audience,
      subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
      token_url: "https://sts.googleapis.com/v1/token",
      service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${process.env.GCP_SERVICE_ACCOUNT_EMAIL}:generateAccessToken`,
      subject_token_supplier: { getSubjectToken: () => getVercelOidcToken() },
    });
    if (!authClient) throw new PrivateStoreError();
    authClient.scopes = ["https://www.googleapis.com/auth/datastore"];
  }
  try {
    const result = await authClient.getAccessToken();
    if (!result.token) throw new PrivateStoreError();
    return result.token;
  } catch {
    // Never expose token exchanges, bearer tokens or GCP response bodies.
    throw new PrivateStoreError();
  }
}

export function privateFirestore() {
  if (!privateStorageConfigured()) throw new PrivateStoreError("NOT_CONFIGURED");
  return createFirestoreGateway({
    projectId: process.env.FIREBASE_PROJECT_ID!,
    databaseId: process.env.FIRESTORE_DATABASE_ID!,
    accessToken: getGoogleAccessToken,
  });
}
