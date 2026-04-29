import React from "react";
import { Space, Table, Tag, Typography } from "antd";
import {
  BloomProgress,
  BloomTag,
  StudentProfileTags,
} from "./BloomPrimitives";
import {
  formatPercent,
  sectionStyle,
} from "./bloomUtils";

const { Text } = Typography;

const BloomStudentProfileTable = ({ isLoading, isMobile, perStudentAnalysis }) => {
  const columns = [
    {
      title: "Siswa",
      dataIndex: "name",
      key: "name",
      width: 260,
      render: (value, record) => (
        <Space direction='vertical' size={0}>
          <Text strong>{value}</Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            {record.nis || "-"} - {record.class_name || "-"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Akurasi",
      dataIndex: "correct_percentage",
      key: "correct_percentage",
      width: 180,
      render: (value) => <BloomProgress value={value} strokeColor='#0f766e' />,
    },
    {
      title: "Status",
      key: "mastery",
      width: 170,
      render: (_, record) => (
        <Tag color={record.mastery.color} style={{ margin: 0, borderRadius: 999 }}>
          {record.mastery.label}
        </Tag>
      ),
    },
    {
      title: "Terkuat",
      key: "strongest_bloom",
      width: 160,
      render: (_, record) =>
        record.strongest_bloom ? (
          <Space size={6}>
            <BloomTag record={record.strongest_bloom} compact />
            <Text>{formatPercent(record.strongest_bloom.correct_percentage)}</Text>
          </Space>
        ) : (
          "-"
        ),
    },
    {
      title: "Butuh Penguatan",
      key: "weakest_bloom",
      width: 190,
      render: (_, record) =>
        record.weakest_bloom ? (
          <Space size={6}>
            <BloomTag record={record.weakest_bloom} compact />
            <Text>{formatPercent(record.weakest_bloom.correct_percentage)}</Text>
          </Space>
        ) : (
          "-"
        ),
    },
    {
      title: "Profil Level",
      key: "profile",
      width: 360,
      render: (_, record) => <StudentProfileTags record={record} />,
    },
  ];

  return (
    <Space direction='vertical' size={8} style={{ width: "100%" }}>
      <Text strong>Profil Bloom Per Siswa</Text>
      <div style={sectionStyle}>
        <Table
          rowKey='student_id'
          columns={columns}
          dataSource={perStudentAnalysis}
          loading={isLoading}
          pagination={{ pageSize: 8, showSizeChanger: false }}
          size={isMobile ? "small" : "middle"}
          scroll={isMobile ? { x: 1320 } : undefined}
        />
      </div>
    </Space>
  );
};

export default BloomStudentProfileTable;
