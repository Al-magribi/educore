import React, { useState } from "react";
import { useGetStudentExamsQuery } from "../../../../service/cbt/ApiExam";
import JoinExamModal from "./JoinExamModal";
import {
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Row,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import {
  BookOpen,
  CalendarClock,
  ClipboardList,
  GraduationCap,
  Timer,
  UserRound,
} from "lucide-react";

const { Title, Text } = Typography;

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("id-ID");
};

const StudentExamList = () => {
  const { data, isLoading, isError } = useGetStudentExamsQuery();
  const [activeExam, setActiveExam] = useState(null);
  const [isJoinOpen, setIsJoinOpen] = useState(false);

  const examCount = data?.length || 0;
  const durationTotal = data?.reduce(
    (sum, item) => sum + Number(item.duration_minutes || 0),
    0,
  );
  const subjectCount = new Set(
    (data || []).map((item) => item.subject_name).filter(Boolean),
  ).size;
  const className = data?.[0]?.class_name || "Kelas belum tersedia";

  if (isLoading) {
    return (
      <Card>
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <Text type="danger">Gagal memuat jadwal ujian.</Text>
      </Card>
    );
  }

  const openJoinModal = (exam) => {
    setActiveExam(exam);
    setIsJoinOpen(true);
  };

  const closeJoinModal = () => {
    setIsJoinOpen(false);
    setActiveExam(null);
  };

  return (
    <>
      <Space vertical size={20} style={{ width: "100%" }}>
        <Card hoverable>
          <Space vertical size={10} style={{ width: "100%" }}>
            <Space align="center" size={12}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "#eef2ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ClipboardList size={20} color="#4f46e5" />
              </div>
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  Jadwal Ujian
                </Title>
                <Text type="secondary">
                  Daftar ujian aktif sesuai kelas Anda
                </Text>
              </div>
            </Space>
            <Space wrap size={8}>
              <Tag color="blue" icon={<GraduationCap size={12} />}>
                {className}
              </Tag>
              <Tag color="geekblue" icon={<BookOpen size={12} />}>
                {subjectCount} Mapel
              </Tag>
              <Tag color="purple" icon={<CalendarClock size={12} />}>
                {examCount} Ujian Aktif
              </Tag>
            </Space>
          </Space>
        </Card>

        <Card
          title={
            <Space align="center" size={8}>
              <ClipboardList size={18} color="#1d4ed8" />
              <span>Daftar Ujian</span>
            </Space>
          }
          style={{ borderRadius: 16 }}
        >
          {data?.length ? (
            <Row gutter={[16, 16]}>
              {data.map((item) => (
                <Col key={item.id} xs={24} md={12} xl={8}>
                  <Badge.Ribbon text={item.bank_type || "Ujian"}>
                    <Card
                      hoverable
                      actions={[
                        <Button
                          type="primary"
                          onClick={() => openJoinModal(item)}
                        >
                          Ikuti Ujian
                        </Button>,
                      ]}
                    >
                      <Space vertical size={10} style={{ width: "100%" }}>
                        <Space align="center" size={8}>
                          <Text strong>{item.name}</Text>
                          <Tag color="green">Aktif</Tag>
                        </Space>
                        <Space size={12} wrap>
                          <Text type="secondary">
                            <BookOpen size={14} /> {item.subject_name || "-"}
                          </Text>
                          <Text type="secondary">
                            <UserRound size={14} /> {item.teacher_name || "-"}
                          </Text>
                          <Text type="secondary">
                            <Timer size={14} /> {item.duration_minutes} menit
                          </Text>
                        </Space>
                      </Space>
                    </Card>
                  </Badge.Ribbon>
                </Col>
              ))}
            </Row>
          ) : (
            <Empty description="Belum ada jadwal ujian untuk kelas Anda." />
          )}
        </Card>
      </Space>
      <JoinExamModal
        open={isJoinOpen}
        onClose={closeJoinModal}
        exam={activeExam}
      />
    </>
  );
};

export default StudentExamList;
