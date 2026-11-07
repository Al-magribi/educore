import React, { useMemo } from "react";
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
import { POINT_TYPE_LABELS } from "../utils/pointCatalog";

const { Paragraph, Text, Title } = Typography;

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
      {POINT_TYPE_LABELS[value] || value}
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

const RuleActions = ({ item, onEdit, onDelete }) => (
  <Space>
    <Tooltip title='Edit rule'>
      <Button
        icon={<PencilLine size={15} />}
        onClick={() => onEdit(item)}
        style={{ borderRadius: 12 }}
      />
    </Tooltip>
    <Popconfirm
      title='Hapus rule ini?'
      description='Rule yang sudah dipakai transaksi tidak dapat dihapus.'
      onConfirm={() => onDelete(item)}
      okText='Hapus'
      cancelText='Batal'
    >
      <Tooltip
        title={
          Number(item.usage_count || 0) > 0
            ? "Rule sudah dipakai dan tidak bisa dihapus."
            : "Hapus rule"
        }
      >
        <Button
          danger
          icon={<Trash2 size={15} />}
          style={{ borderRadius: 12 }}
          disabled={Number(item.usage_count || 0) > 0}
        />
      </Tooltip>
    </Popconfirm>
  </Space>
);

const groupRules = (dataSource = []) => {
  const buckets = new Map();

  dataSource.forEach((item) => {
    const type = item.point_type || "punishment";
    const categoryKey = item.category_id
      ? `${type}-${item.category_id}`
      : `${type}-none`;
    if (!buckets.has(categoryKey)) {
      buckets.set(categoryKey, {
        key: categoryKey,
        point_type: type,
        category_id: item.category_id || null,
        category_name: item.category_name || "Tanpa Kategori",
        category_sort_order: item.category_id
          ? Number(item.category_sort_order || 0)
          : 9999,
        rules: [],
      });
    }
    buckets.get(categoryKey).rules.push(item);
  });

  return Array.from(buckets.values()).sort((a, b) => {
    if (a.point_type !== b.point_type) {
      return a.point_type === "reward" ? -1 : 1;
    }
    if (a.category_sort_order !== b.category_sort_order) {
      return a.category_sort_order - b.category_sort_order;
    }
    return a.category_name.localeCompare(b.category_name);
  });
};

const PointRuleTable = ({ dataSource, loading, isMobile, onEdit, onDelete }) => {
  const grouped = useMemo(() => groupRules(dataSource), [dataSource]);

  if (!dataSource?.length && !loading) {
    return (
      <Card style={tableCardStyle} styles={{ body: { padding: 28 } }}>
        <Empty
          description='Belum ada rule poin untuk filter yang dipilih.'
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  const columns = [
    {
      title: "Jenis",
      dataIndex: "name",
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
      width: 150,
      render: (value) => <TypeTag value={value} />,
    },
    {
      title: "Bobot",
      dataIndex: "point_value",
      width: 90,
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
      width: 110,
      render: (value) => <StatusTag active={value} />,
    },
    {
      title: "Dipakai",
      dataIndex: "usage_count",
      width: 90,
      align: "center",
      render: (value) => `${Number(value || 0)}x`,
    },
    {
      title: "Aksi",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <RuleActions item={record} onEdit={onEdit} onDelete={onDelete} />
      ),
    },
  ];

  return (
    <Flex vertical gap={16}>
      {grouped.map((group, index) => (
        <motion.div
          key={group.key}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
        >
          <Card style={tableCardStyle} styles={{ body: { padding: 16 } }}>
            <Flex vertical gap={12}>
              <Flex justify='space-between' align='center' gap={10} wrap>
                <Space>
                  <Tag
                    style={{
                      margin: 0,
                      borderRadius: 999,
                      fontWeight: 700,
                    }}
                  >
                    {String.fromCharCode(65 + index)}. {group.category_name}
                  </Tag>
                  <TypeTag value={group.point_type} />
                </Space>
                <Text style={{ color: "#64748b" }}>
                  {group.rules.length} rule
                </Text>
              </Flex>

              {isMobile ? (
                <Flex vertical gap={10}>
                  {group.rules.map((item) => (
                    <Card
                      key={item.id}
                      style={{
                        borderRadius: 16,
                        border: "1px solid #e5edf6",
                        boxShadow: "none",
                      }}
                      styles={{ body: { padding: 14 } }}
                    >
                      <Flex vertical gap={10}>
                        <Flex justify='space-between' gap={10}>
                          <div>
                            <Text strong>{item.name}</Text>
                            <div style={{ marginTop: 6 }}>
                              <StatusTag active={item.is_active} />
                            </div>
                          </div>
                          <Title
                            level={4}
                            style={{
                              margin: 0,
                              color:
                                item.point_type === "reward"
                                  ? "#a16207"
                                  : "#b91c1c",
                            }}
                          >
                            {item.point_value}
                          </Title>
                        </Flex>
                        <Paragraph
                          style={{ margin: 0, color: "#64748b" }}
                          ellipsis={{ rows: 2 }}
                        >
                          {item.description || "Tidak ada deskripsi tambahan."}
                        </Paragraph>
                        <Flex justify='space-between' align='center'>
                          <Space size={8}>
                            <BadgeInfo size={15} color='#64748b' />
                            <Text style={{ color: "#64748b" }}>
                              Dipakai {item.usage_count || 0} transaksi
                            </Text>
                          </Space>
                          <RuleActions
                            item={item}
                            onEdit={onEdit}
                            onDelete={onDelete}
                          />
                        </Flex>
                      </Flex>
                    </Card>
                  ))}
                </Flex>
              ) : (
                <Table
                  rowKey='id'
                  loading={loading}
                  dataSource={group.rules}
                  columns={columns}
                  pagination={false}
                />
              )}
            </Flex>
          </Card>
        </motion.div>
      ))}
    </Flex>
  );
};

export default PointRuleTable;
