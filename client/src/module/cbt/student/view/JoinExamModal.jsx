import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Form,
  Input,
  Modal,
  Space,
  Typography,
  message,
} from "antd";
import { KeyRound } from "lucide-react";
import { useEnterStudentExamMutation } from "../../../../service/cbt/ApiExam";
import { useNavigate } from "react-router-dom";

const { Text } = Typography;

const statusAlert = (status) => {
  if (status === "pelanggaran") {
    return { type: "error", title: "Status: Pelanggaran" };
  }
  if (status === "mengerjakan") {
    return { type: "warning", title: "Status: Mengerjakan" };
  }
  if (status === "selesai") {
    return { type: "info", title: "Status: Selesai" };
  }
  return null;
};

const JoinExamModal = ({ open, onClose, exam }) => {
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const [enterExam, { isLoading }] = useEnterStudentExamMutation();
  const [statusInfo, setStatusInfo] = useState(null);

  useEffect(() => {
    if (open) {
      form.resetFields();
      setStatusInfo(null);
    }
  }, [open, form]);

  const handleSubmit = async (values) => {
    try {
      setStatusInfo(null);
      await enterExam({
        exam_id: exam?.id,
        token: values.token?.trim(),
      }).unwrap();
      message.success("Token valid. Selamat mengerjakan ujian.");

      navigate(
        `/computer-based-test/start?exam_id=${exam?.id}&exam_name=${exam?.name?.replaceAll(" ", "-")}`,
      );
      onClose();
    } catch (error) {
      const status = error?.data?.status || null;
      const messageText = error?.data?.message || "Token ujian tidak valid";
      if (status) {
        setStatusInfo({ status, message: messageText });
      } else {
        message.error(messageText);
      }
    }
  };

  return (
    <Modal
      title={
        <Space align="center" size={8}>
          <KeyRound size={18} />
          <span>Masukkan Token Ujian</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      destroyOnHidden
    >
      <Space vertical size={12} style={{ width: "100%" }}>
        <Text type="secondary">
          {exam?.name ? `Ujian: ${exam.name}` : "Pastikan token sesuai jadwal."}
        </Text>
        {statusInfo && statusAlert(statusInfo.status) && (
          <Alert
            type={statusAlert(statusInfo.status).type}
            title={statusAlert(statusInfo.status).title}
            description={statusInfo.message}
            showIcon
          />
        )}
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Token Ujian"
            name="token"
            rules={[{ required: true, message: "Token ujian wajib diisi" }]}
          >
            <Input placeholder="Masukkan token ujian" />
          </Form.Item>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Status ujian: Belum Masuk = belum mengikuti, Pelanggaran = keluar
            dari halaman ujian, Mengerjakan = masih berlangsung, Selesai = sudah
            menjawab semua soal.
          </Text>
          <Space style={{ width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={onClose}>Batal</Button>
            <Button type="primary" htmlType="submit" loading={isLoading}>
              Verifikasi
            </Button>
          </Space>
        </Form>
      </Space>
    </Modal>
  );
};

export default JoinExamModal;
