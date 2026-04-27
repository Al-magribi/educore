import React, { useMemo, useState } from "react";
import {
  Card,
  Empty,
  Flex,
  Input,
  Progress,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import { BrainCircuit, CheckCircle2, Clock3, Search, XCircle } from "lucide-react";

const { Text, Title } = Typography;
const MotionDiv = motion.div;

const normalizeQuestionText = (value = "") =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const levelColorMap = {
  1: "gold",
  2: "lime",
  3: "green",
  4: "cyan",
  5: "blue",
  6: "magenta",
};

const metricCardStyle = {
  borderRadius: 18,
  background: "#f8fafc",
  height: "100%",
};

const BloomAnalysis = ({
  data,
  isLoading = false,
  isMobile = false,
}) => {
  const [searchText, setSearchText] = useState("");

  const bloomSummary = useMemo(
    () => data?.by_bloom_level || [],
    [data],
  );

  const perQuestion = useMemo(() => {
    const rows = data?.per_question || [];
    if (!searchText.trim()) return rows;

    const query = searchText.toLowerCase();
    return rows.filter((item) => {
      const levelText = `${item.bloom_label || ""} ${item.q_type || ""}`.toLowerCase();
      const questionText = normalizeQuestionText(item.question).toLowerCase();
      return questionText.includes(query) || levelText.includes(query);
    });
  }, [data, searchText]);

  const aggregateStats = useMemo(() => {
    const rows = data?.per_question || [];
    return rows.reduce(
      (acc, item) => {
        acc.totalQuestions += 1;
        acc.correct += Number(item.correct_count || 0);
        acc.incorrect += Number(item.incorrect_count || 0);
        acc.unanswered += Number(item.unanswered_count || 0);
        acc.pending += Number(item.pending_review_count || 0);
        return acc;
      },
      {
        totalQuestions: 0,
        correct: 0,
        incorrect: 0,
        unanswered: 0,
        pending: 0,
      },
    );
  }, [data]);

  const summaryColumns = [
    {
      title: "Bloom Level",
      dataIndex: "bloom_label",
      key: "bloom_label",
      width: 220,
      render: (_, record) => (
        <Space size={8}>
          <Tag
            color={levelColorMap[record.bloom_level] || "default"}
            style={{ margin: 0, borderRadius: 999 }}
          >
            {record.bloom_level ? `C${record.bloom_level}` : "N/A"}
          </Tag>
          <Text strong>{record.bloom_label}</Text>
        </Space>
      ),
    },
    {
      title: "Jumlah Soal",
      dataIndex: "total_questions",
      key: "total_questions",
      width: 120,
      align: "center",
    },
    {
      title: "Benar",
      dataIndex: "correct_count",
      key: "correct_count",
      width: 100,
      align: "center",
      render: (value) => <Text style={{ color: "#15803d" }}>{value}</Text>,
    },
    {
      title: "Salah",
      dataIndex: "incorrect_count",
      key: "incorrect_count",
      width: 100,
      align: "center",
      render: (value) => <Text style={{ color: "#dc2626" }}>{value}</Text>,
    },
    {
      title: "Belum Jawab",
      dataIndex: "unanswered_count",
      key: "unanswered_count",
      width: 130,
      align: "center",
    },
    {
      title: "Pending",
      dataIndex: "pending_review_count",
      key: "pending_review_count",
      width: 100,
      align: "center",
    },
    {
      title: "Akurasi",
      dataIndex: "correct_percentage",
      key: "correct_percentage",
      width: 180,
      render: (value) => (
        <Progress
          percent={Number(value || 0)}
          size='small'
          strokeColor="#2563eb"
          showInfo
        />
      ),
    },
  ];

  const questionColumns = [
    {
      title: "No",
      key: "no",
      width: 60,
      align: "center",
      render: (_, __, index) => index + 1,
    },
    {
      title: "Soal",
      dataIndex: "question",
      key: "question",
      width: 360,
      render: (value) => {
        const text = normalizeQuestionText(value);
        const shortText = text.length > 160 ? `${text.slice(0, 160)}...` : text;

        return (
          <Tooltip title={text}>
            <Text>{shortText || "-"}</Text>
          </Tooltip>
        );
      },
    },
    {
      title: "Level",
      dataIndex: "bloom_label",
      key: "bloom_label",
      width: 180,
      render: (_, record) => (
        <Tag
          color={levelColorMap[record.bloom_level] || "default"}
          style={{ margin: 0, borderRadius: 999 }}
        >
          {record.bloom_level ? `C${record.bloom_level}` : "N/A"} {record.bloom_label}
        </Tag>
      ),
    },
    {
      title: "Benar",
      dataIndex: "correct_count",
      key: "correct_count",
      width: 90,
      align: "center",
      render: (value) => <Text style={{ color: "#15803d" }}>{value}</Text>,
    },
    {
      title: "Salah",
      dataIndex: "incorrect_count",
      key: "incorrect_count",
      width: 90,
      align: "center",
      render: (value) => <Text style={{ color: "#dc2626" }}>{value}</Text>,
    },
    {
      title: "Kosong",
      dataIndex: "unanswered_count",
      key: "unanswered_count",
      width: 90,
      align: "center",
    },
    {
      title: "Pending",
      dataIndex: "pending_review_count",
      key: "pending_review_count",
      width: 90,
      align: "center",
    },
    {
      title: "Akurasi",
      dataIndex: "correct_percentage",
      key: "correct_percentage",
      width: 160,
      render: (value) => (
        <Progress
          percent={Number(value || 0)}
          size='small'
          strokeColor="#0f766e"
          showInfo
        />
      ),
    },
  ];

  return (
    <MotionDiv initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <Card
        variant='borderless'
        style={{
          borderRadius: 24,
          boxShadow: "0 18px 36px rgba(15, 23, 42, 0.06)",
        }}
        styles={{ body: { padding: isMobile ? 16 : 20 } }}
      >
        <Space orientation='vertical' size={18} style={{ width: "100%" }}>
          <Flex
            justify='space-between'
            align={isMobile ? "stretch" : "center"}
            gap={12}
            wrap='wrap'
            style={{ flexDirection: isMobile ? "column" : "row" }}
          >
            <Space orientation='vertical' size={4} style={{ minWidth: 0 }}>
              <Text type='secondary'>Analisis Bloom</Text>
              <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
                Distribusi Ketepatan Berdasarkan Level Kognitif
              </Title>
              <Text type='secondary'>
                Lihat level Bloom mana yang paling mudah, paling sulit, dan soal mana yang perlu ditinjau ulang.
              </Text>
            </Space>
            <Tag
              color='blue'
              icon={<BrainCircuit size={12} />}
              style={{ margin: 0, borderRadius: 999 }}
            >
              {data?.total_students || 0} peserta dianalisis
            </Tag>
          </Flex>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(4, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            {[
              {
                label: "Total Soal",
                value: aggregateStats.totalQuestions,
                color: "#1d4ed8",
                icon: <BrainCircuit size={18} />,
              },
              {
                label: "Jawaban Benar",
                value: aggregateStats.correct,
                color: "#15803d",
                icon: <CheckCircle2 size={18} />,
              },
              {
                label: "Jawaban Salah",
                value: aggregateStats.incorrect,
                color: "#dc2626",
                icon: <XCircle size={18} />,
              },
              {
                label: "Pending Review",
                value: aggregateStats.pending,
                color: "#d97706",
                icon: <Clock3 size={18} />,
              },
            ].map((item) => (
              <Card
                key={item.label}
                variant='borderless'
                style={metricCardStyle}
                styles={{ body: { padding: 16 } }}
              >
                <Flex align='center' justify='space-between' gap={12}>
                  <Space orientation='vertical' size={4}>
                    <Text type='secondary'>{item.label}</Text>
                    <Title level={4} style={{ margin: 0, color: item.color }}>
                      {item.value}
                    </Title>
                  </Space>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#fff",
                      color: item.color,
                    }}
                  >
                    {item.icon}
                  </div>
                </Flex>
              </Card>
            ))}
          </div>

          <Input
            allowClear
            prefix={<Search size={14} />}
            placeholder='Cari teks soal atau level Bloom'
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            style={{ width: isMobile ? "100%" : 320, maxWidth: "100%" }}
          />

          {bloomSummary.length === 0 && !isLoading ? (
            <Empty
              description='Belum ada data analitik Bloom untuk ujian ini.'
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <Space orientation='vertical' size={18} style={{ width: "100%" }}>
              <div
                style={{
                  borderRadius: 18,
                  border: "1px solid rgba(148, 163, 184, 0.14)",
                  overflow: "hidden",
                }}
              >
                <Table
                  rowKey={(record) => `${record.bloom_level ?? "none"}-${record.bloom_label}`}
                  columns={summaryColumns}
                  dataSource={bloomSummary}
                  loading={isLoading}
                  pagination={false}
                  size={isMobile ? "small" : "middle"}
                  scroll={isMobile ? { x: 980 } : undefined}
                />
              </div>

              <div
                style={{
                  borderRadius: 18,
                  border: "1px solid rgba(148, 163, 184, 0.14)",
                  overflow: "hidden",
                }}
              >
                <Table
                  rowKey='id'
                  columns={questionColumns}
                  dataSource={perQuestion}
                  loading={isLoading}
                  pagination={{ pageSize: 8, showSizeChanger: false }}
                  size={isMobile ? "small" : "middle"}
                  scroll={isMobile ? { x: 1180 } : undefined}
                />
              </div>
            </Space>
          )}
        </Space>
      </Card>
    </MotionDiv>
  );
};

export default BloomAnalysis;
