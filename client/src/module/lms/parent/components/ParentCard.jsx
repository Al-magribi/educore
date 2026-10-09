import React from "react";
import {
  Button,
  Card,
  Checkbox,
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
  Mail,
  Pencil,
  Phone,
  Trash2,
} from "lucide-react";

const { Text } = Typography;

const ParentCard = ({ item, index, onEdit, onDelete, isSelected, onSelectChange }) => {
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
    <Card
      bordered
      hoverable
      style={{
        borderRadius: 12,
        height: "100%",
      }}
      styles={{ body: { padding: 14 } }}
    >
      <Flex vertical gap={12}>
        <Flex justify="space-between" align="center" gap={8}>
          <Space size={8} align="center">
            <Checkbox
              checked={!!isSelected}
              onChange={(event) => onSelectChange?.(item.id, event.target.checked)}
            />
            <Text type="secondary">#{no}</Text>
          </Space>
          <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
            <Button size="small">
              <Space size={6}>
                Aksi
                <ChevronDown size={14} />
              </Space>
            </Button>
          </Dropdown>
        </Flex>

        <Flex vertical gap={2}>
          <Text strong style={{ fontSize: 20, lineHeight: 1.2 }} ellipsis={{ tooltip: item.full_name }}>
            {item.full_name || "-"}
          </Text>
          <Text type="secondary">@{item.username || "-"}</Text>
        </Flex>

        <Flex wrap="wrap" gap={8}>
          <Tag color={item.is_active ? "green" : "default"}>
            {item.is_active ? "Akun Aktif" : "Akun Nonaktif"}
          </Tag>
          <Tag color="blue">{item.student_count || 0} siswa</Tag>
        </Flex>

        <Flex vertical gap={8}>
          <Text type="secondary">Kontak</Text>

          <Space size={8} wrap>
            <Mail size={14} />
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

          <Space size={8} wrap>
            <Phone size={14} />
            <Text>{item.phone || "-"}</Text>
          </Space>
        </Flex>

        <Divider style={{ margin: "2px 0" }} />

        <Flex vertical gap={8}>
          <Text type="secondary">Daftar Siswa</Text>
          {Array.isArray(item.students) && item.students.length > 0 ? (
            <Flex wrap="wrap" gap={6}>
              {item.students.map((student) => (
                <Tag key={student.student_id}>
                  {student.nis || "-"} - {student.full_name || "-"}
                  {student.class_name ? ` (${student.class_name})` : ""}
                </Tag>
              ))}
            </Flex>
          ) : (
            <Text type="secondary">Belum ada siswa terhubung.</Text>
          )}
        </Flex>
      </Flex>
    </Card>
  );
};

export default ParentCard;
