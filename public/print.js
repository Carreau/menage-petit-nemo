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
      // The printable sheet is compiled by admin for display at the
      // daycare, so it does carry phone numbers — the whole point is
      // that staff and parents have a contact sheet they can ring.
      // Participating parents are bolded so it's obvious who will be
      // physically cleaning from each family on the day.
      const slotCell = (a) => {
        if (!a) return `<td class="slot-empty"></td>`;
        const famRec = state.families.find((f) => f.id === a.familyId);
        const participating = a.participating || [true, true];
        const parents = (famRec?.parents || [])
          .map((p, i) => ({ p, i }))
          .filter(({ p }) => p && (p.name || p.phone))
          .map(({ p, i }) => {
            const parts = [];
            if (p.name) parts.push(escapeHtml(p.name));
            if (p.phone) parts.push(escapeHtml(p.phone));
            const cls = participating[i] ? "phone participating" : "phone";
            return `<div class="${cls}">${parts.join(" · ")}</div>`;
          })
          .join("");
        return `<td><strong>${escapeHtml(a.familyName)}</strong>${parents}</td>`;
      };
      // The form is meant to be filled in by hand at the daycare entrance.
      // Rows where at least one slot is empty get an extra-tall class so
      // there's enough room to write a name and phone number with a pen.
      const hasEmpty = !s.slots[0] || !s.slots[1];
      return `
        <tr class="${hasEmpty ? "has-empty" : ""}">
          <td class="date-cell">
            ${formatDate(s.date)}
            ${s.note ? `<div class="note">${escapeHtml(s.note)}</div>` : ""}
          </td>
          ${slotCell(s.slots[0])}
          ${slotCell(s.slots[1])}
        </tr>`;
    })
    .join("");

  root.innerHTML = `
    <section class="card print-card">
      <table class="print-table">
        <colgroup>
          <col class="col-date" />
          <col />
          <col />
        </colgroup>
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
