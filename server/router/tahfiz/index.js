import { Router } from "express";
import dashboard from "./RouterDash.js";
import alquran from "./RouterAlquran.js";
import target from "./RouterTarget.js";
import halaqoh from "./RouterHalaqoh.js";

const RouterTahfiz = Router();

RouterTahfiz.use(dashboard);
RouterTahfiz.use(alquran);
RouterTahfiz.use(target);
RouterTahfiz.use(halaqoh);

export default RouterTahfiz;
