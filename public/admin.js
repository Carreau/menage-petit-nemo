// Admin panel: families, saturdays, overview, danger zone.

import { t, getLang, setLang, formatDate } from "./i18n.js";

const root = document.getElementById("root");
const langToggle = document.getElementById("langToggle");
const logoutBtn = document.getElementById("logoutBtn");

let state = null;
let tab = "families";

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
  if (!who.data.admin) {
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
        <h2 data-i18n="admin_title"></h2>
        <p data-i18n="admin_login_help"></p>
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
    const res = await api("/api/admin/login", {
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
  root.innerHTML = `
    <div class="tabs">
      <button data-tab="families"  ${tab === "families"  ? 'class="active"' : ""} data-i18n="tab_families"></button>
      <button data-tab="saturdays" ${tab === "saturdays" ? 'class="active"' : ""} data-i18n="tab_saturdays"></button>
      <button data-tab="overview"  ${tab === "overview"  ? 'class="active"' : ""} data-i18n="tab_overview"></button>
      <button data-tab="danger"    ${tab === "danger"    ? 'class="active"' : ""} data-i18n="tab_danger"></button>
    </div>
    <div id="tabContent"></div>
  `;
  for (const b of root.querySelectorAll("[data-tab]")) {
    b.addEventListener("click", () => {
      tab = b.dataset.tab;
      render();
    });
  }
  const content = document.getElementById("tabContent");
  if (tab === "families")  content.innerHTML = renderFamiliesTab();
  if (tab === "saturdays") content.innerHTML = renderSaturdaysTab();
  if (tab === "overview")  content.innerHTML = renderOverviewTab();
  if (tab === "danger")    content.innerHTML = renderDangerTab();
  applyI18n();
  wireTab();
}

// ---- Families tab ----

function renderFamiliesTab() {
  const rows = state.families
    .map(
      (f) => `
      <tr data-id="${f.id}">
        <td><input class="fname" type="text" value="${attr(f.name)}" /></td>
        <td style="max-width:90px"><input class="fquota" type="number" min="0" value="${f.quota}" /></td>
        <td><label><input class="factive" type="checkbox" ${f.active ? "checked" : ""}/> <span data-i18n="family_active"></span></label></td>
        <td class="badge">${f.used}</td>
        <td style="text-align:right">
          <button class="save primary" data-i18n="save"></button>
          <button class="del danger"  data-i18n="delete"></button>
        </td>
      </tr>`,
    )
    .join("");
  return `
    <div class="card">
      <h2 data-i18n="add_family"></h2>
      <div class="row">
        <input type="text" id="newName" placeholder="" />
        <input type="number" id="newQuota" min="0" value="4" />
        <button class="primary" id="addFamily" data-i18n="add_family"></button>
      </div>
    </div>
    <div class="card">
      <table>
        <thead>
          <tr>
            <th data-i18n="family_name"></th>
            <th data-i18n="family_quota"></th>
            <th data-i18n="family_active"></th>
            <th>#</th>
            <th></th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function wireFamiliesTab() {
  document.getElementById("newName").placeholder = t("family_name");
  document.getElementById("addFamily").addEventListener("click", async () => {
    const name = document.getElementById("newName").value.trim();
    const quota = Number(document.getElementById("newQuota").value || 4);
    if (!name) return;
    const res = await api("/api/admin/families", {
      method: "POST",
      body: JSON.stringify({ name, quota }),
    });
    if (!res.ok) return alert(t("err_generic"));
    await loadState();
  });
  for (const row of document.querySelectorAll("tr[data-id]")) {
    const id = row.dataset.id;
    row.querySelector(".save").addEventListener("click", async () => {
      const name = row.querySelector(".fname").value.trim();
      const quota = Number(row.querySelector(".fquota").value);
      const active = row.querySelector(".factive").checked;
      const res = await api(`/api/admin/families/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, quota, active }),
      });
      if (!res.ok) return alert(t("err_generic"));
      await loadState();
    });
    row.querySelector(".del").addEventListener("click", async () => {
      const name = row.querySelector(".fname").value.trim();
      if (!confirm(t("confirm_delete_family", name))) return;
      const res = await api(`/api/admin/families/${id}`, { method: "DELETE" });
      if (!res.ok) return alert(t("err_generic"));
      await loadState();
    });
  }
}

// ---- Saturdays tab ----

