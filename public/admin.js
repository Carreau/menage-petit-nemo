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
  const cards = state.families
    .map((f) => {
      const p1 = f.parents?.[0] || { name: "", phone: "" };
      const p2 = f.parents?.[1] || { name: "", phone: "" };
      return `
        <div class="family-card" data-id="${f.id}">
          <div class="family-card-head">
            <input class="fname" type="text" value="${attr(f.name)}" />
            <label><span data-i18n="family_quota"></span>
              <input class="fquota" type="number" min="0" value="${f.quota}" />
            </label>
            <label><input class="factive" type="checkbox" ${f.active ? "checked" : ""}/>
              <span data-i18n="family_active"></span></label>
            <span class="badge">#${f.used}</span>
          </div>
          <div class="family-card-parent">
            <span class="parent-label" data-i18n="parent1"></span>
            <input class="p1name" type="text" placeholder="" value="${attr(p1.name)}" />
            <input class="p1phone" type="tel" placeholder="" value="${attr(p1.phone)}" />
          </div>
          <div class="family-card-parent">
            <span class="parent-label" data-i18n="parent2"></span>
            <input class="p2name" type="text" placeholder="" value="${attr(p2.name)}" />
            <input class="p2phone" type="tel" placeholder="" value="${attr(p2.phone)}" />
          </div>
          <div class="family-card-actions">
            <button class="del danger" data-i18n="delete"></button>
            <button class="save primary" data-i18n="save"></button>
          </div>
        </div>`;
    })
    .join("");
  return `
    <div class="card">
      <h2 data-i18n="add_family"></h2>
      <div class="family-card family-card-new">
        <div class="family-card-head">
          <input type="text" id="newName" placeholder="" />
          <label><span data-i18n="family_quota"></span>
            <input type="number" id="newQuota" min="0" value="4" />
          </label>
        </div>
        <div class="family-card-parent">
          <span class="parent-label" data-i18n="parent1"></span>
          <input type="text" id="newP1Name" placeholder="" />
          <input type="tel" id="newP1Phone" placeholder="" />
        </div>
        <div class="family-card-parent">
          <span class="parent-label" data-i18n="parent2"></span>
          <input type="text" id="newP2Name" placeholder="" />
          <input type="tel" id="newP2Phone" placeholder="" />
        </div>
        <div class="family-card-actions">
          <button class="primary" id="addFamily" data-i18n="add_family"></button>
        </div>
      </div>
    </div>
    <div class="family-list">${cards}</div>
  `;
}

function wireFamiliesTab() {
  document.getElementById("newName").placeholder = t("family_name");
  document.getElementById("newP1Name").placeholder = t("parent_name");
  document.getElementById("newP1Phone").placeholder = t("parent_phone");
  document.getElementById("newP2Name").placeholder = t("parent_name");
  document.getElementById("newP2Phone").placeholder = t("parent_phone");
  document.getElementById("addFamily").addEventListener("click", async () => {
    const name = document.getElementById("newName").value.trim();
    const quota = Number(document.getElementById("newQuota").value || 4);
    const parents = [
      {
        name: document.getElementById("newP1Name").value,
        phone: document.getElementById("newP1Phone").value,
      },
      {
        name: document.getElementById("newP2Name").value,
        phone: document.getElementById("newP2Phone").value,
      },
    ];
    if (!name) return;
    const res = await api("/api/admin/families", {
      method: "POST",
      body: JSON.stringify({ name, quota, parents }),
    });
    if (!res.ok) return alert(t("err_generic"));
    await loadState();
  });
  for (const card of document.querySelectorAll(".family-card[data-id]")) {
    const id = card.dataset.id;
    card.querySelectorAll('input[type="text"], input[type="tel"]').forEach((i) => {
      if (i.classList.contains("p1name") || i.classList.contains("p2name"))
        i.placeholder = t("parent_name");
      if (i.classList.contains("p1phone") || i.classList.contains("p2phone"))
        i.placeholder = t("parent_phone");
    });
    card.querySelector(".save").addEventListener("click", async () => {
      const name = card.querySelector(".fname").value.trim();
      const quota = Number(card.querySelector(".fquota").value);
      const active = card.querySelector(".factive").checked;
      const parents = [
        {
          name: card.querySelector(".p1name").value,
          phone: card.querySelector(".p1phone").value,
        },
        {
          name: card.querySelector(".p2name").value,
          phone: card.querySelector(".p2phone").value,
        },
      ];
      const res = await api(`/api/admin/families/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, quota, active, parents }),
      });
      if (!res.ok) return alert(t("err_generic"));
      await loadState();
    });
    card.querySelector(".del").addEventListener("click", async () => {
      const name = card.querySelector(".fname").value.trim();
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
      <div class="row" style="justify-content:space-between; align-items:center; margin-bottom:10px">
        <h2 style="margin:0" data-i18n="tab_saturdays"></h2>
        <button class="primary" id="saveAllBtn" data-i18n="save_all"></button>
      </div>
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

  document.getElementById("saveAllBtn").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    const original = btn.textContent;
    btn.textContent = t("saving");
    const requests = [];
    for (const row of document.querySelectorAll("tr[data-id]")) {
      const id = row.dataset.id;
      const note = row.querySelector(".snote").value;
      const closed = row.querySelector(".sclosed").checked;
      requests.push(
        api(`/api/admin/saturdays/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ note, closed }),
        }),
      );
    }
    const results = await Promise.all(requests);
    const failed = results.filter((r) => !r.ok).length;
    if (failed) {
      btn.disabled = false;
      btn.textContent = original;
      alert(t("err_generic"));
      return;
    }
    await loadState(); // re-renders the tab; button is replaced
  });

  for (const row of document.querySelectorAll("tr[data-id]")) {
    const id = row.dataset.id;
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
  const first = state.saturdays[0]?.date || "";
  const last = state.saturdays[state.saturdays.length - 1]?.date || "";
  return `
    <div class="card">
      <h2 data-i18n="print_heading"></h2>
      <p data-i18n="print_help" style="color:var(--muted)"></p>
      <div class="row">
        <label style="flex:1"><span data-i18n="start_date"></span><br/>
          <input type="date" id="printStart" value="${first}"/></label>
        <label style="flex:1"><span data-i18n="end_date"></span><br/>
          <input type="date" id="printEnd" value="${last}"/></label>
      </div>
      <div class="row" style="margin-top:10px; justify-content:flex-end">
        <button id="openPrintBtn" class="primary" data-i18n="print_open"></button>
      </div>
    </div>
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
  document.getElementById("openPrintBtn").addEventListener("click", () => {
    const start = document.getElementById("printStart").value;
    const end = document.getElementById("printEnd").value;
    const params = new URLSearchParams();
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    const url = `/print.html${params.toString() ? "?" + params.toString() : ""}`;
    window.open(url, "_blank");
  });
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
      <div class="row" style="justify-content:flex-start; gap:12px">
        <button class="danger" id="resetBtn" data-i18n="danger_reset"></button>
        <button class="danger" id="clearSatBtn" data-i18n="danger_clear_saturdays"></button>
      </div>
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
  document.getElementById("clearSatBtn").addEventListener("click", async () => {
    if (!confirm(t("danger_clear_saturdays_confirm"))) return;
    const res = await api("/api/admin/clear-saturdays", { method: "POST" });
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
