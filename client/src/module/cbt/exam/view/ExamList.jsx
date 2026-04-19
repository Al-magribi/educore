import React, { Suspense, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Flex,
  Input,
  Modal,
  Tag,
  Typography,
  Tooltip,
  Popconfirm,
  Avatar,
  message,
  theme,
  Grid,
  Statistic,
  Divider,
} from "antd";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Users,
  Timer,
  Edit,
  Trash2,
  BookOpen,
  Folder,
  ClipboardList,
  Layers3,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { InfiniteScrollList, LoadApp } from "../../../../components";
import {
  useGetExamsQuery,
  useDeleteExamMutation,
} from "../../../../service/cbt/ApiExam";
import ExamForm from "../components/ExamForm";
import Report from "../report/Report";
import StudentAnswers from "../report/components/StudentAnswers";

const { Text, Title } = Typography;
const { useToken } = theme;
const { useBreakpoint } = Grid;

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

const ExamList = () => {
  const { token } = useToken();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view");
  const exam_id = searchParams.get("exam_id");
  const exam_name = searchParams.get("exam_name")?.replaceAll("-", " ");
  const token_exam = searchParams.get("token");

  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [allData, setAllData] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const { data, isFetching } = useGetExamsQuery({
    page,
    search: searchText,
  });

  const [deleteExam] = useDeleteExamMutation();

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
      await deleteExam(id).unwrap();
      message.success("Jadwal ujian berhasil dihapus");
      setPage(1);
      setAllData((prev) => prev.filter((item) => item.id !== id));
    } catch {
      message.error("Gagal menghapus jadwal ujian");
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

  const handleReport = (item) => {
    setSearchParams({
      view: "report",
      exam_id: item.id,
      exam_name: item.name?.replaceAll(" ", "-"),
      token: item.token,
    });
  };

  const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
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

  const renderItem = (item) => {
    const statusColor = item.is_active ? "green" : "default";
    const classNames = item.classes?.map((c) => c.name).join(", ");
    const classLabel =
      item.class_count > 0 ? `${item.class_count} kelas` : "Belum ada kelas";

    return (
      <motion.div
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
              <Tag
                color={statusColor}
                style={{ borderRadius: 999, fontWeight: 600 }}
              >
                {item.is_active ? "Aktif" : "Nonaktif"}
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
            <Tooltip title='Laporan' key='report'>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <Folder size={16} onClick={() => handleReport(item)} />
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
                title='Hapus Jadwal Ujian?'
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
              <Tooltip title={item.name}>
                <Title
                  level={5}
                  ellipsis={{ rows: 2 }}
                  style={{
                    margin: "0 0 6px 0",
                    fontSize: 16,
                    lineHeight: 1.35,
                  }}
                >
                  {item.name}
                </Title>
              </Tooltip>
              <Tag
                bordered={false}
                style={{
                  margin: 0,
                  paddingInline: 10,
                  borderRadius: 999,
                  background: "#eef6ff",
                  color: "#1d4ed8",
                }}
              >
                {item.bank_title} - {item.subject_name || "Mapel Umum"}
              </Tag>
            </div>
          </Flex>

          <Divider style={{ margin: "2px 0 14px", borderColor: "#e8eefc" }} />

          <Flex vertical gap={8} style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 12, color: "#334155" }}>
              Grade: {item.grade_name || "-"}
            </Text>
            <Tooltip title={classNames || ""}>
              <Text style={{ fontSize: 12, color: "#334155" }}>
                <Users size={12} style={{ marginRight: 6 }} />
                {classLabel}
              </Text>
            </Tooltip>
            {item.token ? (
              <Text
                style={{ fontSize: 12, color: "#334155" }}
                copyable={{
                  text: item.token,
                  tooltips: ["Copy token", "Token disalin"],
                }}
              >
                Token: {item.token}
              </Text>
            ) : (
              <Text style={{ fontSize: 12, color: "#334155" }}>Token: -</Text>
            )}
            <Text style={{ fontSize: 12, color: "#334155" }}>
              <Timer size={12} style={{ marginRight: 6 }} />
              {item.duration_minutes} menit
            </Text>
          </Flex>

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
                Pengampu
              </Text>
              <Text ellipsis type='secondary' style={{ fontSize: 12 }}>
                {item.teacher_name || "-"}
              </Text>
            </div>
          </Flex>
        </Card>
      </motion.div>
    );
  };

  const searchPlaceholder = useMemo(
    () => "Cari nama ujian, bank soal, mapel, atau guru...",
    [],
  );

  const totalExams = toNumber(data?.totalData || data?.total || allData.length);
  const activeExams = allData.filter((item) => item.is_active).length;
  const totalClasses = allData.reduce(
    (sum, item) => sum + toNumber(item.class_count),
    0,
  );
  const summaryCards = [
    {
      key: "exams",
      title: "Total Ujian",
      value: totalExams,
      icon: <ClipboardList size={18} />,
      bg: "linear-gradient(135deg, #dbeafe, #e0f2fe)",
      color: "#1d4ed8",
    },
    {
      key: "active",
      title: "Ujian Aktif",
      value: activeExams,
      icon: <ShieldCheck size={18} />,
      bg: "linear-gradient(135deg, #dcfce7, #ecfccb)",
      color: "#16a34a",
    },
    {
      key: "classes",
      title: "Cakupan Kelas",
      value: totalClasses,
      icon: <Users size={18} />,
      bg: "linear-gradient(135deg, #ede9fe, #e0e7ff)",
      color: "#7c3aed",
    },
    {
      key: "loaded",
      title: "Data Dimuat",
      value: allData.length,
      icon: <Layers3 size={18} />,
      bg: "linear-gradient(135deg, #fef3c7, #ffedd5)",
      color: "#d97706",
    },
  ];

  if (view === "report") {
    return (
      <Report exam_id={exam_id} exam_name={exam_name} token={token_exam} />
    );
  }

  if (view === "student_answers") {
    return <StudentAnswers />;
  }

  return (
    <Suspense fallback={<LoadApp />}>
      <motion.div
        variants={containerVariants}
        initial='hidden'
        animate='show'
        style={{ width: "100%" }}
      >
        <motion.div variants={itemVariants}>
          <Card
            style={{
              marginBottom: 20,
              borderRadius: 28,
              overflow: "hidden",
              border: "none",
              background:
                "linear-gradient(135deg, #0f172a 0%, #1d4ed8 48%, #38bdf8 100%)",
              boxShadow: "0 24px 50px rgba(15, 23, 42, 0.18)",
            }}
            styles={{ body: { padding: isMobile ? 18 : 24 } }}
          >
            <Flex
              vertical={isMobile}
              justify='space-between'
              align={isMobile ? "stretch" : "center"}
              gap={18}
            >
              <div style={{ color: "#fff", maxWidth: 640 }}>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.78)",
                    display: "block",
                    marginBottom: 8,
                  }}
                >
                  Manajemen ujian
                </Text>
                <Title
                  level={isMobile ? 4 : 3}
                  style={{ color: "#fff", margin: 0 }}
                >
                  Kelola Jadwal Ujian
                </Title>
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
                  }}
                >
                  Jadwal Ujian
                </Button>
              </Flex>
            </Flex>
          </Card>
        </motion.div>

        <Flex gap={16} wrap='wrap' style={{ marginBottom: 20 }}>
          {summaryCards.map((item) => (
            <motion.div
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
            </motion.div>
          ))}
        </Flex>

        <motion.div variants={itemVariants}>
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
                    Daftar Jadwal Ujian
                  </Title>
                  <Text type='secondary' style={{ fontSize: 12 }}>
                    Menampilkan {allData.length} dari {totalExams} data tersedia
                  </Text>
                </div>

                <Input
                  prefix={<Search size={16} color='rgba(0,0,0,.25)' />}
                  style={{ width: isMobile ? "100%" : 340 }}
                  placeholder={searchPlaceholder}
                  allowClear
                  size='large'
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </Flex>
            </Flex>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <InfiniteScrollList
            data={allData}
            loading={isFetching}
            hasMore={data?.hasMore || false}
            onLoadMore={handleLoadMore}
            renderItem={renderItem}
            emptyText='Belum ada jadwal ujian tersedia'
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
        </motion.div>
      </motion.div>

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
              <BookOpen size={18} color={token.colorPrimary} />
            </div>
            <Text strong style={{ fontSize: 16 }}>
              {editingItem ? "Edit Jadwal Ujian" : "Buat Jadwal Ujian Baru"}
            </Text>
          </Flex>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnHidden
        centered
        width={720}
      >
        <ExamForm
          initialValues={editingItem}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleFormSuccess}
        />
      </Modal>
    </Suspense>
  );
};

export default ExamList;
