import React from "react";
import { Card, Flex, Space, Table, Tag, Tooltip, Typography } from "antd";
import { Info } from "lucide-react";
import {
  difficultyColorMap,
  discriminationColorMap,
  formatIndex,
  formatPercent,
  normalizeQuestionText,
  recommendationColorMap,
  sectionStyle,
} from "./itemAnalysisUtils";

const { Text } = Typography;

const POINT_BISERIAL_HELP =
  "Point-biserial (rpb) mengukur korelasi antara benar/salah pada soal ini dengan skor total siswa (tanpa soal tersebut). Semakin tinggi nilainya, semakin baik soal membedakan siswa berkemampuan tinggi dan rendah. Acuan: ≥0.40 baik, 0.20–0.39 cukup, <0.20 lemah, negatif bermasalah.";

const INDEX_D_HELP =
  "Indeks diskriminasi D membandingkan proporsi jawaban benar kelompok 27% skor tertinggi vs 27% skor terendah. D = P_atas − P_bawah. Acuan: ≥0.40 baik, 0.20–0.39 cukup, <0.20 lemah, negatif bermasalah.";

const HeaderWithHelp = ({ label, help }) => (
  <Flex align='center' justify='center' gap={4} wrap='nowrap'>
    <span>{label}</span>
    <Tooltip title={help} placement='top'>
      <Info
        size={13}
        style={{ color: "#64748b", cursor: "help", flexShrink: 0 }}
        aria-label={`Penjelasan ${label}`}
      />
    </Tooltip>
  </Flex>
);

const MetricCell = ({ value, label, colorKey, colorMap }) => (
  <Space direction='vertical' size={2} style={{ width: "100%" }}>
    <Text strong style={{ fontSize: 13 }}>
      {formatIndex(value)}
    </Text>
    <Tag
      color={colorMap[colorKey] || "default"}
      style={{ margin: 0, borderRadius: 999, maxWidth: "100%" }}
    >
      {label}
    </Tag>
  </Space>
);

const QuestionCell = ({ value, record, compact = false }) => {
  const text = normalizeQuestionText(value);
  const limit = compact ? 90 : 120;
  const shortText = text.length > limit ? `${text.slice(0, limit)}...` : text;

  return (
    <Space direction='vertical' size={2} style={{ width: "100%", minWidth: 0 }}>
      <Tooltip title={text}>
        <Text
          style={{
            display: "block",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: compact ? "nowrap" : "normal",
            wordBreak: "break-word",
          }}
        >
          {shortText || "-"}
        </Text>
      </Tooltip>
      <Text type='secondary' style={{ fontSize: 12 }}>
        {record.type_label || "-"}
        {" · "}
        <span style={{ color: "#15803d" }}>{record.correct_count} benar</span>
        {" / "}
        <span style={{ color: "#dc2626" }}>{record.incorrect_count} salah</span>
      </Text>
    </Space>
  );
};

const RecommendationCell = ({ record, compact = false }) => (
  <Space direction='vertical' size={4} style={{ width: "100%", minWidth: 0 }}>
    <Tag
      color={recommendationColorMap[record.recommendation_key] || "default"}
      style={{ margin: 0, borderRadius: 999, whiteSpace: "normal" }}
    >
      {record.recommendation_label}
    </Tag>
    {!compact && (record.recommendation_reasons || []).length > 0 ? (
      <Tooltip
        title={
          <Space direction='vertical' size={4}>
            {(record.recommendation_reasons || []).map((reason) => (
              <span key={reason}>{reason}</span>
            ))}
          </Space>
        }
      >
        <Text type='secondary' style={{ fontSize: 12, cursor: "help" }}>
          {(record.recommendation_reasons || [])[0]}
          {(record.recommendation_reasons || []).length > 1 ? "…" : ""}
        </Text>
      </Tooltip>
    ) : null}
  </Space>
);

