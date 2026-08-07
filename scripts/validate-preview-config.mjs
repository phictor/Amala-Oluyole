import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectId = "00000000-0000-4000-8000-000000000001";
const expoCli = resolve(process.cwd(), "node_modules", "expo", "bin", "cli");

function configFor(variant) {
  const output = execFileSync(process.execPath, [expoCli, "config", "--type", "public", "--json"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, APP_VARIANT: variant, EAS_PROJECT_ID: projectId },
  });
  return JSON.parse(output);
}

const production = configFor("production");
const preview = configFor("preview");
const development = configFor("development");
const eas = JSON.parse(await readFile(resolve(process.cwd(), "eas.json"), "utf8"));
const packageJson = JSON.parse(await readFile(resolve(process.cwd(), "package.json"), "utf8"));

assert.equal(production.name, "Amala Oluyole");
assert.equal(preview.name, "Amala Oluyole Preview");
assert.equal(development.name, "Amala Oluyole Dev");
assert.equal(production.android?.package, "com.app.amala.oluyole.app");
assert.equal(preview.android?.package, "com.app.amala.oluyole.app.preview");
assert.equal(development.android?.package, "com.app.amala.oluyole.app.dev");
assert.equal(production.ios?.bundleIdentifier, "com.app.amala.oluyole.app");
assert.equal(preview.ios?.bundleIdentifier, "com.app.amala.oluyole.app.preview");
assert.equal(development.ios?.bundleIdentifier, "com.app.amala.oluyole.app.dev");
assert.deepEqual(preview.runtimeVersion, { policy: "fingerprint" });
assert.match(String(preview.updates?.url), /^https:\/\/u\.expo\.dev\/[0-9a-f-]+$/);
assert.equal(eas.build.preview.channel, "bytechain-preview");
assert.equal(eas.build.preview.distribution, "internal");
assert.equal(eas.build.preview.android.buildType, "apk");
assert.equal(eas.build["development-device"].developmentClient, true);
assert.equal(eas.build["development-simulator"].ios.simulator, true);
assert.match(eas.build.preview.env.EXPO_PUBLIC_API_BASE_URL, /^https:\/\//);
assert.doesNotMatch(eas.build.preview.env.EXPO_PUBLIC_API_BASE_URL, /localhost|127\.0\.0\.1/);
assert(packageJson.dependencies["expo-dev-client"]);
assert(packageJson.dependencies["expo-updates"]);

console.log("Preview configuration is valid for production, preview, and development variants.");
