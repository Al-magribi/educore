import React, { useEffect, useMemo } from "react";
import { Alert, Button, Form, Grid, Skeleton, Tabs, Typography, message } from "antd";
import { Save, SlidersHorizontal } from "lucide-react";
import { motion } from "framer-motion";
import {
  useGetConfigsQuery,
  useUpdateConfigsMutation,
} from "../../../../service/center/ApiApp";
import ConfigCategoryPanel from "./ConfigCategoryPanel";
import { CardTitle, MuseCard } from "../../../../components/ui/muse";

const { useBreakpoint } = Grid;
const { Text } = Typography;
const MotionDiv = motion.div;

const formatCategory = (value) =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const App = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const normalizeDomainInput = (rawValue) => {
    if (typeof rawValue !== "string") {
      return rawValue;
    }

    const trimmed = rawValue.trim();
    if (!trimmed) {
      return "";
    }

    return trimmed.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  };

  const { data: configs, isLoading, isError } = useGetConfigsQuery();
  const [updateConfigs, { isLoading: isUpdating }] = useUpdateConfigsMutation();
  const [form] = Form.useForm();

  useEffect(() => {
    if (configs) {
      const initialValues = {};
      configs.forEach((item) => {
        initialValues[item.key] = item.value;
      });
      form.setFieldsValue(initialValues);
    }
  }, [configs, form]);

  const onFinish = async (values) => {
    try {
      const payload = Object.keys(values).map((key) => ({
        key,
        value:
          key === "domain" ? normalizeDomainInput(values[key]) : values[key],
      }));

      await updateConfigs({ configs: payload }).unwrap();
      message.success("Konfigurasi berhasil disimpan!");
    } catch (error) {
      console.error(error);
      message.error("Gagal menyimpan konfigurasi.");
    }
  };

  const tabItems = useMemo(() => {
    if (!configs) {
      return [];
    }

    const uniqueCategories = [...new Set(configs.map((c) => c.category))];

    return uniqueCategories.map((cat) => {
      const categoryConfigs = configs.filter((c) => c.category === cat);

      return {
        key: cat,
        label: (
          <span>
            {formatCategory(cat)}
            <Text type="secondary" style={{ marginLeft: 6, fontSize: 12 }}>
              {categoryConfigs.length}
            </Text>
          </span>
        ),
        children: <ConfigCategoryPanel configs={categoryConfigs} />,
      };
    });
  }, [configs]);

  if (isLoading) {
    return (
      <MuseCard>
        <Skeleton active paragraph={{ rows: 8 }} />
      </MuseCard>
    );
  }

  if (isError) {
    return (
      <Alert
        type="error"
        showIcon
        title="Gagal memuat data konfigurasi"
        description="Periksa koneksi lalu muat ulang halaman."
      />
    );
  }

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{ minWidth: 0 }}
    >
      <MuseCard
        title={
          <CardTitle
            icon={<SlidersHorizontal size={16} />}
            title="Identitas & Preferensi Aplikasi"
            description={
              isMobile
                ? undefined
                : "Perubahan langsung dipakai sistem. Pastikan nilainya sesuai kebutuhan operasional."
            }
          />
        }
        extra={
          <Button
            type="primary"
            icon={<Save size={16} />}
            loading={isUpdating}
            onClick={() => form.submit()}
          >
            {isMobile ? "Simpan" : "Simpan Perubahan"}
          </Button>
        }
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Tabs
            defaultActiveKey={tabItems[0]?.key}
            items={tabItems}
            size={isMobile ? "small" : "middle"}
            style={{ width: "100%", minWidth: 0 }}
          />
        </Form>
      </MuseCard>
    </MotionDiv>
  );
};

export default App;
