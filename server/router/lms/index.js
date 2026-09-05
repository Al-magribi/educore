import { Router } from "express";
import lms from "./RouterLms.js";
import Attendance from "./RouterAttendance.js";
import AttendanceTelegram from "./RouterAttendanceTelegram.js";
import AttendanceHoliday from "./RouterAttendanceHoliday.js";
import grading from "./RouterGrading.js";
import recap from "./RouterRecap.js";
import parent from "./RouterParent.js";
import point from "./RouterPoint.js";
import task from "./RouterTask.js";
import schedule from "./RouterSchedule.js";
import duty from "./RouterDuty.js";
import journal from "./RouterJournal.js";
import staffAssignment from "./RouterStaffAssignment.js";

const RouterLms = Router();

RouterLms.use(lms);
RouterLms.use(Attendance);
RouterLms.use(AttendanceTelegram);
RouterLms.use(AttendanceHoliday);
RouterLms.use(grading);
RouterLms.use(recap);
RouterLms.use(parent);
RouterLms.use(point);
RouterLms.use(task);
RouterLms.use(schedule);
RouterLms.use(duty);
RouterLms.use(journal);
RouterLms.use(staffAssignment);

export default RouterLms;
