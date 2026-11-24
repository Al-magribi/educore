import React from "react";
import {
  Avatar,
  Button,
  Empty,
  Flex,
  Grid,
  List,
  Pagination,
  Popconfirm,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { DeleteOutlined, EditOutlined, UserOutlined } from "@ant-design/icons";
import { museColors } from "../../../../config/theme";

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
      title: "NAMA TENDIK",
      dataIndex: "full_name",
      render: (text, record) => (
        <Flex align="center" gap={12}>
          <Avatar icon={<UserOutlined />} style={{ background: museColors.primary }} />
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
      title: "KONTAK",
      render: (_, record) => (
        <Flex vertical>
          <Text>{record.phone || "-"}</Text>
          <Text type="secondary">{record.email || "-"}</Text>
        </Flex>
      ),
    },
    {
      title: "STATUS",
      dataIndex: "is_active",
      width: 120,
      render: (active) =>
        active ? <Tag color="success">Aktif</Tag> : <Tag>Nonaktif</Tag>,
    },
    {
      title: "AKSI",
      align: "right",
      width: 110,
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit">
            <Button type="text" aria-label="Edit" icon={<EditOutlined />} onClick={() => onEdit(record)} />
          </Tooltip>
          <Popconfirm
            title={`Hapus ${record.full_name}?`}
            description="Tendik yang masih punya jabatan atau slip tidak bisa dihapus."
            onConfirm={() => onDelete(record.id)}
            okText="Ya, Hapus"
            cancelText="Batal"
          >
            <Tooltip title="Hapus">
              <Button type="text" danger aria-label="Hapus" icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (isMobile) {
    return (
      <>
        <List
          dataSource={data || []}
          loading={loading}
          locale={{ emptyText: <Empty description="Data tendik belum tersedia" /> }}
          renderItem={(record) => (
            <List.Item style={{ paddingInline: 16 }}>
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
                  <Button size="small" type="text" aria-label="Edit" icon={<EditOutlined />} onClick={() => onEdit(record)} />
                  <Popconfirm
                    title={`Hapus ${record.full_name}?`}
                    onConfirm={() => onDelete(record.id)}
                    okText="Ya"
                    cancelText="Batal"
                  >
                    <Button size="small" type="text" danger aria-label="Hapus" icon={<DeleteOutlined />} />
                  </Popconfirm>
                </Space>
              </Flex>
            </List.Item>
          )}
        />
        <Flex justify="center" style={{ padding: 16 }}>
          <Pagination
            current={current}
            pageSize={pageSize}
            total={total}
            onChange={(page, size) => onPageChange({ current: page, pageSize: size })}
            showSizeChanger
            pageSizeOptions={["10", "20", "50"]}
          />
        </Flex>
      </>
    );
  }

  return (
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
          style: { paddingInline: 24 },
        }}
        onChange={(pager) =>
          onPageChange({
            current: pager.current || 1,
            pageSize: pager.pageSize || pageSize,
          })
        }
      />
  );
};

export default StaffList;
