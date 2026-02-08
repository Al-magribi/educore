import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";

import { fileURLToPath } from "url";
import { express as userAgent } from "express-useragent";

import pool from "./config/connection.js";
import registerApiRoutes from "./router/registerApiRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.join(__dirname, "../client/dist");
const clientIndexPath = path.join(clientDistPath, "index.html");
const hasClientBuild = fs.existsSync(clientIndexPath);

const app = express();

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(userAgent());

// Static Folder
app.use("/assets", express.static(path.join(__dirname, "assets")));
const backupPath = path.join(process.cwd(), "temp_backup");
if (!fs.existsSync(backupPath)) {
  fs.mkdirSync(backupPath, { recursive: true });
}

if (hasClientBuild) {
  app.use(express.static(clientDistPath));
}
app.use("/temp_backup", express.static(path.join(backupPath)));

registerApiRoutes(app);

pool
  .query("SELECT NOW()")
  .then(() => {
    console.log("[DB] Database Connected Successfully");
  })
  .catch((error) => {
    console.error("[DB] Initial connection check failed", error);
  });

// Handle all routes - send index.html for client-side routing when the build exists.
app.get("/{*splat}", (req, res) => {
  if (!hasClientBuild) {
    res.status(503).json({
      message:
        "Client build not found. Run `npm --prefix client run build` or use the `product/cbt` branch.",
    });
    return;
  }

  res.sendFile(clientIndexPath);
});

export default app;
