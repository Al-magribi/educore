import React, { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Flex,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { Filter, RefreshCcw, Users } from "lucide-react";
import { useGetClassesQuery } from "../../../../../service/lms/ApiLms";
import {
  useGetLearningSummaryRecapQuery,
  useGetRecapTeachersQuery,
} from "../../../../../service/lms/ApiRecap";

const { Title, Text } = Typography;

const extractClassLevel = (className) => {
  const normalized = String(className || "").trim();
  if (!normalized || normalized === "-") return "Lainnya";
  const match = normalized.match(/^(\d{1,2})/);
  return match?.[1] || "Lainnya";
};

const RecapLearningSummary = ({
  isActive,
  subjectId,
  subject,
  activePeriode,
  screens,
}) => {
  const [selectedClassId, setSelectedClassId] = useState("all");
  const [teacherId, setTeacherId] = useState("all");

  const normalizedClassId =
    selectedClassId === "all" ? null : Number(selectedClassId) || null;
  const normalizedTeacherId = teacherId === "all" ? null : Number(teacherId) || null;

  const { data: classRes, isLoading: classLoading } = useGetClassesQuery(
    { subjectId, gradeId: null },
    { skip: !isActive || !subjectId },
  );
  const classes = classRes?.data || [];

  const { data: teachersRes, isLoading: teacherLoading } = useGetRecapTeachersQuery(
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
      ...teachers.map((item) => ({ value: String(item.id), label: item.full_name })),
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

  const { data: summaryRes, isFetching, refetch } = useGetLearningSummaryRecapQuery(
    {
      subjectId,
      teacherId: normalizedTeacherId,
      classId: normalizedClassId,
    },
    { skip: !isActive || !subjectId },
  );

  const summaryData = summaryRes?.data || {};
  const items = summaryData?.items || [];

  const rows = useMemo(() => {
    const groupedRows = new Map();

    for (const item of items) {
      const chapterKey = String(
        item.chapter_id ?? item.chapter_title ?? item.key ?? groupedRows.size + 1,
      );

      if (!groupedRows.has(chapterKey)) {
        groupedRows.set(chapterKey, {
          key: chapterKey,
          chapter_title: item.chapter_title || "-",
          teachersMap: new Map(),
          subchaptersMap: new Map(),
          classNamesSet: new Set(),
        });
      }

      const row = groupedRows.get(chapterKey);
      const className = item.class_name || "-";
      if (className && className !== "-") {
        row.classNamesSet.add(className);
      }

      for (const teacher of item.teachers || []) {
        const teacherKey = String(teacher.id ?? teacher.full_name);
        if (!row.teachersMap.has(teacherKey)) {
          row.teachersMap.set(teacherKey, teacher);
        }
      }

      for (const subchapter of item.subchapters || []) {
        const subchapterKey = String(subchapter.id ?? subchapter.title);
        if (!row.subchaptersMap.has(subchapterKey)) {
          row.subchaptersMap.set(subchapterKey, subchapter);
        }
      }
    }

    return Array.from(groupedRows.values()).map((row, index) => ({
      key: row.key,
      no: index + 1,
      chapter_title: row.chapter_title,
      teachers: Array.from(row.teachersMap.values()),
      subchapters: Array.from(row.subchaptersMap.values()),
      class_names: Array.from(row.classNamesSet),
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
      title: "Bab",
      dataIndex: "chapter_title",
      render: (value) => <Text strong>{value}</Text>,
    },
    {
      title: "Subbab",
      dataIndex: "subchapters",
      render: (value) => {
        if (!value?.length) return <Text type="secondary">Belum ada subbab</Text>;
        return (
          <Space size={[4, 4]} wrap>
            {value.map((item) => (
              <Tag key={item.id} color="blue">
                {item.title}
              </Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: "Guru",
      dataIndex: "teachers",
      render: (value) => {
        if (!value?.length) return "-";
        return (
          <Space size={[4, 4]} wrap>
            {value.map((item) => (
              <Tag key={item.id}>{item.full_name}</Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: "Kelas Peruntukan",
      dataIndex: "class_names",
      render: (value) => {
        if (!value?.length) return <Text type="secondary">-</Text>;

        const groupedByLevel = value.reduce((acc, className) => {
          const level = extractClassLevel(className);
          if (!acc[level]) acc[level] = [];
          acc[level].push(className);
          return acc;
        }, {});

        const sortedEntries = Object.entries(groupedByLevel).sort(([levelA], [levelB]) => {
          if (levelA === "Lainnya") return 1;
          if (levelB === "Lainnya") return -1;
          return Number(levelA) - Number(levelB);
        });

        return (
          <Space direction="vertical" size={4}>
            {sortedEntries.map(([level, classNames]) => (
              <Space key={level} align="start" wrap>
                <Text type="secondary" style={{ minWidth: 72 }}>
                  {level === "Lainnya" ? "Lainnya" : `Tingkat ${level}`}
                </Text>
                <Space size={[4, 4]} wrap>
                  {[...new Set(classNames)]
                    .sort((a, b) =>
                      String(a).localeCompare(String(b), "id", {
                        numeric: true,
                        sensitivity: "base",
                      }),
                    )
                    .map((className) => (
                    <Tag key={`${level}-${className}`}>{className}</Tag>
                    ))}
                </Space>
              </Space>
            ))}
          </Space>
        );
      },
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
          <Space vertical size={2}>
            <Title level={5} style={{ margin: 0 }}>
              Ringkasan Pembelajaran
            </Title>
            <Text type="secondary">
              Bab dan subbab yang sudah dibuat guru pengampu sesuai peruntukan kelas
            </Text>
          </Space>
          <Space wrap>
            <Tag color="blue">{subject?.name || "Mata Pelajaran"}</Tag>
            <Tag color="processing">
              {activePeriode?.name || summaryData?.meta?.periode_name || "Periode"}
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
            />
            {teachers.length > 1 && (
              <Select
                value={validTeacherValue}
                onChange={setTeacherId}
                style={{ minWidth: 240 }}
                options={teacherOptions}
                loading={teacherLoading}
                suffixIcon={<Filter size={14} />}
              />
            )}
          </Space>
          <Button icon={<RefreshCcw size={14} />} onClick={refetch}>
            Refresh
          </Button>
        </Flex>

        <Flex wrap="wrap" gap={8} style={{ marginTop: 14 }}>
          <Tag color="geekblue" icon={<Users size={12} />}>
            Total Bab: {summaryData?.meta?.total_chapters || 0}
          </Tag>
          <Tag color="cyan">Total Subbab: {summaryData?.meta?.total_subchapters || 0}</Tag>
        </Flex>
      </Card>

      {!subjectId ? (
        <Alert type="info" showIcon message="Mata pelajaran belum dipilih." />
      ) : (
        <Card style={{ borderRadius: 16 }} styles={{ body: { padding: 0 } }}>
          {!isFetching && !rows.length ? (
            <div style={{ padding: 24 }}>
              <Empty description="Belum ada data bab/subbab pada filter ini." />
            </div>
          ) : (
            <Table
              rowKey="key"
              dataSource={rows}
              columns={columns}
              loading={isFetching}
              pagination={false}
              size={screens?.xs ? "small" : "middle"}
              sticky
            />
          )}
        </Card>
      )}
    </Flex>
  );
};

export default RecapLearningSummary;
