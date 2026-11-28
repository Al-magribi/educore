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
import {
  DetailSection,
  RecapMobileList,
  RecapSectionHeader,
  RecapStatTags,
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

const { Text } = Typography;

const extractClassLevel = (className) => {
  const normalized = String(className || "").trim();
  if (!normalized || normalized === "-") return "Lainnya";
  const match = normalized.match(/^(\d{1,2})/);
  return match?.[1] || "Lainnya";
};

const classNameSorter = (a, b) =>
  String(a).localeCompare(String(b), "id", {
    numeric: true,
    sensitivity: "base",
  });

const levelSorter = (levelA, levelB) => {
  if (levelA === "Lainnya") return 1;
  if (levelB === "Lainnya") return -1;
  return Number(levelA) - Number(levelB);
};

const getPrimaryLevel = (classNames = []) => {
  const levels = [
    ...new Set(classNames.map((item) => extractClassLevel(item))),
  ].sort(levelSorter);
  return levels[0] || "Lainnya";
};

const TagCloud = ({ items, emptyText = "-", color }) => {
  if (!items?.length) {
    return (
      <Text type='secondary' style={{ fontSize: 12 }}>
        {emptyText}
      </Text>
    );
  }

  return (
    <Space size={[4, 4]} wrap>
      {items.map((item) => (
        <Tag key={item.key} color={color} style={{ margin: 0 }}>
          {item.label}
        </Tag>
      ))}
    </Space>
  );
};

const ClassLevelGroups = ({ classNames }) => {
  if (!classNames?.length) {
    return (
      <Text type='secondary' style={{ fontSize: 12 }}>
        -
      </Text>
    );
  }

  const groupedByLevel = classNames.reduce((acc, className) => {
    const level = extractClassLevel(className);
    if (!acc[level]) acc[level] = [];
    acc[level].push(className);
    return acc;
  }, {});

  const sortedEntries = Object.entries(groupedByLevel).sort(
    ([levelA], [levelB]) => levelSorter(levelA, levelB),
  );

  return (
    <Flex vertical gap={6} style={{ minWidth: 0 }}>
      {sortedEntries.map(([level, levelClassNames]) => (
        <Flex key={level} align='start' wrap='wrap' gap={8}>
          <Text type='secondary' style={{ minWidth: 72, fontSize: 12 }}>
            {level === "Lainnya" ? "Lainnya" : `Tingkat ${level}`}
          </Text>
          <Space size={[4, 4]} wrap>
            {[...new Set(levelClassNames)]
              .sort(classNameSorter)
              .map((className) => (
                <Tag key={`${level}-${className}`} style={{ margin: 0 }}>
                  {className}
                </Tag>
              ))}
          </Space>
        </Flex>
      ))}
    </Flex>
  );
};

const RecapLearningSummary = ({
  isActive,
  subjectId,
  subject,
  activePeriode,
  screens,
}) => {
  const { screens: activeScreens, isMobile } = useRecapLayout(screens);
  const [selectedClassId, setSelectedClassId] = useState("all");
  const [teacherId, setTeacherId] = useState("all");

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

  const {
    data: summaryRes,
    isFetching,
    refetch,
  } = useGetLearningSummaryRecapQuery(
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
        item.chapter_id ??
          item.chapter_title ??
          item.key ??
          groupedRows.size + 1,
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

    const mappedRows = Array.from(groupedRows.values()).map((row) => {
      const classNames = Array.from(row.classNamesSet).sort(classNameSorter);
      return {
        key: row.key,
        chapter_title: row.chapter_title,
        teachers: Array.from(row.teachersMap.values()),
        subchapters: Array.from(row.subchaptersMap.values()),
        class_names: classNames,
        primary_level: getPrimaryLevel(classNames),
      };
    });

    const sortedRows = mappedRows.sort((a, b) => {
      const levelCompare = levelSorter(a.primary_level, b.primary_level);
      if (levelCompare !== 0) return levelCompare;

      const classA = a.class_names[0] || "";
      const classB = b.class_names[0] || "";
      const classCompare = classNameSorter(classA, classB);
      if (classCompare !== 0) return classCompare;

      return String(a.chapter_title).localeCompare(
        String(b.chapter_title),
        "id",
        {
          numeric: true,
          sensitivity: "base",
        },
      );
    });

    return sortedRows.map((row, index) => ({
      ...row,
      no: index + 1,
    }));
  }, [items]);

  const toSubchapterTags = (subchapters) =>
    (subchapters || []).map((item) => ({
      key: String(item.id ?? item.title),
      label: item.title,
    }));

  const toTeacherTags = (teacherList) =>
    (teacherList || []).map((item) => ({
      key: String(item.id ?? item.full_name),
      label: item.full_name,
    }));

  const columns = [
    {
      title: "No",
      dataIndex: "no",
      width: 64,
      align: "center",
    },
    {
      title: "Bab",
      dataIndex: "chapter_title",
      width: 220,
      render: (value) => <Text strong>{value}</Text>,
    },
    {
      title: "Subbab",
      dataIndex: "subchapters",
      width: 280,
      render: (value) => (
        <TagCloud
          items={toSubchapterTags(value)}
          color='blue'
          emptyText='Belum ada subbab'
        />
      ),
    },
    {
      title: "Guru",
      dataIndex: "teachers",
      width: 220,
      render: (value) => <TagCloud items={toTeacherTags(value)} />,
    },
    {
      title: "Kelas Peruntukan",
      dataIndex: "class_names",
      width: 280,
      render: (value) => <ClassLevelGroups classNames={value} />,
    },
  ];

  const handleClassChange = (value) => {
    setSelectedClassId(value);
    setTeacherId("all");
  };

  const renderMobileCard = (row) => (
    <RecordCard index={row.no} title={row.chapter_title}>
      <DetailSection title='Subbab'>
        <TagCloud
          items={toSubchapterTags(row.subchapters)}
          color='blue'
          emptyText='Belum ada subbab'
        />
      </DetailSection>
      <DetailSection title='Guru'>
        <TagCloud items={toTeacherTags(row.teachers)} />
      </DetailSection>
      <DetailSection title='Kelas Peruntukan'>
        <ClassLevelGroups classNames={row.class_names} />
      </DetailSection>
    </RecordCard>
  );

  return (
    <Flex vertical gap={16} style={{ width: "100%", minWidth: 0 }}>
      <Card style={surfaceCardStyle} styles={surfaceCardBody(isMobile)}>
        <RecapSectionHeader
          isMobile={isMobile}
          title='Ringkasan Pembelajaran'
          description='Bab dan subbab yang sudah dibuat guru pengampu sesuai peruntukan kelas'
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

        <RecapStatTags
          isMobile={isMobile}
          items={[
            {
              key: "chapters",
              color: "geekblue",
              icon: <Users size={12} />,
              label: `Total Bab: ${summaryData?.meta?.total_chapters || 0}`,
            },
            {
              key: "subchapters",
              color: "cyan",
              label: `Total Subbab: ${summaryData?.meta?.total_subchapters || 0}`,
            },
          ]}
        />
      </Card>

      {!subjectId ? (
        <Alert type='info' showIcon title='Mata pelajaran belum dipilih.' />
      ) : isMobile ? (
        <RecapMobileList
          dataSource={rows}
          loading={isFetching}
          emptyText='Belum ada data bab/subbab pada filter ini.'
          renderItem={renderMobileCard}
          pageSize={6}
        />
      ) : (
        <Card style={tableCardStyle} styles={tableCardBody}>
          {!isFetching && !rows.length ? (
            <div style={{ padding: 24 }}>
              <Empty description='Belum ada data bab/subbab pada filter ini.' />
            </div>
          ) : (
            <Table
              rowKey='key'
              dataSource={rows}
              columns={columns}
              loading={isFetching}
              pagination={false}
              size={activeScreens.lg ? "middle" : "small"}
              scroll={{ x: 1060 }}
              sticky
            />
          )}
        </Card>
      )}
    </Flex>
  );
};

export default RecapLearningSummary;
