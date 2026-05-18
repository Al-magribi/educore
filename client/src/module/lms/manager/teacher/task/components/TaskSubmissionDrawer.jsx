import React, { useMemo, useState } from "react";
import {
  Button,
  Drawer,
  Empty,
  Flex,
  Input,
  List,
  Skeleton,
  Space,
  Tag,
  Tabs,
  Typography,
} from "antd";
import {
  CheckCheck,
  Clock3,
  Download,
  FileText,
  GraduationCap,
  Search,
  Users,
} from "lucide-react";
import dayjs from "dayjs";

const { Text, Title } = Typography;

const summaryCardStyle = {
  borderRadius: 18,
  border: "1px solid rgba(148, 163, 184, 0.16)",
  background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
  padding: 16,
};

const TaskSubmissionDrawer = ({ open, onClose, data, isLoading }) => {
  const [keyword, setKeyword] = useState("");
  const summary = data?.summary;
  const students = useMemo(() => data?.students || [], [data?.students]);
  const task = data?.task;

  const filteredStudents = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) return students;
    return students.filter((student) =>
      String(student.full_name || "").toLowerCase().includes(normalizedKeyword),
    );
  }, [students, keyword]);

  const groupedStudents = filteredStudents.reduce((accumulator, student) => {
    const classKey = String(student.class_id || "unknown");
    if (!accumulator[classKey]) {
      accumulator[classKey] = {
        classId: student.class_id,
        className: student.class_name || "Tanpa Kelas",
        students: [],
      };
    }
    accumulator[classKey].students.push(student);
    return accumulator;
  }, {});

  const classTabs = Object.values(groupedStudents)
    .sort((a, b) => a.className.localeCompare(b.className))
    .map((group) => {
      const submittedCount = group.students.filter(
        (student) => student.status === "submitted",
      ).length;
      const pendingCount = group.students.length - submittedCount;

      return {
        key: String(group.classId || group.className),
        label: `${group.className} (${group.students.length})`,
        children: (
          <Space direction='vertical' size={14} style={{ width: "100%" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <div style={summaryCardStyle}>
                <Text type='secondary'>Total Siswa</Text>
                <Title level={5} style={{ margin: "6px 0 0" }}>
                  {group.students.length}
                </Title>
              </div>
              <div style={summaryCardStyle}>
                <Text type='secondary'>Sudah Mengumpulkan</Text>
                <Title
                  level={5}
                  style={{ margin: "6px 0 0", color: "#15803d" }}
                >
                  {submittedCount}
                </Title>
              </div>
              <div style={summaryCardStyle}>
                <Text type='secondary'>Belum Mengumpulkan</Text>
                <Title
                  level={5}
                  style={{ margin: "6px 0 0", color: "#b45309" }}
                >
                  {pendingCount}
                </Title>
              </div>
            </div>

            <List
              dataSource={group.students}
              renderItem={(student) => {
                const isSubmitted = student.status === "submitted";
                return (
                  <List.Item style={{ paddingInline: 0 }}>
                    <div
                      style={{
                        width: "100%",
                        borderRadius: 18,
                        border: "1px solid rgba(148, 163, 184, 0.14)",
                        background:
                          "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
                        padding: 16,
                      }}
                    >
                      <Flex justify='space-between' align='start' gap={12}>
                        <Space align='start' size={12}>
                          <div
                            style={{
                              width: 42,
                              height: 42,
                              borderRadius: 14,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: "#eff6ff",
                              color: "#1d4ed8",
                              flexShrink: 0,
                            }}
                          >
                            <Users size={18} />
                          </div>
                          <div>
                            <Text
                              strong
                              style={{ display: "block", fontSize: 15 }}
                            >
                              {student.full_name}
                            </Text>
                            <Text type='secondary'>
                              {student.nis || "-"} • {student.class_name || "-"}
                            </Text>
                            {student.submission_file_name ? (
                              <div style={{ marginTop: 8 }}>
                                <Space size={[8, 8]} wrap>
                                  <Tag
                                    icon={<FileText size={12} />}
                                    color='green'
                                    style={{
                                      marginRight: 0,
                                      borderRadius: 999,
                                    }}
                                  >
                                    {student.submission_file_name}
                                  </Tag>
                                  {student.submission_file_url ? (
                                    <Button
                                      type='link'
                                      size='small'
                                      icon={<Download size={14} />}
                                      href={student.submission_file_url}
                                      target='_blank'
                                      rel='noopener noreferrer'
                                      style={{ paddingInline: 0 }}
                                    >
                                      Download
                                    </Button>
                                  ) : null}
                                </Space>
                              </div>
                            ) : null}
                          </div>
                        </Space>
                        <Space direction='vertical' size={8} align='end'>
                          <Tag
                            icon={
                              isSubmitted ? (
                                <CheckCheck size={12} />
                              ) : (
                                <Clock3 size={12} />
                              )
                            }
                            color={isSubmitted ? "success" : "warning"}
                            style={{ marginRight: 0, borderRadius: 999 }}
                          >
                            {isSubmitted
                              ? "Sudah Mengumpulkan"
                              : "Belum Mengumpulkan"}
                          </Tag>
                          <Text type='secondary' style={{ fontSize: 12 }}>
                            {student.submitted_at
                              ? dayjs(student.submitted_at).format(
                                  "DD MMM YYYY, HH:mm",
                                )
                              : "Belum ada file"}
                          </Text>
                        </Space>
                      </Flex>
                    </div>
                  </List.Item>
                );
              }}
            />
          </Space>
        ),
      };
    });

  return (
    <Drawer
      title='Status Pengumpulan'
      open={open}
      onClose={onClose}
      width={760}
      destroyOnHidden
    >
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : !task ? (
        <Empty description='Data pengumpulan belum tersedia.' />
      ) : (
        <Space direction='vertical' size={18} style={{ width: "100%" }}>
          <div>
            <Title level={5} style={{ marginBottom: 4 }}>
              {task.title}
            </Title>
            <Text type='secondary'>
              {task.chapter_title || "Tanpa chapter"} • Deadline{" "}
              {dayjs(task.deadline_at).format("DD MMM YYYY, HH:mm")}
            </Text>
            <div style={{ marginTop: 10 }}>
              <Space wrap size={[8, 8]}>
                {(task.class_names || []).map((name) => (
                  <Tag
                    key={name}
                    icon={<GraduationCap size={12} />}
                    color='green'
                    style={{ marginRight: 0, borderRadius: 999 }}
                  >
                    {name}
                  </Tag>
                ))}
              </Space>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div style={summaryCardStyle}>
              <Text type='secondary'>Total Siswa</Text>
              <Title level={4} style={{ margin: "6px 0 0" }}>
                {summary?.assigned || 0}
              </Title>
            </div>
            <div style={summaryCardStyle}>
              <Text type='secondary'>Sudah Mengumpulkan</Text>
              <Title level={4} style={{ margin: "6px 0 0", color: "#15803d" }}>
                {summary?.submitted || 0}
              </Title>
            </div>
            <div style={summaryCardStyle}>
              <Text type='secondary'>Belum Mengumpulkan</Text>
              <Title level={4} style={{ margin: "6px 0 0", color: "#b45309" }}>
                {summary?.pending || 0}
              </Title>
            </div>
          </div>

          <Input
            allowClear
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder='Cari nama siswa'
            prefix={<Search size={14} />}
            style={{ borderRadius: 12 }}
          />

          {classTabs.length ? (
            <Tabs
              items={classTabs}
              defaultActiveKey={classTabs[0]?.key}
              tabBarGutter={8}
            />
          ) : (
            <Empty description='Tidak ada siswa yang cocok dengan filter nama.' />
          )}
        </Space>
      )}
    </Drawer>
  );
};

export default TaskSubmissionDrawer;
