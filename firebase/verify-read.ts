import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readCatalog } from "../src/lib/server/catalog-reader";
import { fetchFirestoreCatalog } from "../src/lib/server/firestore-catalog";

// Read-only smoke test against the deployed preview Rules. No IAM/Auth tokens.
const config = {
  source: "firebase",
  includeSamples: "true",
  projectId: process.env.FIREBASE_PROJECT_ID ?? "tavan-tansag-30560",
  databaseId: process.env.FIRESTORE_DATABASE_ID ?? "tavan-tansag-preview",
};
const dependencies = { file: () => { throw new Error("Cloud verification must never use local fallback."); }, query: fetchFirestoreCatalog };
async function main() {
  const products = await readCatalog(config, dependencies);
  const expected: { id: string }[] = JSON.parse(readFileSync("firebase/seed.json", "utf8"));
  assert.deepEqual(products.map((p) => p.id), expected.map((p) => p.id));
  assert.equal(products.every((p) => p.publicationStatus === "sample" && p.verificationStatus === "needs_review"), true);
  assert.equal(JSON.stringify(products).includes("drive.google.com"), false);
  const published = await readCatalog({ ...config, includeSamples: "false" }, dependencies);
  assert.deepEqual(published, []);
  console.log(`Verified ${products.length} Firebase sample documents via unauthenticated Rules-protected REST; production-only query returns zero samples.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Firebase verification failed.");
  process.exitCode = 1;
});
