import { Router } from "express";
import subject from "./RouterSubject.js";
import teacher from "./RouterTeacher.js";
import student from "./RouterStudent.js";

const RouterAcademic = Router();

RouterAcademic.use(subject);
RouterAcademic.use(teacher);
RouterAcademic.use(student);

export default RouterAcademic;
