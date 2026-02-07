import React, { useMemo } from "react";
import { Empty, InputNumber, Space, Table, Tag, Typography } from "antd";

const { Text, Title } = Typography;

const getQuestionTypeName = (type) => {
  const types = {
    1: "PG Tunggal",
    2: "PG Multi",
    3: "Essay Uraian",
    4: "Essay Singkat",
    5: "Benar / Salah",
    6: "Mencocokkan",
  };
  return types[type] || "Unknown";
};

const QuestionSelectionTable = ({
  questions,
  loading,
  selectedQuestionIds,
  totalPoints,
  questionPointMap,
  onQuestionSelectionChange,
  onPointChange,
  showCoverageWarning,
}) => {
  const columns = useMemo(
    () => [
      {
        title: "Soal",
        dataIndex: "content",
        key: "content",
        render: (_, record) => (
          <Space vertical size={2}>
            <Space size={6}>
              <Tag color="blue" style={{ margin: 0 }}>
                {record.bank_title}
              </Tag>
              <Tag style={{ margin: 0 }}>
                {getQuestionTypeName(record.q_type)}
              </Tag>
            </Space>
            <Text>
              {record.content
                ?.replace(/<[^>]*>/g, "")
                ?.replace(/&nbsp;/g, " ")
                .substring(0, 120)}
            </Text>
          </Space>
        ),
      },
      {
        title: "Poin",
        dataIndex: "score_point",
        key: "score_point",
        width: 120,
        render: (_, record) => (
          <InputNumber
            min={1}
            value={questionPointMap[record.id]}
            onChange={(value) =>
              onPointChange((prev) => ({ ...prev, [record.id]: value }))
            }
            disabled={!selectedQuestionIds.includes(record.id)}
            style={{ width: "100%" }}
          />
        ),
      },
    ],
    [onPointChange, questionPointMap, selectedQuestionIds],
  );

  return (
    <div>
      <Space
        align="center"
        style={{ marginBottom: 12, justifyContent: "space-between" }}
      >
        <Title level={5} style={{ margin: 0 }}>
          Pilih Soal Gabungan
        </Title>
        <Text type="secondary">
          Terpilih: {selectedQuestionIds.length} soal | Total poin: {totalPoints}
        </Text>
      </Space>
      <Table
        rowKey="id"
        dataSource={questions}
        columns={columns}
        loading={loading}
        pagination={false}
        rowSelection={{
          selectedRowKeys: selectedQuestionIds,
          onChange: (keys) => onQuestionSelectionChange(keys),
        }}
        locale={{
          emptyText: <Empty description="Pilih bank soal terlebih dahulu" />,
        }}
      />
      {showCoverageWarning && (
        <Text type="danger" style={{ display: "block", marginTop: 8 }}>
          Setiap bank soal yang dipilih harus memiliki minimal 1 soal terpilih.
        </Text>
      )}
    </div>
  );
};

export default QuestionSelectionTable;
