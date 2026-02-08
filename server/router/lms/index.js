import { Router } from "express";
import lms from "./RouterLms.js";

const RouterLms = Router();

RouterLms.use(lms);

export default RouterLms;
