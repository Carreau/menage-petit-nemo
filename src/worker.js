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
  updateFamily,
  deleteFamily,
  createSaturdaysInRange,
  updateSaturday,
  deleteSaturday,
  resetAssignments,
} from "./db.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      try {
        return await handleApi(request, env, url);
      } catch (err) {
        console.error("API error", err);
        return json({ error: "internal_error" }, 500);
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

  if (pathname === "/api/state" && method === "GET") {
    if (!(await hasFamilyAccess(request, env))) return json({ error: "unauthorized" }, 401);
    const state = await getState(env.DB);
    return json(state);
  }

  if (pathname === "/api/claim" && method === "POST") {
    if (!(await hasFamilyAccess(request, env))) return json({ error: "unauthorized" }, 401);
    const body = await safeJson(request);
    const res = await claimSlot(env.DB, {
      saturdayId: Number(body.saturdayId),
      slot: Number(body.slot),
      familyId: Number(body.familyId),
    });
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
