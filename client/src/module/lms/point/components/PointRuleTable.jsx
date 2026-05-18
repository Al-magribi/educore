import React from "react";
import {
  Button,
  Card,
  Empty,
  Flex,
  Popconfirm,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import {
  BadgeInfo,
  PencilLine,
  ShieldAlert,
  Trash2,
  Trophy,
} from "lucide-react";

const { Paragraph, Text } = Typography;

const tableCardStyle = {
  borderRadius: 24,
  border: "1px solid #e5edf6",
  background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
  boxShadow: "0 18px 36px rgba(15, 23, 42, 0.06)",
};

const TypeTag = ({ value }) => {
  const isReward = value === "reward";
  const Icon = isReward ? Trophy : ShieldAlert;

  return (
    <Tag
      style={{
        margin: 0,
        borderRadius: 999,
        paddingInline: 10,
        borderColor: isReward ? "#fcd34d" : "#fecaca",
        background: isReward ? "#fffbeb" : "#fef2f2",
        color: isReward ? "#a16207" : "#b91c1c",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <Icon size={13} />
      {isReward ? "Reward" : "Punishment"}
    </Tag>
  );
};

const StatusTag = ({ active }) => (
  <Tag
    style={{
      margin: 0,
      borderRadius: 999,
      paddingInline: 10,
      borderColor: active ? "#bfdbfe" : "#e5e7eb",
      background: active ? "#eff6ff" : "#f8fafc",
      color: active ? "#1d4ed8" : "#64748b",
    }}
  >
    {active ? "Aktif" : "Nonaktif"}
  </Tag>
);

const RuleCard = ({ item, onEdit, onDelete }) => (
  <Card
    key={item.id}
    style={{
      borderRadius: 20,
      border: "1px solid #e5edf6",
      boxShadow: "0 12px 30px rgba(15, 23, 42, 0.05)",
    }}
    styles={{ body: { padding: 18 } }}
  >
    <Flex vertical gap={12}>
      <Flex justify='space-between' align='start' gap={12}>
        <div>
          <Text strong style={{ color: "#0f172a", fontSize: 15 }}>
            {item.name}
          </Text>
          <div style={{ marginTop: 6 }}>
            <Space wrap size={[8, 8]}>
              <TypeTag value={item.point_type} />
              <StatusTag active={item.is_active} />
            </Space>
          </div>
        </div>
        <Text
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: item.point_type === "reward" ? "#a16207" : "#b91c1c",
          }}
        >
          {item.point_value}
        </Text>
      </Flex>

      <Paragraph style={{ margin: 0, color: "#64748b" }} ellipsis={{ rows: 2 }}>
        {item.description || "Tidak ada deskripsi tambahan."}
      </Paragraph>

      <Flex justify='space-between' align='center' gap={12}>
        <Space size={8}>
          <BadgeInfo size={15} color='#64748b' />
          <Text style={{ color: "#64748b" }}>
            Dipakai {item.usage_count || 0} transaksi
          </Text>
        </Space>

        <Space>
          <Button
            icon={<PencilLine size={15} />}
            onClick={() => onEdit(item)}
            style={{ borderRadius: 12 }}
          >
            Edit
          </Button>
          <Popconfirm
            title='Hapus rule ini?'
            description='Rule yang sudah dipakai transaksi tidak dapat dihapus.'
            onConfirm={() => onDelete(item)}
            okText='Hapus'
            cancelText='Batal'
          >
            <Button
              danger
              icon={<Trash2 size={15} />}
              style={{ borderRadius: 12 }}
              disabled={Number(item.usage_count || 0) > 0}
            >
              Hapus
            </Button>
          </Popconfirm>
        </Space>
      </Flex>
    </Flex>
  </Card>
);

const PointRuleTable = ({
  dataSource,
  loading,
  isMobile,
  onEdit,
  onDelete,
}) => {
  if (isMobile) {
    return (
      <Card style={tableCardStyle} styles={{ body: { padding: 16 } }}>
        <Flex vertical gap={14}>
          {dataSource?.length ? (
            dataSource.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
              >
                <RuleCard item={item} onEdit={onEdit} onDelete={onDelete} />
              </motion.div>
            ))
          ) : (
            <Empty
              description='Belum ada rule poin untuk filter yang dipilih.'
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </Flex>
      </Card>
    );
  }

  const columns = [
    {
      title: "Rule",
      dataIndex: "name",
      key: "name",
      render: (_, record) => (
        <Flex vertical gap={4}>
          <Text strong style={{ color: "#0f172a" }}>
            {record.name}
          </Text>
          <Text style={{ color: "#64748b" }}>
            {record.description || "Tidak ada deskripsi tambahan."}
          </Text>
        </Flex>
      ),
    },
    {
      title: "Tipe",
      dataIndex: "point_type",
      key: "point_type",
      width: 140,
      render: (value) => <TypeTag value={value} />,
    },
    {
      title: "Poin",
      dataIndex: "point_value",
      key: "point_value",
      width: 110,
      align: "center",
      render: (value, record) => (
        <Text
          strong
          style={{
            color: record.point_type === "reward" ? "#a16207" : "#b91c1c",
            fontSize: 16,
          }}
        >
          {value}
        </Text>
      ),
    },
    {
      title: "Status",
      dataIndex: "is_active",
      key: "is_active",
      width: 120,
      render: (value) => <StatusTag active={value} />,
    },
    {
      title: "Dipakai",
      dataIndex: "usage_count",
      key: "usage_count",
      width: 110,
      align: "center",
      render: (value) => `${Number(value || 0)}x`,
    },
    {
      title: "Aksi",
      key: "actions",
      width: 150,
      render: (_, record) => (
        <Space size={8}>
          <Tooltip title='Edit rule'>
            <Button
              icon={<PencilLine size={15} />}
              onClick={() => onEdit(record)}
              style={{ borderRadius: 12 }}
            />
          </Tooltip>
          <Popconfirm
            title='Hapus rule ini?'
            description='Rule yang sudah dipakai transaksi tidak dapat dihapus.'
            onConfirm={() => onDelete(record)}
            okText='Hapus'
            cancelText='Batal'
          >
            <Tooltip
              title={
                Number(record.usage_count || 0) > 0
                  ? "Rule sudah dipakai dan tidak bisa dihapus."
                  : "Hapus rule"
              }
            >
              <Button
                danger
                icon={<Trash2 size={15} />}
                style={{ borderRadius: 12 }}
                disabled={Number(record.usage_count || 0) > 0}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card style={tableCardStyle} styles={{ body: { padding: 12 } }}>
      <Table
        rowKey='id'
        loading={loading}
        dataSource={dataSource}
        columns={columns}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        locale={{
          emptyText: (
            <Empty
              description='Belum ada rule poin untuk filter yang dipilih.'
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ),
        }}
      />
    </Card>
  );
};

export default PointRuleTable;
