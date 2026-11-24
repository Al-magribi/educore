import React, { Suspense, useEffect, useState } from "react";
import {
  Alert,
  Button,
  Col,
  Flex,
  Grid,
  Modal,
  Row,
  Skeleton,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import { motion } from "framer-motion";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  KeyRound,
  Pencil,
  Timer,
  UserRound,
  Users,
} from "lucide-react";
import { createSearchParams, useLocation, useSearchParams } from "react-router-dom";
import { InfiniteScrollList, LoadApp } from "../../../../components";
import PageHeader from "../../../../components/ui/PageHeader";
import { CardTitle, IconBox } from "../../../../components/ui/muse";
import {
  DataListCard,
  EditDeleteActions,
} from "../../../../components/ui/muse/DataSection";
import { museColors, museRadius } from "../../../../config/theme";
import {
  useGetExamsQuery,
  useDeleteExamMutation,
} from "../../../../service/cbt/ApiExam";
import ExamForm from "../components/ExamForm";
import Report from "../report/Report";
import StudentAnswers from "../report/components/answer/StudentAnswers";

const { Text } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const MetaLine = ({ icon, children }) => (
  <Flex align='center' gap={8} style={{ minWidth: 0, color: museColors.muted }}>
    <span style={{ display: "inline-flex", flexShrink: 0 }}>{icon}</span>
    <Text type='secondary' ellipsis style={{ fontSize: 13, minWidth: 0 }}>
      {children}
    </Text>
  </Flex>
);

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "-";

