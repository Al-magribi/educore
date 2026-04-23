import React, { useEffect } from "react";
import {
  Card,
  Col,
  Form,
  Grid,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Typography,
  message,
} from "antd";
import {
  UserOutlined,
  IdcardOutlined,
  PhoneOutlined,
  MailOutlined,
  LockOutlined,
  HomeOutlined,
  SafetyCertificateOutlined,
  EditOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import {
  useAddTeacherMutation,
  useUpdateTeacherMutation,
} from "../../../service/main/ApiTeacher";
import { useGetHomebaseQuery } from "../../../service/center/ApiHomebase";

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

const ModalTeacher = ({ open, onCancel, onSuccess, initialData }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [form] = Form.useForm();

  const { data: homebaseData, isLoading: loadingHomebase } =
    useGetHomebaseQuery({
      page: 1,
      limit: 100,
    });

  const [addTeacher, { isLoading: isAdding }] = useAddTeacherMutation();
  const [updateTeacher, { isLoading: isUpdating }] = useUpdateTeacherMutation();

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.setFieldsValue({
          ...initialData,
          password: "",
          homebase_id: initialData.homebase_id || undefined,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, initialData, form]);

  const handleFinish = async (values) => {
    try {
      if (initialData) {
        await updateTeacher({ id: initialData.id, ...values }).unwrap();
        message.success("Data guru diperbarui");
      } else {
        await addTeacher(values).unwrap();
        message.success("Guru berhasil ditambahkan");
      }

      form.resetFields();
      onSuccess();
    } catch (error) {
      message.error(error?.data?.message || "Terjadi kesalahan");
    }
  };

  return (
    <Modal
      title={null}
      open={open}
      onCancel={onCancel}
      onOk={form.submit}
      confirmLoading={isAdding || isUpdating}
      destroyOnHidden
      width={760}
      okText={initialData ? "Simpan Perubahan" : "Simpan Guru"}
      cancelText="Batal"
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
      <Space orientation="vertical" size={18} style={{ width: "100%" }}>
        <Card
          variant="borderless"
          style={{
            borderRadius: 24,
            background:
              "radial-gradient(circle at top left, rgba(14,165,233,0.16), transparent 30%), linear-gradient(135deg, #0f172a, #1d4ed8 60%, #0f766e)",
            boxShadow: "0 24px 56px rgba(15, 23, 42, 0.18)",
          }}
          styles={{ body: { padding: isMobile ? 20 : 26 } }}
        >
          <Space orientation="vertical" size={12} style={{ width: "100%" }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,0.14)",
                color: "#e0f2fe",
                fontSize: 24,
              }}
            >
              {initialData ? <EditOutlined /> : <PlusOutlined />}
            </div>
            <div>
              <Title level={3} style={{ margin: 0, color: "#f8fafc" }}>
                {initialData ? "Edit Data Guru" : "Tambah Guru Baru"}
              </Title>
              <Text
                style={{
                  display: "block",
                  marginTop: 8,
                  color: "rgba(226, 232, 240, 0.92)",
                  lineHeight: 1.7,
                }}
              >
                Lengkapi informasi guru dan penempatannya dengan struktur yang
                lebih rapi agar pengelolaan data tetap konsisten.
              </Text>
            </div>
          </Space>
        </Card>

        <Card
          variant="borderless"
          style={{
            borderRadius: 24,
            border: "1px solid rgba(148, 163, 184, 0.14)",
            boxShadow: "0 20px 50px rgba(15, 23, 42, 0.06)",
          }}
          styles={{ body: { padding: isMobile ? 18 : 24 } }}
        >
          <Form form={form} layout="vertical" onFinish={handleFinish}>
            <Row gutter={[16, 0]}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="full_name"
                  label="Nama Lengkap (dengan gelar)"
                  rules={[{ required: true, message: "Nama wajib diisi" }]}
                >
                  <Input
                    size="large"
                    placeholder="Contoh: Budi Santoso, S.Pd."
                    prefix={<UserOutlined style={{ color: "#64748b" }} />}
                    style={{ borderRadius: 14 }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="username"
                  label="Username Login"
                  rules={[{ required: true, message: "Username wajib diisi" }]}
                >
                  <Input
                    size="large"
                    placeholder="Username unik"
                    disabled={!!initialData}
                    style={{ borderRadius: 14 }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="password"
              label={initialData ? "Password Baru (Opsional)" : "Password"}
              rules={[
                { required: !initialData, message: "Password wajib diisi" },
                { min: 6, message: "Minimal 6 karakter" },
              ]}
            >
              <Input.Password
                size="large"
                prefix={<LockOutlined style={{ color: "#64748b" }} />}
                placeholder={
                  initialData
                    ? "Biarkan kosong jika tidak diubah"
                    : "Password akun"
                }
                style={{ borderRadius: 14 }}
              />
            </Form.Item>

            <Row gutter={[16, 0]}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="homebase_id"
                  label="Penempatan (Homebase)"
                  rules={[
                    { required: true, message: "Guru wajib memiliki Homebase" },
                  ]}
                >
                  <Select
                    size="large"
                    placeholder="Pilih Satuan Pendidikan"
                    loading={loadingHomebase}
                    showSearch
                    optionFilterProp="label"
                    suffixIcon={<HomeOutlined style={{ color: "#64748b" }} />}
                    options={(homebaseData?.data || []).map((hb) => ({
                      value: hb.id,
                      label: hb.name,
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="nip" label="NIP / NIY">
                  <Input
                    size="large"
                    placeholder="Nomor Induk"
                    prefix={<IdcardOutlined style={{ color: "#64748b" }} />}
                    style={{ borderRadius: 14 }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[16, 0]}>
              <Col xs={24} md={12}>
                <Form.Item name="phone" label="No. Telepon / WhatsApp">
                  <Input
                    size="large"
                    placeholder="08xxx"
                    prefix={<PhoneOutlined style={{ color: "#64748b" }} />}
                    style={{ borderRadius: 14 }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="email" label="Email">
                  <Input
                    size="large"
                    type="email"
                    placeholder="email@sekolah.sch.id"
                    prefix={<MailOutlined style={{ color: "#64748b" }} />}
                    style={{ borderRadius: 14 }}
                  />
                </Form.Item>
              </Col>
            </Row>

            {initialData ? (
              <Form.Item
                name="is_active"
                label="Status Akun"
                valuePropName="checked"
              >
                <Switch checkedChildren="Aktif" unCheckedChildren="Nonaktif" />
              </Form.Item>
            ) : null}

            <Card
              variant="borderless"
              style={{
                borderRadius: 18,
                background:
                  "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(14,165,233,0.08))",
                border: "1px solid rgba(59,130,246,0.12)",
              }}
              styles={{ body: { padding: 16 } }}
            >
              <Space align="start" size={12}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(255,255,255,0.8)",
                    color: "#0284c7",
                    fontSize: 18,
                    flexShrink: 0,
                  }}
                >
                  <SafetyCertificateOutlined />
                </div>
                <div>
                  <Text style={{ color: "#0f172a", fontWeight: 600 }}>
                    Catatan data guru
                  </Text>
                  <Text
                    style={{
                      display: "block",
                      color: "#475569",
                      marginTop: 4,
                      lineHeight: 1.65,
                    }}
                  >
                    Pastikan penempatan homebase, identitas, dan kontak guru
                    terisi dengan benar agar proses akademik dan administrasi
                    tetap sinkron.
                  </Text>
                </div>
              </Space>
            </Card>
          </Form>
        </Card>
      </Space>
    </Modal>
  );
};

export default ModalTeacher;
