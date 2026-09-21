const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf8"));
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

assert.equal(manifest.manifest_version, 3, "extension must use Manifest V3");
assert.equal(manifest.version, packageJson.version, "manifest and package versions must match");

for (const file of [
  "manifest.json",
  "popup.html",
  "popup.css",
  "popup.js",
  "api-hook.js",
  "content.js",
  "lib/schedule-core.js",
  "README.md",
  "LICENSE"
]) {
  assert.ok(fs.existsSync(path.join(root, file)), `missing required file: ${file}`);
}

const publicSources = ["popup.js", "api-hook.js", "content.js", "README.md"]
  .map((file) => fs.readFileSync(path.join(root, file), "utf8"))
  .join("\n");
assert.doesNotMatch(publicSources, /__access_token|SESSION=|pstsid|dataId=\d+/i, "possible credential or user-specific identifier found");

console.log("project validation passed");
