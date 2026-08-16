import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

throw new Error(
  "ARCHIVED: this historical exporter is not a source for the current frontend. " +
    "Use npm run build from the repository root.",
);

// Historical implementation retained below for audit context. The old external
// workstation paths have been replaced with repository-relative placeholders,
// but this script intentionally stops above because work/site-edit is incomplete.
const projectDir = path.join(process.cwd(), "work", "site-edit");
const outputFile = path.join(process.cwd(), "work", "Preacherman-Standalone.html");

const readText = (relativePath) =>
  fs.readFileSync(path.join(projectDir, relativePath), "utf8");
const readBytes = (relativePath) =>
  fs.readFileSync(path.join(projectDir, relativePath));

const mimeFor = (relativePath) => {
  const ext = path.extname(relativePath).toLowerCase();
  return (
    {
      ".svg": "image/svg+xml",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".webp": "image/webp",
      ".ttf": "font/ttf",
      ".otf": "font/otf",
      ".woff": "font/woff",
      ".woff2": "font/woff2",
      ".json": "application/json",
    }[ext] || "application/octet-stream"
  );
};

const toDataUri = (relativePath) => {
  const bytes = readBytes(relativePath);
  return `data:${mimeFor(relativePath)};base64,${bytes.toString("base64")}`;
};

const escapeClosingTag = (source, tagName) =>
  source.replace(new RegExp(`</${tagName}`, "gi"), `<\\/${tagName}`);

let html = readText("index.html");
let css = readText("styles.css");
let heroLogo = readText("hero-logo.js");
const mainScript = readText("script.js");
const lucide = readText("assets/lucide.min.js");

// Inline every font referenced by the active stylesheet.
css = css.replace(
  /url\((["']?)(\.\/assets\/[^"')]+)\1\)/g,
  (_match, _quote, resourcePath) => `url("${toDataUri(resourcePath.slice(2))}")`,
);

// Keep the Hero implementation unchanged while converting its two fetch targets
// into self-contained data URLs that work from file:// on another computer.
heroLogo = heroLogo
  .replace(
    /\.\/assets\/preacherman-glyphs\.json(?:\?[^"']*)?/g,
    toDataUri("assets/preacherman-glyphs.json"),
  )
  .replace(
    /\.\/assets\/preacherman-hero-logo\.svg(?:\?[^"']*)?/g,
    toDataUri("assets/preacherman-hero-logo.svg"),
  );

html = html.replace(
  /<link\s+rel="stylesheet"\s+href="\.\/styles\.css[^\"]*"\s*\/>/,
  `<style>\n${escapeClosingTag(css, "style")}\n</style>`,
);

html = html
  .replace(
    /<script\s+src="\.\/assets\/lucide\.min\.js"><\/script>/,
    `<script>\n${escapeClosingTag(lucide, "script")}\n</script>`,
  )
  .replace(
    /<script\s+src="\.\/hero-logo\.js[^\"]*"><\/script>/,
    `<script>\n${escapeClosingTag(heroLogo, "script")}\n</script>`,
  )
  .replace(
    /<script\s+src="\.\/script\.js[^\"]*"><\/script>/,
    `<script>\n${escapeClosingTag(mainScript, "script")}\n</script>`,
  );

// Inline all remaining images and the favicon referenced by the document.
html = html.replace(/\.\/assets\/([A-Za-z0-9._-]+\.(?:svg|png|jpe?g|webp))/gi, (_match, fileName) =>
  toDataUri(`assets/${fileName}`),
);

const marker = `<!--\n  PREACHERMAN standalone export\n  Generated from the current website version on 2026-08-14.\n  CSS, JavaScript, fonts, icons, Hero glyph data and Logo paths are embedded.\n  This file can be opened directly with file:// and requires no web server.\n+-->`;
html = html.replace(/<!doctype html>/i, `<!doctype html>\n${marker}`);

const forbiddenReferences = [
  /(?:src|href)=["']\.\//i,
  /url\(["']?\.\//i,
  /fetch\(["']\.\//i,
  /<script\s+[^>]*src=/i,
  /<link\s+[^>]*rel=["']stylesheet["']/i,
];

for (const pattern of forbiddenReferences) {
  if (pattern.test(html)) {
    throw new Error(`Standalone export still contains an external reference: ${pattern}`);
  }
}

fs.writeFileSync(outputFile, html);
const bytes = fs.readFileSync(outputFile);
const result = {
  outputFile,
  bytes: bytes.length,
  sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
};

console.log(JSON.stringify(result, null, 2));
