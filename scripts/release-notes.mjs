// Prints the release notes for the version in manifest.json: the matching
// section of CHANGELOG.md with a short note on how to install or update.
// Exits with an error if CHANGELOG.md has no section for this version.
//
//   node scripts/release-notes.mjs > notes.md
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const { version, homepage_url } = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
const changelog = readFileSync(join(root, "CHANGELOG.md"), "utf8");
const repo = homepage_url.replace(/\/$/, "");

const lines = changelog.split("\n");
const start = lines.findIndex((l) => l.startsWith(`## ${version} `) || l.trim() === `## ${version}`);
if (start < 0) {
  console.error(`CHANGELOG.md has no section "## ${version}". Add it before the release.`);
  process.exit(1);
}
let end = lines.findIndex((l, i) => i > start && l.startsWith("## "));
if (end < 0) end = lines.length;
const section = lines.slice(start + 1, end).join("\n").trim();

const install = `**Install or update:** Zotero updates installed copies automatically. For a new installation, download \`better-annotations-${version}.xpi\` below. In Zotero, open Tools → Plugins and drag the file into the window.`;
const report = `Please report problems in the [issue tracker](${repo}/issues).`;

// The install note follows the first paragraph if the section starts with one.
const parts = section.split(/\n\n/);
const body = parts.length > 1 && !parts[0].startsWith("#") && !parts[0].startsWith("- ")
  ? [parts[0], install, ...parts.slice(1)].join("\n\n")
  : [install, section].join("\n\n");
process.stdout.write(`${body}\n\n${report}\n`);
