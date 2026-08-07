export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  sessionIssuer: process.env.SESSION_ISSUER ?? "amala-oluyole-api",
  allowedOrigins: String(process.env.ALLOWED_ORIGINS ?? "").split(",").map((value: string) => value.trim()).filter(Boolean),
};

const DEFAULT_SECRET_MARKERS = ["changeme", "change-me", "secret", "xxxxxxxx", "example", "default"];

function isWeakSecret(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return value.trim().length < 32 || DEFAULT_SECRET_MARKERS.some((marker) => normalized.includes(marker));
}

export function productionConfigurationErrors(environment: NodeJS.ProcessEnv): string[] {
  if (environment.NODE_ENV !== "production") return [];
  const appId = environment.VITE_APP_ID ?? "";
  const cookieSecret = environment.JWT_SECRET ?? "";
  const databaseUrl = environment.DATABASE_URL ?? "";
  const oAuthServerUrl = environment.OAUTH_SERVER_URL ?? "";
  const allowedOrigins = String(environment.ALLOWED_ORIGINS ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  const errors: string[] = [];
  if (!appId.trim()) errors.push("VITE_APP_ID is required");
  if (isWeakSecret(cookieSecret)) errors.push("JWT_SECRET must be at least 32 characters and non-default");
  if (!/^mysql:\/\//i.test(databaseUrl) || DEFAULT_SECRET_MARKERS.some((marker) => databaseUrl.toLowerCase().includes(marker))) {
    errors.push("DATABASE_URL must be a non-placeholder MySQL URL");
  }
  const paystackSecret = environment.PAYSTACK_SECRET_KEY ?? "";
  if (isWeakSecret(paystackSecret) || !/^sk_/.test(paystackSecret)) errors.push("PAYSTACK_SECRET_KEY is missing or weak");
  if (!/^https:\/\//.test(oAuthServerUrl)) errors.push("OAUTH_SERVER_URL must be an HTTPS URL");
  if (allowedOrigins.length === 0 || allowedOrigins.some((origin: string) => origin === "*" || !/^https:\/\//.test(origin))) {
    errors.push("ALLOWED_ORIGINS must contain explicit HTTPS origins");
  }
  for (const prefix of ["PLAY_INTEGRITY", "APPLE_APP_ATTEST"]) {
    const verifierUrl = environment[`${prefix}_VERIFIER_URL`] ?? "";
    const verifierToken = environment[`${prefix}_VERIFIER_TOKEN`] ?? "";
    if (!/^https:\/\//.test(verifierUrl)) errors.push(`${prefix}_VERIFIER_URL must be an HTTPS URL`);
    if (isWeakSecret(verifierToken)) errors.push(`${prefix}_VERIFIER_TOKEN is missing or weak`);
  }
  return errors;
}

export function validateProductionEnvironment(): void {
  const errors = productionConfigurationErrors(process.env);
  if (errors.length > 0) throw new Error(`Unsafe production configuration: ${errors.join("; ")}`);
}
