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

  // Show every active family from both sections. The BN count is
  // currently always 0 (no schedule yet) but listing them keeps the
  // tally page honest about who's in which section.
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
          const localLabel = f.local === "baby_nemo" ? "Baby Nemo" : "Petit Nemo";
          return `
            <div class="family ${cls}">
              ${renderAvatar(f.name, "md")}
              <div class="family-main">
                <span class="name">${escapeHtml(f.name)}</span>
                <span class="local-badge local-${f.local}">${localLabel}</span>
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

// Tally is a general counting view; for privacy we intentionally do
// NOT surface phone numbers here (they only show on the schedule for
// saturdays you are actually on). Parent names still appear so you know
// who's in each family.
function renderParentLines(parents) {
  return (parents || [])
    .filter((p) => p && p.name)
    .map((p) => `<div class="family-parent">${escapeHtml(p.name)}</div>`)
    .join("");
}

// Same auto-avatar helpers as on the schedule page (intentionally
// duplicated to keep the static pages framework-free).
function familyInitials(name) {
  const parts = String(name || "").split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const meaningful = parts.filter((p) => !/^(famille|family)$/i.test(p));
  const useParts = meaningful.length ? meaningful : parts;
  if (useParts.length === 1) {
    const w = useParts[0].replace(/[^\p{L}]/gu, "");
    return (w.slice(0, 2) || "?").toUpperCase();
  }
  return useParts.slice(0, 2).map((p) => p[0] || "").join("").toUpperCase();
}
function familyColor(name) {
  let hash = 0;
  const s = String(name || "");
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 55% 45%)`;
}
function renderAvatar(name, size = "md") {
  return `<span class="avatar avatar-${size}" style="background:${familyColor(name)}" aria-hidden="true">${escapeHtml(familyInitials(name))}</span>`;
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
  );
}

boot();
