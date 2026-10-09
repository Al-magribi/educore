import FinanceReport from "./FinanceReport";

/** Wrapper for center finance shell — homebase already selected. */
const CenterFinanceReport = () => (
  <FinanceReport forceDetail listPath='/keuangan' />
);

export default CenterFinanceReport;
