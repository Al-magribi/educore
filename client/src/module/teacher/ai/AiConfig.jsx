import React, { useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import {
  Card,
  Col,
  Form,
  Grid,
  Row,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
  theme,
} from "antd";
import { motion } from "framer-motion";

import {
  useGetAiConfigQuery,
  useGetAiUsageReportQuery,
  useTestAiConnectionMutation,
  useUpdateAiConfigMutation,
} from "../../../service/ai/ApiAiConfig";
import {
  audioModelOptions,
  containerVariants,
  createSummaryCards,
  featureMeta,
  itemVariants,
  languageOptions,
  textModelOptions,
} from "./constants.jsx";
import AiConfigHeader from "./components/AiConfigHeader";
import AiConfigFormCard from "./components/AiConfigFormCard";
import AiFeaturePanel from "./components/AiFeaturePanel";
import AiOperationalSummary from "./components/AiOperationalSummary";
import AiNotesCard from "./components/AiNotesCard";

const MotionDiv = motion.div;
const { useBreakpoint } = Grid;
const { Text, Title } = Typography;

const getErrorMessage = (error, fallback) =>
  error?.data?.message || error?.error || fallback;

const initialValues = {
  provider: "openai",
  default_mode: "live",
  default_language: "id",
  default_model_text: "gpt-4.1-mini",
  default_model_audio: "gpt-4o-mini-transcribe",
  max_audio_duration_seconds: 300,
  max_audio_file_size_mb: 20,
  is_active: true,
  features: {
    question_generator: true,
    essay_grader: true,
    speech_to_text: true,
  },
};

const AiConfig = () => {
  const { token } = theme.useToken();
  const screens = useBreakpoint();
  const { user } = useSelector((state) => state.auth);
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  const isMobile = !screens.md;

  const {
    data: config,
    isLoading,
    isFetching,
    refetch,
  } = useGetAiConfigQuery();
  const [updateAiConfig, { isLoading: isSaving }] = useUpdateAiConfigMutation();
  const [testAiConnection, { isLoading: isTesting }] =
    useTestAiConnectionMutation();
  const { data: usageReport, isFetching: usageFetching } =
    useGetAiUsageReportQuery({ limit: 50 });

  useEffect(() => {
    if (!config) return;

    form.setFieldsValue({
      provider: config.provider || "openai",
      api_key: "",
      default_model_text: config.default_model_text,
      default_model_audio: config.default_model_audio,
      default_language: config.default_language,
      default_mode: config.default_mode,
      max_audio_duration_seconds: config.max_audio_duration_seconds,
      max_audio_file_size_mb: config.max_audio_file_size_mb,
      is_active: config.is_active,
      features: config.features,
    });
  }, [config, form]);

  const summaryCards = useMemo(
    () => createSummaryCards(config, isMobile),
    [config, isMobile],
  );
  const usageSummary = usageReport?.summary || {};
  const usageRows = usageReport?.rows || [];
  const usageColumns = useMemo(
    () => [
      {
        title: "Waktu",
        dataIndex: "created_at",
        key: "created_at",
        width: 180,
        render: (value) => (value ? new Date(value).toLocaleString("id-ID") : "-"),
      },
      {
        title: "Fitur",
        dataIndex: "feature_code",
        key: "feature_code",
        width: 140,
        render: (value) => <Tag color='blue'>{value || "-"}</Tag>,
      },
      {
        title: "Model",
        dataIndex: "model",
        key: "model",
        width: 160,
        render: (value) => value || "-",
      },
      {
        title: "Token",
        dataIndex: "total_tokens",
        key: "total_tokens",
        width: 120,
        align: "right",
        render: (value) => Number(value || 0).toLocaleString("id-ID"),
      },
      {
        title: "Biaya (USD)",
        dataIndex: "total_cost_usd",
        key: "total_cost_usd",
        width: 140,
        align: "right",
        render: (value) => Number(value || 0).toFixed(6),
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 120,
        render: (value) => (
          <Tag color={value === "success" ? "green" : value === "failed" ? "red" : "gold"}>
            {value || "-"}
          </Tag>
        ),
      },
    ],
    [],
  );

  const handleSave = async (values) => {
    try {
      await updateAiConfig({
        ...values,
        provider: "openai",
      }).unwrap();
      messageApi.success("Konfigurasi AI berhasil disimpan");
      form.setFieldValue("api_key", "");
      refetch();
    } catch (error) {
      messageApi.error(
        getErrorMessage(error, "Gagal menyimpan konfigurasi AI"),
      );
    }
  };

  const handleTestConnection = async () => {
    try {
      const apiKey = form.getFieldValue("api_key");
      const response = await testAiConnection({
        api_key: apiKey || undefined,
      }).unwrap();
      messageApi.success(response?.message || "Koneksi OpenAI berhasil diuji");
      refetch();
    } catch (error) {
      messageApi.error(getErrorMessage(error, "Koneksi OpenAI gagal diuji"));
      refetch();
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: 24 }}>
        <Skeleton active paragraph={{ rows: 10 }} />
      </div>
    );
  }

  return (
    <>
      {contextHolder}
      <MotionDiv variants={containerVariants} initial='hidden' animate='show'>
        <MotionDiv variants={itemVariants}>
          <AiConfigHeader
            isMobile={isMobile}
            userName={user?.full_name}
            summaryCards={summaryCards}
          />
        </MotionDiv>

        <Form
          form={form}
          layout='vertical'
          onFinish={handleSave}
          initialValues={initialValues}
        >
          <MotionDiv variants={itemVariants} style={{ marginTop: 20 }}>
            <div
              style={{
                display: "grid",
                gap: 20,
              }}
            >
              <AiFeaturePanel featureMeta={featureMeta} isMobile={isMobile} />

              <Row align='stretch' gutter={[20, 20]}>
                <Col xs={24} xl={16}>
                  <AiConfigFormCard
                    config={config}
                    isMobile={isMobile}
                    isSaving={isSaving}
                    isTesting={isTesting}
                    token={token}
                    handleTestConnection={handleTestConnection}
                    handleSubmit={() => form.submit()}
                    audioModelOptions={audioModelOptions}
                    textModelOptions={textModelOptions}
                    languageOptions={languageOptions}
                  />
                </Col>

                <Col xs={24} xl={8}>
                  <div
                    style={{
                      display: "grid",
                      gap: 20,
                    }}
                  >
                    <AiOperationalSummary config={config} />
                    <AiNotesCard isFetching={isFetching} isMobile={isMobile} />
                  </div>
                </Col>
              </Row>
            </div>
          </MotionDiv>
        </Form>

        <MotionDiv variants={itemVariants} style={{ marginTop: 20 }}>
          <Card
            style={{
              borderRadius: 20,
              background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
              border: "1px solid rgba(148, 163, 184, 0.14)",
            }}
          >
            <Space direction='vertical' size={16} style={{ width: "100%" }}>
              <div>
                <Text type='secondary'>Riwayat Penggunaan AI</Text>
                <Title level={5} style={{ margin: 0 }}>
                  Laporan Token dan Biaya
                </Title>
              </div>

              <Row gutter={[12, 12]}>
                <Col xs={24} md={8}>
                  <Statistic
                    title='Total Request'
                    value={Number(usageSummary.total_requests || 0)}
                  />
                </Col>
                <Col xs={24} md={8}>
                  <Statistic
                    title='Total Token'
                    value={Number(usageSummary.total_tokens || 0)}
                  />
                </Col>
                <Col xs={24} md={8}>
                  <Statistic
                    title='Total Biaya (USD)'
                    value={Number(usageSummary.total_cost_usd || 0)}
                    precision={6}
                  />
                </Col>
              </Row>

              <Table
                rowKey='id'
                loading={usageFetching}
                columns={usageColumns}
                dataSource={usageRows}
                pagination={{ pageSize: 10, showSizeChanger: false }}
                size={isMobile ? "small" : "middle"}
                scroll={{ x: 900 }}
              />
            </Space>
          </Card>
        </MotionDiv>
      </MotionDiv>
    </>
  );
};

export default AiConfig;
