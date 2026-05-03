import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Grid,
  Progress,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
  theme,
} from "antd";
import {
  Database,
  Pencil,
  UserRound,
  Sparkles,
  School,
  Users,
  HeartHandshake,
  CalendarDays,
} from "lucide-react";
import {
  useGetMyStudentProfileQuery,
  useUpdateMyStudentProfileMutation,
} from "../../../service/database/ApiDatabase";
import DbForm from "../form/DbForm";

const { Title, Text } = Typography;
const { useToken } = theme;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.36,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
  },
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
};

const getStatusConfig = (status) => {
  if (status === "Terisi") {
    return {
      color: "success",
      label: "Profil lengkap dan siap digunakan",
      accent: "#16a34a",
      bg: "linear-gradient(135deg, #dcfce7, #ecfdf5)",
    };
  }

  return {
    color: "processing",
    label: "Masih ada data yang perlu dilengkapi",
    accent: "#2563eb",
    bg: "linear-gradient(135deg, #dbeafe, #eff6ff)",
  };
};

const renderFieldCard = (label, value, token) => (
  <Col xs={24} sm={12} lg={8} key={label}>
    <div
      style={{
        height: "100%",
        padding: 16,
        borderRadius: 18,
        border: `1px solid ${token.colorBorderSecondary}`,
        background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
      }}
    >
      <Text
        type='secondary'
        style={{ display: "block", fontSize: 12, marginBottom: 6 }}
      >
        {label}
      </Text>
      <Text
        strong
        style={{
          display: "block",
          color: "#0f172a",
          lineHeight: 1.5,
          wordBreak: "break-word",
        }}
      >
        {value || "-"}
      </Text>
    </div>
  </Col>
);

