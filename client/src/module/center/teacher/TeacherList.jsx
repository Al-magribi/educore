import React, { useEffect, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  Grid,
  Input,
  Popconfirm,
  Space,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  BookOutlined,
  MailOutlined,
  PhoneOutlined,
  IdcardOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import { InfiniteScrollList } from "../../../components";
import {
  useDeleteTeacherMutation,
  useLazyGetTeachersQuery,
} from "../../../service/main/ApiTeacher";
import useDebounced from "../../../utils/useDebounced.jsx";
import ModalTeacher from "./ModalTeacher";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const containerVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: "easeOut",
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

const TeacherList = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [listData, setListData] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const debounced = useDebounced(search, 500);
  const [triggerGetTeachers, { isFetching }] = useLazyGetTeachersQuery();
  const [deleteTeacher, { isLoading: isDeleting }] =
    useDeleteTeacherMutation();

  useEffect(() => {
    let isActive = true;

    const fetchTeachers = async () => {
      try {
        const result = await triggerGetTeachers({
          page,
          limit: 16,
          search: debounced,
        }).unwrap();

        if (!isActive) {
          return;
        }

        setHasMore(Boolean(result?.hasMore));
        setListData((prev) => {
          if (page === 1) {
            return result?.data || [];
          }

          const existingIds = new Set(prev.map((item) => item.id));
          const nextItems = (result?.data || []).filter(
            (item) => !existingIds.has(item.id),
          );
          return [...prev, ...nextItems];
        });
      } catch {
        if (isActive && page === 1) {
          setHasMore(false);
          setListData([]);
        }
      }
    };

    fetchTeachers();

    return () => {
      isActive = false;
    };
  }, [page, debounced, triggerGetTeachers]);

  const refreshFirstPage = async () => {
    try {
      const result = await triggerGetTeachers(
        {
          page: 1,
          limit: 16,
          search: debounced,
        },
        true,
      ).unwrap();

      setHasMore(Boolean(result?.hasMore));
      setListData(result?.data || []);
    } catch {
      setHasMore(false);
      setListData([]);
    }
  };

  const handleLoadMore = () => {
    if (hasMore && !isFetching) {
      setPage((prev) => prev + 1);
    }
  };

  const openModal = (item = null) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteTeacher(id).unwrap();
      message.success("Guru berhasil dihapus");
      setPage(1);
      await refreshFirstPage();
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus data");
    }
  };

  const handleSuccess = async () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setPage(1);
    await refreshFirstPage();
  };

  const renderItem = (item) => (
    <MotionDiv
      key={item.id}
      variants={itemVariants}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        variant="borderless"
        hoverable
        actions={[
          <Tooltip title="Edit data guru" key="edit">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => openModal(item)}
              style={{ color: "#2563eb", fontWeight: 600 }}
            >
              Edit
            </Button>
          </Tooltip>,
          <Popconfirm
            key="delete"
            title="Hapus Guru?"
            description="Data mengajar, nilai, dan absensi terkait mungkin akan hilang."
            onConfirm={() => handleDelete(item.id)}
            okText="Ya, Hapus"
            cancelText="Batal"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              loading={isDeleting}
              style={{ fontWeight: 600 }}
            >
              Hapus
            </Button>
          </Popconfirm>,
        ]}
        styles={{
          body: { padding: 18 },
          actions: {
            borderTop: "1px solid #e2e8f0",
            background: "#fff",
          },
        }}
        style={{
          height: "100%",
          borderRadius: 24,
          overflow: "hidden",
          border: "1px solid rgba(148, 163, 184, 0.16)",
          boxShadow: "0 22px 50px rgba(15, 23, 42, 0.08)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96))",
        }}
      >
        <Space align="start" size={16} style={{ width: "100%" }}>
          <Avatar
            size={56}
            src={item.img_url}
            icon={<UserOutlined />}
            style={{
              background:
                "linear-gradient(135deg, rgba(59,130,246,0.18), rgba(34,197,94,0.18))",
              color: "#2563eb",
              flexShrink: 0,
            }}
          />

          <Space orientation="vertical" size={10} style={{ flex: 1, minWidth: 0 }}>
            <div>
              <Title
                level={5}
                style={{ margin: 0, color: "#0f172a", fontSize: 17 }}
                ellipsis={{ tooltip: item.full_name }}
              >
                {item.full_name}
              </Title>
              <Text
                type="secondary"
                style={{ display: "block", marginTop: 4, fontSize: 13 }}
              >
                @{item.username}
              </Text>
            </div>

            <Space wrap size={[8, 8]}>
              <Tag
                icon={<BookOutlined />}
                color="cyan"
                style={{
                  margin: 0,
                  borderRadius: 999,
                  paddingInline: 10,
                  fontWeight: 600,
                }}
              >
                {item.homebase_name || "Belum ada Homebase"}
              </Tag>
              <Tag
                color={item.is_active ? "success" : "error"}
                style={{
                  margin: 0,
                  borderRadius: 999,
                  paddingInline: 10,
                  fontWeight: 600,
                }}
              >
                {item.is_active ? "Aktif" : "Nonaktif"}
              </Tag>
            </Space>

            <div style={{ display: "grid", gap: 8 }}>
              <Space size={8} style={{ color: "#64748b", width: "100%" }}>
                <IdcardOutlined />
                <Text
                  type="secondary"
                  style={{ fontSize: 12, minWidth: 0 }}
                  ellipsis={{ tooltip: item.nip || "Non-NIP" }}
                >
                  {item.nip || "Non-NIP"}
                </Text>
              </Space>

              <Space size={8} style={{ color: "#64748b", width: "100%" }}>
                <MailOutlined />
                <Text
                  type="secondary"
                  style={{ fontSize: 12, minWidth: 0 }}
                  ellipsis={{ tooltip: item.email || "-" }}
                >
                  {item.email || "-"}
                </Text>
              </Space>

              <Space size={8} style={{ color: "#64748b", width: "100%" }}>
                <PhoneOutlined />
                <Text
                  type="secondary"
                  style={{ fontSize: 12, minWidth: 0 }}
                  ellipsis={{ tooltip: item.phone || "-" }}
                >
                  {item.phone || "-"}
                </Text>
              </Space>
            </div>
          </Space>
        </Space>
      </Card>
    </MotionDiv>
  );

  return (
    <>
      <MotionDiv
        variants={containerVariants}
        initial="hidden"
        animate="show"
        style={{ display: "grid", gap: 18 }}
      >
        <MotionDiv variants={itemVariants}>
          <Card
            variant="borderless"
            style={{
              borderRadius: 22,
              overflow: "hidden",
              border: "1px solid rgba(148, 163, 184, 0.16)",
              background:
                "radial-gradient(circle at top left, rgba(14,165,233,0.14), transparent 30%), linear-gradient(135deg, #0f172a, #1e3a8a 58%, #0f766e)",
              boxShadow: "0 22px 50px rgba(15, 23, 42, 0.18)",
            }}
            styles={{ body: { padding: isMobile ? 18 : 20 } }}
          >
            <Space orientation="vertical" size={14} style={{ width: "100%" }}>
              <Tag
                style={{
                  width: "fit-content",
                  margin: 0,
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.2)",
                  background: "rgba(255,255,255,0.12)",
                  color: "#e0f2fe",
                  paddingInline: 12,
                  fontWeight: 600,
                }}
              >
                Center Teacher
              </Tag>

              <div>
                <Title
                  level={2}
                  style={{
                    margin: 0,
                    color: "#f8fafc",
                    fontSize: isMobile ? 24 : 28,
                    lineHeight: 1.2,
                  }}
                >
                  Kelola data guru dengan tampilan yang lebih rapi.
                </Title>
                <Text
                  style={{
                    display: "block",
                    marginTop: 8,
                    color: "rgba(226, 232, 240, 0.9)",
                    fontSize: 13,
                    lineHeight: 1.7,
                    maxWidth: 680,
                  }}
                >
                  Cari guru, perbarui penempatan, dan tambah data guru baru dari
                  workspace yang tetap nyaman dipakai di desktop maupun mobile.
                </Text>
              </div>

              <Space
                wrap
                size={[12, 12]}
                style={{ width: "100%", justifyContent: "space-between" }}
              >
                <Input
                  placeholder="Cari nama, username, atau NIP..."
                  prefix={<SearchOutlined style={{ color: "#64748b" }} />}
                  allowClear
                  onChange={(e) => {
                    setPage(1);
                    setSearch(e.target.value);
                  }}
                  style={{
                    maxWidth: isMobile ? "100%" : 340,
                    width: "100%",
                    height: 42,
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.96)",
                  }}
                />
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => openModal(null)}
                  size="large"
                  style={{
                    borderRadius: 999,
                    height: 42,
                    paddingInline: 20,
                    background: "#f8fafc",
                    color: "#0f172a",
                    borderColor: "#f8fafc",
                    fontWeight: 600,
                  }}
                >
                  Tambah Guru
                </Button>
              </Space>
            </Space>
          </Card>
        </MotionDiv>

        <MotionDiv variants={itemVariants}>
          <InfiniteScrollList
            data={listData}
            loading={isFetching}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            renderItem={renderItem}
            height="75vh"
            emptyText="Belum ada data guru"
            grid={{
              gutter: [16, 16],
              xs: 24,
              sm: 24,
              md: 12,
              lg: 8,
              xl: 6,
              xxl: 6,
            }}
          />
        </MotionDiv>
      </MotionDiv>

      <ModalTeacher
        open={isModalOpen}
        initialData={editingItem}
        onCancel={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </>
  );
};

export default TeacherList;
