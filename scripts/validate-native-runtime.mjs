import { appendFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const [baseRef, headRef = "HEAD"] = process.argv.slice(2);
const nativePathPattern = /^(?:app\.config\.ts|eas\.json|package\.json|pnpm-lock\.yaml|\.npmrc|pnpm-workspace\.yaml|ios\/|android\/|plugins\/|assets\/images\/(?:icon|splash))/;

function git(args, options = {}) {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  }).trim();
}

function commitExists(ref) {
  if (!ref || /^0+$/.test(ref)) return false;
  try {
    git(["cat-file", "-e", `${ref}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

function fileAt(ref, path) {
  try {
    return git(["show", `${ref}:${path}`]);
  } catch {
    return null;
  }
}

function bytechainVersion(source, label) {
  const match = source?.match(/const\s+BYTECHAIN_APP_VERSION\s*=\s*["'](\d+\.\d+\.\d+)["']/);
  if (!match) throw new Error(`BYTECHAIN_APP_VERSION is missing from ${label}.`);
  return match[1];
}

function compareVersions(left, right) {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  for (let index = 0; index < 3; index += 1) {
    if (leftParts[index] !== rightParts[index]) return leftParts[index] - rightParts[index];
  }
  return 0;
}

function setOutput(nativeChanged) {
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `changed=${nativeChanged}\n`, "utf8");
  }
}

const currentConfig = fileAt(headRef, "app.config.ts");
const currentVersion = bytechainVersion(currentConfig, `${headRef}:app.config.ts`);

if (!commitExists(baseRef)) {
  setOutput(true);
  console.log(`Native baseline unavailable; replacement binaries are required for Bytechain runtime ${currentVersion}.`);
  process.exit(0);
}

const changedFiles = git(["diff", "--name-only", baseRef, headRef, "--"])
  .split(/\r?\n/)
  .filter(Boolean);
const nativeChanged = changedFiles.some((path) => nativePathPattern.test(path));

if (nativeChanged) {
  const previousConfig = fileAt(baseRef, "app.config.ts");
  const previousMatch = previousConfig?.match(/const\s+BYTECHAIN_APP_VERSION\s*=\s*["'](\d+\.\d+\.\d+)["']/);
  if (previousMatch && compareVersions(currentVersion, previousMatch[1]) <= 0) {
    throw new Error(
      `Native inputs changed, but BYTECHAIN_APP_VERSION was not increased (${previousMatch[1]} -> ${currentVersion}). `
      + "Increase it before creating replacement preview binaries or publishing another update.",
    );
  }
}

setOutput(nativeChanged);
console.log(`native_changed=${nativeChanged}; bytechain_app_version=${currentVersion}`);
