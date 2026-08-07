import * as Sentry from "@sentry/react-native";
import * as Updates from "expo-updates";
import { getPreviewMetadata } from "@/lib/preview-config";

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
const metadata = getPreviewMetadata();

if (dsn) {
  Sentry.init({
    dsn,
    environment: metadata.environment,
    release: `${metadata.version}+${metadata.commitSha}`,
    dist: metadata.updateId,
    sendDefaultPii: false,
    enableAutoSessionTracking: true,
    tracesSampleRate: metadata.environment === "production" ? 0.1 : 0.25,
    beforeSend(event) {
      delete event.user;
      if (event.request) {
        delete event.request.cookies;
        delete event.request.data;
        delete event.request.headers;
      }
      return event;
    },
  });
  Sentry.setTags({
    app_variant: metadata.variant,
    runtime_version: metadata.runtimeVersion,
    update_id: Updates.updateId ?? "embedded",
    api_environment: metadata.apiEnvironment,
  });
}

export function capturePreviewError(error: unknown, action: string): void {
  if (!dsn) return;
  Sentry.captureException(error, { tags: { action } });
}
