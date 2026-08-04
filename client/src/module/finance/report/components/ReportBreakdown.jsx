import { Card, Progress, Table, Tabs, Tag } from "antd";

import { cardStyle, currencyFormatter } from "../constants";

const percentColor = (value) => {
  if (value >= 90) return "#16a34a";
  if (value >= 75) return "#2563eb";
  if (value >= 50) return "#d97706";
  return "#dc2626";
};

const ReportBreakdown = ({ sppByClass = [], otherByType = [] }) => {
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

  return (
    <Card style={cardStyle} styles={{ body: { paddingTop: 8 } }}>
      <Tabs
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
        ]}
      />
    </Card>
  );
};

export default ReportBreakdown;
