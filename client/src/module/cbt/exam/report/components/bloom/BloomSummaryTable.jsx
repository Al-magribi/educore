import React from "react";
import { Space, Table, Tag, Typography } from "antd";
import { BloomProgress, BloomTag } from "./BloomPrimitives";
import {
  getMasteryMeta,
  getTeachingFocus,
  sectionStyle,
} from "./bloomUtils";

const { Text } = Typography;

const BloomSummaryTable = ({ bloomSummary, isLoading, isMobile }) => {
  const columns = [
    {
      title: "Bloom Level",
      dataIndex: "bloom_label",
      key: "bloom_label",
      width: 220,
      render: (_, record) => <BloomTag record={record} />,
    },
    {
      title: "Jumlah Soal",
      dataIndex: "total_questions",
      key: "total_questions",
      width: 120,
      align: "center",
    },
    {
      title: "Benar",
      dataIndex: "correct_count",
      key: "correct_count",
      width: 100,
      align: "center",
      render: (value) => <Text style={{ color: "#15803d" }}>{value}</Text>,
    },
    {
      title: "Salah",
      dataIndex: "incorrect_count",
      key: "incorrect_count",
      width: 100,
      align: "center",
      render: (value) => <Text style={{ color: "#dc2626" }}>{value}</Text>,
    },
    {
      title: "Kosong",
      dataIndex: "unanswered_count",
      key: "unanswered_count",
      width: 100,
      align: "center",
    },
    {
      title: "Pending",
      dataIndex: "pending_review_count",
      key: "pending_review_count",
      width: 100,
      align: "center",
    },
    {
      title: "Akurasi",
      dataIndex: "correct_percentage",
      key: "correct_percentage",
      width: 180,
      render: (value) => <BloomProgress value={value} strokeColor='#2563eb' />,
    },
    {
      title: "Interpretasi",
      key: "interpretation",
      width: 170,
      render: (_, record) => {
        const meta = getMasteryMeta(record.correct_percentage);
        return (
          <Tag color={meta.color} style={{ margin: 0, borderRadius: 999 }}>
            {meta.label}
          </Tag>
        );
      },
    },
    {
      title: "Arah Tindak Lanjut",
      key: "follow_up",
      width: 210,
      render: (_, record) => (
        <Text style={{ color: "#475569" }}>
          {getTeachingFocus(record.correct_percentage)}
        </Text>
      ),
    },
  ];

  return (
    <Space direction='vertical' size={8} style={{ width: "100%" }}>
      <Text strong>Ringkasan Level Bloom</Text>
      <div style={sectionStyle}>
        <Table
          rowKey={(record) => `${record.bloom_level ?? "none"}-${record.bloom_label}`}
          columns={columns}
          dataSource={bloomSummary}
          loading={isLoading}
          pagination={false}
          size={isMobile ? "small" : "middle"}
          scroll={isMobile ? { x: 1380 } : undefined}
        />
      </div>
    </Space>
  );
};

export default BloomSummaryTable;
