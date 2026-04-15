const CACHE_KEY = "quantly_auth_cache";
/** Legacy keys — cleared on write so only the cache blob is used */
const LEGACY_ACCESS_KEY = "quantly_access_token";
const LEGACY_REFRESH_KEY = "quantly_refresh_token";

export type AuthCache = {
  user_id: string;
  access_token: string;
  refresh_token: string;
  /** When the access token should be treated as expired (ms since epoch), if known */
  access_expires_at_ms: number | null;
  stored_at_ms: number;
};

export type AuthCacheInput = {
  user_id: string;
  access_token: string;
  refresh_token: string;
  /** From login `expires_in` (seconds). Signup may omit; we fall back to JWT `exp`. */
  expires_in?: number;
};

function decodeJwtExpMs(accessToken: string): number | null {
  try {
    const part = accessToken.split(".")[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const pad = (4 - (base64.length % 4)) % 4;
    const padded = base64 + "=".repeat(pad);
    const payload = JSON.parse(atob(padded)) as { exp?: number };
    if (typeof payload.exp === "number") return payload.exp * 1000;
  } catch {
    return null;
  }
  return null;
}

function accessExpiresAtMs(input: AuthCacheInput): number | null {
  if (typeof input.expires_in === "number" && input.expires_in > 0) {
    return Date.now() + input.expires_in * 1000;
  }
  return decodeJwtExpMs(input.access_token);
}

function stripLegacyKeys(): void {
  localStorage.removeItem(LEGACY_ACCESS_KEY);
  localStorage.removeItem(LEGACY_REFRESH_KEY);
}

/**
 * Persist auth after login or signup so protected routes can attach `Authorization`.
 */
export function setAuthCache(input: AuthCacheInput): void {
  if (typeof window === "undefined") return;

  const cache: AuthCache = {
    user_id: input.user_id,
    access_token: input.access_token,
    refresh_token: input.refresh_token,
    access_expires_at_ms: accessExpiresAtMs(input),
    stored_at_ms: Date.now(),
  };

  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  stripLegacyKeys();
}

export function getAuthCache(): AuthCache | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(CACHE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthCache;
    if (
      parsed &&
      typeof parsed.user_id === "string" &&
      typeof parsed.access_token === "string" &&
      typeof parsed.refresh_token === "string"
    ) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

export function getAccessToken(): string | null {
  return getAuthCache()?.access_token ?? null;
}

export function getRefreshToken(): string | null {
  return getAuthCache()?.refresh_token ?? null;
}

/** For `fetch(..., { headers: getAuthHeaders() })` */
export function getAuthHeaders(): HeadersInit {
  const token = getAccessToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

/** True if we have an access token and optional expiry has not passed (with 30s skew). */
export function isAccessTokenLikelyValid(): boolean {
  const c = getAuthCache();
  if (!c?.access_token) return false;
  if (c.access_expires_at_ms == null) return true;
  return Date.now() < c.access_expires_at_ms - 30_000;
}

export function clearAuthCache(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CACHE_KEY);
  stripLegacyKeys();
}

/** Alias for logout / 401 handling */
export const clearAuthTokens = clearAuthCache;