const ExamList = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const location = useLocation();

  const [searchParams] = useSearchParams();
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

  const { data, isFetching, isError, error } = useGetExamsQuery({
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

  const buildReportUrl = (item) => {
    const reportParams = createSearchParams({
      view: "report",
      exam_id: item.id,
      exam_name: item.name?.replaceAll(" ", "-"),
      token: item.token,
    });

    return `${location.pathname}?${reportParams.toString()}`;
  };

  const toNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const renderItem = (item) => {
    const classNames = item.classes?.map((c) => c.name).join(", ");
    const classLabel =
      toNumber(item.class_count) > 0
        ? `${item.class_count} kelas`
        : "Belum ada kelas";

    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 14,
          padding: 16,
          background: "#fff",
          border: `1px solid ${museColors.divider}`,
          borderRadius: museRadius.card,
        }}
      >
        <Flex align='flex-start' gap={12}>
          <IconBox icon={<ClipboardList size={18} />} tone='primarySoft' size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text
              strong
              ellipsis={{ tooltip: item.name }}
              style={{ display: "block", fontSize: 15 }}
            >
              {item.name}
            </Text>
            <Text type='secondary' ellipsis style={{ fontSize: 12, display: "block" }}>
              {item.bank_title || "Tanpa bank"} · {item.subject_name || "Mapel umum"}
            </Text>
          </div>
          <Tag color={item.is_active ? "green" : "default"} style={{ margin: 0 }}>
            {item.is_active ? "Aktif" : "Nonaktif"}
          </Tag>
        </Flex>

        <Flex vertical gap={6}>
          <MetaLine icon={<GraduationCap size={14} />}>
            Tingkat {item.grade_name || "-"}
          </MetaLine>
          <Tooltip title={classNames || undefined}>
            <div>
              <MetaLine icon={<Users size={14} />}>{classLabel}</MetaLine>
            </div>
          </Tooltip>
          <MetaLine icon={<Timer size={14} />}>
            {item.duration_minutes || 0} menit
          </MetaLine>
          <MetaLine icon={<UserRound size={14} />}>
            {item.teacher_name || "Belum ada pengampu"}
          </MetaLine>
          <MetaLine icon={<CalendarDays size={14} />}>
            Dibuat {formatDate(item.created_at)}
          </MetaLine>
        </Flex>

        <Flex
          align='center'
          justify='space-between'
          gap={8}
          style={{
            padding: "8px 12px",
            borderRadius: museRadius.item,
            background: museColors.bgSoft,
          }}
        >
          <Flex align='center' gap={8} style={{ minWidth: 0 }}>
            <KeyRound size={14} color={museColors.muted} />
            <Text type='secondary' style={{ fontSize: 12 }}>
              Token
            </Text>
          </Flex>
          {item.token ? (
            <Text
              strong
              style={{ fontFamily: "monospace", letterSpacing: 1 }}
              copyable={{
                text: item.token,
                tooltips: ["Salin token", "Token disalin"],
              }}
            >
              {item.token}
            </Text>
          ) : (
            <Text type='secondary'>-</Text>
          )}
        </Flex>

        <Flex
          align='center'
          justify='space-between'
          gap={8}
          style={{
            marginTop: "auto",
            paddingTop: 12,
            borderTop: `1px solid ${museColors.divider}`,
          }}
        >
          <Button
            href={buildReportUrl(item)}
            target='_blank'
            rel='noopener noreferrer'
            icon={<BarChart3 size={16} />}
            aria-label={`Buka laporan ${item.name} di tab baru`}
          >
            Laporan
          </Button>
          <Flex gap={4}>
            <EditDeleteActions
              onEdit={() => openForm(item)}
              onDelete={() => handleDelete(item.id)}
              deleteTitle={`Hapus jadwal ${item.name}?`}
              deleteDescription='Data kehadiran dan jawaban siswa ujian ini ikut terhapus.'
            />
          </Flex>
        </Flex>
      </div>
    );
  };

  const totalExams = toNumber(data?.totalData || data?.total || allData.length);
  const isInitialLoading = isFetching && allData.length === 0;

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
      <MotionDiv
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <Flex vertical gap={isMobile ? 16 : 24} style={{ minWidth: 0 }}>
          <PageHeader
            title='Jadwal Ujian'
            description='Kelola jadwal, token, dan pelaksanaan ujian. Laporan dibuka di tab baru.'
          />

          {isError ? (
            <Alert
              type='error'
              showIcon
              title='Gagal memuat jadwal ujian'
              description={
                error?.data?.message || "Periksa koneksi lalu muat ulang halaman."
              }
            />
          ) : null}

          <DataListCard
            icon={<ClipboardList size={16} />}
            title='Daftar Jadwal Ujian'
            count={totalExams}
            unit='jadwal'
            flush={false}
            searchProps={{
              placeholder: "Cari ujian, bank soal, mapel, atau guru",
              value: searchInput,
              onChange: (e) => setSearchInput(e.target.value),
            }}
            onAdd={() => openForm(null)}
            addLabel='Jadwal Ujian'
          >
            {isInitialLoading ? (
              <Row gutter={[16, 16]}>
                {[1, 2, 3].map((key) => (
                  <Col key={key} xs={24} md={12} xl={8}>
                    <Skeleton active avatar paragraph={{ rows: 4 }} />
                  </Col>
                ))}
              </Row>
            ) : (
              <InfiniteScrollList
                data={allData}
                loading={isFetching}
                hasMore={data?.hasMore || false}
                onLoadMore={handleLoadMore}
                renderItem={renderItem}
                height='auto'
                emptyText={
                  searchText
                    ? "Jadwal ujian tidak ditemukan. Coba kata kunci lain."
                    : "Belum ada jadwal ujian. Klik tombol Jadwal Ujian untuk membuat yang pertama."
                }
                grid={{ gutter: [16, 16], xs: 24, md: 12, xl: 8, xxl: 6 }}
              />
            )}
          </DataListCard>
        </Flex>
      </MotionDiv>

      <Modal
        title={
          <CardTitle
            icon={editingItem ? <Pencil size={16} /> : <ClipboardList size={16} />}
            title={editingItem ? "Edit Jadwal Ujian" : "Buat Jadwal Ujian"}
            description='Atur bank soal, kelas peserta, durasi, dan aturan ujian.'
          />
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        destroyOnHidden
        centered
        width={isMobile ? "calc(100vw - 24px)" : 720}
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
