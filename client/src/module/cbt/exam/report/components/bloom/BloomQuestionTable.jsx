import React from "react";
import { Card, Flex, Space, Table, Tag, Tooltip, Typography } from "antd";
import { BloomProgress, BloomTag } from "./BloomPrimitives";
import {
  normalizeQuestionText,
  sectionStyle,
  statusMetaMap,
} from "./bloomUtils";

const { Text } = Typography;

const MobileQuestionCards = ({
  effectiveStudentFilter,
  hasGranularData,
  isLoading,
  perQuestion,
}) => (
  <Space direction='vertical' size={10} style={{ width: "100%" }}>
    {(perQuestion || []).map((record, index) => {
      const statusMeta =
        statusMetaMap[record.student_status] || statusMetaMap.unanswered;
      const showStudentStatus =
        effectiveStudentFilter !== "all" && hasGranularData;

      return (
        <Card
          key={record.id}
          loading={isLoading}
          size='small'
          style={{
            borderRadius: 16,
            border: "1px solid rgba(148, 163, 184, 0.18)",
          }}
          styles={{ body: { padding: 14 } }}
        >
          <Space direction='vertical' size={10} style={{ width: "100%" }}>
            <Flex justify='space-between' align='flex-start' gap={8} wrap='wrap'>
              <Text strong>Soal {record.no || index + 1}</Text>
              <BloomTag record={record} compact />
            </Flex>

            <Tooltip title={normalizeQuestionText(record.question)}>
              <Text
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  fontSize: 13,
                }}
              >
                {normalizeQuestionText(record.question) || "-"}
              </Text>
            </Tooltip>

            {showStudentStatus ? (
              <Tag color={statusMeta.color} style={{ margin: 0, borderRadius: 999 }}>
                {statusMeta.label}
              </Tag>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 8,
                }}
              >
                {[
                  { label: "Benar", value: record.correct_count, color: "#15803d" },
                  { label: "Salah", value: record.incorrect_count, color: "#dc2626" },
                  { label: "Kosong", value: record.unanswered_count },
                  { label: "Pending", value: record.pending_review_count },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 12,
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <Text
                      type='secondary'
                      style={{ fontSize: 11, display: "block" }}
                    >
                      {item.label}
                    </Text>
                    <Text strong style={{ color: item.color }}>
                      {item.value}
                    </Text>
                  </div>
                ))}
              </div>
            )}

            <BloomProgress
              value={record.correct_percentage}
              strokeColor='#0f766e'
            />
          </Space>
        </Card>
      );
    })}
  </Space>
);

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
            render: (value) => (
              <Text style={{ color: "#15803d" }}>{value}</Text>
            ),
          },
          {
            title: "Salah",
            dataIndex: "incorrect_count",
            key: "incorrect_count",
            width: 90,
            align: "center",
            render: (value) => (
              <Text style={{ color: "#dc2626" }}>{value}</Text>
            ),
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
    <Space direction='vertical' size={8} style={{ width: "100%", minWidth: 0 }}>
      <Text strong>
        {isMobile ? "Bloom Per Soal" : "Level Bloom Per Soal"}
        {effectiveStudentFilter !== "all" ? " (Siswa Terpilih)" : ""}
      </Text>
      {isMobile ? (
        <MobileQuestionCards
          effectiveStudentFilter={effectiveStudentFilter}
          hasGranularData={hasGranularData}
          isLoading={isLoading}
          perQuestion={perQuestion}
        />
      ) : (
        <div style={sectionStyle}>
          <Table
            rowKey='id'
            columns={columns}
            dataSource={perQuestion}
            loading={isLoading}
            pagination={{ pageSize: 8, showSizeChanger: false }}
            size='middle'
            scroll={{ x: 1180 }}
          />
        </div>
      )}
    </Space>
  );
};

export default BloomQuestionTable;
