import React from "react";
import {
  Card,
  Typography,
  Button,
  Badge,
  Popconfirm,
  theme,
  message,
} from "antd";
import { Edit, Trash2, Users, GraduationCap } from "lucide-react";
import { useDeleteClassMutation } from "../../../../service/main/ApiClass";

const { Text, Title } = Typography;

const ClassItem = ({ item, onEdit, onManageStudents }) => {
  const { token } = theme.useToken();
  const [deleteClass, { isLoading: isDeleting }] = useDeleteClassMutation();

  const handleDelete = async () => {
    try {
      await deleteClass(item.id).unwrap();
      message.success("Kelas berhasil dihapus");
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus kelas");
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
          >
            Siswa
          </Button>,
          <Button type="text" icon={<Edit size={16} />} onClick={onEdit} />,
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
