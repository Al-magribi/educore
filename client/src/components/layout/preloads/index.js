// Gabungan preload per domain. File ini milik `main`; feature cukup mengisi
// file domainnya (cbt.js, db.js, finance.js, lms.js, tahfiz.js).
import corePreloads from "./core";
import cbtPreloads from "./cbt";
import dbPreloads from "./db";
import financePreloads from "./finance";
import lmsPreloads from "./lms";
import tahfizPreloads from "./tahfiz";

const routePreloaders = {
  ...corePreloads,
  ...cbtPreloads,
  ...dbPreloads,
  ...financePreloads,
  ...lmsPreloads,
  ...tahfizPreloads,
};

export default routePreloaders;
