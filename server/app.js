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

// BUILD
app.use(express.static(path.join(__dirname, "../client/dist")));

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

// Handle all routes - send index.html for client-side routing
app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});

export default app;
