import { readFile } from "node:fs/promises";

// Optional local test tool; not a website/runtime dependency. See docs/backend.md.
const { PGlite } = await import(
  process.env.TAVAN_SQL_TEST_MODULE || "@electric-sql/pglite"
);
const db = new PGlite();
try {
  // Emulate the relevant Supabase roles and auth.uid() contract in an isolated PostgreSQL engine.
  // This does not simulate PostgREST, JWT verification, email delivery, or concurrent connections.
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
  `);
  await db.exec(
    await readFile(
      new URL("../migrations/202610290001_foundation.sql", import.meta.url),
      "utf8",
    ),
  );
  console.log("Migration: valid PostgreSQL DDL.");
  await db.exec(
    await readFile(new URL("./inquiry_security.sql", import.meta.url), "utf8"),
  );
  console.log(
    "SQL assertions: intake, retry, rollback, rate limit and role boundaries passed.",
  );
  const remaining = await db.query(
    "select count(*)::int as count from private.inquiries",
  );
  if (remaining.rows[0].count !== 0)
    throw new Error("Fixtures were not rolled back.");
  try {
    const seed = await readFile(
      new URL("../seed.sql", import.meta.url),
      "utf8",
    );
    await db.exec(seed);
    const before = await db.query(
      "select count(*)::int as count from public.products",
    );
    await db.exec(seed);
    const after = await db.query(
      "select count(*)::int as count from public.products",
    );
    if (before.rows[0].count !== after.rows[0].count)
      throw new Error("Replaying the seed duplicated products.");
    const privateCount = await db.query(
      "select count(*)::int as count from private.product_details",
    );
    if (privateCount.rows[0].count !== before.rows[0].count)
      throw new Error("Seed source metadata is missing.");
    await db.exec("set role anon;");
    const visible = await db.query(
      "select count(*)::int as count from public.products",
    );
    if (visible.rows[0].count !== 0)
      throw new Error("Seed exposed samples to anonymous users.");
    console.log(
      `Seed: ${before.rows[0].count} private sample records, replay-safe and hidden from anonymous users.`,
    );
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    console.log("Seed: not generated yet; skipped.");
  }
} finally {
  await db.close();
}
