import fs from "fs";
import { fileURLToPath } from "url";

import RouterPublic from "./public/RouterPublic.js";
import RouterAuth from "./auth/index.js";
import RouterCenter from "./center/index.js";
import RouterMain from "./main/index.js";
import RouterMigrasi from "./migration/RouterMigration.js";
import RouterAcademic from "./academic/index.js";
import RouterCbt from "./cbt/index.js";

const optionalRouteDefinitions = [
  { basePath: "/api/database", modulePath: "./database/RouterDatabase.js" },
  { basePath: "/api/lms", modulePath: "./lms/index.js" },
  { basePath: "/api/finance", modulePath: "./finance/index.js" },
  { basePath: "/api/tahfiz", modulePath: "./tahfiz/index.js" },
];

const loadOptionalRouter = async ({ basePath, modulePath }) => {
  const filePath = fileURLToPath(new URL(modulePath, import.meta.url));

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const { default: router } = await import(modulePath);
  return { basePath, router };
};

const optionalRoutes = (
  await Promise.all(optionalRouteDefinitions.map(loadOptionalRouter))
).filter(Boolean);

const apiRouteRegistry = [
  { basePath: "/api/public", router: RouterPublic },
  { basePath: "/api/auth", router: RouterAuth },
  { basePath: "/api/center", router: RouterCenter },
  { basePath: "/api/main", router: RouterMain },
  { basePath: "/api/academic", router: RouterAcademic },
  { basePath: "/api/cbt", router: RouterCbt },
  ...optionalRoutes,
  { basePath: "/api", router: RouterMigrasi },
];

const registerApiRoutes = (app) => {
  apiRouteRegistry.forEach(({ basePath, router }) => {
    app.use(basePath, router);
  });
};

export default registerApiRoutes;
