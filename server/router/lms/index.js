import { Router } from "express";
import lms from "./RouterLms.js";
import Attendance from "./RouterAttendance.js";
import grading from "./RouterGrading.js";
import recap from "./RouterRecap.js";

const RouterLms = Router();

RouterLms.use(lms);
RouterLms.use(Attendance);
RouterLms.use(grading);
RouterLms.use(recap);

export default RouterLms;
