import React from "react";
import {
  Card,
  Typography,
  Button,
  Badge,
  Popconfirm,
  Tag,
  theme,
  message,
} from "antd";
import {
  Edit,
  Trash2,
  Users,
  GraduationCap,
  Power,
  PowerOff,
} from "lucide-react";
import {
  useDeleteClassMutation,
  useUpdateClassStatusMutation,
} from "../../../../service/main/ApiClass";

const { Text, Title } = Typography;

const ClassItem = ({ item, onEdit, onManageStudents }) => {
  const { token } = theme.useToken();
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
        item.is_active
          ? "Kelas berhasil dinonaktifkan"
          : "Kelas berhasil diaktifkan",
      );
    } catch (error) {
      message.error(error?.data?.message || "Gagal mengubah status kelas");
    }
  };

  return (
    <Badge.Ribbon
      text={item.major_name || "Umum"}
      color={item.major_name ? "blue" : "cyan"}
    >
      <Card
        hoverable
        actions={[
          <Button
            type="text"
            icon={<Users size={16} />}
            onClick={onManageStudents}
            disabled={!item.is_active}
          />,
          <Button type="text" icon={<Edit size={16} />} onClick={onEdit} />,
          <Popconfirm
            title={item.is_active ? "Nonaktifkan kelas?" : "Aktifkan kelas?"}
            description={
              item.is_active
                ? "Kelas nonaktif tidak bisa menerima siswa baru."
                : "Kelas akan kembali bisa menerima siswa baru."
            }
            onConfirm={handleToggleStatus}
            okButtonProps={{ loading: isUpdatingStatus }}
          >
            <Button
              type="text"
              icon={
                item.is_active ? <PowerOff size={16} /> : <Power size={16} />
              }
            />
          </Popconfirm>,
          <Popconfirm
            title="Hapus Kelas"
            description="Yakin ingin menghapus kelas ini? Data tidak dapat dikembalikan."
            onConfirm={handleDelete}
            okButtonProps={{ loading: isDeleting, danger: true }}
          >
            <Button type="text" danger icon={<Trash2 size={16} />} />
          </Popconfirm>,
        ]}
        style={{ height: "100%", display: "flex", flexDirection: "column" }}
        styles={{ body: { flex: 1 } }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "8px",
              background: token.colorPrimaryBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: token.colorPrimary,
            }}
          >
            <GraduationCap size={20} />
          </div>
          <div>
            <Title level={5} style={{ margin: 0 }}>
              {item.name}
            </Title>
            <Text type="secondary" style={{ fontSize: "12px" }}>
              Grade: {item.grade_name || "-"}
            </Text>
            <div style={{ marginTop: 8 }}>
              <Tag color={item.is_active ? "success" : "red"}>
                {item.is_active ? "AKTIF" : "NONAKTIF"}
              </Tag>
            </div>
          </div>
        </div>

        <div style={{ marginTop: "16px" }}>
          <div
            style={{
              background: token.colorBgLayout,
              padding: "8px",
              borderRadius: "6px",
              textAlign: "center",
            }}
          >
            <Text strong style={{ fontSize: "16px" }}>
              {item.students_count || 0}
            </Text>
            <div style={{ fontSize: "10px", color: token.colorTextSecondary }}>
              Total Siswa
            </div>
          </div>
        </div>
      </Card>
    </Badge.Ribbon>
  );
};

export default ClassItem;
