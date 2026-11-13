// Builds the .xpi file and a matching updates.json.
//
//   node scripts/build.mjs            -> dist/better-annotations-<version>.xpi + dist/updates.json
//
// Requires only Node.js and the “zip” program (on Windows: Git Bash or WSL).
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
const { version } = manifest;
const { id, strict_min_version, strict_max_version } = manifest.applications.zotero;
const repo = manifest.homepage_url.replace(/\/$/, "");
const name = `better-annotations-${version}.xpi`;
const dist = join(root, "dist");
mkdirSync(dist, { recursive: true });
rmSync(join(dist, name), { force: true });

execFileSync("zip", ["-r", "-X", "-q", join(dist, name), "manifest.json", "bootstrap.js", "content", "-x", "*.DS_Store"],
  { cwd: root, stdio: "inherit" });

const hash = createHash("sha256").update(readFileSync(join(dist, name))).digest("hex");
const updates = {
  addons: {
    [id]: {
      updates: [{
        version,
        update_link: `${repo}/releases/download/v${version}/${name}`,
        update_hash: `sha256:${hash}`,
        applications: { zotero: { strict_min_version, strict_max_version } },
      }],
    },
  },
};
writeFileSync(join(dist, "updates.json"), JSON.stringify(updates, null, 2) + "\n");
console.log(`Built dist/${name}\nsha256:${hash}\nWrote dist/updates.json`);
