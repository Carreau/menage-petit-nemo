// Public schedule page: family login, "who are you" selector,
// schedule view (tally lives on /tally.html), past saturdays locked.

import { t, getLang, setLang, formatDate } from "./i18n.js";

const root = document.getElementById("root");
const langToggle  = document.getElementById("langToggle");
const logoutBtn   = document.getElementById("logoutBtn");
const youAre      = document.getElementById("youAre");
const youAreName  = document.getElementById("youAreName");
const changeBtn   = document.getElementById("changeFamilyBtn");
const nav         = document.getElementById("nav");

const CURRENT_FAMILY_KEY = "mnp_current_family";

let state = null;
let freeOnly = false;
let showPast = false;
let mineOnly = false;
let isAdmin = false;

function getCurrentFamilyId() {
  const raw = localStorage.getItem(CURRENT_FAMILY_KEY);
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}
function setCurrentFamilyId(id) {
  if (id) localStorage.setItem(CURRENT_FAMILY_KEY, String(id));
  else localStorage.removeItem(CURRENT_FAMILY_KEY);
}
function currentFamily() {
  if (!state) return null;
  const id = getCurrentFamilyId();
  return id ? state.families.find((f) => f.id === id && f.active) || null : null;
}

function applyI18n() {
  document.documentElement.lang = getLang();
  for (const el of document.querySelectorAll("[data-i18n]")) {
    el.textContent = t(el.dataset.i18n);
  }
  langToggle.textContent = t("lang_toggle");
}

function updateHeader() {
  const fam = currentFamily();
  if (fam) {
    youAre.classList.remove("hidden");
    youAreName.textContent = fam.name;
    nav.classList.remove("hidden");
  } else {
    youAre.classList.add("hidden");
    nav.classList.add("hidden");
  }
}

langToggle.addEventListener("click", () => {
  setLang(getLang() === "fr" ? "en" : "fr");
  applyI18n();
  render();
});

logoutBtn.addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST" });
  // Keep the stored family on logout: the same device almost certainly
  // belongs to the same family next time around.
  location.reload();
});

changeBtn.addEventListener("click", () => openFamilyPicker({ allowCancel: true }));

async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { "content-type": "application/json", ...(opts.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function boot() {
  applyI18n();
  const who = await api("/api/whoami");
  if (!who.data.family) {
    renderLogin();
    return;
  }
  isAdmin = !!who.data.admin;
  logoutBtn.classList.remove("hidden");
  await loadState();
}

async function loadState() {
  const res = await api("/api/state");
  if (!res.ok) {
    if (res.status === 401) {
      renderLogin();
      return;
    }
    root.innerHTML = `<div class="card">${t("err_generic")}</div>`;
    return;
  }
  state = res.data;

  // If no stored family, or the stored one no longer exists, prompt.
  if (!currentFamily()) {
    updateHeader();
    render();
    openFamilyPicker({ allowCancel: false });
    return;
  }

  updateHeader();
  render();
}

function renderLogin() {
  logoutBtn.classList.add("hidden");
  youAre.classList.add("hidden");
  nav.classList.add("hidden");
  root.innerHTML = `
    <div class="login-page">
      <div class="card login-card">
        <h2 data-i18n="login_title"></h2>
        <p data-i18n="login_help"></p>
        <form id="loginForm">
          <input type="password" id="pw" autocomplete="current-password" />
          <button type="submit" class="primary" data-i18n="login_button"></button>
        </form>
        <div class="error" id="loginError"></div>
      </div>
    </div>
  `;
  applyI18n();
  const form = document.getElementById("loginForm");
  const err = document.getElementById("loginError");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    err.textContent = "";
    const password = document.getElementById("pw").value;
    const res = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      await boot();
      return;
    }
    if (res.status === 429) err.textContent = t("login_throttled");
    else err.textContent = t("login_error");
  });
}

