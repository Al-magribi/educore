import React from "react";
import { Card, Space, Table, Tag, Typography } from "antd";
import { BadgeCheck } from "lucide-react";
import { statusTagColor } from "./utils";

const { Title } = Typography;

const columns = [
  { title: "No", dataIndex: "no", width: 64, align: "center" },
  { title: "Tanggal", dataIndex: "date", width: 140 },
  {
    title: "Status",
    dataIndex: "status_code",
    width: 100,
    align: "center",
    render: (value) => (
      <Tag color={statusTagColor(value)} style={{ marginRight: 0 }}>
        {value || "-"}
      </Tag>
    ),
  },
  { title: "Keterangan", dataIndex: "status_name" },
];

const AttendanceSection = ({ dataSource, attendance, loading, tableSize }) => {
  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 16 } }}>
      <Space align="center" size={10} style={{ marginBottom: 12 }}>
        <BadgeCheck size={16} color="#52c41a" />
        <Title level={5} style={{ margin: 0 }}>
          Absen
        </Title>
        <Tag color="green" style={{ marginRight: 0 }}>
          Pertemuan: {attendance.total_meetings || 0}
        </Tag>
      </Space>

      <Space wrap size={[8, 8]} style={{ marginBottom: 12 }}>
        <Tag color="green">Hadir: {attendance?.summary?.hadir || 0}</Tag>
        <Tag color="blue">Sakit: {attendance?.summary?.sakit || 0}</Tag>
        <Tag color="purple">Izin: {attendance?.summary?.izin || 0}</Tag>
        <Tag color="red">Alpa: {attendance?.summary?.alpa || 0}</Tag>
      </Space>

      <Table
        rowKey="key"
        columns={columns}
        dataSource={dataSource}
        loading={loading}
        pagination={false}
        size={tableSize}
        locale={{ emptyText: "Belum ada data absensi." }}
        scroll={{ x: 680 }}
      />
    </Card>
  );
};

export default AttendanceSection;
