import React from "react";
import { Card, DatePicker, Grid, Select, Space, Typography } from "antd";
import dayjs from "dayjs";
import { Filter } from "lucide-react";
import StudentGradingTableSikap from "./StudentGradingTableSikap";
import StudentGradingTableFormatif from "./StudentGradingTableFormatif";
import StudentGradingTableSumatif from "./StudentGradingTableSumatif";
import StudentGradingTableUjianAkhir from "./StudentGradingTableUjianAkhir";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const StudentGradingTable = ({
  students,
  chapters,
  typeKey,
  filters,
  onFilterChange,
  onStudentChange,
  onFormativeChange,
  formativeSubchapters,
  onSummativeChange,
  summativeSubchapters,
  onAttitudeChange,
  showFilters = true,
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.sm;

  const chapterOptions = (chapters || []).map((chapter) => ({
    value: chapter.id,
    label: chapter.title,
  }));

  const monthValue = filters?.monthId
    ? dayjs(filters.monthId, "YYYY-MM", true)
    : null;

  const isFilterReady =
    typeKey === "ujianAkhir"
      ? true
      : !!filters?.monthId && (typeKey === "sikap" || !!filters?.chapterId);

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
          onFormativeChange={onFormativeChange}
          subchapters={formativeSubchapters}
        />
      );
    }
    if (typeKey === "sumatif") {
      return (
        <StudentGradingTableSumatif
          students={students}
          isMobile={isMobile}
          isFilterReady={isFilterReady}
          onSummativeChange={onSummativeChange}
          subchapters={summativeSubchapters}
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
    <Space vertical size={16} style={{ width: "100%" }}>
      {showFilters && (
        <Card
          size="small"
          style={{ borderRadius: 12, border: "1px solid #f0f0f0" }}
          styles={{ body: { padding: 12 } }}
        >
          <Space vertical size={8} style={{ width: "100%" }}>
            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : typeKey === "sikap"
                    ? "minmax(160px, 240px) minmax(160px, 1fr)"
                  : "minmax(160px, 240px) repeat(2, minmax(160px, 1fr))",
              }}
            >
              <Space align="center" size={8}>
                <Filter size={16} />
                <Text strong>Filter Penilaian</Text>
              </Space>
              <DatePicker
                value={monthValue}
                picker="month"
                allowClear
                placeholder="Pilih bulan"
                onChange={(value) =>
                  onFilterChange(
                    typeKey,
                    "monthId",
                    value ? value.format("YYYY-MM") : undefined,
                  )
                }
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
                </>
              )}
            </div>
            {!isFilterReady && (
              <Text type="secondary">
                {typeKey === "sikap"
                  ? "Bulan wajib dipilih."
                  : "Bulan wajib dipilih, bab wajib dipilih."}
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
