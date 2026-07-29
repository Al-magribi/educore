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

export default RouterFinance;
