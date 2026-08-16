import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const canonicalHtmlPath = path.join(root, "work", "Preacherman-Standalone.html");
const canonicalAuthPath = path.join(root, "work", "preacherman-auth.js");
const builtHtmlPath = path.join(root, "dist", "index.html");
const builtAuthPath = path.join(root, "dist", "preacherman-auth.js");

function read(file) {
  if (!fs.existsSync(file)) throw new Error(`Missing frontend artifact: ${file}`);
  return fs.readFileSync(file, "utf8");
}

const canonicalHtml = read(canonicalHtmlPath);
const canonicalAuth = read(canonicalAuthPath);
const html = read(builtHtmlPath);
const auth = read(builtAuthPath);

if (html !== canonicalHtml) throw new Error("dist/index.html differs from the canonical HTML source");
if (auth !== canonicalAuth) throw new Error("dist/preacherman-auth.js differs from the canonical auth source");

const requiredHtml = new Map([
  ["login form", /<form[^>]+class="login-form"/],
  ["Email input", /id="login-email"[^>]+type="email"/s],
  ["Password input", /id="login-password"[^>]+type="password"/s],
  ["Remember me", /name="remember"/],
  ["Sign In", />\s*Sign In\s*</],
  ["Sign Up", />\s*Sign Up\s*</],
  ["Google", />\s*Google\s*</],
  ["Forgot password", />\s*Forgot password\?\s*</],
  ["authentication entry", /<script src="\/preacherman-auth\.js"><\/script>/],
  ["embedded CSS", /<style>/],
  ["embedded image", /data:image\//],
  ["embedded font", /data:font\//],
]);

for (const [label, pattern] of requiredHtml) {
  if (!pattern.test(html)) throw new Error(`Build smoke check failed: missing ${label}`);
}

const requiredAuth = new Map([
  ["phone authentication switch", /Use phone number/],
  ["phone country selector", /login-phone-country/],
  ["phone verification code", /login-phone-code/],
  ["Get code action", /Get code/],
  ["scan-code corner", /login-scan-corner/],
  ["Email scan option", /data-scan-channel="email">Email<\/button>/],
  ["WeChat scan option", /WeChat/],
  ["local scan placeholder policy", /scan sign-in is not enabled in local development yet/],
]);
for (const [label, pattern] of requiredAuth) {
  if (!pattern.test(auth)) throw new Error(`Build smoke check failed: missing ${label}`);
}

for (const endpoint of [
  "/api/auth/register",
  "/api/auth/login",
  "/api/auth/session",
  "/api/auth/logout",
]) {
  if (!auth.includes(endpoint)) throw new Error(`Authentication entry is missing ${endpoint}`);
}
if (!auth.includes('credentials: "include"')) {
  throw new Error("Authentication requests must include browser credentials");
}

const combined = `${html}\n${auth}`;
const forbidden = new Map([
  ["absolute workstation path", /\/Users\//],
  ["file URL", /file:\/\//i],
  ["external backend URL", /https?:\/\/(?:127\.0\.0\.1|localhost):3000/i],
  ["SQLite/database path", /(?:sqlite:|preacherman-local\.db|DATABASE_URL)/i],
  ["server password hash", /password_hash/i],
  ["server token hash", /token_hash/i],
  ["private key", /BEGIN (?:RSA |EC )?PRIVATE KEY/],
  ["hard-coded session cookie", /pm_session=/],
]);
for (const [label, pattern] of forbidden) {
  if (pattern.test(combined)) throw new Error(`Build contains forbidden ${label}`);
}

const externalResources = [...html.matchAll(/<(?:script|img|link)\b[^>]+(?:src|href)="([^"]+)"/gi)]
  .map((match) => match[1])
  .filter((reference) => !reference.startsWith("data:") && reference !== "/preacherman-auth.js");
if (externalResources.length) {
  throw new Error(`Build contains unexpected external resources: ${externalResources.join(", ")}`);
}

console.log("Frontend smoke check passed: canonical sources and dist artifacts are consistent.");
