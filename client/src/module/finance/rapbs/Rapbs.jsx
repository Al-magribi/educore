import { useParams } from "react-router-dom";

import { useFinanceScope } from "../../center/finance/FinanceScopeContext";
import ReportHomebaseList from "../report/components/ReportHomebaseList";
import RapbsDetail from "./RapbsDetail";

const Rapbs = ({
  listPath = "/finance/rapbs",
  getDetailPath,
  forceDetail = false,
}) => {
  const params = useParams();
  const financeScope = useFinanceScope();
  const homebaseId =
    params.homebaseId || params.id || financeScope?.homebaseId;

  if (forceDetail || homebaseId) {
    return (
      <RapbsDetail
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
      title='RAPBS / Anggaran — Pilih Satuan Pendidikan'
      description='Pilih satuan untuk mengelola anggaran RAPBS, memantau realisasi pendapatan dan pengeluaran per periode.'
    />
  );
};

export default Rapbs;
