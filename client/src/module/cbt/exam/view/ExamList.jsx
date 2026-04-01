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
  Layout,
  Statistic,
} from "antd";
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
const { Content } = Layout;

const ExamList = () => {
  const { token } = useToken();
  const screens = useBreakpoint();

  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view");
  const exam_id = searchParams.get("exam_id");
  const exam_name = searchParams.get("exam_name")?.replaceAll("-", " ");
  const token_exam = searchParams.get("token");

  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState("");
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

  const handleSearch = (val) => {
    setSearchText(val);
    setPage(1);
    setAllData([]);
  };

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

  const renderItem = (item) => {
    const statusColor = item.is_active ? "green" : "default";
    const classNames = item.classes?.map((c) => c.name).join(", ");
    const classLabel =
      item.class_count > 0 ? `${item.class_count} kelas` : "Belum ada kelas";

    return (
      <Card
        hoverable
        size="small"
        style={{
          height: "100%",
          borderRadius: 16,
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 14px 30px rgba(15, 23, 42, 0.06)",
        }}
        styles={{
          body: {
            flex: 1,
            display: "flex",
            flexDirection: "column",
          },
        }}
        title={
          <Flex justify="space-between" align="center">
            <Tag color={statusColor}>
              {item.is_active ? "Aktif" : "Nonaktif"}
            </Tag>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {item.bank_type || "UJIAN"}
            </Text>
          </Flex>
        }
        actions={[
          <Tooltip title="Laporan" key="report">
            <div
              onClick={() => handleReport(item)}
              style={{ display: "flex", justifyContent: "center" }}
            >
              <Folder size={16} />
            </div>
          </Tooltip>,
          <Tooltip title="Edit" key="edit">
            <div
              onClick={() => openForm(item)}
              style={{ display: "flex", justifyContent: "center" }}
            >
              <Edit size={16} />
            </div>
          </Tooltip>,
          <Tooltip title="Hapus" key="delete">
            <Popconfirm
              title="Hapus Jadwal Ujian?"
              onConfirm={() => handleDelete(item.id)}
              okText="Ya"
              cancelText="Batal"
              okButtonProps={{ danger: true }}
            >
              <div style={{ display: "flex", justifyContent: "center" }}>
                <Trash2 size={16} />
              </div>
            </Popconfirm>
          </Tooltip>,
        ]}
      >
        <Flex gap="middle" align="start" style={{ marginBottom: 12 }}>
          <div
            style={{
              background: token.colorPrimaryBg,
              padding: 10,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BookOpen size={20} color={token.colorPrimary} />
          </div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <Tooltip title={item.name}>
              <Title
                level={5}
                ellipsis={{ rows: 2 }}
                style={{ margin: "0 0 4px 0", fontSize: 15, lineHeight: 1.3 }}
              >
                {item.name}
              </Title>
            </Tooltip>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {item.bank_title} - {item.subject_name || "Mapel Umum"}
            </Text>
          </div>
        </Flex>

        <Flex vertical gap={4} style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 12 }}>Grade: {item.grade_name || "-"}</Text>
          <Tooltip title={classNames || ""}>
            <Text style={{ fontSize: 12 }}>
              <Users size={12} style={{ marginRight: 6 }} />
              {classLabel}
            </Text>
          </Tooltip>
          {item.token ? (
            <Text
              style={{ fontSize: 12 }}
              copyable={{
                text: item.token,
                tooltips: ["Copy token", "Token disalin"],
              }}
            >
              Token: {item.token}
            </Text>
          ) : (
            <Text style={{ fontSize: 12 }}>Token: -</Text>
          )}
          <Text style={{ fontSize: 12 }}>
            <Timer size={12} style={{ marginRight: 6 }} />
            {item.duration_minutes} menit
          </Text>
        </Flex>

        <Flex align="center" gap={8} style={{ marginTop: "auto" }}>
          <Avatar
            size={22}
            style={{
              backgroundColor: "#f0f0f0",
              color: "#666",
              fontSize: 10,
            }}
          >
            {(item.teacher_name || "?")
              .split(" ")
              .slice(0, 2)
              .map((n) => n[0])
              .join("")
              .toUpperCase()}
          </Avatar>
          <Text ellipsis style={{ fontSize: 12, color: "#666" }}>
            {item.teacher_name || "-"}
          </Text>
        </Flex>
      </Card>
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
      <>
        <Flex gap={16} wrap="wrap" style={{ marginBottom: 20 }}>
          {summaryCards.map((item) => (
            <Card
              key={item.key}
              style={{
                flex: screens.xl
                  ? "1 1 0"
                  : screens.md
                    ? "1 1 calc(50% - 8px)"
                    : "1 1 100%",
                minWidth: screens.md ? 0 : "100%",
              }}
              styles={{ body: { padding: "18px 20px" } }}
              hoverable
            >
              <Flex justify="space-between" align="start">
                <Statistic title={item.title} value={item.value} />
                <div
                  style={{
                    width: 42,
                    height: 42,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 14,
                    background: item.bg,
                    color: item.color,
                  }}
                >
                  {item.icon}
                </div>
              </Flex>
            </Card>
          ))}
        </Flex>

        <Card
          style={{ marginBottom: 18 }}
          styles={{ body: { padding: screens.md ? 20 : 16 } }}
          hoverable
        >
          <Flex
            gap={16}
            justify="space-between"
            align={screens.md ? "center" : "stretch"}
            vertical={!screens.md}
          >
            <div>
              <Title level={4} style={{ margin: 0 }}>
                Filter dan Aksi
              </Title>
              <Text type="secondary">
                Cari jadwal ujian dan lanjutkan membuat atau mengedit data.
              </Text>
            </div>

            <Flex
              gap={10}
              vertical={!screens.md}
              style={{ width: !screens.md ? "100%" : "auto" }}
            >
              <Input
                prefix={<Search size={16} color="rgba(0,0,0,.25)" />}
                style={{ width: !screens.md ? "100%" : 320 }}
                placeholder={searchPlaceholder}
                allowClear
                size="large"
                onChange={(e) => {
                  setTimeout(() => handleSearch(e.target.value), 500);
                }}
              />

              <Button
                icon={<Plus size={18} />}
                type="primary"
                onClick={() => openForm(null)}
                size="large"
              >
                Jadwal Ujian
              </Button>
            </Flex>
          </Flex>
        </Card>

        <InfiniteScrollList
          data={allData}
          loading={isFetching}
          hasMore={data?.hasMore || false}
          onLoadMore={handleLoadMore}
          renderItem={renderItem}
          emptyText="Belum ada jadwal ujian tersedia"
          grid={{
            gutter: [16, 16],
            xs: 24,
            sm: 12,
            md: 8,
            lg: 6,
          }}
          height="calc(100vh - 360px)"
        />
      </>

      <Modal
        title={
          <Flex align="center" gap={8}>
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
