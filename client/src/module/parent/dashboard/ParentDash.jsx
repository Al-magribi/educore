import { useMemo } from "react";
import {
  Alert,
  Card,
  Col,
  Empty,
  Row,
  Skeleton,
  Space,
  Statistic,
  Tag,
  Typography,
} from "antd";
import {
  BookOpen,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useGetParentDashboardQuery } from "../../../service/lms/ApiParent";

const { Title, Text } = Typography;

const ParentDash = () => {
  const { data, isLoading, isError, error } = useGetParentDashboardQuery();

  const payload = data?.data;
  const summary = payload?.summary || {};
  const students = Array.isArray(payload?.students)
    ? payload.students.filter(Boolean)
    : [];

  const studentTitle = useMemo(() => {
    const total = Number(summary.students_total || 0);
    if (total === 1) return "1 Anak Terhubung";
    return `${total} Anak Terhubung`;
  }, [summary.students_total]);

  if (isLoading) {
    return (
      <Card style={{ borderRadius: 14 }}>
        <Skeleton active paragraph={{ rows: 10 }} />
      </Card>
    );
  }

  if (isError) {
    return (
      <Alert
        type='error'
        showIcon
        message='Gagal memuat dashboard orang tua.'
        description={error?.data?.message || "Silakan coba beberapa saat lagi."}
      />
    );
  }

  return (
    <Space direction='vertical' size={16} style={{ width: "100%" }}>
      <Card style={{ borderRadius: 14 }}>
        <Row gutter={[16, 16]} align='middle'>
          <Col xs={24}>
            <Space align='start' size={12}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "#e6f4ff",
                  color: "#1677ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <UsersRound size={22} />
              </div>
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  Dashboard Orang Tua
                </Title>
                <Text type='secondary'>
                  {payload?.parent?.full_name || "Orang tua"} | {" "}
                  {payload?.active_periode?.name || "Periode belum aktif"}
                </Text>
                <div style={{ marginTop: 8 }}>
                  <Tag color='blue' icon={<UserRound size={12} />}>
                    {studentTitle}
                  </Tag>
                </div>
              </div>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 14 }}>
            <Statistic
              title='Total Anak'
              value={summary.students_total || 0}
              prefix={<UsersRound size={16} />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 14 }}>
            <Statistic
              title='Mapel LMS'
              value={summary.lms_subjects_total || 0}
              prefix={<BookOpen size={16} />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 14 }}>
            <Statistic
              title='Siswa Aktif'
              value={summary.students_total || 0}
              prefix={<UserRound size={16} />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card style={{ borderRadius: 14 }}>
            <Statistic
              title='Materi LMS'
              value={summary.lms_materials_total || 0}
              prefix={<BookOpen size={16} />}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <Space size={8}>
            <UserRound size={16} />
            <span>Ringkasan Per Anak</span>
          </Space>
        }
        style={{ borderRadius: 14 }}
      >
        {students.length === 0 ? (
          <Empty description='Belum ada data siswa terhubung.' />
        ) : (
          <Row gutter={[16, 16]}>
            {students.map((student, index) => (
              <Col xs={24} lg={12} key={student?.student_id ?? `student-${index}`}>
                <Card size='small' style={{ borderRadius: 12 }}>
                  <Space direction='vertical' size={10} style={{ width: "100%" }}>
                    <div>
                      <Text strong style={{ fontSize: 16 }}>
                        {student.student_name}
                      </Text>
                      <div>
                        <Text type='secondary'>
                          NIS {student.nis || "-"} | {student.class_name || "-"}
                        </Text>
                      </div>
                      <div style={{ marginTop: 6 }}>
                        <Tag>{student.grade_name || "Tanpa Tingkat"}</Tag>
                        <Tag color='geekblue'>{student.homebase_name || "Sekolah"}</Tag>
                      </div>
                    </div>

                    <Row gutter={[10, 10]}>
                      <Col span={12}>
                        <Card size='small'>
                          <Space direction='vertical' size={0}>
                            <Text type='secondary'>Mapel LMS</Text>
                            <Text strong>{student?.lms?.subjects_total || 0}</Text>
                          </Space>
                        </Card>
                      </Col>
                      <Col span={12}>
                        <Card size='small'>
                          <Space direction='vertical' size={0}>
                            <Text type='secondary'>Materi LMS</Text>
                            <Text strong>{student?.lms?.materials_total || 0}</Text>
                          </Space>
                        </Card>
                      </Col>
                    </Row>

                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card>

    </Space>
  );
};

export default ParentDash;
