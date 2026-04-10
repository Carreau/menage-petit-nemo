-- Initial schema for the Petit Nemo cleaning scheduler.

CREATE TABLE IF NOT EXISTS families (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  name    TEXT    NOT NULL,
  quota   INTEGER NOT NULL DEFAULT 4,
  active  INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS saturdays (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  date   TEXT    NOT NULL UNIQUE,       -- ISO YYYY-MM-DD
  note   TEXT,
  closed INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS assignments (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  saturday_id  INTEGER NOT NULL REFERENCES saturdays(id) ON DELETE CASCADE,
  family_id    INTEGER NOT NULL REFERENCES families(id)  ON DELETE CASCADE,
  slot         INTEGER NOT NULL CHECK (slot IN (1, 2)),
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (saturday_id, slot)
);

CREATE INDEX IF NOT EXISTS idx_assignments_family  ON assignments(family_id);
CREATE INDEX IF NOT EXISTS idx_assignments_sat     ON assignments(saturday_id);
CREATE INDEX IF NOT EXISTS idx_saturdays_date      ON saturdays(date);

CREATE TABLE IF NOT EXISTS config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
