import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Dropdown,
  Flex,
  Space,
  Spin,
  Typography,
  message,
} from "antd";
import { ArrowLeftOutlined, BankOutlined } from "@ant-design/icons";
import { Download, FileSpreadsheet, Printer } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import {
  useGetReportOptionsQuery,
  useGetRevenueReportQuery,
} from "../../../service/finance/ApiReport";
import ReportBreakdown from "./components/ReportBreakdown";
import ReportClosingsPanel from "./components/ReportClosingsPanel";
import ReportFilters from "./components/ReportFilters";
import ReportSummaryCards from "./components/ReportSummaryCards";
import { pageStyle } from "./constants";
import {
  exportFullFinanceReportExcel,
  printFullFinanceReport,
} from "./utils/exportFullFinanceReport";

const { Title, Text } = Typography;

const buildAppliedFilters = (draft) => {
  const next = {
    homebase_id: draft.homebase_id,
    periode_id: draft.periode_id,
    mode: draft.mode || "bulan",
  };

  if (next.mode === "bulan") {
    next.month = draft.month;
  }

  if (next.mode === "rentang") {
    next.date_from = draft.date_from;
    next.date_to = draft.date_to;
  }

  return next;
};

const validateFilters = (filters) => {
  if (!filters.periode_id) {
    return "Periode wajib dipilih";
  }

  if (filters.mode === "bulan" && !filters.month) {
    return "Bulan wajib dipilih";
  }

  if (filters.mode === "rentang") {
    if (!filters.date_from || !filters.date_to) {
      return "Rentang tanggal wajib diisi";
    }
    if (filters.date_from > filters.date_to) {
      return "Tanggal awal tidak boleh lebih besar dari tanggal akhir";
    }
  }

  return null;
};

