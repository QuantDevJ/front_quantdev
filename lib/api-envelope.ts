import { ApiError, apiErrorFromResponseBody } from "@/lib/api-error";
import { refreshSession } from "@/lib/auth-refresh";
import { getAuthCache, getAuthHeaders } from "@/lib/auth-session";

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
};

function mergeHeaders(init?: HeadersInit): Headers {
  const h = new Headers(init);
  const auth = getAuthHeaders() as Record<string, string>;
  for (const [key, value] of Object.entries(auth)) {
    if (value) h.set(key, value);
  }
  return h;
}

const ACCESS_REFRESH_BUFFER_MS = 120_000;

/** If access token is expired or near expiry, refresh before the request. */
async function ensureFreshAccessToken(): Promise<void> {
  const c = getAuthCache();
  if (!c?.refresh_token) return;
  if (c.access_expires_at_ms == null) return;
  if (Date.now() < c.access_expires_at_ms - ACCESS_REFRESH_BUFFER_MS) return;
  await refreshSession();
}

export async function apiRequest<T>(
  url: string,
  init: RequestInit = {},
  onUnauthorized: () => void,
): Promise<T> {
  await ensureFreshAccessToken();

  const doFetch = () =>
    fetch(url, {
      ...init,
      headers: mergeHeaders(init.headers),
    });

  let res = await doFetch();
  let raw = await res.text();

  if (res.status === 401 && getAuthCache()?.refresh_token) {
    const refreshed = await refreshSession();
    if (refreshed) {
      res = await doFetch();
      raw = await res.text();
    }
  }

  let json: unknown = null;
  try {
    json = raw ? JSON.parse(raw) : null;
  } catch {
    throw new ApiError("INVALID", "Invalid response from server.", []);
  }

  if (res.status === 401) {
    onUnauthorized();
    throw new ApiError("UNAUTHORIZED", "Please log in again.", []);
  }

  if (!res.ok) {
    const err = apiErrorFromResponseBody(json);
    if (err) throw err;
    throw new ApiError("HTTP", `Request failed (${res.status})`, []);
  }

  const envelope = json as ApiEnvelope<T>;
  if (!envelope.success || envelope.data === undefined) {
    const err = apiErrorFromResponseBody(json);
    if (err) throw err;
    throw new ApiError("API", "Unexpected response from server.", []);
  }

  return envelope.data;
}

export function apiGet<T>(url: string, onUnauthorized: () => void): Promise<T> {
  return apiRequest<T>(url, { method: "GET" }, onUnauthorized);
}

export function apiPost<T>(
  url: string,
  body: unknown,
  onUnauthorized: () => void,
): Promise<T> {
  return apiRequest<T>(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    },
    onUnauthorized,
  );
}

export function apiDelete<T = Record<string, unknown>>(
  url: string,
  onUnauthorized: () => void,
): Promise<T> {
  return apiRequest<T>(url, { method: "DELETE" }, onUnauthorized);
}
