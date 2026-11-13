// Checks that every language file has the same keys and placeholders as English.
//
//   node scripts/check-locales.mjs
//
// Useful after adding or changing strings, and for translators.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const dir = join(root, "content", "locale");
const context = vm.createContext({ BetterAnnotations: { STRINGS: {} } });
for (const file of readdirSync(dir).filter(f => f.endsWith(".js"))) {
  vm.runInContext(readFileSync(join(dir, file), "utf8"), context, { filename: file });
}
const all = context.BetterAnnotations.STRINGS;
const en = all.en;
const placeholders = v => (typeof v === "string" ? (v.match(/\{\w+\}/g) || []).sort().join(" ") : "");
let problems = 0;
for (const [lang, table] of Object.entries(all)) {
  if (lang === "en") {
    continue;
  }
  const missing = Object.keys(en).filter(k => !(k in table));
  const extra = Object.keys(table).filter(k => !(k in en));
  const wrong = Object.keys(en).filter(k => k in table && placeholders(en[k]) !== placeholders(table[k]));
  const lists = Object.keys(en).filter(k => Array.isArray(en[k]) && (!Array.isArray(table[k]) || table[k].length !== en[k].length));
  for (const [label, keys] of [["missing", missing], ["not in English", extra], ["placeholders differ", wrong], ["list length differs", lists]]) {
    if (keys.length) {
      problems += keys.length;
      console.log(`${lang}: ${label}: ${keys.join(", ")}`);
    }
  }
}
console.log(problems ? `${problems} problem(s) found.` : `All ${Object.keys(all).length} languages are complete.`);
process.exit(problems ? 1 : 0);
