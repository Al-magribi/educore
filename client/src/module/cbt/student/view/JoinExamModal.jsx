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

const requestExamFullscreen = async () => {
  if (typeof document === "undefined") return false;
  if (document.fullscreenElement) return true;
  const element = document.documentElement;
  if (!element?.requestFullscreen) return false;
  try {
    await element.requestFullscreen();
    return true;
  } catch (_error) {
    return false;
  }
};

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

const fetchIpFromService = async (url, timeoutMs = 2500) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return null;

    const data = await response.json();
    const candidate = data?.ip || data?.ip_addr || data?.address;
    return typeof candidate === "string" && candidate.trim()
      ? candidate.trim()
      : null;
  } catch (_error) {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const resolveStudentPublicIp = async () => {
  if (typeof window === "undefined" || typeof fetch !== "function") return null;

  const services = [
    "https://api64.ipify.org?format=json",
    "https://api.ipify.org?format=json",
    "https://ifconfig.me/all.json",
  ];

  for (const serviceUrl of services) {
    // Try a few providers so attendance still stores IP when one provider fails.
    const ip = await fetchIpFromService(serviceUrl);
    if (ip) return ip;
  }

  return null;
};

const JoinExamModal = ({ open, onClose, exam }) => {
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const [enterExam, { isLoading }] = useEnterStudentExamMutation();
  const [statusInfo, setStatusInfo] = useState(null);
  const [studentIp, setStudentIp] = useState(null);

  useEffect(() => {
    if (open) {
      form.resetFields();
      setStatusInfo(null);
      setStudentIp(null);
      void resolveStudentPublicIp().then((ip) => setStudentIp(ip));
    }
  }, [open, form]);

  const handleSubmit = async (values) => {
    try {
      setStatusInfo(null);
      const fallbackIp = studentIp || (await resolveStudentPublicIp());
      await enterExam({
        exam_id: exam?.id,
        token: values.token?.trim(),
        student_ip: fallbackIp || undefined,
      }).unwrap();
      await requestExamFullscreen();
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
