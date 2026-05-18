import React, { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Grid,
  Input,
  message,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  theme,
} from "antd";
import { motion } from "framer-motion";
import {
  Database,
  Lock,
  Pencil,
  Filter,
  UserRound,
  UserRoundCheck,
  UserRoundX,
  Users,
} from "lucide-react";
import {
  useGetStudentDatabaseQuery,
  useUpdateStudentDatabaseMutation,
} from "../../../service/database/ApiDatabase";
import DbForm from "../form/DbForm";

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;
const { useToken } = theme;

const PAGE_SIZE = 10;
const EMPTY_OPTIONS = [];
const MotionDiv = motion.div;

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.36,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const surfaceCardStyle = {
  borderRadius: 24,
  border: "1px solid #e6eef8",
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
  overflow: "hidden",
};

const heroCardStyle = {
  ...surfaceCardStyle,
  background:
    "radial-gradient(circle at top right, rgba(255,255,255,0.18), transparent 28%), linear-gradient(135deg, #0f172a 0%, #0f4c81 48%, #0ea5e9 100%)",
  color: "#fff",
  boxShadow: "0 24px 54px rgba(15, 23, 42, 0.18)",
};

const statCardStyle = {
  ...surfaceCardStyle,
  background: "linear-gradient(180deg, #ffffff 0%, #f7fbff 100%)",
  height: "100%",
};

const filterCardStyle = {
  ...surfaceCardStyle,
  background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
};

const panelCardStyle = {
  ...surfaceCardStyle,
  background: "#ffffff",
};

const detailCardStyle = {
  borderRadius: 18,
  border: "1px solid #eef2f7",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
};

const iconWrapStyle = (background, color) => ({
  width: 46,
  height: 46,
  borderRadius: 16,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background,
  color,
  flexShrink: 0,
});

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

const renderField = (label, value) => (
  <Col xs={24} md={12} key={label}>
    <div
      style={{
        height: "100%",
        padding: 14,
        borderRadius: 16,
        border: "1px solid #edf2f7",
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
          color: "#0f172a",
          wordBreak: "break-word",
          lineHeight: 1.5,
        }}
      >
        {value || "-"}
      </Text>
    </div>
  </Col>
);

