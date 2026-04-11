// Cloudflare Worker entry point.
// Serves the API and delegates everything else to the static assets binding.

import {
  hasFamilyAccess,
  hasAdminAccess,
  familyLoginResponse,
  adminLoginResponse,
  logoutResponse,
  loginThrottleCheck,
  json,
} from "./auth.js";
import {
  getState,
  claimSlot,
  releaseSlot,
  createFamily,
  bulkCreateFamilies,
  updateFamily,
  deleteFamily,
  createSaturdaysInRange,
  updateSaturday,
  deleteSaturday,
  resetAssignments,
  clearAllSaturdays,
  getAuditLog,
} from "./db.js";
import { buildIcs, isIsoDate, isValidKind } from "./ics.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(request, env, url);
      } catch (err) {
        // Log as much context as we have so `wrangler tail` is useful.
        const method = request.method;
        const path = url.pathname;
        const message = err?.message || String(err);
        const stack = err?.stack || "";
        console.error(`API error ${method} ${path}: ${message}\n${stack}`);
        return json(
          {
            error: "internal_error",
            message,
            path,
            method,
          },
          500,
        );
      }
    }

    // /admin requires admin cookie; otherwise let the SPA show its login.
    // We still serve admin.html — the page itself calls /api/admin/whoami
    // and renders the login form if unauthorized.
    return env.ASSETS.fetch(request);
  },
};

async function handleApi(request, env, url) {
  const { pathname } = url;
  const method = request.method.toUpperCase();

  // --- Health / diagnostics (public, no auth) ---
  //
  // Returns presence of bindings and secrets (never the actual values)
  // plus basic DB row counts. Deliberately public: if admin login is
  // broken because COOKIE_SECRET is missing, an authenticated health
  // check would be useless for diagnosis.

  if (pathname === "/api/health" && method === "GET") {
    return json(await healthCheck(env));
  }

  // --- Auth endpoints (no cookie required to call) ---

  if (pathname === "/api/login" && method === "POST") {
    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    if (!loginThrottleCheck(ip)) return json({ error: "too_many_attempts" }, 429);
    const body = await safeJson(request);
    return familyLoginResponse(env, body.password);
  }

  if (pathname === "/api/admin/login" && method === "POST") {
    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    if (!loginThrottleCheck(ip)) return json({ error: "too_many_attempts" }, 429);
    const body = await safeJson(request);
    return adminLoginResponse(env, body.password);
  }

  if (pathname === "/api/logout" && method === "POST") {
    return logoutResponse();
  }

  if (pathname === "/api/whoami" && method === "GET") {
    return json({
      family: await hasFamilyAccess(request, env),
      admin: await hasAdminAccess(request, env),
    });
  }

  // --- Family-cookie endpoints ---

  // Calendar file for a given Saturday. Served with Content-Type
  // text/calendar so mobile browsers hand it off to the OS calendar
  // handler (iOS Calendar, Google Calendar, etc.) instead of dumping
  // a blob into Downloads like the old client-side generator did.
  // ?kind=cleaning returns the Saturday 09:00–12:00 cleaning event.
  // ?kind=keys     returns the Friday 16:00–18:00 key pickup event.
  //
  // Deliberately *public*: when you tap the link on a phone, the OS
  // calendar app refetches the URL without the browser's cookies, so
  // an authenticated endpoint would 401 and the event would never be
  // added. The .ics body contains only a generic reminder for a
  // publicly-known Saturday — no PII — so there's nothing to protect.
  if (pathname === "/api/ics" && method === "GET") {
    const date = url.searchParams.get("date");
    if (!isIsoDate(date)) return json({ error: "bad_date" }, 400);
    const kind = url.searchParams.get("kind") || "cleaning";
    if (!isValidKind(kind)) return json({ error: "bad_kind" }, 400);
    const lang = url.searchParams.get("lang") === "en" ? "en" : "fr";
    const body = buildIcs(date, kind, lang);
    return new Response(body, {
      status: 200,
      headers: {
        "content-type": "text/calendar; charset=utf-8",
        "content-disposition": `inline; filename="menage-petit-nemo-${date}-${kind}.ics"`,
        "cache-control": "no-store",
      },
    });
  }

  if (pathname === "/api/state" && method === "GET") {
    if (!(await hasFamilyAccess(request, env))) return json({ error: "unauthorized" }, 401);
    const state = await getState(env.DB);
    return json(state);
  }

  if (pathname === "/api/claim" && method === "POST") {
    if (!(await hasFamilyAccess(request, env))) return json({ error: "unauthorized" }, 401);
    const body = await safeJson(request);
    const isAdmin = await hasAdminAccess(request, env);
    const res = await claimSlot(
      env.DB,
      {
        saturdayId: Number(body.saturdayId),
        slot: Number(body.slot),
        familyId: Number(body.familyId),
      },
      { isAdmin },
    );
    if (res.error) return json(res, statusForError(res.error));
    return json(res);
  }

  if (pathname === "/api/release" && method === "POST") {
    if (!(await hasFamilyAccess(request, env))) return json({ error: "unauthorized" }, 401);
    const body = await safeJson(request);
    const isAdmin = await hasAdminAccess(request, env);
    const res = await releaseSlot(env.DB, Number(body.assignmentId), {
      familyId: Number(body.familyId),
      isAdmin,
    });
    if (res.error) return json(res, statusForError(res.error));
    return json(res);
  }

  // --- Admin-cookie endpoints ---

  if (pathname.startsWith("/api/admin/")) {
    if (!(await hasAdminAccess(request, env))) return json({ error: "unauthorized" }, 401);

    if (pathname === "/api/admin/families" && method === "POST") {
      const body = await safeJson(request);
      const res = await createFamily(env.DB, body);
      return json(res, res.error ? 400 : 200);
    }

    if (pathname === "/api/admin/families/import" && method === "POST") {
      const body = await safeJson(request);
      const res = await bulkCreateFamilies(env.DB, body.families);
      return json(res, res.error ? 400 : 200);
    }

    const famMatch = pathname.match(/^\/api\/admin\/families\/(\d+)$/);
    if (famMatch) {
      const id = Number(famMatch[1]);
      if (method === "PATCH") {
        const body = await safeJson(request);
        const res = await updateFamily(env.DB, id, body);
        return json(res, res.error ? 400 : 200);
      }
      if (method === "DELETE") {
        const res = await deleteFamily(env.DB, id);
        return json(res);
      }
    }

    if (pathname === "/api/admin/saturdays" && method === "POST") {
      const body = await safeJson(request);
      const res = await createSaturdaysInRange(env.DB, body);
      return json(res, res.error ? 400 : 200);
    }

    const satMatch = pathname.match(/^\/api\/admin\/saturdays\/(\d+)$/);
    if (satMatch) {
      const id = Number(satMatch[1]);
      if (method === "PATCH") {
        const body = await safeJson(request);
        const res = await updateSaturday(env.DB, id, body);
        return json(res, res.error ? 400 : 200);
      }
      if (method === "DELETE") {
        const res = await deleteSaturday(env.DB, id);
        return json(res);
      }
    }

    if (pathname === "/api/admin/reset" && method === "POST") {
      const res = await resetAssignments(env.DB);
      return json(res);
    }

    if (pathname === "/api/admin/audit" && method === "GET") {
      const limit = Number(url.searchParams.get("limit") || 200);
      const entries = await getAuditLog(env.DB, limit);
      return json({ entries });
    }

    if (pathname === "/api/admin/clear-saturdays" && method === "POST") {
      const res = await clearAllSaturdays(env.DB);
      return json(res);
    }
  }

  // TODO(v2): GET /api/calendar/:token.ics — per-family iCal feed.
  // Add a families.cal_token column, generate tokens in admin,
  // render VCALENDAR with one VEVENT per assignment (+VALARM reminder).

  return json({ error: "not_found" }, 404);
}