const SectionCard = ({
  title,
  description,
  icon,
  loading,
  children,
  screens,
}) => (
  <Card
    loading={loading}
    style={{
      borderRadius: 24,
      border: "1px solid #eef2ff",
      boxShadow: "0 16px 34px rgba(15, 23, 42, 0.06)",
    }}
    styles={{ body: { padding: screens.md ? 22 : 16 } }}
  >
    <Flex vertical gap={18}>
      <Flex
        align='start'
        justify='space-between'
        gap={12}
        vertical={!screens.sm}
      >
        <Flex align='center' gap={12}>
          <div
            style={{
              width: 46,
              height: 46,
              display: "grid",
              placeItems: "center",
              borderRadius: 16,
              background: "linear-gradient(135deg, #dbeafe, #eff6ff)",
              color: "#1d4ed8",
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
          <div>
            <Title level={5} style={{ margin: 0 }}>
              {title}
            </Title>
            <Text type='secondary'>{description}</Text>
          </div>
        </Flex>
      </Flex>
      {children}
    </Flex>
  </Card>
);

const StudentDatabase = () => {
  const { token } = useToken();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [isOpen, setIsOpen] = useState(false);
  const { data, isLoading, isFetching } = useGetMyStudentProfileQuery();
  const [updateProfile, { isLoading: isUpdating }] =
    useUpdateMyStudentProfileMutation();

  const student = data?.data || null;
  const completionPercent = student?.completion_percent || 0;
  const statusConfig = getStatusConfig(student?.completion_status);

  const summaryCards = useMemo(
    () => [
      {
        key: "status",
        title: "Status Data",
        value: student?.completion_status || "Belum Terisi",
        icon: <Database size={18} />,
        bg: statusConfig.bg,
        color: statusConfig.accent,
      },
      {
        key: "completion",
        title: "Persentase Terisi",
        value: completionPercent,
        suffix: "%",
        icon: <UserRound size={18} />,
        bg: "linear-gradient(135deg, #ede9fe, #eef2ff)",
        color: "#7c3aed",
      },
      {
        key: "siblings",
        title: "Data Keluarga",
        value: student?.siblings?.length || 0,
        icon: <Users size={18} />,
        bg: "linear-gradient(135deg, #fef3c7, #fff7ed)",
        color: "#d97706",
      },
    ],
    [completionPercent, statusConfig, student],
  );

  const handleSubmit = async (values) => {
    try {
      await updateProfile(values).unwrap();
      message.success("Data berhasil diperbarui.");
      setIsOpen(false);
    } catch (error) {
      message.error(error?.data?.message || "Gagal memperbarui data.");
    }
  };

  return (
    <>
      <MotionDiv
        variants={containerVariants}
        initial='hidden'
        animate='show'
        style={{ width: "100%" }}
      >
        <Space
          direction='vertical'
          size={20}
          style={{ width: "100%", display: "flex" }}
        >
          <MotionDiv variants={itemVariants}>
            <Card
              style={{
                borderRadius: 28,
                overflow: "hidden",
                border: "none",
                position: "relative",
                background:
                  "radial-gradient(circle at top left, rgba(56,189,248,0.24), transparent 28%), radial-gradient(circle at right center, rgba(255,255,255,0.12), transparent 18%), linear-gradient(135deg, #0f172a 0%, #1d4ed8 56%, #38bdf8 100%)",
                boxShadow: "0 26px 54px rgba(15, 23, 42, 0.18)",
              }}
              styles={{ body: { padding: isMobile ? 18 : 24 } }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.06), transparent 42%)",
                  pointerEvents: "none",
                }}
              />
              <Flex
                vertical={isMobile}
                justify='space-between'
                align={isMobile ? "stretch" : "center"}
                gap={18}
                style={{ position: "relative" }}
              >
                <div style={{ color: "#fff", maxWidth: 760, flex: 1 }}>
                  <Flex
                    align='center'
                    gap={10}
                    wrap='wrap'
                    style={{ marginBottom: 10 }}
                  >
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.86)",
                        fontWeight: 700,
                        letterSpacing: 0.4,
                      }}
                    >
                      DATABASE SISWA
                    </Text>
                    <Flex
                      align='center'
                      gap={6}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.12)",
                        border: "1px solid rgba(255,255,255,0.16)",
                        color: "#e0f2fe",
                        fontWeight: 600,
                      }}
                    >
                      <Sparkles size={14} />
                      <span>Profil peserta didik</span>
                    </Flex>
                  </Flex>
                  <Title
                    level={isMobile ? 4 : 3}
                    style={{ color: "#fff", margin: "0 0 6px" }}
                  >
                    Kelola profil siswa
                  </Title>
                  <Text
                    style={{
                      color: "rgba(241,245,249,0.84)",
                      display: "block",
                      maxWidth: 620,
                    }}
                  >
                    Tinjau biodata, informasi orang tua, dan data keluarga dari
                    satu halaman yang lebih mudah dibaca untuk kebutuhan
                    operasional harian.
                  </Text>
                </div>

                <Flex
                  vertical={isMobile}
                  gap={12}
                  style={{ width: isMobile ? "100%" : "auto" }}
                >
                  <Button
                    type='primary'
                    icon={<Pencil size={16} />}
                    size='large'
                    onClick={() => setIsOpen(true)}
                    disabled={!student}
                    style={{
                      width: isMobile ? "100%" : 190,
                      height: 46,
                      borderRadius: 14,
                      background: "#fff",
                      color: "#0f172a",
                      border: "none",
                      fontWeight: 600,
                      boxShadow: "0 12px 24px rgba(255,255,255,0.18)",
                    }}
                  >
                    Perbarui Data
                  </Button>
                  {!isMobile && (
                    <div
                      style={{
                        padding: "10px 14px",
                        borderRadius: 16,
                        border: "1px solid rgba(255,255,255,0.14)",
                        background: "rgba(15, 23, 42, 0.18)",
                        color: "#e2e8f0",
                        minWidth: 190,
                      }}
                    >
                      <Text
                        style={{
                          color: "rgba(226,232,240,0.78)",
                          fontSize: 12,
                          display: "block",
                        }}
                      >
                        Status saat ini
                      </Text>
                      <Text
                        strong
                        style={{
                          color: "#fff",
                          display: "block",
                          marginTop: 2,
                        }}
                      >
                        {student?.completion_status || "Belum Terisi"}
                      </Text>
                    </div>
                  )}
                </Flex>
              </Flex>
            </Card>
          </MotionDiv>

          <MotionDiv variants={itemVariants}>
            <Flex gap={16} wrap='wrap'>
              {summaryCards.map((item) => (
                <MotionDiv
                  key={item.key}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.18 }}
                  style={{
                    flex: screens.xl
                      ? "1 1 0"
                      : screens.md
                        ? "1 1 calc(33.333% - 11px)"
                        : "1 1 100%",
                    minWidth: screens.md ? 0 : "100%",
                  }}
                >
                  <Card
                    loading={isLoading || isFetching}
                    style={{
                      borderRadius: 22,
                      border: "1px solid #eef2ff",
                      boxShadow: "0 14px 30px rgba(15, 23, 42, 0.06)",
                    }}
                    styles={{ body: { padding: "18px 20px" } }}
                    hoverable
                  >
                    <Flex justify='space-between' align='start' gap={16}>
                      <Statistic
                        title={item.title}
                        value={item.value}
                        suffix={item.suffix}
                      />
                      <div
                        style={{
                          width: 46,
                          height: 46,
                          display: "grid",
                          placeItems: "center",
                          borderRadius: 16,
                          background: item.bg,
                          color: item.color,
                          flexShrink: 0,
                        }}
                      >
                        {item.icon}
                      </div>
                    </Flex>
                  </Card>
                </MotionDiv>
              ))}
            </Flex>
          </MotionDiv>

          <MotionDiv variants={itemVariants}>
            <Card
              loading={isLoading || isFetching}
              style={{
                borderRadius: 24,
                border: "1px solid #eef2ff",
                boxShadow: "0 16px 34px rgba(15, 23, 42, 0.06)",
              }}
              styles={{ body: { padding: screens.md ? 22 : 16 } }}
            >
              <Flex
                vertical={isMobile}
                justify='space-between'
                align={isMobile ? "stretch" : "center"}
                gap={18}
              >
                <div>
                  <Flex align='center' gap={10} style={{ marginBottom: 8 }}>
                    <Tag
                      color={statusConfig.color}
                      style={{
                        margin: 0,
                        borderRadius: 999,
                        paddingInline: 12,
                        fontWeight: 600,
                      }}
                    >
                      {student?.completion_status || "Belum Terisi"}
                    </Tag>
                    <Text type='secondary'>{statusConfig.label}</Text>
                  </Flex>
                  <Title level={5} style={{ margin: "0 0 4px" }}>
                    Ringkasan keterisian profil
                  </Title>
                  <Text type='secondary'>
                    Pastikan informasi pribadi dan keluarga tetap akurat untuk
                    mendukung administrasi akademik.
                  </Text>
                </div>

                <div
                  style={{
                    width: isMobile ? "100%" : 320,
                    padding: 16,
                    borderRadius: 18,
                    background:
                      "linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)",
                    border: `1px solid ${token.colorBorderSecondary}`,
                  }}
                >
                  <Flex
                    justify='space-between'
                    align='center'
                    style={{ marginBottom: 10 }}
                  >
                    <Text strong style={{ color: "#0f172a" }}>
                      Kelengkapan Data
                    </Text>
                    <Text strong style={{ color: token.colorPrimary }}>
                      {completionPercent}%
                    </Text>
                  </Flex>
                  <Progress
                    percent={completionPercent}
                    strokeColor={{
                      "0%": "#60a5fa",
                      "100%": completionPercent === 100 ? "#22c55e" : "#2563eb",
                    }}
                    trailColor='#e5eefc'
                    showInfo={false}
                    status={completionPercent === 100 ? "success" : "active"}
                  />
                </div>
              </Flex>
            </Card>
          </MotionDiv>

          <MotionDiv variants={itemVariants}>
            <SectionCard
              title='Informasi Pribadi Siswa'
              description='Ringkasan identitas utama dan informasi akademik siswa.'
              icon={<School size={20} />}
              loading={isLoading || isFetching}
              screens={screens}
            >
              {student ? (
                <Row gutter={[16, 16]}>
                  {renderFieldCard(
                    "Satuan Pendidikan",
                    student.education_unit,
                    token,
                  )}
                  {renderFieldCard(
                    "Tahun Pelajaran",
                    student.academic_year,
                    token,
                  )}
                  {renderFieldCard("Tingkat", student.grade_name, token)}
                  {renderFieldCard("Kelas", student.class_name, token)}
                  {renderFieldCard("Nama Lengkap", student.full_name, token)}
                  {renderFieldCard("Jenis Kelamin", student.gender, token)}
                  {renderFieldCard("NIS", student.nis, token)}
                  {renderFieldCard("NISN", student.nisn, token)}
                  {renderFieldCard("Tempat Lahir", student.birth_place, token)}
                  {renderFieldCard(
                    "Tanggal Lahir",
                    formatDate(student.birth_date),
                    token,
                  )}
                  {renderFieldCard("Tinggi", student.height, token)}
                  {renderFieldCard("Berat", student.weight, token)}
                  {renderFieldCard(
                    "Lingkar Kepala",
                    student.head_circumference,
                    token,
                  )}
                  {renderFieldCard("Anak Ke-", student.order_number, token)}
                  {renderFieldCard(
                    "Jumlah Saudara",
                    student.siblings_count,
                    token,
                  )}
                  {renderFieldCard("Kode Pos", student.postal_code, token)}
                  {renderFieldCard("Alamat", student.address, token)}
                </Row>
              ) : (
                <Empty description='Data siswa belum ditemukan.' />
              )}
            </SectionCard>
          </MotionDiv>

          <MotionDiv variants={itemVariants}>
            <SectionCard
              title='Informasi Orang Tua'
              description='Data ayah dan ibu yang digunakan untuk kebutuhan administrasi sekolah.'
              icon={<HeartHandshake size={20} />}
              loading={isLoading || isFetching}
              screens={screens}
            >
              {student ? (
                <Row gutter={[16, 16]}>
                  {renderFieldCard("Nama Ayah", student.father_name, token)}
                  {renderFieldCard("NIK Ayah", student.father_nik, token)}
                  {renderFieldCard(
                    "Tempat Lahir Ayah",
                    student.father_birth_place,
                    token,
                  )}
                  {renderFieldCard(
                    "Tanggal Lahir Ayah",
                    formatDate(student.father_birth_date),
                    token,
                  )}
                  {renderFieldCard("No Tlp Ayah", student.father_phone, token)}
                  {renderFieldCard("Nama Ibu", student.mother_name, token)}
                  {renderFieldCard("NIK Ibu", student.mother_nik, token)}
                  {renderFieldCard(
                    "Tempat Lahir Ibu",
                    student.mother_birth_place,
                    token,
                  )}
                  {renderFieldCard(
                    "Tanggal Lahir Ibu",
                    formatDate(student.mother_birth_date),
                    token,
                  )}
                  {renderFieldCard("No Tlp Ibu", student.mother_phone, token)}
                </Row>
              ) : (
                <Empty description='Data orang tua belum ditemukan.' />
              )}
            </SectionCard>
          </MotionDiv>

          <MotionDiv variants={itemVariants}>
            <SectionCard
              title='Informasi Keluarga Lain'
              description='Daftar anggota keluarga selain orang tua yang tercatat pada profil siswa.'
              icon={<CalendarDays size={20} />}
              loading={isLoading || isFetching}
              screens={screens}
            >
              {student?.siblings?.length > 0 ? (
                <Table
                  rowKey={(item) =>
                    item.id || `${item.name}-${item.birth_date}`
                  }
                  pagination={false}
                  dataSource={student.siblings}
                  scroll={{ x: 520 }}
                  style={{
                    borderRadius: 18,
                    overflow: "hidden",
                    border: `1px solid ${token.colorBorderSecondary}`,
                  }}
                  columns={[
                    {
                      title: "Nama",
                      dataIndex: "name",
                      key: "name",
                      render: (value) => (
                        <Text strong style={{ color: "#0f172a" }}>
                          {value || "-"}
                        </Text>
                      ),
                    },
                    {
                      title: "Jenis Kelamin",
                      dataIndex: "gender",
                      key: "gender",
                      render: (value) => (
                        <Tag
                          color={value === "Perempuan" ? "magenta" : "blue"}
                          style={{ borderRadius: 999, fontWeight: 600 }}
                        >
                          {value || "-"}
                        </Tag>
                      ),
                    },
                    {
                      title: "Tanggal Lahir",
                      dataIndex: "birth_date",
                      key: "birth_date",
                      render: formatDate,
                    },
                  ]}
                />
              ) : (
                <Empty description='Data keluarga belum ada.' />
              )}
            </SectionCard>
          </MotionDiv>
        </Space>
      </MotionDiv>

      <DbForm
        open={isOpen}
        student={student}
        loading={isUpdating}
        onCancel={() => setIsOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  );
};

export default StudentDatabase;
