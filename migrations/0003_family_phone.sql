-- Optional phone number for each family so parents can contact each other
-- and so it can appear on the printable schedule.

ALTER TABLE families ADD COLUMN phone TEXT;
