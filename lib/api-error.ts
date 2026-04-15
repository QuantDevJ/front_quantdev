export type ApiFieldDetail = {
  field: string;
  issue: string;
};

export class ApiError extends Error {
  readonly code: string;
  readonly details: ApiFieldDetail[];

  constructor(
    code: string,
    message: string,
    details: ApiFieldDetail[] = [],
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
  }

  static isApiError(err: unknown): err is ApiError {
    return err instanceof ApiError;
  }
}

function normalizeDetails(raw: unknown): ApiFieldDetail[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const field =
      "field" in item && typeof item.field === "string"
        ? item.field
        : "request";
    const issue =
      "issue" in item && typeof item.issue === "string"
        ? item.issue
        : "Invalid value";
    return [{ field, issue }];
  });
}

/** Parses our API error envelope: { success: false, error: { code, message, details } } */
export function apiErrorFromResponseBody(body: unknown): ApiError | null {
  if (!body || typeof body !== "object") return null;
  if (!("success" in body) || (body as { success: unknown }).success !== false)
    return null;
  const err = (body as { error?: unknown }).error;
  if (!err || typeof err !== "object") return null;
  const code =
    "code" in err && typeof err.code === "string" ? err.code : "ERROR";
  const message =
    "message" in err && typeof err.message === "string"
      ? err.message
      : "Request failed";
  const details = normalizeDetails(
    "details" in err ? (err as { details: unknown }).details : [],
  );
  return new ApiError(code, message, details);
}

const FIELD_LABELS: Record<string, string> = {
  request: "Request",
  email: "Email",
  password: "Password",
  name: "Full name",
  new_password: "New password",
  refresh_token: "Session",
};

export function fieldLabel(field: string): string {
  const key = field.split(".").pop() ?? field;
  return FIELD_LABELS[key] ?? key.replace(/_/g, " ");
}
