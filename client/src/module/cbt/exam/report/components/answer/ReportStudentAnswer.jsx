import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Empty,
  Flex,
  Grid,
  Input,
  Pagination,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Download,
  FileSpreadsheet,
  ListChecks,
  MoveUpRight,
  Search,
  Users,
  XCircle,
} from "lucide-react";
import * as XLSX from "xlsx";
import { useSearchParams } from "react-router-dom";
import { useGetExamStudentAnswerReportQuery } from "../../../../../../service/cbt/ApiExam";

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const STATUS_META = {
  correct: {
    label: "Benar",
    color: "green",
    textColor: "#15803d",
    icon: <CheckCircle2 size={12} />,
  },
  incorrect: {
    label: "Salah",
    color: "red",
    textColor: "#dc2626",
    icon: <XCircle size={12} />,
  },
  unanswered: {
    label: "Kosong",
    color: "default",
    textColor: "#64748b",
    icon: <CircleDashed size={12} />,
  },
  pending_review: {
    label: "Pending",
    color: "gold",
    textColor: "#d97706",
    icon: <Clock3 size={12} />,
  },
};

const stripHtml = (value = "") =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const truncateText = (value, maxLength = 28) => {
  const text = stripHtml(value);
  if (text.length <= maxLength) return text || "-";
  return `${text.slice(0, maxLength - 3)}...`;
};

