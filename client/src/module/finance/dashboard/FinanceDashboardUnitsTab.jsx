import { Alert, Card, Space, Table, Tag, Typography } from "antd";

import { cardBaseStyle, currency } from "./constants";

const { Text } = Typography;

const FinanceDashboardUnitsTab = ({ meta, homebases }) => {
  const columns = [
    {
      title: "Satuan",
      dataIndex: "homebase_name",
      key: "homebase_name",
      render: (value, record) => (
        <div>
          <Text strong>{value}</Text>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
            {record.total_students || 0} siswa • {record.total_classes || 0} kelas
          </div>
        </div>
      ),
    },
    {
      title: "Periode Aktif",
      dataIndex: "periode_name",
      key: "periode_name",
      render: (value) => <Tag color='blue'>{value || "-"}</Tag>,
    },
    {
      title: "Target SPP",
      dataIndex: "expected_spp_current_month",
      key: "expected_spp_current_month",
      align: "right",
      render: (value) => currency(value),
    },
    {
      title: "Terkumpul",
      dataIndex: "school_revenue",
      key: "school_revenue",
      align: "right",
      render: (value) => currency(value),
    },
    {
      title: "Dana Terkelola",
      dataIndex: "managed_funds",
      key: "managed_funds",
      align: "right",
      render: (value) => currency(value),
    },
    {
      title: "Outstanding",
      dataIndex: "outstanding_spp_current_month",
      key: "outstanding_spp_current_month",
      align: "right",
      render: (value, record) => currency(Number(value || 0) + Number(record.other_remaining || 0)),
    },
    {
      title: "Rate",
      dataIndex: "collection_rate_current_month",
      key: "collection_rate_current_month",
      width: 96,
      align: "center",
      render: (value) => <Tag color={value >= 80 ? "green" : "orange"}>{value || 0}%</Tag>,
    },
  ];

  return (
    <Space vertical size={16} style={{ width: "100%" }}>
      <Alert
        type='info'
        showIcon
        message='Data per satuan'
        description={`Dashboard menghitung ${homebases.length || 0} satuan berdasarkan periode yang aktif pada masing-masing satuan.`}
      />

      <Card variant='borderless' style={cardBaseStyle}>
        <Table
          rowKey='key'
          dataSource={homebases}
          columns={columns}
          pagination={false}
          scroll={{ x: 980 }}
        />
      </Card>

      {meta?.scope_type !== "all_units" && homebases[0] ? (
        <Text type='secondary'>
          Tampilan ini tetap memakai struktur per satuan agar konsisten saat nanti
          akses diperluas ke banyak satuan.
        </Text>
      ) : null}
    </Space>
  );
};

export default FinanceDashboardUnitsTab;
