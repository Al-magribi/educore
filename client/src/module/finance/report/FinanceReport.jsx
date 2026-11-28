import { useParams } from "react-router-dom";

import { useFinanceScope } from "../../center/finance/FinanceScopeContext";
import ReportDetail from "./ReportDetail";
import ReportHomebaseList from "./components/ReportHomebaseList";

const FinanceReport = ({
  listPath = "/finance/laporan",
  getDetailPath,
  forceDetail = false,
}) => {
  const params = useParams();
  const financeScope = useFinanceScope();
  const homebaseId =
    params.homebaseId || params.id || financeScope?.homebaseId;

  if (forceDetail || homebaseId) {
    return (
      <ReportDetail
        listPath={listPath}
        showBack={!forceDetail}
        scopedHomebaseId={
          forceDetail ? financeScope?.homebaseId || homebaseId : homebaseId
        }
      />
    );
  }

  return (
    <ReportHomebaseList
      basePath={listPath}
      getDetailPath={getDetailPath}
    />
  );
};

export default FinanceReport;
