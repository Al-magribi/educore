/* eslint-disable no-console */
const { spawn } = require("node:child_process");
const path = require("node:path");
const { loadEnvFiles } = require("./load-env");

loadEnvFiles();

const port = String(process.env.PORT || "3000").trim();
const nextBin = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");

console.log(`Starting Next.js on port ${port}...`);

const child = spawn(process.execPath, [nextBin, "start", "-p", port], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
