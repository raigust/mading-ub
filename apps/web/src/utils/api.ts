export function getApiBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configuredUrl) return configuredUrl.startsWith("/") ? configuredUrl.replace(/\/+$/, "") : configuredUrl.replace(/\/+$/, "");
  return process.env.NODE_ENV === "development" ? "http://localhost:4000" : null;
}