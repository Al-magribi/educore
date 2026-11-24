import React from "react";
import { motion } from "framer-motion";
import { App, Button, Flex, Form, Input } from "antd";
import { Hash, UserPlus } from "lucide-react";
import { useAddStudentMutation } from "../../../../../service/main/ApiClass";
import { CardTitle, MuseCard } from "../../../../../components/ui/muse";
import { museColors } from "../../../../../config/theme";

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
    >
      <MuseCard
        title={
          <CardTitle
            icon={<UserPlus size={16} />}
            title="Tambah Siswa Manual"
            description="Masukkan NIS siswa yang sudah ada di database utama."
          />
        }
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item
            name="nis"
            label="NIS (Nomor Induk Siswa)"
            rules={[{ required: true, message: "NIS wajib diisi" }]}
            extra="Pastikan siswa sudah terdaftar di database utama."
          >
            <Input
              prefix={<Hash size={16} color={museColors.muted} />}
              placeholder="Masukkan NIS siswa"
            />
          </Form.Item>

          <Flex justify="flex-end">
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              icon={<UserPlus size={16} />}
            >
              Tambahkan Siswa
            </Button>
          </Flex>
        </Form>
      </MuseCard>
    </MotionDiv>
  );
};
