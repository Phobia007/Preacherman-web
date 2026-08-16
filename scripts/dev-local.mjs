import { spawn } from "node:child_process";

const cargo = process.env.CARGO || `${process.env.HOME}/.cargo/bin/cargo`;
const children = [
  spawn(cargo, ["run"], { stdio: "inherit", env: process.env, cwd: "server" }),
  spawn(process.execPath, ["scripts/dev-server.mjs"], { stdio: "inherit", env: process.env }),
];

let stopping = false;
function stop(signal = "SIGTERM") {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill(signal);
}

for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => stop(signal));
for (const child of children) {
  child.on("exit", (code) => {
    stop();
    process.exitCode = code ?? 1;
  });
}
