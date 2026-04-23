import React, { useEffect } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  message,
  Card,
  Typography,
  Space,
  Grid,
} from "antd";
import { motion } from "framer-motion";
import {
  BankOutlined,
  EditOutlined,
  PlusOutlined,
  EnvironmentOutlined,
} from "@ant-design/icons";
import {
  useAddHomebaseMutation,
  useUpdateHomebaseMutation,
} from "../../../service/center/ApiHomebase";

const { TextArea } = Input;
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

const ModalHome = ({ open, onCancel, onSuccess, initialData }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [form] = Form.useForm();

  const [addHomebase, { isLoading: isAdding }] = useAddHomebaseMutation();
  const [updateHomebase, { isLoading: isUpdating }] =
    useUpdateHomebaseMutation();

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.setFieldsValue(initialData);
      } else {
        form.resetFields();
      }
    }
  }, [open, initialData, form]);

  const handleFinish = async (values) => {
    try {
      if (initialData) {
        await updateHomebase({ id: initialData.id, ...values }).unwrap();
        message.success("Berhasil diperbarui");
      } else {
        await addHomebase(values).unwrap();
        message.success("Berhasil ditambahkan");
      }

      form.resetFields();
      onSuccess();
    } catch (error) {
      message.error(error?.data?.message || "Terjadi kesalahan saat menyimpan");
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
      width={720}
      okText={initialData ? "Simpan Perubahan" : "Simpan Homebase"}
      cancelText='Batal'
      centered
      closable={false}
      modalRender={(node) => (
        <MotionDiv
          variants={modalVariants}
          initial='hidden'
          animate='show'
          style={{ borderRadius: 28, overflow: "hidden" }}
        >
          {node}
        </MotionDiv>
      )}
    >
      <Space orientation='vertical' size={18} style={{ width: "100%" }}>
        <Card
          variant='borderless'
          style={{
            borderRadius: 24,
            background:
              "radial-gradient(circle at top left, rgba(14,165,233,0.16), transparent 30%), linear-gradient(135deg, #0f172a, #1d4ed8 60%, #0f766e)",
            boxShadow: "0 24px 56px rgba(15, 23, 42, 0.18)",
          }}
          styles={{ body: { padding: isMobile ? 20 : 26 } }}
        >
          <Space orientation='vertical' size={12} style={{ width: "100%" }}>
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
                {initialData ? "Edit Homebase" : "Tambah Homebase"}
              </Title>
              <Text
                style={{
                  display: "block",
                  marginTop: 8,
                  color: "rgba(226, 232, 240, 0.92)",
                  lineHeight: 1.7,
                }}
              >
                Lengkapi informasi satuan pendidikan dengan struktur yang lebih
                rapi agar data center tetap mudah dikelola.
              </Text>
            </div>
          </Space>
        </Card>

        <Card
          variant='borderless'
          style={{
            borderRadius: 24,
            border: "1px solid rgba(148, 163, 184, 0.14)",
            boxShadow: "0 20px 50px rgba(15, 23, 42, 0.06)",
          }}
          styles={{ body: { padding: isMobile ? 18 : 24 } }}
        >
          <Form
            form={form}
            layout='vertical'
            onFinish={handleFinish}
            preserve={false}
          >
            <Form.Item
              name='name'
              label='Nama Satuan Pendidikan'
              rules={[{ required: true, message: "Nama wajib diisi" }]}
            >
              <Input
                size='large'
                prefix={<BankOutlined style={{ color: "#64748b" }} />}
                placeholder='Contoh: SMA Islam Terpadu'
                style={{ borderRadius: 14 }}
              />
            </Form.Item>

            <Form.Item
              name='level'
              label='Jenjang / Level Satuan'
              rules={[
                { required: true, message: "Silakan pilih jenjang satuan" },
              ]}
            >
              <Select
                size='large'
                placeholder='Pilih Jenjang'
                style={{ width: "100%" }}
                options={[
                  { value: "SD / MI", label: "SD / MI" },
                  { value: "SMP / MTS", label: "SMP / MTS" },
                  { value: "SMA / SMK / MA", label: "SMA / SMK / MA" },
                ]}
              />
            </Form.Item>

            <Form.Item name='description' label='Deskripsi / Alamat Singkat'>
              <TextArea
                rows={4}
                placeholder='Tambahkan keterangan singkat, alamat, atau catatan pendukung...'
                style={{ borderRadius: 14 }}
              />
            </Form.Item>

            <Card
              variant='borderless'
              style={{
                borderRadius: 18,
                background:
                  "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(14,165,233,0.08))",
                border: "1px solid rgba(59,130,246,0.12)",
              }}
              styles={{ body: { padding: 16 } }}
            >
              <Space align='start' size={12}>
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
                  <EnvironmentOutlined />
                </div>
                <div>
                  <Text style={{ color: "#0f172a", fontWeight: 600 }}>
                    Tips pengisian
                  </Text>
                  <Text
                    style={{
                      display: "block",
                      color: "#475569",
                      marginTop: 4,
                      lineHeight: 1.65,
                    }}
                  >
                    Gunakan nama resmi satuan pendidikan dan deskripsi singkat
                    yang mudah dikenali agar pencarian data lebih konsisten.
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

export default ModalHome;
