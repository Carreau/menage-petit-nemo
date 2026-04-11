-- Which crèche section a family belongs to: "petit_nemo" (the default,
-- current schedule) or "baby_nemo" (its own schedule will ship later).
-- Existing rows fall into petit_nemo so nothing is lost.

ALTER TABLE families ADD COLUMN local TEXT NOT NULL DEFAULT 'petit_nemo';
