// Shared VCALENDAR generator. Used by the /api/ics route in worker.js.
//
// Produces a small VCALENDAR containing a single event, one of:
//   - cleaning: the Saturday itself, 09:00–12:00 floating local time
//   - keys:     the Friday before, 16:00–18:00 floating local time
//
// We generate one event per file so parents can pick which reminder(s)
// they want to add to their calendar — two separate taps from the UI.
//
// "Floating" local time means no TZID and no trailing Z, so the calendar
// app renders the events in the viewer's local timezone. This is the
// right behaviour for a daycare in France — the parent's phone will show
// 09:00 whether they're in Paris or on holiday elsewhere.

const SUMMARIES = {
  fr: {
    cleaning: "Ménage crèche Petit Nemo",
    keys: "Récupérer les clés — ménage Petit Nemo",
  },
  en: {
    cleaning: "Petit Nemo daycare cleaning",
    keys: "Pick up keys — Petit Nemo cleaning",
  },
};

export function buildIcs(satIso, kind, lang = "fr") {
  const s = SUMMARIES[lang === "en" ? "en" : "fr"];
  const satCompact = satIso.replace(/-/g, "");
  const friCompact = addDays(satIso, -1).replace(/-/g, "");
  const dtstamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const uidBase = `menage-petit-nemo-${satCompact}`;

  let uid, dtstart, dtend, summary;
  if (kind === "keys") {
    uid = `${uidBase}-keys@menage-petit-nemo`;
    dtstart = `${friCompact}T160000`;
    dtend = `${friCompact}T180000`;
    summary = s.keys;
  } else {
    // default kind = "cleaning"
    uid = `${uidBase}-cleaning@menage-petit-nemo`;
    dtstart = `${satCompact}T090000`;
    dtend = `${satCompact}T120000`;
    summary = s.cleaning;
  }

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//menage-petit-nemo//FR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${icsEscape(summary)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  // RFC 5545 mandates CRLF line endings.
  return lines.join("\r\n") + "\r\n";
}

export function isValidKind(k) {
  return k === "cleaning" || k === "keys";
}

export function isIsoDate(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
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
