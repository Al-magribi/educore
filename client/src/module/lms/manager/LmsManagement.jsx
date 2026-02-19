import React, { Suspense, lazy, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  Card,
  Col,
  Empty,
  Flex,
  Input,
  Row,
  Skeleton,
  Space,
  Tag,
  Typography,
  Badge,
  Button,
} from "antd";
import {
  BookOpen,
  Layers,
  Search,
  Users,
  GraduationCap,
  ArrowLeft,
} from "lucide-react";
import { AppLayout } from "../../../components";
import { useGetSubjectsQuery } from "../../../service/lms/ApiLms";
import { useSearchParams } from "react-router-dom";
const TeacherView = lazy(() => import("./teacher/TeacherView"));
const AdminView = lazy(() => import("./admin/AdminView"));

const { Title, Text } = Typography;

const LmsManagement = () => {
  const { user } = useSelector((state) => state.auth);
  const isTeacher = user?.role === "teacher";
  const isAdmin = user?.role === "admin";

  const [searchParams, setSearchParams] = useSearchParams();

  const view = searchParams.get("view");
  const subject_id = searchParams.get("subject_id");

  const [searchText, setSearchText] = useState("");
  const { data: subjectsRes, isLoading } = useGetSubjectsQuery();
  const subjects = subjectsRes?.data || [];

  const filteredSubjects = useMemo(() => {
    if (!searchText) return subjects;
    const keyword = searchText.toLowerCase();
    return subjects.filter((item) => {
      const name = item?.name?.toLowerCase() || "";
      const code = item?.code?.toLowerCase() || "";
      const category = item?.category_name?.toLowerCase() || "";
      const branch = item?.branch_name?.toLowerCase() || "";
      return (
        name.includes(keyword) ||
        code.includes(keyword) ||
        category.includes(keyword) ||
        branch.includes(keyword)
      );
    });
  }, [subjects, searchText]);

  const roleLabel = isAdmin ? "Admin" : "Guru";
  const roleHint = isAdmin
    ? "Menampilkan semua pelajaran pada satuan Anda."
    : "Menampilkan pelajaran yang Anda ampu.";

  const handleDetail = (view, subject_id) => {
    setSearchParams({ view: view, subject_id });
  };

  return (
    <Flex vertical gap={20}>
      <title>Daftar Pelajaran</title>
      {/* Header */}
      <Card
        styles={{ body: { padding: 20 } }}
        style={{ borderRadius: 14, border: "1px solid #f0f0f0" }}
      >
        <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
          <Space size={12} align="center">
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: "#e6f4ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <GraduationCap size={22} style={{ color: "#1677ff" }} />
            </div>
            <div>
              <Title level={4} style={{ margin: 0 }}>
                Daftar Pelajaran
              </Title>
              <Text type="secondary">{roleHint}</Text>
            </div>
          </Space>

          <Space wrap size={12}>
            {view && subject_id && (
              <Button
                icon={<ArrowLeft size={16} />}
                onClick={() => setSearchParams({})}
              >
                Kembali
              </Button>
            )}
            <Badge
              count={filteredSubjects.length}
              color={isAdmin ? "#1677ff" : "#52c41a"}
              showZero
            >
              <Tag
                color={isAdmin ? "blue" : "green"}
                style={{
                  borderRadius: 999,
                  padding: "4px 12px",
                  fontWeight: 600,
                }}
              >
                {roleLabel}
              </Tag>
            </Badge>
            <Input
              allowClear
              placeholder="Cari pelajaran..."
              prefix={<Search size={16} style={{ color: "#8c8c8c" }} />}
              style={{ width: 260 }}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </Space>
        </Flex>
      </Card>

      {/* Content */}
      {view && subject_id ? (
        <Suspense
          fallback={
            <Card style={{ borderRadius: 12 }}>
              <Skeleton active paragraph={{ rows: 4 }} />
            </Card>
          }
        >
          {isTeacher ? (
            <TeacherView
              subjectId={subject_id}
              subject={subjects.find(
                (item) => String(item.id) === String(subject_id),
              )}
            />
          ) : (
            <AdminView
              subjectId={subject_id}
              subject={subjects.find(
                (item) => String(item.id) === String(subject_id),
              )}
            />
          )}
        </Suspense>
      ) : isLoading ? (
        <Row gutter={[16, 16]}>
          {[1, 2, 3, 4, 5, 6].map((key) => (
            <Col xs={24} sm={12} lg={8} xl={6} key={key}>
              <Card style={{ borderRadius: 12 }}>
                <Skeleton active paragraph={{ rows: 3 }} />
              </Card>
            </Col>
          ))}
        </Row>
      ) : filteredSubjects.length === 0 ? (
        <Card style={{ borderRadius: 12 }}>
          <Empty
            description={
              isTeacher
                ? "Belum ada pelajaran yang Anda ampu."
                : "Belum ada pelajaran terdaftar."
            }
          />
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {filteredSubjects.map((item) => (
            <Col xs={24} sm={12} lg={8} xl={6} key={item.id}>
              <Card
                hoverable
                onClick={() =>
                  handleDetail(isTeacher ? "teacher" : "admin", item.id)
                }
                style={{ borderRadius: 14, height: "100%" }}
                styles={{ body: { padding: 18 } }}
              >
                <Flex vertical gap={12}>
                  <Flex align="center" gap={12}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: "#f6ffed",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#52c41a",
                      }}
                    >
                      <BookOpen size={18} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        strong
                        style={{
                          fontSize: 15,
                          display: "block",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={item.name}
                      >
                        {item.name}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Kode: {item.code || "-"}
                      </Text>
                    </div>
                  </Flex>

                  <Space size={[8, 8]} wrap>
                    <Tag
                      color="geekblue"
                      style={{ borderRadius: 999, marginRight: 0 }}
                      icon={<Layers size={14} />}
                    >
                      {item.category_name || "Umum"}
                    </Tag>
                    {item.branch_name && (
                      <Tag
                        color="cyan"
                        style={{ borderRadius: 999, marginRight: 0 }}
                        icon={<Layers size={14} />}
                      >
                        {item.branch_name}
                      </Tag>
                    )}
                  </Space>

                  <Flex justify="space-between" align="center">
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      KKM: {item.kkm ?? "-"}
                    </Text>
                    {isTeacher && item.class_names?.length > 0 && (
                      <Tag
                        color="green"
                        style={{ borderRadius: 999, marginRight: 0 }}
                        icon={<Users size={14} />}
                      >
                        {item.class_names.length} Kelas
                      </Tag>
                    )}
                  </Flex>

                  {isTeacher && item.class_names?.length > 0 && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {item.class_names.join(", ")}
                    </Text>
                  )}
                </Flex>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Flex>
  );
};

export default LmsManagement;
