import { Grid, Result, Space, Tabs, Typography } from "antd";

import { LoadApp } from "../../../../components";
import { useGetMySavingOverviewQuery } from "../../../../service/finance/ApiSaving";
import StudentSavingHeader from "./components/StudentSavingHeader";
import StudentSavingHistoryTab from "./components/StudentSavingHistoryTab";
import StudentSavingOverviewTab from "./components/StudentSavingOverviewTab";
import StudentSavingSummaryCards from "./components/StudentSavingSummaryCards";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const StudentSaving = () => {
  const screens = useBreakpoint();
  const {
    data: response,
    isLoading,
    isError,
    error,
  } = useGetMySavingOverviewQuery();

  const data = response?.data || {};
  const activePeriode = data.active_periode || null;
  const student = data.student || null;
  const summary = data.summary || {};
  const transactions = data.transactions || [];

  if (isLoading && !response) {
    return <LoadApp />;
  }

  if (isError) {
    return (
      <Result
        status='warning'
        title='Tabungan belum dapat ditampilkan'
        subTitle={
          error?.data?.message ||
          "Data tabungan siswa pada periode aktif belum tersedia."
        }
      />
    );
  }

  return (
    <div style={{ width: "100%" }}>
      <Space vertical size={screens.xs ? 20 : 24} style={{ width: "100%" }}>
        <StudentSavingHeader activePeriode={activePeriode} student={student} />

        <StudentSavingSummaryCards summary={summary} />

        <Tabs
          size={screens.xs ? "small" : "middle"}
          tabBarGutter={screens.xs ? 16 : 24}
          items={[
            {
              key: "overview",
              label: "Ringkasan",
              children: (
                <StudentSavingOverviewTab student={student} summary={summary} />
              ),
            },
            {
              key: "history",
              label: `Riwayat Tabungan (${transactions.length})`,
              children: <StudentSavingHistoryTab transactions={transactions} />,
            },
          ]}
        />

        <Text type='secondary'>
          Riwayat tabungan ditampilkan berdasarkan periode aktif{" "}
          {activePeriode?.name || "-"}.
        </Text>
      </Space>
    </div>
  );
};

export default StudentSaving;
