/** PostgreSQL DDL for immutable snapshot identity + content-addressed JSONB. */
export const SNAPSHOT_SCHEMA = `
CREATE TABLE IF NOT EXISTS snapshot_blobs (
  digest TEXT PRIMARY KEY,
  body JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS snapshots (
  snapshot_id TEXT PRIMARY KEY,
  digest TEXT NOT NULL REFERENCES snapshot_blobs (digest)
);

CREATE OR REPLACE FUNCTION glt_forbid_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'glt: relation is immutable';
END;
$$;

DROP TRIGGER IF EXISTS snapshot_blobs_no_mutate ON snapshot_blobs;
CREATE TRIGGER snapshot_blobs_no_mutate
  BEFORE UPDATE OR DELETE ON snapshot_blobs
  FOR EACH ROW EXECUTE FUNCTION glt_forbid_mutation();

DROP TRIGGER IF EXISTS snapshots_no_mutate ON snapshots;
CREATE TRIGGER snapshots_no_mutate
  BEFORE UPDATE OR DELETE ON snapshots
  FOR EACH ROW EXECUTE FUNCTION glt_forbid_mutation();
`;
