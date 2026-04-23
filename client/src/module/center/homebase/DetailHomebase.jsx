import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Row,
  Col,
  Card,
  Statistic,
  Select,
  Tag,
  Spin,
  Empty,
  Space,
  Typography,
  Grid,
  Progress,
} from "antd";
import {
  UserOutlined,
  TeamOutlined,
  ReadOutlined,
  BankOutlined,
  ManOutlined,
  WomanOutlined,
  CalendarOutlined,
  ApartmentOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import { useLazyDetailHomebaseQuery } from "../../../service/center/ApiHomebase";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const modalVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.25, ease: "easeOut" },
  },
};

const DetailHomebase = ({ open, homebaseId, onCancel }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [periodeId, setPeriodeId] = useState(null);

  const [triggerGetDetail, { data: apiData, isFetching }] =
    useLazyDetailHomebaseQuery();

  const selectedPeriodeId =
    periodeId ?? apiData?.data?.selected_periode_id ?? undefined;

  useEffect(() => {
    if (open && homebaseId) {
      triggerGetDetail({ id: homebaseId, periode_id: selectedPeriodeId });
    }
  }, [open, homebaseId, selectedPeriodeId, triggerGetDetail]);

  const stats = useMemo(() => apiData?.data?.stats || {}, [apiData?.data?.stats]);
  const composition = apiData?.data?.class_composition || [];
  const periods = apiData?.data?.periods || [];
  const teacherMale = stats.teachers?.laki || 0;
  const teacherFemale = stats.teachers?.perempuan || 0;
  const totalTeacherGender = teacherMale + teacherFemale;

  const cards = useMemo(
    () => [
      {
        key: "teachers",
        title: "Total Guru",
        value: stats.teachers?.total || 0,
        icon: <UserOutlined />,
        color: "#b45309",
        bg: "linear-gradient(135deg, rgba(245,158,11,0.16), rgba(251,191,36,0.1))",
      },
      {
        key: "students",
        title: "Total Siswa",
        value: stats.students?.total || 0,
        icon: <TeamOutlined />,
        color: "#1d4ed8",
        bg: "linear-gradient(135deg, rgba(59,130,246,0.16), rgba(14,165,233,0.1))",
      },
      {
        key: "classes",
        title: "Total Kelas",
        value: stats.classes?.total || 0,
        icon: <BankOutlined />,
        color: "#be123c",
        bg: "linear-gradient(135deg, rgba(244,63,94,0.16), rgba(251,113,133,0.1))",
      },
      {
        key: "subjects",
        title: "Total Pelajaran",
        value: stats.subjects?.total || 0,
        icon: <ReadOutlined />,
        color: "#15803d",
        bg: "linear-gradient(135deg, rgba(34,197,94,0.16), rgba(16,185,129,0.1))",
      },
    ],
    [stats],
  );

  return (
    <Modal
      title={null}
      open={open}
      onCancel={() => {
        setPeriodeId(null);
        onCancel();
      }}
      width={1100}
      footer={null}
      destroyOnHidden
      styles={{
        body: {
          padding: isMobile ? 16 : 20,
          background: "#f8fafc",
        },
      }}
      modalRender={(node) => (
        <MotionDiv
          variants={modalVariants}
          initial="hidden"
          animate="show"
          style={{ borderRadius: 28, overflow: "hidden" }}
        >
          {node}
        </MotionDiv>
      )}
    >
      <Space orientation="vertical" size={20} style={{ width: "100%" }}>
        <Card
          variant="borderless"
          style={{
            borderRadius: 24,
            background:
              "radial-gradient(circle at top left, rgba(14,165,233,0.18), transparent 28%), linear-gradient(135deg, #0f172a, #1d4ed8 58%, #0f766e)",
            boxShadow: "0 24px 60px rgba(15, 23, 42, 0.18)",
          }}
          styles={{ body: { padding: isMobile ? 20 : 28 } }}
        >
          <Space
            orientation="vertical"
            size={14}
            style={{ width: "100%" }}
          >
            <Tag
              icon={<ApartmentOutlined />}
              style={{
                width: "fit-content",
                margin: 0,
                borderRadius: 999,
                background: "rgba(255,255,255,0.12)",
                borderColor: "rgba(255,255,255,0.2)",
                color: "#e0f2fe",
                paddingInline: 12,
              }}
            >
              Dashboard Detail Satuan Pendidikan
            </Tag>

            <div>
              <Title
                level={3}
                style={{
                  margin: 0,
                  color: "#f8fafc",
                  fontSize: isMobile ? 24 : 30,
                }}
              >
                Ringkasan homebase per periode ajaran.
              </Title>
              <Text
                style={{
                  display: "block",
                  marginTop: 8,
                  color: "rgba(226, 232, 240, 0.92)",
                  maxWidth: 760,
                  lineHeight: 1.75,
                }}
              >
                Pantau statistik guru, siswa, kelas, serta distribusi komposisi
                kelas dalam satu tampilan yang lebih nyaman untuk dianalisis.
              </Text>
            </div>

            <Space
              wrap
              size={[12, 12]}
              style={{ width: "100%", justifyContent: "space-between" }}
            >
              <Text style={{ color: "#e2e8f0", fontSize: 13 }}>
                Pilih periode untuk melihat ringkasan yang paling relevan.
              </Text>
              <Select
                style={{ width: isMobile ? "100%" : 260 }}
                value={selectedPeriodeId ? Number(selectedPeriodeId) : undefined}
                onChange={(val) => setPeriodeId(val)}
                placeholder="Pilih Periode"
                loading={isFetching}
                suffixIcon={<CalendarOutlined style={{ color: "#64748b" }} />}
                options={periods.map((p) => ({
                  value: p.id,
                  label: `${p.name}${p.is_active ? " - Aktif" : ""}`,
                }))}
              />
            </Space>
          </Space>
        </Card>

        {isFetching && !apiData ? (
          <Card
            variant="borderless"
            style={{ borderRadius: 24, minHeight: 300 }}
            styles={{ body: { padding: 32 } }}
          >
            <div
              style={{
                minHeight: 240,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Spin size="large" />
            </div>
          </Card>
        ) : (
          <>
            <Row gutter={[16, 16]}>
              {cards.map((item) => (
                <Col xs={24} sm={12} lg={6} key={item.key}>
                  <MotionDiv whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
                    <Card
                      variant="borderless"
                      style={{
                        borderRadius: 22,
                        background: item.bg,
                        border: "1px solid rgba(148, 163, 184, 0.14)",
                      }}
                      styles={{ body: { padding: 18 } }}
                    >
                      <Statistic
                        title={
                          <Text style={{ color: "#475569", fontSize: 13 }}>
                            {item.title}
                          </Text>
                        }
                        value={item.value}
                        prefix={
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 14,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              marginRight: 10,
                              background: "rgba(255,255,255,0.72)",
                              color: item.color,
                            }}
                          >
                            {item.icon}
                          </div>
                        }
                        valueStyle={{ color: "#0f172a", fontSize: 28 }}
                      />
                    </Card>
                  </MotionDiv>
                </Col>
              ))}
            </Row>

            <Row gutter={[16, 16]}>
              <Col xs={24} lg={16}>
                <Card
                  title="Komposisi Siswa per Kelas"
                  variant="borderless"
                  style={{
                    borderRadius: 24,
                    border: "1px solid rgba(148, 163, 184, 0.14)",
                    boxShadow: "0 20px 50px rgba(15, 23, 42, 0.06)",
                  }}
                  styles={{ body: { padding: 20 } }}
                >
                  {composition.length === 0 ? (
                    <Empty description="Belum ada kelas atau siswa pada periode ini" />
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isMobile
                          ? "1fr"
                          : "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: 14,
                        maxHeight: 460,
                        overflowY: "auto",
                        paddingRight: 4,
                      }}
                    >
                      {composition.map((cls, idx) => (
                        <MotionDiv
                          key={`${cls.class_name}-${idx}`}
                          whileHover={{ y: -3 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Card
                            variant="borderless"
                            style={{
                              borderRadius: 20,
                              background:
                                "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96))",
                              border: "1px solid rgba(148, 163, 184, 0.16)",
                            }}
                            styles={{ body: { padding: 18 } }}
                          >
                            <Space
                              orientation="vertical"
                              size={14}
                              style={{ width: "100%" }}
                            >
                              <div>
                                <Text
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: "#64748b",
                                  }}
                                >
                                  Kelas
                                </Text>
                                <Title
                                  level={5}
                                  style={{ margin: "4px 0 0", color: "#0f172a" }}
                                >
                                  {cls.class_name}
                                </Title>
                              </div>

                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                                  gap: 12,
                                }}
                              >
                                <div
                                  style={{
                                    borderRadius: 16,
                                    padding: 14,
                                    background: "rgba(59,130,246,0.08)",
                                  }}
                                >
                                  <Space align="center" size={10}>
                                    <ManOutlined
                                      style={{ color: "#2563eb", fontSize: 18 }}
                                    />
                                    <div>
                                      <Text
                                        style={{ fontSize: 12, color: "#64748b" }}
                                      >
                                        Ikhwan
                                      </Text>
                                      <Title
                                        level={4}
                                        style={{ margin: 0, color: "#0f172a" }}
                                      >
                                        {cls.laki}
                                      </Title>
                                    </div>
                                  </Space>
                                </div>

                                <div
                                  style={{
                                    borderRadius: 16,
                                    padding: 14,
                                    background: "rgba(236,72,153,0.08)",
                                  }}
                                >
                                  <Space align="center" size={10}>
                                    <WomanOutlined
                                      style={{ color: "#db2777", fontSize: 18 }}
                                    />
                                    <div>
                                      <Text
                                        style={{ fontSize: 12, color: "#64748b" }}
                                      >
                                        Akhwat
                                      </Text>
                                      <Title
                                        level={4}
                                        style={{ margin: 0, color: "#0f172a" }}
                                      >
                                        {cls.perempuan}
                                      </Title>
                                    </div>
                                  </Space>
                                </div>
                              </div>

                              <div
                                style={{
                                  borderRadius: 14,
                                  padding: "10px 12px",
                                  background: "#f8fafc",
                                  border: "1px solid #e2e8f0",
                                }}
                              >
                                <Text style={{ color: "#475569", fontSize: 12 }}>
                                  Total siswa
                                </Text>
                                <Title
                                  level={4}
                                  style={{ margin: "2px 0 0", color: "#0f172a" }}
                                >
                                  {cls.total_students}
                                </Title>
                              </div>
                            </Space>
                          </Card>
                        </MotionDiv>
                      ))}
                    </div>
                  )}
                </Card>
              </Col>

              <Col xs={24} lg={8}>
                <Space orientation="vertical" size={16} style={{ width: "100%" }}>
                  <Card
                    title="Komposisi Guru"
                    variant="borderless"
                    style={{
                      borderRadius: 24,
                      border: "1px solid rgba(148, 163, 184, 0.14)",
                      boxShadow: "0 20px 50px rgba(15, 23, 42, 0.06)",
                    }}
                    styles={{ body: { padding: 20 } }}
                  >
                    <Space orientation="vertical" size={14} style={{ width: "100%" }}>
                      <div
                        style={{
                          borderRadius: 20,
                          padding: 18,
                          background:
                            "linear-gradient(135deg, rgba(245,158,11,0.16), rgba(251,191,36,0.08))",
                        }}
                      >
                        <Space align="center" size={14}>
                          <div
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 16,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: "rgba(255,255,255,0.75)",
                              color: "#d97706",
                              fontSize: 20,
                            }}
                          >
                            <ManOutlined />
                          </div>
                          <div>
                            <Text style={{ color: "#92400e", fontSize: 12 }}>
                              Ikhwan
                            </Text>
                            <Title level={3} style={{ margin: 0, color: "#78350f" }}>
                              {teacherMale}
                            </Title>
                          </div>
                        </Space>
                      </div>

                      <div
                        style={{
                          borderRadius: 20,
                          padding: 18,
                          background:
                            "linear-gradient(135deg, rgba(236,72,153,0.16), rgba(244,114,182,0.08))",
                        }}
                      >
                        <Space align="center" size={14}>
                          <div
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 16,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: "rgba(255,255,255,0.75)",
                              color: "#db2777",
                              fontSize: 20,
                            }}
                          >
                            <WomanOutlined />
                          </div>
                          <div>
                            <Text style={{ color: "#9d174d", fontSize: 12 }}>
                              Akhwat
                            </Text>
                            <Title level={3} style={{ margin: 0, color: "#831843" }}>
                              {teacherFemale}
                            </Title>
                          </div>
                        </Space>
                      </div>

                      <div>
                        <Text style={{ color: "#64748b", fontSize: 12 }}>
                          Proporsi guru laki-laki
                        </Text>
                        <Progress
                          percent={
                            totalTeacherGender
                              ? Math.round((teacherMale / totalTeacherGender) * 100)
                              : 0
                          }
                          strokeColor="#f59e0b"
                          trailColor="#f1f5f9"
                          showInfo
                        />
                      </div>
                    </Space>
                  </Card>
                </Space>
              </Col>
            </Row>
          </>
        )}
      </Space>
    </Modal>
  );
};

export default DetailHomebase;