const StudentDatabaseManager = ({ scope = "all" }) => {
  const screens = useBreakpoint();
  const { token } = useToken();
  const isMobile = !screens.md;
  const isSmallMobile = !screens.sm;
  const [searchText, setSearchText] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [updateStudentDatabase, { isLoading: isUpdating }] =
    useUpdateStudentDatabaseMutation();

  const query = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: searchText,
      grade_id: gradeFilter,
      class_id: classFilter,
      scope,
    }),
    [page, searchText, gradeFilter, classFilter, scope],
  );

  const { data, isLoading, isFetching } = useGetStudentDatabaseQuery(query);

  const summary = data?.summary || {
    total_students: 0,
    complete_students: 0,
    incomplete_students: 0,
    average_completion: 0,
    complete_percentage: 0,
  };
  const activePeriodeName = data?.active_periode?.name;
  const teacherScope = data?.teacher_scope || {
    is_homeroom: true,
    classes: [],
  };

  const gradeOptions = data?.filters?.grades || EMPTY_OPTIONS;
  const classOptions = data?.filters?.classes || EMPTY_OPTIONS;
  const stats = [
    {
      key: "total",
      title: "Total Siswa",
      value: summary.total_students,
      icon: <Users size={18} />,
      iconBg: "#dbeafe",
      iconColor: "#1d4ed8",
      accent: "#1d4ed8",
      helper: "Seluruh siswa pada periode aktif",
    },
    {
      key: "complete",
      title: "Database Terisi",
      value: summary.complete_students,
      icon: <UserRoundCheck size={18} />,
      iconBg: "#dcfce7",
      iconColor: "#15803d",
      accent: "#15803d",
      helper: "Profil siswa telah lengkap",
    },
    {
      key: "incomplete",
      title: "Belum Terisi",
      value: summary.incomplete_students,
      icon: <UserRoundX size={18} />,
      iconBg: "#ffedd5",
      iconColor: "#c2410c",
      accent: "#c2410c",
      helper: "Masih perlu pembaruan data",
    },
    {
      key: "percentage",
      title: "Persentase Terisi",
      value: summary.complete_percentage,
      suffix: "%",
      icon: <UserRound size={18} />,
      iconBg: "#ede9fe",
      iconColor: "#6d28d9",
      accent: "#6d28d9",
      helper: `${summary.average_completion || 0}% rata-rata kelengkapan`,
    },
  ];

  const scopeLabel =
    scope === "homeroom" ? "Monitoring kelas wali" : "Monitoring seluruh siswa";

  const heroTitle =
    scope === "homeroom"
      ? "Pantau database siswa kelas wali dari satu workspace."
      : "Monitoring database siswa";

  const heroDescription = activePeriodeName
    ? `Progres kelengkapan data dihitung berdasarkan periode aktif ${activePeriodeName}, sehingga tim dapat memantau pembaruan profil siswa secara lebih akurat.`
    : "Progres kelengkapan data siswa dirangkum dalam satu halaman untuk memudahkan validasi dan tindak lanjut administrasi.";

  const filteredClassOptions = useMemo(() => {
    if (!gradeFilter) return classOptions;
    return classOptions.filter(
      (item) => String(item.grade_id) === String(gradeFilter),
    );
  }, [classOptions, gradeFilter]);

  const columns = [
    {
      title: "No",
      width: 64,
      align: "center",
      responsive: ["sm"],
      render: (_, __, index) => (page - 1) * PAGE_SIZE + index + 1,
    },
    {
      title: "Nama Siswa",
      dataIndex: "full_name",
      key: "full_name",
      ellipsis: true,
      render: (value, record) => (
        <Space vertical size={0}>
          <Text strong>{value}</Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            NIS: {record.nis || "-"} | Tingkat: {record.grade_name || "-"} |
            Kelas: {record.class_name || "-"}
          </Text>
        </Space>
      ),
    },
    {
      title: "Status Data",
      dataIndex: "completion_status",
      key: "completion_status",
      width: 130,
      align: "center",
      responsive: ["sm"],
      render: (status) => (
        <Tag color={status === "Terisi" ? "green" : "orange"}>{status}</Tag>
      ),
    },
    {
      title: "Terisi",
      dataIndex: "completion_percent",
      key: "completion_percent",
      width: 180,
      responsive: ["sm"],
      render: (value) => (
        <Progress
          percent={value}
          size='small'
          status={value === 100 ? "success" : "active"}
          strokeColor={value === 100 ? "#52c41a" : "#1677ff"}
        />
      ),
    },
    {
      title: "Aksi",
      key: "action",
      width: 90,
      align: "center",
      render: (_, record) => (
        <Button
          type='text'
          icon={<Pencil size={14} />}
          onClick={() => {
            setSelectedStudent(record);
            setIsFormOpen(true);
          }}
        >
          Edit
        </Button>
      ),
    },
  ];

  const handleUpdate = async (values) => {
    if (!selectedStudent?.student_id) return;

    try {
      await updateStudentDatabase({
        id: selectedStudent.student_id,
        ...values,
      }).unwrap();
      message.success("Data siswa berhasil diperbarui.");
      setIsFormOpen(false);
      setSelectedStudent(null);
    } catch (error) {
      message.error(error?.data?.message || "Gagal memperbarui data siswa.");
    }
  };

  const expandedRowRender = (record) => (
    <Space vertical size={12} style={{ width: "100%" }}>
      <Card
        size='small'
        title={
          <Flex align='center' gap={10}>
            <div
              style={{
                ...iconWrapStyle(
                  "linear-gradient(135deg, #dbeafe, #eff6ff)",
                  "#1d4ed8",
                ),
                width: 40,
                height: 40,
                borderRadius: 14,
              }}
            >
              <Database size={18} />
            </div>
            <div>
              <Text strong style={{ display: "block", color: "#0f172a" }}>
                Informasi Pribadi Siswa
              </Text>
              <Text type='secondary' style={{ fontSize: 12 }}>
                Biodata dan informasi akademik utama siswa
              </Text>
            </div>
          </Flex>
        }
        style={detailCardStyle}
        styles={{ body: { background: "#fcfdff" } }}
      >
        <Row gutter={[16, 12]}>
          {renderField("Tahun Pelajaran", record.academic_year)}
          {renderField("Satuan Pendidikan", record.education_unit)}
          {renderField("Nama Lengkap", record.full_name)}
          {renderField("Jenis Kelamin", record.gender)}
          {renderField("NIS", record.nis)}
          {renderField("NISN", record.nisn)}
          {renderField("Tempat Lahir", record.birth_place)}
          {renderField("Tanggal Lahir", formatDate(record.birth_date))}
          {renderField("Tinggi", record.height)}
          {renderField("Berat", record.weight)}
          {renderField("Kepala", record.head_circumference)}
          {renderField("Anak Ke-", record.order_number)}
          {renderField("Jumlah Saudara", record.siblings_count)}
          {renderField("Provinsi", record.province)}
          {renderField("Kota / Kabupaten", record.city)}
          {renderField("Kecamatan", record.district)}
          {renderField("Desa / Kelurahan", record.village)}
          {renderField("Kode Pos", record.postal_code)}
          {renderField("Alamat Lengkap", record.address)}
        </Row>
      </Card>

      <Card
        size='small'
        title={
          <Flex align='center' gap={10}>
            <div
              style={{
                ...iconWrapStyle(
                  "linear-gradient(135deg, #dcfce7, #ecfdf5)",
                  "#15803d",
                ),
                width: 40,
                height: 40,
                borderRadius: 14,
              }}
            >
              <Users size={18} />
            </div>
            <div>
              <Text strong style={{ display: "block", color: "#0f172a" }}>
                Informasi Orang Tua
              </Text>
              <Text type='secondary' style={{ fontSize: 12 }}>
                Data ayah dan ibu untuk kebutuhan administrasi sekolah
              </Text>
            </div>
          </Flex>
        }
        style={detailCardStyle}
        styles={{ body: { background: "#fcfdff" } }}
      >
        <Row gutter={[16, 12]}>
          {renderField("Nama Ayah", record.father_name)}
          {renderField("NIK Ayah", record.father_nik)}
          {renderField("Tempat Lahir Ayah", record.father_birth_place)}
          {renderField(
            "Tanggal Lahir Ayah",
            formatDate(record.father_birth_date),
          )}
          {renderField("No Tlp Ayah", record.father_phone)}
          {renderField("Nama Ibu", record.mother_name)}
          {renderField("NIK Ibu", record.mother_nik)}
          {renderField("Tempat Lahir Ibu", record.mother_birth_place)}
          {renderField(
            "Tanggal Lahir Ibu",
            formatDate(record.mother_birth_date),
          )}
          {renderField("No Tlp Ibu", record.mother_phone)}
        </Row>
      </Card>

      <Card
        size='small'
        title={
          <Flex align='center' gap={10}>
            <div
              style={{
                ...iconWrapStyle(
                  "linear-gradient(135deg, #fef3c7, #fff7ed)",
                  "#d97706",
                ),
                width: 40,
                height: 40,
                borderRadius: 14,
              }}
            >
              <UserRound size={18} />
            </div>
            <div>
              <Text strong style={{ display: "block", color: "#0f172a" }}>
                Anggota Keluarga Lain
              </Text>
              <Text type='secondary' style={{ fontSize: 12 }}>
                Data keluarga selain orang tua yang tercatat pada profil siswa
              </Text>
            </div>
          </Flex>
        }
        style={detailCardStyle}
        styles={{ body: { background: "#fcfdff" } }}
      >
        {(record.siblings || []).length > 0 ? (
          <Table
            rowKey={(item) => item.id}
            size='small'
            pagination={false}
            dataSource={record.siblings}
            columns={[
              { title: "Nama", dataIndex: "name", key: "name" },
              { title: "Jenis Kelamin", dataIndex: "gender", key: "gender" },
              {
                title: "Tanggal Lahir",
                dataIndex: "birth_date",
                key: "birth_date",
                render: formatDate,
              },
            ]}
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description='Belum ada data anggota keluarga'
          />
        )}
      </Card>
    </Space>
  );

  return (
    <MotionDiv
      variants={containerVariants}
      initial='hidden'
      animate='show'
      style={{ width: "100%" }}
    >
      <Space vertical size={isMobile ? 16 : 20} style={{ width: "100%" }}>
        <MotionDiv variants={itemVariants}>
          <Card
            style={heroCardStyle}
            bodyStyle={{ padding: isSmallMobile ? 16 : isMobile ? 20 : 28 }}
          >
            <Row gutter={[20, 20]} align='middle'>
              <Col xs={24} lg={15}>
                <Flex vertical gap={12} style={{ width: "100%" }}>
                  <Flex align='center' gap={10} wrap='wrap'>
                    <Flex
                      align='center'
                      gap={8}
                      style={{
                        padding: "8px 14px",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.12)",
                        border: "1px solid rgba(255,255,255,0.16)",
                        color: "#f8fafc",
                        fontWeight: 700,
                        letterSpacing: 0.4,
                      }}
                    >
                      <Database size={16} />
                      <span>DATABASE SISWA</span>
                    </Flex>
                    <Flex
                      align='center'
                      gap={6}
                      style={{
                        padding: "7px 12px",
                        borderRadius: 999,
                        background: "rgba(15,23,42,0.18)",
                        color: "#e0f2fe",
                      }}
                    >
                      <UserRound size={14} />
                      <span>{scopeLabel}</span>
                    </Flex>
                  </Flex>

                  <div>
                    <Title
                      level={isSmallMobile ? 4 : 3}
                      style={{
                        color: "#ffffff",
                        margin: 0,
                        marginBottom: 6,
                        fontSize: isSmallMobile ? 18 : undefined,
                        lineHeight: 1.15,
                      }}
                    >
                      {heroTitle}
                    </Title>
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.82)",
                        fontSize: isSmallMobile ? 13 : 14,
                        display: "block",
                        maxWidth: 640,
                      }}
                    >
                      {heroDescription}
                    </Text>
                  </div>
                </Flex>
              </Col>
              <Col xs={24} lg={9}>
                <div
                  style={{
                    padding: isSmallMobile ? 14 : isMobile ? 16 : 18,
                    borderRadius: 20,
                    background: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.16)",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <Text
                    style={{
                      display: "block",
                      color: "rgba(255,255,255,0.72)",
                      marginBottom: 8,
                    }}
                  >
                    Rata-rata kelengkapan
                  </Text>
                  <Title
                    level={isSmallMobile ? 3 : 2}
                    style={{
                      color: "#ffffff",
                      margin: 0,
                      marginBottom: 10,
                      fontSize: isSmallMobile ? 26 : undefined,
                    }}
                  >
                    {summary.average_completion || 0}%
                  </Title>
                  <Progress
                    percent={summary.average_completion}
                    strokeColor={{
                      "0%": "#7dd3fc",
                      "100%": "#ffffff",
                    }}
                    trailColor='rgba(255,255,255,0.18)'
                    showInfo={false}
                  />
                </div>
              </Col>
            </Row>
          </Card>
        </MotionDiv>

        <Row gutter={[16, 16]}>
          {stats.map((item) => (
            <Col xs={24} sm={12} lg={6} key={item.key}>
              <MotionDiv
                variants={itemVariants}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                style={{ height: "100%" }}
              >
                <Card
                  style={statCardStyle}
                  bodyStyle={{
                    padding: isSmallMobile ? 16 : 20,
                    display: "flex",
                    flexDirection: "column",
                    gap: isSmallMobile ? 12 : 14,
                    height: "100%",
                  }}
                >
                  <Space align='start' size={14} style={{ width: "100%" }}>
                    <div style={iconWrapStyle(item.iconBg, item.iconColor)}>
                      {item.icon}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <Text
                        type='secondary'
                        style={{
                          fontSize: 13,
                          display: "block",
                          marginBottom: 4,
                          whiteSpace: "normal",
                        }}
                      >
                        {item.title}
                      </Text>
                      <Statistic
                        value={item.value}
                        suffix={item.suffix}
                        styles={{ content: { color: item.accent } }}
                      />
                    </div>
                  </Space>
                  <Text type='secondary' style={{ fontSize: 12 }}>
                    {item.helper}
                  </Text>
                  {item.key === "percentage" && (
                    <Progress
                      percent={summary.average_completion}
                      size='small'
                      strokeColor={item.accent}
                      style={{ marginTop: "auto" }}
                    />
                  )}
                </Card>
              </MotionDiv>
            </Col>
          ))}
        </Row>

        <MotionDiv variants={itemVariants}>
          <Card
            style={filterCardStyle}
            styles={{
              body: { padding: isSmallMobile ? 14 : isMobile ? 18 : 22 },
            }}
            title={
              <Space
                align='center'
                direction={isSmallMobile ? "vertical" : "horizontal"}
                size={isSmallMobile ? 8 : 12}
                style={{
                  width: "100%",
                  alignItems: isSmallMobile ? "flex-start" : "center",
                }}
              >
                <span style={iconWrapStyle("#dbeafe", "#1d4ed8")}>
                  <Filter size={18} />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>Filter Data</div>
                  <Text type='secondary' style={{ fontSize: 12 }}>
                    Persempit data untuk fokus pada kelompok siswa tertentu.
                  </Text>
                </div>
              </Space>
            }
          >
            <Row gutter={[12, 12]}>
              <Col xs={24} md={10}>
                <Input.Search
                  allowClear
                  placeholder='Cari berdasarkan nama, NIS, NISN'
                  size='large'
                  onChange={(event) => {
                    setSearchText(event.target.value);
                    setPage(1);
                  }}
                  onSearch={(value) => {
                    setSearchText(value);
                    setPage(1);
                  }}
                />
              </Col>
              <Col xs={24} md={7}>
                <Select
                  allowClear
                  placeholder='Pilih Tingkat'
                  size='large'
                  style={{ width: "100%" }}
                  value={gradeFilter || undefined}
                  options={gradeOptions}
                  onChange={(value) => {
                    setGradeFilter(value || "");
                    setClassFilter("");
                    setPage(1);
                  }}
                />
              </Col>
              <Col xs={24} md={7}>
                <Select
                  allowClear
                  placeholder='Pilih Kelas'
                  size='large'
                  style={{ width: "100%" }}
                  value={classFilter || undefined}
                  options={filteredClassOptions}
                  disabled={scope === "homeroom"}
                  suffixIcon={
                    scope === "homeroom" ? <Lock size={14} /> : undefined
                  }
                  onChange={(value) => {
                    setClassFilter(value || "");
                    setPage(1);
                  }}
                />
              </Col>
            </Row>
            <Flex
              justify='space-between'
              align={isSmallMobile ? "flex-start" : "center"}
              vertical={isSmallMobile}
              gap={10}
              style={{
                marginTop: 14,
                padding: "12px 14px",
                borderRadius: 16,
                background: "linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)",
                border: "1px solid #edf2f7",
              }}
            >
              <div>
                <Text strong style={{ color: "#0f172a", display: "block" }}>
                  Tampilan data
                </Text>
                <Text type='secondary' style={{ fontSize: 12 }}>
                  Gunakan pencarian dan filter untuk fokus pada kelompok siswa
                  yang membutuhkan validasi.
                </Text>
              </div>
              <Tag
                color='blue'
                style={{
                  margin: 0,
                  borderRadius: 999,
                  paddingInline: 12,
                  fontWeight: 600,
                }}
              >
                {data?.meta?.total_data || 0} data
              </Tag>
            </Flex>
            {scope === "homeroom" && (
              <Text
                type='secondary'
                style={{ fontSize: 12, display: "block", marginTop: 12 }}
              >
                Data dibatasi ke kelas wali:{" "}
                {teacherScope.classes?.length > 0
                  ? teacherScope.classes
                      .map((item) => item.class_name)
                      .join(", ")
                  : "-"}
              </Text>
            )}
          </Card>
        </MotionDiv>

        <MotionDiv variants={itemVariants}>
          <Card
            title={
              <Flex
                justify='space-between'
                align={isSmallMobile ? "flex-start" : "center"}
                vertical={isSmallMobile}
                gap={12}
              >
                <Space direction='vertical' size={2} style={{ width: "100%" }}>
                  <Text strong style={{ fontSize: 16, color: "#0f172a" }}>
                    Tabel Database Siswa
                  </Text>
                  <Text type='secondary' style={{ fontSize: 12 }}>
                    Klik baris untuk melihat detail, lalu gunakan aksi edit bila
                    perlu.
                  </Text>
                </Space>
                <Tag
                  color='geekblue'
                  style={{
                    margin: 0,
                    borderRadius: 999,
                    paddingInline: 12,
                    fontWeight: 600,
                  }}
                >
                  Halaman {page}
                </Tag>
              </Flex>
            }
            style={panelCardStyle}
            styles={{
              body: {
                overflowX: "hidden",
                padding: isSmallMobile ? 12 : isMobile ? 16 : 24,
              },
              header: {
                borderBottom: `1px solid ${token.colorBorderSecondary}`,
              },
            }}
          >
            <Table
              rowKey='student_id'
              loading={isLoading || isFetching}
              dataSource={data?.data || []}
              columns={columns}
              tableLayout='fixed'
              expandable={{ expandedRowRender }}
              locale={{ emptyText: "Data siswa belum tersedia" }}
              scroll={isMobile ? { x: 760 } : undefined}
              rowClassName={() => "student-database-row"}
              pagination={{
                current: page,
                pageSize: PAGE_SIZE,
                total: data?.meta?.total_data || 0,
                showSizeChanger: false,
                size: isMobile ? "small" : "default",
                showLessItems: isMobile,
                onChange: (nextPage) => setPage(nextPage),
              }}
            />
          </Card>
        </MotionDiv>

        {scope === "homeroom" && teacherScope?.is_homeroom === false && (
          <MotionDiv variants={itemVariants}>
            <Alert
              type='warning'
              showIcon
              message='Anda belum terdaftar sebagai wali kelas aktif.'
              description='Menu database ditampilkan, tetapi data siswa tidak dapat dimuat karena akun guru belum memiliki kelas wali.'
              style={{
                borderRadius: 18,
                border: "1px solid #fde68a",
                boxShadow: "0 12px 24px rgba(217, 119, 6, 0.08)",
              }}
            />
          </MotionDiv>
        )}
      </Space>

      <DbForm
        open={isFormOpen}
        student={selectedStudent}
        loading={isUpdating}
        onCancel={() => {
          setIsFormOpen(false);
          setSelectedStudent(null);
        }}
        onSubmit={handleUpdate}
      />
    </MotionDiv>
  );
};

export default StudentDatabaseManager;
