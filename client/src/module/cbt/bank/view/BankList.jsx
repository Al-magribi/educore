import React, { Suspense, lazy, useState, useEffect } from "react";
import {
  Button,
  Flex,
  Input,
  Modal,
  Card,
  Tag,
  Typography,
  Tooltip,
  Popconfirm,
  message,
  theme,
  Avatar,
  Spin,
  Grid,
  Statistic,
  Divider,
} from "antd";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  FileText,
  Edit,
  Trash2,
  BookOpen,
  Calendar,
  MessageCircleQuestionMark,
  Folder,
  LibraryBig,
  Layers3,
  Users,
} from "lucide-react";
import { InfiniteScrollList, LoadApp } from "../../../../components";
import { BankForm } from "../components";
import GroupBankForm from "../components/bank/Grouped/GroupBankForm";
import {
  useGetBanksQuery,
  useDeleteBankMutation,
} from "../../../../service/cbt/ApiBank";
import { useSearchParams } from "react-router-dom";

const QuestionsList = lazy(() => import("./QuestionsList"));

const { Text, Title } = Typography;
const { useToken } = theme;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.38,
      staggerChildren: 0.08,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] },
  },
};

const BankList = () => {
  const { token } = useToken();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view");

  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [allData, setAllData] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  const { data, isFetching } = useGetBanksQuery({
    page,
    search: searchText,
  });

  const [deleteBank] = useDeleteBankMutation();

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (data?.data) {
      if (page === 1) {
        setAllData(data.data);
      } else {
        setAllData((prev) => {
          const existingIds = new Set(prev.map((item) => item.id));
          const uniqueNewData = data.data.filter(
            (item) => !existingIds.has(item.id),
          );
          return [...prev, ...uniqueNewData];
        });
      }
    }
  }, [data, page]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const timeout = setTimeout(() => {
      const normalizedSearch = searchInput.trim();

      if (normalizedSearch === searchText) {
        return;
      }

      setSearchText(normalizedSearch);
      setPage(1);
      setAllData([]);
    }, 450);

    return () => clearTimeout(timeout);
  }, [searchInput, searchText]);

  const handleLoadMore = () => {
    if (data?.hasMore && !isFetching) {
      setPage((prev) => prev + 1);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteBank(id).unwrap();
      message.success("Berhasil dihapus");
      setPage(1);
      setAllData((prev) => prev.filter((item) => item.id !== id));
    } catch {
      message.error("Gagal menghapus");
    }
  };

  const openForm = (item = null) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleFormSuccess = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setPage(1);
  };

  const handleQuestionList = (bankName, bankId) => {
    setSearchParams({
      view: "questions",
      bank_name: bankName,
      bank_id: bankId,
    });
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const totalBanks = data?.totalData || data?.total || allData.length || 0;
  const loadedBanks = allData.length;
  const groupedBanks = allData.filter((item) => item.type === "GB").length;
  const uniqueTeachers = new Set(
    allData.map((item) => item.teacher_name).filter(Boolean),
  ).size;
  const summaryCards = [
    {
      key: "banks",
      title: "Total Bank",
      value: totalBanks,
      icon: <LibraryBig size={18} />,
      bg: "linear-gradient(135deg, #dbeafe, #e0f2fe)",
      color: "#1d4ed8",
    },
    {
      key: "loaded",
      title: "Data Dimuat",
      value: loadedBanks,
      icon: <Layers3 size={18} />,
      bg: "linear-gradient(135deg, #dcfce7, #ecfccb)",
      color: "#16a34a",
    },
    {
      key: "teachers",
      title: "Guru Terlibat",
      value: uniqueTeachers,
      icon: <Users size={18} />,
      bg: "linear-gradient(135deg, #ede9fe, #e0e7ff)",
      color: "#7c3aed",
    },
    {
      key: "grouped",
      title: "Bank Gabungan",
      value: groupedBanks,
      icon: <Folder size={18} />,
      bg: "linear-gradient(135deg, #fef3c7, #ffedd5)",
      color: "#d97706",
    },
  ];

  const renderItem = (item) => {
    const typeColors = {
      UH: "blue",
      TS: "orange",
      AS: "red",
      UAS: "purple",
      GB: "green",
    };
    const color = typeColors[item.type] || "default";

    return (
      <MotionDiv
        variants={itemVariants}
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
        style={{ height: "100%" }}
      >
        <Card
          hoverable
          size='small'
          style={{
            height: "100%",
            borderRadius: 22,
            display: "flex",
            flexDirection: "column",
            border: "1px solid #eef2ff",
            background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
            boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
          }}
          styles={{
            body: {
              flex: 1,
              display: "flex",
              flexDirection: "column",
              padding: 18,
            },
          }}
          title={
            <Flex justify='space-between' align='center' gap={8}>
              <Tag color={color} style={{ borderRadius: 999, fontWeight: 600 }}>
                {item.type}
              </Tag>
              <Flex align='center' gap={4}>
                <Calendar size={12} color='#94a3b8' />
                <Text type='secondary' style={{ fontSize: 11 }}>
                  {new Date(item.created_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
              </Flex>
            </Flex>
          }
          actions={[
            <Tooltip title='Lihat Soal' key='view'>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <MessageCircleQuestionMark
                  size={16}
                  onClick={() =>
                    handleQuestionList(
                      item.title.replaceAll(/ /g, "-"),
                      item.id,
                    )
                  }
                />
              </div>
            </Tooltip>,
            <Tooltip title='Edit' key='edit'>
              <div
                onClick={() => openForm(item)}
                style={{ display: "flex", justifyContent: "center" }}
              >
                <Edit size={16} />
              </div>
            </Tooltip>,
            <Tooltip title='Hapus' key='delete'>
              <Popconfirm
                title='Hapus Bank Soal?'
                onConfirm={() => handleDelete(item.id)}
                okText='Ya'
                cancelText='Batal'
                okButtonProps={{ danger: true }}
              >
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <Trash2 size={16} />
                </div>
              </Popconfirm>
            </Tooltip>,
          ]}
        >
          <Flex gap='middle' align='start' style={{ marginBottom: 14 }}>
            <div
              style={{
                background: `linear-gradient(135deg, ${token.colorPrimaryBg}, #ffffff)`,
                border: `1px solid ${token.colorPrimaryBorder}`,
                padding: 12,
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <BookOpen size={20} color={token.colorPrimary} />
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <Tooltip title={item.title}>
                <Title
                  level={5}
                  ellipsis={{ rows: 2 }}
                  style={{
                    margin: "0 0 6px 0",
                    fontSize: 16,
                    lineHeight: 1.35,
                  }}
                >
                  {item.title}
                </Title>
              </Tooltip>
              <Tag
                variant='filled'
                style={{
                  margin: 0,
                  paddingInline: 10,
                  borderRadius: 999,
                  background: "#eef6ff",
                  color: "#1d4ed8",
                }}
              >
                {item.subject_name || "Mapel Umum"}
              </Tag>
            </div>
          </Flex>

          <Divider style={{ margin: "2px 0 14px", borderColor: "#e8eefc" }} />

          <Flex align='center' gap={10} style={{ marginTop: "auto" }}>
            <Avatar
              size={30}
              style={{
                backgroundColor: "#e2e8f0",
                color: "#334155",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {getInitials(item.teacher_name)}
            </Avatar>
            <div style={{ minWidth: 0 }}>
              <Text
                style={{ display: "block", fontSize: 12, color: "#0f172a" }}
              >
                Penyusun
              </Text>
              <Text ellipsis type='secondary' style={{ fontSize: 12 }}>
                {item.teacher_name || "Belum ada guru"}
              </Text>
            </div>
          </Flex>
        </Card>
      </MotionDiv>
    );
  };

  return (
    <Suspense fallback={<LoadApp />}>
      {view === "questions" ? (
        <Suspense
          fallback={
            <Flex justify='center' align='center' style={{ minHeight: 300 }}>
              <Spin size='large' />
            </Flex>
          }
        >
          <QuestionsList />
        </Suspense>
      ) : (
        <MotionDiv
          variants={containerVariants}
          initial='hidden'
          animate='show'
          style={{ width: "100%" }}
        >
          <MotionDiv variants={itemVariants}>
            <Card
              style={{
                marginBottom: 20,
                borderRadius: 28,
                overflow: "hidden",
                border: "none",
                position: "relative",
                background:
                  "radial-gradient(circle at top left, rgba(56,189,248,0.28), transparent 28%), radial-gradient(circle at right center, rgba(255,255,255,0.16), transparent 18%), linear-gradient(135deg, #0f172a 0%, #1d4ed8 52%, #38bdf8 100%)",
                boxShadow: "0 26px 54px rgba(15, 23, 42, 0.20)",
              }}
              styles={{ body: { padding: isMobile ? 18 : 24 } }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.06), transparent 42%)",
                  pointerEvents: "none",
                }}
              />
              <Flex
                vertical={isMobile}
                justify='space-between'
                align={isMobile ? "stretch" : "center"}
                gap={18}
                style={{ position: "relative" }}
              >
                <div style={{ color: "#fff", maxWidth: 720, flex: 1 }}>
                  <Flex
                    align='center'
                    gap={10}
                    wrap='wrap'
                    style={{ marginBottom: 10 }}
                  >
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.86)",
                        fontWeight: 700,
                        letterSpacing: 0.4,
                      }}
                    >
                      MANAJEMEN BANK SOAL
                    </Text>
                    <Flex
                      align='center'
                      gap={6}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.12)",
                        border: "1px solid rgba(255,255,255,0.16)",
                        color: "#e0f2fe",
                        fontWeight: 600,
                      }}
                    >
                      <LibraryBig size={14} />
                      <span>CBT Workspace</span>
                    </Flex>
                  </Flex>
                  <Title
                    level={isMobile ? 4 : 3}
                    style={{ color: "#fff", margin: "0 0 6px" }}
                  >
                    Kelola Bank Soal.
                  </Title>
                  <Text
                    style={{
                      color: "rgba(241,245,249,0.84)",
                      display: "block",
                      maxWidth: 620,
                    }}
                  >
                    Atur bank soal per guru, mata pelajaran, dan tipe ujian dari
                    satu panel yang lebih fokus untuk kebutuhan operasional CBT.
                  </Text>
                </div>

                <Flex
                  vertical={isMobile}
                  gap={12}
                  style={{ width: isMobile ? "100%" : "auto" }}
                >
                  <Button
                    icon={<Plus size={18} />}
                    type='primary'
                    onClick={() => openForm(null)}
                    size='large'
                    style={{
                      width: isMobile ? "100%" : 180,
                      borderRadius: 14,
                      height: 46,
                      background: "#fff",
                      color: "#0f172a",
                      border: "none",
                      fontWeight: 600,
                      boxShadow: "0 12px 24px rgba(255,255,255,0.18)",
                    }}
                  >
                    Bank Soal
                  </Button>
                  <Button
                    icon={<Folder size={18} />}
                    onClick={() => setIsGroupModalOpen(true)}
                    size='large'
                    style={{
                      width: isMobile ? "100%" : 180,
                      borderRadius: 14,
                      height: 46,
                      background: "rgba(255,255,255,0.12)",
                      color: "#fff",
                      borderColor: "rgba(255,255,255,0.24)",
                      fontWeight: 600,
                    }}
                  >
                    Gabung Bank
                  </Button>
                </Flex>
              </Flex>
            </Card>
          </MotionDiv>

          <Flex gap={16} wrap='wrap' style={{ marginBottom: 20 }}>
            {summaryCards.map((item) => (
              <MotionDiv
                key={item.key}
                variants={itemVariants}
                style={{
                  flex: screens.xl
                    ? "1 1 0"
                    : screens.md
                      ? "1 1 calc(50% - 8px)"
                      : "1 1 100%",
                  minWidth: screens.md ? 0 : "100%",
                }}
              >
                <Card
                  style={{
                    borderRadius: 22,
                    border: "1px solid #eef2ff",
                    boxShadow: "0 14px 30px rgba(15, 23, 42, 0.06)",
                  }}
                  styles={{ body: { padding: "18px 20px" } }}
                  hoverable
                >
                  <Flex justify='space-between' align='start'>
                    <Statistic title={item.title} value={item.value} />
                    <div
                      style={{
                        width: 46,
                        height: 46,
                        display: "grid",
                        placeItems: "center",
                        borderRadius: 16,
                        background: item.bg,
                        color: item.color,
                      }}
                    >
                      {item.icon}
                    </div>
                  </Flex>
                </Card>
              </MotionDiv>
            ))}
          </Flex>

          <MotionDiv variants={itemVariants}>
            <Card
              style={{
                marginBottom: 18,
                borderRadius: 24,
                border: "1px solid #eef2ff",
                boxShadow: "0 16px 34px rgba(15, 23, 42, 0.06)",
              }}
              styles={{ body: { padding: screens.md ? 20 : 16 } }}
            >
              <Flex vertical gap={14}>
                <Flex
                  vertical={isMobile}
                  justify='space-between'
                  align={isMobile ? "stretch" : "center"}
                  gap={12}
                >
                  <div>
                    <Title level={5} style={{ margin: 0 }}>
                      Daftar Bank Soal
                    </Title>
                    <Text
                      type='secondary'
                      style={{ fontSize: 12, display: "block" }}
                    >
                      Menampilkan {loadedBanks} dari {totalBanks} data tersedia
                    </Text>
                    <Text type='secondary' style={{ fontSize: 12 }}>
                      Gunakan pencarian untuk mempersempit hasil berdasarkan
                      judul, mapel, atau penyusun.
                    </Text>
                  </div>

                  <Input
                    prefix={<Search size={16} color='rgba(0,0,0,.25)' />}
                    style={{ width: isMobile ? "100%" : 340 }}
                    placeholder='Cari judul, mapel, atau guru...'
                    allowClear
                    size='large'
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                </Flex>
              </Flex>
            </Card>
          </MotionDiv>

          <MotionDiv variants={itemVariants}>
            <InfiniteScrollList
              data={allData}
              loading={isFetching}
              hasMore={data?.hasMore || false}
              onLoadMore={handleLoadMore}
              renderItem={renderItem}
              emptyText='Belum ada bank soal tersedia'
              grid={{
                gutter: [16, 16],
                xs: 24,
                sm: 12,
                md: 12,
                lg: 8,
                xl: 6,
              }}
              height={isMobile ? "calc(100vh - 300px)" : "calc(100vh - 360px)"}
            />
          </MotionDiv>
        </MotionDiv>
      )}

      <Modal
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnHidden
        centered
        width={isMobile ? "calc(100vw - 24px)" : 620}
        closable={false}
        styles={{
          content: {
            padding: 0,
            overflow: "hidden",
            borderRadius: 28,
            boxShadow: "0 28px 70px rgba(15, 23, 42, 0.18)",
          },
          body: { padding: 0 },
        }}
        modalRender={(modalNode) => (
          <MotionDiv
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          >
            {modalNode}
          </MotionDiv>
        )}
      >
        <BankForm
          initialValues={editingItem}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleFormSuccess}
        />
      </Modal>

      <Modal
        title={
          <Flex align='center' gap={8}>
            <div
              style={{
                background: token.colorPrimaryBg,
                padding: 6,
                borderRadius: 6,
                display: "flex",
              }}
            >
              <Folder size={18} color={token.colorPrimary} />
            </div>
            <Text strong style={{ fontSize: 16 }}>
              Gabung Bank Soal
            </Text>
          </Flex>
        }
        open={isGroupModalOpen}
        onCancel={() => setIsGroupModalOpen(false)}
        footer={null}
        destroyOnHidden
        centered
        width={900}
      >
        <GroupBankForm
          onClose={() => setIsGroupModalOpen(false)}
          onSuccess={() => {
            setIsGroupModalOpen(false);
            setPage(1);
          }}
        />
      </Modal>
    </Suspense>
  );
};

export default BankList;
