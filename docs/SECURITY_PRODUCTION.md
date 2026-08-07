# Production security runbook

This application now treats the server and database as the authority for catalog prices, discounts, loyalty balances, fees, delivery eligibility, payment state, rider assignments, and order transitions. Production deployment still requires the platform controls below; do not treat a successful JavaScript build as production readiness.

## Required environment and database rollout

1. Copy `.env.example` into the deployment secret manager, not into the repository. Generate `JWT_SECRET` with at least 32 random bytes and use explicit HTTPS `ALLOWED_ORIGINS`. Production startup rejects placeholder secrets, non-MySQL database URLs, missing Paystack credentials, and wildcard or non-HTTPS origins.
2. Before applying `drizzle/0002_security_hardening.sql`, query for duplicate non-null `orders.paymentReference` values and duplicate proposed loyalty idempotency keys. Resolve duplicates, take a backup, apply the migration in staging, then production, and verify both unique constraints plus the OAuth, app-integrity, and one-time refresh-session tables.
3. Configure the Paystack live secret only on the API. Register `/api/paystack/webhook`, verify that Paystack signs test events, and confirm exact reference/amount/currency/metadata matching. Never ship a secret key or a client-side payment-confirmation path.
4. Configure HTTPS, HSTS, the exact origins, centralized rate limiting at the edge, request-ID-preserving logs, database backups, and alerting for payment, integrity, CSRF, authorization, and rate-limit failures.

## Android signing and Play Integrity

- Create the Android upload key and Play App Signing configuration outside Git. Keep `.jks`/`.keystore` files in the organization secret manager and CI protected files; store aliases and passwords separately.
- Register package `com.app.amala.oluyole.app` and every release signing certificate digest in Play Console. Enable Play Integrity and grant the server-side verifier only the minimum Google Cloud permissions.
- Implement the native `AmalaIntegrity.attest(nonce, operation)` React Native bridge with Play Integrity Standard requests. It must return the opaque provider assertion without logging it.
- Deploy the verifier behind `PLAY_INTEGRITY_VERIFIER_URL`; it must validate Google’s signature, request hash/nonce, package name, certificate digest, app-recognition verdict, licensing/device verdicts, and freshness, then return the normalized fields expected by `server/security/app-integrity.ts`.
- Set `EXPO_PUBLIC_INTEGRITY_ENABLED=true` in release builds. Production bearer-authenticated high-risk requests fail closed if proof is absent even if this client flag is misconfigured.

## iOS signing and App Attest

- Use an organization-controlled Apple Developer team, distribution certificate, provisioning profile, and App Store Connect API key. Store `.p8`/`.p12` files only in the secret manager/CI protected files.
- Enable App Attest for the bundle identifier and implement the same `AmalaIntegrity.attest(nonce, operation)` bridge with `DCAppAttestService`. Persist the generated key identifier in Keychain, never AsyncStorage.
- Deploy the verifier behind `APPLE_APP_ATTEST_VERIFIER_URL`; validate Apple’s certificate chain, authenticator data, app identifier/team binding, nonce/client-data hash, counter, and freshness before returning the normalized verdict.
- The one-time database challenge is short-lived and atomically consumed. A replayed challenge or assertion is rejected.

## Deep links, screenshots, and device storage

- Host Android `/.well-known/assetlinks.json` and Apple `/.well-known/apple-app-site-association` on `amalaoluyole.com` with exact package/bundle identifiers and production signing fingerprints/team ID. Keep the OAuth callback restricted to `/oauth/callback`; do not add wildcard hosts or paths.
- Validate Universal Links/App Links and custom-scheme callbacks on physical release builds. OAuth state is server-generated, bound to the initiating client, expires after ten minutes, and is single-use.
- Checkout, order tracking, OAuth callback, and staff/rider routes prevent screenshots/recording. Android recents are blanked through `FLAG_SECURE`; iOS uses a high-intensity app-switcher privacy blur while those routes are mounted.
- Access/refresh tokens and OAuth bindings use SecureStore on native devices. The persisted application store allowlist excludes user records, roles, tokens, addresses, and loyalty data. Logging must never include tokens, codes, cookies, assertions, payment references, or full customer/rider records.

## Rollout and emergency response

1. Deploy schema and verifier services to staging. Use provider test verdicts and monitor failures without relaxing server validation.
2. Ship internal native builds with integrity enabled. Exercise checkout, payment, rider location/status, and every admin mutation on valid, unlicensed, tampered, rooted/jailbroken, replayed, and expired-proof cases.
3. Roll out gradually by store cohort. Alert on integrity failure rate and payment reconciliation differences; do not fall back to accepting an unverifiable client assertion.
4. For compromise: disable affected client versions at the edge, revoke verifier/API credentials and signing API keys, rotate Paystack/OAuth/JWT credentials, invalidate refresh sessions, block affected certificate/key IDs, reconcile paid orders directly with Paystack, preserve audit logs, and publish a replacement build.

## Known deployment blockers

- The TypeScript bridge contract and server verifier boundary are implemented, but the Android Play Integrity and iOS App Attest native bridge implementations and verifier services are deployment-owned components. Production mobile high-risk actions intentionally fail closed until they exist and release builds set `EXPO_PUBLIC_INTEGRITY_ENABLED=true`.
- The association files must be hosted by the production domain and populated with the final signing identities.
- The migration needs the duplicate-reference preflight described above because existing production data was unavailable during this remediation.
