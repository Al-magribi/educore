import React, { useEffect, useMemo } from "react";
import {
  useGetConfigsQuery,
  useUpdateConfigsMutation,
} from "../../../../service/center/ApiApp";
import { Form, Button, Card, Tabs, message, Spin, Alert } from "antd";
import { SaveOutlined, SettingOutlined } from "@ant-design/icons";
import ConfigCategoryPanel from "./ConfigCategoryPanel"; // Import panel kategori

const App = () => {
  const normalizeDomainInput = (rawValue) => {
    if (typeof rawValue !== "string") return rawValue;
    const trimmed = rawValue.trim();
    if (!trimmed) return "";
    return trimmed.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  };

  // 1. Redux Hooks
  const { data: configs, isLoading, isError } = useGetConfigsQuery();
  const [updateConfigs, { isLoading: isUpdating }] = useUpdateConfigsMutation();

  // 2. Form Instance
  const [form] = Form.useForm();

  // 3. Effect: Set Initial Values saat data dimuat
  useEffect(() => {
    if (configs) {
      const initialValues = {};
      configs.forEach((item) => {
        initialValues[item.key] = item.value;
      });
      form.setFieldsValue(initialValues);
    }
  }, [configs, form]);

  // 4. Handle Submit
  const onFinish = async (values) => {
    try {
      // Transform { key: value } -> [{ key, value }]
      const payload = Object.keys(values).map((key) => ({
        key: key,
        value: key === "domain" ? normalizeDomainInput(values[key]) : values[key],
      }));

      await updateConfigs({ configs: payload }).unwrap();
      message.success("Konfigurasi berhasil disimpan!");
    } catch (error) {
      console.error(error);
      message.error("Gagal menyimpan konfigurasi.");
    }
  };

  // 5. Generate Tab Items (Menggunakan useMemo agar tidak re-render berat)
  const tabItems = useMemo(() => {
    if (!configs) return [];

    // Ambil daftar kategori unik
    const uniqueCategories = [...new Set(configs.map((c) => c.category))];

    return uniqueCategories.map((cat) => ({
      key: cat,
      label: cat.toUpperCase(),
      // Filter config sesuai kategori dan render ke komponen Panel
      children: (
        <ConfigCategoryPanel
          configs={configs.filter((c) => c.category === cat)}
        />
      ),
    }));
  }, [configs]);

  // 6. Render Loading/Error States
  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 50 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert title="Gagal memuat data konfigurasi" type="error" showIcon />
    );
  }

  // 7. Render Main UI (Tanpa AppLayout)
  return (
    <Card
      title={
        <span>
          <SettingOutlined /> Pengaturan Sistem
        </span>
      }
      extra={
        <Button
          type="primary"
          icon={<SaveOutlined />}
          loading={isUpdating}
          onClick={() => form.submit()}
        >
          Simpan Perubahan
        </Button>
      }
      style={{ borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Tabs defaultActiveKey="metadata" items={tabItems} type="card" />
      </Form>
    </Card>
  );
};

export default App;
