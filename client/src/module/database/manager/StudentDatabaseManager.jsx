import React, { useMemo, useState } from "react";
import {
  Alert,
  App,
  Button,
  Empty,
  Flex,
  Grid,
  List,
  Pagination,
  Select,
  Table,
  Tooltip,
  Typography,
} from "antd";
import { DownloadOutlined, UploadOutlined } from "@ant-design/icons";
import { Database, Eye, Gauge, Lock, Pencil, UserRoundCheck, UserRoundX, Users } from "lucide-react";
import {
  useGetStudentDatabaseQuery,
  useGetStudentReferenceStudentsQuery,
  useLazyGetStudentDatabaseExportQuery,
  useUpdateStudentDatabaseMutation,
} from "../../../service/database/ApiDatabase";
import { StatCard } from "../../../components/ui/muse";
import { DataListCard } from "../../../components/ui/muse/DataSection";
import { museColors, museRadius } from "../../../config/theme";
import useDebounced from "../../../utils/useDebounced";
import DbForm from "../form/DbForm";
import StudentDetailDrawer from "../components/StudentDetailDrawer";
import { CompletionBar, CompletionTag, StudentAvatar } from "../components/StudentProfile";
import StudentImportDrawer from "./StudentImportDrawer";
import { exportStudentsToExcel } from "./studentImportTemplate";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const EMPTY_OPTIONS = [];

