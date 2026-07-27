import React from "react";
import { Flex, Space, Tag, Typography } from "antd";
import { AlertTriangle } from "lucide-react";
import { formatIndex } from "./itemAnalysisUtils";

const { Text } = Typography;

const ItemAnalysisInsight = ({ data, isMobile, summary }) => {
  const rejectCount = Number(summary?.reject_count || 0);
  const alpha = summary?.cronbach_alpha;
  const alphaLabel = summary?.cronbach_alpha_label || "Tidak dihitung";

  return (
    <div
      style={{
        borderRadius: 18,
        background: "#f8fafc",
        border: "1px solid rgba(148, 163, 184, 0.18)",
        padding: isMobile ? 14 : 16,
      }}
    >
      <Flex
        align={isMobile ? "stretch" : "center"}
        justify='space-between'
        gap={12}
        wrap='wrap'
        style={{ flexDirection: isMobile ? "column" : "row" }}
      >
        <Space direction='vertical' size={4} style={{ maxWidth: 820 }}>
          <Text strong>Ringkasan Guru</Text>
          <Text type='secondary'>
            Reliabilitas paket soal (Cronbach&apos;s Alpha){" "}
            {alpha === null || alpha === undefined
              ? "belum dapat dihitung"
              : `${formatIndex(alpha)} (${alphaLabel.toLowerCase()})`}
            . Rata-rata kesukaran {formatIndex(summary?.average_difficulty)}{" "}
            dengan rata-rata point-biserial{" "}
            {formatIndex(summary?.average_point_biserial)} dan indeks D{" "}
            {formatIndex(summary?.average_discrimination_index)}.
            {rejectCount > 0
              ? ` Terdapat ${rejectCount} soal yang tidak disarankan untuk dipakai ulang.`
              : " Semua soal yang dianalisis masih dalam kategori layak dipertahankan."}
          </Text>
        </Space>
        <Space size={[6, 6]} wrap>
          <Tag color='blue' style={{ margin: 0, borderRadius: 999 }}>
            Soal dianalisis: {data?.analyzed_questions || 0}
          </Tag>
          {rejectCount > 0 ? (
            <Tag
              color='red'
              icon={<AlertTriangle size={12} />}
              style={{ margin: 0, borderRadius: 999 }}
            >
              Tidak layak: {rejectCount}
            </Tag>
          ) : (
            <Tag color='green' style={{ margin: 0, borderRadius: 999 }}>
              Tidak ada soal bermasalah
            </Tag>
          )}
        </Space>
      </Flex>
    </div>
  );
};

export default ItemAnalysisInsight;
