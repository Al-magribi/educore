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
import {
  DetailSection,
  RecapMobileList,
  RecapSectionHeader,
  RecapToolbar,
  RecordCard,
} from "./recapShared";
import {
  filterControlStyle,
  surfaceCardBody,
  surfaceCardStyle,
  tableCardBody,
  tableCardStyle,
  useRecapLayout,
} from "./recapStyles";

const { Title, Text } = Typography;

const statCardStyle = {
  borderRadius: 18,
  border: "1px solid rgba(148, 163, 184, 0.14)",
  background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
  boxShadow: "0 16px 32px rgba(15, 23, 42, 0.05)",
  height: "100%",
  minWidth: 0,
};

const formatJournalDate = (value) =>
  value ? dayjs(value).format("DD MMM YYYY") : "-";

const RecapJournal = ({
  isActive,
  subjectId,
  subject,
  activePeriode,
  screens,
}) => {
  const { screens: activeScreens, isMobile } = useRecapLayout(screens);
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
  const {
    data: summaryRes,
    isFetching,
    refetch,
  } = useGetJournalSummaryRecapQuery(
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

  const rows = useMemo(
    () =>
      items.map((item, index) => ({
        ...item,
        no: index + 1,
        key: String(
          item.id ||
            `${item.teacher_id}-${item.class_id}-${item.journal_date}-${index}`,
        ),
      })),
    [items],
  );

  const columns = [
    {
      title: "No",
      dataIndex: "no",
      width: 64,
      align: "center",
    },
    {
      title: "Tanggal",
      dataIndex: "journal_date",
      width: 130,
      render: formatJournalDate,
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
      render: (value) => <Tag color='blue'>Ke-{value}</Tag>,
    },
    {
      title: "Materi Pembelajaran",
      dataIndex: "learning_material",
      width: 240,
      render: (value) => value || "-",
    },
    {
      title: "Kegiatan",
      dataIndex: "activity",
      width: 280,
      render: (value) => (
        <div style={{ whiteSpace: "pre-wrap" }}>{value || "-"}</div>
      ),
    },
    {
      title: "Guru",
      dataIndex: "teacher_name",
      width: 150,
      render: (value) => <Tag>{value || "-"}</Tag>,
    },
  ];

  const handleClassChange = (value) => {
    setSelectedClassId(value);
    setTeacherId("all");
  };

  const statItems = [
    {
      key: "subject",
      label: "Mata Pelajaran",
      value: subject?.name || summaryData?.meta?.subject_name || "-",
      level: 5,
      color: undefined,
    },
    {
      key: "journals",
      label: "Total Jurnal",
      value: summaryData?.meta?.total_journals || 0,
      level: 4,
      color: "#1d4ed8",
    },
    {
      key: "teachers",
      label: "Guru Pengisi",
      value: summaryData?.meta?.total_teachers || 0,
      level: 4,
      color: "#15803d",
    },
  ];

  const renderMobileCard = (row) => (
    <RecordCard
      index={row.no}
      title={row.class_name || "-"}
      subtitle={formatJournalDate(row.journal_date)}
      extra={
        <Tag color='blue' style={{ margin: 0 }}>
          Ke-{row.meeting_no}
        </Tag>
      }
    >
      <DetailSection title='Materi Pembelajaran'>
        <Text style={{ fontSize: 13 }}>{row.learning_material || "-"}</Text>
      </DetailSection>
      <DetailSection title='Kegiatan'>
        <Text style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>
          {row.activity || "-"}
        </Text>
      </DetailSection>
      <DetailSection title='Guru'>
        <Tag style={{ margin: 0 }}>{row.teacher_name || "-"}</Tag>
      </DetailSection>
    </RecordCard>
  );

  return (
    <Flex vertical gap={16} style={{ width: "100%", minWidth: 0 }}>
      <Card style={surfaceCardStyle} styles={surfaceCardBody(isMobile)}>
        <RecapSectionHeader
          isMobile={isMobile}
          title='Ringkasan Jurnal'
          description='Materi jurnal, guru pengampu, dan peruntukan kelas pada mata pelajaran ini'
          tags={
            <>
              <Tag color='blue' style={{ margin: 0 }}>
                {subject?.name || "Mata Pelajaran"}
              </Tag>
              <Tag color='processing' style={{ margin: 0 }}>
                {activePeriode?.name ||
                  summaryData?.meta?.periode_name ||
                  "Periode"}
              </Tag>
            </>
          }
        />

        <RecapToolbar
          isMobile={isMobile}
          filters={
            <>
              <Select
                value={validClassValue}
                onChange={handleClassChange}
                style={filterControlStyle(isMobile, 220)}
                options={classOptions}
                loading={classLoading}
                suffixIcon={<Filter size={14} />}
                virtual={false}
                allowClear
                showSearch={{ optionFilterProp: "label" }}
                placeholder='Filter kelas'
              />
              {teachers.length > 1 && (
                <Select
                  value={validTeacherValue}
                  onChange={setTeacherId}
                  style={filterControlStyle(isMobile, 240)}
                  options={teacherOptions}
                  loading={teacherLoading}
                  suffixIcon={<Filter size={14} />}
                  virtual={false}
                  allowClear
                  showSearch={{ optionFilterProp: "label" }}
                  placeholder='Filter guru'
                />
              )}
              <DatePicker
                value={journalFilterDate}
                onChange={setJournalFilterDate}
                format='DD MMM YYYY'
                placeholder='Filter tanggal'
                allowClear
                style={filterControlStyle(isMobile, 180)}
              />
            </>
          }
          actions={
            <Button
              icon={<RefreshCcw size={14} />}
              onClick={refetch}
              block={isMobile}
            >
              Refresh
            </Button>
          }
        />

        <Row
          gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]}
          style={{ marginTop: 16 }}
        >
          {statItems.map((item) => (
            <Col key={item.key} xs={24} sm={8} style={{ minWidth: 0 }}>
              <Card
                size='small'
                style={statCardStyle}
                styles={{ body: { padding: isMobile ? 12 : 16 } }}
              >
                <Text type='secondary' style={{ fontSize: 12 }}>
                  {item.label}
                </Text>
                <Title
                  level={item.level}
                  ellipsis={{ tooltip: String(item.value) }}
                  style={{ margin: "4px 0 0", color: item.color }}
                >
                  {item.value}
                </Title>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {!subjectId ? (
        <Alert type='info' showIcon title='Mata pelajaran belum dipilih.' />
      ) : isMobile ? (
        <RecapMobileList
          dataSource={rows}
          loading={isFetching}
          emptyText='Belum ada data jurnal pada filter ini.'
          renderItem={renderMobileCard}
        />
      ) : (
        <Card style={tableCardStyle} styles={tableCardBody}>
          {!isFetching && !rows.length ? (
            <div style={{ padding: 24 }}>
              <Empty description='Belum ada data jurnal pada filter ini.' />
            </div>
          ) : (
            <Table
              rowKey='key'
              dataSource={rows}
              columns={columns}
              loading={isFetching}
              pagination={{ pageSize: 8, showSizeChanger: false }}
              scroll={{ x: 1180 }}
              size={activeScreens.lg ? "middle" : "small"}
              sticky
            />
          )}
        </Card>
      )}
    </Flex>
  );
};

export default RecapJournal;
