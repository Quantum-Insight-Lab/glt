import { PGlite } from "@electric-sql/pglite";
import type { SqlExec } from "@glt/snapshot";

export async function openPglite(): Promise<{ sql: SqlExec; close: () => Promise<void> }> {
  const db = new PGlite();
  return {
    sql: {
      async query(sql, params = []) {
        const result = await db.query<Record<string, unknown>>(sql, [...params]);
        return result.rows;
      },
      async exec(sql) {
        await db.exec(sql);
      },
    },
    close: () => db.close(),
  };
}
