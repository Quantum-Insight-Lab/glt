/** SQL executor for the audit store. The dialect is PostgreSQL. */
export interface SqlExec {
  readonly query: (
    sql: string,
    params?: readonly unknown[],
  ) => Promise<readonly Record<string, unknown>[]>;
  readonly exec: (sql: string) => Promise<void>;
}
