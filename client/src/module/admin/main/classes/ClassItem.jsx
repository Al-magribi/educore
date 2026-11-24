import React from "react";
import { Button, Flex, Popconfirm, Tag, Tooltip, Typography, message } from "antd";
import { Edit, GraduationCap, Power, PowerOff, Trash2, Users } from "lucide-react";
import {
  useDeleteClassMutation,
  useUpdateClassStatusMutation,
} from "../../../../service/main/ApiClass";
import { IconBox } from "../../../../components/ui/muse";
import { museColors, museRadius } from "../../../../config/theme";

const { Text } = Typography;

const ClassItem = ({ item, onEdit, onManageStudents }) => {
  const [deleteClass, { isLoading: isDeleting }] = useDeleteClassMutation();
  const [updateClassStatus, { isLoading: isUpdatingStatus }] =
    useUpdateClassStatusMutation();

  const handleDelete = async () => {
    try {
      await deleteClass(item.id).unwrap();
      message.success("Kelas berhasil dihapus");
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus kelas");
    }
  };

  const handleToggleStatus = async () => {
    try {
      await updateClassStatus({
        id: item.id,
        is_active: !item.is_active,
      }).unwrap();
      message.success(
        item.is_active ? "Kelas berhasil dinonaktifkan" : "Kelas berhasil diaktifkan",
      );
    } catch (error) {
      message.error(error?.data?.message || "Gagal mengubah status kelas");
    }
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: museRadius.card,
        border: `1px solid ${museColors.divider}`,
        background: "#fff",
        opacity: item.is_active ? 1 : 0.75,
      }}
    >
      <div style={{ padding: 16, flex: 1 }}>
        <Flex align='flex-start' gap={12}>
          <IconBox
            icon={<GraduationCap size={20} />}
            tone={item.is_active ? "primary" : "bgSoft"}
            size={40}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text strong ellipsis={{ tooltip: item.name }} style={{ display: "block", fontSize: 16 }}>
              {item.name}
            </Text>
            <Text type='secondary' style={{ fontSize: 12 }}>
              Tingkat {item.grade_name || "-"}
            </Text>
          </div>
        </Flex>

        <Flex gap={6} wrap style={{ marginTop: 12 }}>
          <Tag color={item.is_active ? "success" : "default"} style={{ margin: 0 }}>
            {item.is_active ? "Aktif" : "Nonaktif"}
          </Tag>
          <Tag color={item.major_name ? "blue" : undefined} style={{ margin: 0 }}>
            {item.major_name || "Umum"}
          </Tag>
        </Flex>

        <Flex align='baseline' gap={6} style={{ marginTop: 16 }}>
          <Text strong style={{ fontSize: 24, fontWeight: 700, color: museColors.navy }}>
            {item.students_count || 0}
          </Text>
          <Text type='secondary' style={{ fontWeight: 600 }}>
            siswa
          </Text>
        </Flex>
      </div>

      <Flex
        justify='space-between'
        align='center'
        style={{ padding: "8px 12px", borderTop: `1px solid ${museColors.divider}` }}
      >
        <Tooltip title={item.is_active ? undefined : "Aktifkan kelas untuk mengelola siswa"}>
          <Button
            type='link'
            icon={<Users size={16} />}
            onClick={onManageStudents}
            disabled={!item.is_active}
            style={{ paddingInline: 4 }}
          >
            Siswa
          </Button>
        </Tooltip>
        <Flex gap={2}>
          <Tooltip title='Edit kelas'>
            <Button type='text' aria-label='Edit kelas' icon={<Edit size={16} />} onClick={onEdit} />
          </Tooltip>
          <Popconfirm
            title={item.is_active ? `Nonaktifkan ${item.name}?` : `Aktifkan ${item.name}?`}
            description={
              item.is_active
                ? "Kelas nonaktif tidak bisa menerima siswa baru."
                : "Kelas akan kembali bisa menerima siswa baru."
            }
            onConfirm={handleToggleStatus}
            okText='Ya'
            cancelText='Batal'
            okButtonProps={{ loading: isUpdatingStatus }}
          >
            <Tooltip title={item.is_active ? "Nonaktifkan" : "Aktifkan"}>
              <Button
                type='text'
                aria-label={item.is_active ? "Nonaktifkan kelas" : "Aktifkan kelas"}
                icon={item.is_active ? <PowerOff size={16} /> : <Power size={16} />}
              />
            </Tooltip>
          </Popconfirm>
          <Popconfirm
            title={`Hapus ${item.name}?`}
            description='Data kelas tidak dapat dikembalikan.'
            onConfirm={handleDelete}
            okText='Ya, Hapus'
            cancelText='Batal'
            okButtonProps={{ loading: isDeleting, danger: true }}
          >
            <Tooltip title='Hapus kelas'>
              <Button type='text' danger aria-label='Hapus kelas' icon={<Trash2 size={16} />} />
            </Tooltip>
          </Popconfirm>
        </Flex>
      </Flex>
    </div>
  );
};

export default ClassItem;
