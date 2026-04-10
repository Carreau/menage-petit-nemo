// Public schedule page: family login + schedule view.

import { t, getLang, setLang, formatDate } from "./i18n.js";

const root = document.getElementById("root");
const langToggle = document.getElementById("langToggle");
const logoutBtn = document.getElementById("logoutBtn");

let state = null;
let freeOnly = false;

function applyI18n() {
  document.documentElement.lang = getLang();
  for (const el of document.querySelectorAll("[data-i18n]")) {
    el.textContent = t(el.dataset.i18n);
  }
  langToggle.textContent = t("lang_toggle");
}

langToggle.addEventListener("click", () => {
  setLang(getLang() === "fr" ? "en" : "fr");
  applyI18n();
  render();
});

logoutBtn.addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST" });
  location.reload();
});

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
  render();
}

function renderLogin() {
  logoutBtn.classList.add("hidden");
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
    (s) => !s.closed && (s.slots[0] === null || s.slots[1] === null),
  ).length;
  const remaining = state.saturdays.reduce(
    (acc, s) => acc + (s.closed ? 0 : (s.slots[0] ? 0 : 1) + (s.slots[1] ? 0 : 1)),
    0,
  );

  const visibleSaturdays = freeOnly
    ? state.saturdays.filter((s) => !s.closed && (s.slots[0] === null || s.slots[1] === null))
    : state.saturdays;

  root.innerHTML = `
    <section class="card">
      <div class="summary">
        <div><div class="num">${openCount}</div><div class="lbl">${t("summary_open", openCount)}</div></div>
        <div><div class="num">${remaining}</div><div class="lbl">${t("summary_remaining", remaining)}</div></div>
      </div>
    </section>

    <section class="card">
      <h2 data-i18n="families_heading"></h2>
      ${renderFamilies()}
    </section>

    <section class="card">
      <h2 data-i18n="schedule_heading"></h2>
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
    el.addEventListener("click", () => openClaimModal(JSON.parse(el.dataset.claim)));
  }
  for (const el of document.querySelectorAll("[data-release]")) {
    el.addEventListener("click", () =>
      confirmRelease(JSON.parse(el.dataset.release)),
    );
  }
}

function renderFamilies() {
  const active = state.families.filter((f) => f.active);
  if (!active.length) return `<p>${t("no_families")}</p>`;
  return `<div class="families">${active
    .map((f) => {
      const cls =
        f.used >= f.quota ? "done" : f.used > 0 ? "partial" : "empty";
      return `
        <div class="family ${cls}">
          <span class="name">${escapeHtml(f.name)}</span>
          <span class="tally">${t("quota_label", f.used, f.quota)}</span>
        </div>`;
    })
    .join("")}</div>`;
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
  return `
    <div class="saturday">
      <div>
        <div class="date">${formatDate(s.date)}</div>
        <div class="note">${escapeHtml(s.note)}</div>
      </div>
      ${renderSlot(s, 1)}
      ${renderSlot(s, 2)}
    </div>`;
}

function renderSlot(sat, slot) {
  const a = sat.slots[slot - 1];
  if (a) {
    return `
      <div class="slot filled">
        <span>${escapeHtml(a.familyName)}</span>
        <button class="link" title="${t("release")}"
          data-release='${JSON.stringify({ id: a.assignmentId, name: a.familyName })}'>
          ×
        </button>
      </div>`;
  }
  return `
    <div class="slot empty"
      data-claim='${JSON.stringify({ saturdayId: sat.id, slot })}'>
      + ${t("empty_slot")}
    </div>`;
}

function openClaimModal({ saturdayId, slot }) {
  const eligible = state.families.filter((f) => f.active && f.used < f.quota);
  const options = eligible
    .map((f) => `<option value="${f.id}">${escapeHtml(f.name)} (${f.used}/${f.quota})</option>`)
    .join("");
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal">
      <h3 data-i18n="pick_family_title"></h3>
      <p data-i18n="pick_family_help"></p>
      <select id="pick">${options}</select>
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
    case "slot_taken":     return t("err_slot_taken");
    case "quota_reached":  return t("err_quota_reached");
    case "saturday_closed":return t("err_saturday_closed");
    default:               return t("err_generic");
  }
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
  );
}

boot();
