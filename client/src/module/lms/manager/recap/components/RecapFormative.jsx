import React, { useMemo } from "react";
import * as XLSX from "xlsx";
import {
  Alert,
  Button,
  Card,
  Empty,
  Flex,
  Select,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { Download, Filter, RefreshCcw, Users } from "lucide-react";
import { useGetScoreMonthlyRecapQuery } from "../../../../../service/lms/ApiRecap";
import {
  DetailSection,
  KeyValueRows,
  RecapMobileList,
  RecapSectionHeader,
  RecapStatTags,
  RecapToolbar,
  RecordCard,
} from "./recapShared";
import {
  actionButtonStyle,
  filterControlStyle,
  surfaceCardBody,
  surfaceCardStyle,
  tableCardBody,
  tableCardStyle,
  useRecapLayout,
} from "./recapStyles";

const { Text } = Typography;

const round2 = (value) => Math.round(Number(value || 0) * 100) / 100;

const getFormativeScore = (record, monthKey, slotKey, index) => {
  const formativeValues = record.month_scores?.[monthKey]?.formative || [];
  const value = slotKey
    ? formativeValues.find((item) => item?.slot_key === slotKey)
    : formativeValues[index];
  return value && typeof value === "object" ? value.score : value;
};

const buildExcelRows = (rows, monthMatrix) =>
  rows.map((row) => {
    const entry = {
      No: row.no,
      NIS: row.nis,
      "Nama Siswa": row.full_name,
    };

    for (const monthMeta of monthMatrix) {
      const monthKey = String(monthMeta.month);
      const formativeCount = Math.max(
        1,
        Number(monthMeta.max_formative_entries || 0),
      );
      const monthEntries = monthMeta.entries || [];

      for (let index = 0; index < formativeCount; index += 1) {
        const chapterTitle = monthEntries[index]?.chapter_title || "-";
        const slotKey = monthEntries[index]?.slot_key;
        const scoreValue = getFormativeScore(row, monthKey, slotKey, index);
        entry[
          `${monthMeta.month_name} - Formatif Nilai ${index + 1} (${chapterTitle})`
        ] = scoreValue ?? "-";
      }
    }

    entry["Nilai Harian"] = round2(row.daily_average);
    return entry;
  });

const RecapFormative = ({
  isActive,
  subjectId,
  subject,
  activePeriode,
  classes,
  classLoading,
  classId,
  setClassId,
  semester,
  setSemester,
  isAdminView = false,
  teacherId,
  setTeacherId,
  teachers = [],
  teacherLoading = false,
  screens,
}) => {
  const { screens: activeScreens, isMobile } = useRecapLayout(screens);

  const {
    data: recapRes,
    isFetching,
    refetch,
  } = useGetScoreMonthlyRecapQuery(
    {
      subjectId,
      classId,
      semester,
      teacherId,
    },
    {
      skip:
        !isActive ||
        !subjectId ||
        !classId ||
        !semester ||
        (isAdminView && !teacherId),
    },
  );

  const recapData = recapRes?.data || {};
  const summary = recapData?.summary || {};
  const monthMatrix = recapData?.month_matrix || [];
  const students = recapData?.students || [];

  const rows = useMemo(
    () =>
      students.map((item, index) => ({
        key: item.student_id,
        no: index + 1,
        nis: item.nis || "-",
        full_name: item.full_name,
        month_scores: item.month_scores || {},
        daily_average: Number(item.daily_average || 0),
      })),
    [students],
  );

  /** Flattened month/slot layout reused by both the table and the mobile cards. */
  const monthSlots = useMemo(
    () =>
      monthMatrix.map((monthMeta) => {
        const monthKey = String(monthMeta.month);
        const formativeCount = Math.max(
          1,
          Number(monthMeta.max_formative_entries || 0),
        );
        const monthEntries = monthMeta.entries || [];

        return {
          monthKey,
          monthName: monthMeta.month_name,
          slots: Array.from({ length: formativeCount }, (_, index) => ({
            key: `${monthKey}-f-${index}`,
            label: `Nilai ${index + 1}`,
            chapterTitle: monthEntries[index]?.chapter_title || "-",
            slotKey: monthEntries[index]?.slot_key,
            index,
          })),
        };
      }),
    [monthMatrix],
  );

  const columns = useMemo(() => {
    const staticColumns = [
      {
        title: "No",
        dataIndex: "no",
        width: 64,
        align: "center",
        fixed: "left",
      },
      {
        title: "NIS",
        dataIndex: "nis",
        width: 120,
        fixed: "left",
      },
      {
        title: "Nama Siswa",
        dataIndex: "full_name",
        width: 220,
        fixed: "left",
        render: (value) => <Text strong>{value}</Text>,
      },
    ];

    const monthColumns = monthSlots.map((month) => ({
      title: month.monthName,
      key: `month-${month.monthKey}`,
      children: month.slots.map((slot) => ({
        title: (
          <Tooltip title={slot.chapterTitle}>
            <span>{slot.label}</span>
          </Tooltip>
        ),
        key: slot.key,
        width: 92,
        align: "center",
        render: (_, record) =>
          getFormativeScore(record, month.monthKey, slot.slotKey, slot.index) ??
          "-",
      })),
    }));

    const endColumns = [
      {
        title: "Nilai Harian",
        dataIndex: "daily_average",
        width: 128,
        align: "center",
        render: (value) => <Tag color='blue'>{round2(value)}</Tag>,
      },
    ];

    return [...staticColumns, ...monthColumns, ...endColumns];
  }, [monthSlots]);

  const handleDownloadExcel = () => {
    if (!rows.length) return;
    const sheetRows = buildExcelRows(rows, monthMatrix);
    const sheet = XLSX.utils.json_to_sheet(sheetRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Rekap Nilai Semester");

    const selectedClassName =
      classes.find((item) => String(item.id) === String(classId))?.name ||
      "Kelas";
    const safeName =
      `Rekap_Nilai_Semester_${selectedClassName}_Semester${semester}`.replace(
        /[\\/:*?"<>|]/g,
        "-",
      );

    XLSX.writeFile(workbook, `${safeName}.xlsx`);
  };

  const renderMobileCard = (row) => (
    <RecordCard
      index={row.no}
      title={row.full_name}
      subtitle={`NIS ${row.nis}`}
      extra={
        <Tag color='blue' style={{ margin: 0 }}>
          Harian {round2(row.daily_average)}
        </Tag>
      }
    >
      {monthSlots.length ? (
        <Flex vertical gap={12}>
          {monthSlots.map((month) => (
            <DetailSection key={month.monthKey} title={month.monthName}>
              <KeyValueRows
                items={month.slots.map((slot) => ({
                  key: slot.key,
                  label:
                    slot.chapterTitle && slot.chapterTitle !== "-"
                      ? `${slot.label} · ${slot.chapterTitle}`
                      : slot.label,
                  tooltip: slot.chapterTitle,
                  value:
                    getFormativeScore(
                      row,
                      month.monthKey,
                      slot.slotKey,
                      slot.index,
                    ) ?? "-",
                }))}
              />
            </DetailSection>
          ))}
        </Flex>
      ) : (
        <Text type='secondary' style={{ fontSize: 12 }}>
          Belum ada entri formatif pada semester ini.
        </Text>
      )}
    </RecordCard>
  );

  return (
    <Flex vertical gap={16} style={{ width: "100%", minWidth: 0 }}>
      <Card style={surfaceCardStyle} styles={surfaceCardBody(isMobile)}>
        <RecapSectionHeader
          isMobile={isMobile}
          title='Rekapitulasi Formatif'
          description='Rekap nilai formatif dalam satu semester'
          tags={
            <>
              <Tag color='blue' style={{ margin: 0 }}>
                {subject?.name || "Mata Pelajaran"}
              </Tag>
              <Tag color='processing' style={{ margin: 0 }}>
                {activePeriode?.name ||
                  recapData?.meta?.periode_name ||
                  "Periode"}
              </Tag>
            </>
          }
        />

        <RecapToolbar
          isMobile={isMobile}
          filters={
            <>
              <Select
                value={semester}
                onChange={setSemester}
                style={filterControlStyle(isMobile, 160)}
                options={[
                  { value: 1, label: "Semester 1" },
                  { value: 2, label: "Semester 2" },
                ]}
                suffixIcon={<Filter size={14} />}
              />
              {isAdminView && (
                <Select
                  value={teacherId}
                  onChange={setTeacherId}
                  style={filterControlStyle(isMobile, 220)}
                  placeholder='Pilih guru'
                  options={teachers.map((item) => ({
                    value: item.id,
                    label: item.full_name,
                  }))}
                  loading={teacherLoading}
                  virtual={false}
                  allowClear
                  showSearch={{ optionFilterProp: "label" }}
                />
              )}
              <Select
                value={classId}
                onChange={setClassId}
                style={filterControlStyle(isMobile, 220)}
                placeholder='Pilih kelas'
                options={classes.map((item) => ({
                  value: item.id,
                  label: item.name,
                }))}
                loading={classLoading}
                virtual={false}
                allowClear
                showSearch={{ optionFilterProp: "label" }}
              />
            </>
          }
          actions={
            <>
              <Button
                icon={<RefreshCcw size={14} />}
                onClick={refetch}
                style={actionButtonStyle(isMobile)}
              >
                Refresh
              </Button>
              <Button
                type='primary'
                icon={<Download size={14} />}
                disabled={!rows.length}
                onClick={handleDownloadExcel}
                style={actionButtonStyle(isMobile)}
              >
                {isMobile ? "Excel" : "Download Excel"}
              </Button>
            </>
          }
        />

        <RecapStatTags
          isMobile={isMobile}
          items={[
            {
              key: "students",
              color: "geekblue",
              icon: <Users size={12} />,
              label: `Total Siswa: ${recapData?.meta?.total_students || 0}`,
            },
            {
              key: "daily",
              color: "cyan",
              label: `Avg Nilai Harian: ${round2(summary.daily_average)}`,
            },
          ]}
        />
      </Card>

      {!classId ? (
        <Alert
          type='info'
          showIcon
          title='Pilih kelas untuk menampilkan rekap nilai.'
        />
      ) : isAdminView && !teacherId ? (
        <Alert
          type='info'
          showIcon
          title='Pilih guru pengampu untuk menampilkan data yang sesuai tampilan guru.'
        />
      ) : isMobile ? (
        <RecapMobileList
          dataSource={rows}
          loading={isFetching}
          emptyText='Belum ada data nilai pada filter ini.'
          renderItem={renderMobileCard}
        />
      ) : (
        <Card style={tableCardStyle} styles={tableCardBody}>
          {!isFetching && !rows.length ? (
            <div style={{ padding: 24 }}>
              <Empty description='Belum ada data nilai pada filter ini.' />
            </div>
          ) : (
            <Table
              rowKey='key'
              dataSource={rows}
              columns={columns}
              loading={isFetching}
              pagination={false}
              size={activeScreens.lg ? "middle" : "small"}
              scroll={{ x: 1600 }}
              sticky
            />
          )}
        </Card>
      )}
    </Flex>
  );
};

export default RecapFormative;
