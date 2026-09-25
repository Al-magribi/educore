import { Flex, Table, Typography } from "antd";

import { currencyFormatter } from "../constants";

const { Text } = Typography;

const signColor = (value) => (Number(value || 0) >= 0 ? "#15803d" : "#dc2626");

const CashflowBars = ({ rows = [] }) => {
  const maxValue = Math.max(
    1,
    ...rows.flatMap((row) => [
      Number(row.cash_in || 0),
      Number(row.cash_out || 0),
    ]),
  );

  if (!rows.length) return null;

  return (
    <div
      style={{
        display: "grid",
        gap: 10,
        marginBottom: 16,
        padding: "12px 14px",
        borderRadius: 14,
        border: "1px solid rgba(148,163,184,0.18)",
        background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
      }}
    >
      {rows.map((row) => {
        const inPct = Math.round((Number(row.cash_in || 0) / maxValue) * 100);
        const outPct = Math.round((Number(row.cash_out || 0) / maxValue) * 100);
        return (
          <div key={row.month_key}>
            <Flex justify='space-between' style={{ marginBottom: 4 }}>
              <Text style={{ fontWeight: 600 }}>{row.month_label}</Text>
              <Text type='secondary' style={{ fontSize: 12 }}>
                Saldo {currencyFormatter.format(row.running_balance || 0)}
              </Text>
            </Flex>
            <div style={{ display: "grid", gap: 4 }}>
              <div
                style={{
                  height: 8,
                  borderRadius: 999,
                  background: "#e2e8f0",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${inPct}%`,
                    height: "100%",
                    background: "#16a34a",
                  }}
                />
              </div>
              <div
                style={{
                  height: 8,
                  borderRadius: 999,
                  background: "#e2e8f0",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${outPct}%`,
                    height: "100%",
                    background: "#dc2626",
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
      <Flex gap={16} style={{ marginTop: 4 }}>
        <Text type='secondary' style={{ fontSize: 12 }}>
          <span style={{ color: "#16a34a" }}>■</span> Kas masuk
        </Text>
        <Text type='secondary' style={{ fontSize: 12 }}>
          <span style={{ color: "#dc2626" }}>■</span> Kas keluar
        </Text>
      </Flex>
    </div>
  );
};

const ReportCashflowTab = ({ rows = [] }) => {
  const columns = [
    {
      title: "Bulan",
      dataIndex: "month_label",
      key: "month_label",
      render: (value) => <span style={{ fontWeight: 600 }}>{value}</span>,
    },
    {
      title: "Kas Masuk",
      dataIndex: "cash_in",
      key: "cash_in",
      align: "right",
      render: (value) => (
        <span style={{ color: "#15803d" }}>
          {currencyFormatter.format(value || 0)}
        </span>
      ),
    },
    {
      title: "Kas Keluar",
      dataIndex: "cash_out",
      key: "cash_out",
      align: "right",
      render: (value) => (
        <span style={{ color: "#dc2626" }}>
          {currencyFormatter.format(value || 0)}
        </span>
      ),
    },
    {
      title: "Netto",
      dataIndex: "net",
      key: "net",
      align: "right",
      render: (value) => (
        <span style={{ fontWeight: 600, color: signColor(value) }}>
          {currencyFormatter.format(value || 0)}
        </span>
      ),
    },
    {
      title: "Saldo Berjalan",
      dataIndex: "running_balance",
      key: "running_balance",
      align: "right",
      render: (value) => (
        <span style={{ fontWeight: 700, color: signColor(value) }}>
          {currencyFormatter.format(value || 0)}
        </span>
      ),
    },
  ];

  const totalIn = rows.reduce((sum, row) => sum + Number(row.cash_in || 0), 0);
  const totalOut = rows.reduce(
    (sum, row) => sum + Number(row.cash_out || 0),
    0,
  );

  return (
    <>
      <Text type='secondary' style={{ display: "block", marginBottom: 12 }}>
        Arus kas dihitung untuk satu periode utuh berdasarkan tanggal kas masuk
        (pembayaran terkonfirmasi) dan kas keluar (pengeluaran harian +
        honorarium terkunci).
      </Text>

      <CashflowBars rows={rows} />

      <Table
        rowKey='month_key'
        columns={columns}
        dataSource={rows}
        pagination={false}
        scroll={{ x: 800 }}
        size='middle'
        locale={{ emptyText: "Belum ada arus kas pada periode ini." }}
        summary={() =>
          rows.length ? (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}>
                <span style={{ fontWeight: 700 }}>Total</span>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} align='right'>
                <span style={{ fontWeight: 700, color: "#15803d" }}>
                  {currencyFormatter.format(totalIn)}
                </span>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={2} align='right'>
                <span style={{ fontWeight: 700, color: "#dc2626" }}>
                  {currencyFormatter.format(totalOut)}
                </span>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={3} align='right'>
                <span
                  style={{
                    fontWeight: 700,
                    color: signColor(totalIn - totalOut),
                  }}
                >
                  {currencyFormatter.format(totalIn - totalOut)}
                </span>
              </Table.Summary.Cell>
              <Table.Summary.Cell index={4} />
            </Table.Summary.Row>
          ) : null
        }
      />
    </>
  );
};

export default ReportCashflowTab;
