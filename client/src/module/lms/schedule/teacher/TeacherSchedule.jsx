import React, { useMemo } from "react";
import dayjs from "dayjs";
import { useSelector } from "react-redux";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Row,
  Skeleton,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import { CalendarRange, Clock3, Layers3, RefreshCw } from "lucide-react";
import { useGetScheduleBootstrapQuery } from "../../../../service/lms/ApiSchedule";
import TeacherJournal from "./TeacherJournal";

const { Text, Title } = Typography;

const DAY_OPTIONS = [
  { value: 1, label: "Senin" },
  { value: 2, label: "Selasa" },
  { value: 3, label: "Rabu" },
  { value: 4, label: "Kamis" },
  { value: 5, label: "Jumat" },
  { value: 6, label: "Sabtu" },
  { value: 7, label: "Minggu" },
];

const dayNameByValue = DAY_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

const formatTime = (value) => (value ? String(value).slice(0, 5) : "-");

const getTodayScheduleKey = () => {
  const day = dayjs().day();
  return day === 0 ? 7 : day;
};

const TeacherSchedule = () => {
  const { user } = useSelector((state) => state.auth);
  const { data, isLoading, isFetching, refetch } = useGetScheduleBootstrapQuery();

  const payload = data?.data || {};

  const teacherEntries = useMemo(() => {
    return (payload.entries || [])
      .filter((item) => Number(item.teacher_id) === Number(user?.id))
      .map((item) => ({
        ...item,
        key: item.id,
        day_name: dayNameByValue[Number(item.day_of_week)] || "-",
        time_label: `${formatTime(item.start_time)} - ${formatTime(item.end_time)}`,
        slot_label:
          Array.isArray(item.slot_nos) && item.slot_nos.length
            ? item.slot_nos.join(", ")
            : "-",
      }))
      .sort((left, right) => {
        const dayCompare = Number(left.day_of_week) - Number(right.day_of_week);
        if (dayCompare !== 0) return dayCompare;
        return String(left.start_time || "").localeCompare(
          String(right.start_time || ""),
        );
      });
  }, [payload.entries, user?.id]);

  const teacherAssignments = useMemo(() => {
    return (payload.teacher_assignments || []).filter(
      (item) => Number(item.teacher_id) === Number(user?.id),
    );
  }, [payload.teacher_assignments, user?.id]);

  const classOptions = useMemo(() => {
    const classMap = new Map();

    teacherEntries.forEach((item) => {
      classMap.set(Number(item.class_id), {
        value: Number(item.class_id),
        label: item.class_name || `Kelas ${item.class_id}`,
      });
    });

    teacherAssignments.forEach((item) => {
      classMap.set(Number(item.class_id), {
        value: Number(item.class_id),
        label: item.class_name || `Kelas ${item.class_id}`,
      });
    });

    return [...classMap.values()].sort((left, right) =>
      String(left.label || "").localeCompare(String(right.label || "")),
    );
  }, [teacherAssignments, teacherEntries]);

  const subjectCount = useMemo(() => {
    return new Set(
      teacherEntries.map((item) => Number(item.subject_id)).filter(Boolean),
    ).size;
  }, [teacherEntries]);

  const classCount = useMemo(() => {
    return new Set(
      teacherEntries.map((item) => Number(item.class_id)).filter(Boolean),
    ).size;
  }, [teacherEntries]);

  const totalSessions = useMemo(() => {
    return teacherEntries.reduce(
      (total, item) => total + Number(item.slot_count || 0),
      0,
    );
  }, [teacherEntries]);

  const todayEntries = useMemo(() => {
    const todayKey = getTodayScheduleKey();
    return teacherEntries.filter(
      (item) => Number(item.day_of_week) === Number(todayKey),
    );
  }, [teacherEntries]);

  const groupedByDay = useMemo(() => {
    return DAY_OPTIONS.map((day) => ({
      ...day,
      items: teacherEntries.filter(
        (item) => Number(item.day_of_week) === Number(day.value),
      ),
    })).filter((item) => item.items.length > 0);
  }, [teacherEntries]);

  const pendingAssignments = useMemo(() => {
    const allocatedByAssignment = teacherEntries.reduce((acc, item) => {
      const key = [item.teacher_id, item.subject_id, item.class_id].join(":");
      acc[key] = (acc[key] || 0) + Number(item.slot_count || 0);
      return acc;
    }, {});

    return teacherAssignments
      .map((item) => {
        const key = [item.teacher_id, item.subject_id, item.class_id].join(":");
        const allocatedSessions = allocatedByAssignment[key] || 0;
        const requiredSessions = Number(item.weekly_sessions || 0);
        return {
          key,
          subject_name: item.subject_name,
          class_name: item.class_name,
          required_sessions: requiredSessions,
          allocated_sessions: allocatedSessions,
          missing_sessions: Math.max(requiredSessions - allocatedSessions, 0),
        };
      })
      .filter((item) => item.required_sessions > 0 && item.missing_sessions > 0);
  }, [teacherAssignments, teacherEntries]);

  const scheduleColumns = [
    {
      title: "Hari",
      dataIndex: "day_name",
      width: 110,
    },
    {
      title: "Waktu",
      dataIndex: "time_label",
      width: 140,
    },
    {
      title: "Jam Ke",
      dataIndex: "slot_label",
      width: 110,
      render: (value) => <Tag>{value}</Tag>,
    },
    {
      title: "Kelas",
      dataIndex: "class_name",
      width: 130,
      render: (value) => <Text strong>{value || "-"}</Text>,
    },
    {
      title: "Mata Pelajaran",
      dataIndex: "subject_name",
      render: (value, record) => (
        <Space direction='vertical' size={0}>
          <Text strong>{value || "-"}</Text>
          <Text type='secondary'>{record.subject_code || "-"}</Text>
        </Space>
      ),
    },
    {
      title: "Pertemuan",
      dataIndex: "meeting_no",
      width: 110,
      align: "center",
      render: (value) => `Ke-${value || "-"}`,
    },
    {
      title: "Status",
      dataIndex: "source_type",
      width: 130,
      render: (value, record) => (
        <Space wrap size={4}>
          <Tag color={value === "manual" ? "blue" : "green"}>
            {value === "manual" ? "Manual" : "Generate"}
          </Tag>
          {record.locked ? <Tag color='gold'>Locked</Tag> : null}
        </Space>
      ),
    },
  ];

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 10 }} />;
  }

  return (
    <Flex vertical gap={16}>
      <Card style={{ borderRadius: 20 }} styles={{ body: { padding: 20 } }}>
        <Flex justify='space-between' align='center' wrap='wrap' gap={12}>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Workspace Guru
            </Title>
            <Text type='secondary'>
              Kelola jurnal mengajar dan lihat jadwal mengajar khusus untuk{" "}
              {user?.full_name || "guru"}.
            </Text>
          </div>

          <Button
            icon={<RefreshCw size={14} />}
            onClick={() => refetch()}
            loading={isFetching}
          >
            Muat Ulang Jadwal
          </Button>
        </Flex>
      </Card>

      <Tabs
        defaultActiveKey='journal'
        items={[
          {
            key: "journal",
            label: "Jurnal",
            children: <TeacherJournal user={user} classOptions={classOptions} />,
          },
          {
            key: "schedule",
            label: "Jadwal",
            children: (
              <Flex vertical gap={16}>
                <Row gutter={[12, 12]}>
                  <Col xs={24} md={8}>
                    <Card
                      size='small'
                      bordered={false}
                      style={{ background: "#f5f9ff", borderRadius: 18 }}
                    >
                      <Space align='start'>
                        <CalendarRange size={18} />
                        <div>
                          <Text type='secondary'>Total Jadwal</Text>
                          <Title level={3} style={{ margin: 0 }}>
                            {teacherEntries.length}
                          </Title>
                        </div>
                      </Space>
                    </Card>
                  </Col>
                  <Col xs={24} md={8}>
                    <Card
                      size='small'
                      bordered={false}
                      style={{ background: "#fff8f1", borderRadius: 18 }}
                    >
                      <Space align='start'>
                        <Clock3 size={18} />
                        <div>
                          <Text type='secondary'>Total Sesi</Text>
                          <Title level={3} style={{ margin: 0 }}>
                            {totalSessions}
                          </Title>
                        </div>
                      </Space>
                    </Card>
                  </Col>
                  <Col xs={24} md={8}>
                    <Card
                      size='small'
                      bordered={false}
                      style={{ background: "#f6fff7", borderRadius: 18 }}
                    >
                      <Space align='start'>
                        <Layers3 size={18} />
                        <div>
                          <Text type='secondary'>Kelas / Mapel</Text>
                          <Title level={3} style={{ margin: 0 }}>
                            {classCount} / {subjectCount}
                          </Title>
                        </div>
                      </Space>
                    </Card>
                  </Col>
                </Row>

                {pendingAssignments.length ? (
                  <Alert
                    showIcon
                    type='warning'
                    message='Masih ada alokasi mengajar yang belum terpenuhi'
                    description={pendingAssignments
                      .map(
                        (item) =>
                          `${item.subject_name} ${item.class_name}: ${item.allocated_sessions}/${item.required_sessions} sesi`,
                      )
                      .join(" | ")}
                  />
                ) : null}

                <Card
                  title='Agenda Hari Ini'
                  style={{ borderRadius: 20 }}
                  styles={{ body: { padding: 0 } }}
                >
                  {todayEntries.length ? (
                    <Table
                      rowKey='key'
                      columns={scheduleColumns.filter(
                        (item) => item.dataIndex !== "day_name",
                      )}
                      dataSource={todayEntries}
                      pagination={false}
                      size='small'
                      scroll={{ x: 900 }}
                    />
                  ) : (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description='Tidak ada jadwal mengajar untuk hari ini.'
                    />
                  )}
                </Card>

                <Card
                  title='Jadwal Mingguan'
                  style={{ borderRadius: 20 }}
                  styles={{ body: { padding: 0 } }}
                >
                  {teacherEntries.length ? (
                    <Table
                      rowKey='key'
                      columns={scheduleColumns}
                      dataSource={teacherEntries}
                      pagination={false}
                      scroll={{ x: 1000 }}
                    />
                  ) : (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description='Belum ada jadwal guru yang tersedia.'
                    />
                  )}
                </Card>

                <Row gutter={[16, 16]}>
                  {groupedByDay.map((day) => (
                    <Col xs={24} lg={12} key={day.value}>
                      <Card
                        title={day.label}
                        style={{ borderRadius: 20, height: "100%" }}
                        styles={{ body: { paddingTop: 8 } }}
                      >
                        <Space direction='vertical' size={12} style={{ width: "100%" }}>
                          {day.items.map((item) => (
                            <Card
                              key={`${day.value}-${item.id}`}
                              size='small'
                              style={{ background: "#fafafa" }}
                            >
                              <Flex justify='space-between' align='start' gap={12}>
                                <div>
                                  <Text strong>{item.subject_name}</Text>
                                  <div>
                                    <Text type='secondary'>
                                      {item.class_name} | {item.time_label}
                                    </Text>
                                  </div>
                                </div>
                                <Space wrap size={4}>
                                  <Tag color='blue'>Jam {item.slot_label}</Tag>
                                  <Tag color='purple'>
                                    Pertemuan {item.meeting_no}
                                  </Tag>
                                </Space>
                              </Flex>
                            </Card>
                          ))}
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Flex>
            ),
          },
        ]}
      />
    </Flex>
  );
};

export default TeacherSchedule;
