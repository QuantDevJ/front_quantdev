import { getApiBaseUrl } from "@/lib/api-base";
import { getRefreshToken, setAuthCache } from "@/lib/auth-session";

type RefreshEnvelope = {
  success: boolean;
  data?: {
    user_id: string;
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
};

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Exchanges refresh_token for new access + refresh tokens. Single-flight: concurrent
 * callers share one request. Returns false if refresh fails (caller should logout).
 */
export function refreshSession(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  const p = (async (): Promise<boolean> => {
    try {
      const base = getApiBaseUrl();
      const refreshToken = getRefreshToken();
      if (!base || !refreshToken) return false;

      const res = await fetch(`${base}/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      const raw = await res.text();
      let json: unknown = null;
      try {
        json = raw ? JSON.parse(raw) : null;
      } catch {
        return false;
      }

      const envelope = json as RefreshEnvelope;
      if (!res.ok || !envelope.success || !envelope.data) {
        return false;
      }

      const d = envelope.data;
      setAuthCache({
        user_id: d.user_id,
        access_token: d.access_token,
        refresh_token: d.refresh_token,
        expires_in: d.expires_in,
      });
      return true;
    } catch {
      return false;
    }
  })();

  refreshInFlight = p;
  void p.finally(() => {
    refreshInFlight = null;
  });
  return p;
}
