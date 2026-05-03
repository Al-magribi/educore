import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Flex,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { Filter, RefreshCcw, Users } from "lucide-react";
import { useGetClassesQuery } from "../../../../../service/lms/ApiLms";
import {
  useGetJournalSummaryRecapQuery,
  useGetRecapTeachersQuery,
} from "../../../../../service/lms/ApiRecap";

const { Title, Text } = Typography;

const statCardStyle = {
  borderRadius: 18,
  border: "1px solid rgba(148, 163, 184, 0.14)",
  background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
  boxShadow: "0 16px 32px rgba(15, 23, 42, 0.05)",
  height: "100%",
};

const RecapJournal = ({
  isActive,
  subjectId,
  subject,
  activePeriode,
  screens,
}) => {
  const [selectedClassId, setSelectedClassId] = useState("all");
  const [teacherId, setTeacherId] = useState("all");
  const [journalFilterDate, setJournalFilterDate] = useState(null);

  const normalizedClassId =
    selectedClassId === "all" ? null : Number(selectedClassId) || null;
  const normalizedTeacherId =
    teacherId === "all" ? null : Number(teacherId) || null;

  const { data: classRes, isLoading: classLoading } = useGetClassesQuery(
    { subjectId, gradeId: null },
    { skip: !isActive || !subjectId },
  );
  const classes = classRes?.data || [];

  const { data: teachersRes, isLoading: teacherLoading } =
    useGetRecapTeachersQuery(
      { subjectId, classId: normalizedClassId },
      { skip: !isActive || !subjectId },
    );
  const teachers = teachersRes?.data || [];

  const classOptions = useMemo(
    () => [
      { value: "all", label: "Semua kelas" },
      ...classes.map((item) => ({ value: String(item.id), label: item.name })),
    ],
    [classes],
  );

  const teacherOptions = useMemo(
    () => [
      { value: "all", label: "Semua guru" },
      ...teachers.map((item) => ({
        value: String(item.id),
        label: item.full_name,
      })),
    ],
    [teachers],
  );

  const validClassValue = useMemo(() => {
    if (selectedClassId === "all") return "all";
    return classes.some((item) => String(item.id) === String(selectedClassId))
      ? String(selectedClassId)
      : "all";
  }, [selectedClassId, classes]);

  const validTeacherValue = useMemo(() => {
    if (teacherId === "all") return "all";
    return teachers.some((item) => String(item.id) === String(teacherId))
      ? String(teacherId)
      : "all";
  }, [teacherId, teachers]);

  const dateValue = journalFilterDate?.format("YYYY-MM-DD");
  const { data: summaryRes, isFetching, refetch } = useGetJournalSummaryRecapQuery(
    {
      subjectId,
      teacherId: normalizedTeacherId,
      classId: normalizedClassId,
      date: dateValue,
    },
    { skip: !isActive || !subjectId },
  );

  const summaryData = summaryRes?.data || {};
  const items = summaryData?.items || [];

  const rows = useMemo(() => {
    return items.map((item, index) => ({
      ...item,
      no: index + 1,
      key: String(item.id || `${item.teacher_id}-${item.class_id}-${item.journal_date}-${index}`),
    }));
  }, [items]);

  const columns = [
    {
      title: "No",
      dataIndex: "no",
      width: 56,
      align: "center",
    },
    {
      title: "Tanggal",
      dataIndex: "journal_date",
      width: 130,
      render: (value) => dayjs(value).format("DD MMM YYYY"),
    },
    {
      title: "Kelas",
      dataIndex: "class_name",
      width: 120,
      render: (value) => <Text strong>{value || "-"}</Text>,
    },
    {
      title: "Pertemuan",
      dataIndex: "meeting_no",
      width: 110,
      align: "center",
      render: (value) => <Tag color="blue">Ke-{value}</Tag>,
    },
    {
      title: "Materi Pembelajaran",
      dataIndex: "learning_material",
      render: (value) => value || "-",
    },
    {
      title: "Kegiatan",
      dataIndex: "activity",
      render: (value) => (
        <div style={{ whiteSpace: "pre-wrap" }}>{value || "-"}</div>
      ),
    },
    {
      title: "Guru",
      dataIndex: "teacher_name",
      width: 140,
      render: (value) => <Tag>{value || "-"}</Tag>,
    },
  ];

  const handleClassChange = (value) => {
    setSelectedClassId(value);
    setTeacherId("all");
  };

  return (
    <Flex vertical gap={16}>
      <Card style={{ borderRadius: 16 }} styles={{ body: { padding: 20 } }}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
          <Space direction="vertical" size={2}>
            <Title level={5} style={{ margin: 0 }}>
              Ringkasan Jurnal
            </Title>
            <Text type="secondary">
              Materi jurnal, guru pengampu, dan peruntukan kelas pada mata
              pelajaran ini
            </Text>
          </Space>
          <Space wrap>
            <Tag color="blue">{subject?.name || "Mata Pelajaran"}</Tag>
            <Tag color="processing">
              {activePeriode?.name ||
                summaryData?.meta?.periode_name ||
                "Periode"}
            </Tag>
          </Space>
        </Flex>

        <Flex
          justify="space-between"
          align="center"
          wrap="wrap"
          gap={12}
          style={{ marginTop: 16 }}
        >
          <Space wrap>
            <Select
              value={validClassValue}
              onChange={handleClassChange}
              style={{ minWidth: 220 }}
              options={classOptions}
              loading={classLoading}
              suffixIcon={<Filter size={14} />}
              virtual={false}
              allowClear
              showSearch
              optionFilterProp="label"
              placeholder="Filter kelas"
            />
            {teachers.length > 1 && (
              <Select
                value={validTeacherValue}
                onChange={setTeacherId}
                style={{ minWidth: 240 }}
                options={teacherOptions}
                loading={teacherLoading}
                suffixIcon={<Filter size={14} />}
                virtual={false}
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="Filter guru"
              />
            )}
            <DatePicker
              value={journalFilterDate}
              onChange={setJournalFilterDate}
              format="DD MMM YYYY"
              placeholder="Filter tanggal"
              allowClear
            />
          </Space>
          <Button icon={<RefreshCcw size={14} />} onClick={refetch}>
            Refresh
          </Button>
        </Flex>

        <Row gutter={[16, 16]} style={{ marginTop: 2 }}>
          <Col xs={24} md={8}>
            <Card size="small" style={statCardStyle}>
              <Text type="secondary">Mata Pelajaran</Text>
              <Title level={5} style={{ margin: "4px 0 0" }}>
                {subject?.name || summaryData?.meta?.subject_name || "-"}
              </Title>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card size="small" style={statCardStyle}>
              <Text type="secondary">Total Jurnal</Text>
              <Title level={4} style={{ margin: "6px 0 0", color: "#1d4ed8" }}>
                {summaryData?.meta?.total_journals || 0}
              </Title>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card size="small" style={statCardStyle}>
              <Text type="secondary">Guru Pengisi</Text>
              <Title level={4} style={{ margin: "6px 0 0", color: "#15803d" }}>
                {summaryData?.meta?.total_teachers || 0}
              </Title>
            </Card>
          </Col>
        </Row>
      </Card>

      {!subjectId ? (
        <Alert type="info" showIcon message="Mata pelajaran belum dipilih." />
      ) : (
        <Card style={{ borderRadius: 16 }} styles={{ body: { padding: 0 } }}>
          {!isFetching && !rows.length ? (
            <div style={{ padding: 24 }}>
              <Empty description="Belum ada data jurnal pada filter ini." />
            </div>
          ) : (
            <Table
              rowKey="key"
              dataSource={rows}
              columns={columns}
              loading={isFetching}
              pagination={{ pageSize: 8 }}
              scroll={{ x: 1100 }}
              size={screens?.xs ? "small" : "middle"}
            />
          )}
        </Card>
      )}
    </Flex>
  );
};

export default RecapJournal;
