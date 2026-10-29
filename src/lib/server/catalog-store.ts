import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { readCatalog } from "./catalog-reader";
import { fetchFirestoreCatalog } from "./firestore-catalog";
import { getLocalCatalog } from "./local-catalog";

// React cache shares one read across metadata and page rendering for the same
// request. There is no cross-request cache of sample or publication status.
export const getCatalog = cache(async () => {
  const source = process.env.CATALOG_SOURCE;
  if (source === "firebase") await connection();
  return readCatalog(
    {
      source,
      includeSamples: process.env.CATALOG_INCLUDE_SAMPLES,
      projectId: process.env.FIREBASE_PROJECT_ID,
      databaseId: process.env.FIRESTORE_DATABASE_ID,
    },
    {
      file: getLocalCatalog,
      query: fetchFirestoreCatalog,
    },
  );
});
