import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Empty,
  Flex,
  Input,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { RefreshCw, Search } from "lucide-react";
import dayjs from "dayjs";
import {
  useGetGradingSyncExamsQuery,
  useLazyGetGradingSyncFormativePreviewQuery,
  useSyncGradingFormativeFromExamMutation,
} from "../../../../../../service/lms/ApiGrading";

const { Text } = Typography;

const SyncFormativeFromExamModal = ({
  open,
  onClose,
  subjectId,
  classId,
  month,
  semester,
  chapterId,
  onSynced,
}) => {
  const [search, setSearch] = useState("");
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [step, setStep] = useState("pick");

  const {
    data: examsRes,
    isLoading: isExamsLoading,
    isFetching: isExamsFetching,
  } = useGetGradingSyncExamsQuery(
    { subjectId, classId },
    { skip: !open || !subjectId || !classId },
  );

  const [fetchPreview, { data: previewRes, isFetching: isPreviewLoading }] =
    useLazyGetGradingSyncFormativePreviewQuery();
  const [syncFormative, { isLoading: isSyncing }] =
    useSyncGradingFormativeFromExamMutation();

  useEffect(() => {
    if (!open) {
      setSearch("");
      setSelectedExamId(null);
      setStep("pick");
    }
  }, [open]);

  const exams = useMemo(() => examsRes?.data?.exams || [], [examsRes]);
  const filteredExams = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return exams;
    return exams.filter((exam) => {
      const haystack = `${exam.name || ""} ${exam.bank_title || ""}`.toLowerCase();
      return haystack.includes(keyword);
    });
  }, [exams, search]);

  const preview = previewRes?.data || null;
  const previewStudents = preview?.students || [];

  const handleSelectExam = async (examId) => {
    setSelectedExamId(examId);
    try {
      await fetchPreview({
        examId,
        subjectId,
        classId,
        month,
        semester,
        chapterId,
      }).unwrap();
      setStep("preview");
    } catch (error) {
      message.error(
        error?.data?.message || "Gagal memuat preview hasil ujian.",
      );
    }
  };

  const handleSync = async () => {
    if (!selectedExamId) return;
    try {
      const res = await syncFormative({
        exam_id: selectedExamId,
        subject_id: subjectId,
        class_id: classId,
        month,
        semester,
        chapter_id: chapterId,
      }).unwrap();
      message.success(res?.message || "Sync nilai formatif berhasil.");
      onSynced?.(res?.data);
      onClose?.();
    } catch (error) {
      message.error(error?.data?.message || "Gagal sync nilai formatif.");
    }
  };

  const examColumns = [
    {
      title: "Jadwal Ujian",
      key: "name",
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Text strong>{record.name || "-"}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.bank_title || "Bank soal"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Hasil",
      dataIndex: "scored_count",
      key: "scored_count",
      width: 110,
      render: (value) => (
        <Tag color={Number(value) > 0 ? "green" : "default"}>
          {Number(value) || 0} siswa
        </Tag>
      ),
    },
    {
      title: "Tanggal",
      dataIndex: "created_at",
      key: "created_at",
      width: 120,
      render: (value) =>
        value ? dayjs(value).format("DD/MM/YYYY") : "-",
    },
    {
      title: "",
      key: "action",
      width: 100,
      render: (_, record) => (
        <Button
          type="link"
          disabled={!Number(record.scored_count)}
          onClick={() => handleSelectExam(record.id)}
        >
          Pilih
        </Button>
      ),
    },
  ];

  const previewColumns = [
    {
      title: "NIS",
      dataIndex: "nis",
      key: "nis",
      width: 120,
      render: (value) => value || "-",
    },
    {
      title: "Nama",
      dataIndex: "full_name",
      key: "full_name",
      render: (value) => <Text strong>{value || "-"}</Text>,
    },
    {
      title: "Nilai Akhir CBT",
      dataIndex: "score_precise",
      key: "score_precise",
      width: 140,
      render: (value, record) => {
        if (!record.has_score) {
          return <Text type="secondary">Belum ujian</Text>;
        }
        const precise =
          value === null || value === undefined ? record.score : value;
        return <Tag color="blue">{precise}</Tag>;
      },
    },
    {
      title: "Ke Formatif",
      dataIndex: "score",
      key: "score",
      width: 110,
      render: (value, record) =>
        record.has_score ? (
          <Tag color="green">{value}</Tag>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="Sync Nilai dari Jadwal Ujian"
      width={780}
      destroyOnHidden
      footer={
        step === "preview" ? (
          <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
            <Button onClick={() => setStep("pick")}>Kembali</Button>
            <Space>
              <Button onClick={onClose}>Batal</Button>
              <Button
                type="primary"
                icon={<RefreshCw size={14} />}
                loading={isSyncing}
                disabled={!preview?.scored_count}
                onClick={handleSync}
              >
                Sync ke Kolom Baru
              </Button>
            </Space>
          </Flex>
        ) : (
          <Flex justify="end">
            <Button onClick={onClose}>Tutup</Button>
          </Flex>
        )
      }
    >
      {step === "pick" ? (
        <Space orientation="vertical" size={12} style={{ width: "100%" }}>
          <Alert
            type="info"
            showIcon
            message="Sync selalu membuat kolom formatif baru."
            description="Pilih jadwal ujian yang hasilnya ingin dipindahkan ke nilai formatif bulan & bab yang sedang aktif."
          />
          <Input
            allowClear
            prefix={<Search size={14} />}
            placeholder="Cari nama ujian / bank soal"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Table
            rowKey={(record) => record.id}
            size="small"
            loading={isExamsLoading || isExamsFetching}
            dataSource={filteredExams}
            columns={examColumns}
            pagination={{ pageSize: 6, hideOnSinglePage: true }}
            locale={{
              emptyText: (
                <Empty description="Tidak ada jadwal ujian untuk mapel & kelas ini." />
              ),
            }}
          />
        </Space>
      ) : (
        <Space orientation="vertical" size={12} style={{ width: "100%" }}>
          <Alert
            type="success"
            showIcon
            message={
              preview
                ? `Akan membuat ${preview.next_column_label} dari "${preview.exam?.name || "-"}"`
                : "Memuat preview..."
            }
            description={
              preview
                ? `${preview.scored_count} dari ${preview.total_students} siswa punya hasil ujian. Nilai memakai rumus Nilai Akhir CBT (dibulatkan ke bilangan bulat untuk formatif). Siswa tanpa hasil tidak diisi.`
                : undefined
            }
          />
          <Table
            rowKey={(record) => record.student_id}
            size="small"
            loading={isPreviewLoading}
            dataSource={previewStudents}
            columns={previewColumns}
            pagination={{ pageSize: 8, hideOnSinglePage: true }}
            scroll={{ y: 320 }}
          />
        </Space>
      )}
    </Modal>
  );
};

export default SyncFormativeFromExamModal;
