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
  const contentType = file.endsWith(".js")
    ? "text/javascript; charset=utf-8"
    : file.endsWith(".txt") ? "text/plain; charset=utf-8" : "text/html; charset=utf-8";
  response.writeHead(200, {
    "content-type": contentType,
    "content-length": fileStat.size,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  createReadStream(file).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Preacherman frontend: http://${host}:${port}`);
  console.log(`API proxy: /api -> ${backend.origin}`);
});
