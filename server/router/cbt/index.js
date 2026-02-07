import { Router } from "express";
import bank from "./RouterBank.js";
import question from "./RouterQuestion.js";
import exam from "./RouterExam.js";

const RouterCbt = Router();

RouterCbt.use(bank);
RouterCbt.use(question);
RouterCbt.use(exam);

export default RouterCbt;
