// Print-friendly schedule view for the daycare wall.
//
// Usage: /print.html?start=YYYY-MM-DD&end=YYYY-MM-DD
// Requires the family cookie (same gate as the schedule). The page
// offers a Print button that triggers window.print(); the browser's
// "Save as PDF" destination gives the admin a PDF file to display or
// archive.

import { t, getLang, setLang, formatDate } from "./i18n.js";

const root = document.getElementById("root");
const langToggle = document.getElementById("langToggle");
const printBtn = document.getElementById("printBtn");

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

printBtn.addEventListener("click", () => window.print());

async function api(path) {
  const res = await fetch(path);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

let state = null;
let startDate = null;
let endDate = null;

function parseRange() {
  const p = new URLSearchParams(location.search);
  startDate = p.get("start") || null;
  endDate = p.get("end") || null;
}

async function boot() {
  parseRange();
  applyI18n();
  const who = await api("/api/whoami");
  if (!who.data.family) {
    location.href = "/";
    return;
  }
  const res = await api("/api/state");
  if (!res.ok) {
    root.innerHTML = `<div class="card">${t("err_generic")}</div>`;
    return;
  }
  state = res.data;
  render();
}

function render() {
  if (!state) return;
  let saturdays = state.saturdays;
  if (startDate) saturdays = saturdays.filter((s) => s.date >= startDate);
  if (endDate) saturdays = saturdays.filter((s) => s.date <= endDate);

  const rangeLine =
    startDate && endDate
      ? `${formatDate(startDate)} — ${formatDate(endDate)}`
      : startDate
      ? `≥ ${formatDate(startDate)}`
      : endDate
      ? `≤ ${formatDate(endDate)}`
      : t("print_all_range");

  const rows = saturdays
    .map((s) => {
      if (s.closed) {
        return `
          <tr class="closed-row">
            <td>${formatDate(s.date)}</td>
            <td colspan="2"><em>${t("closed_label")}</em>${
              s.note ? ` — ${escapeHtml(s.note)}` : ""
            }</td>
          </tr>`;
      }
      const slot = (a) => {
        if (!a) return `<span class="empty">—</span>`;
        const famRec = state.families.find((f) => f.id === a.familyId);
        const parents = (famRec?.parents || [])
          .filter((p) => p && (p.name || p.phone))
          .map((p) => {
            const parts = [];
            if (p.name) parts.push(escapeHtml(p.name));
            if (p.phone) parts.push(escapeHtml(p.phone));
            return `<div class="phone">${parts.join(" · ")}</div>`;
          })
          .join("");
        return `<strong>${escapeHtml(a.familyName)}</strong>${parents}`;
      };
      return `
        <tr>
          <td>
            ${formatDate(s.date)}
            ${s.note ? `<div class="note">${escapeHtml(s.note)}</div>` : ""}
          </td>
          <td>${slot(s.slots[0])}</td>
          <td>${slot(s.slots[1])}</td>
        </tr>`;
    })
    .join("");

  root.innerHTML = `
    <section class="card print-card">
      <div class="print-header">
        <h2 data-i18n="app_title"></h2>
        <div class="print-sub" data-i18n="schedule_heading"></div>
        <div class="print-range">${rangeLine}</div>
      </div>
      <table class="print-table">
        <thead>
          <tr>
            <th data-i18n="print_col_date"></th>
            <th data-i18n="print_col_slot1"></th>
            <th data-i18n="print_col_slot2"></th>
          </tr>
        </thead>
        <tbody>${
          rows ||
          `<tr><td colspan="3"><em>${t("no_saturdays")}</em></td></tr>`
        }</tbody>
      </table>
      <p class="print-footer">${t("print_footer_hint")}</p>
    </section>
  `;
  applyI18n();
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]),
  );
}

boot();
