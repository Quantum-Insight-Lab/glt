/** PostgreSQL DDL for an append-only audit JSONB table. */
export const AUDIT_SCHEMA = `
CREATE TABLE IF NOT EXISTS audit_records (
  seq BIGSERIAL PRIMARY KEY,
  record_id TEXT NOT NULL UNIQUE,
  record_hash TEXT NOT NULL,
  prev_hash TEXT NOT NULL,
  body JSONB NOT NULL
);

CREATE OR REPLACE FUNCTION glt_forbid_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'glt: relation is immutable';
END;
$$;

DROP TRIGGER IF EXISTS audit_records_no_mutate ON audit_records;
CREATE TRIGGER audit_records_no_mutate
  BEFORE UPDATE OR DELETE ON audit_records
  FOR EACH ROW EXECUTE FUNCTION glt_forbid_mutation();
`;
