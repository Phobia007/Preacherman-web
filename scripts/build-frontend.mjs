import fs from "node:fs";
import path from "node:path";
import { frontendAssets } from "./frontend-assets.mjs";

const root = process.cwd();
const html = path.join(root, "work", "Preacherman-Standalone.html");
const outputDirectories = ["dist", "deploy/preacherman-site/public"];

for (const [source] of frontendAssets) {
  const file = path.join(root, source);
  if (!fs.existsSync(file)) throw new Error(`Missing frontend source: ${file}`);
}
const source = fs.readFileSync(html, "utf8");
for (const marker of ["/preacherman-auth.js", "login-form", "site-content"]) {
  if (!source.includes(marker)) throw new Error(`Frontend is missing required marker: ${marker}`);
}
// Never clear unrelated files. Only overwrite these explicitly managed artifacts.
for (const directory of outputDirectories) {
  for (const [source, target] of frontendAssets) {
    const output = path.join(root, directory, target);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.copyFileSync(path.join(root, source), output);
  }
}
await import("./smoke-check-frontend.mjs");
console.log("Frontend build complete: canonical assets synchronized to dist and Cloudflare public.");
