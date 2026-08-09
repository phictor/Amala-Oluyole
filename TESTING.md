# Amala Oluyole Preview testing

`Amala Oluyole Preview` is the permanent stakeholder-testing app. It is an internally distributed, production-like binary connected only to staging and the `bytechain-preview` EAS Update channel. It does not require Metro, Expo Go, or a laptop after installation.

## Install the preview app

- Android: open the latest successful `preview` Android build on the [EAS builds dashboard](https://expo.dev/accounts/emmapastor/projects/amala-oluyole/builds), tap **Install**, download the APK, and approve installation from the browser if Android asks once.
- iPhone: the repository owner must first register the device UDID and create the `preview` iOS build. Open that build's EAS **Install** link in Safari on the registered device and accept the ad hoc installation prompts.
- The exact CLI commands for listing and creating those links are below. An iOS link does not exist until Apple signing and device registration are complete.
- Canonical staging web target: `https://staging.amalaoluyole.com` (must be provisioned before use).
- Canonical staging API health target: `https://staging-api.amalaoluyole.com/api/health` (must return `ok: true` and `environment: staging`).

The gold `TEST ENVIRONMENT` banner and TEST-marked home-screen icon distinguish preview from production. Production, preview, and development builds use separate bundle/package identifiers and can be installed side-by-side.

## Test accounts

Every tester uses the same neutral **Sign in** screen. Choose **Email** or **Phone**, then enter the one-time code delivered by the staging Resend/Twilio account. Passwords, codes, and recovery credentials are never stored in this repository. The repository owner supplies reachable staging-only addresses for these environment variables:

| Role | Staging identity | Main scenario |
| --- | --- | --- |
| Customer | `STAGING_TEST_CUSTOMER_EMAIL` | Browse, order, Paystack, loyalty, reservations, catering |
| Finance | `STAGING_TEST_FINANCE_EMAIL` | Read-only overview, transactions, and reports |
| Operations staff | `STAGING_TEST_STAFF_EMAIL` | Today view, orders, and dispatch |
| Kitchen | `STAGING_TEST_KITCHEN_EMAIL` | Accept, prepare, and mark orders ready |
| Rider | `STAGING_TEST_RIDER_EMAIL` | Assigned orders, location, and delivery completion |
| Owner/admin | `STAGING_TEST_ADMIN_EMAIL` | Restricted role assignment and system administration |
| Legacy manager | `STAGING_TEST_MANAGER_EMAIL` | Compatibility and management oversight |

To switch roles, sign out, choose **Sign in**, and request a code for the next staging identity. The server—not the app screen—decides which workspace opens. A new unrecognised email or phone number always creates a **Customer** account and can never self-select a staff role. Never reuse production identities in preview.

## Seed and reset staging data

Configure an isolated staging database plus the `STAGING_TEST_*_OPEN_ID` and `STAGING_TEST_*_EMAIL` values from `.env.example`, then run:

```powershell
pnpm db:migrate
pnpm db:seed:staging
```

The idempotent seed includes two branches, meals, the canonical custom-meal catalog, promo code `BYTECHAIN25`, a silver loyalty balance, assigned and unassigned rider scenarios, two test orders, a reservation, and a catering request.

Reset only the tagged staging fixtures and immediately reseed them with:

```powershell
pnpm db:reset:staging -- --confirm=RESET_BYTECHAIN_STAGING
```

The script refuses to run unless `APP_ENV=staging`, the database label contains `staging`, and the MySQL URL does not appear to be production. There is no HTTP reset endpoint.

## Complete order-to-delivery scenario

1. Sign in as Customer and select a `[PREVIEW]` branch.
2. Add a regular meal and a custom meal to the cart; apply `BYTECHAIN25`.
3. Choose delivery, enter a staging-only test address inside the configured delivery radius, and select card payment.
4. Complete a Paystack **test-mode** payment. For a successful payment use card `4084 0840 8408 4081`, any future expiry, and CVV `408`. For a decline use `4084 0800 0000 5408`, any future expiry, and CVV `001`.
5. Sign out and sign in as Kitchen. Accept the order, start preparation, then mark it ready.
6. Sign in as Operations staff. Open Dispatch and assign the Preview Rider.
7. Sign in as Rider. Go online, start the assigned delivery, and complete it using the displayed handover flow.
8. Sign back in as Customer and confirm the final status, loyalty update, and receipt.
9. Sign in as Finance and confirm the paid transaction appears without kitchen, dispatch, menu-editing, or role-management controls.

Paystack must be configured with an `sk_test_...` server key and a staging webhook. Never use a live key or treat the client callback as payment proof.

## Build, update, and development commands

The project is already linked as `@emmapastor/amala-oluyole`. Use this pinned helper in PowerShell for every EAS command; it avoids an upstream loader incompatibility between the current EAS CLI and TypeScript 7:

```powershell
function Invoke-Eas { npx.cmd --yes --package=eas-cli@21.7.0 --package=typescript@5.9.3 eas @args }
Invoke-Eas login
Invoke-Eas whoami
Invoke-Eas project:info
```

Store real secrets in the EAS `preview` environment or GitHub secrets, never in tracked files. The non-secret EAS project UUID is already linked in `app.config.ts`; `EAS_PROJECT_ID` remains an optional override.

Register an iPhone for ad hoc internal distribution:

```powershell
Invoke-Eas device:create
```

Build an Android development client for a physical device or emulator:

```powershell
Invoke-Eas build --platform android --profile development-device
```

Build the Android stakeholder preview APK:

```powershell
Invoke-Eas build --platform android --profile preview
```

Build an iOS development client for a registered physical device:

```powershell
Invoke-Eas build --platform ios --profile development-device
```

Build the iOS ad hoc stakeholder preview for registered devices:

```powershell
Invoke-Eas build --platform ios --profile preview
```

Build the separate iOS Simulator development client:

```powershell
Invoke-Eas build --platform ios --profile development-simulator
```

List the finished physical-device builds and open the `Build URL` printed for the required platform on that device:

```powershell
Invoke-Eas build:list --platform android --build-profile preview --status finished --limit 10
Invoke-Eas build:list --platform ios --build-profile preview --status finished --limit 10
```

Start Expo dev-client QR-code testing (not Expo Go):

```powershell
$env:APP_VARIANT="development"
$env:EXPO_PUBLIC_API_BASE_URL="https://staging-api.amalaoluyole.com"
$env:EXPO_PUBLIC_API_ENVIRONMENT="staging"
$env:EXPO_PUBLIC_DATABASE_ENVIRONMENT_LABEL="staging-isolated"
npx expo start --dev-client --tunnel
```

Open the installed `Amala Oluyole Dev` app and scan the QR code. To open a published compatible update without Metro, list the latest update and copy its group ID:

```powershell
Invoke-Eas update:list --branch bytechain-preview --limit 1
```

In the development client's launcher, choose **Enter URL Manually** and enter:

```text
amalaoluyole-dev://expo-development-client/?url=https://u.expo.dev/b5118588-8592-414a-a716-e991acd4183a/group/<UPDATE_GROUP_ID>
```

Alternatively, sign in on the development client's **Extensions** tab, open the `bytechain-preview` branch, and tap the compatible update.

Publish a JavaScript/assets-only update after all required checks pass:

```powershell
$env:APP_VARIANT="preview"
$env:EXPO_PUBLIC_API_BASE_URL="https://staging-api.amalaoluyole.com"
$env:EXPO_PUBLIC_API_ENVIRONMENT="staging"
$env:EXPO_PUBLIC_DATABASE_ENVIRONMENT_LABEL="staging-isolated"
$env:EXPO_PUBLIC_GIT_COMMIT_SHA=(git rev-parse HEAD)
$env:EXPO_PUBLIC_BUILD_DATE=(Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
Invoke-Eas update --channel bytechain-preview --environment preview --message "Bytechain preview update"
```

After changing a native dependency, config plugin, identifier, entitlement, `app.config.ts`, or `eas.json`, do **not** publish an update to the old runtime. Increase `BYTECHAIN_APP_VERSION` in `app.config.ts` (for example, `1.0.1` to `1.0.2`), commit that native change, then create replacement binaries:

```powershell
Invoke-Eas build --platform all --profile preview
```

The supported `appVersion` runtime policy makes that version the compatibility boundary. CI rejects a native-input change unless `BYTECHAIN_APP_VERSION` increases, creates replacement internal binaries, and does not publish an OTA update on that push. Older binaries therefore cannot load updates targeting the new native runtime.

## Local web verification

For local-only development, use a local API URL explicitly; this value is never used by the EAS preview profile:

```powershell
pnpm dev:preview
```

- Web: `http://localhost:8081`
- API health: `http://localhost:3000/api/health`

## Updates and defect reports

Tap the environment banner to open **Preview Information**. It shows the environment, version/build, commit SHA, EAS update ID, runtime version, API/database environment labels, and build date. Use **Check for compatible update** to fetch and apply a new update. A release preview normally downloads on cold launch and applies after restart.

Use **Open safe issue report** and describe:

- screen;
- account role;
- action performed;
- expected result;
- actual result.

The generated report includes only safe build metadata. Do not paste addresses, payment details, access tokens, cookies, or customer records.

## Repository-owner actions still required

- Repair GitHub CLI authentication so `Bytechain` and `Bytechain-preview` can be pushed and the draft pull request can be opened.
- Register iPhone UDIDs and approve Apple signing credentials.
- Provision `staging.amalaoluyole.com` and `staging-api.amalaoluyole.com` over HTTPS.
- Configure isolated staging database, Paystack test, OAuth, storage, push, email, WhatsApp, Sentry, and log retention settings.
- Configure `RESEND_API_KEY`/`EMAIL_FROM` for email codes and Twilio with `TWILIO_SMS_FROM` (or the WhatsApp fallback) for phone codes.
- Add `EXPO_TOKEN` and `STAGING_API_HEALTH_URL` to GitHub Actions secrets and populate any sensitive values in the EAS `preview` environment.

No command in this guide submits to the App Store or Google Play, publishes to the production update channel, or merges branches.
