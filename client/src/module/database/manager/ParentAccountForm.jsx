import React, { useEffect } from "react";
import { motion } from "framer-motion";
import {
  Alert,
  Button,
  Card,
  Col,
  Flex,
  Form,
  Grid,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Typography,
} from "antd";
import {
  CircleUserRound,
  KeyRound,
  Link2,
  PencilLine,
  ShieldCheck,
  Smartphone,
  UserRoundCheck,
} from "lucide-react";

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

const MotionDiv = motion.div;

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.03,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.34,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const modalStyles = {
  body: {
    maxHeight: "calc(100vh - 180px)",
    overflow: "auto",
    padding: 0,
    scrollbarWidth: "thin",
    scrollbarColor: "rgba(15, 23, 42, 0.22) transparent",
  },
  content: {
    overflow: "hidden",
    borderRadius: 28,
    padding: 0,
  },
  header: {
    display: "none",
  },
};

const heroStyle = {
  background:
    "radial-gradient(circle at top right, rgba(255,255,255,0.16), transparent 26%), linear-gradient(135deg, #0f172a 0%, #1d4ed8 52%, #38bdf8 100%)",
  color: "#fff",
  padding: 24,
  borderTopLeftRadius: 28,
  borderTopRightRadius: 28,
};

const shellStyle = {
  background: "linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)",
};

const sectionCardStyle = {
  borderRadius: 22,
  border: "1px solid #e6eef8",
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.07)",
  overflow: "hidden",
};

const iconWrapStyle = (background, color, size = 46) => ({
  width: size,
  height: size,
  borderRadius: 16,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background,
  color,
  flexShrink: 0,
});

const renderSectionTitle = (icon, title, subtitle) => (
  <Space align='center' size={12} wrap={false} style={{ width: "100%" }}>
    {icon}
    <div style={{ minWidth: 0 }}>
      <div style={{ fontWeight: 700, color: "#0f172a" }}>{title}</div>
      <Text
        type='secondary'
        style={{ fontSize: 12, display: "block", whiteSpace: "normal" }}
      >
        {subtitle}
      </Text>
    </div>
  </Space>
);

