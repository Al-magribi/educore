import React from "react";
import { Card, Flex, Space, Table, Tag, Typography } from "antd";
import {
  BloomProgress,
  BloomTag,
  StudentProfileTags,
} from "./BloomPrimitives";
import { formatPercent, sectionStyle } from "./bloomUtils";

const { Text } = Typography;

const MobileStudentCards = ({ isLoading, perStudentAnalysis }) => (
  <Space direction='vertical' size={10} style={{ width: "100%" }}>
    {(perStudentAnalysis || []).map((record) => (
      <Card
        key={record.student_id}
        loading={isLoading}
        size='small'
        style={{
          borderRadius: 16,
          border: "1px solid rgba(148, 163, 184, 0.18)",
        }}
        styles={{ body: { padding: 14 } }}
      >
        <Space direction='vertical' size={10} style={{ width: "100%" }}>
          <Flex justify='space-between' align='flex-start' gap={8}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <Text
                strong
                style={{
                  display: "block",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {record.name}
              </Text>
              <Text type='secondary' style={{ fontSize: 12 }}>
                {record.nis || "-"} · {record.class_name || "-"}
              </Text>
            </div>
            <Tag
              color={record.mastery.color}
              style={{ margin: 0, borderRadius: 999 }}
            >
              {record.mastery.label}
            </Tag>
          </Flex>

          <BloomProgress
            value={record.correct_percentage}
            strokeColor='#0f766e'
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 8,
            }}
          >
            <div
              style={{
                padding: "8px 10px",
                borderRadius: 12,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                minWidth: 0,
              }}
            >
              <Text type='secondary' style={{ fontSize: 11, display: "block" }}>
                Terkuat
              </Text>
              {record.strongest_bloom ? (
                <Space size={4} wrap>
                  <BloomTag record={record.strongest_bloom} compact />
                  <Text style={{ fontSize: 12 }}>
                    {formatPercent(record.strongest_bloom.correct_percentage)}
                  </Text>
                </Space>
              ) : (
                <Text>-</Text>
              )}
            </div>
            <div
              style={{
                padding: "8px 10px",
                borderRadius: 12,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                minWidth: 0,
              }}
            >
              <Text type='secondary' style={{ fontSize: 11, display: "block" }}>
                Penguatan
              </Text>
              {record.weakest_bloom ? (
                <Space size={4} wrap>
                  <BloomTag record={record.weakest_bloom} compact />
                  <Text style={{ fontSize: 12 }}>
                    {formatPercent(record.weakest_bloom.correct_percentage)}
                  </Text>
                </Space>
              ) : (
                <Text>-</Text>
              )}
            </div>
          </div>

          <StudentProfileTags record={record} />
        </Space>
      </Card>
    ))}
  </Space>
);

const BloomStudentProfileTable = ({
  isLoading,
  isMobile,
  perStudentAnalysis,
}) => {
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
            <Text>
              {formatPercent(record.strongest_bloom.correct_percentage)}
            </Text>
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
            <Text>
              {formatPercent(record.weakest_bloom.correct_percentage)}
            </Text>
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
    <Space direction='vertical' size={8} style={{ width: "100%", minWidth: 0 }}>
      <Text strong>{isMobile ? "Profil Siswa" : "Profil Bloom Per Siswa"}</Text>
      {isMobile ? (
        <MobileStudentCards
          isLoading={isLoading}
          perStudentAnalysis={perStudentAnalysis}
        />
      ) : (
        <div style={sectionStyle}>
          <Table
            rowKey='student_id'
            columns={columns}
            dataSource={perStudentAnalysis}
            loading={isLoading}
            pagination={{ pageSize: 8, showSizeChanger: false }}
            size='middle'
            scroll={{ x: 1320 }}
          />
        </div>
      )}
    </Space>
  );
};

export default BloomStudentProfileTable;
