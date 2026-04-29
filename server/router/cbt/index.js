import { Router } from "express";
import bank from "./RouterBank.js";
import question from "./RouterQuestion.js";
import exam from "./RouterExam.js";
import examAi from "./RouterExamAi.js";

const RouterCbt = Router();

RouterCbt.use(bank);
RouterCbt.use(question);
RouterCbt.use(exam);
RouterCbt.use(examAi);

export default RouterCbt;