function render() {
  if (!state) return;
  const openCount = state.saturdays.filter(
    (s) => !s.closed && !s.past && (s.slots[0] === null || s.slots[1] === null),
  ).length;
  const remaining = state.saturdays.reduce(
    (acc, s) =>
      acc +
      (s.closed || s.past
        ? 0
        : (s.slots[0] ? 0 : 1) + (s.slots[1] ? 0 : 1)),
    0,
  );

  const fam = currentFamily();
  // Privacy: phones are only revealed on saturdays where the current family
  // is also booked. Computed here so renderSaturday/renderSlot can look it up.
  const mySaturdayIds = new Set(
    fam
      ? state.saturdays
          .filter((s) => s.slots.some((a) => a && a.familyId === fam.id))
          .map((s) => s.id)
      : [],
  );
  const nextSat = state.saturdays.find((s) => !s.past && !s.closed) || null;
  const nextHtml = nextSat ? renderNextCleaning(nextSat, mySaturdayIds.has(nextSat.id)) : "";
  const banner =
    fam && fam.used >= fam.quota
      ? `<div class="badge" style="display:block;margin-bottom:10px;padding:8px 12px">${t(
          "quota_info_banner",
          fam.name,
          fam.used,
          fam.quota,
        )}</div>`
      : "";

  const visibleSaturdays = state.saturdays.filter((s) => {
    if (!showPast && s.past) return false;
    if (freeOnly && (s.closed || s.past || (s.slots[0] && s.slots[1]))) return false;
    if (mineOnly) {
      if (!fam) return false;
      if (!s.slots.some((a) => a && a.familyId === fam.id)) return false;
    }
    return true;
  });

  root.innerHTML = `
    ${nextHtml}
    <section class="card">
      <div class="summary">
        <div><div class="num">${openCount}</div><div class="lbl">${t("summary_open", openCount)}</div></div>
        <div><div class="num">${remaining}</div><div class="lbl">${t("summary_remaining", remaining)}</div></div>
      </div>
    </section>

    <section class="card">
      <h2 data-i18n="schedule_heading"></h2>
      ${banner}
      <div class="filter-row">
        <label><input type="checkbox" id="freeOnly" ${freeOnly ? "checked" : ""}/> <span data-i18n="filter_free_only"></span></label>
        <label><input type="checkbox" id="mineOnly" ${mineOnly ? "checked" : ""} ${fam ? "" : "disabled"}/> <span data-i18n="filter_mine_only"></span></label>
        <label><input type="checkbox" id="showPast" ${showPast ? "checked" : ""}/> <span data-i18n="filter_show_past"></span></label>
      </div>
      ${
        state.saturdays.length
          ? `<div class="saturdays">${visibleSaturdays
              .map((s) => renderSaturday(s, { showPhones: mySaturdayIds.has(s.id) }))
              .join("")}</div>`
          : `<p>${t("no_saturdays")}</p>`
      }
    </section>
  `;
  applyI18n();

  document.getElementById("freeOnly").addEventListener("change", (e) => {
    freeOnly = e.target.checked;
    render();
  });
  document.getElementById("mineOnly").addEventListener("change", (e) => {
    mineOnly = e.target.checked;
    render();
  });
  document.getElementById("showPast").addEventListener("change", (e) => {
    showPast = e.target.checked;
    render();
  });

  for (const el of document.querySelectorAll("[data-claim]")) {
    el.addEventListener("click", () => confirmClaim(JSON.parse(el.dataset.claim)));
  }
  for (const el of document.querySelectorAll("[data-release]")) {
    el.addEventListener("click", () =>
      confirmRelease(JSON.parse(el.dataset.release)),
    );
  }
  for (const el of document.querySelectorAll("[data-ics]")) {
    el.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const { date } = JSON.parse(el.dataset.ics);
      downloadIcs(date);
    });
  }
}

// ---- Calendar (.ics) generation ----
//
// Produces a tiny VCALENDAR with two all-day events:
//   - Cleaning day (the Saturday itself)
//   - Key pickup reminder on the Friday before
// Both SUMMARY strings come from i18n so the event text matches the UI.
// Downloaded client-side — no server round trip.

