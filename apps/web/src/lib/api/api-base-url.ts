export function resolveApiBaseUrl(value: string): string {
  const baseUrl = value.replace(/\/$/, "");
  return baseUrl.endsWith("/api/v1") ? baseUrl : `${baseUrl}/api/v1`;
}
