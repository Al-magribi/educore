import { Router } from "express";
import monthly from "./RouterMonthly.js";
import others from "./RouterOthers.js";
import transaction from "./RouterTransaction.js";
import dashboard from "./RouterDash.js";

const RouterFinance = Router();

RouterFinance.use(dashboard);
RouterFinance.use(monthly);
RouterFinance.use(others);
RouterFinance.use(transaction);

export default RouterFinance;
