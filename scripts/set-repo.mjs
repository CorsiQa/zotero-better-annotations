// Replaces the repository URL in all files, e.g. after forking the project.
//
//   node scripts/set-repo.mjs OWNER/zotero-better-annotations
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const target = process.argv[2];
if (!target || !/^[\w.-]+\/[\w.-]+$/.test(target)) {
  console.error("Usage: node scripts/set-repo.mjs OWNER/REPOSITORY");
  process.exit(1);
}
const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const placeholder = "CorsiQa/zotero-better-annotations";
for (const file of ["manifest.json", "content/core.js", "README.md", "docs/README.md", "docs/README.de.md", "CHANGELOG.md", "CONTRIBUTING.md", "CITATION.cff", ".github/ISSUE_TEMPLATE/config.yml"]) {
  const path = join(root, file);
  const text = readFileSync(path, "utf8");
  if (text.includes(placeholder)) {
    writeFileSync(path, text.split(placeholder).join(target));
    console.log("updated " + file);
  }
}
