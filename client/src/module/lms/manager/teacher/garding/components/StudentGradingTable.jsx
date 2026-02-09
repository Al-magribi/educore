import React from "react";
import { Card, Grid, Select, Space, Typography } from "antd";
import { Filter } from "lucide-react";
import StudentGradingTableSikap from "./StudentGradingTableSikap";
import StudentGradingTableFormatif from "./StudentGradingTableFormatif";
import StudentGradingTableSumatif from "./StudentGradingTableSumatif";
import StudentGradingTableUjianAkhir from "./StudentGradingTableUjianAkhir";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const MONTHS_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const StudentGradingTable = ({
  students,
  chapters,
  typeKey,
  filters,
  onFilterChange,
  onStudentChange,
  onAttitudeChange,
  monthYear,
  showFilters = true,
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.sm;

  const chapterOptions = (chapters || []).map((chapter) => ({
    value: chapter.id,
    label: chapter.title,
  }));

  const getSubchapterOptions = (chapterId) => {
    const chapter = (chapters || []).find((item) => item.id === chapterId);
    return (chapter?.contents || []).map((content) => ({
      value: content.id,
      label: content.title,
    }));
  };

  const monthOptions = MONTHS_ID.map((month) => ({
    value: month,
    label: monthYear ? `${month} ${monthYear}` : month,
  }));

  const isFilterReady =
    !!filters?.monthId && (typeKey === "sikap" || !!filters?.chapterId);

  const renderContent = () => {
    if (typeKey === "sikap") {
      return (
        <StudentGradingTableSikap
          students={students}
          isMobile={isMobile}
          isFilterReady={isFilterReady}
          onAttitudeChange={onAttitudeChange}
        />
      );
    }
    if (typeKey === "formatif") {
      return (
        <StudentGradingTableFormatif
          students={students}
          isMobile={isMobile}
          isFilterReady={isFilterReady}
          onStudentChange={onStudentChange}
        />
      );
    }
    if (typeKey === "sumatif") {
      return (
        <StudentGradingTableSumatif
          students={students}
          isMobile={isMobile}
          isFilterReady={isFilterReady}
          onStudentChange={onStudentChange}
        />
      );
    }
    return (
      <StudentGradingTableUjianAkhir
        students={students}
        isMobile={isMobile}
        isFilterReady={isFilterReady}
        onStudentChange={onStudentChange}
      />
    );
  };

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      {showFilters && (
        <Card
          size="small"
          style={{ borderRadius: 12, border: "1px solid #f0f0f0" }}
          styles={{ body: { padding: 12 } }}
        >
          <Space direction="vertical" size={8} style={{ width: "100%" }}>
            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : typeKey === "sikap"
                    ? "minmax(160px, 240px) minmax(160px, 1fr)"
                    : "minmax(160px, 240px) repeat(3, minmax(160px, 1fr))",
              }}
            >
              <Space align="center" size={8}>
                <Filter size={16} />
                <Text strong>Filter Penilaian</Text>
              </Space>
              <Select
                value={filters?.monthId}
                allowClear
                placeholder="Pilih bulan"
                options={monthOptions}
                onChange={(value) => onFilterChange(typeKey, "monthId", value)}
                style={{ width: "100%" }}
              />
              {typeKey !== "sikap" && (
                <>
                  <Select
                    value={filters?.chapterId}
                    allowClear
                    placeholder="Pilih bab"
                    options={chapterOptions}
                    onChange={(value) =>
                      onFilterChange(typeKey, "chapterId", value)
                    }
                    style={{ width: "100%" }}
                  />
                  <Select
                    value={filters?.subchapterId}
                    allowClear
                    placeholder="Subbab (opsional)"
                    options={getSubchapterOptions(filters?.chapterId)}
                    onChange={(value) =>
                      onFilterChange(typeKey, "subchapterId", value)
                    }
                    disabled={!filters?.chapterId}
                    style={{ width: "100%" }}
                  />
                </>
              )}
            </div>
            {!isFilterReady && (
              <Text type="secondary">
                {typeKey === "sikap"
                  ? "Bulan wajib dipilih."
                  : "Bulan wajib dipilih, bab wajib dipilih (subbab opsional)."}
              </Text>
            )}
          </Space>
        </Card>
      )}

      {renderContent()}
    </Space>
  );
};

export default StudentGradingTable;
