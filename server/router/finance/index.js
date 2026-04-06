import { Router } from "express";
import monthly from "./RouterMonthly.js";
import others from "./RouterOthers.js";
import transaction from "./RouterTransaction.js";
import dashboard from "./RouterDash.js";
import saving from "./RouterSaving.js";
import contribution from "./RouterContribution.js";

const RouterFinance = Router();

RouterFinance.use(dashboard);
RouterFinance.use(monthly);
RouterFinance.use(others);
RouterFinance.use(transaction);
RouterFinance.use(saving);
RouterFinance.use(contribution);

export default RouterFinance;
