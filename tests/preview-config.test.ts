import { describe, expect, it, vi } from "vitest";

vi.mock("expo-constants", () => ({
  default: {
    expoConfig: { version: "1.0.0", extra: { appVariant: "preview", feedbackIssueUrl: "https://github.com/phictor/Amala-Oluyole/issues/new" } },
    expoRuntimeVersion: "runtime-test",
  },
}));
vi.mock("expo-application", () => ({ nativeApplicationVersion: "1.0.0", nativeBuildVersion: "7" }));
vi.mock("expo-updates", () => ({ updateId: "update-test", runtimeVersion: "runtime-test", channel: "bytechain-preview" }));

import { getFeedbackIssueUrl, isNonProductionVariant, type PreviewMetadata } from "../lib/preview-config";

describe("preview configuration helpers", () => {
  it("marks preview and development variants as non-production", () => {
    expect(isNonProductionVariant({ appVariant: "preview" })).toBe(true);
    expect(isNonProductionVariant({ appVariant: "development" })).toBe(true);
    expect(isNonProductionVariant({ appVariant: "production" })).toBe(false);
  });

  it("limits feedback to tester text and safe build metadata", () => {
    const metadata: PreviewMetadata = {
      variant: "preview", environment: "staging", version: "1.0.0", buildNumber: "7",
      commitSha: "abc123", updateId: "update-test", runtimeVersion: "runtime-test",
      updateChannel: "bytechain-preview", apiEnvironment: "staging",
      databaseEnvironment: "staging-isolated", buildDate: "2026-08-06T00:00:00Z",
    };
    const url = decodeURIComponent(getFeedbackIssueUrl("Checkout failed", metadata));
    expect(url).toContain("Checkout failed");
    expect(url).toContain("Runtime: runtime-test");
    expect(url).not.toMatch(/authorization|cookie|token|databaseEnvironment/i);
  });
});
