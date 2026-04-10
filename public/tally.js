// Tally page: per-family counter of cleanings done / quota.
// Requires the family cookie (same gate as the schedule).

import { t, getLang, setLang } from "./i18n.js";

const root        = document.getElementById("root");
const langToggle  = document.getElementById("langToggle");
const logoutBtn   = document.getElementById("logoutBtn");

let state = null;

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
  location.href = "/";
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
    location.href = "/";
    return;
  }
  logoutBtn.classList.remove("hidden");
  const res = await api("/api/state");
  if (!res.ok) {
    if (res.status === 401) {
      location.href = "/";
      return;
    }
    root.innerHTML = `<div class="card">${t("err_generic")}</div>`;
    return;
  }
  state = res.data;
  render();
}

function render() {
  if (!state) return;

  const active = state.families.filter((f) => f.active);
  const totalUsed = active.reduce((acc, f) => acc + f.used, 0);
  const totalQuota = active.reduce((acc, f) => acc + f.quota, 0);
  const totalRemaining = Math.max(0, totalQuota - totalUsed);

  const list = active.length
    ? `<div class="families">${active
        .map((f) => {
          const cls =
            f.used >= f.quota ? "done" : f.used > 0 ? "partial" : "empty";
          const parents = renderParentLines(f.parents || []);
          return `
            <div class="family ${cls}">
              <div class="family-main">
                <span class="name">${escapeHtml(f.name)}</span>
                ${parents}
              </div>
              <span class="tally">${t("quota_label", f.used, f.quota)}</span>
            </div>`;
        })
        .join("")}</div>`
    : `<p>${t("no_families")}</p>`;

  root.innerHTML = `
    <section class="card">
      <div class="summary">
        <div>
          <div class="num">${totalUsed} / ${totalQuota}</div>
          <div class="lbl" data-i18n="tally_heading"></div>
        </div>
        <div>
          <div class="num">${totalRemaining}</div>
          <div class="lbl">${t("summary_remaining", totalRemaining)}</div>
        </div>
      </div>
    </section>

    <section class="card">
      <h2 data-i18n="families_heading"></h2>
      ${list}
    </section>
  `;
  applyI18n();
}

function renderParentLines(parents) {
  return (parents || [])
    .filter((p) => p && (p.name || p.phone))
    .map((p) => {
      const name = p.name ? escapeHtml(p.name) : "";
      const phone = p.phone
        ? `<a class="phone" href="tel:${encodeURIComponent(p.phone)}">${escapeHtml(p.phone)}</a>`
        : "";
      const sep = name && phone ? " · " : "";
      return `<div class="family-parent">${name}${sep}${phone}</div>`;
    })
    .join("");
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
  );
}

boot();
