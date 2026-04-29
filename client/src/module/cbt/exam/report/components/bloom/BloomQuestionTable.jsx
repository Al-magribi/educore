import React from "react";
import { Space, Table, Tag, Tooltip, Typography } from "antd";
import { BloomProgress, BloomTag } from "./BloomPrimitives";
import {
  normalizeQuestionText,
  sectionStyle,
  statusMetaMap,
} from "./bloomUtils";

const { Text } = Typography;

const BloomQuestionTable = ({
  effectiveStudentFilter,
  hasGranularData,
  isLoading,
  isMobile,
  perQuestion,
}) => {
  const columns = [
    {
      title: "No",
      key: "no",
      width: 60,
      align: "center",
      render: (_, record, index) => record.no || index + 1,
    },
    {
      title: "Soal",
      dataIndex: "question",
      key: "question",
      width: 360,
      render: (value) => {
        const text = normalizeQuestionText(value);
        const shortText = text.length > 160 ? `${text.slice(0, 160)}...` : text;

        return (
          <Tooltip title={text}>
            <Text>{shortText || "-"}</Text>
          </Tooltip>
        );
      },
    },
    {
      title: "Level",
      dataIndex: "bloom_label",
      key: "bloom_label",
      width: 190,
      render: (_, record) => <BloomTag record={record} />,
    },
    ...(effectiveStudentFilter !== "all" && hasGranularData
      ? [
          {
            title: "Status Siswa",
            dataIndex: "student_status",
            key: "student_status",
            width: 140,
            align: "center",
            render: (value) => {
              const meta = statusMetaMap[value] || statusMetaMap.unanswered;
              return (
                <Tag color={meta.color} style={{ margin: 0, borderRadius: 999 }}>
                  {meta.label}
                </Tag>
              );
            },
          },
        ]
      : [
          {
            title: "Benar",
            dataIndex: "correct_count",
            key: "correct_count",
            width: 90,
            align: "center",
            render: (value) => <Text style={{ color: "#15803d" }}>{value}</Text>,
          },
          {
            title: "Salah",
            dataIndex: "incorrect_count",
            key: "incorrect_count",
            width: 90,
            align: "center",
            render: (value) => <Text style={{ color: "#dc2626" }}>{value}</Text>,
          },
          {
            title: "Kosong",
            dataIndex: "unanswered_count",
            key: "unanswered_count",
            width: 90,
            align: "center",
          },
          {
            title: "Pending",
            dataIndex: "pending_review_count",
            key: "pending_review_count",
            width: 90,
            align: "center",
          },
        ]),
    {
      title: "Akurasi",
      dataIndex: "correct_percentage",
      key: "correct_percentage",
      width: 160,
      render: (value) => <BloomProgress value={value} strokeColor='#0f766e' />,
    },
  ];

  return (
    <Space direction='vertical' size={8} style={{ width: "100%" }}>
      <Text strong>
        Level Bloom Per Soal
        {effectiveStudentFilter !== "all" ? " Untuk Siswa Terpilih" : ""}
      </Text>
      <div style={sectionStyle}>
        <Table
          rowKey='id'
          columns={columns}
          dataSource={perQuestion}
          loading={isLoading}
          pagination={{ pageSize: 8, showSizeChanger: false }}
          size={isMobile ? "small" : "middle"}
          scroll={isMobile ? { x: 1180 } : undefined}
        />
      </div>
    </Space>
  );
};

export default BloomQuestionTable;
