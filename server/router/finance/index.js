import { Router } from "express";
import monthly from "./RouterMonthly.js";
import others from "./RouterOthers.js";
import transaction from "./RouterTransaction.js";
import parentTransaction from "./RouterParentTransaction.js";
import dashboard from "./RouterDash.js";
import saving from "./RouterSaving.js";
import contribution from "./RouterContribution.js";
import setting from "./RouterSetting.js";
import scholarship from "./RouterScholarship.js";
import expense from "./RouterExpense.js";
import honorarium from "./RouterHonorarium.js";
import honorariumPayroll from "./RouterHonorariumPayroll.js";
import report from "./RouterReport.js";

const RouterFinance = Router();

RouterFinance.use(dashboard);
RouterFinance.use(monthly);
RouterFinance.use(others);
RouterFinance.use(transaction);
RouterFinance.use(parentTransaction);
RouterFinance.use(saving);
RouterFinance.use(contribution);
RouterFinance.use(setting);
RouterFinance.use(scholarship);
RouterFinance.use(expense);
RouterFinance.use(honorarium);
RouterFinance.use(honorariumPayroll);
RouterFinance.use(report);

export default RouterFinance;
