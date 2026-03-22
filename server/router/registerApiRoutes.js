import RouterPublic from "./public/RouterPublic.js";
import RouterAuth from "./auth/index.js";
import RouterCenter from "./center/index.js";
import RouterMain from "./main/index.js";
import RouterMigrasi from "./migration/RouterMigration.js";
import RouterAcademic from "./academic/index.js";
import RouterCbt from "./cbt/index.js";
import RouterFinance from "./finance/index.js";

const apiRouteRegistry = [
  { basePath: "/api/public", router: RouterPublic },
  { basePath: "/api/auth", router: RouterAuth },
  { basePath: "/api/center", router: RouterCenter },
  { basePath: "/api/main", router: RouterMain },
  { basePath: "/api/academic", router: RouterAcademic },
  { basePath: "/api/cbt", router: RouterCbt },
  { basePath: "/api/finance", router: RouterFinance },
  { basePath: "/api", router: RouterMigrasi },
];

const registerApiRoutes = (app) => {
  apiRouteRegistry.forEach(({ basePath, router }) => {
    app.use(basePath, router);
  });
};

export default registerApiRoutes;
