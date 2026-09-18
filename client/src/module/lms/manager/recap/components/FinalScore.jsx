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
  Typography,
} from "antd";
import { Download, Filter, RefreshCcw, Users } from "lucide-react";
import { useGetFinalScoreRecapQuery } from "../../../../../service/lms/ApiRecap";
import {
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

const buildExcelRows = (rows) =>
  rows.map((row) => ({
    No: row.no,
    NIS: row.nis,
    "Nama Siswa": row.full_name,
    "Nilai Akhir": row.final_grade ?? "-",
  }));

const FinalScore = ({
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
  } = useGetFinalScoreRecapQuery(
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
  const students = recapData?.students || [];

  const rows = useMemo(
    () =>
      students.map((item, index) => ({
        key: item.student_id,
        no: index + 1,
        nis: item.nis || "-",
        full_name: item.full_name,
        final_grade:
          item.final_grade === null || item.final_grade === undefined
            ? null
            : Number(item.final_grade),
      })),
    [students],
  );

  const columns = useMemo(
    () => [
      {
        title: "No",
        dataIndex: "no",
        width: 64,
        align: "center",
      },
      {
        title: "NIS",
        dataIndex: "nis",
        width: 130,
      },
      {
        title: "Nama Siswa",
        dataIndex: "full_name",
        ellipsis: true,
        render: (value) => <Text strong>{value}</Text>,
      },
      {
        title: "Nilai Akhir",
        dataIndex: "final_grade",
        width: 140,
        align: "center",
        render: (value) =>
          value === null || value === undefined ? (
            "-"
          ) : (
            <Tag color='blue'>{round2(value)}</Tag>
          ),
      },
    ],
    [],
  );

  const handleDownloadExcel = () => {
    if (!rows.length) return;
    const sheetRows = buildExcelRows(rows);
    const sheet = XLSX.utils.json_to_sheet(sheetRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Rekap Nilai Akhir");

    const selectedClassName =
      classes.find((item) => String(item.id) === String(classId))?.name ||
      "Kelas";
    const safeName =
      `Rekap_Nilai_Akhir_${selectedClassName}_Semester${semester}`.replace(
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
        row.final_grade === null ? (
          <Tag style={{ margin: 0 }}>Belum dinilai</Tag>
        ) : (
          <Tag color='blue' style={{ margin: 0 }}>
            {round2(row.final_grade)}
          </Tag>
        )
      }
    />
  );

  return (
    <Flex vertical gap={16} style={{ width: "100%", minWidth: 0 }}>
      <Card style={surfaceCardStyle} styles={surfaceCardBody(isMobile)}>
        <RecapSectionHeader
          isMobile={isMobile}
          title='Rekapitulasi Nilai Akhir'
          description='Rekap nilai akhir siswa dalam satu semester'
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
                virtual={false}
                allowClear
                showSearch={{ optionFilterProp: "label" }}
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
              key: "average",
              color: "cyan",
              label: `Avg Nilai Akhir: ${round2(summary.final_average)}`,
            },
            {
              key: "graded",
              color: "purple",
              label: `Sudah Dinilai: ${summary.total_graded || 0}`,
            },
          ]}
        />
      </Card>

      {!classId ? (
        <Alert
          type='info'
          showIcon
          title='Pilih kelas untuk menampilkan rekap nilai akhir.'
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
          emptyText='Belum ada data nilai akhir pada filter ini.'
          renderItem={renderMobileCard}
          pageSize={12}
        />
      ) : (
        <Card style={tableCardStyle} styles={tableCardBody}>
          {!isFetching && !rows.length ? (
            <div style={{ padding: 24 }}>
              <Empty description='Belum ada data nilai akhir pada filter ini.' />
            </div>
          ) : (
            <Table
              rowKey='key'
              dataSource={rows}
              columns={columns}
              loading={isFetching}
              pagination={false}
              size={activeScreens.lg ? "middle" : "small"}
              tableLayout='fixed'
              scroll={{ x: 680 }}
              sticky
            />
          )}
        </Card>
      )}
    </Flex>
  );
};

export default FinalScore;