const sanitizeFileName = (value = "laporan-jawaban-siswa") =>
  String(value || "laporan-jawaban-siswa")
    .replace(/[/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replaceAll(" ", "-")
    .toLowerCase() || "laporan-jawaban-siswa";

const getAnswerCell = (student, questionId) =>
  student?.answers_by_question?.[questionId] ||
  student?.answers_by_question?.[String(questionId)] ||
  null;

const getStatusLabel = (status) =>
  STATUS_META[status]?.label || STATUS_META.unanswered.label;

const createSheetFromAoA = (rows, widths = []) => {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!cols"] = widths.map((wch) => ({ wch }));
  return worksheet;
};

const clickableNameStyle = {
  cursor: "pointer",
  color: "#1d4ed8",
};

const slugifyParam = (value = "-") =>
  String(value || "-")
    .trim()
    .replace(/\s+/g, "-");

const ReportStudentAnswer = ({
  examId,
  examName,
  isMobile: forcedMobile = false,
}) => {
  const screens = useBreakpoint();
  const isMobile = forcedMobile || !screens.md;
  const [, setSearchParams] = useSearchParams();
  const [classFilter, setClassFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [matrixPage, setMatrixPage] = useState(1);
  const [matrixPageSize, setMatrixPageSize] = useState(10);

  const {
    data: report = {},
    isLoading,
    isFetching,
  } = useGetExamStudentAnswerReportQuery(
    { exam_id: examId },
    { skip: !examId },
  );

  const questions = useMemo(() => report.questions || [], [report.questions]);
  const students = useMemo(() => report.students || [], [report.students]);
  const classes = useMemo(() => report.classes || [], [report.classes]);
  const tableLoading = isLoading || isFetching;

  const classOptions = useMemo(() => {
    if (classes.length > 0) {
      return classes.map((item) => ({
        value: String(item.id),
        label: `${item.name || "-"} (${item.total_students || 0})`,
      }));
    }

    return [
      ...students
        .reduce((acc, student) => {
          const key = String(student.class_id || student.class_name || "");
          if (!key || acc.has(key)) return acc;
          acc.set(key, {
            value: key,
            label: student.class_name || "-",
          });
          return acc;
        }, new Map())
        .values(),
    ];
  }, [classes, students]);

  const filteredStudents = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return students.filter((student) => {
      const classValue = String(student.class_id || student.class_name || "");
      const matchClass =
        classFilter === "all" ? true : classValue === classFilter;
      const matchSearch = query
        ? `${student.nis || ""} ${student.name || ""} ${student.class_name || ""}`
            .toLowerCase()
            .includes(query)
        : true;
      return matchClass && matchSearch;
    });
  }, [classFilter, searchText, students]);

  useEffect(() => {
    setMatrixPage(1);
  }, [classFilter, searchText]);

  const summary = useMemo(() => {
    if (filteredStudents.length === 0) {
      return {
        totalStudents: 0,
        totalQuestions: questions.length,
        averageScore: 0,
        pendingReview: 0,
      };
    }

    const totalScore = filteredStudents.reduce(
      (sum, student) => sum + Number(student.score || 0),
      0,
    );
    const pendingReview = filteredStudents.reduce(
      (sum, student) => sum + Number(student.pending_review_count || 0),
      0,
    );

    return {
      totalStudents: filteredStudents.length,
      totalQuestions: questions.length,
      averageScore: Number((totalScore / filteredStudents.length).toFixed(2)),
      pendingReview,
    };
  }, [filteredStudents, questions.length]);

  const matrixRows = useMemo(() => {
    const keyRow = {
      id: "answer-key",
      row_type: "key",
      no: "",
      nis: "",
      name: "Kunci Jawaban",
      class_name: "",
    };
    const startIndex = (matrixPage - 1) * matrixPageSize;
    const paginatedStudents = filteredStudents.slice(
      startIndex,
      startIndex + matrixPageSize,
    );

    return [
      keyRow,
      ...paginatedStudents.map((student, index) => ({
        ...student,
        row_type: "student",
        no: startIndex + index + 1,
      })),
    ];
  }, [filteredStudents, matrixPage, matrixPageSize]);

  useEffect(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(filteredStudents.length / matrixPageSize),
    );

    if (matrixPage > totalPages) {
      setMatrixPage(totalPages);
    }
  }, [filteredStudents.length, matrixPage, matrixPageSize]);

  const metricItems = [
    {
      label: "Peserta",
      value: summary.totalStudents,
      color: "#1d4ed8",
      icon: <Users size={18} />,
    },
    {
      label: "Total Soal",
      value: summary.totalQuestions,
      color: "#0f766e",
      icon: <ListChecks size={18} />,
    },
    {
      label: "Rata-rata",
      value: summary.averageScore,
      color: "#d97706",
      icon: <FileSpreadsheet size={18} />,
    },
    {
      label: "Pending Review",
      value: summary.pendingReview,
      color: "#b45309",
      icon: <Clock3 size={18} />,
    },
  ];

  const handleOpenStudentAnswers = (student) => {
    if (!student?.id || !examId) return;

    setSearchParams({
      view: "student_answers",
      exam_id: String(examId),
      exam_name: slugifyParam(examName),
      student_id: String(student.id),
      student_name: slugifyParam(student.name),
      student_class: slugifyParam(student.class_name),
      student_nis: String(student.nis || "-"),
      return_tab: "student-answer-report",
    });
  };

  const renderAnswerCell = (question, record) => {
    if (record.row_type === "key") {
      const display = question.key?.display || "-";
      const detail = question.key?.detail || display;

      return (
        <Tooltip title={detail}>
          <Tag
            color='blue'
            style={{
              margin: 0,
              maxWidth: 118,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {truncateText(display, 22)}
          </Tag>
        </Tooltip>
      );
    }

    const cell = getAnswerCell(record, question.id);
    const statusMeta = STATUS_META[cell?.status] || STATUS_META.unanswered;
    const display = cell?.answer || "-";
    const detail = cell?.detail || display;

    return (
      <Tooltip
        title={
          <Space vertical size={2}>
            <Text style={{ color: "#fff" }}>{detail || "-"}</Text>
            <Text style={{ color: "rgba(255,255,255,0.78)", fontSize: 12 }}>
              {statusMeta.label} - Skor {cell?.score ?? 0}
            </Text>
          </Space>
        }
      >
        <Tag
          color={statusMeta.color}
          icon={statusMeta.icon}
          style={{
            margin: 0,
            maxWidth: 118,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {truncateText(display, 22)}
        </Tag>
      </Tooltip>
    );
  };

  const matrixColumns = useMemo(() => {
    const questionColumns = questions.map((question) => ({
      title: (
        <Tooltip
          title={`${question.type_label || "-"} | ${question.question || "-"}`}
        >
          <span>{question.no}</span>
        </Tooltip>
      ),
      key: `question-${question.id}`,
      width: 120,
      align: "center",
      render: (_, record) => renderAnswerCell(question, record),
    }));

    return [
      {
        title: "No",
        dataIndex: "no",
        key: "no",
        width: 64,
        fixed: isMobile ? undefined : "left",
        align: "center",
        render: (value, record) => (record.row_type === "key" ? "" : value),
      },
      {
        title: "Siswa",
        key: "student",
        width: 200,
        fixed: isMobile ? undefined : "left",
        render: (_, record) => {
          if (record.row_type === "key") {
            return <Text strong>{record.name}</Text>;
          }

          return (
            <Flex justify='space-between' align='center' gap={10}>
              <Space vertical size={0} style={{ minWidth: 0 }}>
                <Text
                  strong
                  ellipsis
                  style={{ ...clickableNameStyle, maxWidth: 210 }}
                  onClick={() => handleOpenStudentAnswers(record)}
                >
                  {record.name || "-"}{" "}
                  <span>
                    <MoveUpRight size={10} />
                  </span>
                </Text>
                <Text type='secondary' style={{ fontSize: 12 }}>
                  {record.nis || "-"} - {record.class_name || "-"}
                </Text>
              </Space>
            </Flex>
          );
        },
      },
      {
        title: "Analisis Jawaban Siswa",
        children: questionColumns,
      },
      {
        title: "Benar",
        dataIndex: "correct_count",
        key: "correct_count",
        width: 90,
        align: "center",
        render: (value, record) =>
          record.row_type === "key" ? null : (
            <Text style={{ color: STATUS_META.correct.textColor }}>
              {value || 0}
            </Text>
          ),
      },
      {
        title: "Salah",
        dataIndex: "incorrect_count",
        key: "incorrect_count",
        width: 90,
        align: "center",
        render: (value, record) =>
          record.row_type === "key" ? null : (
            <Text style={{ color: STATUS_META.incorrect.textColor }}>
              {value || 0}
            </Text>
          ),
      },
      {
        title: "Kosong",
        dataIndex: "unanswered_count",
        key: "unanswered_count",
        width: 90,
        align: "center",
        render: (value, record) =>
          record.row_type === "key" ? null : value || 0,
      },
      {
        title: "Pending",
        dataIndex: "pending_review_count",
        key: "pending_review_count",
        width: 100,
        align: "center",
        render: (value, record) =>
          record.row_type === "key" ? null : (
            <Text style={{ color: STATUS_META.pending_review.textColor }}>
              {value || 0}
            </Text>
          ),
      },
      {
        title: "Nilai Akhir",
        dataIndex: "score",
        key: "score",
        width: 110,
        align: "center",
        render: (value, record) =>
          record.row_type === "key" ? null : (
            <Tag
              color={Number(value || 0) >= 75 ? "green" : "orange"}
              style={{ margin: 0, borderRadius: 999, fontWeight: 700 }}
            >
              {value || 0}
            </Tag>
          ),
      },
    ];
  }, [isMobile, questions]);

  const questionColumns = [
    {
      title: "No",
      dataIndex: "no",
      width: 64,
      align: "center",
    },
    {
      title: "Tipe",
      dataIndex: "type_label",
      width: 180,
      render: (value) => (
        <Tag color='blue' style={{ margin: 0, borderRadius: 999 }}>
          {value || "-"}
        </Tag>
      ),
    },
    {
      title: "Bloom",
      dataIndex: "bloom_label",
      width: 160,
      render: (value) => value || "-",
    },
    {
      title: "Poin",
      dataIndex: "max_points",
      width: 90,
      align: "center",
    },
    {
      title: "Soal",
      dataIndex: "question",
      width: 420,
      render: (value) => (
        <Tooltip title={value || "-"}>
          <Text>{truncateText(value, 120)}</Text>
        </Tooltip>
      ),
    },
    {
      title: "Kunci Jawaban",
      dataIndex: "key",
      width: 320,
      render: (value) => (
        <Tooltip title={value?.detail || value?.display || "-"}>
          <Text>{truncateText(value?.display, 100)}</Text>
        </Tooltip>
      ),
    },
  ];

  const exportExcel = () => {
    if (!questions.length) {
      message.warning("Belum ada soal untuk diekspor");
      return;
    }

    const workbook = XLSX.utils.book_new();
    const preHeaders = ["No", "NIS", "Nama Siswa", "Kelas"];
    const resultHeaders = [
      "Benar",
      "Salah",
      "Kosong",
      "Pending",
      "Nilai Akhir",
    ];
    const questionCount = questions.length;
    const analysisStart = preHeaders.length;
    const resultStart = analysisStart + questionCount;
    const matrixRowsForExport = [
      [
        ...preHeaders,
        "Analisis Jawaban Siswa",
        ...Array(Math.max(questionCount - 1, 0)).fill(null),
        ...resultHeaders,
      ],
      [
        ...preHeaders.map(() => null),
        ...questions.map((question) => question.no),
        ...resultHeaders.map(() => null),
      ],
      [
        ...preHeaders.map(() => null),
        ...questions.map((question) => question.key?.display || "-"),
        ...resultHeaders.map(() => null),
      ],
      ...filteredStudents.map((student, index) => [
        index + 1,
        student.nis || "-",
        student.name || "-",
        student.class_name || "-",
        ...questions.map(
          (question) => getAnswerCell(student, question.id)?.answer || "-",
        ),
        student.correct_count || 0,
        student.incorrect_count || 0,
        student.unanswered_count || 0,
        student.pending_review_count || 0,
        student.score || 0,
      ]),
    ];

    const matrixSheet = createSheetFromAoA(matrixRowsForExport, [
      5,
      14,
      30,
      18,
      ...questions.map(() => 14),
      10,
      10,
      10,
      10,
      12,
    ]);

    matrixSheet["!merges"] = [
      ...preHeaders.map((_, index) => ({
        s: { r: 0, c: index },
        e: { r: 2, c: index },
      })),
      ...(questionCount > 0
        ? [
            {
              s: { r: 0, c: analysisStart },
              e: { r: 0, c: analysisStart + questionCount - 1 },
            },
          ]
        : []),
      ...resultHeaders.map((_, index) => ({
        s: { r: 0, c: resultStart + index },
        e: { r: 1, c: resultStart + index },
      })),
    ];

    XLSX.utils.book_append_sheet(workbook, matrixSheet, "Analisis Jawaban");

    const questionRows = [
      [
        "No",
        "Tipe Soal",
        "Bloom Level",
        "Poin",
        "Soal",
        "Kunci Jawaban",
        "Opsi / Pasangan",
      ],
      ...questions.map((question) => [
        question.no,
        question.type_label || "-",
        question.bloom_label || "-",
        question.max_points || 0,
        question.question || "-",
        question.key?.detail || question.key?.display || "-",
        (question.options || [])
          .map((option) => option.full || option.content)
          .join("\n") || "-",
      ]),
    ];
    const questionSheet = createSheetFromAoA(
      questionRows,
      [5, 22, 18, 8, 60, 42, 50],
    );
    XLSX.utils.book_append_sheet(workbook, questionSheet, "Daftar Soal");

    const detailRows = [
      [
        "No",
        "NIS",
        "Nama Siswa",
        "Kelas",
        "No Soal",
        "Tipe Soal",
        "Soal",
        "Kunci Jawaban",
        "Jawaban Siswa",
        "Status",
        "Skor",
      ],
    ];

    filteredStudents.forEach((student, studentIndex) => {
      questions.forEach((question) => {
        const cell = getAnswerCell(student, question.id);
        detailRows.push([
          studentIndex + 1,
          student.nis || "-",
          student.name || "-",
          student.class_name || "-",
          question.no,
          question.type_label || "-",
          question.question || "-",
          question.key?.detail || question.key?.display || "-",
          cell?.detail || cell?.answer || "-",
          getStatusLabel(cell?.status),
          cell?.score ?? 0,
        ]);
      });
    });

    const detailSheet = createSheetFromAoA(
      detailRows,
      [5, 14, 30, 18, 8, 22, 60, 42, 42, 12, 8],
    );
    XLSX.utils.book_append_sheet(workbook, detailSheet, "Jawaban Detail");

    const fileName = `${sanitizeFileName(
      examName || report.exam?.name || "laporan-jawaban-siswa",
    )}-jawaban-siswa.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const matrixScrollX = Math.max(980, 64 + 280 + questions.length * 120 + 480);
  const matrixStart = filteredStudents.length
    ? (matrixPage - 1) * matrixPageSize + 1
    : 0;
  const matrixEnd = Math.min(
    matrixPage * matrixPageSize,
    filteredStudents.length,
  );

  const tabItems = [
    {
      key: "matrix",
      label: "Matriks Jawaban",
      children: (
        <div
          style={{
            borderRadius: 18,
            border: "1px solid rgba(148, 163, 184, 0.14)",
            overflow: "hidden",
          }}
        >
          <Table
            rowKey={(record) =>
              record.row_type === "key" ? "answer-key" : record.id
            }
            columns={matrixColumns}
            dataSource={matrixRows}
            loading={tableLoading}
            pagination={false}
            size={isMobile ? "small" : "middle"}
            sticky
            scroll={{ x: matrixScrollX }}
            rowClassName={(record) =>
              record.row_type === "key" ? "cbt-answer-key-row" : ""
            }
          />
          <Flex
            justify='space-between'
            align={isMobile ? "stretch" : "center"}
            gap={12}
            wrap='wrap'
            style={{
              padding: isMobile ? 12 : "12px 16px",
              borderTop: "1px solid rgba(148, 163, 184, 0.14)",
              flexDirection: isMobile ? "column" : "row",
            }}
          >
            <Text type='secondary'>
              {matrixStart}-{matrixEnd} dari {filteredStudents.length} peserta
            </Text>
            <Pagination
              current={matrixPage}
              pageSize={matrixPageSize}
              total={filteredStudents.length}
              onChange={(page, pageSize) => {
                setMatrixPage(page);
                setMatrixPageSize(pageSize);
              }}
              showSizeChanger
              pageSizeOptions={["10", "20", "50", "100"]}
              responsive
            />
          </Flex>
        </div>
      ),
    },
    {
      key: "questions",
      label: "Daftar Soal",
      children: (
        <div
          style={{
            borderRadius: 18,
            border: "1px solid rgba(148, 163, 184, 0.14)",
            overflow: "hidden",
          }}
        >
          <Table
            rowKey='id'
            columns={questionColumns}
            dataSource={questions}
            loading={tableLoading}
            pagination={{ pageSize: 8, showSizeChanger: false }}
            size={isMobile ? "small" : "middle"}
            scroll={{ x: 1240 }}
          />
        </div>
      ),
    },
  ];

  return (
    <MotionDiv initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <Card
        variant='borderless'
        style={{
          borderRadius: 24,
          boxShadow: "0 18px 36px rgba(15, 23, 42, 0.06)",
        }}
        styles={{ body: { padding: isMobile ? 16 : 20 } }}
      >
        <Space vertical size={18} style={{ width: "100%" }}>
          <Flex
            justify='space-between'
            align={isMobile ? "stretch" : "center"}
            wrap='wrap'
            gap={12}
            style={{ flexDirection: isMobile ? "column" : "row" }}
          >
            <Space vertical size={4} style={{ minWidth: 0 }}>
              <Text type='secondary'>Analisis Jawaban</Text>
              <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
                Laporan Jawaban Siswa
              </Title>
              <Text type='secondary'>
                {report.exam?.subject_name || "Mapel"} -{" "}
                {report.exam?.grade_name || "-"}
              </Text>
            </Space>
            <Button
              icon={<Download size={14} />}
              onClick={exportExcel}
              disabled={tableLoading || questions.length === 0}
              block={isMobile}
            >
              Download Excel
            </Button>
          </Flex>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile
                ? "1fr"
                : "repeat(4, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            {metricItems.map((item) => (
              <Card
                key={item.label}
                variant='borderless'
                style={{
                  borderRadius: 18,
                  background: "#f8fafc",
                  border: "1px solid rgba(148, 163, 184, 0.14)",
                }}
                styles={{ body: { padding: 16 } }}
              >
                <Flex align='center' justify='space-between' gap={12}>
                  <Space vertical size={4}>
                    <Text type='secondary'>{item.label}</Text>
                    <Title level={4} style={{ margin: 0, color: item.color }}>
                      {item.value}
                    </Title>
                  </Space>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 14,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#fff",
                      color: item.color,
                    }}
                  >
                    {item.icon}
                  </div>
                </Flex>
              </Card>
            ))}
          </div>

          <Flex
            justify='space-between'
            align={isMobile ? "stretch" : "center"}
            wrap='wrap'
            gap={12}
            style={{ flexDirection: isMobile ? "column" : "row" }}
          >
            <Space
              wrap
              style={{
                width: isMobile ? "100%" : "auto",
                flexDirection: isMobile ? "column" : "row",
                alignItems: isMobile ? "stretch" : "center",
              }}
            >
              <Input
                allowClear
                prefix={<Search size={14} />}
                placeholder='Cari nama / NIS / kelas'
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                style={{ width: isMobile ? "100%" : 280, maxWidth: "100%" }}
              />
              <Select
                value={classFilter}
                onChange={setClassFilter}
                style={{ width: isMobile ? "100%" : 220, maxWidth: "100%" }}
                options={[
                  { value: "all", label: "Semua Kelas" },
                  ...classOptions,
                ]}
                virtual={false}
              />
            </Space>
            <Tag
              color='blue'
              icon={<FileSpreadsheet size={12} />}
              style={{ margin: 0, borderRadius: 999 }}
            >
              {filteredStudents.length} peserta tampil
            </Tag>
          </Flex>

          {!tableLoading && questions.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description='Belum ada soal untuk laporan ini.'
            />
          ) : (
            <Tabs
              defaultActiveKey='matrix'
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

export default ReportStudentAnswer;
