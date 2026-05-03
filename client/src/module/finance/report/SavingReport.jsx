import { Select, Space, Tag, Typography } from "antd";
import { useState } from "react";
import { useSelector } from "react-redux";

import { LoadApp } from "../../../components";
import {
  useGetMySavingOverviewQuery,
  useGetSavingStudentsQuery,
} from "../../../service/finance/ApiSaving";
import FinanceFeaturePage from "./FinanceFeaturePage";
import Saving from "../teacher/saving/Saving";

const { Text } = Typography;

const toCurrency = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const SavingReport = () => {
  const { user } = useSelector((state) => state.auth);
  const isParent = user?.role === "parent";
  const isAdmin = user?.role === "admin";
  const [selectedStudentId, setSelectedStudentId] = useState();

  const { data: savingStudentsResponse, isLoading: isLoadingStudents } =
    useGetSavingStudentsQuery(undefined, {
      skip: isParent || isAdmin,
    });
  const { data: mySavingResponse, isLoading: isLoadingMySaving } =
    useGetMySavingOverviewQuery(
      selectedStudentId ? { student_id: selectedStudentId } : undefined,
      {
        skip: !isParent || isAdmin,
      },
    );

  if (isAdmin) {
    return <Saving pageVariant='admin' />;
  }

  if ((isParent && isLoadingMySaving) || (!isParent && isLoadingStudents)) {
    return <LoadApp />;
  }

  const columns = [
    {
      title: "Siswa",
      dataIndex: "student",
      key: "student",
    },
    {
      title: "Kelas",
      dataIndex: "classroom",
      key: "classroom",
    },
    {
      title: "Total Setoran",
      dataIndex: "deposit",
      key: "deposit",
    },
    {
      title: "Saldo",
      dataIndex: "balance",
      key: "balance",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => (
        <Tag
          color={status.color}
          style={{ borderRadius: 999, fontWeight: 600 }}
        >
          {status.label}
        </Tag>
      ),
    },
  ];

  let dataSource = [];
  let stats = [];
  let headerExtra = null;
  let summary = {
    title: "0 akun tabungan",
    description: "Belum ada data tabungan yang dapat ditampilkan.",
  };
  let description =
    "Halaman ini menampilkan perkembangan saldo tabungan siswa, intensitas setoran, dan akun yang perlu dipantau lebih dekat.";

  if (isParent) {
    const payload = mySavingResponse?.data || {};
    const children = payload.children || [];
    const resolvedStudentId = selectedStudentId || payload.selected_student_id;
    const student = payload.student || {};
    const reportSummary = payload.summary || {};
    const transactions = payload.transactions || [];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const thisMonthDeposit = transactions
      .filter((item) => {
        const date = item.transaction_date
          ? new Date(item.transaction_date)
          : null;
        return (
          item.transaction_type === "deposit" &&
          date &&
          date.getMonth() === currentMonth &&
          date.getFullYear() === currentYear
        );
      })
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    const isActiveAccount = Number(reportSummary.transaction_count || 0) > 0;

    dataSource = [
      {
        key: student.student_id || 1,
        student: student.student_name || "-",
        classroom: student.class_name || "-",
        deposit: toCurrency(thisMonthDeposit),
        balance: toCurrency(reportSummary.balance),
        status: {
          label: isActiveAccount ? "Aktif" : "Pasif",
          color: isActiveAccount ? "green" : "gold",
        },
      },
    ];

    stats = [
      {
        title: "Saldo Tabungan",
        value: reportSummary.balance || 0,
        prefix: "Rp",
        note: "Saldo tabungan anak",
      },
      {
        title: "Setoran Bulan Ini",
        value: thisMonthDeposit,
        prefix: "Rp",
        note: "Total setoran pada bulan berjalan.",
      },
      {
        title: "Total Setoran",
        value: reportSummary.total_deposit || 0,
        prefix: "Rp",
        note: "Akumulasi seluruh setoran",
      },
      {
        title: "Total Penarikan",
        value: reportSummary.total_withdrawal || 0,
        prefix: "Rp",
        note: "Akumulasi penarikan tabungan",
      },
    ];

    summary = {
      title: `${children.length || 1} akun tabungan`,
      description: "Ringkasan tabungan anak yang terhubung ke akun orang tua.",
    };
    description =
      "Halaman ini menampilkan perkembangan tabungan anak, riwayat transaksi, dan saldo terkini yang tercatat pada sekolah.";

    headerExtra =
      children.length > 1 ? (
        <Space
          wrap
          size={10}
          style={{
            marginTop: 14,
            padding: "10px 12px",
            borderRadius: 16,
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.14)",
          }}
        >
          <Text style={{ color: "rgba(255,255,255,0.84)" }}>Anak aktif</Text>
          <Select
            value={resolvedStudentId}
            onChange={setSelectedStudentId}
            style={{ minWidth: 240 }}
            options={children.map((item) => ({
              value: item.student_id,
              label: `${item.student_name}${item.nis ? ` • ${item.nis}` : ""}`,
            }))}
          />
        </Space>
      ) : null;
  } else {
    const rows = savingStudentsResponse?.data || [];
    const reportSummary = savingStudentsResponse?.summary || {};
    const totalStudents = Number(reportSummary.total_students || 0);

    dataSource = rows.map((item) => ({
      key: item.student_id,
      student: item.student_name || "-",
      classroom: item.class_name || "-",
      deposit: toCurrency(item.deposit_total),
      balance: toCurrency(item.balance),
      status: {
        label: Number(item.transaction_count || 0) > 0 ? "Aktif" : "Pasif",
        color: Number(item.transaction_count || 0) > 0 ? "green" : "gold",
      },
    }));

    stats = [
      {
        title: "Saldo Tabungan",
        value: reportSummary.total_balance || 0,
        prefix: "Rp",
      },
      {
        title: "Total Setoran",
        value: reportSummary.total_deposit || 0,
        prefix: "Rp",
      },
      {
        title: "Akun Aktif",
        value: reportSummary.active_students || 0,
      },
      {
        title: "Total Penarikan",
        value: reportSummary.total_withdrawal || 0,
        prefix: "Rp",
      },
    ];

    summary = {
      title: `${totalStudents} akun tabungan`,
      description:
        "Total siswa yang masuk dalam cakupan laporan tabungan aktif.",
    };
  }

  return (
    <FinanceFeaturePage
      badge='Laporan Tabungan'
      title='Rekap tabungan siswa'
      description={description}
      summary={summary}
      stats={stats}
      headerExtra={headerExtra}
      actions={[]}
      notes={[]}
      columns={columns}
      dataSource={dataSource}
    />
  );
};

export default SavingReport;
