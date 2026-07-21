import { Router } from "express";
import database from "./RouterDatabase.js";
import dashboard from "./RouterDash.js";
import attendanceReport from "./RouterAttendanceReport.js";
import app from "./RouterApp.js";
import homebase from "./RouterHomebase.js";
import admin from "./RouterAdmin.js";
import analysis from "./RouterAnalysis.js";

const RouterCenter = Router();

RouterCenter.use(database);
RouterCenter.use(dashboard);
RouterCenter.use(attendanceReport);
RouterCenter.use(app);
RouterCenter.use(homebase);
RouterCenter.use(admin);
RouterCenter.use(analysis);

export default RouterCenter;
