import React from "react";
import { motion } from "framer-motion";
import { Form, Input, Button, App, Card, Typography, Flex, Alert } from "antd";
import { UserPlus, BadgeCheck, Hash, Sparkles } from "lucide-react";
import { useAddStudentMutation } from "../../../../../service/main/ApiClass";

const { Title, Text } = Typography;
const MotionDiv = motion.div;

// === FORM TAMBAH MANUAL ===
export const AddStudentForm = ({ classId, onSuccess }) => {
  const [form] = Form.useForm();
  const [addStudent, { isLoading }] = useAddStudentMutation();
  const { message } = App.useApp();

  const onFinish = async (values) => {
    try {
      await addStudent({ ...values, classid: classId }).unwrap();
      message.success("Siswa berhasil ditambahkan");
      form.resetFields();
      if (onSuccess) onSuccess();
    } catch (error) {
      message.error(error?.data?.message || "Gagal menambah siswa");
    }
  };

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <Card
        bordered={false}
        style={{
          borderRadius: 22,
          background:
            "linear-gradient(135deg, rgba(240,253,244,0.92), rgba(239,246,255,0.92))",
          boxShadow: "0 14px 30px rgba(15, 23, 42, 0.05)",
        }}
        styles={{ body: { padding: 18 } }}
      >
        <Flex justify="space-between" align="start" gap={16} wrap="wrap">
          <div>
            <Title level={4} style={{ margin: 0 }}>
              Tambah Siswa Secara Manual
            </Title>
            <Text type="secondary">
              Masukkan NIS siswa yang sudah tersedia di database utama, lalu
              kaitkan ke kelas aktif ini.
            </Text>
          </div>

          <Flex
            align="center"
            gap={8}
            style={{
              borderRadius: 999,
              padding: "8px 14px",
              background: "rgba(3, 105, 161, 0.10)",
              color: "#0369a1",
              fontWeight: 600,
            }}
          >
            <Sparkles size={14} />
            <span>Tambah cepat via NIS</span>
          </Flex>
        </Flex>
      </Card>

      <Card
        bordered={false}
        style={{
          borderRadius: 22,
          boxShadow: "0 16px 34px rgba(15, 23, 42, 0.06)",
        }}
        styles={{ body: { padding: 18 } }}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <div
            style={{
              borderRadius: 20,
              border: "1px solid rgba(148, 163, 184, 0.18)",
              background: "#ffffff",
              padding: 18,
              marginBottom: 16,
            }}
          >
            <Form.Item
              name="nis"
              label="NIS (Nomor Induk Siswa)"
              rules={[{ required: true, message: "NIS wajib diisi" }]}
              help="Pastikan siswa sudah terdaftar di database utama."
              style={{ marginBottom: 0 }}
            >
              <Input
                size="large"
                prefix={<Hash size={16} color="#0284c7" />}
                placeholder="Masukkan NIS siswa"
                style={{ borderRadius: 14, paddingBlock: 8 }}
              />
            </Form.Item>
          </div>

          <Alert
            type="info"
            showIcon
            icon={<BadgeCheck size={16} />}
            style={{
              marginBottom: 18,
              borderRadius: 16,
              border: "1px solid rgba(14, 165, 233, 0.14)",
              background: "linear-gradient(135deg, #ecfeff, #eff6ff)",
            }}
            message="Tips pengisian"
            description="Gunakan NIS yang valid dan sudah terhubung ke data siswa agar proses penambahan berjalan lancar."
          />

          <Button
            type="primary"
            htmlType="submit"
            loading={isLoading}
            block
            size="large"
            icon={<UserPlus size={16} />}
            style={{
              height: 46,
              borderRadius: 14,
              boxShadow: "0 12px 24px rgba(2, 132, 199, 0.20)",
            }}
          >
            Tambahkan Siswa
          </Button>
        </Form>
      </Card>
    </MotionDiv>
  );
};