const ParentAccountForm = ({
  open,
  onCancel,
  onSubmit,
  loading,
  parentRecord,
  studentOptions = [],
}) => {
  const [form] = Form.useForm();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isSmallMobile = !screens.sm;
  const formId = "parent-account-form";
  const linkedStudents = parentRecord?.students?.length || 0;

  useEffect(() => {
    if (!open) {
      form.resetFields();
      return;
    }

    if (!parentRecord) {
      form.setFieldsValue({
        is_active: true,
        student_ids: [],
      });
      return;
    }

    form.setFieldsValue({
      full_name: parentRecord.full_name,
      username: parentRecord.username,
      email: parentRecord.email,
      phone: parentRecord.phone,
      is_active: Boolean(parentRecord.is_active),
      student_ids: (parentRecord.students || []).map((item) => item.student_id),
      password: "",
    });
  }, [form, open, parentRecord]);

  const commonInputSize = isSmallMobile ? "middle" : "large";
  const heroPadding = isSmallMobile ? 16 : isMobile ? 20 : 24;
  const bodyPadding = isSmallMobile ? 16 : isMobile ? 20 : 24;

  return (
    <>
      <style>
        {`
          .parent-account-form-modal .ant-modal-body::-webkit-scrollbar {
            width: 5px;
            height: 5px;
          }

          .parent-account-form-modal .ant-modal-body::-webkit-scrollbar-track {
            background: transparent;
          }

          .parent-account-form-modal .ant-modal-body::-webkit-scrollbar-thumb {
            background: rgba(15, 23, 42, 0.22);
            border-radius: 999px;
          }

          .parent-account-form-modal .ant-modal-body::-webkit-scrollbar-thumb:hover {
            background: rgba(15, 23, 42, 0.3);
          }
        `}
      </style>
      <Modal
        open={open}
        onCancel={onCancel}
        closable={false}
        width={isMobile ? "calc(100vw - 16px)" : 760}
        destroyOnHidden
        centered
        footer={null}
        styles={modalStyles}
        wrapClassName='parent-account-form-modal'
      >
        <div style={shellStyle}>
          <div style={{ ...heroStyle, padding: heroPadding }}>
            <Row gutter={[16, 16]} align='middle'>
              <Col xs={24} lg={15}>
                <Space vertical size={10} style={{ width: "100%" }}>
                  <div
                    style={iconWrapStyle(
                      "rgba(255,255,255,0.14)",
                      "#ffffff",
                      isSmallMobile ? 48 : 56,
                    )}
                  >
                    <PencilLine size={isSmallMobile ? 20 : 24} />
                  </div>
                  <div>
                    <Title
                      level={isSmallMobile ? 4 : 3}
                      style={{
                        color: "#ffffff",
                        margin: 0,
                        marginBottom: 6,
                        fontSize: isSmallMobile ? 24 : undefined,
                      }}
                    >
                      {parentRecord
                        ? "Ubah Akun Orang Tua"
                        : "Tambah Akun Orang Tua"}
                    </Title>
                    <Text
                      style={{
                        color: "rgba(255,255,255,0.82)",
                        display: "block",
                        fontSize: isSmallMobile ? 13 : 14,
                      }}
                    >
                      Atur identitas akun, akses login, dan hubungan ke satu
                      atau lebih siswa dalam satu formulir.
                    </Text>
                  </div>
                </Space>
              </Col>
              <Col xs={24} lg={9}>
                <Card
                  variant='borderless'
                  style={{
                    background: "rgba(255,255,255,0.12)",
                    borderRadius: 20,
                    border: "1px solid rgba(255,255,255,0.18)",
                    boxShadow: "none",
                  }}
                  bodyStyle={{ padding: isSmallMobile ? 14 : 16 }}
                >
                  <Space vertical size={8} style={{ width: "100%" }}>
                    <Text style={{ color: "rgba(255,255,255,0.72)" }}>
                      Ringkasan akun
                    </Text>
                    <Text
                      strong
                      style={{
                        color: "#ffffff",
                        fontSize: isSmallMobile ? 15 : 16,
                        lineHeight: 1.4,
                      }}
                    >
                      {parentRecord?.full_name || "Akun orang tua baru"}
                    </Text>
                    <Text style={{ color: "rgba(255,255,255,0.72)" }}>
                      Relasi siswa: {linkedStudents} data
                    </Text>
                  </Space>
                </Card>
              </Col>
            </Row>
          </div>

          <div style={{ padding: bodyPadding }}>
            <Form
              id={formId}
              form={form}
              layout='vertical'
              onFinish={onSubmit}
              initialValues={{ is_active: true, student_ids: [] }}
            >
              <MotionDiv
                variants={containerVariants}
                initial='hidden'
                animate='show'
                style={{ width: "100%" }}
              >
                <Space vertical size={18} style={{ width: "100%" }}>
                  <MotionDiv variants={itemVariants}>
                    <Card
                      style={sectionCardStyle}
                      bodyStyle={{ padding: isSmallMobile ? 16 : 20 }}
                    >
                      <Row gutter={[12, 8]}>
                        <Col xs={24} md={12}>
                          <Form.Item
                            label='Nama Lengkap'
                            name='full_name'
                            rules={[
                              {
                                required: true,
                                message: "Nama lengkap wajib diisi.",
                              },
                            ]}
                          >
                            <Input
                              size={commonInputSize}
                              placeholder='Nama akun orang tua'
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item
                            label='Username Login'
                            name='username'
                            rules={[
                              {
                                required: true,
                                message: "Username wajib diisi.",
                              },
                            ]}
                          >
                            <Input
                              size={commonInputSize}
                              placeholder='username.parent'
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item
                            label={parentRecord ? "Password Baru" : "Password"}
                            name='password'
                            rules={
                              parentRecord
                                ? []
                                : [
                                    {
                                      required: true,
                                      message: "Password wajib diisi.",
                                    },
                                  ]
                            }
                            extra={
                              parentRecord
                                ? "Kosongkan jika password tidak diubah."
                                : "Gunakan minimal 6 karakter agar mudah dibagikan ke wali."
                            }
                          >
                            <Input.Password
                              size={commonInputSize}
                              placeholder='Masukkan password'
                              prefix={<KeyRound size={16} />}
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item label='No. Telepon' name='phone'>
                            <Input
                              size={commonInputSize}
                              placeholder='08xxxxxxxxxx'
                              prefix={<Smartphone size={16} />}
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item label='Email' name='email'>
                            <Input
                              size={commonInputSize}
                              placeholder='orangtua@email.com'
                            />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={12}>
                          <Form.Item
                            label='Status Akun'
                            name='is_active'
                            valuePropName='checked'
                          >
                            <Switch
                              checkedChildren='Aktif'
                              unCheckedChildren='Nonaktif'
                            />
                          </Form.Item>
                        </Col>
                      </Row>
                    </Card>
                  </MotionDiv>

                  <MotionDiv variants={itemVariants}>
                    <Card
                      title={renderSectionTitle(
                        <span style={iconWrapStyle("#dcfce7", "#15803d", 42)}>
                          <Link2 size={18} />
                        </span>,
                        "Hubungkan Siswa",
                        "Pilih satu atau beberapa siswa yang akan muncul pada akun orang tua ini.",
                      )}
                      style={sectionCardStyle}
                      bodyStyle={{ padding: isSmallMobile ? 16 : 20 }}
                    >
                      <Form.Item
                        label='Daftar Siswa'
                        name='student_ids'
                        rules={[
                          {
                            required: true,
                            type: "array",
                            min: 1,
                            message: "Pilih minimal satu siswa.",
                          },
                        ]}
                      >
                        <Select
                          mode='multiple'
                          allowClear
                          showSearch={{ optionFilterProp: "label" }}
                          size={commonInputSize}
                          placeholder='Pilih satu atau lebih siswa'
                          options={studentOptions}
                          maxTagCount='responsive'
                          virtual={false}
                        />
                      </Form.Item>

                      <Text type='secondary'>
                        Gunakan username yang mudah diingat. Siswa yang dipilih
                        akan tampil di akun orang tua yang sama.
                      </Text>
                    </Card>
                  </MotionDiv>

                  <MotionDiv variants={itemVariants}>
                    <Card
                      style={sectionCardStyle}
                      bodyStyle={{
                        padding: isSmallMobile ? 14 : 18,
                        background:
                          "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
                      }}
                    >
                      <Flex
                        vertical={isMobile ? true : false}
                        align='middle'
                        justify='space-between'
                      >
                        <Space vertical size={2}>
                          <Text strong style={{ color: "#0f172a" }}>
                            Simpan akun orang tua
                          </Text>
                          <Text type='secondary' style={{ fontSize: 12 }}>
                            Pastikan relasi siswa dan data login sudah benar.
                          </Text>
                        </Space>

                        <Space
                          direction={isSmallMobile ? "vertical" : "horizontal"}
                          size={10}
                          style={{ width: isSmallMobile ? "100%" : "auto" }}
                        >
                          <Button
                            onClick={onCancel}
                            size={commonInputSize}
                            style={{ width: isSmallMobile ? "100%" : "auto" }}
                          >
                            Batal
                          </Button>
                          <Button
                            type='primary'
                            htmlType='submit'
                            form={formId}
                            loading={loading}
                            size={commonInputSize}
                            icon={<UserRoundCheck size={16} />}
                            style={{
                              width: isSmallMobile ? "100%" : "auto",
                              minWidth: isSmallMobile ? undefined : 170,
                            }}
                          >
                            {parentRecord ? "Simpan Perubahan" : "Simpan Akun"}
                          </Button>
                        </Space>
                      </Flex>
                    </Card>
                  </MotionDiv>
                </Space>
              </MotionDiv>
            </Form>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ParentAccountForm;
