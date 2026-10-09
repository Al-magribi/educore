import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Grid,
  Input,
  Row,
  Segmented,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  CircleAlert,
  Download,
  ExternalLink,
  FilePen,
  FileUp,
  NotebookText,
  Search,
  Users,
} from "lucide-react";
import {
  useGetGradesQuery,
  useGetSubjectsQuery,
} from "../../../../service/lms/ApiLms";
import { useGetTeachingModuleMonitoringQuery } from "../../../../service/lms/ApiTeachingModule";
import useTeachingModuleActions from "../useTeachingModuleActions";
import { SOURCE_META } from "../sourceMeta";

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

const EMPTY_LIST = [];

const STATUS_OPTIONS = [
  { value: "all", label: "Semua" },
  { value: "created", label: "Sudah membuat" },
  { value: "uploaded", label: "Sudah upload" },
  { value: "empty", label: "Belum ada modul" },
];

const formatDateTime = (value) =>
  value ? dayjs(value).format("DD MMM YYYY HH:mm") : "-";

const groupByTeacher = (rows) => {
  const map = new Map();
  rows.forEach((row) => {
    if (!map.has(row.teacher_id)) {
      map.set(row.teacher_id, {
        key: row.teacher_id,
        teacher_id: row.teacher_id,
        teacher_name: row.teacher_name,
        teacher_nip: row.teacher_nip,
        subjects: [],
        created_count: 0,
        uploaded_count: 0,
        last_updated_at: null,
      });
    }
    const teacher = map.get(row.teacher_id);
    teacher.subjects.push(row);
    teacher.created_count += row.created_count;
    teacher.uploaded_count += row.uploaded_count;
    if (
      row.last_updated_at &&
      (!teacher.last_updated_at ||
        dayjs(row.last_updated_at).isAfter(teacher.last_updated_at))
    ) {
      teacher.last_updated_at = row.last_updated_at;
    }
  });
  return Array.from(map.values());
};

const matchesStatus = (teacher, status) => {
  if (status === "created") return teacher.created_count > 0;
  if (status === "uploaded") return teacher.uploaded_count > 0;
  if (status === "empty")
    return teacher.created_count + teacher.uploaded_count === 0;
  return true;
};

const statusTag = (teacher) => {
  const total = teacher.created_count + teacher.uploaded_count;
  if (total === 0) return <Tag color='red'>Belum ada modul</Tag>;
  return <Tag color='green'>{total} modul</Tag>;
};

