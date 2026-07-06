import React, { useMemo } from "react";
import { Space, Table, Tag, Typography } from "antd";
import {
  BORDER_COLOR,
  HEADER_BG,
  getSubjectColor,
} from "./scheduleTimetableUtils";

const { Text } = Typography;

const ScheduleTeacherMapelTable = ({ loading, rows }) => {
  const columns = useMemo(
    () => [
      {
        title: "Nama Guru",
        dataIndex: "teacher_name",
        key: "teacher_name",
        width: 220,
        onHeaderCell: () => ({
          style: {
            background: HEADER_BG,
            textAlign: "center",
            fontWeight: 800,
            borderColor: BORDER_COLOR,
          },
        }),
        onCell: (_, index) => ({
          style: {
            padding: "10px 12px",
            fontWeight: 700,
            verticalAlign: "top",
            background: index % 2 === 0 ? "#fffaf4" : "#ffffff",
            borderColor: BORDER_COLOR,
          },
        }),
      },
      {
        title: "Mata Pelajaran",
        key: "subjects",
        render: (_, record) =>
          record.subject_names.length > 0 ? (
            <Space size={[4, 6]} wrap>
              {record.subject_names.map((subjectName) => {
                const color = getSubjectColor(subjectName);
                return (
                  <span
                    key={`${record.key}-${subjectName}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: color.bg,
                      color: color.text,
                      border: `1px solid ${color.border}`,
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    {subjectName}
                  </span>
                );
              })}
            </Space>
          ) : (
            "Belum ada mapel"
          ),
        onHeaderCell: () => ({
          style: {
            background: HEADER_BG,
            textAlign: "center",
            fontWeight: 800,
            borderColor: BORDER_COLOR,
          },
        }),
        onCell: (_, index) => ({
          style: {
            padding: "10px 12px",
            verticalAlign: "top",
            background: index % 2 === 0 ? "#fffaf4" : "#ffffff",
            borderColor: BORDER_COLOR,
          },
        }),
      },
      {
        title: "Status",
        key: "status",
        width: 180,
        render: (_, record) =>
          record.subject_names.length > 0 ? (
            <Tag color="green">Terdaftar di alokasi mengajar</Tag>
          ) : (
            <Text type="secondary">Belum ada mapel</Text>
          ),
        onHeaderCell: () => ({
          style: {
            background: HEADER_BG,
            textAlign: "center",
            fontWeight: 800,
            borderColor: BORDER_COLOR,
          },
        }),
        onCell: (_, index) => ({
          style: {
            padding: "10px 12px",
            verticalAlign: "top",
            background: index % 2 === 0 ? "#fffaf4" : "#ffffff",
            borderColor: BORDER_COLOR,
          },
        }),
      },
    ],
    [],
  );

  return (
    <Table
      rowKey="key"
      bordered
      size="small"
      loading={loading}
      columns={columns}
      dataSource={rows}
      pagination={false}
      scroll={{ y: 520 }}
      locale={{ emptyText: "Belum ada data guru." }}
      sticky
    />
  );
};

export default ScheduleTeacherMapelTable;
