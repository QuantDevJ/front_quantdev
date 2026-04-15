export function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  return url?.replace(/\/$/, "") ?? "";
}
