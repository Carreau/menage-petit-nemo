// D1 query helpers. Keeps SQL out of the request handlers.

function todayIsoUtc() {
  return new Date().toISOString().slice(0, 10);
}

// Stamp the config table whenever the visible schedule or families list
// is mutated, so admins can see "last modified" at a glance.
async function bumpLastModified(db) {
  const now = new Date().toISOString();
  await db
    .prepare(
      "INSERT INTO config (key, value) VALUES ('last_modified', ?) " +
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .bind(now)
    .run();
}

export async function getState(db) {
  const [familiesRes, saturdaysRes, assignmentsRes, lastModRes] = await Promise.all([
    db.prepare(`
      SELECT id, name, quota, active,
             parent1_name, parent1_phone,
             parent2_name, parent2_phone
        FROM families
       ORDER BY name COLLATE NOCASE
    `).all(),
    db.prepare("SELECT id, date, note, closed FROM saturdays ORDER BY date").all(),
    db.prepare(`
      SELECT a.id, a.saturday_id, a.family_id, a.slot, f.name AS family_name
        FROM assignments a
        JOIN families f ON f.id = a.family_id
    `).all(),
    db.prepare("SELECT value FROM config WHERE key = 'last_modified'").first(),
  ]);
  const lastModified = lastModRes?.value || null;

  const today = todayIsoUtc();

  const families = (familiesRes.results || []).map((f) => ({
    id: f.id,
    name: f.name,
    quota: f.quota,
    active: !!f.active,
    parents: [
      { name: f.parent1_name || "", phone: f.parent1_phone || "" },
      { name: f.parent2_name || "", phone: f.parent2_phone || "" },
    ],
    used: 0,
  }));
  const famById = new Map(families.map((f) => [f.id, f]));

  const saturdays = (saturdaysRes.results || []).map((s) => ({
    id: s.id,
    date: s.date,
    note: s.note || "",
    closed: !!s.closed,
    past: s.date < today,
    slots: [null, null], // index 0 -> slot 1, index 1 -> slot 2
  }));
  const satById = new Map(saturdays.map((s) => [s.id, s]));

  for (const a of assignmentsRes.results || []) {
    const sat = satById.get(a.saturday_id);
    if (!sat) continue;
    sat.slots[a.slot - 1] = {
      assignmentId: a.id,
      familyId: a.family_id,
      familyName: a.family_name,
    };
    const fam = famById.get(a.family_id);
    if (fam) fam.used += 1;
  }

  return { families, saturdays, today, lastModified };
}

export async function claimSlot(db, { saturdayId, slot, familyId }, { isAdmin = false } = {}) {
  if (![1, 2].includes(Number(slot))) return { error: "bad_slot" };

  const sat = await db
    .prepare("SELECT id, date, closed FROM saturdays WHERE id = ?")
    .bind(saturdayId)
    .first();
  if (!sat) return { error: "no_such_saturday" };
  if (sat.closed) return { error: "saturday_closed" };
  if (!isAdmin && sat.date < todayIsoUtc()) return { error: "saturday_past" };

  const fam = await db
    .prepare("SELECT id, quota, active FROM families WHERE id = ?")
    .bind(familyId)
    .first();
  if (!fam) return { error: "no_such_family" };
  if (!fam.active) return { error: "family_inactive" };

  // Note: quota is informational only. Families are allowed to go over.

  const already = await db
    .prepare(
      "SELECT 1 FROM assignments WHERE saturday_id = ? AND family_id = ?",
    )
    .bind(saturdayId, familyId)
    .first();
  if (already) return { error: "family_already_booked" };

  try {
    const res = await db
      .prepare(
        "INSERT INTO assignments (saturday_id, family_id, slot) VALUES (?, ?, ?)",
      )
      .bind(saturdayId, familyId, slot)
      .run();
    await bumpLastModified(db);
    return { ok: true, id: res.meta?.last_row_id };
  } catch (err) {
    const msg = String(err && err.message || err);
    if (msg.includes("UNIQUE")) {
      // Two UNIQUE indexes can trip here:
      //   (saturday_id, slot)      -> another family just took this slot
      //   (saturday_id, family_id) -> this family raced a second claim
      // Disambiguate by checking which one now holds the row.
      if (msg.includes("family_id") || msg.includes("family_sat")) {
        return { error: "family_already_booked" };
      }
      return { error: "slot_taken" };
    }
    throw err;
  }
}

export async function releaseSlot(db, assignmentId, { familyId, isAdmin = false } = {}) {
  const row = await db
    .prepare(
      `SELECT a.id, a.family_id, s.date
         FROM assignments a
         JOIN saturdays s ON s.id = a.saturday_id
        WHERE a.id = ?`,
    )
    .bind(assignmentId)
    .first();
  if (!row) return { error: "not_found" };
  if (!isAdmin && row.date < todayIsoUtc()) return { error: "saturday_past" };
  if (!isAdmin && Number(familyId) !== row.family_id) return { error: "not_your_slot" };
  await db.prepare("DELETE FROM assignments WHERE id = ?").bind(assignmentId).run();
  await bumpLastModified(db);
  return { ok: true };
}

// ---- Admin: families ----

function trimOrNull(v) {
  const s = String(v || "").trim();
  return s || null;
}

export async function createFamily(db, { name, quota, parents }) {
  const n = String(name || "").trim();
  if (!n) return { error: "name_required" };
  const q = Number.isFinite(Number(quota)) ? Number(quota) : 4;
  const p1 = parents?.[0] || {};
  const p2 = parents?.[1] || {};
  const res = await db
    .prepare(
      `INSERT INTO families
         (name, quota, parent1_name, parent1_phone, parent2_name, parent2_phone)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      n,
      q,
      trimOrNull(p1.name),
      trimOrNull(p1.phone),
      trimOrNull(p2.name),
      trimOrNull(p2.phone),
    )
    .run();
  await bumpLastModified(db);
  return { ok: true, id: res.meta?.last_row_id };
}

export async function bulkCreateFamilies(db, families) {
  if (!Array.isArray(families) || !families.length) {
    return { error: "empty" };
  }
  let count = 0;
  for (const f of families) {
    const r = await createFamily(db, {
      name: f?.name,
      quota: f?.quota,
      parents: Array.isArray(f?.parents) ? f.parents : [],
    });
    if (r.ok) count += 1;
  }
  // createFamily already bumps, but bump once more to be sure if all
  // entries were skipped (no-op).
  await bumpLastModified(db);
  return { ok: true, count };
}

export async function updateFamily(db, id, { name, quota, active, parents }) {
  const sets = [];
  const binds = [];
  if (name !== undefined) {
    const n = String(name).trim();
    if (!n) return { error: "name_required" };
    sets.push("name = ?");
    binds.push(n);
  }
  if (quota !== undefined) {
    sets.push("quota = ?");
    binds.push(Number(quota));
  }
  if (active !== undefined) {
    sets.push("active = ?");
    binds.push(active ? 1 : 0);
  }
  if (parents !== undefined) {
    const p1 = parents?.[0] || {};
    const p2 = parents?.[1] || {};
    sets.push("parent1_name = ?");
    binds.push(trimOrNull(p1.name));
    sets.push("parent1_phone = ?");
    binds.push(trimOrNull(p1.phone));
    sets.push("parent2_name = ?");
    binds.push(trimOrNull(p2.name));
    sets.push("parent2_phone = ?");
    binds.push(trimOrNull(p2.phone));
  }
  if (!sets.length) return { ok: true };
  binds.push(id);
  await db.prepare(`UPDATE families SET ${sets.join(", ")} WHERE id = ?`).bind(...binds).run();
  await bumpLastModified(db);
  return { ok: true };
}

export async function deleteFamily(db, id) {
  // D1 doesn't reliably enforce foreign-key cascades; clean up explicitly.
  await db.batch([
    db.prepare("DELETE FROM assignments WHERE family_id = ?").bind(id),
    db.prepare("DELETE FROM families WHERE id = ?").bind(id),
  ]);
  await bumpLastModified(db);
  return { ok: true };
}

// ---- Admin: saturdays ----

export async function createSaturdaysInRange(db, { startDate, endDate, skipDates = [] }) {
  if (!isIsoDate(startDate) || !isIsoDate(endDate)) return { error: "bad_dates" };
  const skip = new Set((skipDates || []).filter(isIsoDate));
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  if (start > end) return { error: "bad_range" };

  // Advance to first Saturday (getUTCDay: Sun=0 .. Sat=6).
  const cursor = new Date(start);
  const offset = (6 - cursor.getUTCDay() + 7) % 7;
  cursor.setUTCDate(cursor.getUTCDate() + offset);

  const stmts = [];
  while (cursor <= end) {
    const iso = cursor.toISOString().slice(0, 10);
    if (!skip.has(iso)) {
      stmts.push(
        db.prepare("INSERT OR IGNORE INTO saturdays (date) VALUES (?)").bind(iso),
      );
    }
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }
  if (stmts.length) await db.batch(stmts);
  await bumpLastModified(db);
  return { ok: true, count: stmts.length };
}

export async function updateSaturday(db, id, { note, closed }) {
  const sets = [];
  const binds = [];
  if (note !== undefined) {
    sets.push("note = ?");
    binds.push(String(note || ""));
  }
  if (closed !== undefined) {
    sets.push("closed = ?");
    binds.push(closed ? 1 : 0);
  }
  if (!sets.length) return { ok: true };
  binds.push(id);
  await db.prepare(`UPDATE saturdays SET ${sets.join(", ")} WHERE id = ?`).bind(...binds).run();
  await bumpLastModified(db);
  return { ok: true };
}

export async function deleteSaturday(db, id) {
  await db.batch([
    db.prepare("DELETE FROM assignments WHERE saturday_id = ?").bind(id),
    db.prepare("DELETE FROM saturdays WHERE id = ?").bind(id),
  ]);
  await bumpLastModified(db);
  return { ok: true };
}

export async function resetAssignments(db) {
  await db.prepare("DELETE FROM assignments").run();
  await bumpLastModified(db);
  return { ok: true };
}

export async function clearAllSaturdays(db) {
  // Remove every saturday and its assignments. Families are kept.
  await db.batch([
    db.prepare("DELETE FROM assignments"),
    db.prepare("DELETE FROM saturdays"),
  ]);
  await bumpLastModified(db);
  return { ok: true };
}

function isIsoDate(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}