function renderSaturdaysTab() {
  const rows = state.saturdays
    .map(
      (s) => `
      <tr data-id="${s.id}">
        <td><strong>${formatDate(s.date)}</strong><br/><span class="badge">${s.date}</span></td>
        <td><input class="snote" type="text" value="${attr(s.note)}" /></td>
        <td><label><input class="sclosed" type="checkbox" ${s.closed ? "checked" : ""}/> <span data-i18n="mark_closed"></span></label></td>
        <td style="text-align:right">
          <button class="save primary" data-i18n="save"></button>
          <button class="del danger" data-i18n="delete"></button>
        </td>
      </tr>`,
    )
    .join("");
  return `
    <div class="card">
      <h2 data-i18n="generate_saturdays"></h2>
      <div class="row">
        <label style="flex:1"><span data-i18n="start_date"></span><br/><input type="date" id="genStart"/></label>
        <label style="flex:1"><span data-i18n="end_date"></span><br/><input type="date" id="genEnd"/></label>
      </div>
      <div style="margin-top:10px">
        <label><span data-i18n="skip_dates"></span></label>
        <textarea id="genSkip" placeholder="2026-12-26&#10;2027-01-02"></textarea>
      </div>
      <div style="margin-top:10px">
        <button class="primary" id="genBtn" data-i18n="generate"></button>
      </div>
    </div>
    <div class="card">
      <table>
        <thead><tr><th data-i18n="start_date"></th><th data-i18n="note_placeholder"></th><th data-i18n="mark_closed"></th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function wireSaturdaysTab() {
  document.getElementById("genBtn").addEventListener("click", async () => {
    const startDate = document.getElementById("genStart").value;
    const endDate = document.getElementById("genEnd").value;
    const skipDates = document.getElementById("genSkip").value
      .split(/\s+/).map((s) => s.trim()).filter(Boolean);
    if (!startDate || !endDate) return;
    const res = await api("/api/admin/saturdays", {
      method: "POST",
      body: JSON.stringify({ startDate, endDate, skipDates }),
    });
    if (!res.ok) return alert(t("err_generic"));
    alert(t("generated_count", res.data.count || 0));
    await loadState();
  });
  for (const row of document.querySelectorAll("tr[data-id]")) {
    const id = row.dataset.id;
    row.querySelector(".save").addEventListener("click", async () => {
      const note = row.querySelector(".snote").value;
      const closed = row.querySelector(".sclosed").checked;
      const res = await api(`/api/admin/saturdays/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ note, closed }),
      });
      if (!res.ok) return alert(t("err_generic"));
      await loadState();
    });
    row.querySelector(".del").addEventListener("click", async () => {
      const sat = state.saturdays.find((s) => s.id === Number(id));
      if (!confirm(t("confirm_delete_saturday", sat?.date || ""))) return;
      const res = await api(`/api/admin/saturdays/${id}`, { method: "DELETE" });
      if (!res.ok) return alert(t("err_generic"));
      await loadState();
    });
  }
}

// ---- Overview tab ----

function renderOverviewTab() {
  const rows = state.saturdays
    .map((s) => {
      const slot = (a) => (a ? escapeHtml(a.familyName) : "—");
      return `<tr>
        <td>${formatDate(s.date)}${s.closed ? ' <span class="badge" data-i18n="closed_label"></span>' : ""}</td>
        <td>${slot(s.slots[0])}</td>
        <td>${slot(s.slots[1])}</td>
        <td>${escapeHtml(s.note)}</td>
      </tr>`;
    })
    .join("");
  return `
    <div class="card">
      <div class="row" style="justify-content:flex-end">
        <button id="exportBtn" data-i18n="overview_export"></button>
      </div>
      <table>
        <thead><tr><th>Date</th><th>1</th><th>2</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function wireOverviewTab() {
  document.getElementById("exportBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "menage-petit-nemo.json";
    a.click();
    URL.revokeObjectURL(url);
  });
}

// ---- Danger tab ----

function renderDangerTab() {
  return `
    <div class="card">
      <h2 data-i18n="tab_danger"></h2>
      <button class="danger" id="resetBtn" data-i18n="danger_reset"></button>
    </div>
  `;
}

function wireDangerTab() {
  document.getElementById("resetBtn").addEventListener("click", async () => {
    if (!confirm(t("danger_reset_confirm"))) return;
    const res = await api("/api/admin/reset", { method: "POST" });
    if (!res.ok) return alert(t("err_generic"));
    await loadState();
  });
}

function wireTab() {
  if (tab === "families")  wireFamiliesTab();
  if (tab === "saturdays") wireSaturdaysTab();
  if (tab === "overview")  wireOverviewTab();
  if (tab === "danger")    wireDangerTab();
}

function attr(s) {
  return String(s ?? "").replace(/"/g, "&quot;");
}
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
  );
}

boot();
