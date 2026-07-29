import React, { useMemo, useState } from "react";
import { Card, Empty, Space, Tabs, message } from "antd";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Gauge,
  ShieldCheck,
  Target,
} from "lucide-react";
import ItemAnalysisHeader from "./ItemAnalysisHeader";
import ItemAnalysisInsight from "./ItemAnalysisInsight";
import ItemAnalysisMetrics from "./ItemAnalysisMetrics";
import ItemAnalysisQuestionTable from "./ItemAnalysisQuestionTable";
import {
  exportItemAnalysisExcel,
  formatIndex,
  normalizeQuestionText,
} from "./itemAnalysisUtils";

const MotionDiv = motion.div;

const itemTabsCss = `
  .cbt-item-tabs .ant-tabs-nav {
    margin-bottom: 20px;
  }
  .cbt-item-tabs .ant-tabs-nav::before {
    border-bottom-color: rgba(148, 163, 184, 0.22);
  }
  .cbt-item-tabs .ant-tabs-tab {
    padding: 0 0 12px;
    margin: 0 24px 0 0;
    color: #64748b;
    font-weight: 600;
  }
  .cbt-item-tabs .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn {
    color: #2563eb;
  }
  .cbt-item-tabs .ant-tabs-ink-bar {
    background: #2563eb;
    height: 3px !important;
    border-radius: 999px;
  }
  .cbt-item-tabs.is-mobile .ant-tabs-nav {
    margin-bottom: 14px;
  }
  .cbt-item-tabs.is-mobile .ant-tabs-tab {
    margin: 0 10px 0 0;
    font-size: 13px;
  }
`;

const ItemAnalysis = ({
  data,
  examName,
  includeEssay = false,
  isLoading = false,
  isMobile = false,
  onIncludeEssayChange,
}) => {
  const [searchText, setSearchText] = useState("");
  const [showRejectedOnly, setShowRejectedOnly] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const summary = data?.summary || {};
  const questions = useMemo(() => data?.per_question || [], [data]);

  const filteredQuestions = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    return questions.filter((item) => {
      if (showRejectedOnly && !item.recommendation_actionable) return false;
      if (!query) return true;
      const questionText = normalizeQuestionText(item.question).toLowerCase();
      const typeText = String(item.type_label || "").toLowerCase();
      const recoText = String(item.recommendation_label || "").toLowerCase();
      return (
        questionText.includes(query) ||
        typeText.includes(query) ||
        recoText.includes(query)
      );
    });
  }, [questions, searchText, showRejectedOnly]);

  const rejectedQuestions = useMemo(
    () => questions.filter((item) => item.recommendation_actionable),
    [questions],
  );

  const handleExportExcel = async () => {
    if (!questions.length) {
      message.warning("Belum ada data analisa untuk diekspor.");
      return;
    }

    setIsExporting(true);
    try {
      await exportItemAnalysisExcel({ data, examName });
      message.success("File Excel analisa soal berhasil diunduh.");
    } catch (error) {
      console.error(error);
      message.error("Gagal mengekspor analisa soal ke Excel.");
    } finally {
      setIsExporting(false);
    }
  };

  const alphaColor =
    summary.cronbach_alpha_key === "good"
      ? "#15803d"
      : summary.cronbach_alpha_key === "fair"
        ? "#2563eb"
        : summary.cronbach_alpha_key === "low"
          ? "#dc2626"
          : "#64748b";

  const metricItems = [
    {
      label: "Cronbach's Alpha",
      shortLabel: "Alpha",
      value:
        summary.cronbach_alpha === null || summary.cronbach_alpha === undefined
          ? "-"
          : formatIndex(summary.cronbach_alpha),
      suffix: summary.cronbach_alpha_label || "",
      color: alphaColor,
      icon: <ShieldCheck size={isMobile ? 16 : 18} />,
    },
    {
      label: "Rata-rata Kesukaran",
      shortLabel: "Kesukaran",
      value: formatIndex(summary.average_difficulty),
      suffix: "P",
      color: "#0f766e",
      icon: <Gauge size={isMobile ? 16 : 18} />,
    },
    {
      label: "Rata-rata Daya Beda",
      shortLabel: "Daya Beda",
      value: formatIndex(summary.average_point_biserial),
      suffix: "rpb",
      color: "#1d4ed8",
      icon: <Target size={isMobile ? 16 : 18} />,
    },
    {
      label: "Tidak Disarankan",
      shortLabel: "Tolak",
      value: summary.reject_count ?? 0,
      suffix: "soal",
      color: "#dc2626",
      icon: <AlertTriangle size={isMobile ? 16 : 18} />,
    },
  ];

  const tabItems = [
    {
      key: "all",
      label: "Semua Soal",
      children: (
        <ItemAnalysisQuestionTable
          isLoading={isLoading}
          isMobile={isMobile}
          perQuestion={filteredQuestions}
          title={
            showRejectedOnly
              ? "Soal Tidak Disarankan (Filter Aktif)"
              : "Analisis Per Soal"
          }
        />
      ),
    },
    {
      key: "rejected",
      label: isMobile
        ? `Tolak (${rejectedQuestions.length})`
        : `Tidak Disarankan (${rejectedQuestions.length})`,
      children: (
        <ItemAnalysisQuestionTable
          isLoading={isLoading}
          isMobile={isMobile}
          perQuestion={rejectedQuestions}
          title='Soal yang Tidak Disarankan Dipakai Ulang'
        />
      ),
    },
  ];

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ width: "100%", minWidth: 0 }}
    >
      <style>{itemTabsCss}</style>
      <Card
        variant='borderless'
        style={{
          borderRadius: isMobile ? 18 : 24,
          boxShadow: "0 18px 36px rgba(15, 23, 42, 0.06)",
          overflow: "hidden",
        }}
        styles={{ body: { padding: isMobile ? 14 : 20 } }}
      >
        <Space
          direction='vertical'
          size={isMobile ? 14 : 18}
          style={{ width: "100%" }}
        >
          <ItemAnalysisHeader
            data={data}
            includeEssay={includeEssay}
            isExporting={isExporting}
            isMobile={isMobile}
            onExportExcel={handleExportExcel}
            onIncludeEssayChange={onIncludeEssayChange}
            searchText={searchText}
            setSearchText={setSearchText}
            showRejectedOnly={showRejectedOnly}
            setShowRejectedOnly={setShowRejectedOnly}
          />

          <ItemAnalysisMetrics isMobile={isMobile} metricItems={metricItems} />

          <ItemAnalysisInsight
            data={data}
            isMobile={isMobile}
            summary={summary}
          />

          {questions.length === 0 && !isLoading ? (
            <Empty
              description='Belum ada data analisa butir untuk ujian ini.'
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <Tabs
              className={`cbt-item-tabs${isMobile ? " is-mobile" : ""}`}
              defaultActiveKey='all'
              items={tabItems}
              size={isMobile ? "small" : "middle"}
              tabBarGutter={isMobile ? 8 : 16}
            />
          )}
        </Space>
      </Card>
    </MotionDiv>
  );
};

export default ItemAnalysis;
