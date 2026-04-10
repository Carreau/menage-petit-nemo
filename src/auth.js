// Cookie signing + password checks.
//
// Two cookies are used:
//   mnp_family  - anyone who knows the shared family password
//   mnp_admin   - admin only (also grants family access)
//
// Cookies carry a payload "<role>.<expiry>" signed with HMAC-SHA256
// using COOKIE_SECRET. No user id — these are capability tokens.

const COOKIE_FAMILY = "mnp_family";
const COOKIE_ADMIN  = "mnp_admin";
const TTL_SECONDS   = 90 * 24 * 60 * 60; // 90 days

const encoder = new TextEncoder();

async function hmac(secret, data) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return bytesToB64Url(new Uint8Array(sig));
}

function bytesToB64Url(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Constant-time string compare.
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function signToken(secret, role, ttlSeconds = TTL_SECONDS) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${role}.${exp}`;
  const sig = await hmac(secret, payload);
  return `${payload}.${sig}`;
}

async function verifyToken(secret, token, expectedRole) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [role, expStr, sig] = parts;
  if (role !== expectedRole) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = await hmac(secret, `${role}.${expStr}`);
  return safeEqual(sig, expected);
}

function parseCookies(req) {
  const header = req.headers.get("cookie") || "";
  const out = {};
  for (const part of header.split(/;\s*/)) {
    if (!part) continue;
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    out[part.slice(0, idx)] = decodeURIComponent(part.slice(idx + 1));
  }
  return out;
}

function buildSetCookie(name, value, { maxAge = TTL_SECONDS, clear = false } = {}) {
  const attrs = [
    `${name}=${clear ? "" : encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${clear ? 0 : maxAge}`,
  ];
  return attrs.join("; ");
}

export async function hasFamilyAccess(req, env) {
  const cookies = parseCookies(req);
  if (await verifyToken(env.COOKIE_SECRET, cookies[COOKIE_ADMIN], "admin")) return true;
  return verifyToken(env.COOKIE_SECRET, cookies[COOKIE_FAMILY], "family");
}

export async function hasAdminAccess(req, env) {
  const cookies = parseCookies(req);
  return verifyToken(env.COOKIE_SECRET, cookies[COOKIE_ADMIN], "admin");
}

export async function familyLoginResponse(env, password) {
  if (!env.FAMILY_PASSWORD || !safeEqual(String(password || ""), env.FAMILY_PASSWORD)) {
    return json({ error: "invalid_password" }, 401);
  }
  const token = await signToken(env.COOKIE_SECRET, "family");
  return json({ ok: true }, 200, {
    "Set-Cookie": buildSetCookie(COOKIE_FAMILY, token),
  });
}

export async function adminLoginResponse(env, password) {
  if (!env.ADMIN_PASSWORD || !safeEqual(String(password || ""), env.ADMIN_PASSWORD)) {
    return json({ error: "invalid_password" }, 401);
  }
  const token = await signToken(env.COOKIE_SECRET, "admin");
  return json({ ok: true }, 200, {
    "Set-Cookie": buildSetCookie(COOKIE_ADMIN, token),
  });
}

export function logoutResponse() {
  const headers = new Headers({ "content-type": "application/json" });
  headers.append("Set-Cookie", buildSetCookie(COOKIE_FAMILY, "", { clear: true }));
  headers.append("Set-Cookie", buildSetCookie(COOKIE_ADMIN, "", { clear: true }));
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}

export function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...extraHeaders },
  });
}

// Minimal per-IP login throttle (best-effort; Worker instances are short-lived).
const loginAttempts = new Map(); // ip -> { count, resetAt }

export function loginThrottleCheck(ip) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const limit = 8;
  const entry = loginAttempts.get(ip);
  if (!entry || entry.resetAt < now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  entry.count += 1;
  if (entry.count > limit) return false;
  return true;
}
