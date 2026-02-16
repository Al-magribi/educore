import React, { useEffect, useState } from "react";
import {
  Drawer,
  Form,
  Input,
  Select,
  Button,
  Space,
  Row,
  Col,
  Typography,
  theme,
} from "antd";
import { User, School } from "lucide-react";
import {
  useGetClassesQuery,
  useGetGradesQuery,
} from "../../../../service/public/ApiPublic";

const { Text } = Typography;
const { Option } = Select;

const StudentFormDrawer = ({
  open,
  onClose,
  onSubmit,
  initialValues,
  isLoading,
}) => {
  const [form] = Form.useForm();
  const { token } = theme.useToken();

  // State untuk filter kelas berdasarkan tingkat
  const [selectedGradeId, setSelectedGradeId] = useState(null);

  // Fetch Data Master
  const { data: grades, isLoading: loadingGrades } = useGetGradesQuery();
  const { data: classes, isLoading: loadingClasses } = useGetClassesQuery(
    { gradeId: selectedGradeId },
    { skip: !selectedGradeId },
  );

  useEffect(() => {
    if (open) {
      if (initialValues) {
        // Map data dari API ke nama field form agar mode edit selalu terisi.
        const normalizedValues = {
          ...initialValues,
          grade_id: initialValues.grade_id ?? initialValues.current_grade_id,
          class_id: initialValues.class_id ?? initialValues.current_class_id,
        };

        form.setFieldsValue(normalizedValues);
        setSelectedGradeId(normalizedValues.grade_id ?? null);
      } else {
        // Jika Tambah Baru: Reset form
        form.resetFields();
        setSelectedGradeId(null);
      }
    }
  }, [open, initialValues, form]);

  const handleGradeChange = (value) => {
    setSelectedGradeId(value);
    form.setFieldsValue({ class_id: null }); // Reset kelas jika tingkat berubah
  };

  return (
    <Drawer
      title={
        <Text strong>{initialValues ? "Edit Siswa" : "Tambah Siswa Baru"}</Text>
      }
      size={500}
      onClose={onClose}
      open={open}
      extra={
        <Space>
          <Button onClick={onClose}>Batal</Button>
          <Button
            type='primary'
            onClick={() => form.submit()}
            loading={isLoading}
          >
            Simpan
          </Button>
        </Space>
      }
    >
      <Form form={form} layout='vertical' onFinish={onSubmit}>
        {/* SECTION 1: AKUN */}
        <div style={{ marginBottom: 24 }}>
          <Text
            type='secondary'
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              display: "block",
              marginBottom: 12,
            }}
          >
            Akun & Login
          </Text>
          <Form.Item
            name='full_name'
            label='Nama Lengkap'
            rules={[{ required: true, message: "Nama wajib diisi" }]}
          >
            <Input
              prefix={<User size={16} color={token.colorTextPlaceholder} />}
              placeholder='Nama Siswa'
            />
          </Form.Item>

          {!initialValues && (
            <>
              <Form.Item
                name='username'
                label='Username'
                rules={[{ required: true, message: "Username wajib diisi" }]}
              >
                <Input placeholder='Username Login' />
              </Form.Item>
              <Form.Item
                name='password'
                label='Password'
                rules={[{ required: true, message: "Password wajib diisi" }]}
              >
                <Input.Password placeholder='Password Akun' />
              </Form.Item>
            </>
          )}

          {initialValues && (
            <Form.Item name='is_active' label='Status Akun'>
              <Select>
                <Option value={true}>Aktif</Option>
                <Option value={false}>Non-Aktif</Option>
              </Select>
            </Form.Item>
          )}
        </div>

        {/* SECTION 2: BIODATA & AKADEMIK */}
        <div
          style={{ borderTop: `1px solid ${token.colorSplit}`, paddingTop: 24 }}
        >
          <Text
            type='secondary'
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              display: "block",
              marginBottom: 12,
            }}
          >
            Data Akademik
          </Text>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name='nis' label='NIS' rules={[{ required: true }]}>
                <Input
                  prefix={
                    <School size={16} color={token.colorTextPlaceholder} />
                  }
                  placeholder='Nomor Induk'
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name='nisn' label='NISN'>
                <Input placeholder='NIS Nasional' />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name='gender'
            label='Jenis Kelamin'
            rules={[{ required: true, message: "Pilih jenis kelamin" }]}
          >
            <Select placeholder='Pilih Gender'>
              <Option value='L'>Laki-laki</Option>
              <Option value='P'>Perempuan</Option>
            </Select>
          </Form.Item>

          {/* INPUT BARU: TINGKAT & KELAS */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name='grade_id'
                label='Tingkat'
                rules={[{ required: true, message: "Pilih tingkat" }]}
              >
                <Select
                  placeholder='Pilih Tingkat'
                  onChange={handleGradeChange}
                  loading={loadingGrades}
                  allowClear
                  virtual={false}
                >
                  {grades?.map((g) => (
                    <Option key={g.id} value={g.id}>
                      {g.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name='class_id'
                label='Kelas'
                rules={[{ required: true, message: "Pilih kelas" }]}
              >
                <Select
                  placeholder='Pilih Kelas'
                  disabled={!selectedGradeId}
                  loading={loadingClasses}
                  allowClear
                  virtual={false}
                >
                  {classes?.map((c) => (
                    <Option key={c.id} value={c.id}>
                      {c.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </div>
      </Form>
    </Drawer>
  );
};

export default StudentFormDrawer;
