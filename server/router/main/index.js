import { Router } from "express";
import teacher from "./RouterTeacher.js";
import periode from "./RouterPeriode.js";
import major from "./RouterMajor.js";
import grade from "./RouterGrade.js";
import classes from "./RouterClass.js";
import dashboard from "./RouterDash.js";

const RouterMain = Router();

RouterMain.use(teacher);
RouterMain.use(periode);
RouterMain.use(major);
RouterMain.use(grade);
RouterMain.use(classes);
RouterMain.use(dashboard);

export default RouterMain;
