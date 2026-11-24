import React from "react";
import { Card, Flex, Space, Table, Tag, Typography } from "antd";
import { BloomProgress, BloomTag } from "./BloomPrimitives";
import {
  getMasteryMeta,
  getTeachingFocus,
  sectionStyle,
} from "./bloomUtils";
import { museColors, museRadius } from "../../../../../../config/theme";

const { Text } = Typography;

const MobileSummaryCards = ({ bloomSummary, isLoading }) => (
  <Space direction='vertical' size={10} style={{ width: "100%" }}>
    {(bloomSummary || []).map((record) => {
      const meta = getMasteryMeta(record.correct_percentage);
      return (
        <Card
          key={`${record.bloom_level ?? "none"}-${record.bloom_label}`}
          loading={isLoading}
          size='small'
          style={{
            borderRadius: museRadius.item,
            border: `1px solid ${museColors.divider}`,
          }}
          styles={{ body: { padding: 14 } }}
        >
          <Space direction='vertical' size={10} style={{ width: "100%" }}>
            <Flex justify='space-between' align='flex-start' gap={8} wrap='wrap'>
              <BloomTag record={record} />
              <Tag color={meta.color} style={{ margin: 0, borderRadius: 999 }}>
                {meta.label}
              </Tag>
            </Flex>
            <BloomProgress value={record.correct_percentage} strokeColor={museColors.primary} />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 8,
              }}
            >
              {[
                { label: "Soal", value: record.total_questions },
                { label: "Benar", value: record.correct_count, color: museColors.success },
                { label: "Salah", value: record.incorrect_count, color: museColors.danger },
                { label: "Kosong", value: record.unanswered_count },
                { label: "Pending", value: record.pending_review_count },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 12,
                    background: museColors.bgSoft,
                    border: `1px solid ${museColors.divider}`,
                  }}
                >
                  <Text type='secondary' style={{ fontSize: 11, display: "block" }}>
                    {item.label}
                  </Text>
                  <Text strong style={{ color: item.color }}>
                    {item.value}
                  </Text>
                </div>
              ))}
            </div>
            <Text type='secondary' style={{ fontSize: 12 }}>
              {getTeachingFocus(record.correct_percentage)}
            </Text>
          </Space>
        </Card>
      );
    })}
  </Space>
);

const BloomSummaryTable = ({ bloomSummary, isLoading, isMobile }) => {
  const columns = [
    {
      title: "Bloom Level",
      dataIndex: "bloom_label",
      key: "bloom_label",
      width: 220,
      render: (_, record) => <BloomTag record={record} />,
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
      render: (value) => <Text style={{ color: museColors.success }}>{value}</Text>,
    },
    {
      title: "Salah",
      dataIndex: "incorrect_count",
      key: "incorrect_count",
      width: 100,
      align: "center",
      render: (value) => <Text style={{ color: museColors.danger }}>{value}</Text>,
    },
    {
      title: "Kosong",
      dataIndex: "unanswered_count",
      key: "unanswered_count",
      width: 100,
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
      render: (value) => <BloomProgress value={value} strokeColor={museColors.primary} />,
    },
    {
      title: "Interpretasi",
      key: "interpretation",
      width: 170,
      render: (_, record) => {
        const meta = getMasteryMeta(record.correct_percentage);
        return (
          <Tag color={meta.color} style={{ margin: 0, borderRadius: 999 }}>
            {meta.label}
          </Tag>
        );
      },
    },
    {
      title: "Arah Tindak Lanjut",
      key: "follow_up",
      width: 210,
      render: (_, record) => (
        <Text style={{ color: museColors.muted }}>
          {getTeachingFocus(record.correct_percentage)}
        </Text>
      ),
    },
  ];

  return (
    <Space direction='vertical' size={8} style={{ width: "100%", minWidth: 0 }}>
      <Text strong>{isMobile ? "Ringkasan Bloom" : "Ringkasan Level Bloom"}</Text>
      {isMobile ? (
        <MobileSummaryCards bloomSummary={bloomSummary} isLoading={isLoading} />
      ) : (
        <div style={sectionStyle}>
          <Table
            rowKey={(record) =>
              `${record.bloom_level ?? "none"}-${record.bloom_label}`
            }
            columns={columns}
            dataSource={bloomSummary}
            loading={isLoading}
            pagination={false}
            size='middle'
            scroll={{ x: 1380 }}
          />
        </div>
      )}
    </Space>
  );
};

export default BloomSummaryTable;
