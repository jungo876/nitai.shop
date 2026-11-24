import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

/**
 * Starts a throw-away, in-memory PostgreSQL (PGlite) behind a local TCP socket
 * so the real `postgres` driver can talk to it exactly as it talks to Supabase.
 *
 * The Supabase roles our migrations reference (anon, authenticated,
 * service_role) are created first so policies/grants can be tested.
 */
export async function startTestDb() {
  const pg = await PGlite.create();
  await pg.exec(`
    do $$ begin
      if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
      if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
    end $$;
  `);
  const server = new PGLiteSocketServer({ db: pg, port: 0, host: "127.0.0.1" });
  await server.start();
  const url = `postgres://postgres:postgres@${server.getServerConn()}/postgres`;
  return {
    url,
    pg,
    async stop() {
      await server.stop();
      await pg.close();
    },
  };
}
