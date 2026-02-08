import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";

import { fileURLToPath } from "url";
import { express as userAgent } from "express-useragent";

import pool from "./config/connection.js";

// Routers
import RouterPublic from "./router/public/RouterPublic.js";

import RouterAuth from "./router/auth/index.js";
import RouterCenter from "./router/center/index.js";
import RouterMain from "./router/main/index.js";

import RouterMigrasi from "./router/migration/RouterMigration.js";
import RouterAcademic from "./router/academic/index.js";

// CBT
import RouterCbt from "./router/cbt/index.js";

// LMS
import RouterLms from "./router/lms/index.js";

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

// Routers
app.use("/api/public", RouterPublic);

app.use("/api/auth", RouterAuth);
app.use("/api/center", RouterCenter);
app.use("/api/main", RouterMain);
app.use("/api/academic", RouterAcademic);

// CBT
app.use("/api/cbt", RouterCbt);

// LMS
app.use("/api/lms", RouterLms);

// Migration

app.use("/api", RouterMigrasi);

await pool.query("SELECT NOW()");
console.log("[DB] Database Connected Successfully");

// Handle all routes - send index.html for client-side routing
app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});

export default app;
