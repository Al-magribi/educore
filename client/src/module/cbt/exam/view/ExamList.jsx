import React, { useEffect, useMemo, useState } from "react";
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
  Space,
  Avatar,
  message,
  theme,
  Grid,
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
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { InfiniteScrollList } from "../../../../components";
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
    } catch (err) {
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

  const renderItem = (item) => {
    const statusColor = item.is_active ? "green" : "default";
    const classNames = item.classes?.map((c) => c.name).join(", ");
    const classLabel =
      item.class_count > 0 ? `${item.class_count} kelas` : "Belum ada kelas";

    return (
      <Card
        hoverable
        size='small'
        style={{
          height: "100%",
          borderRadius: 12,
          display: "flex",
          flexDirection: "column",
        }}
        styles={{
          body: {
            flex: 1,
            display: "flex",
            flexDirection: "column",
          },
        }}
        title={
          <Flex justify='space-between' align='center'>
            <Tag color={statusColor}>
              {item.is_active ? "Aktif" : "Nonaktif"}
            </Tag>
            <Text type='secondary' style={{ fontSize: 11 }}>
              {item.bank_type || "UJIAN"}
            </Text>
          </Flex>
        }
        actions={[
          <Tooltip title='Laporan' key='report'>
            <div
              onClick={() => handleReport(item)}
              style={{ display: "flex", justifyContent: "center" }}
            >
              <Folder size={16} />
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
        <Flex gap='middle' align='start' style={{ marginBottom: 12 }}>
          <div
            style={{
              background: token.colorPrimaryBg,
              padding: 10,
              borderRadius: 8,
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
            <Text type='secondary' style={{ fontSize: 12 }}>
              {item.bank_title} - {item.subject_name || "Mapel Umum"}
            </Text>
          </div>
        </Flex>

        <Space vertical size={4} style={{ marginBottom: 12 }}>
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
        </Space>

        <Flex align='center' gap={8} style={{ marginTop: "auto" }}>
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

  if (view === "report") {
    return (
      <>
        <Report exam_id={exam_id} exam_name={exam_name} token={token_exam} />
      </>
    );
  }
  if (view === "student_answers") {
    return (
      <>
        <StudentAnswers />
      </>
    );
  }

  if (view === "student_answers") {
    return (
      <>
        <StudentAnswers exam_id={exam_id} exam_name={exam_name} />
      </>
    );
  }

  return (
    <>
      <Flex vertical gap={"large"}>
        <Flex
          gap={"middle"}
          vertical={!!screens.xs}
          align={screens.xs ? "stretch" : "center"}
          justify='flex-end'
          style={{ width: screens.xs ? "100%" : "auto" }}
        >
          <Input
            prefix={<Search size={16} color='#999' />}
            style={{ width: screens.xs ? "100%" : "auto" }}
            placeholder={searchPlaceholder}
            allowClear
            onChange={(e) => {
              setTimeout(() => handleSearch(e.target.value), 500);
            }}
          />

          <Button
            icon={<Plus size={18} />}
            type='primary'
            onClick={() => openForm(null)}
            style={{ width: screens.xs ? "100%" : "auto" }}
          >
            Jadwal Ujian
          </Button>
        </Flex>

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
            md: 8,
            lg: 6,
          }}
          height='calc(100vh - 300px)'
        />
      </Flex>

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
    </>
  );
};

export default ExamList;