const StudentDatabaseManager = ({ scope = "all" }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { message } = App.useApp();
  const [searchText, setSearchText] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [detailStudent, setDetailStudent] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const debouncedSearch = useDebounced(searchText, 400);
  const isHomeroom = scope === "homeroom";

  const [updateStudentDatabase, { isLoading: isUpdating }] = useUpdateStudentDatabaseMutation();
  const [fetchStudentExport] = useLazyGetStudentDatabaseExportQuery();
  const { data: referenceData } = useGetStudentReferenceStudentsQuery({ scope });

  const query = useMemo(
    () => ({
      page,
      limit: pageSize,
      search: debouncedSearch,
      grade_id: gradeFilter,
      class_id: classFilter,
      scope,
    }),
    [page, pageSize, debouncedSearch, gradeFilter, classFilter, scope],
  );

  const { data, isLoading, isFetching, error } = useGetStudentDatabaseQuery(query);

  const summary = data?.summary || {};
  const totalData = data?.meta?.total_data || 0;
  const rows = data?.data || [];
  const teacherScope = data?.teacher_scope || { is_homeroom: true, classes: [] };
  const gradeOptions = data?.filters?.grades || EMPTY_OPTIONS;
  const classOptions = data?.filters?.classes || EMPTY_OPTIONS;
  const studentReferenceOptions = useMemo(() => referenceData?.data || [], [referenceData]);

  const filteredClassOptions = useMemo(() => {
    if (!gradeFilter) return classOptions;
    return classOptions.filter((item) => String(item.grade_id) === String(gradeFilter));
  }, [classOptions, gradeFilter]);

  const openEdit = (record) => {
    setDetailStudent(null);
    setSelectedStudent(record);
    setIsFormOpen(true);
  };

  const handleUpdate = async (values) => {
    if (!selectedStudent?.student_id) return;

    try {
      await updateStudentDatabase({ id: selectedStudent.student_id, ...values }).unwrap();
      message.success("Data siswa berhasil diperbarui");
      setIsFormOpen(false);
      setSelectedStudent(null);
    } catch (err) {
      message.error(err?.data?.message || "Gagal memperbarui data siswa");
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const result = await fetchStudentExport({
        search: debouncedSearch,
        grade_id: gradeFilter,
        class_id: classFilter,
        scope,
      }).unwrap();
      const students = result?.data || [];

      if (students.length === 0) {
        message.warning("Tidak ada data siswa untuk diekspor");
        return;
      }

      exportStudentsToExcel({ students });
      message.success(`${students.length} data siswa berhasil diekspor`);
    } catch (err) {
      message.error(err?.data?.message || "Gagal mengekspor data siswa");
    } finally {
      setIsExporting(false);
    }
  };

  const renderActions = (record) => (
    <Flex gap={4} justify='flex-end' onClick={(event) => event.stopPropagation()}>
      <Tooltip title='Lihat detail'>
        <Button
          type='text'
          aria-label={`Lihat detail ${record.full_name}`}
          icon={<Eye size={16} />}
          onClick={() => setDetailStudent(record)}
        />
      </Tooltip>
      <Tooltip title='Perbarui data'>
        <Button
          type='text'
          aria-label={`Perbarui data ${record.full_name}`}
          icon={<Pencil size={16} />}
          onClick={() => openEdit(record)}
        />
      </Tooltip>
    </Flex>
  );

  const columns = [
    {
      title: "NAMA SISWA",
      dataIndex: "full_name",
      key: "full_name",
      render: (value, record) => (
        <Flex align='center' gap={12}>
          <StudentAvatar gender={record.gender} />
          <div style={{ minWidth: 0 }}>
            <Text strong ellipsis style={{ display: "block", maxWidth: 260 }}>
              {value}
            </Text>
            <Text type='secondary' style={{ fontSize: 12 }}>
              NIS {record.nis || "-"}
              {record.nisn ? ` · NISN ${record.nisn}` : ""}
            </Text>
          </div>
        </Flex>
      ),
    },
    {
      title: "KELAS",
      key: "class",
      render: (_, record) => (
        <div>
          <Text strong style={{ display: "block" }}>
            {record.class_name || "-"}
          </Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            {record.grade_name || "Tingkat belum diatur"}
          </Text>
        </div>
      ),
    },
    {
      title: "STATUS",
      dataIndex: "completion_status",
      key: "completion_status",
      width: 130,
      render: (status) => <CompletionTag status={status} />,
    },
    {
      title: "KELENGKAPAN",
      dataIndex: "completion_percent",
      key: "completion_percent",
      width: 200,
      render: (value) => <CompletionBar percent={value || 0} />,
    },
    {
      title: "AKSI",
      key: "action",
      width: 110,
      align: "right",
      render: (_, record) => renderActions(record),
    },
  ];

  const handlePageChange = (nextPage, nextPageSize) => {
    if (nextPageSize !== pageSize) {
      setPageSize(nextPageSize);
      setPage(1);
      return;
    }
    setPage(nextPage);
  };

  const paginationProps = {
    current: page,
    pageSize,
    total: totalData,
    showSizeChanger: !isMobile,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    showLessItems: isMobile,
    size: isMobile ? "small" : "default",
    showTotal: isMobile ? undefined : (total, range) => `${range[0]}-${range[1]} dari ${total} siswa`,
    onChange: handlePageChange,
  };

  const emptyText = (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        debouncedSearch || gradeFilter || classFilter
          ? "Tidak ada siswa yang cocok. Ubah kata kunci atau filter."
          : "Belum ada data siswa pada periode aktif."
      }
    />
  );

  return (
    <>
      <Flex vertical gap={isMobile ? 16 : 24}>
        {isHomeroom && teacherScope?.is_homeroom === false ? (
          <Alert
            type='warning'
            showIcon
            title='Anda belum terdaftar sebagai wali kelas aktif'
            description='Data siswa tidak dapat dimuat karena akun guru belum memiliki kelas wali. Hubungi admin satuan.'
          />
        ) : null}

        <div
          style={{
            display: "grid",
            gap: isMobile ? 16 : 24,
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          }}
        >
          <StatCard
            title='Total Siswa'
            value={summary.total_students || 0}
            note={data?.active_periode?.name ? `Periode ${data.active_periode.name}` : "Periode aktif"}
            icon={<Users size={24} />}
          />
          <StatCard
            title='Data Lengkap'
            value={summary.complete_students || 0}
            suffix={`${summary.complete_percentage || 0}%`}
            icon={<UserRoundCheck size={24} />}
            tone='success'
          />
          <StatCard
            title='Belum Lengkap'
            value={summary.incomplete_students || 0}
            note='Perlu pembaruan data'
            icon={<UserRoundX size={24} />}
            tone='warning'
          />
          <StatCard
            title='Rata-rata Kelengkapan'
            value={summary.average_completion || 0}
            suffix='%'
            icon={<Gauge size={24} />}
            tone='purple'
          />
        </div>

        <DataListCard
          icon={<Database size={16} />}
          title='Daftar Siswa'
          count={totalData}
          unit='siswa'
          searchProps={{
            placeholder: "Cari nama, NIS, atau NISN",
            value: searchText,
            onChange: (event) => {
              setSearchText(event.target.value);
              setPage(1);
            },
          }}
          extra={
            <>
              <Button icon={<UploadOutlined />} onClick={() => setIsImportOpen(true)}>
                Import
              </Button>
              <Button icon={<DownloadOutlined />} onClick={handleExportExcel} loading={isExporting}>
                Export
              </Button>
            </>
          }
        >
          <Flex
            gap={12}
            wrap
            align='center'
            style={{
              padding: isMobile ? "0 16px 16px" : "0 24px 16px",
              borderBottom: `1px solid ${museColors.divider}`,
            }}
          >
            <Select
              allowClear
              aria-label='Filter tingkat'
              placeholder='Semua tingkat'
              style={{ width: isMobile ? "100%" : 200 }}
              value={gradeFilter || undefined}
              options={gradeOptions}
              onChange={(value) => {
                setGradeFilter(value || "");
                setClassFilter("");
                setPage(1);
              }}
            />
            <Select
              allowClear
              aria-label='Filter kelas'
              placeholder='Semua kelas'
              style={{ width: isMobile ? "100%" : 200 }}
              value={classFilter || undefined}
              options={filteredClassOptions}
              disabled={isHomeroom}
              suffixIcon={isHomeroom ? <Lock size={14} /> : undefined}
              onChange={(value) => {
                setClassFilter(value || "");
                setPage(1);
              }}
            />
            {isHomeroom ? (
              <Text type='secondary' style={{ fontSize: 12 }}>
                Kelas wali:{" "}
                {teacherScope.classes?.length
                  ? teacherScope.classes.map((item) => item.class_name).join(", ")
                  : "-"}
              </Text>
            ) : null}
          </Flex>

          {error ? (
            <div style={{ padding: isMobile ? 16 : 24 }}>
              <Alert
                type='error'
                showIcon
                title='Gagal memuat database siswa'
                description={error?.data?.message || "Coba muat ulang halaman."}
              />
            </div>
          ) : isMobile ? (
            <div style={{ padding: 16 }}>
              <List
                dataSource={rows}
                loading={isLoading || isFetching}
                locale={{ emptyText }}
                renderItem={(record) => (
                  <List.Item style={{ padding: 0, marginBottom: 12, border: 0 }}>
                    <div
                      role='button'
                      tabIndex={0}
                      onClick={() => setDetailStudent(record)}
                      onKeyDown={(event) => event.key === "Enter" && setDetailStudent(record)}
                      style={{
                        width: "100%",
                        padding: 16,
                        borderRadius: museRadius.card,
                        border: `1px solid ${museColors.divider}`,
                        cursor: "pointer",
                      }}
                    >
                      <Flex justify='space-between' align='start' gap={8}>
                        <Flex align='center' gap={12} style={{ minWidth: 0 }}>
                          <StudentAvatar gender={record.gender} size={36} />
                          <div style={{ minWidth: 0 }}>
                            <Text strong ellipsis style={{ display: "block" }}>
                              {record.full_name}
                            </Text>
                            <Text type='secondary' style={{ fontSize: 12 }}>
                              NIS {record.nis || "-"} · {record.class_name || "-"}
                            </Text>
                          </div>
                        </Flex>
                        {renderActions(record)}
                      </Flex>
                      <Flex align='center' gap={12} style={{ marginTop: 12 }}>
                        <CompletionTag status={record.completion_status} />
                        <div style={{ flex: 1 }}>
                          <CompletionBar percent={record.completion_percent || 0} />
                        </div>
                      </Flex>
                    </div>
                  </List.Item>
                )}
              />
              {totalData > pageSize ? (
                <Flex justify='center'>
                  <Pagination {...paginationProps} />
                </Flex>
              ) : null}
            </div>
          ) : (
            <Table
              rowKey='student_id'
              loading={isLoading || isFetching}
              dataSource={rows}
              columns={columns}
              scroll={{ x: 860 }}
              locale={{ emptyText }}
              onRow={(record) => ({
                onClick: () => setDetailStudent(record),
                style: { cursor: "pointer" },
              })}
              pagination={{ ...paginationProps, style: { padding: "0 24px" } }}
            />
          )}
        </DataListCard>
      </Flex>

      <StudentDetailDrawer
        open={Boolean(detailStudent)}
        student={detailStudent}
        onClose={() => setDetailStudent(null)}
        onEdit={openEdit}
      />

      <DbForm
        open={isFormOpen}
        student={selectedStudent}
        loading={isUpdating}
        onCancel={() => {
          setIsFormOpen(false);
          setSelectedStudent(null);
        }}
        onSubmit={handleUpdate}
      />

      <StudentImportDrawer
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        studentOptions={studentReferenceOptions}
        scope={scope}
      />
    </>
  );
};

export default StudentDatabaseManager;
