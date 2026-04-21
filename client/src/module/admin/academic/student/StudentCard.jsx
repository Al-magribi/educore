import React from "react";
import { motion } from "framer-motion";
import {
  Card,
  Avatar,
  Typography,
  Tag,
  Button,
  Popconfirm,
  theme,
  Divider,
  Flex,
} from "antd";
import {
  User,
  Pencil,
  Trash2,
  School,
  Hash,
  BookOpen,
  UserCircle2,
} from "lucide-react";

const { Text, Title } = Typography;
const MotionDiv = motion.div;

const StudentCard = ({ student, onEdit, onDelete, isDeleting }) => {
  const { token } = theme.useToken();

  const latestClass =
    student.class_history && student.class_history.length > 0
      ? student.class_history[0]
      : null;

  return (
    <MotionDiv whileHover={{ y: -4 }} transition={{ duration: 0.18 }}>
      <Card
        hoverable
        style={{
          borderRadius: 22,
          border: `1px solid ${token.colorBorderSecondary}`,
          boxShadow: "0 12px 24px rgba(15, 23, 42, 0.06)",
        }}
        styles={{ body: { padding: "20px" } }}
        actions={[
          <Button
            type="text"
            block
            icon={<Pencil size={16} color="#f59e0b" />}
            onClick={() => onEdit(student)}
            key="edit"
          >
            Edit
          </Button>,
          <Popconfirm
            title="Hapus data siswa?"
            description="Riwayat akademik yang terkait dapat ikut terdampak."
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
        <Flex vertical gap={16}>
          <Flex align="flex-start" gap={14}>
            <Avatar
              size={64}
              icon={<User size={30} />}
              style={{
                background:
                  student.gender === "P"
                    ? "linear-gradient(135deg, #fbcfe8, #f9a8d4)"
                    : "linear-gradient(135deg, #bfdbfe, #93c5fd)",
                color: student.gender === "P" ? "#9d174d" : "#1d4ed8",
                flexShrink: 0,
                border: `2px solid ${token.colorBgContainer}`,
                boxShadow: "0 6px 18px rgba(0,0,0,0.10)",
              }}
            />

            <div style={{ flex: 1, minWidth: 0 }}>
              <Flex justify="space-between" align="flex-start" gap={12}>
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
                <Tag
                  color={student.is_active ? "success" : "error"}
                  style={{
                    marginRight: 0,
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    lineHeight: "20px",
                    paddingInline: 10,
                  }}
                >
                  {student.is_active ? "AKTIF" : "NONAKTIF"}
                </Tag>
              </Flex>

              <Flex gap={8} wrap="wrap" style={{ marginTop: 10 }}>
                <Tag
                  bordered={false}
                  style={{
                    marginInlineEnd: 0,
                    borderRadius: 999,
                    padding: "6px 10px",
                    background: "rgba(59,130,246,0.10)",
                    color: "#1d4ed8",
                    fontWeight: 600,
                  }}
                >
                  {student.gender === "P" ? "Perempuan" : "Laki-laki"}
                </Tag>
                <Tag
                  bordered={false}
                  style={{
                    marginInlineEnd: 0,
                    borderRadius: 999,
                    padding: "6px 10px",
                    background: "rgba(16,185,129,0.10)",
                    color: "#047857",
                    fontWeight: 600,
                  }}
                >
                  Profil Siswa
                </Tag>
              </Flex>
            </div>
          </Flex>

          <div
            style={{
              borderRadius: 18,
              background: "linear-gradient(135deg, #f8fafc, #f1f5f9)",
              padding: 14,
              border: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <Flex align="center" gap={10}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 14,
                  background: "linear-gradient(135deg, #dbeafe, #e0f2fe)",
                  color: "#1d4ed8",
                }}
              >
                <School size={17} />
              </div>
              <div>
                <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                  Kelas Saat Ini
                </Text>
                <Text strong style={{ fontSize: 14 }}>
                  {latestClass
                    ? `${latestClass.grade} - ${latestClass.class}`
                    : "Belum terhubung ke kelas"}
                </Text>
              </div>
            </Flex>
          </div>

          <Divider style={{ margin: 0 }} />

          <Flex gap={12}>
            <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
              <div
                style={{
                  width: 26,
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

            <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
              <div
                style={{
                  width: 26,
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
          </Flex>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: token.colorTextSecondary,
              fontSize: 12,
            }}
          >
            <UserCircle2 size={14} />
            <span>Data siap digunakan untuk proses akademik dan administrasi lanjutan.</span>
          </div>
        </Flex>
      </Card>
    </MotionDiv>
  );
};

export default StudentCard;