const ModuleItem = ({ module, actions }) => {
  const source = SOURCE_META[module.source_type] || SOURCE_META.created;
  const isUploaded = module.source_type === "uploaded";
  return (
    <Flex
      justify='space-between'
      align='center'
      gap={8}
      wrap='wrap'
      style={{
        padding: "8px 12px",
        borderRadius: 10,
        background: "#fff",
        border: "1px solid #e2e8f0",
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <Text strong style={{ display: "block" }}>
          {module.title}
        </Text>
        <Space size={[6, 4]} wrap>
          <Tag color='geekblue' style={{ marginRight: 0 }}>
            Tingkat {module.grade_name || "-"}
          </Tag>
          <Tag color={source.color} style={{ marginRight: 0 }}>
            {source.label}
          </Tag>
          <Text type='secondary' style={{ fontSize: 12 }}>
            Diperbarui {formatDateTime(module.updated_at)}
          </Text>
        </Space>
      </div>
      <Space size={6}>
        <Button
          size='small'
          icon={<ExternalLink size={14} />}
          loading={actions.isBusy(module, "open")}
          onClick={() => actions.openModule(module)}
        >
          {isUploaded ? "Buka" : "Lihat"}
        </Button>
        <Button
          size='small'
          type='primary'
          ghost
          icon={<Download size={14} />}
          loading={actions.isBusy(module, "download")}
          onClick={() => actions.downloadModule(module)}
        >
          Unduh
        </Button>
      </Space>
    </Flex>
  );
};

const TeacherSubjects = ({ teacher, actions }) => (
  <Flex vertical gap={12} style={{ padding: "4px 8px" }}>
    {teacher.subjects.map((subject) => (
      <div key={`${teacher.teacher_id}-${subject.subject_id}`}>
        <Flex align='center' gap={8} wrap='wrap' style={{ marginBottom: 8 }}>
          <Text strong>{subject.subject_name}</Text>
          {subject.taught_grade_names?.length > 0 ? (
            <Text type='secondary' style={{ fontSize: 12 }}>
              Mengajar tingkat {subject.taught_grade_names.join(", ")}
            </Text>
          ) : null}
        </Flex>
        {subject.modules.length === 0 ? (
          <Text type='secondary' style={{ fontSize: 13 }}>
            Belum ada modul ajar untuk mapel ini.
          </Text>
        ) : (
          <Flex vertical gap={8}>
            {subject.modules.map((module) => (
              <ModuleItem key={module.id} module={module} actions={actions} />
            ))}
          </Flex>
        )}
      </div>
    ))}
  </Flex>
);

const TeachingModuleMonitoring = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [subjectId, setSubjectId] = useState(null);
  const [gradeId, setGradeId] = useState(null);
  const [status, setStatus] = useState("all");
  const [keyword, setKeyword] = useState("");
  const actions = useTeachingModuleActions();

  const { data: subjectsRes } = useGetSubjectsQuery();
  const { data: gradesRes } = useGetGradesQuery({ subjectId: null });
  const { data: monitoringRes, isFetching } =
    useGetTeachingModuleMonitoringQuery({ subjectId, gradeId });

  const subjectOptions = useMemo(
    () =>
      (subjectsRes?.data ?? EMPTY_LIST).map((item) => ({
        label: item.name,
        value: item.id,
      })),
    [subjectsRes],
  );
  const gradeOptions = useMemo(
    () =>
      (gradesRes?.data ?? EMPTY_LIST).map((item) => ({
        label: item.name,
        value: item.id,
      })),
    [gradesRes],
  );

  const teachers = useMemo(
    () => groupByTeacher(monitoringRes?.data ?? EMPTY_LIST),
    [monitoringRes],
  );

  const filteredTeachers = useMemo(() => {
    const search = keyword.trim().toLowerCase();
    return teachers.filter(
      (teacher) =>
        matchesStatus(teacher, status) &&
        (!search ||
          String(teacher.teacher_name || "")
            .toLowerCase()
            .includes(search) ||
          String(teacher.teacher_nip || "")
            .toLowerCase()
            .includes(search)),
    );
  }, [teachers, status, keyword]);

  const stats = useMemo(() => {
    const withModule = teachers.filter(
      (item) => item.created_count + item.uploaded_count > 0,
    ).length;
    return [
      {
        key: "teachers",
        title: "Total Guru",
        value: teachers.length,
        icon: <Users size={18} />,
        bg: "#dbeafe",
        color: "#1d4ed8",
      },
      {
        key: "created",
        title: "Sudah Membuat",
        value: teachers.filter((item) => item.created_count > 0).length,
        icon: <FilePen size={18} />,
        bg: "#dcfce7",
        color: "#15803d",
      },
      {
        key: "uploaded",
        title: "Sudah Upload",
        value: teachers.filter((item) => item.uploaded_count > 0).length,
        icon: <FileUp size={18} />,
        bg: "#ede9fe",
        color: "#6d28d9",
      },
      {
        key: "empty",
        title: "Belum Ada Modul",
        value: teachers.length - withModule,
        icon: <CircleAlert size={18} />,
        bg: "#fee2e2",
        color: "#b91c1c",
      },
    ];
  }, [teachers]);

  const columns = [
    {
      title: "Guru",
      dataIndex: "teacher_name",
      key: "teacher_name",
      render: (_, record) => (
        <div>
          <Text strong>{record.teacher_name}</Text>
          <Text type='secondary' style={{ display: "block", fontSize: 12 }}>
            NIP {record.teacher_nip || "-"}
          </Text>
        </div>
      ),
    },
    {
      title: "Mata Pelajaran",
      key: "subjects",
      render: (_, record) => (
        <Space size={[4, 4]} wrap>
          {record.subjects.map((subject) => {
            const total = subject.created_count + subject.uploaded_count;
            return (
              <Tag
                key={subject.subject_id}
                color={total > 0 ? "blue" : "default"}
                style={{ marginRight: 0 }}
              >
                {subject.subject_name} ({total})
              </Tag>
            );
          })}
        </Space>
      ),
    },
    {
      title: "Dibuat",
      dataIndex: "created_count",
      key: "created_count",
      align: "center",
      width: 90,
      sorter: (a, b) => a.created_count - b.created_count,
    },
    {
      title: "Diupload",
      dataIndex: "uploaded_count",
      key: "uploaded_count",
      align: "center",
      width: 100,
      sorter: (a, b) => a.uploaded_count - b.uploaded_count,
    },
    {
      title: "Terakhir Diperbarui",
      dataIndex: "last_updated_at",
      key: "last_updated_at",
      width: 170,
      render: formatDateTime,
      sorter: (a, b) =>
        dayjs(a.last_updated_at || 0).valueOf() -
        dayjs(b.last_updated_at || 0).valueOf(),
    },
    {
      title: "Status",
      key: "status",
      width: 140,
      render: (_, record) => statusTag(record),
    },
  ];

  return (
    <Flex vertical gap={16}>
      <title>Monitoring Modul Ajar</title>
      <Card style={{ borderRadius: 16 }}>
        <Flex align='center' gap={12}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "#e0f2fe",
              color: "#0369a1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <NotebookText size={22} />
          </div>
          <div>
            <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
              Monitoring Modul Ajar
            </Title>
            <Text type='secondary'>
              Pantau guru yang sudah membuat atau mengupload modul ajar untuk
              mata pelajaran yang diampu.
            </Text>
          </div>
        </Flex>
      </Card>

      <Row gutter={[12, 12]}>
        {stats.map((item) => (
          <Col xs={12} lg={6} key={item.key}>
            <Card style={{ borderRadius: 14, height: "100%" }}>
              <Flex align='center' gap={12}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: item.bg,
                    color: item.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </div>
                <Statistic
                  title={item.title}
                  value={item.value}
                  loading={isFetching && !monitoringRes}
                />
              </Flex>
            </Card>
          </Col>
        ))}
      </Row>

      <Card style={{ borderRadius: 16 }}>
        <Flex vertical gap={14}>
          <Flex gap={12} wrap='wrap' vertical={isMobile}>
            <Input
              allowClear
              prefix={<Search size={15} color='#64748b' />}
              placeholder='Cari nama atau NIP guru'
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              style={isMobile ? undefined : { width: 260 }}
            />
            <Select
              allowClear
              showSearch
              optionFilterProp='label'
              placeholder='Semua mata pelajaran'
              options={subjectOptions}
              value={subjectId}
              onChange={(value) => setSubjectId(value || null)}
              style={isMobile ? undefined : { width: 260 }}
            />
            <Select
              allowClear
              placeholder='Semua tingkat'
              options={gradeOptions}
              value={gradeId}
              onChange={(value) => setGradeId(value || null)}
              style={isMobile ? undefined : { width: 180 }}
            />
          </Flex>
          <Segmented
            options={STATUS_OPTIONS}
            value={status}
            onChange={setStatus}
            block={isMobile}
          />
          <Table
            rowKey='key'
            columns={columns}
            dataSource={filteredTeachers}
            loading={isFetching}
            size='middle'
            scroll={{ x: 900 }}
            pagination={{ pageSize: 20, showSizeChanger: false }}
            expandable={{
              expandedRowRender: (record) => (
                <TeacherSubjects teacher={record} actions={actions} />
              ),
            }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description='Tidak ada guru yang sesuai filter.'
                />
              ),
            }}
          />
        </Flex>
      </Card>
    </Flex>
  );
};

export default TeachingModuleMonitoring;
