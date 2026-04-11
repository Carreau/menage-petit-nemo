-- Audit log of every change to families, saturdays and assignments.
-- Family names are denormalized so log rows survive a family deletion.

CREATE TABLE IF NOT EXISTS audit_log (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  at             TEXT    NOT NULL DEFAULT (datetime('now')),
  action         TEXT    NOT NULL,   -- "claim", "release", "family_create", ...
  actor          TEXT,                -- "family" or "admin"
  family_id      INTEGER,             -- nullable (e.g. reset_assignments)
  family_name    TEXT,                -- denormalized snapshot
  saturday_date  TEXT,                -- ISO YYYY-MM-DD, nullable
  slot           INTEGER,             -- 1 or 2, nullable
  details        TEXT                 -- optional JSON blob for extras
);

CREATE INDEX IF NOT EXISTS idx_audit_log_at ON audit_log(at);
