import React, { Suspense, lazy } from "react";
import { Card, DatePicker, Grid, Select, Space, Typography } from "antd";
import dayjs from "dayjs";
import { Filter } from "lucide-react";
import LoadApp from "../../../../../../components/loader/LoadApp";

const StudentGradingTableSikap = lazy(
  () => import("./StudentGradingTableSikap"),
);
const StudentGradingTableFormatif = lazy(
  () => import("./StudentGradingTableFormatif"),
);
const StudentGradingTableSumatif = lazy(
  () => import("./StudentGradingTableSumatif"),
);
const StudentGradingTableUjianAkhir = lazy(
  () => import("./StudentGradingTableUjianAkhir"),
);

const { Text } = Typography;
const { useBreakpoint } = Grid;

const StudentGradingTable = ({
  students,
  chapters,
  classes,
  classId,
  typeKey,
  filters,
  onFilterChange,
  onClassChange,
  onStudentChange,
  onFormativeChange,
  formativeSubchapters,
  onDeleteFormativeColumn,
  onSummativeChange,
  summativeSubchapters,
  onDeleteSummativeColumn,
  onAttitudeChange,
  period,
  isAttitudeLoading = false,
  isFormativeLoading = false,
  isSummativeLoading = false,
  isFinalLoading = false,
  showFilters = true,
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const usesMonthFilter = typeKey === "sikap";
  const usesSemesterFilter = typeKey === "ujianAkhir";
  const classOptions = (classes || []).map((item) => ({
    value: item.id,
    label: item.name,
  }));

  const monthValue = filters?.monthId
    ? dayjs(filters.monthId, "YYYY-MM", true)
    : null;
  const periodStartMonth = period?.start ? dayjs(period.start).startOf("month") : null;
  const periodEndMonth = period?.end ? dayjs(period.end).endOf("month") : null;
  const derivedSemester = (() => {
    if (typeKey === "ujianAkhir") {
      return Number(filters?.semesterId) || 1;
    }
    if (!monthValue || !monthValue.isValid()) return null;
    return monthValue.month() + 1 >= 7 ? 1 : 2;
  })();
  const semesterOptions = [
    { value: 1, label: "Semester 1" },
    { value: 2, label: "Semester 2" },
  ];

  const isFilterReady =
    typeKey === "ujianAkhir"
      ? !!filters?.semesterId
      : typeKey === "formatif"
        ? !!(filters?.monthId && filters?.chapterId)
        : typeKey === "sumatif"
          ? !!filters?.monthId
          : !!filters?.monthId;
  const selectedChapter = (chapters || []).find(
    (chapter) => String(chapter.id) === String(filters?.chapterId),
  );
  const newColumnMeta = {
    createdAt: filters?.date,
    chapterTitle: selectedChapter?.title || null,
  };

  const renderContent = () => {
    if (typeKey === "sikap") {
      return (
        <StudentGradingTableSikap
          students={students}
          isMobile={isMobile}
          isFilterReady={isFilterReady}
          isLoading={isAttitudeLoading}
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
          isLoading={isFormativeLoading}
          onStudentChange={onStudentChange}
          onFormativeChange={onFormativeChange}
          subchapters={formativeSubchapters}
          onDeleteColumn={onDeleteFormativeColumn}
          newColumnMeta={newColumnMeta}
        />
      );
    }
    if (typeKey === "sumatif") {
      return (
        <StudentGradingTableSumatif
          students={students}
          isMobile={isMobile}
          isFilterReady={isFilterReady}
          isLoading={isSummativeLoading}
          onSummativeChange={onSummativeChange}
          subchapters={summativeSubchapters}
          onDeleteColumn={onDeleteSummativeColumn}
          newColumnMeta={newColumnMeta}
        />
      );
    }
    return (
        <StudentGradingTableUjianAkhir
          students={students}
          isMobile={isMobile}
          isFilterReady={isFilterReady}
          isLoading={isFinalLoading}
          onStudentChange={onStudentChange}
        />
      );
  };

  return (
    <Space vertical size={16} style={{ width: "100%" }}>
      {showFilters && (
        <Card
          size='small'
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
                  : typeKey === "ujianAkhir" || typeKey === "sikap"
                    ? "minmax(160px, 240px) repeat(2, minmax(160px, 1fr))"
                    : "minmax(160px, 240px) minmax(160px, 1fr)",
              }}
            >
              <Space align='center' size={8}>
                <Filter size={16} />
                <Text strong>Filter Penilaian</Text>
              </Space>
              <Select
                value={classId}
                placeholder='Pilih kelas'
                options={classOptions}
                onChange={onClassChange}
                disabled={!classOptions.length}
                style={{ width: "100%" }}
              />
              {usesMonthFilter && (
                <DatePicker
                  value={monthValue}
                  picker='month'
                  allowClear
                  placeholder='Pilih bulan'
                  disabledDate={(current) => {
                    if (!current || !periodStartMonth || !periodEndMonth) {
                      return false;
                    }
                    return (
                      current.isBefore(periodStartMonth, "month") ||
                      current.isAfter(periodEndMonth, "month")
                    );
                  }}
                  onChange={(value) =>
                    onFilterChange(
                      typeKey,
                      "monthId",
                      value ? value.format("YYYY-MM") : undefined,
                    )
                  }
                  style={{ width: "100%" }}
                />
              )}
              {usesSemesterFilter && (
                <Select
                  value={filters?.semesterId}
                  placeholder='Pilih semester'
                  options={semesterOptions}
                  onChange={(value) =>
                    onFilterChange(typeKey, "semesterId", value)
                  }
                  style={{ width: "100%" }}
                />
              )}
            </div>
            {typeKey === "sikap" && !isFilterReady && (
              <Text type='secondary'>Bulan wajib dipilih.</Text>
            )}
            {typeKey === "ujianAkhir" && !isFilterReady && (
              <Text type='secondary'>Semester wajib dipilih.</Text>
            )}
            {typeKey === "formatif" && (
              <Text type='secondary'>
                {isFilterReady
                  ? `Kolom Input Nilai aktif${
                      selectedChapter ? ` untuk ${selectedChapter.title}` : ""
                    }. Isi nilai baru lalu simpan.`
                  : "Nilai yang ada bisa langsung diedit. Klik Tambah Nilai untuk memilih tanggal dan bab, lalu isi kolom Input Nilai."}
              </Text>
            )}
            {typeKey === "sumatif" && (
              <Text type='secondary'>
                {isFilterReady
                  ? `Kolom Input Nilai aktif${
                      selectedChapter ? ` untuk ${selectedChapter.title}` : ""
                    }. Isi nilai baru lalu simpan.`
                  : "Nilai yang ada bisa langsung diedit. Klik Tambah Nilai untuk memilih tanggal dan bab, lalu isi kolom Input Nilai."}
              </Text>
            )}
            {isFilterReady && typeKey === "sikap" && derivedSemester && (
              <Text type='secondary'>
                {`Filter aktif menggunakan Semester ${derivedSemester}.`}
              </Text>
            )}
            {isFilterReady && typeKey === "ujianAkhir" && (
              <Text type='secondary'>
                {`Filter aktif menggunakan Semester ${Number(filters?.semesterId) || 1}.`}
              </Text>
            )}
          </Space>
        </Card>
      )}

      <Suspense fallback={<LoadApp />}>{renderContent()}</Suspense>
    </Space>
  );
};

export default StudentGradingTable;
