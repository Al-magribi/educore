import { useMemo, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Flex,
  Input,
  Progress,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import { Download } from "lucide-react";
import * as XLSX from "xlsx";

import {
  useGetTransactionsQuery,
  useLazyGetTransactionsQuery,
} from "../../../../service/finance/ApiTransaction";
import { useGetExpensesQuery } from "../../../../service/finance/ApiExpense";
import {
  cardStyle,
  currencyFormatter,
  expenseCategoryColorMap,
  expenseCategoryLabelMap,
  paymentMethodLabelMap,
  statusColorMap,
  statusLabelMap,
} from "../constants";
import ReportBudgetTab from "./ReportBudgetTab";
import ReportCashflowTab from "./ReportCashflowTab";

const { Text } = Typography;

const percentColor = (value) => {
  if (value >= 90) return "#16a34a";
  if (value >= 75) return "#2563eb";
  if (value >= 50) return "#d97706";
  return "#dc2626";
};

const paymentStatusColor = (status) => {
  if (status === "confirmed") return "success";
  if (status === "pending") return "gold";
  if (status === "rejected") return "red";
  if (status === "cancelled") return "default";
  if (status === "expired") return "volcano";
  if (status === "refunded") return "purple";
  return "blue";
};

const todayString = () => dayjs().format("YYYY-MM-DD");

const UnpaidTab = ({ rows = [] }) => {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (category !== "all" && row.category !== category) return false;
      if (!needle) return true;
      return (
        String(row.student_name || "")
          .toLowerCase()
          .includes(needle) ||
        String(row.nis || "")
          .toLowerCase()
          .includes(needle) ||
        String(row.class_name || "")
          .toLowerCase()
          .includes(needle) ||
        String(row.type_name || "")
          .toLowerCase()
          .includes(needle)
      );
    });
  }, [category, rows, search]);

  const columns = [
    {
      title: "Siswa",
      dataIndex: "student_name",
      key: "student_name",
      render: (value, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{value}</div>
          <div style={{ color: "#64748b", fontSize: 12 }}>
            {row.nis || "-"} · {row.class_name || "-"}
          </div>
        </div>
      ),
    },
    {
      title: "Kategori",
      dataIndex: "category_label",
      key: "category_label",
      width: 110,
      render: (value, row) => (
        <Tag color={row.category === "spp" ? "geekblue" : "purple"}>
          {value}
        </Tag>
      ),
    },
    {
      title: "Jenis / Bulan",
      key: "detail",
      render: (_, row) => (
        <div>
          <div>{row.type_name}</div>
          {row.category === "spp" ? (
            <div style={{ color: "#64748b", fontSize: 12 }}>
              {row.billing_period_label}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: "Tagihan",
      dataIndex: "amount",
      key: "amount",
      align: "right",
      render: (value) => currencyFormatter.format(value || 0),
    },
    {
      title: "Terbayar",
      dataIndex: "paid_amount",
      key: "paid_amount",
      align: "right",
      render: (value) => currencyFormatter.format(value || 0),
    },
    {
      title: "Sisa",
      dataIndex: "remaining_amount",
      key: "remaining_amount",
      align: "right",
      render: (value) => (
        <span style={{ fontWeight: 600, color: "#b45309" }}>
          {currencyFormatter.format(value || 0)}
        </span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      render: (value) => (
        <Tag color={statusColorMap[value] || "default"}>
          {statusLabelMap[value] || value}
        </Tag>
      ),
    },
  ];

  return (
    <>
      <Space wrap style={{ marginBottom: 14 }}>
        <Select
          value={category}
          style={{ minWidth: 160 }}
          onChange={setCategory}
          options={[
            { value: "all", label: "Semua kategori" },
            { value: "spp", label: "SPP" },
            { value: "other", label: "Pembayaran lainnya" },
          ]}
        />
        <Input.Search
          allowClear
          placeholder='Cari siswa, NIS, kelas, jenis…'
          style={{ minWidth: 260 }}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Tag color='orange'>{filteredRows.length} baris</Tag>
      </Space>

      <Table
        rowKey='key'
        columns={columns}
        dataSource={filteredRows}
        pagination={{ pageSize: 15, showSizeChanger: true }}
        scroll={{ x: 960 }}
        size='middle'
      />
    </>
  );
};

const fetchAllDailyTransactions = async (trigger, baseParams) => {
  const pageLimit = 100;
  const first = await trigger(
    { ...baseParams, page: 1, limit: pageLimit },
    true,
  ).unwrap();

  const rows = [...(first?.data || [])];
  const totalRecords = Number(first?.summary?.total_records || rows.length);
  const totalPages = Math.max(
    Number(first?.summary?.total_pages || 1),
    Math.ceil(totalRecords / pageLimit) || 1,
  );

  for (let page = 2; page <= totalPages; page += 1) {
    const next = await trigger(
      { ...baseParams, page, limit: pageLimit },
      true,
    ).unwrap();
    rows.push(...(next?.data || []));
  }

  return rows;
};

const DailyRevenueTab = ({ homebaseId, enabled = true }) => {
  const [selectedDate, setSelectedDate] = useState(() => todayString());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);

  const queryArgs = useMemo(
    () => ({
      homebase_id: homebaseId,
      date_from: selectedDate,
      date_to: selectedDate,
      page,
      limit: pageSize,
      search: search.trim() || undefined,
      status: "confirmed",
    }),
    [homebaseId, page, pageSize, search, selectedDate],
  );

  const { data: response, isFetching } = useGetTransactionsQuery(queryArgs, {
    skip: !enabled || !homebaseId || !selectedDate,
  });
  const [triggerTransactions] = useLazyGetTransactionsQuery();

  const transactions = response?.data || [];
  const summary = response?.summary || {};
  const totalRecords = Number(summary.total_records || 0);
  const confirmedAmount = Number(summary.confirmed_amount || 0);

  const handleExportExcel = async () => {
    if (!homebaseId || !selectedDate) {
      message.warning("Pilih tanggal terlebih dahulu");
      return;
    }

    setExporting(true);
    try {
      const rows = await fetchAllDailyTransactions(triggerTransactions, {
        homebase_id: homebaseId,
        date_from: selectedDate,
        date_to: selectedDate,
        search: search.trim() || undefined,
        status: "confirmed",
      });

      if (!rows.length) {
        message.info("Tidak ada transaksi untuk diekspor");
        return;
      }

      const grandTotal = rows.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0,
      );

      const sheetRows = [
        ["Tanggal", "Siswa", "Kelas", "Pembayaran", "Nominal"],
        ...rows.map((item) => [
          item.paid_at
            ? dayjs(item.paid_at).format("DD/MM/YYYY HH:mm")
            : dayjs(selectedDate).format("DD/MM/YYYY"),
          item.student_name || "-",
          item.class_name || item.grade_name || "-",
          item.description || "-",
          currencyFormatter.format(Number(item.amount || 0)),
        ]),
        ["Grand Total", "", "", "", currencyFormatter.format(grandTotal)],
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
      worksheet["!cols"] = [
        { wch: 18 },
        { wch: 28 },
        { wch: 16 },
        { wch: 36 },
        { wch: 20 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Pendapatan Harian");
      XLSX.writeFile(workbook, `pendapatan-harian-${selectedDate}.xlsx`);
      message.success("Excel berhasil diunduh");
    } catch (error) {
      message.error(error?.data?.message || "Gagal mengunduh Excel");
    } finally {
      setExporting(false);
    }
  };

  const columns = [
    {
      title: "Waktu",
      dataIndex: "paid_at",
      key: "paid_at",
      width: 150,
      render: (value) => (value ? dayjs(value).format("HH:mm") : "-"),
    },
    {
      title: "Siswa",
      dataIndex: "student_name",
      key: "student_name",
      render: (value, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{value}</div>
          <div style={{ color: "#64748b", fontSize: 12 }}>
            {row.nis || "-"} · {row.class_name || row.grade_name || "-"}
          </div>
        </div>
      ),
    },
    {
      title: "Keterangan",
      dataIndex: "description",
      key: "description",
      render: (value, row) => (
        <div>
          <div>{value || "-"}</div>
          {row.payment_source_label ? (
            <div style={{ color: "#64748b", fontSize: 12 }}>
              {row.payment_source_label}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (value, row) => (
        <Tag color={paymentStatusColor(value)}>{row.status_label || value}</Tag>
      ),
    },
    {
      title: "Nominal",
      dataIndex: "amount",
      key: "amount",
      align: "right",
      width: 160,
      render: (value) => (
        <span style={{ fontWeight: 600 }}>
          {currencyFormatter.format(value || 0)}
        </span>
      ),
    },
  ];

  return (
    <>
      <Flex
        justify='space-between'
        align='center'
        gap={12}
        wrap='wrap'
        style={{ marginBottom: 14 }}
      >
        <Space wrap>
          <DatePicker
            allowClear={false}
            value={selectedDate ? dayjs(selectedDate) : null}
            format='DD MMM YYYY'
            onChange={(value) => {
              setSelectedDate(
                value ? value.format("YYYY-MM-DD") : todayString(),
              );
              setPage(1);
            }}
          />
          <Input.Search
            allowClear
            placeholder='Cari nama siswa / NIS…'
            style={{ minWidth: 240 }}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onSearch={(value) => {
              setSearch(value);
              setPage(1);
            }}
            onClear={() => {
              setSearchInput("");
              setSearch("");
              setPage(1);
            }}
          />
          <Button
            icon={<Download size={16} />}
            loading={exporting}
            disabled={!totalRecords}
            onClick={handleExportExcel}
          >
            Download Excel
          </Button>
        </Space>

        <Statistic
          title='Total pendapatan'
          value={confirmedAmount}
          formatter={(value) => currencyFormatter.format(Number(value || 0))}
          styles={{ content: { fontSize: 18, color: "#15803d" } }}
        />
      </Flex>

      <Text type='secondary' style={{ display: "block", marginBottom: 10 }}>
        Transaksi terkonfirmasi pada{" "}
        {selectedDate ? dayjs(selectedDate).format("DD MMMM YYYY") : "-"} ·{" "}
        {totalRecords} transaksi
      </Text>

      <Table
        rowKey={(row) => `${row.category || "tx"}-${row.id}`}
        columns={columns}
        dataSource={transactions}
        loading={isFetching}
        pagination={{
          current: page,
          pageSize,
          total: totalRecords,
          showSizeChanger: true,
          pageSizeOptions: [10, 15, 20, 50],
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} dari ${total} transaksi`,
          onChange: (nextPage, nextSize) => {
            setPage(nextSize !== pageSize ? 1 : nextPage);
            setPageSize(nextSize);
          },
        }}
        scroll={{ x: 900 }}
        size='middle'
        locale={{
          emptyText: "Tidak ada transaksi pada tanggal ini.",
        }}
      />
    </>
  );
};

const DailyExpenseTab = ({ homebaseId, enabled = true }) => {
  const [selectedDate, setSelectedDate] = useState(() => todayString());
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const queryArgs = useMemo(
    () => ({
      homebase_id: homebaseId,
      date_from: selectedDate,
      date_to: selectedDate,
      search: search.trim() || undefined,
    }),
    [homebaseId, search, selectedDate],
  );

  const { data: response, isFetching } = useGetExpensesQuery(queryArgs, {
    skip: !enabled || !homebaseId || !selectedDate,
  });

  const expenses = response?.data || [];
  const totalAmount = expenses.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0,
  );

  const handleExportExcel = () => {
    if (!expenses.length) {
      message.info("Tidak ada pengeluaran untuk diekspor");
      return;
    }

    const sheetRows = [
      ["Tanggal", "Kategori", "Judul", "Keterangan", "Metode", "Nominal"],
      ...expenses.map((item) => [
        dayjs(item.expense_date).format("DD/MM/YYYY"),
        expenseCategoryLabelMap[item.category] || item.category,
        item.title || "-",
        item.description || "-",
        paymentMethodLabelMap[item.payment_method] || item.payment_method,
        currencyFormatter.format(Number(item.amount || 0)),
      ]),
      [
        "Grand Total",
        "",
        "",
        "",
        "",
        currencyFormatter.format(totalAmount),
      ],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
    worksheet["!cols"] = [
      { wch: 14 },
      { wch: 20 },
      { wch: 30 },
      { wch: 36 },
      { wch: 12 },
      { wch: 20 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pengeluaran Harian");
    XLSX.writeFile(workbook, `pengeluaran-harian-${selectedDate}.xlsx`);
    message.success("Excel berhasil diunduh");
  };

  const columns = [
    {
      title: "Kategori",
      dataIndex: "category",
      key: "category",
      width: 150,
      render: (value) => (
        <Tag color={expenseCategoryColorMap[value] || "default"}>
          {expenseCategoryLabelMap[value] || value}
        </Tag>
      ),
    },
    {
      title: "Pengeluaran",
      dataIndex: "title",
      key: "title",
      render: (value, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{value}</div>
          {row.description ? (
            <div style={{ color: "#64748b", fontSize: 12 }}>
              {row.description}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: "Metode",
      dataIndex: "payment_method",
      key: "payment_method",
      width: 110,
      render: (value) => paymentMethodLabelMap[value] || value || "-",
    },
    {
      title: "Referensi",
      dataIndex: "reference_no",
      key: "reference_no",
      width: 140,
      render: (value) => value || "-",
    },
    {
      title: "Nominal",
      dataIndex: "amount",
      key: "amount",
      align: "right",
      width: 160,
      render: (value) => (
        <span style={{ fontWeight: 600, color: "#dc2626" }}>
          {currencyFormatter.format(value || 0)}
        </span>
      ),
    },
  ];

  return (
    <>
      <Flex
        justify='space-between'
        align='center'
        gap={12}
        wrap='wrap'
        style={{ marginBottom: 14 }}
      >
        <Space wrap>
          <DatePicker
            allowClear={false}
            value={selectedDate ? dayjs(selectedDate) : null}
            format='DD MMM YYYY'
            onChange={(value) => {
              setSelectedDate(
                value ? value.format("YYYY-MM-DD") : todayString(),
              );
            }}
          />
          <Input.Search
            allowClear
            placeholder='Cari judul / keterangan / referensi…'
            style={{ minWidth: 260 }}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onSearch={(value) => setSearch(value)}
            onClear={() => {
              setSearchInput("");
              setSearch("");
            }}
          />
          <Button
            icon={<Download size={16} />}
            disabled={!expenses.length}
            onClick={handleExportExcel}
          >
            Download Excel
          </Button>
        </Space>

        <Statistic
          title='Total pengeluaran'
          value={totalAmount}
          formatter={(value) => currencyFormatter.format(Number(value || 0))}
          styles={{ content: { fontSize: 18, color: "#dc2626" } }}
        />
      </Flex>

      <Text type='secondary' style={{ display: "block", marginBottom: 10 }}>
        Pengeluaran tercatat pada{" "}
        {selectedDate ? dayjs(selectedDate).format("DD MMMM YYYY") : "-"} ·{" "}
        {expenses.length} transaksi
      </Text>

      <Table
        rowKey='id'
        columns={columns}
        dataSource={expenses}
        loading={isFetching}
        pagination={{ pageSize: 15, showSizeChanger: true }}
        scroll={{ x: 900 }}
        size='middle'
        locale={{
          emptyText: "Tidak ada pengeluaran pada tanggal ini.",
        }}
      />
    </>
  );
};

const ReportBreakdown = ({
  sppByClass = [],
  otherByType = [],
  unpaidStudents = [],
  expenseByCategory = [],
  budgetItems = [],
  monthlyCashflow = [],
  homebaseId,
  periodeId,
}) => {
  const [activeTab, setActiveTab] = useState("spp");

  const sppColumns = [
    {
      title: "Kelas",
      dataIndex: "class_name",
      key: "class_name",
      render: (value, row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{value}</div>
          <div style={{ color: "#64748b", fontSize: 12 }}>{row.grade_name}</div>
        </div>
      ),
    },
    {
      title: "Siswa",
      dataIndex: "student_count",
      key: "student_count",
      width: 90,
      align: "right",
    },
    {
      title: "Target",
      dataIndex: "target",
      key: "target",
      align: "right",
      render: (value) => currencyFormatter.format(value || 0),
    },
    {
      title: "Tertagih (kewajiban)",
      dataIndex: "paid_obligation",
      key: "paid_obligation",
      align: "right",
      render: (value) => currencyFormatter.format(value || 0),
    },
    {
      title: "Sisa",
      dataIndex: "remaining",
      key: "remaining",
      align: "right",
      render: (value) => currencyFormatter.format(value || 0),
    },
    {
      title: "Pencapaian",
      dataIndex: "achievement",
      key: "achievement",
      width: 160,
      render: (value) => (
        <Progress
          percent={Number(value || 0)}
          size='small'
          strokeColor={percentColor(Number(value || 0))}
          format={(percent) => `${percent}%`}
        />
      ),
    },
    {
      title: "Status",
      key: "status_counts",
      render: (_, row) => (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Tag color='green'>{row.paid_count} lunas</Tag>
          <Tag color='blue'>{row.partial_count} cicilan</Tag>
          <Tag color='gold'>{row.unpaid_count} belum</Tag>
        </div>
      ),
    },
  ];

  const otherColumns = [
    {
      title: "Jenis Biaya",
      dataIndex: "type_name",
      key: "type_name",
      render: (value) => <span style={{ fontWeight: 600 }}>{value}</span>,
    },
    {
      title: "Siswa",
      dataIndex: "student_count",
      key: "student_count",
      width: 90,
      align: "right",
    },
    {
      title: "Target",
      dataIndex: "target",
      key: "target",
      align: "right",
      render: (value) => currencyFormatter.format(value || 0),
    },
    {
      title: "Tertagih (kewajiban)",
      dataIndex: "paid_obligation",
      key: "paid_obligation",
      align: "right",
      render: (value) => currencyFormatter.format(value || 0),
    },
    {
      title: "Sisa",
      dataIndex: "remaining",
      key: "remaining",
      align: "right",
      render: (value) => currencyFormatter.format(value || 0),
    },
    {
      title: "Pencapaian",
      dataIndex: "achievement",
      key: "achievement",
      width: 160,
      render: (value) => (
        <Progress
          percent={Number(value || 0)}
          size='small'
          strokeColor={percentColor(Number(value || 0))}
          format={(percent) => `${percent}%`}
        />
      ),
    },
    {
      title: "Status",
      key: "status_counts",
      render: (_, row) => (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Tag color='green'>{row.paid_count} lunas</Tag>
          <Tag color='blue'>{row.partial_count} cicilan</Tag>
          <Tag color='gold'>{row.unpaid_count} belum</Tag>
        </div>
      ),
    },
  ];

  const expenseCategoryTotal = expenseByCategory.reduce(
    (sum, row) => sum + Number(row.total || 0),
    0,
  );

  const expenseCategoryColumns = [
    {
      title: "Kategori",
      dataIndex: "category_label",
      key: "category_label",
      render: (value, row) => (
        <Tag color={expenseCategoryColorMap[row.category] || "default"}>
          {value}
        </Tag>
      ),
    },
    {
      title: "Transaksi",
      dataIndex: "entry_count",
      key: "entry_count",
      width: 110,
      align: "right",
    },
    {
      title: "Total",
      dataIndex: "total",
      key: "total",
      align: "right",
      render: (value) => (
        <span style={{ fontWeight: 600 }}>
          {currencyFormatter.format(value || 0)}
        </span>
      ),
    },
    {
      title: "Proporsi",
      key: "proportion",
      width: 180,
      render: (_, row) => {
        const percent =
          expenseCategoryTotal > 0
            ? Math.round((Number(row.total || 0) / expenseCategoryTotal) * 1000) /
              10
            : 0;
        return (
          <Progress
            percent={percent}
            size='small'
            strokeColor='#dc2626'
            format={(value) => `${value}%`}
          />
        );
      },
    },
  ];

  return (
    <Card style={cardStyle} styles={{ body: { paddingTop: 8 } }}>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "spp",
            label: `SPP per Kelas (${sppByClass.length})`,
            children: (
              <Table
                rowKey={(row) => row.class_id || row.class_name}
                columns={sppColumns}
                dataSource={sppByClass}
                pagination={{ pageSize: 10, showSizeChanger: true }}
                scroll={{ x: 900 }}
                size='middle'
              />
            ),
          },
          {
            key: "other",
            label: `Lainnya per Tipe (${otherByType.length})`,
            children: (
              <Table
                rowKey={(row) => row.type_id || row.type_name}
                columns={otherColumns}
                dataSource={otherByType}
                pagination={{ pageSize: 10, showSizeChanger: true }}
                scroll={{ x: 900 }}
                size='middle'
              />
            ),
          },
          {
            key: "unpaid",
            label: `Belum Lunas (${unpaidStudents.length})`,
            children: <UnpaidTab rows={unpaidStudents} />,
          },
          {
            key: "daily",
            label: "Pendapatan Harian",
            children: (
              <DailyRevenueTab
                homebaseId={homebaseId}
                enabled={activeTab === "daily"}
              />
            ),
          },
          {
            key: "expense_category",
            label: `Pengeluaran per Kategori (${expenseByCategory.length})`,
            children: (
              <Table
                rowKey='category'
                columns={expenseCategoryColumns}
                dataSource={expenseByCategory}
                pagination={false}
                scroll={{ x: 700 }}
                size='middle'
                locale={{
                  emptyText:
                    "Belum ada pengeluaran tercatat pada cakupan laporan ini.",
                }}
                summary={() =>
                  expenseByCategory.length ? (
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0}>
                        <span style={{ fontWeight: 600 }}>Total</span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align='right'>
                        <span style={{ fontWeight: 600 }}>
                          {expenseByCategory.reduce(
                            (sum, row) => sum + Number(row.entry_count || 0),
                            0,
                          )}
                        </span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2} align='right'>
                        <span style={{ fontWeight: 600, color: "#dc2626" }}>
                          {currencyFormatter.format(expenseCategoryTotal)}
                        </span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={3} />
                    </Table.Summary.Row>
                  ) : null
                }
              />
            ),
          },
          {
            key: "expense",
            label: "Pengeluaran Harian",
            children: (
              <DailyExpenseTab
                homebaseId={homebaseId}
                enabled={activeTab === "expense"}
              />
            ),
          },
          {
            key: "budget",
            label: "RAPBS (Anggaran)",
            children: (
              <ReportBudgetTab
                homebaseId={homebaseId}
                periodeId={periodeId}
                items={budgetItems}
              />
            ),
          },
          {
            key: "cashflow",
            label: `Arus Kas (${monthlyCashflow.length})`,
            children: <ReportCashflowTab rows={monthlyCashflow} />,
          },
        ]}
      />
    </Card>
  );
};

export default ReportBreakdown;
