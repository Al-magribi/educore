import { Router } from "express";
import { registerScheduleBootstrapConfigRoutes } from "./schedule/bootstrapConfigRoutes.js";
import { registerScheduleResourceRoutes } from "./schedule/resourceRoutes.js";
import { registerScheduleExecutionRoutes } from "./schedule/executionRoutes.js";

const router = Router();

registerScheduleBootstrapConfigRoutes(router);
registerScheduleResourceRoutes(router);
registerScheduleExecutionRoutes(router);

export default router;