function statusForError(code) {
  switch (code) {
    case "slot_taken": return 409;
    case "saturday_closed": return 409;
    case "saturday_past": return 409;
    case "family_already_booked": return 409;
    case "wrong_local": return 409;
    case "not_your_slot": return 403;
    case "no_such_saturday":
    case "no_such_family":
    case "not_found":
      return 404;
    case "bad_slot":
    case "bad_dates":
    case "bad_range":
    case "name_required":
      return 400;
    default:
      return 400;
  }
}

async function safeJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

// Health check — reports which bindings and secrets the Worker can see
// and tries a few DB queries. Values are never exposed, only presence.
async function healthCheck(env) {
  const status = {
    ok: true,
    time: new Date().toISOString(),
    bindings: {
      DB: !!env.DB,
      ASSETS: !!env.ASSETS,
    },
    secrets: {
      FAMILY_PASSWORD: !!env.FAMILY_PASSWORD,
      ADMIN_PASSWORD: !!env.ADMIN_PASSWORD,
      COOKIE_SECRET: !!env.COOKIE_SECRET,
    },
    db: null,
  };
  if (!status.bindings.DB) {
    status.ok = false;
  } else {
    try {
      const [families, saturdays, assignments, lastMod] = await Promise.all([
        env.DB.prepare("SELECT COUNT(*) AS c FROM families").first(),
        env.DB.prepare("SELECT COUNT(*) AS c FROM saturdays").first(),
        env.DB.prepare("SELECT COUNT(*) AS c FROM assignments").first(),
        env.DB.prepare("SELECT value FROM config WHERE key = 'last_modified'").first(),
      ]);
      status.db = {
        ok: true,
        families: families?.c ?? 0,
        saturdays: saturdays?.c ?? 0,
        assignments: assignments?.c ?? 0,
        lastModified: lastMod?.value || null,
      };
    } catch (err) {
      status.ok = false;
      status.db = { ok: false, error: err?.message || String(err) };
    }
  }
  if (
    !status.secrets.FAMILY_PASSWORD ||
    !status.secrets.ADMIN_PASSWORD ||
    !status.secrets.COOKIE_SECRET
  ) {
    status.ok = false;
  }
  return status;
}
