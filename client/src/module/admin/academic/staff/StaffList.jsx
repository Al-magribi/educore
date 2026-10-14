import React from "react";
import {
  Avatar,
  Button,
  Card,
  Empty,
  Flex,
  List,
  Pagination,
  Popconfirm,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  Grid,
} from "antd";
import { DeleteOutlined, EditOutlined, UserOutlined } from "@ant-design/icons";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const StaffList = ({ data, loading, onEdit, onDelete, onPageChange, pagination }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const current = pagination?.current || 1;
  const pageSize = pagination?.pageSize || 10;
  const total = pagination?.total || 0;

  const columns = [
    {
      title: "Nama Tendik",
      dataIndex: "full_name",
      render: (text, record) => (
        <Flex align="center" gap={12}>
          <Avatar icon={<UserOutlined />} />
          <Flex vertical>
            <Text strong>{text}</Text>
            <Text type="secondary">
              NIP: {record.nip || "-"} | RFID: {record.rfid_no || "-"}
            </Text>
          </Flex>
        </Flex>
      ),
    },
    {
      title: "Kontak",
      render: (_, record) => (
        <Flex vertical>
          <Text>{record.phone || "-"}</Text>
          <Text type="secondary">{record.email || "-"}</Text>
        </Flex>
      ),
    },
    {
      title: "Status",
      dataIndex: "is_active",
      width: 120,
      render: (active) =>
        active ? <Tag color="success">Aktif</Tag> : <Tag>Nonaktif</Tag>,
    },
    {
      title: "Aksi",
      align: "right",
      width: 110,
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit">
            <Button type="text" icon={<EditOutlined />} onClick={() => onEdit(record)} />
          </Tooltip>
          <Popconfirm
            title="Hapus tendik?"
            description="Tendik yang masih punya jabatan atau slip tidak bisa dihapus."
            onConfirm={() => onDelete(record.id)}
            okText="Ya, Hapus"
            cancelText="Batal"
          >
            <Tooltip title="Hapus">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (isMobile) {
    return (
      <Card style={{ borderRadius: 22 }}>
        <List
          dataSource={data || []}
          loading={loading}
          locale={{ emptyText: <Empty description="Data tendik belum tersedia" /> }}
          renderItem={(record) => (
            <List.Item style={{ paddingInline: 0 }}>
              <Flex justify="space-between" align="start" style={{ width: "100%" }} gap={8}>
                <Flex vertical>
                  <Text strong>{record.full_name}</Text>
                  <Text type="secondary">
                    NIP: {record.nip || "-"} | RFID: {record.rfid_no || "-"}
                  </Text>
                  <Text>{record.phone || "-"}</Text>
                  {record.is_active ? <Tag color="success">Aktif</Tag> : <Tag>Nonaktif</Tag>}
                </Flex>
                <Space>
                  <Button size="small" type="text" icon={<EditOutlined />} onClick={() => onEdit(record)} />
                  <Popconfirm
                    title="Hapus tendik?"
                    onConfirm={() => onDelete(record.id)}
                    okText="Ya"
                    cancelText="Batal"
                  >
                    <Button size="small" type="text" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              </Flex>
            </List.Item>
          )}
        />
        <Flex justify="center">
          <Pagination
            current={current}
            pageSize={pageSize}
            total={total}
            onChange={(page, size) => onPageChange({ current: page, pageSize: size })}
            showSizeChanger
            pageSizeOptions={["10", "20", "50"]}
          />
        </Flex>
      </Card>
    );
  }

  return (
    <Card style={{ borderRadius: 22 }} styles={{ body: { padding: 16 } }}>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          pageSizeOptions: ["10", "20", "50"],
          showTotal: (items, range) => `${range[0]}-${range[1]} dari ${items} tendik`,
        }}
        onChange={(pager) =>
          onPageChange({
            current: pager.current || 1,
            pageSize: pager.pageSize || pageSize,
          })
        }
      />
    </Card>
  );
};

export default StaffList;
