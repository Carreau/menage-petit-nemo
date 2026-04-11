-- Track which parent(s) of a family will actually show up for the
-- cleaning slot. Default both to 1 so existing assignments keep their
-- "both parents" display unchanged after the migration.

ALTER TABLE assignments ADD COLUMN parent1_participating INTEGER NOT NULL DEFAULT 1;
ALTER TABLE assignments ADD COLUMN parent2_participating INTEGER NOT NULL DEFAULT 1;
