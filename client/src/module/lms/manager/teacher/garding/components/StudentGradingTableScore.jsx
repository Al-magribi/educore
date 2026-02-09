import React from "react";
import { Card, InputNumber, Space, Table, Typography } from "antd";

const { Text } = Typography;

const StudentGradingTableScore = ({
  students,
  isMobile,
  isFilterReady,
  onStudentChange,
  typeKey,
}) => {
  const columns = [
    {
      title: "NIS",
      dataIndex: "nis",
      key: "nis",
      width: "20%",
      render: (value) => <Text>{value || "-"}</Text>,
      responsive: ["md"],
    },
    {
      title: "Nama Siswa",
      dataIndex: "name",
      key: "name",
      width: "50%",
      render: (value) => <Text strong>{value}</Text>,
      responsive: ["md"],
    },
    {
      title: "Siswa",
      key: "student",
      responsive: ["xs"],
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <Text strong>{record.name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.nis || "-"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Nilai",
      dataIndex: ["summary", typeKey],
      key: "score",
      width: "30%",
      render: (_, record, index) => (
        <InputNumber
          min={0}
          max={100}
          size={isMobile ? "small" : "middle"}
          style={{ width: "100%" }}
          value={record.summary?.[typeKey] ?? 0}
          disabled={!isFilterReady}
          onChange={(val) => onStudentChange(index, typeKey, val)}
        />
      ),
    },
  ];

  const renderMobileCard = (student, index) => (
    <Card
      key={student.id}
      size="small"
      style={{ borderRadius: 12, border: "1px solid #f0f0f0" }}
      styles={{ body: { padding: 12 } }}
    >
      <Space direction="vertical" size={8} style={{ width: "100%" }}>
        <div>
          <Text strong>{student.name}</Text>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              NIS: {student.nis || "-"}
            </Text>
          </div>
        </div>
        <div>
          <Text type="secondary">Nilai</Text>
          <InputNumber
            min={0}
            max={100}
            size="small"
            style={{ width: "100%" }}
            value={student.summary?.[typeKey] ?? 0}
            disabled={!isFilterReady}
            onChange={(val) => onStudentChange(index, typeKey, val)}
          />
        </div>
      </Space>
    </Card>
  );

  return isMobile ? (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      {(students || []).map((student, index) =>
        renderMobileCard(student, index),
      )}
    </Space>
  ) : (
    <Table
      dataSource={students}
      columns={columns}
      rowKey={(record) => record.id}
      pagination={false}
      size="middle"
      tableLayout="fixed"
      locale={{ emptyText: "Belum ada siswa di kelas ini." }}
    />
  );
};

export default StudentGradingTableScore;
