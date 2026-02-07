import React, { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  Flex,
  Input,
  Select,
  Space,
  Tag,
  Typography,
  Modal,
  message,
} from "antd";
import {
  CheckCircle2,
  Globe,
  Monitor,
  RefreshCcw,
  UserCheck,
  UserX,
  Eye,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import {
  useAllowExamStudentMutation,
  useFinishExamStudentMutation,
  useRepeatExamStudentMutation,
  useGetExamAttendanceQuery,
} from "../../../../../service/cbt/ApiExam";
import { InfiniteScrollList } from "../../../../../components";

const { Text } = Typography;

const AttendanceTable = ({ data, examId }) => {
  const [pollingMinutes, setPollingMinutes] = useState(5);
  useGetExamAttendanceQuery(
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

  const [searchParams, setSearchParams] = useSearchParams();
  const examName = searchParams.get("exam_name");

  const [statusFilter, setStatusFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [classFilter, setClassFilter] = useState("all");

  const classOptions = useMemo(() => {
    const classes = Array.from(
      new Set(data.map((item) => item.className).filter(Boolean)),
    );
    return classes.map((cls) => ({ value: cls, label: cls }));
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchStatus =
        statusFilter === "all" ? true : item.status === statusFilter;
      const matchClass =
        classFilter === "all" ? true : item.className === classFilter;
      const matchSearch = `${item.nis} ${item.name} ${item.className}`
        .toLowerCase()
        .includes(searchText.toLowerCase());
      return matchStatus && matchClass && matchSearch;
    });
  }, [data, statusFilter, classFilter, searchText]);

  const getRibbon = (value) => {
    if (value === "mengerjakan") {
      return { text: "Mengerjakan", color: "blue" };
    }
    if (value === "pelanggaran") {
      return { text: "Pelanggaran", color: "red" };
    }
    if (value === "selesai") {
      return { text: "Selesai", color: "green" };
    }
    if (value === "izinkan") {
      return { text: "Diizinkan", color: "gold" };
    }
    return { text: "Belum Masuk", color: "grey" };
  };

  const getActionDisabled = (status) => {
    return {
      jawaban:
        status === "pelanggaran" ||
        status === "belum_masuk" ||
        status === "izinkan",
      izinkan:
        status !== "mengerjakan",
      ulangi: status === "belum_masuk",
      selesaikan: status === "belum_masuk" || status === "selesai",
    };
  };

  const handleAnswers = (student) => {
    setSearchParams({
      view: "student_answers",
      exam_id: examId,
      exam_name: examName,
      student_name: (student.name || "").replaceAll(" ", "-"),
      student_id: student.id,
      student_class: (student.className || "").replaceAll(" ", "-"),
      student_nis: student.nis || "",
    });
  };

  const confirmAllow = (student) => {
    Modal.confirm({
      title: "Izinkan Siswa?",
      content:
        "Siswa akan diizinkan masuk kembali tanpa mengubah waktu ujian.",
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
    const disabled = getActionDisabled(item.status);
    return (
      <Badge.Ribbon
        text={getRibbon(item.status).text}
        color={getRibbon(item.status).color}
      >
        <Card
          hoverable
          size="small"
          style={{ borderRadius: 14, height: "100%" }}
          styles={{
            body: { display: "flex", flexDirection: "column", gap: 12 },
          }}
          title={<Text type="secondary">NIS {item.nis}</Text>}
        >
          <div>
            <Text strong style={{ fontSize: 15 }}>
              {item.name}
            </Text>
            <div style={{ color: "#667085", fontSize: 12 }}>
              {item.className}
            </div>
          </div>

          <Flex wrap="wrap" gap={12}>
            <Space size={6}>
              <Globe size={14} />
              <Text>{item.ip}</Text>
            </Space>
            <Space size={6}>
              <Monitor size={14} />
              <Text>{item.browser}</Text>
            </Space>
            <Text type="secondary">Mulai: {item.startAt}</Text>
          </Flex>

          <Flex wrap="wrap" gap={8}>
            <Button
              size="small"
              icon={<Eye size={14} />}
              disabled={disabled.jawaban}
              onClick={() => handleAnswers(item)}
            >
              Jawaban
            </Button>
            <Button
              size="small"
              icon={<UserCheck size={14} />}
              disabled={disabled.izinkan || allowLoading}
              onClick={() => confirmAllow(item)}
            >
              Izinkan
            </Button>
            <Button
              size="small"
              icon={<RefreshCcw size={14} />}
              disabled={disabled.ulangi || repeatLoading}
              onClick={() => confirmRepeat(item)}
            >
              Ulangi
            </Button>
            <Button
              size="small"
              danger
              icon={<UserX size={14} />}
              disabled={disabled.selesaikan || finishLoading}
              onClick={() => confirmFinish(item)}
            >
              Selesaikan
            </Button>
          </Flex>
        </Card>
      </Badge.Ribbon>
    );
  };

  return (
    <>
      <Card style={{ borderRadius: 16 }} styles={{ body: { padding: 20 } }}>
        <Flex
          justify="space-between"
          align="center"
          wrap="wrap"
          gap={12}
          style={{ marginBottom: 16 }}
        >
          <Space wrap>
            <Input.Search
              placeholder="Cari nama / NIS / kelas"
              allowClear
              onSearch={(value) => setSearchText(value)}
              style={{ width: 260 }}
            />
            <Select
              value={pollingMinutes}
              onChange={setPollingMinutes}
              style={{ width: 180 }}
              options={[
                { value: 1, label: "Auto Refetch 1 menit" },
                { value: 2, label: "Auto Refetch 2 menit" },
                { value: 3, label: "Auto Refetch 3 menit" },
                { value: 4, label: "Auto Refetch 4 menit" },
                { value: 5, label: "Auto Refetch 5 menit" },
              ]}
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 180 }}
              options={[
                { value: "all", label: "Semua Status" },
                { value: "belum_masuk", label: "Belum Masuk" },
                { value: "izinkan", label: "Diizinkan" },
                { value: "mengerjakan", label: "Mengerjakan" },
                { value: "pelanggaran", label: "Pelanggaran" },
                { value: "selesai", label: "Selesai" },
              ]}
            />
            <Select
              value={classFilter}
              onChange={setClassFilter}
              style={{ width: 180 }}
              options={[{ value: "all", label: "Semua Kelas" }, ...classOptions]}
            />
          </Space>
          <Tag color="blue" icon={<CheckCircle2 size={12} />}>
            Total Peserta: {data.length}
          </Tag>
        </Flex>

        <InfiniteScrollList
          data={filteredData}
          loading={false}
          hasMore={false}
          onLoadMore={() => {}}
          renderItem={renderItem}
          emptyText="Belum ada peserta ujian"
          grid={{
            gutter: [16, 16],
            xs: 24,
            sm: 24,
            md: 12,
            lg: 8,
            xl: 8,
            xxl: 6,
          }}
          height="auto"
        />
      </Card>
    </>
  );
};

export { AttendanceTable };
export default AttendanceTable;