const MobileQuestionCards = ({ isLoading, perQuestion }) => {
  if (!isLoading && (!perQuestion || perQuestion.length === 0)) {
    return (
      <div style={{ ...sectionStyle, padding: 16 }}>
        <Text type='secondary'>Tidak ada data soal.</Text>
      </div>
    );
  }

  return (
    <Space direction='vertical' size={10} style={{ width: "100%" }}>
      {(perQuestion || []).map((record) => (
        <Card
          key={record.id}
          loading={isLoading}
          size='small'
          style={{
            borderRadius: 16,
            border: "1px solid rgba(148, 163, 184, 0.18)",
          }}
          styles={{ body: { padding: 14 } }}
        >
          <Space direction='vertical' size={12} style={{ width: "100%" }}>
            <Flex justify='space-between' align='flex-start' gap={8}>
              <Text strong>Soal {record.no}</Text>
              <RecommendationCell record={record} compact />
            </Flex>

            <QuestionCell value={record.question} record={record} />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <div>
                <Text type='secondary' style={{ fontSize: 11 }}>
                  Kesukaran (P)
                </Text>
                <MetricCell
                  value={record.difficulty_index}
                  label={`${record.difficulty_label} (${formatPercent(record.difficulty_percent)})`}
                  colorKey={record.difficulty_key}
                  colorMap={difficultyColorMap}
                />
              </div>
              <div>
                <Flex align='center' gap={4}>
                  <Text type='secondary' style={{ fontSize: 11 }}>
                    Point-biserial
                  </Text>
                  <Tooltip title={POINT_BISERIAL_HELP}>
                    <Info size={12} style={{ color: "#64748b", cursor: "help" }} />
                  </Tooltip>
                </Flex>
                <MetricCell
                  value={record.point_biserial}
                  label={record.point_biserial_label}
                  colorKey={record.point_biserial_key}
                  colorMap={discriminationColorMap}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <Flex align='center' gap={4}>
                  <Text type='secondary' style={{ fontSize: 11 }}>
                    Indeks D (27%)
                  </Text>
                  <Tooltip title={INDEX_D_HELP}>
                    <Info size={12} style={{ color: "#64748b", cursor: "help" }} />
                  </Tooltip>
                </Flex>
                <MetricCell
                  value={record.discrimination_index}
                  label={record.discrimination_label}
                  colorKey={record.discrimination_key}
                  colorMap={discriminationColorMap}
                />
              </div>
            </div>
          </Space>
        </Card>
      ))}
    </Space>
  );
};

const ItemAnalysisQuestionTable = ({
  isLoading,
  isMobile,
  perQuestion,
  title = "Analisis Per Soal",
}) => {
  const columns = [
    {
      title: "No",
      dataIndex: "no",
      key: "no",
      width: "6%",
      align: "center",
    },
    {
      title: "Soal",
      dataIndex: "question",
      key: "question",
      width: "28%",
      render: (value, record) => <QuestionCell value={value} record={record} />,
    },
    {
      title: "Kesukaran (P)",
      key: "difficulty",
      width: "14%",
      align: "center",
      render: (_, record) => (
        <MetricCell
          value={record.difficulty_index}
          label={record.difficulty_label}
          colorKey={record.difficulty_key}
          colorMap={difficultyColorMap}
        />
      ),
    },
    {
      title: (
        <HeaderWithHelp label='Point-biserial' help={POINT_BISERIAL_HELP} />
      ),
      key: "point_biserial",
      width: "15%",
      align: "center",
      render: (_, record) => (
        <MetricCell
          value={record.point_biserial}
          label={record.point_biserial_label}
          colorKey={record.point_biserial_key}
          colorMap={discriminationColorMap}
        />
      ),
    },
    {
      title: <HeaderWithHelp label='Indeks D' help={INDEX_D_HELP} />,
      key: "discrimination",
      width: "13%",
      align: "center",
      render: (_, record) => (
        <MetricCell
          value={record.discrimination_index}
          label={record.discrimination_label}
          colorKey={record.discrimination_key}
          colorMap={discriminationColorMap}
        />
      ),
    },
    {
      title: "Rekomendasi",
      key: "recommendation",
      width: "24%",
      render: (_, record) => <RecommendationCell record={record} />,
    },
  ];

  return (
    <Space direction='vertical' size={8} style={{ width: "100%" }}>
          <Text strong style={{ wordBreak: "break-word" }}>
            {isMobile && title.length > 36 ? `${title.slice(0, 36)}…` : title}
          </Text>
      {isMobile ? (
        <MobileQuestionCards isLoading={isLoading} perQuestion={perQuestion} />
      ) : (
        <div style={{ ...sectionStyle, width: "100%", overflow: "hidden" }}>
          <Table
            rowKey='id'
            columns={columns}
            dataSource={perQuestion}
            loading={isLoading}
            pagination={{ pageSize: 8, showSizeChanger: false }}
            size='middle'
            tableLayout='fixed'
            style={{ width: "100%" }}
          />
        </div>
      )}
    </Space>
  );
};

export default ItemAnalysisQuestionTable;
