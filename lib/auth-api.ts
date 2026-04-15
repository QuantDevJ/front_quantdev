import { getApiBaseUrl } from "@/lib/api-base";
import { ApiError, apiErrorFromResponseBody } from "@/lib/api-error";

export type AuthTokens = {
  access_token: string;
  refresh_token: string;
};

type ApiEnvelope<T> =
  | {
      success: true;
      data: T;
      error: null;
      timestamp: string;
    }
  | {
      success: false;
      data: null;
      error: { code: string; message: string; details?: unknown[] };
      timestamp: string;
    };

export type SignupResponseData = AuthTokens & {
  user_id: string;
  email_hash: string;
  created_at: string | null;
};

export type LoginResponseData = AuthTokens & {
  user_id: string;
  expires_in: number;
};

function parseJson(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function throwIfApiError(status: number, body: unknown): never {
  const parsed = apiErrorFromResponseBody(body);
  if (parsed) throw parsed;
  throw new ApiError(
    "HTTP_ERROR",
    `Request failed (${status})`,
    [],
  );
}

export async function postSignup(body: {
  email: string;
  password: string;
  name?: string | null;
}): Promise<SignupResponseData> {
  const base = getApiBaseUrl();
  if (!base) {
    throw new ApiError(
      "CONFIG",
      "Missing NEXT_PUBLIC_API_URL. Set it in .env.local and restart the dev server.",
      [],
    );
  }

  const res = await fetch(`${base}/v1/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: body.email,
      password: body.password,
      ...(body.name ? { name: body.name } : {}),
    }),
  });

  const raw = await res.text();
  const json = parseJson(raw);

  if (!res.ok) {
    throwIfApiError(res.status, json);
  }

  const envelope = json as ApiEnvelope<SignupResponseData>;
  if (!envelope || typeof envelope !== "object" || !("success" in envelope)) {
    throw new ApiError("INVALID_RESPONSE", "Unexpected response from server.", []);
  }
  if (!envelope.success || !envelope.data) {
    throwIfApiError(res.status, json);
  }

  return envelope.data;
}

export async function postLogin(body: {
  email: string;
  password: string;
}): Promise<LoginResponseData> {
  const base = getApiBaseUrl();
  if (!base) {
    throw new ApiError(
      "CONFIG",
      "Missing NEXT_PUBLIC_API_URL. Set it in .env.local and restart the dev server.",
      [],
    );
  }

  const res = await fetch(`${base}/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: body.email, password: body.password }),
  });

  const raw = await res.text();
  const json = parseJson(raw);

  if (!res.ok) {
    throwIfApiError(res.status, json);
  }

  const envelope = json as ApiEnvelope<LoginResponseData>;
  if (!envelope || typeof envelope !== "object" || !("success" in envelope)) {
    throw new ApiError("INVALID_RESPONSE", "Unexpected response from server.", []);
  }
  if (!envelope.success || !envelope.data) {
    throwIfApiError(res.status, json);
  }

  return envelope.data;
}
