-- A family can only hold one of the two slots on a given Saturday.
-- Enforced at the DB level so concurrent claims are safe.

CREATE UNIQUE INDEX IF NOT EXISTS idx_assignments_unique_family_sat
  ON assignments(saturday_id, family_id);
