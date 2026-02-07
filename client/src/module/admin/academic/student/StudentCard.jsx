import React from "react";
import {
  Card,
  Avatar,
  Typography,
  Tag,
  Button,
  Popconfirm,
  Space,
  theme,
  Divider,
} from "antd";
import { User, Pencil, Trash2, School, Hash, BookOpen } from "lucide-react";

const { Text, Title } = Typography;

const StudentCard = ({ student, onEdit, onDelete, isDeleting }) => {
  const { token } = theme.useToken();

  // Ambil kelas terakhir/aktif dari history
  const latestClass =
    student.class_history && student.class_history.length > 0
      ? student.class_history[0]
      : null;

  return (
    <Card
      hoverable
      style={{
        borderRadius: 12,
        overflow: "hidden",
        border: `1px solid ${token.colorBorderSecondary}`,
        boxShadow: token.boxShadowTertiary, // Shadow halus
      }}
      styles={{ body: { padding: "20px" } }}
      actions={[
        <Button
          type="text"
          block
          icon={<Pencil size={16} className="text-amber-500" />}
          onClick={() => onEdit(student)}
          key="edit"
        >
          Edit
        </Button>,
        <Popconfirm
          title="Hapus Siswa?"
          description="Data nilai & riwayat akan hilang."
          onConfirm={() => onDelete(student.id)}
          okText="Hapus"
          cancelText="Batal"
          okButtonProps={{ danger: true, loading: isDeleting }}
          key="delete"
        >
          <Button type="text" danger block icon={<Trash2 size={16} />}>
            Hapus
          </Button>
        </Popconfirm>,
      ]}
    >
      {/* Header: Avatar, Nama, dan Status */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        {/* Avatar */}
        <Avatar
          size={64}
          icon={<User size={32} />}
          style={{
            backgroundColor: student.gender === "P" ? "#ffd6e7" : "#bae7ff", // Warna pastel lebih lembut
            color: student.gender === "P" ? "#d4380d" : "#0050b3",
            flexShrink: 0,
            border: `2px solid ${token.colorBgContainer}`,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        />

        {/* Info Utama */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <Title
                level={5}
                style={{ margin: 0, fontWeight: 700 }}
                ellipsis={{ tooltip: student.full_name }}
              >
                {student.full_name}
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                @{student.username}
              </Text>
            </div>
            {/* Status Tag */}
            <Tag
              color={student.is_active ? "success" : "error"}
              style={{
                marginRight: 0,
                borderRadius: 100,
                fontSize: 10,
                fontWeight: 600,
                lineHeight: "20px",
              }}
            >
              {student.is_active ? "AKTIF" : "NON-AKTIF"}
            </Tag>
          </div>
        </div>
      </div>

      {/* Detail Informasi (Card Abu-abu) */}
      <div
        style={{
          backgroundColor: token.colorFillAlter,
          padding: "12px 16px",
          borderRadius: 8,
          border: `1px solid ${token.colorBorderSecondary}`,
        }}
      >
        {/* Baris 1: Kelas */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
          <div
            style={{
              width: 24,
              display: "flex",
              justifyContent: "center",
              marginRight: 8,
            }}
          >
            <School size={16} color={token.colorPrimary} />
          </div>
          <div style={{ flex: 1 }}>
            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
              Kelas Saat Ini
            </Text>
            <Text strong style={{ fontSize: 14 }}>
              {latestClass
                ? `${latestClass.grade} - ${latestClass.class}`
                : "Belum Masuk Kelas"}
            </Text>
          </div>
        </div>

        <Divider style={{ margin: "8px 0" }} />

        {/* Baris 2: NIS & NISN (Grid 2 Kolom) */}
        <div style={{ display: "flex", gap: 12 }}>
          {/* NIS */}
          <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: 24,
                display: "flex",
                justifyContent: "center",
                marginRight: 8,
              }}
            >
              <Hash size={16} color={token.colorTextSecondary} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                NIS
              </Text>
              <Text style={{ fontSize: 13 }}>{student.nis || "-"}</Text>
            </div>
          </div>

          {/* NISN */}
          <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: 24,
                display: "flex",
                justifyContent: "center",
                marginRight: 8,
              }}
            >
              <BookOpen size={16} color={token.colorTextSecondary} />
            </div>
            <div>
              <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                NISN
              </Text>
              <Text style={{ fontSize: 13 }}>{student.nisn || "-"}</Text>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default StudentCard;
