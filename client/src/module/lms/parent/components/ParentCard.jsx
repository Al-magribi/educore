import React from "react";
import {
  Button,
  Card,
  Divider,
  Dropdown,
  Flex,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import {
  ChevronDown,
  Copy,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";

const { Text } = Typography;

const ParentCard = ({ item, index, onEdit, onDelete }) => {
  const no = index + 1;
  const menuItems = [
    {
      key: "edit",
      icon: <Pencil size={14} />,
      label: "Edit Orang Tua",
      onClick: () => onEdit(item.id),
    },
    {
      key: "delete",
      icon: <Trash2 size={14} />,
      label: "Hapus Orang Tua",
      danger: true,
      onClick: () =>
        onDelete({
          id: item.id,
          full_name: item.full_name,
        }),
    },
  ];

  return (
    <Card bordered style={{ borderRadius: 12, height: "100%" }}>
      <Flex vertical gap={12}>
        <Flex justify="space-between" align="flex-start" gap={8}>
          <Flex vertical gap={2}>
            <Text type="secondary">#{no}</Text>
            <Text strong style={{ fontSize: 16 }}>
              {item.full_name || "-"}
            </Text>
            <Text type="secondary">@{item.username || "-"}</Text>
          </Flex>
          <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
            <Button>
              <Space size={6}>
                Pilihan Aksi
                <ChevronDown size={14} />
              </Space>
            </Button>
          </Dropdown>
        </Flex>

        <Flex wrap="wrap" gap={8}>
          <Tag color={item.is_active ? "green" : "default"}>
            {item.is_active ? "Akun Aktif" : "Akun Nonaktif"}
          </Tag>
          <Tag color="blue">{item.student_count || 0} siswa</Tag>
        </Flex>

        <Flex vertical gap={6}>
          <Text type="secondary">Kontak</Text>
          <Space size={8} wrap>
            <Text>{item.email || "-"}</Text>
            {item.email ? (
              <Button
                type="text"
                size="small"
                icon={<Copy size={14} />}
                onClick={() => {
                  navigator.clipboard.writeText(item.email);
                  message.success("Email disalin.");
                }}
              />
            ) : null}
          </Space>
          <Text>{item.phone || "-"}</Text>
        </Flex>

        <Divider style={{ margin: "4px 0" }} />

        <Flex vertical gap={8}>
          <Text type="secondary">Daftar Siswa</Text>
          {Array.isArray(item.students) && item.students.length > 0 ? (
            <Space wrap>
              {item.students.map((student) => (
                <Tag key={student.student_id}>
                  {student.nis || "-"} - {student.full_name || "-"}
                  {student.class_name ? ` (${student.class_name})` : ""}
                </Tag>
              ))}
            </Space>
          ) : (
            <Text type="secondary">Belum ada siswa terhubung.</Text>
          )}
        </Flex>
      </Flex>
    </Card>
  );
};

export default ParentCard;
