// https://docs.expo.dev/guides/using-eslint/
import { defineConfig } from "eslint/config";
import expoConfig from "eslint-config-expo/flat.js";

export default defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      // This rule is intended for HTML entities in React DOM. Apostrophes and
      // quotation marks are valid text content in React Native and Expo web.
      "react/no-unescaped-entities": "off",
    },
  },
]);
