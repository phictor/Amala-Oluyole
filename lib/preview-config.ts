import Constants from "expo-constants";
import * as Application from "expo-application";
import * as Updates from "expo-updates";

type PreviewExtra = {
  appVariant?: string;
  environmentName?: string;
  apiEnvironment?: string;
  databaseEnvironmentLabel?: string;
  gitCommitSha?: string;
  buildDate?: string;
  feedbackIssueUrl?: string;
};

export type PreviewMetadata = {
  variant: string;
  environment: string;
  version: string;
  buildNumber: string;
  commitSha: string;
  updateId: string;
  runtimeVersion: string;
  updateChannel: string;
  apiEnvironment: string;
  databaseEnvironment: string;
  buildDate: string;
};

export function getPreviewExtra(): PreviewExtra {
  return (Constants.expoConfig?.extra ?? {}) as PreviewExtra;
}

export function isNonProductionVariant(extra = getPreviewExtra()): boolean {
  return (extra.appVariant ?? "production") !== "production";
}

export function getPreviewMetadata(): PreviewMetadata {
  const extra = getPreviewExtra();
  return {
    variant: extra.appVariant ?? "production",
    environment: extra.environmentName ?? "unknown",
    version: Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? "local",
    buildNumber: Application.nativeBuildVersion ?? "local",
    commitSha: extra.gitCommitSha ?? "unknown",
    updateId: Updates.updateId ?? "embedded/local",
    runtimeVersion: Updates.runtimeVersion ?? Constants.expoRuntimeVersion ?? "local",
    updateChannel: Updates.channel ?? "development/local",
    apiEnvironment: extra.apiEnvironment ?? "unknown",
    databaseEnvironment: extra.databaseEnvironmentLabel ?? "unknown",
    buildDate: extra.buildDate ?? "unknown",
  };
}

export function getFeedbackIssueUrl(description: string, metadata = getPreviewMetadata()): string {
  const baseUrl = getPreviewExtra().feedbackIssueUrl ?? "https://github.com/phictor/Amala-Oluyole/issues/new";
  const safeDescription = description.trim().slice(0, 2_000);
  const body = [
    "## Defect report",
    safeDescription || "Describe the problem here.",
    "",
    "## Safe diagnostic metadata",
    `- Variant: ${metadata.variant}`,
    `- App version/build: ${metadata.version} (${metadata.buildNumber})`,
    `- Commit: ${metadata.commitSha}`,
    `- Update: ${metadata.updateId}`,
    `- Runtime: ${metadata.runtimeVersion}`,
    `- API environment: ${metadata.apiEnvironment}`,
  ].join("\n");
  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}title=${encodeURIComponent("[Preview] Defect report")}&body=${encodeURIComponent(body)}`;
}
