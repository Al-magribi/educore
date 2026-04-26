import { Router } from "express";
import lms from "./RouterLms.js";
import Attendance from "./RouterAttendance.js";
import grading from "./RouterGrading.js";
import recap from "./RouterRecap.js";
import parent from "./RouterParent.js";
import point from "./RouterPoint.js";
import task from "./RouterTask.js";
import schedule from "./RouterSchedule.js";
import duty from "./RouterDuty.js";

const RouterLms = Router();

RouterLms.use(lms);
RouterLms.use(Attendance);
RouterLms.use(grading);
RouterLms.use(recap);
RouterLms.use(parent);
RouterLms.use(point);
RouterLms.use(task);
RouterLms.use(schedule);
RouterLms.use(duty);

export default RouterLms;
