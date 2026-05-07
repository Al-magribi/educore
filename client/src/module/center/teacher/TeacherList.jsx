import React, { useEffect, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  Divider,
  Grid,
  Input,
  Popconfirm,
  Space,
  Tag,
  Table,
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
} from "@ant-design/icons";
import { motion } from "framer-motion";
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

  const handleTableScroll = (event) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    if (distanceFromBottom < 120 && hasMore && !isFetching) {
      handleLoadMore();
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

  const columns = [
    {
      title: "Guru",
      dataIndex: "full_name",
      key: "teacher",
      width: isMobile ? 260 : 320,
      render: (_, item) => (
        <Space align="start" size={14} style={{ width: "100%" }}>
          <Avatar
            size={isMobile ? 44 : 52}
            src={item.img_url}
            icon={<UserOutlined />}
            style={{
              background:
                "linear-gradient(135deg, rgba(59,130,246,0.18), rgba(34,197,94,0.18))",
              color: "#2563eb",
              flexShrink: 0,
            }}
          />

          <Space
            direction="vertical"
            size={6}
            style={{ minWidth: 0, width: "100%" }}
          >
            <div>
              <Text
                strong
                style={{
                  display: "block",
                  color: "#0f172a",
                  fontSize: isMobile ? 14 : 15,
                  lineHeight: 1.35,
                }}
              >
                {item.full_name}
              </Text>
              <Text
                type="secondary"
                style={{ display: "block", marginTop: 2, fontSize: 12 }}
              >
                @{item.username}
              </Text>
            </div>

            <Space wrap size={[8, 8]}>
              <Tag
                color="cyan"
                icon={<BookOutlined />}
                style={{
                  margin: 0,
                  borderRadius: 999,
                  paddingInline: 10,
                  fontWeight: 600,
                }}
              >
                {item.homebase_name || "Belum ada Homebase"}
              </Tag>
              {isMobile ? (
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
              ) : null}
            </Space>

            {isMobile ? (
              <div style={{ display: "grid", gap: 4 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  NIP: {item.nip || "Non-NIP"}
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Email: {item.email || "-"}
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Telepon: {item.phone || "-"}
                </Text>
              </div>
            ) : null}
          </Space>
        </Space>
      ),
    },
    {
      title: "Homebase",
      dataIndex: "homebase_name",
      key: "homebase",
      responsive: ["md"],
      width: 190,
      render: (value) => (
        <Text style={{ color: "#0f172a" }}>{value || "Belum ada Homebase"}</Text>
      ),
    },
    {
      title: "NIP",
      dataIndex: "nip",
      key: "nip",
      responsive: ["lg"],
      width: 120,
      render: (value) => <Text type="secondary">{value || "Non-NIP"}</Text>,
    },
    {
      title: "Kontak",
      key: "contact",
      responsive: ["xl"],
      width: 200,
      render: (_, item) => (
        <Space direction="vertical" size={4} style={{ width: "100%" }}>
          <Space size={8} style={{ color: "#64748b" }}>
            <MailOutlined />
            <Text type="secondary" ellipsis={{ tooltip: item.email || "-" }}>
              {item.email || "-"}
            </Text>
          </Space>
          <Space size={8} style={{ color: "#64748b" }}>
            <PhoneOutlined />
            <Text type="secondary">{item.phone || "-"}</Text>
          </Space>
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "is_active",
      key: "status",
      width: 100,
      render: (value) => (
        <Tag
          color={value ? "success" : "error"}
          style={{
            margin: 0,
            borderRadius: 999,
            paddingInline: 10,
            fontWeight: 600,
          }}
        >
          {value ? "Aktif" : "Nonaktif"}
        </Tag>
      ),
    },
    {
      title: "Aksi",
      key: "actions",
      width: isMobile ? 96 : 124,
      align: "right",
      render: (_, item) => (
        <Space size={2} wrap style={{ justifyContent: "flex-end" }}>
          <Tooltip title="Edit data guru">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => openModal(item)}
              style={{ color: "#2563eb", fontWeight: 600 }}
            >
              {!isMobile ? "Edit" : null}
            </Button>
          </Tooltip>
          <Popconfirm
            title="Hapus Guru?"
            description="Data mengajar, nilai, dan absensi terkait mungkin akan hilang."
            onConfirm={() => handleDelete(item.id)}
            okText="Ya, Hapus"
            cancelText="Batal"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              loading={isDeleting}
              style={{ fontWeight: 600 }}
            >
              {!isMobile ? "Hapus" : null}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <MotionDiv
        variants={containerVariants}
        initial="hidden"
        animate="show"
        style={{ display: "grid", gap: 18, width: "100%", minWidth: 0 }}
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

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 12,
                  width: "100%",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
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
                    flex: isMobile ? "1 1 100%" : "1 1 320px",
                    maxWidth: isMobile ? "100%" : 340,
                    minWidth: 0,
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
                    flexShrink: 0,
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
              </div>
            </Space>
          </Card>
        </MotionDiv>

        <MotionDiv variants={itemVariants}>
          <Card
            variant="borderless"
            style={{
              borderRadius: 22,
              overflow: "hidden",
              border: "1px solid rgba(148, 163, 184, 0.16)",
              boxShadow: "0 22px 50px rgba(15, 23, 42, 0.08)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96))",
            }}
            styles={{ body: { padding: 0 } }}
          >
            <div
              onScroll={handleTableScroll}
              style={{
                maxHeight: "75vh",
                overflow: "auto",
                width: "100%",
              }}
            >
              <Table
                rowKey="id"
                dataSource={listData}
                columns={columns}
                pagination={false}
                loading={isFetching && listData.length === 0}
                sticky={!isMobile}
                scroll={{ x: "max-content" }}
                locale={{
                  emptyText: "Belum ada data guru",
                }}
                size={isMobile ? "small" : "middle"}
                style={{ width: "100%" }}
              />

              {isFetching && listData.length > 0 ? (
                <div
                  style={{
                    padding: "14px 16px",
                    textAlign: "center",
                    color: "#2563eb",
                    fontWeight: 500,
                    background: "rgba(248, 250, 252, 0.96)",
                  }}
                >
                  Memuat data guru...
                </div>
              ) : null}

              {!hasMore && listData.length > 0 ? (
                <Divider
                  style={{ color: "#94a3b8", fontSize: 12, margin: "8px 0 18px" }}
                >
                  Semua data telah dimuat
                </Divider>
              ) : null}
            </div>
          </Card>
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
