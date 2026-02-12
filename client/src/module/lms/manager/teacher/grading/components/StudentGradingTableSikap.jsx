import React, { useMemo } from "react";
import { Card, Input, InputNumber, Space, Table, Typography } from "antd";

const { Text } = Typography;

const StudentGradingTableSikap = ({
  students,
  isMobile,
  isFilterReady,
  onAttitudeChange,
}) => {
  const formatScore = (value) => {
    const numberValue = Number(value || 0);
    return Number.isInteger(numberValue)
      ? numberValue.toString()
      : numberValue.toFixed(2);
  };

  const renderAttitudeInput = (record, index, key) => (
    <InputNumber
      min={0}
      max={100}
      step={1}
      precision={0}
      size={isMobile ? "small" : "middle"}
      style={{ width: "100%" }}
      value={record.attitude?.[key] ?? 0}
      disabled={!isFilterReady}
      onChange={(val) => onAttitudeChange(index, key, val)}
    />
  );

  const tableData = useMemo(
    () =>
      (students || []).flatMap((student, index) => [
        { ...student, rowType: "score", originalIndex: index },
        { ...student, rowType: "note", originalIndex: index },
      ]),
    [students],
  );

  const columns = [
    {
      title: "NIS",
      dataIndex: "nis",
      key: "nis",
      width: "12%",
      render: (value) => <Text>{value || "-"}</Text>,
      onCell: (record) => ({
        rowSpan: record.rowType === "score" ? 2 : 0,
      }),
      responsive: ["md"],
    },
    {
      title: "Nama Siswa",
      dataIndex: "name",
      key: "name",
      width: "22%",
      render: (value) => <Text strong>{value}</Text>,
      onCell: (record) => ({
        rowSpan: record.rowType === "score" ? 2 : 0,
      }),
      responsive: ["md"],
    },
    {
      title: "Siswa",
      key: "student",
      responsive: ["xs"],
      render: (_, record) => {
        if (record.rowType === "note") return null;
        return (
          <Space orientation="vertical" size={2}>
            <Text strong>{record.name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.nis || "-"}
            </Text>
          </Space>
        );
      },
      onCell: (record) =>
        record.rowType === "note" ? { colSpan: 0 } : { rowSpan: 2 },
    },
    {
      title: "Kinerja",
      key: "kinerja",
      width: "10%",
      render: (_, record, index) => {
        const targetIndex = record.originalIndex ?? index;
        if (record.rowType === "note") {
          return (
            <Input.TextArea
              rows={2}
              placeholder="Catatan"
              value={record.attitude?.teacher_note || ""}
              disabled={!isFilterReady}
              onChange={(e) =>
                onAttitudeChange(targetIndex, "teacher_note", e.target.value)
              }
            />
          );
        }
        return renderAttitudeInput(record, targetIndex, "kinerja");
      },
      onCell: (record) =>
        record.rowType === "note" ? { colSpan: 4 } : {},
    },
    {
      title: "Kedisiplinan",
      key: "kedisiplinan",
      width: "10%",
      render: (_, record, index) => {
        const targetIndex = record.originalIndex ?? index;
        if (record.rowType === "note") return null;
        return renderAttitudeInput(record, targetIndex, "kedisiplinan");
      },
      onCell: (record) => (record.rowType === "note" ? { colSpan: 0 } : {}),
      responsive: ["sm"],
    },
    {
      title: "Keaktifan",
      key: "keaktifan",
      width: "10%",
      render: (_, record, index) => {
        const targetIndex = record.originalIndex ?? index;
        if (record.rowType === "note") return null;
        return renderAttitudeInput(record, targetIndex, "keaktifan");
      },
      onCell: (record) => (record.rowType === "note" ? { colSpan: 0 } : {}),
      responsive: ["sm"],
    },
    {
      title: "Percaya Diri",
      key: "percaya_diri",
      width: "10%",
      render: (_, record, index) => {
        const targetIndex = record.originalIndex ?? index;
        if (record.rowType === "note") return null;
        return renderAttitudeInput(record, targetIndex, "percaya_diri");
      },
      onCell: (record) => (record.rowType === "note" ? { colSpan: 0 } : {}),
      responsive: ["sm"],
    },
    {
      title: "Rata-rata",
      dataIndex: ["summary", "sikap"],
      key: "average",
      width: "8%",
      render: (value, record) => {
        if (record.rowType === "note") return null;
        return <Text>{formatScore(value)}</Text>;
      },
      onCell: (record) => (record.rowType === "note" ? { colSpan: 0 } : {}),
      responsive: ["md"],
    },
  ];

  const renderMobileCard = (student, index) => (
    <Card
      key={student.id}
      size="small"
      style={{ borderRadius: 12, border: "1px solid #f0f0f0" }}
      styles={{ body: { padding: 12 } }}
    >
      <Space orientation="vertical" size={8} style={{ width: "100%" }}>
        <div>
          <Text strong>{student.name}</Text>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              NIS: {student.nis || "-"}
            </Text>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gap: 8,
            gridTemplateColumns: "1fr 1fr",
          }}
        >
          <div>
            <Text type="secondary">Kinerja</Text>
            {renderAttitudeInput(student, index, "kinerja")}
          </div>
          <div>
            <Text type="secondary">Kedisiplinan</Text>
            {renderAttitudeInput(student, index, "kedisiplinan")}
          </div>
          <div>
            <Text type="secondary">Keaktifan</Text>
            {renderAttitudeInput(student, index, "keaktifan")}
          </div>
          <div>
            <Text type="secondary">Percaya Diri</Text>
            {renderAttitudeInput(student, index, "percaya_diri")}
          </div>
        </div>
        <div>
          <Text type="secondary">Catatan</Text>
          <Input.TextArea
            rows={2}
            placeholder="Catatan"
            value={student.attitude?.teacher_note || ""}
            disabled={!isFilterReady}
            onChange={(e) =>
              onAttitudeChange(index, "teacher_note", e.target.value)
            }
          />
        </div>
      </Space>
    </Card>
  );

  return isMobile ? (
    <Space orientation="vertical" size={12} style={{ width: "100%" }}>
      {(students || []).map((student, index) =>
        renderMobileCard(student, index),
      )}
    </Space>
  ) : (
    <Table
      dataSource={tableData}
      columns={columns}
      rowKey={(record) =>
        record.rowType === "note" ? `${record.id}-note` : record.id
      }
      pagination={false}
      size="middle"
      tableLayout="fixed"
      locale={{ emptyText: "Belum ada siswa di kelas ini." }}
    />
  );
};

export default StudentGradingTableSikap;
