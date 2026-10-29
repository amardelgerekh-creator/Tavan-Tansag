import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { readCatalog } from "./catalog-reader";
import { getLocalCatalog } from "./local-catalog";

// React cache shares one read across metadata and page rendering for the same
// request. There is no cross-request cache of sample or publication status.
export const getCatalog = cache(async () => {
  const source = process.env.CATALOG_SOURCE;
  if (source === "supabase") await connection();
  return readCatalog(
    {
      source,
      includeSamples: process.env.CATALOG_INCLUDE_SAMPLES,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      secretKey: process.env.SUPABASE_SECRET_KEY,
    },
    {
      file: getLocalCatalog,
      query: async ({ url, secretKey, select, filter }) => {
        const client = createClient(url, secretKey, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            fetch: (input, init) =>
              fetch(input, { ...init, cache: "no-store" }),
          },
        });
        const { data, error } = await client
          .from("products")
          .select(select)
          .or(filter)
          .order("code")
          .limit(1000)
          .abortSignal(AbortSignal.timeout(8000));
        if (error) throw error;
        return data;
      },
    },
  );
});
