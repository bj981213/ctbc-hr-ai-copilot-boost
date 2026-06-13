import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const emojiRegex = /emoji|[\u{1F000}-\u{1FAFF}\u{2300}-\u{23FF}\u{2600}-\u{2BFF}\u{FE0F}]/giu;
const sourceCodeRegex = /(^|[^A-Z0-9#])[AP][0-9]{3}(?![0-9])/m;
const catalog = JSON.parse(await readFile("data/catalog.json", "utf8"));

const errors = [];
const agentCount = catalog.items.filter((item) => item.kind === "Agent").length;
const promptCount = catalog.items.filter((item) => item.kind === "Prompt").length;

if (catalog.items.length !== 135) errors.push(`Expected 135 items, got ${catalog.items.length}`);
if (agentCount !== 48) errors.push(`Expected 48 Agent items, got ${agentCount}`);
if (promptCount !== 87) errors.push(`Expected 87 Prompt items, got ${promptCount}`);

for (const item of catalog.items) {
  if (!existsSync(item.htmlPath)) errors.push(`Missing HTML: ${item.htmlPath}`);
  if ("seq" in item || "number" in item) errors.push(`Source numbering field found on ${item.id}`);
}

const checkedFiles = [
  "index.html",
  "README.md",
  "assets/app.js",
  "assets/styles.css",
  "data/catalog.json",
  ...(await listFiles("tools", [".html"]))
];

for (const file of checkedFiles) {
  const text = await readFile(file, "utf8");
  if (emojiRegex.test(text)) errors.push(`Emoji found in ${file}`);
  if (sourceCodeRegex.test(text)) errors.push(`Source code marker found in ${file}`);
}

const publicText = await Promise.all([
  readFile("index.html", "utf8"),
  readFile("assets/app.js", "utf8"),
  readFile("data/catalog.json", "utf8")
]);
if (publicText.join("\n").includes("surveyHighlights")) errors.push("surveyHighlights found in public files");
if (publicText.join("\n").includes("課前問卷")) errors.push("Pre-class survey label found in public files");
if (publicText.join("\n").includes("問卷重點")) errors.push("Survey highlights label found in public files");

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`OK: ${catalog.items.length} items (${agentCount} Agent, ${promptCount} Prompt), visible UI has no emoji.`);

async function listFiles(dir, extensions) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(path, extensions);
    return extensions.some((extension) => path.endsWith(extension)) ? [path] : [];
  }));
  return files.flat();
}
