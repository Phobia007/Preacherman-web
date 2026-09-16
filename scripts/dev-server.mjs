import http from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { frontendAssets } from "./frontend-assets.mjs";

const root = process.cwd();
const host = process.env.FRONTEND_HOST || "localhost";
const port = Number(process.env.FRONTEND_PORT || 5173);
const backend = new URL(process.env.API_PROXY_TARGET || "http://127.0.0.1:3000");
const files = new Map([
  ["/", path.join(root, "work", "Preacherman-Standalone.html")],
  ...frontendAssets.map(([source, target]) => [`/${target}`, path.join(root, source)]),
]);

function proxy(request, response) {
  const headers = { ...request.headers, host: backend.host };
  const upstream = http.request(
    {
      protocol: backend.protocol,
      hostname: backend.hostname,
      port: backend.port,
      method: request.method,
      path: request.url,
      headers,
    },
    (upstreamResponse) => {
      response.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers);
      upstreamResponse.pipe(response);
    },
  );
  upstream.on("error", () => {
    if (!response.headersSent) {
      response.writeHead(502, { "content-type": "application/json; charset=utf-8" });
    }
    response.end(JSON.stringify({ error: { code: "backend_unavailable", message: "Local authentication service is unavailable." } }));
  });
  request.pipe(upstream);
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);
  if (url.pathname.startsWith("/api/")) return proxy(request, response);

  const file = files.get(url.pathname);
  if (!file || !existsSync(file)) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const fileStat = await stat(file);
  const contentType = ({
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".glb": "model/gltf-binary",
    ".webp": "image/webp",
    ".mp4": "video/mp4",
    ".woff2": "font/woff2",
  })[path.extname(file)] || "text/html; charset=utf-8";
  const headers = {
    "content-type": contentType,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "accept-ranges": "bytes",
  };
  let start = 0, end = fileStat.size - 1, status = 200;
  if (request.headers.range && request.method === "GET") {
    const match = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
    if (match && (match[1] || match[2])) {
      start = match[1] ? Number(match[1]) : Math.max(0, fileStat.size - Number(match[2]));
      end = match[1] && match[2] ? Math.min(Number(match[2]), end) : end;
      if (start <= end && start < fileStat.size) status = 206;
      else status = 416;
    } else status = 416;
    if (status === 416) {
      response.writeHead(416, { ...headers, "content-range": `bytes */${fileStat.size}`, "content-length": 0 });
      response.end(); return;
    }
    headers["content-range"] = `bytes ${start}-${end}/${fileStat.size}`;
  }
  headers["content-length"] = end - start + 1;
  response.writeHead(status, headers);
  if (request.method === "HEAD") { response.end(); return; }
  const stream = createReadStream(file, { start, end });
  stream.on("error", () => response.destroy());
  response.on("close", () => stream.destroy());
  stream.pipe(response);
});

server.listen(port, host, () => {
  console.log(`Preacherman frontend: http://${host}:${port}`);
  console.log(`API proxy: /api -> ${backend.origin}`);
});