function downloadIcs(satDate) {
  const ics = buildIcs(satDate);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `menage-petit-nemo-${satDate}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function buildIcs(satIso) {
  const satCompact = satIso.replace(/-/g, "");
  const friCompact = addDays(satIso, -1).replace(/-/g, "");
  const dtstamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const uidBase = `menage-petit-nemo-${satCompact}`;

  // Floating local time (no TZID, no trailing Z). The calendar app renders
  // these in the viewer's local timezone, which is what parents want since
  // the cleaning happens at the daycare in France.
  const cleaningStart = `${satCompact}T090000`;
  const cleaningEnd   = `${satCompact}T120000`;
  const keysStart     = `${friCompact}T160000`;
  const keysEnd       = `${friCompact}T180000`;

  const cleaningSummary = icsEscape(t("ics_summary_cleaning"));
  const keysSummary = icsEscape(t("ics_summary_keys"));

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//menage-petit-nemo//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uidBase}-cleaning@menage-petit-nemo`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${cleaningStart}`,
    `DTEND:${cleaningEnd}`,
    `SUMMARY:${cleaningSummary}`,
    "END:VEVENT",
    "BEGIN:VEVENT",
    `UID:${uidBase}-keys@menage-petit-nemo`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${keysStart}`,
    `DTEND:${keysEnd}`,
    `SUMMARY:${keysSummary}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  // RFC 5545 mandates CRLF line endings.
  return lines.join("\r\n") + "\r\n";
}

function addDays(iso, n) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function icsEscape(s) {
  return String(s ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function renderNextCleaning(sat, showPhones) {
  const slotInfo = (a) => {
    if (!a) return `<div class="next-slot empty">—</div>`;
    const famRec = state.families.find((f) => f.id === a.familyId);
    const parents = renderParentLines(famRec?.parents || [], { showPhone: showPhones });
    return `<div class="next-slot">
        <div class="next-family">${escapeHtml(a.familyName)}</div>
        ${parents}
      </div>`;
  };
  const a1 = sat.slots[0];
  const a2 = sat.slots[1];
  const noneSignedUp = !a1 && !a2;
  const body = noneSignedUp
    ? `<div class="next-cleaning-empty">${t("next_cleaning_nobody")}</div>`
    : `<div class="next-cleaning-slots">${slotInfo(a1)}${slotInfo(a2)}</div>`;
  return `
    <section class="card next-cleaning">
      <div class="next-cleaning-head">
        <span class="next-cleaning-label" data-i18n="next_cleaning_label"></span>
        <span class="next-cleaning-date">${formatDate(sat.date)}</span>
      </div>
      ${body}
    </section>
  `;
}

function renderSaturday(s, { showPhones }) {
  if (s.closed) {
    return `
      <div class="saturday closed">
        <div>
          <div class="date">${formatDate(s.date)}</div>
          <div class="note">${escapeHtml(s.note)}</div>
        </div>
        <div class="slot"><span class="badge" data-i18n="closed_label"></span></div>
        <div class="slot"><span class="badge" data-i18n="closed_label"></span></div>
      </div>`;
  }
  const pastClass = s.past ? " past" : "";
  return `
    <div class="saturday${pastClass}">
      <div>
        <div class="date">${formatDate(s.date)}</div>
        <div class="note">${
          s.past
            ? `<span class="badge" data-i18n="past_label"></span> `
            : ""
        }${escapeHtml(s.note)}</div>
      </div>
      ${renderSlot(s, 1, { showPhones })}
      ${renderSlot(s, 2, { showPhones })}
    </div>`;
}

function renderSlot(sat, slot, { showPhones } = { showPhones: false }) {
  const a = sat.slots[slot - 1];
  if (a) {
    const fam = currentFamily();
    const isOwn = fam && a.familyId === fam.id;
    // Release: own future slots, or any slot when admin.
    const canRelease = isAdmin || (!sat.past && isOwn);
    // Calendar export only makes sense for the current family's future slots.
    const canIcs = !sat.past && isOwn;
    const releaseBtn = canRelease
      ? `<button class="link" title="${t("release")}"
           data-release='${JSON.stringify({ id: a.assignmentId, name: a.familyName, familyId: a.familyId })}'>×</button>`
      : "";
    const icsBtn = canIcs
      ? `<button class="ics-btn"
           data-ics='${JSON.stringify({ date: sat.date })}'>📅 ${t("add_to_calendar")}</button>`
      : "";
    const famRec = state.families.find((f) => f.id === a.familyId);
    const parentsHtml = renderParentLines(famRec?.parents || [], { showPhone: showPhones });
    return `
      <div class="slot filled">
        <div class="slot-head">
          <div class="slot-who">
            <span>${escapeHtml(a.familyName)}</span>
            ${parentsHtml}
          </div>
          ${releaseBtn}
        </div>
        ${icsBtn}
      </div>`;
  }
  // Empty slot. Admins can still claim on past saturdays (correction flow).
  if (sat.past && !isAdmin) {
    return `<div class="slot">—</div>`;
  }
  return `
    <div class="slot empty"
      data-claim='${JSON.stringify({ saturdayId: sat.id, slot, date: sat.date, past: !!sat.past })}'>
      + ${t("empty_slot")}
    </div>`;
}

// Admin-only: pick which family to assign to a given (possibly past) slot.
// Reused for corrections on historical saturdays.
function openAdminClaimPicker({ saturdayId, slot, date }) {
  const sat = state.saturdays.find((s) => s.id === saturdayId);
  const alreadyIds = new Set(
    (sat?.slots || []).filter(Boolean).map((a) => a.familyId),
  );
  const eligible = state.families.filter((f) => f.active && !alreadyIds.has(f.id));
  if (!eligible.length) {
    alert(t("err_family_already_booked"));
    return;
  }
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal">
      <h3 data-i18n="pick_family_title"></h3>
      <p>${formatDate(date)}</p>
      <p data-i18n="pick_family_help"></p>
      <select id="pick">
        ${eligible
          .map((f) => `<option value="${f.id}">${escapeHtml(f.name)}</option>`)
          .join("")}
      </select>
      <div class="error" id="modalErr"></div>
      <div class="actions">
        <button data-act="cancel" data-i18n="cancel"></button>
        <button class="primary" data-act="ok" data-i18n="confirm"></button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);
  applyI18n();
  const close = () => backdrop.remove();
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });
  backdrop.querySelector('[data-act="cancel"]').addEventListener("click", close);
  backdrop.querySelector('[data-act="ok"]').addEventListener("click", async () => {
    const familyId = Number(backdrop.querySelector("#pick").value);
    if (!familyId) return;
    const res = await api("/api/claim", {
      method: "POST",
      body: JSON.stringify({ saturdayId, slot, familyId }),
    });
    if (res.ok) {
      close();
      await loadState();
      return;
    }
    backdrop.querySelector("#modalErr").textContent = errorMessage(res.data?.error);
    if (res.data?.error === "slot_taken") await loadState();
  });
}

function openFamilyPicker({ allowCancel }) {
  const eligible = state.families.filter((f) => f.active);
  const currentId = getCurrentFamilyId();
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal modal-wide">
      <h3 data-i18n="select_family_title"></h3>
      <p data-i18n="select_family_help"></p>
      <input type="text" id="famSearch" class="family-search" autofocus />
      <div class="family-grid" id="famGrid"></div>
      <div class="actions">
        ${allowCancel ? '<button data-act="cancel" data-i18n="cancel"></button>' : ""}
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);
  applyI18n();

  const search = backdrop.querySelector("#famSearch");
  search.placeholder = t("search_placeholder");
  const grid = backdrop.querySelector("#famGrid");

  const close = () => backdrop.remove();
  const select = (id) => {
    setCurrentFamilyId(id);
    close();
    updateHeader();
    render();
  };

  function renderGrid(query) {
    const q = (query || "").toLowerCase().trim();
    const filtered = q
      ? eligible.filter((f) => {
          if (f.name.toLowerCase().includes(q)) return true;
          for (const p of f.parents || []) {
            if (p?.name && p.name.toLowerCase().includes(q)) return true;
          }
          return false;
        })
      : eligible;
    if (!filtered.length) {
      grid.innerHTML = `<div class="family-grid-empty">${t("no_match")}</div>`;
      return;
    }
    grid.innerHTML = filtered
      .map((f) => {
        const isCurrent = f.id === currentId;
        const parentNames = (f.parents || [])
          .filter((p) => p && p.name)
          .map((p) => escapeHtml(p.name))
          .join(" · ");
        return `
          <button type="button" class="family-pick${isCurrent ? " current" : ""}" data-id="${f.id}">
            <span class="family-pick-name">${escapeHtml(f.name)}</span>
            ${parentNames ? `<span class="family-pick-parents">${parentNames}</span>` : ""}
          </button>`;
      })
      .join("");
    for (const btn of grid.querySelectorAll(".family-pick")) {
      btn.addEventListener("click", () => select(Number(btn.dataset.id)));
    }
  }

  search.addEventListener("input", (e) => renderGrid(e.target.value));
  // Pressing Enter on a single-result search picks it.
  search.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const buttons = grid.querySelectorAll(".family-pick");
    if (buttons.length === 1) {
      e.preventDefault();
      select(Number(buttons[0].dataset.id));
    }
  });
  renderGrid("");
  // Without setTimeout the autofocus on a freshly-attached input is unreliable.
  setTimeout(() => search.focus(), 0);

  if (allowCancel) {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) close();
    });
    backdrop.querySelector('[data-act="cancel"]').addEventListener("click", close);
  }
}

function confirmClaim({ saturdayId, slot, date, past }) {
  // Admin + past: open a family picker so the admin can assign/correct
  // the historical slot for any family.
  if (isAdmin && past) {
    openAdminClaimPicker({ saturdayId, slot, date });
    return;
  }
  const fam = currentFamily();
  if (!fam) {
    openFamilyPicker({ allowCancel: false });
    return;
  }
  const sat = state.saturdays.find((s) => s.id === saturdayId);
  if (sat && sat.slots.some((a) => a && a.familyId === fam.id)) {
    alert(t("err_family_already_booked"));
    return;
  }
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal">
      <h3 data-i18n="claim_confirm_title"></h3>
      <p>${t("claim_confirm_body", fam.name, formatDate(date))}</p>
      <div class="error" id="modalErr"></div>
      <div class="actions">
        <button data-act="cancel" data-i18n="cancel"></button>
        <button class="primary" data-act="ok" data-i18n="confirm"></button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);
  applyI18n();
  const close = () => backdrop.remove();
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });
  backdrop.querySelector('[data-act="cancel"]').addEventListener("click", close);
  backdrop.querySelector('[data-act="ok"]').addEventListener("click", async () => {
    const res = await api("/api/claim", {
      method: "POST",
      body: JSON.stringify({ saturdayId, slot, familyId: fam.id }),
    });
    if (res.ok) {
      close();
      await loadState();
      return;
    }
    const err = backdrop.querySelector("#modalErr");
    err.textContent = errorMessage(res.data?.error);
    if (res.data?.error === "slot_taken") await loadState();
  });
}

async function confirmRelease({ id, name, familyId }) {
  if (!confirm(t("release_confirm", name))) return;
  const res = await api("/api/release", {
    method: "POST",
    body: JSON.stringify({ assignmentId: id, familyId }),
  });
  if (res.ok) await loadState();
  else alert(errorMessage(res.data?.error));
}

function errorMessage(code) {
  switch (code) {
    case "slot_taken":            return t("err_slot_taken");
    case "saturday_closed":       return t("err_saturday_closed");
    case "saturday_past":         return t("err_saturday_past");
    case "family_already_booked": return t("err_family_already_booked");
    case "not_your_slot":         return t("err_not_your_slot");
    default:                      return t("err_generic");
  }
}

function renderParentLines(parents, { showPhone }) {
  return (parents || [])
    .filter((p) => p && (p.name || (showPhone && p.phone)))
    .map((p) => {
      const name = p.name ? escapeHtml(p.name) : "";
      const phone = showPhone && p.phone
        ? `<a class="slot-phone" href="tel:${encodeURIComponent(p.phone)}">${escapeHtml(p.phone)}</a>`
        : "";
      const sep = name && phone ? " · " : "";
      return `<div class="slot-parent">${name}${sep}${phone}</div>`;
    })
    .join("");
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
  );
}

boot();
