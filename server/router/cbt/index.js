import { Router } from "express";
import bank from "./RouterBank.js";
import question from "./RouterQuestion.js";
import exam from "./RouterExam.js";
import examAi from "./RouterExamAi.js";
import questionAi from "./RouterQuestionAi.js";

const RouterCbt = Router();

RouterCbt.use(bank);
RouterCbt.use(question);
RouterCbt.use(exam);
RouterCbt.use(examAi);
RouterCbt.use(questionAi);

export default RouterCbt;
