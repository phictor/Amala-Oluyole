import "./scripts/load-env.js";
import type { ConfigContext, ExpoConfig } from "expo/config";

type AppVariant = "production" | "preview" | "development";

const DEFAULT_EAS_PROJECT_ID = "b5118588-8592-414a-a716-e991acd4183a";
const PRODUCTION_APP_VERSION = "1.0.0";
const BYTECHAIN_APP_VERSION = "1.0.1";

const VARIANTS: Record<AppVariant, {
  name: string;
  appVersion: string;
  bundleSuffix: string;
  scheme: string;
  icon: string;
  environment: string;
}> = {
  production: {
    name: "Amala Oluyole",
    appVersion: PRODUCTION_APP_VERSION,
    bundleSuffix: "",
    scheme: "amalaoluyole",
    icon: "./assets/images/icon.png",
    environment: "production",
  },
  preview: {
    name: "Amala Oluyole Preview",
    appVersion: BYTECHAIN_APP_VERSION,
    bundleSuffix: ".preview",
    scheme: "amalaoluyole-preview",
    icon: "./assets/images/icon-preview.png",
    environment: "staging",
  },
  development: {
    name: "Amala Oluyole Dev",
    appVersion: BYTECHAIN_APP_VERSION,
    bundleSuffix: ".dev",
    scheme: "amalaoluyole-dev",
    icon: "./assets/images/icon-development.png",
    environment: "development",
  },
};

function selectedVariant(): AppVariant {
  const value = process.env.APP_VARIANT ?? "production";
  if (value === "production" || value === "preview" || value === "development") return value;
  throw new Error(`Unsupported APP_VARIANT: ${value}`);
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const variantName = selectedVariant();
  const variant = VARIANTS[variantName];
  const baseIdentifier = "com.app.amala.oluyole.app";
  const projectId = process.env.EAS_PROJECT_ID?.trim()
    || process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim()
    || DEFAULT_EAS_PROJECT_ID;
  const sentryConfigured = Boolean(process.env.SENTRY_ORG && process.env.SENTRY_PROJECT);
  const publicSiteHost = variantName === "production" ? "amalaoluyole.com" : "staging.amalaoluyole.com";

  const plugins: NonNullable<ExpoConfig["plugins"]> = [
    "expo-router",
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission: `Allow ${variant.name} to use your location for delivery tracking.`,
        locationWhenInUsePermission: `Allow ${variant.name} to use your location for delivery tracking.`,
        isAndroidBackgroundLocationEnabled: true,
      },
    ],
    ["expo-audio", { microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone." }],
    ["expo-video", { supportsBackgroundPlayback: true, supportsPictureInPicture: true }],
    [
      "expo-splash-screen",
      {
        image: variant.icon,
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: { backgroundColor: "#000000" },
      },
    ],
    [
      "expo-build-properties",
      { android: { buildArchs: ["armeabi-v7a", "arm64-v8a"], minSdkVersion: 24 } },
    ],
  ];

  if (sentryConfigured) {
    plugins.push([
      "@sentry/react-native/expo",
      {
        organization: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        url: process.env.SENTRY_URL || "https://sentry.io/",
      },
    ]);
  }

  return {
    ...config,
    name: variant.name,
    owner: "emmapastor",
    slug: "amala-oluyole",
    version: variant.appVersion,
    description: "Order authentic Yoruba cuisine from Amala Oluyole Restaurant.",
    orientation: "portrait",
    icon: variant.icon,
    scheme: variant.scheme,
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    runtimeVersion: { policy: "appVersion" },
    updates: projectId
      ? {
          url: `https://u.expo.dev/${projectId}`,
          checkAutomatically: "ON_LOAD",
          fallbackToCacheTimeout: 0,
        }
      : { enabled: false },
    extra: {
      ...config.extra,
      appVariant: variantName,
      environmentName: variant.environment,
      apiEnvironment: process.env.EXPO_PUBLIC_API_ENVIRONMENT || variant.environment,
      databaseEnvironmentLabel: process.env.EXPO_PUBLIC_DATABASE_ENVIRONMENT_LABEL || "not-configured",
      gitCommitSha: process.env.EXPO_PUBLIC_GIT_COMMIT_SHA
        || process.env.EAS_BUILD_GIT_COMMIT_HASH
        || "local",
      buildDate: process.env.EXPO_PUBLIC_BUILD_DATE
        || (process.env.EAS_BUILD === "true" ? new Date().toISOString() : "local-development"),
      feedbackIssueUrl: process.env.EXPO_PUBLIC_FEEDBACK_ISSUE_URL || "https://github.com/phictor/Amala-Oluyole/issues/new",
      eas: projectId ? { projectId } : undefined,
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: `${baseIdentifier}${variant.bundleSuffix}`,
      buildNumber: "1",
      associatedDomains: [`applinks:${publicSiteHost}`],
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSLocationWhenInUseUsageDescription: `${variant.name} uses your location to show nearby branches and track your delivery.`,
        NSLocationAlwaysAndWhenInUseUsageDescription: `${variant.name} uses your location to track your delivery in real time.`,
        NSCameraUsageDescription: `Allow ${variant.name} to access your camera to upload a profile photo.`,
        NSPhotoLibraryUsageDescription: `Allow ${variant.name} to access your photos to upload a profile photo.`,
        NSUserNotificationsUsageDescription: `${variant.name} sends order updates, promotions, and loyalty rewards via notifications.`,
      },
      privacyManifests: {
        NSPrivacyAccessedAPITypes: [
          {
            NSPrivacyAccessedAPIType: "NSPrivacyAccessedAPICategoryUserDefaults",
            NSPrivacyAccessedAPITypeReasons: ["CA92.1"],
          },
        ],
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#FFFFFF",
        foregroundImage: variant.icon,
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: `${baseIdentifier}${variant.bundleSuffix}`,
      versionCode: 1,
      permissions: [
        "POST_NOTIFICATIONS",
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "CAMERA",
        "READ_MEDIA_IMAGES",
        "VIBRATE",
        "RECEIVE_BOOT_COMPLETED",
      ],
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [{ scheme: variant.scheme, host: "oauth", pathPrefix: "/callback" }],
          category: ["BROWSABLE", "DEFAULT"],
        },
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            { scheme: "https", host: publicSiteHost, pathPrefix: "/meal/custom" },
            { scheme: "https", host: publicSiteHost, pathPrefix: "/oauth/callback" },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
    },
    web: { bundler: "metro", output: "static", favicon: "./assets/images/favicon.png" },
    plugins,
    experiments: { typedRoutes: true, reactCompiler: true },
  };
};
