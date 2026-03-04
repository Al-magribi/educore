import React, { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  message,
  Progress,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { Database, Pencil, Users } from "lucide-react";
import {
  useGetParentStudentsQuery,
  useUpdateParentStudentMutation,
} from "../../../service/database/ApiDatabase";
import DbForm from "../form/DbForm";

const { Text } = Typography;
const EMPTY_LIST = [];

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

const ParentStudentDatabase = () => {
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const { data, isLoading, isFetching } = useGetParentStudentsQuery();
  const [updateParentStudent, { isLoading: isUpdating }] =
    useUpdateParentStudentMutation();

  const students = data?.data ?? EMPTY_LIST;

  const studentOptions = useMemo(
    () =>
      students.map((item) => ({
        value: item.student_id,
        label: `${item.full_name} (${item.nis || "-"})`,
      })),
    [students],
  );

  const selectedStudent = useMemo(() => {
    if (!students.length) return null;
    if (!selectedStudentId) return students[0];
    return students.find((item) => item.student_id === selectedStudentId) || null;
  }, [students, selectedStudentId]);

  const handleSubmit = async (values) => {
    if (!selectedStudent?.student_id) return;
    try {
      await updateParentStudent({
        studentId: selectedStudent.student_id,
        ...values,
      }).unwrap();
      message.success("Data siswa berhasil diperbarui.");
      setIsOpen(false);
    } catch (error) {
      message.error(error?.data?.message || "Gagal memperbarui data siswa.");
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Alert
        type="info"
        showIcon
        icon={<Database size={16} />}
        message="Data Siswa Orang Tua"
        description="Halaman ini menampilkan seluruh anak yang terhubung ke akun orang tua dan dapat diperbarui."
      />

      <Card loading={isLoading || isFetching}>
        <Space
          direction="horizontal"
          style={{ width: "100%", justifyContent: "space-between", flexWrap: "wrap" }}
        >
          <Space>
            <Users size={16} />
            <Text strong>Total Siswa Terhubung: {students.length}</Text>
          </Space>
          <Space>
            <Select
              placeholder="Pilih siswa"
              style={{ width: 320, maxWidth: "100%" }}
              options={studentOptions}
              value={selectedStudent?.student_id}
              onChange={setSelectedStudentId}
              disabled={!students.length}
            />
            <Button
              type="primary"
              icon={<Pencil size={14} />}
              onClick={() => setIsOpen(true)}
              disabled={!selectedStudent}
            >
              Perbarui Data
            </Button>
          </Space>
        </Space>
      </Card>

      <Card title="Informasi Siswa" loading={isLoading || isFetching}>
        {selectedStudent ? (
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Row gutter={[16, 12]}>
              {renderField("Nama Lengkap", selectedStudent.full_name)}
              {renderField("Jenis Kelamin", selectedStudent.gender)}
              {renderField("NIS", selectedStudent.nis)}
              {renderField("NISN", selectedStudent.nisn)}
              {renderField("Satuan Pendidikan", selectedStudent.education_unit)}
              {renderField("Tahun Pelajaran", selectedStudent.academic_year)}
              {renderField("Tingkat", selectedStudent.grade_name)}
              {renderField("Kelas", selectedStudent.class_name)}
              {renderField("Tempat Lahir", selectedStudent.birth_place)}
              {renderField("Tanggal Lahir", formatDate(selectedStudent.birth_date))}
              {renderField("Alamat", selectedStudent.address)}
            </Row>

            <Space direction="vertical" size={4} style={{ width: "100%" }}>
              <Text type="secondary">Status Keterisian Data</Text>
              <Progress percent={selectedStudent.completion_percent || 0} />
              <Tag
                color={
                  selectedStudent.completion_status === "Terisi" ? "green" : "orange"
                }
              >
                {selectedStudent.completion_status}
              </Tag>
            </Space>
          </Space>
        ) : (
          <Empty description="Belum ada data siswa terhubung ke akun ini." />
        )}
      </Card>

      <Card title="Informasi Orang Tua" loading={isLoading || isFetching}>
        {selectedStudent ? (
          <Row gutter={[16, 12]}>
            {renderField("Nama Ayah", selectedStudent.father_name)}
            {renderField("NIK Ayah", selectedStudent.father_nik)}
            {renderField("Tempat Lahir Ayah", selectedStudent.father_birth_place)}
            {renderField(
              "Tanggal Lahir Ayah",
              formatDate(selectedStudent.father_birth_date),
            )}
            {renderField("No Tlp Ayah", selectedStudent.father_phone)}
            {renderField("Nama Ibu", selectedStudent.mother_name)}
            {renderField("NIK Ibu", selectedStudent.mother_nik)}
            {renderField("Tempat Lahir Ibu", selectedStudent.mother_birth_place)}
            {renderField(
              "Tanggal Lahir Ibu",
              formatDate(selectedStudent.mother_birth_date),
            )}
            {renderField("No Tlp Ibu", selectedStudent.mother_phone)}
          </Row>
        ) : (
          <Empty description="Data orang tua belum tersedia." />
        )}
      </Card>

      <Card title="Informasi Keluarga (Selain Orang Tua)" loading={isLoading || isFetching}>
        {selectedStudent?.siblings?.length > 0 ? (
          <Table
            rowKey={(item) => item.id || `${item.name}-${item.birth_date}`}
            pagination={false}
            dataSource={selectedStudent.siblings}
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
        student={selectedStudent}
        loading={isUpdating}
        onCancel={() => setIsOpen(false)}
        onSubmit={handleSubmit}
      />
    </Space>
  );
};

export default ParentStudentDatabase;
