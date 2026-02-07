import React, { useMemo } from "react";
import {
  Card,
  Button,
  Popconfirm,
  Tooltip,
  Avatar,
  Typography,
  Badge,
  Tag,
  Flex,
  Popover,
  Divider,
  theme,
  Empty,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  PhoneOutlined,
  MailOutlined,
  ReadOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons"; // Menggunakan Icon native Ant Design agar lebih "Pure"
import { InfiniteScrollList } from "../../../../components";

const { Text, Title } = Typography;
const { useToken } = theme;

const TeacherList = ({
  data,
  loading,
  hasMore,
  onLoadMore,
  onEdit,
  onDelete,
}) => {
  return (
    <InfiniteScrollList
      data={data}
      loading={loading}
      hasMore={hasMore}
      onLoadMore={onLoadMore}
      height="75vh"
      grid={{ gutter: [16, 16], xs: 24, sm: 24, md: 12, lg: 8, xl: 8, xxl: 6 }}
      renderItem={(item) => (
        <TeacherCardWrapper item={item} onEdit={onEdit} onDelete={onDelete} />
      )}
    />
  );
};

// Wrapper untuk logika Badge (Wali Kelas)
const TeacherCardWrapper = ({ item, onEdit, onDelete }) => {
  const { token } = useToken();

  const cardContent = (
    <TeacherCard item={item} onEdit={onEdit} onDelete={onDelete} />
  );

  return item.is_homeroom ? (
    <Badge.Ribbon
      text="Wali Kelas"
      color={token.colorSuccess} // Menggunakan token warna sukses (hijau)
    >
      {cardContent}
    </Badge.Ribbon>
  ) : (
    cardContent
  );
};

// --- SUB-COMPONENT: Preview Alokasi Mengajar ---
const TeachingAllocations = ({ allocations }) => {
  const { token } = useToken();

  // 1. Grouping Data
  const groupedData = useMemo(() => {
    if (!allocations) return [];
    const map = {};
    allocations.forEach((item) => {
      const subjectName = item.subject_name || "Unknown";
      const className = item.class_name || "Umum";

      if (!map[subjectName]) {
        map[subjectName] = [];
      }
      map[subjectName].push(className);
    });
    return Object.entries(map);
  }, [allocations]);

  // State Kosong
  if (groupedData.length === 0) {
    return (
      <Flex justify="center" align="center" style={{ padding: "12px 0" }}>
        <Text type="secondary" style={{ fontSize: 12, fontStyle: "italic" }}>
          Belum ada jadwal mengajar
        </Text>
      </Flex>
    );
  }

  // Konten Popover (Detail Lengkap)
  const fullContent = (
    <div style={{ maxWidth: 300 }}>
      <Text strong>Detail Jadwal Mengajar</Text>
      <Divider style={{ margin: "8px 0" }} />
      <Flex vertical gap="small">
        {groupedData.map(([subject, classes], idx) => (
          <div key={idx}>
            <Flex align="center" gap="small" style={{ marginBottom: 4 }}>
              <ReadOutlined
                style={{ color: token.colorPrimary, fontSize: 12 }}
              />
              <Text style={{ fontSize: 12, fontWeight: 500 }}>{subject}</Text>
            </Flex>
            <Flex wrap gap="4px">
              {classes.map((cls, cIdx) => (
                <Tag
                  key={cIdx}
                  bordered={false}
                  color="blue"
                  style={{ margin: 0, fontSize: 11 }}
                >
                  {cls}
                </Tag>
              ))}
            </Flex>
          </div>
        ))}
      </Flex>
    </div>
  );

  return (
    <Flex vertical gap="small">
      {/* List Compact (Max 2 Item) */}
      {groupedData.slice(0, 2).map(([subject, classes], idx) => (
        <Flex key={idx} vertical gap={2}>
          <Text
            ellipsis
            style={{ fontSize: 12, fontWeight: 600, color: token.colorText }}
          >
            {subject}
          </Text>
          <Text ellipsis type="secondary" style={{ fontSize: 11 }}>
            Kelas: {classes.slice(0, 3).join(", ")}
            {classes.length > 3 ? ` +${classes.length - 3}` : ""}
          </Text>
        </Flex>
      ))}

      {/* Indikator "Lihat Selengkapnya" jika banyak */}
      <Popover
        content={fullContent}
        title={null}
        trigger="hover"
        placement="bottom"
      >
        <div
          style={{
            marginTop: 4,
            backgroundColor: token.colorFillAlter, // Warna abu-abu halus bawaan tema
            border: `1px dashed ${token.colorBorder}`,
            borderRadius: token.borderRadiusSM,
            padding: "4px 8px",
            textAlign: "center",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          <Text type="secondary" style={{ fontSize: 11 }}>
            {groupedData.length > 2
              ? `+${groupedData.length - 2} Mapel Lainnya...`
              : "Lihat Detail Kelas"}
          </Text>
        </div>
      </Popover>
    </Flex>
  );
};

// --- COMPONENT: Teacher Card ---
const TeacherCard = ({ item, onEdit, onDelete }) => {
  const { token } = useToken();

  return (
    <Card
      hoverable
      style={{ height: "100%", display: "flex", flexDirection: "column" }}
      styles={{ body: { flex: 1, padding: 16 } }}
      actions={[
        <Tooltip title="Edit Data" key="edit">
          <Button
            type="text"
            icon={<EditOutlined style={{ color: token.colorWarning }} />} // Kuning/Orange untuk edit
            onClick={() => onEdit(item)}
          />
        </Tooltip>,
        <Popconfirm
          title="Hapus Guru?"
          description="Aksi ini tidak dapat dibatalkan"
          onConfirm={() => onDelete(item.id)}
          okText="Ya"
          cancelText="Batal"
          key="delete"
        >
          <Button type="text" danger icon={<DeleteOutlined />} />
        </Popconfirm>,
      ]}
    >
      <Card.Meta
        avatar={
          <Avatar
            src={item.img_url}
            size={48}
            style={{
              backgroundColor: token.colorPrimaryBg,
              color: token.colorPrimary,
              fontSize: 18,
            }}
            icon={!item.img_url && <UserOutlined />}
          >
            {item.full_name?.charAt(0)}
          </Avatar>
        }
        title={
          <Flex vertical gap={2}>
            <Text
              strong
              style={{ fontSize: 15 }}
              ellipsis={{ tooltip: item.full_name }}
            >
              {item.full_name}
            </Text>
            <Tag style={{ width: "fit-content", margin: 0, fontSize: 10 }}>
              NIP: {item.nip || "-"}
            </Tag>
          </Flex>
        }
        description={
          <Flex vertical gap="middle" style={{ marginTop: 16 }}>
            {/* Info Wali Kelas */}
            {item.homeroom_class && (
              <div
                style={{
                  backgroundColor: token.colorSuccessBg,
                  border: `1px solid ${token.colorSuccessBorder}`,
                  padding: "6px 8px",
                  borderRadius: token.borderRadiusSM,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <TeamOutlined style={{ color: token.colorSuccess }} />
                <Text
                  style={{
                    fontSize: 11,
                    color: token.colorSuccessText,
                    fontWeight: 500,
                  }}
                  ellipsis
                >
                  Wali Kelas {item.homeroom_class.name}
                </Text>
              </div>
            )}

            {/* Area Tugas Mengajar */}
            <div>
              <Flex align="center" gap="small" style={{ marginBottom: 8 }}>
                <ReadOutlined
                  style={{ fontSize: 12, color: token.colorTextDescription }}
                />
                <Text
                  type="secondary"
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  Tugas Mengajar
                </Text>
              </Flex>

              {/* Container Alokasi Mengajar */}
              <div
                style={{
                  backgroundColor: token.colorFillQuaternary, // Background halus
                  borderRadius: token.borderRadiusLG,
                  padding: 12,
                }}
              >
                <TeachingAllocations allocations={item.allocations} />
              </div>
            </div>

            <Divider dashed style={{ margin: "4px 0" }} />

            {/* Info Kontak Footer */}
            <Flex vertical gap={4}>
              <Flex align="center" gap="small">
                <PhoneOutlined
                  style={{ fontSize: 12, color: token.colorTextDescription }}
                />
                <Text style={{ fontSize: 12, color: token.colorTextSecondary }}>
                  {item.phone || "-"}
                </Text>
              </Flex>
              {item.email && (
                <Flex align="center" gap="small">
                  <MailOutlined
                    style={{ fontSize: 12, color: token.colorTextDescription }}
                  />
                  <Text
                    style={{ fontSize: 12, color: token.colorTextSecondary }}
                    ellipsis
                  >
                    {item.email}
                  </Text>
                </Flex>
              )}
            </Flex>
          </Flex>
        }
      />
    </Card>
  );
};

export default TeacherList;
