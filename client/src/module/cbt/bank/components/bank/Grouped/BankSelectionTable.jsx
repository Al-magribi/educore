import React, { useMemo } from "react";
import { Empty, Space, Table, Tag, Typography } from "antd";

const { Text, Title } = Typography;

const BankSelectionTable = ({
  banks,
  isFetching,
  selectedBanksCount,
  selectedRowKeys,
  onSelectionChange,
}) => {
  const columns = useMemo(
    () => [
      {
        title: "Bank Soal",
        dataIndex: "title",
        key: "title",
        render: (_, record) => (
          <Space vertical size={0}>
            <Space size={8}>
              <Text strong>{record.title}</Text>
              <Tag>{record.type || "UMUM"}</Tag>
            </Space>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.subject_name || "Mapel Umum"}
            </Text>
          </Space>
        ),
      },
      {
        title: "Tersedia",
        dataIndex: "total_questions",
        key: "total_questions",
        width: 110,
        render: (value) => <Text>{value} soal</Text>,
      },
      {
        title: "Total Poin",
        dataIndex: "total_points",
        key: "total_points",
        width: 120,
        render: (value) => <Text>{value} pts</Text>,
      },
    ],
    [],
  );

  return (
    <div>
      <Space
        align="center"
        style={{ marginBottom: 12, justifyContent: "space-between" }}
      >
        <Title level={5} style={{ margin: 0 }}>
          Pilih Bank Soal
        </Title>
        <Text type="secondary">Dipilih: {selectedBanksCount} bank</Text>
      </Space>

      <Table
        rowKey="id"
        dataSource={banks}
        columns={columns}
        loading={isFetching}
        pagination={false}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => {
            onSelectionChange(keys);
          },
          getCheckboxProps: (record) => ({
            disabled: (record.total_questions || 0) < 1,
          }),
        }}
        locale={{
          emptyText: (
            <Empty description="Belum ada bank soal tersedia untuk digabung" />
          ),
        }}
      />
    </div>
  );
};

export default BankSelectionTable;