const ReportDetail = ({
  listPath = "/finance/laporan",
  showBack = true,
  scopedHomebaseId,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const homebaseId = Number(
    scopedHomebaseId || params.homebaseId || params.id,
  );

  const [draftFilters, setDraftFilters] = useState({
    homebase_id: homebaseId,
    mode: "bulan",
    periode_id: undefined,
    month: undefined,
    date_from: undefined,
    date_to: undefined,
  });
  const [appliedFilters, setAppliedFilters] = useState(null);

  const {
    data: optionsResponse,
    isLoading: isLoadingOptions,
    isError: isOptionsError,
  } = useGetReportOptionsQuery(
    { homebase_id: homebaseId },
    { skip: !homebaseId },
  );

  const options = optionsResponse?.data;
  const homebaseName =
    options?.homebase?.name ||
    location.state?.homebaseName ||
    "Satuan pendidikan";

  useEffect(() => {
    if (!options) return;

    setDraftFilters((prev) => ({
      ...prev,
      homebase_id: homebaseId,
      mode: prev.mode || "bulan",
      periode_id: prev.periode_id || options.default_periode_id,
      month: prev.month || options.default_month,
    }));

    setAppliedFilters((prev) => {
      if (prev) return prev;
      return buildAppliedFilters({
        homebase_id: homebaseId,
        mode: "bulan",
        periode_id: options.default_periode_id,
        month: options.default_month,
      });
    });
  }, [homebaseId, options]);

  const queryArgs = useMemo(() => {
    if (!appliedFilters?.periode_id) return null;
    return appliedFilters;
  }, [appliedFilters]);

  const {
    data: reportResponse,
    isFetching: isFetchingReport,
    isError: isReportError,
    error: reportError,
  } = useGetRevenueReportQuery(queryArgs, {
    skip: !queryArgs,
  });

  const report = reportResponse?.data;
  const summary = report?.summary || {};

  const handleFilterChange = (patch) => {
    setDraftFilters((prev) => ({ ...prev, ...patch }));
  };

  const handleApply = () => {
    const next = buildAppliedFilters({
      ...draftFilters,
      homebase_id: homebaseId,
    });
    const errorMessage = validateFilters(next);
    if (errorMessage) {
      message.warning(errorMessage);
      return;
    }
    setAppliedFilters(next);
  };

  const handleExportExcel = () => {
    if (!report) {
      message.warning("Laporan belum siap diekspor");
      return;
    }
    try {
      exportFullFinanceReportExcel(report, { homebaseName });
      message.success("Excel laporan lengkap berhasil diunduh");
    } catch (error) {
      message.error(error?.message || "Gagal mengekspor Excel");
    }
  };

  const handlePrintPdf = () => {
    if (!report) {
      message.warning("Laporan belum siap dicetak");
      return;
    }
    try {
      printFullFinanceReport(report, { homebaseName });
    } catch (error) {
      message.error(error?.message || "Gagal membuka halaman cetak");
    }
  };

  if (!homebaseId) {
    return (
      <div style={pageStyle}>
        <Alert
          type='error'
          showIcon
          message='Homebase tidak valid'
          action={
            <Button onClick={() => navigate(listPath)}>Kembali</Button>
          }
        />
      </div>
    );
  }

  if (isLoadingOptions) {
    return (
      <div style={{ ...pageStyle, textAlign: "center", paddingTop: 64 }}>
        <Spin size='large' />
      </div>
    );
  }

  if (isOptionsError) {
    return (
      <div style={pageStyle}>
        <Alert
          type='error'
          showIcon
          message='Gagal memuat opsi laporan'
          action={
            showBack ? (
              <Button onClick={() => navigate(listPath)}>Kembali</Button>
            ) : null
          }
        />
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <Space direction='vertical' size={18} style={{ width: "100%" }}>
        <Flex align='flex-start' justify='space-between' gap={12} wrap='wrap'>
          <div>
            {showBack ? (
              <Button
                type='link'
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(listPath)}
                style={{ paddingInline: 0, marginBottom: 4 }}
              >
                Daftar satuan
              </Button>
            ) : null}
            <Flex align='center' gap={10}>
              <BankOutlined style={{ color: "#1677ff", fontSize: 20 }} />
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  Laporan Keuangan
                </Title>
                <Text type='secondary'>{homebaseName}</Text>
              </div>
            </Flex>
          </div>

          <Dropdown
            disabled={!report}
            menu={{
              items: [
                {
                  key: "excel",
                  icon: <FileSpreadsheet size={15} />,
                  label: "Unduh Excel lengkap",
                  onClick: handleExportExcel,
                },
                {
                  key: "pdf",
                  icon: <Printer size={15} />,
                  label: "Cetak / Simpan PDF",
                  onClick: handlePrintPdf,
                },
              ],
            }}
          >
            <Button type='primary' icon={<Download size={15} />} disabled={!report}>
              Ekspor Laporan
            </Button>
          </Dropdown>
        </Flex>

        <ReportFilters
          options={options}
          filters={draftFilters}
          onChange={handleFilterChange}
          onApply={handleApply}
          loading={isFetchingReport}
        />

        {isReportError ? (
          <Alert
            type='error'
            showIcon
            message={
              reportError?.data?.message || "Gagal memuat laporan keuangan"
            }
          />
        ) : null}

        {!queryArgs ? (
          <Alert
            type='info'
            showIcon
            message='Pilih periode lalu terapkan filter untuk menampilkan laporan.'
          />
        ) : isFetchingReport && !report ? (
          <div style={{ textAlign: "center", padding: 48 }}>
            <Spin size='large' />
          </div>
        ) : (
          <>
            <ReportSummaryCards summary={summary} />
            <ReportBreakdown
              sppByClass={report?.spp_by_class || []}
              otherByType={report?.other_by_type || []}
              unpaidStudents={report?.unpaid_students || []}
              expenseByCategory={report?.expense_by_category || []}
              budgetItems={report?.budget_realization?.items || []}
              monthlyCashflow={report?.monthly_cashflow || []}
              homebaseId={homebaseId}
              periodeId={appliedFilters?.periode_id}
            />
            <ReportClosingsPanel homebaseId={homebaseId} />
          </>
        )}
      </Space>
    </div>
  );
};

export default ReportDetail;
