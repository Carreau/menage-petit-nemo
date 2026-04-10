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
  const banner =
    fam && fam.used >= fam.quota
      ? `<div class="error" style="margin-bottom:10px">${t(
          "quota_full_banner",
          fam.name,
        )}</div>`
      : "";

  const visibleSaturdays = freeOnly
    ? state.saturdays.filter(
        (s) =>
          !s.closed && !s.past && (s.slots[0] === null || s.slots[1] === null),
      )
    : state.saturdays;

  root.innerHTML = `
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
      </div>
      ${
        state.saturdays.length
          ? `<div class="saturdays">${visibleSaturdays.map(renderSaturday).join("")}</div>`
          : `<p>${t("no_saturdays")}</p>`
      }
    </section>
  `;
  applyI18n();

  document.getElementById("freeOnly").addEventListener("change", (e) => {
    freeOnly = e.target.checked;
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
}

function renderSaturday(s) {
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
      ${renderSlot(s, 1)}
      ${renderSlot(s, 2)}
    </div>`;
}

function renderSlot(sat, slot) {
  const a = sat.slots[slot - 1];
  if (a) {
    if (sat.past) {
      return `
        <div class="slot filled">
          <span>${escapeHtml(a.familyName)}</span>
        </div>`;
    }
    return `
      <div class="slot filled">
        <span>${escapeHtml(a.familyName)}</span>
        <button class="link" title="${t("release")}"
          data-release='${JSON.stringify({ id: a.assignmentId, name: a.familyName })}'>
          ×
        </button>
      </div>`;
  }
  if (sat.past) {
    return `<div class="slot">—</div>`;
  }
  return `
    <div class="slot empty"
      data-claim='${JSON.stringify({ saturdayId: sat.id, slot, date: sat.date })}'>
      + ${t("empty_slot")}
    </div>`;
}

function openFamilyPicker({ allowCancel }) {
  const eligible = state.families.filter((f) => f.active);
  const currentId = getCurrentFamilyId();
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal">
      <h3 data-i18n="select_family_title"></h3>
      <p data-i18n="select_family_help"></p>
      <select id="pick">
        ${eligible
          .map(
            (f) =>
              `<option value="${f.id}" ${f.id === currentId ? "selected" : ""}>${escapeHtml(f.name)}</option>`,
          )
          .join("")}
      </select>
      <div class="actions">
        ${allowCancel ? '<button data-act="cancel" data-i18n="cancel"></button>' : ""}
        <button class="primary" data-act="ok" data-i18n="confirm"></button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);
  applyI18n();
  const close = () => backdrop.remove();
  if (allowCancel) {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) close();
    });
    backdrop.querySelector('[data-act="cancel"]').addEventListener("click", close);
  }
  backdrop.querySelector('[data-act="ok"]').addEventListener("click", () => {
    const id = Number(backdrop.querySelector("#pick").value);
    if (!id) return;
    setCurrentFamilyId(id);
    close();
    updateHeader();
    render();
  });
}

function confirmClaim({ saturdayId, slot, date }) {
  const fam = currentFamily();
  if (!fam) {
    openFamilyPicker({ allowCancel: false });
    return;
  }
  if (fam.used >= fam.quota) {
    alert(t("err_quota_reached"));
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

async function confirmRelease({ id, name }) {
  if (!confirm(t("release_confirm", name))) return;
  const res = await api("/api/release", {
    method: "POST",
    body: JSON.stringify({ assignmentId: id }),
  });
  if (res.ok) await loadState();
  else alert(errorMessage(res.data?.error));
}

function errorMessage(code) {
  switch (code) {
    case "slot_taken":            return t("err_slot_taken");
    case "quota_reached":         return t("err_quota_reached");
    case "saturday_closed":       return t("err_saturday_closed");
    case "saturday_past":         return t("err_saturday_past");
    case "family_already_booked": return t("err_family_already_booked");
    default:                      return t("err_generic");
  }
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
  );
}

boot();
