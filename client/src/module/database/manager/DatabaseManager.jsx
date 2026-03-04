import React, { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
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
} from "antd";
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

const { Text } = Typography;

const PAGE_SIZE = 10;
const EMPTY_OPTIONS = [];

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
    <Text type="secondary" style={{ display: "block", fontSize: 12 }}>
      {label}
    </Text>
    <Text style={{ wordBreak: "break-word" }}>{value || "-"}</Text>
  </Col>
);

const DatabaseManager = ({ scope = "all" }) => {
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
      render: (_, __, index) => (page - 1) * PAGE_SIZE + index + 1,
    },
    {
      title: "Nama Siswa",
      dataIndex: "full_name",
      key: "full_name",
      ellipsis: true,
      render: (value, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{value}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
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
          size="small"
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
          type="text"
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
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Card size="small" title="Informasi Pribadi Siswa">
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

      <Card size="small" title="Informasi Orang Tua">
        <Row gutter={[16, 12]}>
          {renderField("Nama Ayah", record.father_name)}
          {renderField("NIK Ayah", record.father_nik)}
          {renderField("Tempat Lahir Ayah", record.father_birth_place)}
          {renderField("Tanggal Lahir Ayah", formatDate(record.father_birth_date))}
          {renderField("No Tlp Ayah", record.father_phone)}
          {renderField("Nama Ibu", record.mother_name)}
          {renderField("NIK Ibu", record.mother_nik)}
          {renderField("Tempat Lahir Ibu", record.mother_birth_place)}
          {renderField("Tanggal Lahir Ibu", formatDate(record.mother_birth_date))}
          {renderField("No Tlp Ibu", record.mother_phone)}
        </Row>
      </Card>

      <Card size="small" title="Anggota Keluarga (Selain Orang Tua)">
        {(record.siblings || []).length > 0 ? (
          <Table
            rowKey={(item) => item.id}
            size="small"
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
            description="Belum ada data anggota keluarga"
          />
        )}
      </Card>
    </Space>
  );

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Alert
        type="info"
        showIcon
        icon={<Database size={16} />}
        message="Monitoring Keterisian Database Siswa"
        description={
          activePeriodeName
            ? `Perhitungan dan tampilan data siswa berdasarkan periode aktif: ${activePeriodeName}.`
            : "Perhitungan dan tampilan data siswa berdasarkan periode aktif satuan."
        }
      />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Siswa"
              value={summary.total_students}
              prefix={<Users size={16} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Database Terisi"
              value={summary.complete_students}
              prefix={<UserRoundCheck size={16} />}
              valueStyle={{ color: "#389e0d" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Belum Terisi"
              value={summary.incomplete_students}
              prefix={<UserRoundX size={16} />}
              valueStyle={{ color: "#d46b08" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Presentase Terisi"
              value={summary.complete_percentage}
              suffix="%"
              prefix={<UserRound size={16} />}
            />
            <Progress
              percent={summary.average_completion}
              size="small"
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <Space>
            <Filter size={16} />
            <span>Filter Data</span>
          </Space>
        }
      >
        <Row gutter={[12, 12]}>
          <Col xs={24} md={10}>
            <Input.Search
              allowClear
              placeholder="Cari berdasarkan nama, NIS, NISN"
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
              placeholder="Pilih Tingkat"
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
              placeholder="Pilih Kelas"
              style={{ width: "100%" }}
              value={classFilter || undefined}
              options={filteredClassOptions}
              disabled={scope === "homeroom"}
              suffixIcon={scope === "homeroom" ? <Lock size={14} /> : undefined}
              onChange={(value) => {
                setClassFilter(value || "");
                setPage(1);
              }}
            />
          </Col>
        </Row>
        {scope === "homeroom" && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            Data dibatasi ke kelas wali:{" "}
            {teacherScope.classes?.length > 0
              ? teacherScope.classes.map((item) => item.class_name).join(", ")
              : "-"}
          </Text>
        )}
      </Card>

      <Card title="Tabel Database Siswa" styles={{ body: { overflowX: "hidden" } }}>
        <Table
          rowKey="student_id"
          loading={isLoading || isFetching}
          dataSource={data?.data || []}
          columns={columns}
          tableLayout="fixed"
          expandable={{ expandedRowRender }}
          locale={{ emptyText: "Data siswa belum tersedia" }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: data?.meta?.total_data || 0,
            showSizeChanger: false,
            onChange: (nextPage) => setPage(nextPage),
          }}
        />
      </Card>

      {scope === "homeroom" && teacherScope?.is_homeroom === false && (
        <Alert
          type="warning"
          showIcon
          message="Anda belum terdaftar sebagai wali kelas aktif."
          description="Menu database ditampilkan, tetapi data siswa tidak dapat dimuat karena akun guru belum memiliki kelas wali."
        />
      )}

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
    </Space>
  );
};

export default DatabaseManager;
