import React, { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Flex,
  Input,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Globe,
  Monitor,
  RefreshCcw,
  Search,
  Settings2,
  UserCheck,
  UserX,
} from "lucide-react";
import {
  useAllowExamStudentMutation,
  useFinishExamStudentMutation,
  useRepeatExamStudentMutation,
  useGetExamAttendanceQuery,
} from "../../../../../service/cbt/ApiExam";
import { InfiniteScrollList } from "../../../../../components";

const { Text, Title } = Typography;
const MotionDiv = motion.div;

const AttendanceTable = ({
  data,
  examId,
  isMobile = false,
  isLoading = false,
}) => {
  const [pollingMinutes, setPollingMinutes] = useState(5);
  const { isLoading: pollingLoading } = useGetExamAttendanceQuery(
    { exam_id: examId },
    {
      skip: !examId,
      pollingInterval: pollingMinutes * 60 * 1000,
    },
  );
  const [allowExamStudent, { isLoading: allowLoading }] =
    useAllowExamStudentMutation();
  const [repeatExamStudent, { isLoading: repeatLoading }] =
    useRepeatExamStudentMutation();
  const [finishExamStudent, { isLoading: finishLoading }] =
    useFinishExamStudentMutation();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const tableLoading = isLoading || pollingLoading;
  const normalizeStatus = (value) => (value === "izin" ? "izinkan" : value);

  const classOptions = useMemo(() => {
    const classes = Array.from(
      new Set(data.map((item) => item.className).filter(Boolean)),
    );
    return classes.map((cls) => ({ value: cls, label: cls }));
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const normalizedStatus = normalizeStatus(item.status);
      const matchStatus =
        statusFilter === "all" ? true : normalizedStatus === statusFilter;
      const matchClass =
        classFilter === "all" ? true : item.className === classFilter;
      const matchSearch = `${item.nis} ${item.name} ${item.className}`
        .toLowerCase()
        .includes(searchText.toLowerCase());
      return matchStatus && matchClass && matchSearch;
    });
  }, [data, statusFilter, classFilter, searchText]);

  const statusCounts = useMemo(() => {
    const counts = {
      mengerjakan: 0,
      pelanggaran: 0,
      selesai: 0,
      belum_masuk: 0,
      izinkan: 0,
    };
    filteredData.forEach((item) => {
      const status = normalizeStatus(item.status);
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  }, [filteredData]);

  const getRibbon = (value) => {
    if (value === "mengerjakan") return { text: "Mengerjakan", color: "blue" };
    if (value === "pelanggaran") return { text: "Pelanggaran", color: "red" };
    if (value === "selesai") return { text: "Selesai", color: "green" };
    if (value === "izinkan") return { text: "Diizinkan", color: "gold" };
    return { text: "Belum Masuk", color: "default" };
  };

  const getActionDisabled = (status) => ({
    izinkan: status !== "mengerjakan" && status !== "pelanggaran",
    ulangi: status !== "selesai",
    selesaikan: status === "belum_masuk",
  });

  const confirmAllow = (student) => {
    Modal.confirm({
      title: "Izinkan Siswa?",
      content: "Siswa akan diizinkan masuk kembali tanpa mengubah waktu ujian.",
      okText: "Izinkan",
      cancelText: "Batal",
      onOk: async () => {
        try {
          await allowExamStudent({
            exam_id: examId,
            student_id: student.id,
          }).unwrap();
          message.success("Siswa diizinkan masuk ujian");
        } catch (error) {
          message.error(error?.data?.message || "Gagal mengizinkan siswa");
        }
      },
    });
  };

  const confirmRepeat = (student) => {
    Modal.confirm({
      title: "Ulangi Ujian Siswa?",
      content:
        "Log ujian dan semua jawaban siswa akan dihapus untuk ujian ini.",
      okText: "Ulangi",
      okButtonProps: { danger: true },
      cancelText: "Batal",
      onOk: async () => {
        try {
          await repeatExamStudent({
            exam_id: examId,
            student_id: student.id,
          }).unwrap();
          message.success("Ujian siswa diulang");
        } catch (error) {
          message.error(error?.data?.message || "Gagal mengulang ujian");
        }
      },
    });
  };

  const confirmFinish = (student) => {
    Modal.confirm({
      title: "Selesaikan Ujian Siswa?",
      content: "Status ujian siswa akan diubah menjadi selesai.",
      okText: "Selesaikan",
      okButtonProps: { danger: true },
      cancelText: "Batal",
      onOk: async () => {
        try {
          await finishExamStudent({
            exam_id: examId,
            student_id: student.id,
          }).unwrap();
          message.success("Ujian siswa diselesaikan");
        } catch (error) {
          message.error(error?.data?.message || "Gagal menyelesaikan ujian");
        }
      },
    });
  };

  const renderItem = (item) => {
    const normalizedStatus = normalizeStatus(item.status);
    const disabled = getActionDisabled(normalizedStatus);
    const ribbon = getRibbon(normalizedStatus);
    const statusToneMap = {
      mengerjakan: {
        background: "linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)",
        color: "#1d4ed8",
      },
      pelanggaran: {
        background: "linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%)",
        color: "#dc2626",
      },
      selesai: {
        background: "linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%)",
        color: "#15803d",
      },
      izinkan: {
        background: "linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)",
        color: "#b45309",
      },
      belum_masuk: {
        background: "linear-gradient(135deg, #e2e8f0 0%, #f8fafc 100%)",
        color: "#475569",
      },
    };
    const tone = statusToneMap[normalizedStatus] || statusToneMap.belum_masuk;

    return (
      <MotionDiv
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        style={{ height: "100%" }}
      >
        <Badge.Ribbon text={ribbon.text} color={ribbon.color}>
          <Card
            hoverable
            variant='borderless'
            size='small'
            style={{
              borderRadius: 20,
              height: "100%",
              overflow: "hidden",
              border: "1px solid rgba(148, 163, 184, 0.14)",
              boxShadow: "0 18px 34px rgba(15, 23, 42, 0.06)",
              background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
            }}
            styles={{
              body: {
                display: "flex",
                flexDirection: "column",
                gap: 14,
                padding: isMobile ? 14 : 16,
              },
            }}
          >
            <Flex justify='space-between' align='flex-start' gap={12}>
              <Space align='start' size={12} style={{ minWidth: 0 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: tone.background,
                    color: tone.color,
                    flexShrink: 0,
                    fontWeight: 700,
                  }}
                >
                  {String(item.name || "?")
                    .trim()
                    .charAt(0)
                    .toUpperCase() || "?"}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <Text strong style={{ fontSize: 15, display: "block" }}>
                    {item.name}
                  </Text>
                  <Text
                    type='secondary'
                    style={{
                      fontSize: 12,
                      display: "block",
                      margin: "8px 0 0",
                      borderRadius: 999,
                      background: tone.background,
                      color: tone.color,
                      borderColor: "transparent",
                      fontWeight: 700,
                    }}
                  >
                    {item.className || "-"} | NIS {item.nis}
                  </Text>
                </div>
              </Space>
            </Flex>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(2, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 14,
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                }}
              >
                <Space size={6} wrap>
                  <Globe size={14} color='#475569' />
                  <Text style={{ fontSize: 12 }}>{item.ip}</Text>
                </Space>
              </div>
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: 14,
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                }}
              >
                <Space size={6} wrap>
                  <Monitor size={14} color='#475569' />
                  <Text style={{ fontSize: 12 }}>{item.browser}</Text>
                </Space>
              </div>
            </div>

            <div
              style={{
                padding: "10px 12px",
                borderRadius: 14,
                background: "linear-gradient(180deg, #f8fbff 0%, #f1f5f9 100%)",
                border: "1px solid rgba(148, 163, 184, 0.14)",
              }}
            >
              <Text type='secondary' style={{ fontSize: 12 }}>
                Mulai Ujian
              </Text>
              <div style={{ marginTop: 4, fontWeight: 600, color: "#0f172a" }}>
                {item.startAt}
              </div>
            </div>

            <Flex
              wrap='wrap'
              gap={8}
              style={{ flexDirection: isMobile ? "column" : "row" }}
            >
              <Button
                size='small'
                icon={<UserCheck size={14} />}
                disabled={disabled.izinkan || allowLoading}
                onClick={() => confirmAllow(item)}
                block={isMobile}
              >
                Izinkan
              </Button>
              <Button
                size='small'
                icon={<RefreshCcw size={14} />}
                disabled={disabled.ulangi || repeatLoading}
                onClick={() => confirmRepeat(item)}
                block={isMobile}
              >
                Ulangi
              </Button>
              <Button
                size='small'
                danger
                icon={<UserX size={14} />}
                disabled={disabled.selesaikan || finishLoading}
                onClick={() => confirmFinish(item)}
                block={isMobile}
              >
                Selesaikan
              </Button>
            </Flex>
          </Card>
        </Badge.Ribbon>
      </MotionDiv>
    );
  };

  return (
    <MotionDiv initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <Card
        variant='borderless'
        style={{
          borderRadius: 24,
          boxShadow: "0 18px 36px rgba(15, 23, 42, 0.06)",
        }}
        styles={{ body: { padding: isMobile ? 16 : 20 } }}
      >
        <Space direction='vertical' size={18} style={{ width: "100%" }}>
          <Flex
            justify='space-between'
            align={isMobile ? "stretch" : "center"}
            wrap='wrap'
            gap={12}
            style={{ flexDirection: isMobile ? "column" : "row" }}
          >
            <Space direction='vertical' size={4} style={{ minWidth: 0 }}>
              <Text type='secondary'>Monitoring Peserta</Text>
              <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
                Kehadiran dan Aktivitas Ujian
              </Title>
              <Text type='secondary'>
                Pantau status peserta secara real-time dan lakukan tindakan
                cepat saat diperlukan.
              </Text>
            </Space>
            <Tag
              color='blue'
              icon={<CheckCircle2 size={12} />}
              style={{ margin: 0, borderRadius: 999 }}
            >
              Total Peserta: {data.length}
            </Tag>
          </Flex>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(4, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            {[
              {
                label: "Mengerjakan",
                value: statusCounts.mengerjakan,
                color: "#2563eb",
              },
              {
                label: "Pelanggaran",
                value: statusCounts.pelanggaran,
                color: "#dc2626",
              },
              {
                label: "Selesai",
                value: statusCounts.selesai,
                color: "#16a34a",
              },
              {
                label: "Belum Masuk",
                value: statusCounts.belum_masuk,
                color: "#64748b",
              },
            ].map((item) => (
              <Card
                key={item.label}
                variant='borderless'
                style={{ borderRadius: 18, background: "#f8fafc" }}
                styles={{ body: { padding: 16 } }}
              >
                <Text type='secondary'>{item.label}</Text>
                <Title
                  level={4}
                  style={{ margin: "4px 0 0", color: item.color }}
                >
                  {item.value}
                </Title>
              </Card>
            ))}
          </div>

          <Flex
            justify='space-between'
            align={isMobile ? "stretch" : "center"}
            wrap='wrap'
            gap={12}
            style={{ flexDirection: isMobile ? "column" : "row" }}
          >
            <Space
              wrap
              style={{
                width: isMobile ? "100%" : "auto",
                flexDirection: isMobile ? "column" : "row",
                alignItems: isMobile ? "stretch" : "center",
              }}
            >
              <Input
                allowClear
                prefix={<Search size={14} />}
                placeholder='Cari nama / NIS / kelas'
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                style={{ width: isMobile ? "100%" : 260 }}
              />
              <Select
                value={pollingMinutes}
                onChange={setPollingMinutes}
                style={{ width: isMobile ? "100%" : 180 }}
                options={[
                  { value: 1, label: "Auto Update 1 menit" },
                  { value: 2, label: "Auto Update 2 menit" },
                  { value: 3, label: "Auto Update 3 menit" },
                  { value: 4, label: "Auto Update 4 menit" },
                  { value: 5, label: "Auto Update 5 menit" },
                ]}
                virtual={false}
              />
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: isMobile ? "100%" : 180 }}
                options={[
                  { value: "all", label: "Semua Status" },
                  { value: "belum_masuk", label: "Belum Masuk" },
                  { value: "izinkan", label: "Diizinkan" },
                  { value: "mengerjakan", label: "Mengerjakan" },
                  { value: "pelanggaran", label: "Pelanggaran" },
                  { value: "selesai", label: "Selesai" },
                ]}
                virtual={false}
              />
              <Select
                value={classFilter}
                onChange={setClassFilter}
                style={{ width: isMobile ? "100%" : 180 }}
                options={[
                  { value: "all", label: "Semua Kelas" },
                  ...classOptions,
                ]}
                virtual={false}
              />
            </Space>
            <Tag
              color='purple'
              icon={<Settings2 size={12} />}
              style={{ margin: 0, borderRadius: 999 }}
            >
              Filter aktif: {filteredData.length} peserta
            </Tag>
          </Flex>

          <InfiniteScrollList
            data={filteredData}
            loading={tableLoading}
            hasMore={false}
            onLoadMore={() => {}}
            renderItem={renderItem}
            emptyText='Belum ada peserta ujian'
            grid={{
              gutter: [16, 16],
              xs: 24,
              sm: 24,
              md: 12,
              lg: 8,
              xl: 8,
              xxl: 6,
            }}
            height='auto'
          />
        </Space>
      </Card>
    </MotionDiv>
  );
};

export { AttendanceTable };
export default AttendanceTable;
