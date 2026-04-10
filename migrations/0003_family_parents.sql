-- Each family typically has two parents. Store an optional name and phone
-- number for each so parents can contact one another and so the printable
-- schedule can show who to call. Booking is still per family — these
-- columns are informational only.

ALTER TABLE families ADD COLUMN parent1_name TEXT;
ALTER TABLE families ADD COLUMN parent1_phone TEXT;
ALTER TABLE families ADD COLUMN parent2_name TEXT;
ALTER TABLE families ADD COLUMN parent2_phone TEXT;
