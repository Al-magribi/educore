import React, { useEffect, useMemo } from "react";
import {
  Alert,
  Button,
  Card,
  Flex,
  Form,
  Grid,
  Space,
  Spin,
  Tabs,
  Tag,
  Typography,
  message,
  theme,
} from "antd";
import { SaveOutlined, SettingOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import {
  useGetConfigsQuery,
  useUpdateConfigsMutation,
} from "../../../../service/center/ApiApp";
import ConfigCategoryPanel from "./ConfigCategoryPanel";

const { useBreakpoint } = Grid;
const { Title, Text } = Typography;
const MotionDiv = motion.div;

const App = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isCompact = !screens.lg;
  const { token } = theme.useToken();

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

    const createTabLabel = (label, caption) => (
      <Flex align="center" gap={isMobile ? 6 : 10} style={{ minWidth: 0 }}>
        {!isMobile && (
          <span
            style={{
              width: 34,
              height: 34,
              display: "grid",
              placeItems: "center",
              borderRadius: 12,
              background: "linear-gradient(135deg, #e0f2fe, #dcfce7)",
              color: "#0369a1",
              border: "1px solid rgba(148, 163, 184, 0.14)",
              flexShrink: 0,
            }}
          >
            <SettingOutlined />
          </span>
        )}
        <Flex vertical gap={0} style={{ minWidth: 0 }}>
          <span
            style={{
              fontWeight: 600,
              lineHeight: 1.2,
              fontSize: isMobile ? 12 : undefined,
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </span>
          {!isMobile && (
            <span
              style={{
                fontSize: 12,
                color: token.colorTextSecondary,
                lineHeight: 1.2,
              }}
            >
              {caption}
            </span>
          )}
        </Flex>
      </Flex>
    );

    const uniqueCategories = [...new Set(configs.map((c) => c.category))];

    return uniqueCategories.map((cat) => {
      const categoryConfigs = configs.filter((c) => c.category === cat);

      return {
        key: cat,
        label: createTabLabel(
          cat.toUpperCase(),
          `${categoryConfigs.length} item`,
        ),
        children: <ConfigCategoryPanel configs={categoryConfigs} />,
      };
    });
  }, [configs, isMobile, token.colorTextSecondary]);

  if (isLoading) {
    return (
      <Card
        variant="borderless"
        style={{ borderRadius: isMobile ? 18 : 22, width: "100%", minWidth: 0 }}
        styles={{ body: { padding: isMobile ? 20 : 28 } }}
      >
        <div
          style={{
            minHeight: 260,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Spin size="large" />
        </div>
      </Card>
    );
  }

  if (isError) {
    return (
      <Alert title="Gagal memuat data konfigurasi" type="error" showIcon />
    );
  }

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{
        display: "grid",
        gap: isMobile ? 12 : 18,
        width: "100%",
        minWidth: 0,
      }}
    >
      <Card
        variant="borderless"
        style={{
          borderRadius: isMobile ? 18 : 22,
          overflow: "hidden",
          border: "1px solid rgba(148, 163, 184, 0.14)",
          background:
            "linear-gradient(135deg, rgba(59,130,246,0.1), rgba(14,165,233,0.08), rgba(16,185,129,0.08))",
          width: "100%",
          minWidth: 0,
        }}
        styles={{ body: { padding: isMobile ? 14 : 20 } }}
      >
        <Flex
          wrap="wrap"
          gap={14}
          justify="space-between"
          align={isCompact ? "stretch" : "center"}
          vertical={isCompact}
          style={{ width: "100%", minWidth: 0 }}
        >
          <Space orientation="vertical" size={10} style={{ flex: 1, minWidth: 0 }}>
            <Tag
              icon={<SettingOutlined />}
              style={{
                width: "fit-content",
                margin: 0,
                borderRadius: 999,
                paddingInline: 12,
                fontWeight: 600,
              }}
              color="blue"
            >
              Pengaturan Sistem
            </Tag>
            <div style={{ minWidth: 0 }}>
              <Title
                level={isMobile ? 4 : 3}
                style={{
                  margin: 0,
                  color: "#0f172a",
                  fontSize: isMobile ? 18 : undefined,
                  wordBreak: "break-word",
                }}
              >
                {isMobile
                  ? "Identitas & preferensi aplikasi"
                  : "Atur identitas aplikasi dan preferensi utama sistem."}
              </Title>
              {!isMobile && (
                <Text
                  style={{
                    display: "block",
                    marginTop: 6,
                    color: "#475569",
                    maxWidth: 760,
                    lineHeight: 1.7,
                  }}
                >
                  Perubahan konfigurasi akan langsung digunakan oleh sistem, jadi
                  pastikan nilai yang disimpan sudah sesuai kebutuhan operasional.
                </Text>
              )}
            </div>
          </Space>

          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={isUpdating}
            onClick={() => form.submit()}
            size={isMobile ? "middle" : "large"}
            block={isCompact}
            style={{
              borderRadius: 999,
              paddingInline: 20,
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {isMobile ? "Simpan" : "Simpan Perubahan"}
          </Button>
        </Flex>
      </Card>

      <Card
        variant="borderless"
        style={{
          borderRadius: isMobile ? 18 : token.borderRadiusXL,
          border: "1px solid rgba(148, 163, 184, 0.14)",
          width: "100%",
          minWidth: 0,
          overflow: "hidden",
        }}
        styles={{ body: { padding: isMobile ? 10 : 16 } }}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Tabs
            defaultActiveKey={tabItems[0]?.key}
            items={tabItems}
            size={isMobile ? "small" : "large"}
            tabBarGutter={isMobile ? 8 : 12}
            style={{ width: "100%", minWidth: 0 }}
            tabBarStyle={{ marginBottom: isMobile ? 12 : 20, paddingBottom: 8 }}
          />
        </Form>
      </Card>
    </MotionDiv>
  );
};

export default App;
