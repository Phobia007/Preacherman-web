import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const html = path.join(root, "work", "Preacherman-Standalone.html");
const auth = path.join(root, "work", "preacherman-auth.js");
const dist = path.join(root, "dist");

for (const file of [html, auth]) {
  if (!fs.existsSync(file)) throw new Error(`Missing frontend source: ${file}`);
}
const source = fs.readFileSync(html, "utf8");
for (const marker of ["/preacherman-auth.js", "login-form", "site-content"]) {
  if (!source.includes(marker)) throw new Error(`Frontend is missing required marker: ${marker}`);
}
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });
fs.copyFileSync(html, path.join(dist, "index.html"));
fs.copyFileSync(auth, path.join(dist, "preacherman-auth.js"));
await import("./smoke-check-frontend.mjs");
console.log("Frontend build complete: dist/index.html and dist/preacherman-auth.js");
