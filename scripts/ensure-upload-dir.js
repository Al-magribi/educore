/* eslint-disable no-console */
const fs = require("node:fs");
const path = require("node:path");

const root = process.env.UPLOAD_DIR?.trim()
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(process.cwd(), "public", "uploads");

fs.mkdirSync(root, { recursive: true });
console.log(`Upload directory ready: ${root}`);
