const baseUrl = process.env.STAGING_API_HEALTH_URL?.trim();
if (!baseUrl) throw new Error("STAGING_API_HEALTH_URL is required");

const healthUrl = new URL(baseUrl);
if (healthUrl.protocol !== "https:" || ["localhost", "127.0.0.1", "::1"].includes(healthUrl.hostname)) {
  throw new Error("STAGING_API_HEALTH_URL must be a stable public HTTPS URL");
}

const response = await fetch(healthUrl, { signal: AbortSignal.timeout(15_000), headers: { Accept: "application/json" } });
if (!response.ok) throw new Error(`Staging health check returned HTTP ${response.status}`);
const result = await response.json();
if (result?.ok !== true || result?.environment !== "staging") {
  throw new Error("Staging health response must report ok=true and environment=staging");
}
console.log(JSON.stringify({ event: "staging_health_validated", environment: result.environment, database: result.database }));
