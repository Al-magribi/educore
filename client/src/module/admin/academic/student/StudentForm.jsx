import React, { useEffect, useState } from "react";
import { Button, Col, Drawer, Flex, Form, Grid, Input, Row, Select, Typography } from "antd";
import { ContactRound, KeyRound, Save, School, User } from "lucide-react";
import {
  useGetClassesQuery,
  useGetGradesQuery,
} from "../../../../service/public/ApiPublic";
import { CardTitle, MuseCard } from "../../../../components/ui/muse";
import { museColors } from "../../../../config/theme";

const { Text } = Typography;
const { Option } = Select;
const { useBreakpoint } = Grid;

const StudentFormDrawer = ({
  open,
  onClose,
  onSubmit,
  initialValues,
  isLoading,
}) => {
  const [form] = Form.useForm();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [selectedGradeId, setSelectedGradeId] = useState(null);

  const { data: grades, isLoading: loadingGrades } = useGetGradesQuery();
  const { data: classes, isLoading: loadingClasses } = useGetClassesQuery(
    { gradeId: selectedGradeId },
    { skip: !selectedGradeId },
  );

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      if (initialValues) {
        const normalizedValues = {
          ...initialValues,
          password: "",
          grade_id: initialValues.grade_id ?? initialValues.current_grade_id,
          class_id: initialValues.class_id ?? initialValues.current_class_id,
        };

        form.setFieldsValue(normalizedValues);
        setSelectedGradeId(normalizedValues.grade_id ?? null);
      } else {
        form.resetFields();
        setSelectedGradeId(null);
      }
    }
  }, [open, initialValues, form]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleGradeChange = (value) => {
    setSelectedGradeId(value);
    form.setFieldsValue({ class_id: null });
  };

  const sectionTitle = (icon, label) => (
    <Flex align="center" gap={8} style={{ marginBottom: 16, color: museColors.navy }}>
      {icon}
      <Text strong style={{ fontSize: 15, color: museColors.navy }}>
        {label}
      </Text>
    </Flex>
  );

  return (
    <Drawer
      width={isMobile ? "100%" : 720}
      onClose={onClose}
      open={open}
      destroyOnHidden
      title={
        <CardTitle
          icon={<User size={16} />}
          title={initialValues ? "Perbarui Data Siswa" : "Tambah Siswa Baru"}
          description={isMobile ? undefined : "Identitas login dan penempatan akademik siswa."}
        />
      }
      styles={{ body: { background: museColors.bgLayout } }}
      footer={
        <Flex justify="flex-end" gap={8}>
          <Button onClick={onClose}>Batal</Button>
          <Button type="primary" loading={isLoading} icon={<Save size={16} />} onClick={() => form.submit()}>
            {initialValues ? "Simpan Perubahan" : "Simpan Data Siswa"}
          </Button>
        </Flex>
      }
    >
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Flex vertical gap={16}>
          <MuseCard>
            {sectionTitle(<ContactRound size={16} />, "Profil & Identitas Login")}

            <Form.Item
              name="full_name"
              label="Nama Lengkap"
              rules={[{ required: true, message: "Nama wajib diisi" }]}
            >
              <Input
                prefix={<User size={16} color={museColors.muted} />}
                placeholder="Nama siswa sesuai dokumen resmi"
              />
            </Form.Item>

            {!initialValues && (
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="username"
                    label="Username"
                    rules={[{ required: true, message: "Username wajib diisi" }]}
                  >
                    <Input
                      prefix={<ContactRound size={16} color={museColors.muted} />}
                      placeholder="Username login siswa"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="password"
                    label="Password"
                    rules={[
                      { required: true, message: "Password wajib diisi" },
                      { min: 6, message: "Minimal 6 karakter" },
                    ]}
                  >
                    <Input.Password
                      prefix={<KeyRound size={16} color={museColors.muted} />}
                      placeholder="Password akun siswa"
                    />
                  </Form.Item>
                </Col>
              </Row>
            )}

            {initialValues && (
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="password"
                    label="Password Baru"
                    extra="Kosongkan jika tidak ingin mengubah password"
                    rules={[
                      {
                        validator: (_, value) => {
                          const next = String(value || "").trim();
                          if (!next) return Promise.resolve();
                          if (next.length < 6) {
                            return Promise.reject(new Error("Minimal 6 karakter"));
                          }
                          return Promise.resolve();
                        },
                      },
                    ]}
                  >
                    <Input.Password
                      prefix={<KeyRound size={16} color={museColors.muted} />}
                      placeholder="Kosongkan jika tidak diubah"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="is_active" label="Status Akun">
                    <Select virtual={false}>
                      <Option value={true}>Aktif</Option>
                      <Option value={false}>Nonaktif</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            )}
          </MuseCard>

          <MuseCard>
            {sectionTitle(<School size={16} />, "Data Akademik")}

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item name="nis" label="NIS" rules={[{ required: true, message: "NIS wajib diisi" }]}>
                  <Input
                    prefix={<School size={16} color={museColors.muted} />}
                    placeholder="Nomor induk sekolah"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="nisn" label="NISN">
                  <Input placeholder="Nomor induk nasional" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="rfid_no" label="No RFID (opsional)">
                  <Input placeholder="Nomor RFID kartu siswa" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="gender"
                  label="Jenis Kelamin"
                  rules={[{ required: true, message: "Pilih jenis kelamin" }]}
                >
                  <Select placeholder="Pilih jenis kelamin" virtual={false}>
                    <Option value="L">Laki-laki</Option>
                    <Option value="P">Perempuan</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="grade_id"
                  label="Tingkat"
                  rules={[{ required: true, message: "Pilih tingkat" }]}
                >
                  <Select
                    placeholder="Pilih tingkat"
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
              <Col xs={24} md={12}>
                <Form.Item
                  name="class_id"
                  label="Kelas"
                  rules={[{ required: true, message: "Pilih kelas" }]}
                  extra={!selectedGradeId ? "Pilih tingkat dulu" : undefined}
                >
                  <Select
                    placeholder="Pilih kelas"
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
          </MuseCard>
        </Flex>
      </Form>
    </Drawer>
  );
};

export default StudentFormDrawer;
