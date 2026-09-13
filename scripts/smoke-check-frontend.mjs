import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import vm from "node:vm";
import { frontendAssets, authScriptPaths } from "./frontend-assets.mjs";

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

function listFiles(directory, prefix = "") {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isSymbolicLink()) throw new Error(`Unexpected published symlink: ${prefix}${entry.name}`);
    return entry.isDirectory()
      ? listFiles(path.join(directory, entry.name), `${prefix}${entry.name}/`)
      : [`${prefix}${entry.name}`];
  }).sort();
}

const published = [];
for (const directory of ["dist", "deploy/preacherman-site/public"]) {
  const expected = frontendAssets.map(([, target]) => target).sort();
  if (JSON.stringify(listFiles(path.join(root, directory))) !== JSON.stringify(expected)) {
    throw new Error(`Unexpected or missing published files in ${directory}; review without deleting unrelated files.`);
  }
  for (const [source, target] of frontendAssets) {
    const content = read(path.join(root, directory, target));
    if (content !== read(path.join(root, source))) throw new Error(`${directory}/${target} differs from source`);
    published.push([`${directory}/${target}`, content]);
  }
}

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
  ["unavailable entry notice", /本轮测试暂未开放/],
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
  if (auth.includes(endpoint)) throw new Error(`Legacy authentication endpoint remains: ${endpoint}`);
}
if (/\bfetch\s*\(/.test(auth) || /\.auth\.(?:signUp|signInWithOAuth|signInWithOtp|resetPasswordForEmail)\s*\(/.test(auth)) {
  throw new Error("Unexpected authentication request outside the email/password scope");
}

for (const method of ["signInWithPassword", "getSession", "getUser", "signOut", "onAuthStateChange"]) {
  if (!auth.includes(`.auth.${method}(`)) throw new Error(`Missing SDK method: ${method}`);
}
if ((auth.match(/\.createClient\(/g) || []).length !== 1 ||
    (auth.match(/\.auth\.onAuthStateChange\(/g) || []).length !== 1) {
  throw new Error("Expected one auth client and one state subscription");
}
if (!auth.includes('scope: "local"') || !auth.includes("persistSession: true") ||
    !auth.includes("autoRefreshToken: true") || !auth.includes("detectSessionInUrl: false")) {
  throw new Error("Unexpected auth session configuration");
}
if (/localStorage\.clear\s*\(|sessionStorage\.clear\s*\(/.test(auth)) {
  throw new Error("Authentication must not clear unrelated browser storage");
}

let lastScriptPosition = -1;
for (const src of authScriptPaths) {
  const tag = `<script src="${src}"></script>`;
  const position = html.indexOf(tag);
  if (position <= lastScriptPosition || html.indexOf(tag, position + 1) !== -1) {
    throw new Error(`Missing, duplicate or misordered script: ${src}`);
  }
  lastScriptPosition = position;
}

const configContext = { window: {} };
vm.runInNewContext(read(path.join(root, "work/preacherman-auth-config.js")), configContext, { timeout: 1000 });
const config = configContext.window.PREACHERMAN_AUTH_CONFIG;
if (!config || JSON.stringify(Object.keys(config).sort()) !== JSON.stringify(["SUPABASE_PUBLISHABLE_KEY", "SUPABASE_URL"])) {
  throw new Error("Public auth configuration must contain exactly URL and publishable key");
}
const projectUrl = new URL(config.SUPABASE_URL);
if (projectUrl.protocol !== "https:" || projectUrl.origin !== config.SUPABASE_URL ||
    !/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.SUPABASE_PUBLISHABLE_KEY)) {
  throw new Error("Invalid public Supabase configuration");
}
const sdkSource = "work/vendor/supabase-js-2.116.0.js";
const sdkTarget = "vendor/supabase-js-2.116.0.js";
const upstreamSha256 = "84ee9bf45695c1dd3ba1595b6bcfb0f09672434631351ffc8ebe9140545d5ff6";
// Only these exact files, with the exact upstream bytes, qualify for the exception.
const verifiedSdkPaths = new Set([
  sdkSource, `dist/${sdkTarget}`, `deploy/preacherman-site/public/${sdkTarget}`,
]);
for (const file of verifiedSdkPaths) {
  const bytes = fs.readFileSync(path.join(root, file));
  if (createHash("sha256").update(bytes).digest("hex") !== upstreamSha256) {
    throw new Error(`SDK is not the unmodified pinned upstream artifact: ${file}`);
  }
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

const privilegedRole = ["service", "role"].join("_");
const secretPrefix = ["sb", "secret", ""].join("_");
const secretPatterns = [
  new RegExp(`${secretPrefix}[A-Za-z0-9_-]+|\\b${privilegedRole}\\b`, "i"),
  /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/,
  /(?:DATABASE_URL|DATABASE_PASSWORD|DB_PASSWORD|SUPABASE_SECRET_KEY|ADMIN_PASSWORD)\s*[:=]/i,
  /postgres(?:ql)?:\/\/[^\s"'`]+/i,
  /["'](?:database[_-]?password|admin[_-]?password)["']\s*:/i,
];
const applicationSources = [
  ...frontendAssets.map(([source]) => source),
  ...fs.readdirSync(path.join(root, "scripts"))
    .filter((file) => file.endsWith(".mjs")).map((file) => `scripts/${file}`),
];
for (const [file, content] of [
  ...published,
  ...applicationSources.map((file) => [file, read(path.join(root, file))]),
]) {
  if (verifiedSdkPaths.has(file)) continue;
  if (secretPatterns.some((pattern) => pattern.test(content))) {
    throw new Error(`Forbidden secret material or privileged-key marker in ${file}`);
  }
  // Legacy JWT keys may hide a privileged role; inspect only candidate payloads, never print them.
  for (const match of content.matchAll(/eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)) {
    try {
      const payload = JSON.parse(Buffer.from(match[1], "base64url").toString());
      if (payload.role === privilegedRole) throw new Error(`Privileged JWT in ${file}`);
    } catch (error) {
      if (error.message.startsWith("Privileged JWT")) throw error;
    }
  }
}

const externalResources = [...html.matchAll(/<(?:script|img|link)\b[^>]+(?:src|href)="([^"]+)"/gi)]
  .map((match) => match[1])
  .filter((reference) => !reference.startsWith("data:") && !authScriptPaths.includes(reference));
if (externalResources.length) {
  throw new Error(`Build contains unexpected external resources: ${externalResources.join(", ")}`);
}

console.log("Frontend smoke check passed: source/dist/Cloudflare parity, SDK pin, public config, script order, legacy API exclusion and secret-pattern checks.");
