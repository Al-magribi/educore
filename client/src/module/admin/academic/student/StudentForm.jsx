import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Drawer,
  Form,
  Input,
  Select,
  Button,
  Row,
  Col,
  Typography,
  Card,
  Flex,
  Tag,
  Grid,
} from "antd";
import {
  User,
  School,
  KeyRound,
  ContactRound,
  BadgeCheck,
  X,
  Save,
} from "lucide-react";
import {
  useGetClassesQuery,
  useGetGradesQuery,
} from "../../../../service/public/ApiPublic";

const { Text, Title } = Typography;
const { Option } = Select;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

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

  return (
    <Drawer
      title={null}
      width={isMobile ? "100%" : 720}
      onClose={onClose}
      open={open}
      destroyOnHidden
      closable={false}
      styles={{
        header: { display: "none" },
        body: {
          padding: 0,
          background: "#f8fafc",
        },
      }}
    >
      <MotionDiv
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
        style={{ height: "100%", display: "flex", flexDirection: "column" }}
      >
        <div
          style={{
            padding: isMobile ? 20 : 24,
            background:
              "linear-gradient(135deg, rgba(239,246,255,1), rgba(236,253,245,0.98))",
            borderBottom: "1px solid rgba(148, 163, 184, 0.16)",
          }}
        >
          <Flex justify="space-between" align="flex-start" gap={16}>
            <Flex align="flex-start" gap={16}>
              <div
                style={{
                  width: isMobile ? 50 : 58,
                  height: isMobile ? 50 : 58,
                  borderRadius: 20,
                  display: "grid",
                  placeItems: "center",
                  background: "linear-gradient(135deg, #2563eb, #14b8a6)",
                  color: "#fff",
                  boxShadow: "0 18px 32px rgba(37, 99, 235, 0.24)",
                  flexShrink: 0,
                }}
              >
                <User size={24} />
              </div>

              <div>
                <Flex
                  align={isMobile ? "flex-start" : "center"}
                  vertical={isMobile}
                  gap={10}
                  style={{ marginBottom: 6 }}
                >
                  <Title level={3} style={{ margin: 0 }}>
                    {initialValues ? "Perbarui Data Siswa" : "Tambah Siswa Baru"}
                  </Title>
                  <Tag
                    bordered={false}
                    style={{
                      marginInlineEnd: 0,
                      borderRadius: 999,
                      padding: "6px 12px",
                      background: "rgba(29, 78, 216, 0.10)",
                      color: "#1d4ed8",
                      fontWeight: 600,
                    }}
                  >
                    {initialValues ? "Mode Edit" : "Input Baru"}
                  </Tag>
                </Flex>

                <Text type="secondary" style={{ display: "block", maxWidth: 520 }}>
                  Lengkapi data identitas dan penempatan akademik siswa dengan
                  struktur form yang dirancang untuk proses administrasi produksi.
                </Text>
              </div>
            </Flex>

            <Button
              onClick={onClose}
              icon={<X size={16} />}
              style={{ borderRadius: 14, flexShrink: 0 }}
            >
              Tutup
            </Button>
          </Flex>
        </div>

        <div style={{ padding: isMobile ? 16 : 20, flex: 1, overflow: "auto" }}>
          <Form form={form} layout="vertical" onFinish={onSubmit}>
            <MotionDiv
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: 0.04 }}
              style={{ display: "flex", flexDirection: "column", gap: 16 }}
            >
              <Card
                bordered={false}
                style={{
                  borderRadius: 22,
                  boxShadow: "0 16px 34px rgba(15, 23, 42, 0.06)",
                }}
                styles={{ body: { padding: 18 } }}
              >
                <Flex align="center" gap={10} style={{ marginBottom: 14 }}>
                  <ContactRound size={18} color="#1d4ed8" />
                  <Title level={5} style={{ margin: 0 }}>
                    Profil & Identitas Login
                  </Title>
                </Flex>

                <Form.Item
                  name="full_name"
                  label="Nama Lengkap"
                  rules={[{ required: true, message: "Nama wajib diisi" }]}
                >
                  <Input
                    prefix={<User size={16} color="#94a3b8" />}
                    placeholder="Nama siswa sesuai dokumen resmi"
                    size="large"
                    style={{ borderRadius: 14, paddingBlock: 8 }}
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
                          prefix={<ContactRound size={16} color="#94a3b8" />}
                          placeholder="Username login siswa"
                          size="large"
                          style={{ borderRadius: 14, paddingBlock: 8 }}
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="password"
                        label="Password"
                        rules={[{ required: true, message: "Password wajib diisi" }]}
                      >
                        <Input.Password
                          prefix={<KeyRound size={16} color="#94a3b8" />}
                          placeholder="Password akun siswa"
                          size="large"
                          style={{ borderRadius: 14, paddingBlock: 8 }}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                )}

                {initialValues && (
                  <Form.Item name="is_active" label="Status Akun">
                    <Select size="large" virtual={false}>
                      <Option value={true}>Aktif</Option>
                      <Option value={false}>Non-Aktif</Option>
                    </Select>
                  </Form.Item>
                )}
              </Card>

              <Card
                bordered={false}
                style={{
                  borderRadius: 22,
                  boxShadow: "0 16px 34px rgba(15, 23, 42, 0.06)",
                }}
                styles={{ body: { padding: 18 } }}
              >
                <Flex align="center" gap={10} style={{ marginBottom: 14 }}>
                  <School size={18} color="#047857" />
                  <Title level={5} style={{ margin: 0 }}>
                    Data Akademik
                  </Title>
                </Flex>

                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item name="nis" label="NIS" rules={[{ required: true }]}>
                      <Input
                        prefix={<School size={16} color="#94a3b8" />}
                        placeholder="Nomor induk sekolah"
                        size="large"
                        style={{ borderRadius: 14, paddingBlock: 8 }}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name="nisn" label="NISN">
                      <Input
                        placeholder="Nomor induk nasional"
                        size="large"
                        style={{ borderRadius: 14, paddingBlock: 8 }}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name="rfid_no" label="No RFID (Opsional)">
                      <Input
                        placeholder="Nomor RFID kartu siswa"
                        size="large"
                        style={{ borderRadius: 14, paddingBlock: 8 }}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="gender"
                  label="Jenis Kelamin"
                  rules={[{ required: true, message: "Pilih jenis kelamin" }]}
                >
                  <Select placeholder="Pilih jenis kelamin" size="large" virtual={false}>
                    <Option value="L">Laki-laki</Option>
                    <Option value="P">Perempuan</Option>
                  </Select>
                </Form.Item>

                <Row gutter={16}>
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
                        size="large"
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
                    >
                      <Select
                        placeholder="Pilih kelas"
                        disabled={!selectedGradeId}
                        loading={loadingClasses}
                        allowClear
                        virtual={false}
                        size="large"
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
              </Card>

              <Card
                bordered={false}
                style={{
                  borderRadius: 22,
                  background: "linear-gradient(135deg, #ecfeff, #eff6ff)",
                  border: "1px solid rgba(14, 165, 233, 0.16)",
                }}
              >
                <Flex align="flex-start" gap={12}>
                  <BadgeCheck size={18} color="#0284c7" style={{ marginTop: 2 }} />
                  <div>
                    <Text strong style={{ display: "block", marginBottom: 4 }}>
                      Catatan operasional
                    </Text>
                    <Text type="secondary">
                      Pastikan NIS, tingkat, dan kelas sudah sesuai agar data siswa
                      dapat langsung digunakan pada modul akademik berikutnya.
                    </Text>
                  </div>
                </Flex>
              </Card>

              <Flex justify="flex-end" gap={10} vertical={isMobile}>
                <Button
                  size="large"
                  onClick={onClose}
                  style={{
                    borderRadius: 14,
                    minWidth: isMobile ? "100%" : 120,
                  }}
                >
                  Batal
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={isLoading}
                  size="large"
                  icon={<Save size={16} />}
                  style={{
                    borderRadius: 14,
                    minWidth: isMobile ? "100%" : 190,
                    boxShadow: "0 12px 24px rgba(37, 99, 235, 0.20)",
                  }}
                >
                  {initialValues ? "Simpan Perubahan" : "Simpan Data Siswa"}
                </Button>
              </Flex>
            </MotionDiv>
          </Form>
        </div>
      </MotionDiv>
    </Drawer>
  );
};

export default StudentFormDrawer;
