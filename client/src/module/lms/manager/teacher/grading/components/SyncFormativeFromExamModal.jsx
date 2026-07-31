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
  useLazyGetGradingSyncSummativePreviewQuery,
  useLazyGetGradingSyncFinalPreviewQuery,
  useSyncGradingFormativeFromExamMutation,
  useSyncGradingSummativeFromExamMutation,
  useSyncGradingFinalFromExamMutation,
} from "../../../../../../service/lms/ApiGrading";

const { Text } = Typography;

const TARGET_META = {
  formative: {
    label: "formatif",
    title: "Formatif",
    createsNewColumn: true,
  },
  summative: {
    label: "sumatif",
    title: "Sumatif",
    createsNewColumn: true,
  },
  final: {
    label: "ujian akhir",
    title: "Ujian Akhir",
    createsNewColumn: false,
  },
};

const SyncFormativeFromExamModal = ({
  open,
  onClose,
  subjectId,
  classId,
  month,
  semester,
  chapterId,
  onSynced,
  targetType = "formative",
}) => {
  const [search, setSearch] = useState("");
  const [selectedExamId, setSelectedExamId] = useState(null);
  const [step, setStep] = useState("pick");

  const meta = TARGET_META[targetType] || TARGET_META.formative;
  const isSummative = targetType === "summative";
  const isFinal = targetType === "final";

  const {
    data: examsRes,
    isLoading: isExamsLoading,
    isFetching: isExamsFetching,
  } = useGetGradingSyncExamsQuery(
    { subjectId, classId },
    { skip: !open || !subjectId || !classId },
  );

  const [fetchFormativePreview, { data: formativePreviewRes, isFetching: isFormativePreviewLoading }] =
    useLazyGetGradingSyncFormativePreviewQuery();
  const [fetchSummativePreview, { data: summativePreviewRes, isFetching: isSummativePreviewLoading }] =
    useLazyGetGradingSyncSummativePreviewQuery();
  const [fetchFinalPreview, { data: finalPreviewRes, isFetching: isFinalPreviewLoading }] =
    useLazyGetGradingSyncFinalPreviewQuery();
  const [syncFormative, { isLoading: isSyncingFormative }] =
    useSyncGradingFormativeFromExamMutation();
  const [syncSummative, { isLoading: isSyncingSummative }] =
    useSyncGradingSummativeFromExamMutation();
  const [syncFinal, { isLoading: isSyncingFinal }] =
    useSyncGradingFinalFromExamMutation();

  const previewRes = isFinal
    ? finalPreviewRes
    : isSummative
      ? summativePreviewRes
      : formativePreviewRes;
  const isPreviewLoading = isFinal
    ? isFinalPreviewLoading
    : isSummative
      ? isSummativePreviewLoading
      : isFormativePreviewLoading;
  const isSyncing = isFinal
    ? isSyncingFinal
    : isSummative
      ? isSyncingSummative
      : isSyncingFormative;

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
      if (isFinal) {
        await fetchFinalPreview({
          examId,
          subjectId,
          classId,
          semester,
        }).unwrap();
      } else if (isSummative) {
        await fetchSummativePreview({
          examId,
          subjectId,
          classId,
          month,
          semester,
        }).unwrap();
      } else {
        await fetchFormativePreview({
          examId,
          subjectId,
          classId,
          month,
          semester,
          chapterId,
        }).unwrap();
      }
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
      let res;
      if (isFinal) {
        res = await syncFinal({
          exam_id: selectedExamId,
          subject_id: subjectId,
          class_id: classId,
          semester,
        }).unwrap();
      } else if (isSummative) {
        res = await syncSummative({
          exam_id: selectedExamId,
          subject_id: subjectId,
          class_id: classId,
          month,
          semester,
        }).unwrap();
      } else {
        res = await syncFormative({
          exam_id: selectedExamId,
          subject_id: subjectId,
          class_id: classId,
          month,
          semester,
          chapter_id: chapterId,
        }).unwrap();
      }
      message.success(
        res?.message || `Sync nilai ${meta.label} berhasil.`,
      );
      if (onSynced) {
        await onSynced(res?.data);
      }
      onClose?.();
    } catch (error) {
      message.error(
        error?.data?.message || `Gagal sync nilai ${meta.label}.`,
      );
    }
  };

  const pickDescription = isFinal
    ? "Pilih jadwal ujian yang hasilnya ingin dipindahkan ke nilai Ujian Akhir semester yang sedang aktif. Nilai siswa yang punya hasil ujian akan ditimpa."
    : isSummative
      ? "Pilih jadwal ujian untuk nilai sumatif bulan yang sedang aktif. Sync sumatif tidak membutuhkan bab (cocok untuk UTS). Ujian yang sama boleh di-sync ke formatif, sumatif, dan ujian akhir."
      : "Pilih jadwal ujian yang hasilnya ingin dipindahkan ke nilai formatif bulan & bab yang sedang aktif. Ujian yang sama boleh di-sync ke formatif, sumatif, dan ujian akhir.";

  const previewDescription = preview
    ? isFinal
      ? `${preview.scored_count} dari ${preview.total_students} siswa punya hasil ujian. Nilai memakai rumus Nilai Akhir CBT (dibulatkan) dan akan menimpa nilai Ujian Akhir yang sudah ada untuk siswa tersebut. Siswa tanpa hasil tidak diubah.`
      : `${preview.scored_count} dari ${preview.total_students} siswa punya hasil ujian. Nilai memakai rumus Nilai Akhir CBT (dibulatkan ke bilangan bulat untuk ${meta.label}). Siswa tanpa hasil tidak diisi.`
    : undefined;

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
      title: `Ke ${meta.title}`,
      dataIndex: "score",
      key: "score",
      width: 120,
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
      title={`Sync Nilai ${meta.title} dari Jadwal Ujian`}
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
                {meta.createsNewColumn
                  ? "Sync ke Kolom Baru"
                  : "Sync ke Ujian Akhir"}
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
            message={
              meta.createsNewColumn
                ? `Sync selalu membuat kolom ${meta.label} baru.`
                : "Sync akan menimpa nilai Ujian Akhir siswa yang punya hasil ujian."
            }
            description={pickDescription}
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
                ? isFinal
                  ? `Akan sync ke Nilai Ujian Akhir dari "${preview.exam?.name || "-"}"`
                  : `Akan membuat ${preview.next_column_label} dari "${preview.exam?.name || "-"}"`
                : "Memuat preview..."
            }
            description={previewDescription}
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
