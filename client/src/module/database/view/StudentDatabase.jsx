import React, { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  message,
  Progress,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import { Database, Pencil, UserRound } from "lucide-react";
import {
  useGetMyStudentProfileQuery,
  useUpdateMyStudentProfileMutation,
} from "../../../service/database/ApiDatabase";
import DbForm from "../form/DbForm";

const { Text } = Typography;

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

const StudentDatabase = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { data, isLoading, isFetching } = useGetMyStudentProfileQuery();
  const [updateProfile, { isLoading: isUpdating }] =
    useUpdateMyStudentProfileMutation();

  const student = data?.data || null;

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
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Alert
        type="info"
        showIcon
        icon={<Database size={16} />}
        message="Data Profil Siswa"
        description="Anda dapat melihat dan memperbarui informasi pribadi, orang tua, dan keluarga."
      />

      <Card
        loading={isLoading || isFetching}
        title="Ringkasan Keterisian"
        extra={
          <Button
            type="primary"
            icon={<Pencil size={14} />}
            onClick={() => setIsOpen(true)}
            disabled={!student}
          >
            Perbarui Data
          </Button>
        }
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Statistic title="Status Data" value={student?.completion_status || "-"} />
          </Col>
          <Col xs={24} md={8}>
            <Statistic
              title="Persentase Terisi"
              value={student?.completion_percent || 0}
              suffix="%"
              prefix={<UserRound size={16} />}
            />
          </Col>
          <Col xs={24} md={8}>
            <Progress
              percent={student?.completion_percent || 0}
              status={student?.completion_percent === 100 ? "success" : "active"}
            />
            <Tag color={student?.completion_status === "Terisi" ? "green" : "orange"}>
              {student?.completion_status || "Belum Terisi"}
            </Tag>
          </Col>
        </Row>
      </Card>

      <Card title="Informasi Pribadi Siswa" loading={isLoading || isFetching}>
        {student ? (
          <Row gutter={[16, 12]}>
            {renderField("Satuan Pendidikan", student.education_unit)}
            {renderField("Tahun Pelajaran", student.academic_year)}
            {renderField("Tingkat", student.grade_name)}
            {renderField("Kelas", student.class_name)}
            {renderField("Nama Lengkap", student.full_name)}
            {renderField("Jenis Kelamin", student.gender)}
            {renderField("NIS", student.nis)}
            {renderField("NISN", student.nisn)}
            {renderField("Tempat Lahir", student.birth_place)}
            {renderField("Tanggal Lahir", formatDate(student.birth_date))}
            {renderField("Tinggi", student.height)}
            {renderField("Berat", student.weight)}
            {renderField("Kepala", student.head_circumference)}
            {renderField("Anak Ke-", student.order_number)}
            {renderField("Jumlah Saudara", student.siblings_count)}
            {renderField("Kode Pos", student.postal_code)}
            {renderField("Alamat", student.address)}
          </Row>
        ) : (
          <Empty description="Data siswa belum ditemukan." />
        )}
      </Card>

      <Card title="Informasi Orang Tua" loading={isLoading || isFetching}>
        {student ? (
          <Row gutter={[16, 12]}>
            {renderField("Nama Ayah", student.father_name)}
            {renderField("NIK Ayah", student.father_nik)}
            {renderField("Tempat Lahir Ayah", student.father_birth_place)}
            {renderField("Tanggal Lahir Ayah", formatDate(student.father_birth_date))}
            {renderField("No Tlp Ayah", student.father_phone)}
            {renderField("Nama Ibu", student.mother_name)}
            {renderField("NIK Ibu", student.mother_nik)}
            {renderField("Tempat Lahir Ibu", student.mother_birth_place)}
            {renderField("Tanggal Lahir Ibu", formatDate(student.mother_birth_date))}
            {renderField("No Tlp Ibu", student.mother_phone)}
          </Row>
        ) : (
          <Empty description="Data orang tua belum ditemukan." />
        )}
      </Card>

      <Card title="Informasi Keluarga (Selain Orang Tua)" loading={isLoading || isFetching}>
        {student?.siblings?.length > 0 ? (
          <Table
            rowKey={(item) => item.id || `${item.name}-${item.birth_date}`}
            pagination={false}
            dataSource={student.siblings}
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
          <Empty description="Data keluarga belum ada." />
        )}
      </Card>

      <DbForm
        open={isOpen}
        student={student}
        loading={isUpdating}
        onCancel={() => setIsOpen(false)}
        onSubmit={handleSubmit}
      />
    </Space>
  );
};

export default StudentDatabase;
