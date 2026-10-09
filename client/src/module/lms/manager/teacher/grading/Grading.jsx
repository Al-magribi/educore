import React, { Suspense, lazy, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Empty,
  Flex,
  Grid,
  Tabs,
  Tag,
  Typography,
  message,
  Upload,
  Modal,
} from "antd";
import { Download, Plus, RefreshCw, Save, Upload as UploadIcon } from "lucide-react";
import * as XLSX from "xlsx";
import dayjs from "dayjs";
import {
  buildFormatifSubchapters,
  extractSubIdFromType,
} from "./components/StudentGradingTableFormatif";
import {
  ExclamationCircleOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import {
  useGetGradingClassesQuery,
  useGetGradingMetaQuery,
  useGetGradingAttitudeQuery,
  useGetGradingFormativeQuery,
  useGetGradingSummativeQuery,
  useGetGradingFinalQuery,
  useGetGradingStudentsQuery,
  useSubmitGradingAttitudeMutation,
  useSubmitGradingFormativeMutation,
  useSubmitGradingSummativeMutation,
  useSubmitGradingFinalMutation,
  useDeleteGradingFinalMutation,
  useDeleteGradingFormativeColumnMutation,
  useDeleteGradingSummativeColumnMutation,
} from "../../../../../service/lms/ApiGrading";
import {
  useGetChaptersQuery,
  useGetContentsQuery,
} from "../../../../../service/lms/ApiLms";
import LoadApp from "../../../../../components/loader/LoadApp";

const GradingHeader = lazy(() => import("./components/GradingHeader"));
const StudentGradingTable = lazy(() =>
  import("./components/StudentGradingTable"),
);
const SyncFormativeFromExamModal = lazy(() =>
  import("./components/SyncFormativeFromExamModal"),
);
const ScoreContextModal = lazy(() =>
  import("./components/ScoreContextModal"),
);

const { useBreakpoint } = Grid;

const MONTH_NAMES = [
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

const TEMPLATE_GUIDE_SHEET_NAME = "Panduan";

const Grading = ({ subject }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isCompact = !screens.sm;
  const { data: metaRes } = useGetGradingMetaQuery();
  const homebase = metaRes?.data?.homebase || null;
  const activePeriode = metaRes?.data?.activePeriode || null;

  const unitOptions = useMemo(
    () =>
      homebase
        ? [{ id: homebase.id, name: homebase.name, level: homebase.level }]
        : [],
    [homebase],
  );
  const periodOptions = useMemo(
    () =>
      activePeriode
        ? [
            {
              id: activePeriode.id,
              name: activePeriode.name,
              start: activePeriode.start,
              end: activePeriode.end,
              isActive: true,
            },
          ]
        : [],
    [activePeriode],
  );
  const unitId = unitOptions[0]?.id;
  const periodId = periodOptions[0]?.id;

  const { data: classRes } = useGetGradingClassesQuery(
    { subjectId: subject?.id },
    { skip: !subject?.id },
  );
  const classes = classRes?.data || [];
  const [classId, setClassId] = useState(null);
  const [gradingTab, setGradingTab] = useState("sikap");

  useEffect(() => {
    if (!classes.length) {
      setClassId(null);
      return;
    }
    if (
      !classId ||
      !classes.some((item) => String(item.id) === String(classId))
    ) {
      setClassId(classes[0]?.id);
    }
  }, [classes, classId]);

  const { data: studentRes } = useGetGradingStudentsQuery(
    { subjectId: subject?.id, classId },
    { skip: !subject?.id || !classId },
  );

  const unit = unitOptions[0] || null;
  const period = periodOptions[0] || null;

  const gradingTabs = [
    { key: "sikap", label: "Sikap" },
    { key: "formatif", label: "Formatif" },
    { key: "sumatif", label: "Sumatif" },
    { key: "ujianAkhir", label: "Ujian Akhir" },
  ];

  const [studentInputs, setStudentInputs] = useState([]);
  const [isAttitudeDirty, setIsAttitudeDirty] = useState(false);
  const [isFormativeDirty, setIsFormativeDirty] = useState(false);
  const [isSummativeDirty, setIsSummativeDirty] = useState(false);
  const [isFinalDirty, setIsFinalDirty] = useState(false);
  const [deletedFormativeScoreKeys, setDeletedFormativeScoreKeys] = useState([]);
  const [deletedSummativeScoreKeys, setDeletedSummativeScoreKeys] = useState([]);
  const [syncExamTarget, setSyncExamTarget] = useState(null);
  const [syncContext, setSyncContext] = useState(null);
  const [scoreContextModal, setScoreContextModal] = useState(null);
  const [pendingUploadFile, setPendingUploadFile] = useState(null);
  const [lastUploadContext, setLastUploadContext] = useState(null);
  const [tabFilters, setTabFilters] = useState({
    sikap: { monthId: undefined, chapterId: undefined },
    formatif: { monthId: undefined, chapterId: undefined },
    sumatif: { monthId: undefined, chapterId: undefined },
    ujianAkhir: { semesterId: 1 },
  });

  const periodStartMonth = useMemo(() => {
    const parsed = dayjs(period?.start);
    return parsed.isValid() ? parsed.startOf("month") : null;
  }, [period?.start]);
  const periodEndMonth = useMemo(() => {
    const parsed = dayjs(period?.end);
    return parsed.isValid() ? parsed.endOf("month") : null;
  }, [period?.end]);
  const currentMonthValue = useMemo(() => dayjs().format("YYYY-MM"), []);
  const initialMonthValue = useMemo(() => {
    if (!periodStartMonth || !periodEndMonth) return currentMonthValue;
    const current = dayjs(currentMonthValue, "YYYY-MM", true);
    if (
      current.isValid() &&
      !current.isBefore(periodStartMonth, "month") &&
      !current.isAfter(periodEndMonth, "month")
    ) {
      return current.format("YYYY-MM");
    }
    return periodStartMonth.format("YYYY-MM");
  }, [currentMonthValue, periodEndMonth, periodStartMonth]);

  const monthNameFromValue = (value) => {
    if (!value) return "";
    const match = String(value).match(/^(\d{4})-(\d{2})$/);
    if (!match) return String(value);
    const monthIndex = Number(match[2]) - 1;
    return MONTH_NAMES[monthIndex] || String(value);
  };

  const deriveSemesterFromMonth = (value) => {
    if (!value) return null;
    const selectedMonth = dayjs(value, "YYYY-MM", true);
    if (!selectedMonth.isValid()) return null;
    const monthNumber = selectedMonth.month() + 1;
    return monthNumber >= 7 ? 1 : 2;
  };

  const semesterLabelFromValue = (value) =>
    value === 2 ? "Semester 2" : "Semester 1";

  useEffect(() => {
    setTabFilters((prev) => ({
      sikap: {
        ...prev.sikap,
        monthId: prev.sikap.monthId || initialMonthValue,
      },
      formatif: {
        ...prev.formatif,
      },
      sumatif: {
        ...prev.sumatif,
      },
      ujianAkhir: {
        ...prev.ujianAkhir,
        semesterId: prev.ujianAkhir?.semesterId || 1,
      },
    }));
  }, [initialMonthValue]);

  const attitudeMonth = tabFilters.sikap?.monthId;
  const attitudeSemester = deriveSemesterFromMonth(attitudeMonth) || 1;
  const formativeMonth = tabFilters.formatif?.monthId;
  const formativeSemester = deriveSemesterFromMonth(formativeMonth) || 1;
  const summativeMonth = tabFilters.sumatif?.monthId;
  const summativeSemester = deriveSemesterFromMonth(summativeMonth) || 1;
  const finalSemester = Number(tabFilters.ujianAkhir?.semesterId) || 1;

  const activeSemesterLabel = useMemo(() => {
    if (gradingTab === "ujianAkhir") {
      return semesterLabelFromValue(finalSemester);
    }
    if (gradingTab === "sumatif") {
      return semesterLabelFromValue(summativeSemester);
    }
    if (gradingTab === "formatif") {
      return semesterLabelFromValue(formativeSemester);
    }
    return semesterLabelFromValue(attitudeSemester);
  }, [
    attitudeSemester,
    finalSemester,
    formativeSemester,
    gradingTab,
    summativeSemester,
  ]);

  const attitudeMonthName = monthNameFromValue(attitudeMonth);
  const {
    data: attitudeRes,
    isLoading: isAttitudeLoading,
    isFetching: isAttitudeFetching,
  } = useGetGradingAttitudeQuery(
    {
      subjectId: subject?.id,
      classId,
      month: attitudeMonthName,
      semester: attitudeSemester,
    },
    {
      skip:
        gradingTab !== "sikap" ||
        !subject?.id ||
        !classId ||
        !attitudeMonthName,
    },
  );

  const { data: chapterRes } = useGetChaptersQuery(
    { subjectId: subject?.id, classId },
    { skip: !subject?.id || !classId },
  );
  const chapters = chapterRes?.data || [];

  const activeChapterId = tabFilters[gradingTab]?.chapterId;
  const { data: contentRes } = useGetContentsQuery(
    { chapterId: activeChapterId },
    { skip: !activeChapterId },
  );
  const contents = contentRes?.data || [];
  const chaptersWithContents = useMemo(
    () =>
      chapters.map((chapter) =>
        String(chapter.id) === String(activeChapterId)
          ? { ...chapter, contents }
          : { ...chapter, contents: chapter.contents || [] },
      ),
    [chapters, activeChapterId, contents],
  );
  const activeChapter = useMemo(
    () =>
      chaptersWithContents.find(
        (chapter) => String(chapter.id) === String(activeChapterId),
      ) || null,
    [chaptersWithContents, activeChapterId],
  );

  const [submitAttitude, { isLoading: isSubmittingAttitude }] =
    useSubmitGradingAttitudeMutation();
  const [submitFormative, { isLoading: isSubmittingFormative }] =
    useSubmitGradingFormativeMutation();
  const [submitSummative, { isLoading: isSubmittingSummative }] =
    useSubmitGradingSummativeMutation();
  const [submitFinal, { isLoading: isSubmittingFinal }] =
    useSubmitGradingFinalMutation();
  const [deleteFinal, { isLoading: isDeletingFinal }] =
    useDeleteGradingFinalMutation();
  const [deleteFormativeColumn] = useDeleteGradingFormativeColumnMutation();
  const [deleteSummativeColumn] = useDeleteGradingSummativeColumnMutation();

  useEffect(() => {
    if (!studentRes?.data?.students) {
      setStudentInputs([]);
      setIsAttitudeDirty(false);
      setIsFormativeDirty(false);
      setIsSummativeDirty(false);
      setIsFinalDirty(false);
      return;
    }
    setStudentInputs(
      studentRes.data.students.map((student) => ({
        id: student.student_id,
        student_id: student.student_id,
        nis: student.nis,
        name: student.full_name,
        summary: {
          sikap: 0,
          formatif: 0,
          sumatif: 0,
          ujianAkhir: 0,
        },
        formatifScores: {},
        summativeScores: {},
        attitude: {
          kinerja: 0,
          kedisiplinan: 0,
          keaktifan: 0,
          percaya_diri: 0,
          teacher_note: "",
        },
      })),
    );
    setIsAttitudeDirty(false);
    setIsFormativeDirty(false);
    setIsSummativeDirty(false);
    setIsFinalDirty(false);
  }, [studentRes]);

  useEffect(() => {
    if (!attitudeRes?.data?.students) return;
    const attitudeMap = new Map(
      attitudeRes.data.students.map((item) => [String(item.student_id), item]),
    );
    setStudentInputs((prev) =>
      prev.map((student) => {
        const record = attitudeMap.get(String(student.student_id));
        if (!record) return student;
        return {
          ...student,
          summary: {
            ...student.summary,
            sikap: record.average_score ?? student.summary.sikap,
          },
          attitude: {
            kinerja: record.kinerja ?? 0,
            kedisiplinan: record.kedisiplinan ?? 0,
            keaktifan: record.keaktifan ?? 0,
            percaya_diri: record.percaya_diri ?? 0,
            teacher_note: record.teacher_note || "",
          },
        };
      }),
    );
    setIsAttitudeDirty(false);
  }, [attitudeRes]);

  const formativeMonthName = monthNameFromValue(formativeMonth);
  const formativeChapterId = tabFilters.formatif?.chapterId;
  const isFormativeFilterActive = !!(formativeMonthName && formativeChapterId);
  const {
    data: formativeRes,
    refetch: refetchFormative,
    isLoading: isFormativeLoading,
    isFetching: isFormativeFetching,
  } = useGetGradingFormativeQuery(
    {
      subjectId: subject?.id,
      classId,
    },
    {
      skip: gradingTab !== "formatif" || !subject?.id || !classId,
    },
  );
  const formatifSubchapters = useMemo(
    () =>
      buildFormatifSubchapters({
        students: formativeRes?.data?.students || [],
        isFormativeFilterActive: false,
        activeChapterId,
        activeChapter,
        chaptersWithContents,
        slots: formativeRes?.data?.slots || [],
      }),
    [
      formativeRes,
      activeChapterId,
      activeChapter,
      chaptersWithContents,
    ],
  );
  const formativeTemplateColumns = useMemo(
    () => {
      const merged = [...(formatifSubchapters || [])];
      const existingKeys = new Set(
        merged.map((sub, index) =>
          String(
            sub?.scoreKey ?? sub?.slotKey ?? sub?.id ?? sub?.key ?? sub?.value ?? index + 1,
          ),
        ),
      );
      const currentMaxLabel = merged.reduce((max, sub, index) => {
        const labelIndex =
          Number(sub?.labelIndex) > 0 ? Number(sub.labelIndex) : index + 1;
        return Math.max(max, labelIndex);
      }, 0);
      let nextLabelIndex = currentMaxLabel + 1;

      studentInputs.forEach((student) => {
        Object.keys(student?.formatifScores || {}).forEach((rawKey) => {
          const scoreKey = String(rawKey || "").trim();
          if (!scoreKey || scoreKey === "__new" || existingKeys.has(scoreKey)) {
            return;
          }
          const numericKey = Number(scoreKey);
          const labelIndex =
            Number.isFinite(numericKey) && numericKey > 0
              ? numericKey
              : nextLabelIndex++;
          merged.push({
            id: scoreKey,
            scoreKey,
            labelIndex,
            title: `Nilai ${labelIndex}`,
            subchapterId:
              Number.isFinite(numericKey) && numericKey > 0 ? numericKey : null,
          });
          existingKeys.add(scoreKey);
        });
      });

      return merged.map((sub, index) => {
        const scoreKey = String(
          sub?.scoreKey ?? sub?.slotKey ?? sub?.id ?? sub?.key ?? sub?.value ?? index + 1,
        );
        const numericKey = Number(scoreKey);
        const labelIndex =
          Number(sub?.labelIndex) > 0
            ? Number(sub.labelIndex)
            : Number.isFinite(numericKey) && numericKey > 0
              ? numericKey
              : index + 1;
        const title = `Nilai ${labelIndex}`;
        return {
          ...sub,
          scoreKey,
          type: sub?.type || scoreKey,
          labelIndex,
          title,
          header: title,
          month: sub?.month || null,
          chapterTitle: sub?.chapterTitle || null,
          examName: sub?.examName || null,
          examId: sub?.examId || null,
          createdAt: sub?.createdAt || null,
        };
      });
    },
    [formatifSubchapters, studentInputs],
  );
  const visibleFormativeColumns = useMemo(
    () =>
      formativeTemplateColumns.filter((column) => {
        const scoreKey = String(column?.scoreKey ?? column?.id ?? "");
        return scoreKey && !deletedFormativeScoreKeys.includes(scoreKey);
      }),
    [deletedFormativeScoreKeys, formativeTemplateColumns],
  );
  const formativeTemplateHeaderMap = useMemo(() => {
    const map = new Map();
    visibleFormativeColumns.forEach((column) => {
      const headerKey = String(column.header || "")
        .trim()
        .toLowerCase();
      if (headerKey) {
        map.set(headerKey, column.scoreKey);
      }
      const titleKey = String(column.title || "")
        .trim()
        .toLowerCase();
      if (titleKey) {
        map.set(titleKey, column.scoreKey);
      }
    });
    return map;
  }, [visibleFormativeColumns]);
  const nextFormatifIndex = useMemo(() => {
    if (!isFormativeFilterActive) return null;
    const monthNum = dayjs(formativeMonth, "YYYY-MM", true).isValid()
      ? dayjs(formativeMonth, "YYYY-MM", true).month() + 1
      : null;
    const expectedMonthPrefix =
      monthNum != null ? `M${String(monthNum).padStart(2, "0")}` : null;
    const expectedChapterPart = `-B${formativeChapterId}`;
    const subIds = new Set();
    formativeTemplateColumns.forEach((column) => {
      const typeKey = String(column?.type || column?.scoreKey || "");
      if (
        expectedMonthPrefix &&
        typeKey &&
        !typeKey.startsWith(expectedMonthPrefix)
      ) {
        return;
      }
      if (
        typeKey &&
        !(
          typeKey.includes(`${expectedChapterPart}-`) ||
          typeKey.endsWith(expectedChapterPart)
        )
      ) {
        return;
      }
      const explicitSubId = Number(
        column?.subchapterId ??
          column?.subchapter_id ??
          extractSubIdFromType(typeKey),
      );
      if (Number.isFinite(explicitSubId) && explicitSubId > 0) {
        subIds.add(explicitSubId);
      }
    });
    if (!subIds.size) return 1;
    return Math.max(...Array.from(subIds)) + 1;
  }, [
    formativeChapterId,
    formativeMonth,
    formativeTemplateColumns,
    isFormativeFilterActive,
  ]);

  useEffect(() => {
    setDeletedFormativeScoreKeys([]);
  }, [classId, gradingTab]);

  useEffect(() => {
    if (!formativeRes?.data?.students) return;
    const formativeMap = new Map(
      formativeRes.data.students.map((item) => [String(item.student_id), item]),
    );
    setStudentInputs((prev) =>
      prev.map((student) => {
        const record = formativeMap.get(String(student.student_id));
        if (!record) return student;
        const scoreEntries = Array.isArray(record.scores) ? record.scores : [];
        const nextScores = {};
        scoreEntries.forEach((entry) => {
          if (!entry) return;
          const slotKey = String(entry.slot_key || entry.type || "").trim();
          if (!slotKey) return;
          if (Object.prototype.hasOwnProperty.call(nextScores, slotKey)) {
            return;
          }
          nextScores[slotKey] = entry.score ?? 0;
        });
        nextScores.__new = null;
        return {
          ...student,
          summary: {
            ...student.summary,
            formatif: record.score ?? student.summary.formatif,
          },
          formatifScores: nextScores,
        };
      }),
    );
    setIsFormativeDirty(false);
  }, [formativeRes]);

  const summativeMonthName = monthNameFromValue(summativeMonth);
  const summativeChapterId = tabFilters.sumatif?.chapterId;
  const isSummativeFilterActive = !!summativeMonthName;
  const {
    data: summativeRes,
    refetch: refetchSummative,
    isLoading: isSummativeLoading,
    isFetching: isSummativeFetching,
  } = useGetGradingSummativeQuery(
    {
      subjectId: subject?.id,
      classId,
    },
    {
      skip: gradingTab !== "sumatif" || !subject?.id || !classId,
    },
  );
  const sumatifSubchapters = useMemo(
    () =>
      buildSummativeSubchapters({
        students: summativeRes?.data?.students || [],
        slots: summativeRes?.data?.slots || [],
        isSummativeFilterActive: false,
        activeChapterId,
        activeChapter,
        chaptersWithContents,
      }),
    [
      summativeRes,
      activeChapterId,
      activeChapter,
      chaptersWithContents,
    ],
  );
  const summativeTemplateColumns = useMemo(() => {
    const merged = [...(sumatifSubchapters || [])];
    const existingKeys = new Set(
      merged.map((sub, index) =>
        String(
          sub?.scoreKey ?? sub?.slotKey ?? sub?.id ?? sub?.key ?? sub?.value ?? index + 1,
        ),
      ),
    );
    const currentMaxLabel = merged.reduce((max, sub, index) => {
      const labelIndex =
        Number(sub?.labelIndex) > 0 ? Number(sub.labelIndex) : index + 1;
      return Math.max(max, labelIndex);
    }, 0);
    let nextLabelIndex = currentMaxLabel + 1;

    studentInputs.forEach((student) => {
      Object.keys(student?.summativeScores || {}).forEach((rawKey) => {
        const scoreKey = String(rawKey || "").trim();
        if (!scoreKey || scoreKey === "__new" || existingKeys.has(scoreKey)) {
          return;
        }
        const numericKey = Number(scoreKey);
        const labelIndex =
          Number.isFinite(numericKey) && numericKey > 0
            ? numericKey
            : nextLabelIndex++;
        merged.push({
          id: scoreKey,
          scoreKey,
          labelIndex,
          title: `Nilai ${labelIndex}`,
          subchapterId:
            Number.isFinite(numericKey) && numericKey > 0 ? numericKey : null,
        });
        existingKeys.add(scoreKey);
      });
    });

    return merged.map((sub, index) => {
      const scoreKey = String(
        sub?.scoreKey ?? sub?.slotKey ?? sub?.id ?? sub?.key ?? sub?.value ?? index + 1,
      );
      const numericKey = Number(scoreKey);
      const labelIndex =
        Number(sub?.labelIndex) > 0
          ? Number(sub.labelIndex)
          : Number.isFinite(numericKey) && numericKey > 0
            ? numericKey
            : index + 1;
      return {
        ...sub,
        scoreKey,
        type: sub?.type || scoreKey,
        labelIndex,
        title: `Nilai ${labelIndex}`,
        month: sub?.month || null,
        chapterTitle: sub?.chapterTitle || null,
        examName: sub?.examName || null,
        examId: sub?.examId || null,
        createdAt: sub?.createdAt || null,
      };
    });
  }, [studentInputs, sumatifSubchapters]);
  const visibleSummativeColumns = useMemo(
    () =>
      summativeTemplateColumns.filter((column) => {
        const scoreKey = String(column?.scoreKey ?? column?.id ?? "");
        return scoreKey && !deletedSummativeScoreKeys.includes(scoreKey);
      }),
    [deletedSummativeScoreKeys, summativeTemplateColumns],
  );
  const nextSumatifIndex = useMemo(() => {
    if (!isSummativeFilterActive) return null;
    const monthNum = dayjs(summativeMonth, "YYYY-MM", true).isValid()
      ? dayjs(summativeMonth, "YYYY-MM", true).month() + 1
      : null;
    const expectedMonthPrefix =
      monthNum != null ? `M${String(monthNum).padStart(2, "0")}` : null;
    const expectedChapterPart = summativeChapterId
      ? `-B${summativeChapterId}`
      : "-B0";
    const subIds = new Set();
    summativeTemplateColumns.forEach((column) => {
      const typeKey = String(column?.type || column?.scoreKey || "");
      if (
        expectedMonthPrefix &&
        typeKey &&
        !typeKey.startsWith(expectedMonthPrefix)
      ) {
        return;
      }
      if (
        typeKey &&
        !(
          typeKey.includes(`${expectedChapterPart}-`) ||
          typeKey.endsWith(expectedChapterPart)
        )
      ) {
        return;
      }
      const explicitSubId = Number(
        column?.subchapterId ??
          column?.subchapter_id ??
          extractSubIdFromType(typeKey),
      );
      if (Number.isFinite(explicitSubId) && explicitSubId > 0) {
        subIds.add(explicitSubId);
      }
    });
    if (!subIds.size) return 1;
    return Math.max(...Array.from(subIds)) + 1;
  }, [
    isSummativeFilterActive,
    summativeChapterId,
    summativeMonth,
    summativeTemplateColumns,
  ]);

  useEffect(() => {
    setDeletedSummativeScoreKeys([]);
  }, [classId, gradingTab]);

  useEffect(() => {
    if (!summativeRes?.data?.students) return;
    const summativeMap = new Map(
      summativeRes.data.students.map((item) => [String(item.student_id), item]),
    );
    setStudentInputs((prev) =>
      prev.map((student) => {
        const record = summativeMap.get(String(student.student_id));
        if (!record) return student;
        const scoreEntries = Array.isArray(record.scores) ? record.scores : [];
        const nextScores = {};
        scoreEntries.forEach((entry) => {
          if (!entry) return;
          const scoreKey = String(entry.slot_key || entry.type || "").trim();
          if (!scoreKey) return;
          const singleScore = resolveSummativeSingleScore(entry);
          nextScores[scoreKey] = {
            score_written: singleScore,
            score_skill: null,
            final_score: singleScore,
          };
        });
        nextScores.__new = {
          score_written: null,
          score_skill: null,
          final_score: null,
        };
        return {
          ...student,
          summary: {
            ...student.summary,
            sumatif: record.score ?? getSummativeAverageFromScores(nextScores),
          },
          summativeScores: nextScores,
        };
      }),
    );
    setIsSummativeDirty(false);
  }, [summativeRes]);

  const {
    data: finalRes,
    refetch: refetchFinal,
    isLoading: isFinalLoading,
    isFetching: isFinalFetching,
  } = useGetGradingFinalQuery(
    {
      subjectId: subject?.id,
      classId,
      semester: finalSemester,
    },
    {
      skip: gradingTab !== "ujianAkhir" || !subject?.id || !classId,
    },
  );

  useEffect(() => {
    if (!finalRes?.data?.students) return;
    const finalMap = new Map(
      finalRes.data.students.map((item) => [String(item.student_id), item]),
    );
    setStudentInputs((prev) =>
      prev.map((student) => {
        const record = finalMap.get(String(student.student_id));
        if (!record) return student;
        return {
          ...student,
          summary: {
            ...student.summary,
            ujianAkhir: record.final_grade ?? 0,
          },
        };
      }),
    );
    setIsFinalDirty(false);
  }, [finalRes]);

  const handleStudentChange = (index, key, value) => {
    setStudentInputs((prev) => {
      const next = [...prev];
      const current = next[index] || {};
      next[index] = {
        ...current,
        summary: {
          ...current.summary,
          [key]: value ?? 0,
        },
      };
      return next;
    });
    if (key === "formatif") {
      setIsFormativeDirty(true);
      return;
    }
    if (key === "ujianAkhir") {
      setIsFinalDirty(true);
    }
  };

  const handleFormativeChange = (index, subchapterId, value) => {
    setStudentInputs((prev) => {
      const next = [...prev];
      const current = next[index] || {};
      const isNewScoreColumn = subchapterId === "__new";
      const nextValue =
        value === null || value === undefined || value === ""
          ? null
          : isNewScoreColumn
            ? Number(value)
            : (value ?? 0);
      const nextScores = {
        ...(current.formatifScores || {}),
        [subchapterId ?? "default"]: nextValue,
      };
      next[index] = {
        ...current,
        formatifScores: nextScores,
        summary: {
          ...current.summary,
          formatif:
            subchapterId != null
              ? (nextScores[subchapterId] ?? current.summary?.formatif)
              : (nextScores.default ?? current.summary?.formatif),
        },
      };
      return next;
    });
    setIsFormativeDirty(true);
  };

  const handleDeleteFormativeColumn = async (scoreKey) => {
    const normalizedKey = String(scoreKey || "").trim();
    if (!normalizedKey || normalizedKey === "__new") {
      message.error("Kolom formatif tidak valid.");
      return;
    }
    if (!subject?.id || !classId) {
      message.error("Pilih kelas terlebih dahulu.");
      return;
    }

    const targetColumn = formativeTemplateColumns.find(
      (column) => String(column?.scoreKey ?? column?.id ?? "").trim() === normalizedKey,
    );
    const typeKey = String(
      targetColumn?.type || targetColumn?.slotKey || normalizedKey,
    ).trim();
    if (!typeKey) {
      message.error("Kolom formatif tidak dapat dihapus.");
      return;
    }

    const loadingKey = `delete-formatif-${normalizedKey}`;
    message.loading({
      key: loadingKey,
      content: `Menghapus ${targetColumn?.title || "kolom formatif"}...`,
      duration: 0,
    });

    try {
      const res = await deleteFormativeColumn({
        subject_id: subject.id,
        class_id: classId,
        type: typeKey,
      }).unwrap();

      setDeletedFormativeScoreKeys((prev) =>
        prev.includes(normalizedKey) ? prev : [...prev, normalizedKey],
      );
      setStudentInputs((prev) =>
        prev.map((student) => {
          const nextScores = { ...(student.formatifScores || {}) };
          delete nextScores[normalizedKey];
          return {
            ...student,
            formatifScores: nextScores,
          };
        }),
      );
      setIsFormativeDirty(false);
      await refetchFormative();
      message.success({
        key: loadingKey,
        content:
          res?.message ||
          `${targetColumn?.title || "Kolom formatif"} berhasil dihapus.`,
      });
    } catch (error) {
      message.error({
        key: loadingKey,
        content:
          error?.data?.message ||
          `${targetColumn?.title || "Kolom formatif"} gagal dihapus.`,
      });
    }
  };

  const handleAttitudeChange = (index, key, value) => {
    setStudentInputs((prev) => {
      const next = [...prev];
      const current = next[index] || {};
      const attitude = current.attitude || {};
      const isNote = key === "teacher_note";
      const nextValue = isNote ? value || "" : (value ?? 0);
      const nextAttitude = {
        ...attitude,
        [key]: nextValue,
      };
      const average =
        (Number(nextAttitude.kinerja || 0) +
          Number(nextAttitude.kedisiplinan || 0) +
          Number(nextAttitude.keaktifan || 0) +
          Number(nextAttitude.percaya_diri || 0)) /
        4;
      next[index] = {
        ...current,
        attitude: nextAttitude,
        summary: {
          ...current.summary,
          sikap: average,
        },
      };
      return next;
    });
    setIsAttitudeDirty(true);
  };

  const handleSummativeChange = (index, subchapterId, value) => {
    setStudentInputs((prev) => {
      const next = [...prev];
      const current = next[index] || {};
      const scoreKey = subchapterId ?? "default";
      const currentScores = current.summativeScores || {};
      const normalizedValue =
        value === null || value === undefined || value === ""
          ? null
          : Number(value);
      const nextScoreObj = {
        score_written: normalizedValue,
        score_skill: null,
        final_score: normalizedValue,
      };
      const nextScores = {
        ...currentScores,
        [scoreKey]: nextScoreObj,
      };
      next[index] = {
        ...current,
        summativeScores: nextScores,
        summary: {
          ...current.summary,
          sumatif: getSummativeAverageFromScores(nextScores),
        },
      };
      return next;
    });
    setIsSummativeDirty(true);
  };

  const handleDeleteSummativeColumn = async (scoreKey) => {
    const normalizedKey = String(scoreKey || "").trim();
    if (!normalizedKey || normalizedKey === "__new") {
      message.error("Kolom sumatif tidak valid.");
      return;
    }
    if (!subject?.id || !classId) {
      message.error("Pilih kelas terlebih dahulu.");
      return;
    }

    const targetColumn = summativeTemplateColumns.find(
      (column) =>
        String(column?.scoreKey ?? column?.id ?? "").trim() === normalizedKey,
    );
    const typeKey = String(
      targetColumn?.type || targetColumn?.slotKey || normalizedKey,
    ).trim();
    if (!typeKey) {
      message.error("Kolom sumatif tidak dapat dihapus.");
      return;
    }

    const loadingKey = `delete-sumatif-${normalizedKey}`;
    message.loading({
      key: loadingKey,
      content: `Menghapus ${targetColumn?.title || "kolom sumatif"}...`,
      duration: 0,
    });

    try {
      const res = await deleteSummativeColumn({
        subject_id: subject.id,
        class_id: classId,
        type: typeKey,
      }).unwrap();

      setDeletedSummativeScoreKeys((prev) =>
        prev.includes(normalizedKey) ? prev : [...prev, normalizedKey],
      );
      setStudentInputs((prev) =>
        prev.map((student) => {
          const nextScores = { ...(student.summativeScores || {}) };
          delete nextScores[normalizedKey];
          return {
            ...student,
            summativeScores: nextScores,
          };
        }),
      );
      setIsSummativeDirty(false);
      await refetchSummative();
      message.success({
        key: loadingKey,
        content:
          res?.message ||
          `${targetColumn?.title || "Kolom sumatif"} berhasil dihapus.`,
      });
    } catch (error) {
      message.error({
        key: loadingKey,
        content:
          error?.data?.message ||
          `${targetColumn?.title || "Kolom sumatif"} gagal dihapus.`,
      });
    }
  };

  const normalizeScoreValue = (value) => {
    const numberValue = Number(value);
    if (Number.isNaN(numberValue)) return 0;
    return Math.max(0, Math.min(100, Math.round(numberValue)));
  };

  const normalizeSpreadsheetHeader = (value) =>
    String(value || "")
      .trim()
      .toLowerCase();

  const getWorkbookDataSheetName = (workbook) =>
    workbook.SheetNames.find((name) => name !== TEMPLATE_GUIDE_SHEET_NAME) ||
    workbook.SheetNames[0];

  const applyWorksheetColumnWidths = (worksheet, headers = []) => {
    worksheet["!cols"] = (headers || []).map((header) => ({
      wch: Math.max(14, String(header || "").length + 4),
    }));
  };

  const buildGradingTemplateGuideSheet = (kind) => {
    const isFormative = kind === "formative";
    const dataSheetName = isFormative ? "Template Formatif" : "Template Sumatif";
    const scoreLabel = isFormative ? "formatif" : "sumatif";
    const rows = [
      [`Panduan Template Nilai ${isFormative ? "Formatif" : "Sumatif"}`],
      [],
      [
        "Isi sheet",
        `Isi nilai siswa hanya pada sheet ${dataSheetName}. Sheet Panduan ini tidak diimpor.`,
      ],
      [
        "Langkah 1",
        "Jangan ubah baris header (baris pertama) kecuali Anda memang ingin menambah kolom nilai baru.",
      ],
      [
        "Langkah 2",
        "Jangan ubah kolom NIS. NIS dipakai untuk mencocokkan data siswa.",
      ],
      [
        "Langkah 3",
        "Isi nilai 0–100. Sel kosong dilewati dan tidak menimpa nilai yang sudah ada.",
      ],
      [
        "Langkah 4",
        "Unggah kembali file Excel di halaman penilaian, pilih tanggal/bulan dan bab, lalu simpan.",
      ],
      [],
      ["PENAMAAN HEADER (baris pertama) — sangat penting"],
      [],
      ["Header", "Fungsi"],
      [
        "NIS",
        "Wajib. Kunci siswa. Jangan diubah. Alternatif yang dikenali: No Induk, no_induk.",
      ],
      [
        "Nama",
        "Hanya untuk memudahkan pengisian. Tidak diimpor. Alternatif: Nama Siswa.",
      ],
    ];

    if (isFormative) {
      rows.push(
        [
          "Nilai 1, Nilai 2, dst.",
          "Kolom nilai yang sudah ada. Nama harus tetap 'Nilai' diikuti nomor (contoh: Nilai 1). Jangan diganti judul lain, atau nilai tidak masuk ke kolom tersebut.",
        ],
        [
          "Input Nilai",
          "Kolom untuk menambah nilai baru. Boleh juga Input Nilai 1, Input Nilai 2, dst. Setiap kolom Input Nilai menjadi kolom nilai baru.",
        ],
        [],
        ["Aturan penamaan header nilai", ""],
        [
          "Memperbarui nilai lama",
          "Gunakan header persis seperti template: Nilai 1, Nilai 2, dan seterusnya. Jangan mengubah ejaan atau menambah kata lain.",
        ],
        [
          "Menambah nilai baru",
          "Tambahkan kolom dengan header Input Nilai. Untuk beberapa kolom baru, gunakan Input Nilai, Input Nilai 2, Input Nilai 3.",
        ],
        [
          "Header Nilai N yang belum ada",
          "Header seperti Nilai 5 akan membuat kolom baru bernomor 5 jika kolom itu belum ada di sistem.",
        ],
        [
          "Header yang diabaikan",
          "Nama kolom lain (selain NIS, Nama, Nilai N, dan Input Nilai) tidak dibaca saat unggah.",
        ],
      );
    } else {
      rows.push(
        [
          "Nilai 1, Nilai 2, dst.",
          "Kolom nilai yang sudah ada. Nama harus sama persis dengan template (contoh: Nilai 1). Jika diubah, nilai tidak masuk ke kolom tersebut.",
        ],
        [
          "Input Nilai",
          "Kolom untuk menambah nilai baru. Alternatif yang dikenali: Nilai Baru, Nilai, Score, Nilai Tertulis, Tertulis.",
        ],
        [],
        ["Aturan penamaan header nilai", ""],
        [
          "Memperbarui nilai lama",
          "Biarkan header kolom nilai tetap seperti template (Nilai 1, Nilai 2, dst.). Jangan diganti judul lain.",
        ],
        [
          "Menambah nilai baru",
          "Isi kolom Input Nilai. Header ini wajib tetap bernama Input Nilai (atau salah satu alternatif di atas).",
        ],
        [
          "Header yang diabaikan",
          "Nama kolom selain NIS, Nama, Nilai N, dan Input Nilai tidak dipakai saat unggah.",
        ],
      );
    }

    rows.push(
      [],
      [
        "Catatan",
        `Satu file hanya untuk satu konteks ${scoreLabel} (bulan/tanggal dan bab) yang dipilih saat unggah.`,
      ],
      [
        "Rentang nilai",
        "0 sampai 100. Nilai di luar rentang akan dibulatkan ke batas terdekat.",
      ],
    );

    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet["!cols"] = [{ wch: 36 }, { wch: 110 }];
    return sheet;
  };

  const buildFormativeImportColumns = (headerRow = []) => {
    const explicitSubchapterIds = visibleFormativeColumns
      .map((column) =>
        Number(column?.subchapterId ?? column?.subchapter_id ?? column?.scoreKey),
      )
      .filter((value) => Number.isFinite(value) && value > 0);
    const usedGeneratedScoreKeys = new Set(
      explicitSubchapterIds.map((value) => String(value)),
    );
    const baseNextSubchapterId =
      Number.isFinite(Number(nextFormatifIndex)) && Number(nextFormatifIndex) > 0
        ? Number(nextFormatifIndex)
        : (explicitSubchapterIds.length ? Math.max(...explicitSubchapterIds) : 0) + 1;
    let nextGeneratedSubchapterId = baseNextSubchapterId;

    const reserveGeneratedScoreKey = () => {
      while (usedGeneratedScoreKeys.has(String(nextGeneratedSubchapterId))) {
        nextGeneratedSubchapterId += 1;
      }
      const reservedKey = String(nextGeneratedSubchapterId);
      usedGeneratedScoreKeys.add(reservedKey);
      nextGeneratedSubchapterId += 1;
      return reservedKey;
    };

    const seenHeaders = new Map();
    return (headerRow || []).map((headerValue, index) => {
      const normalizedHeader = normalizeSpreadsheetHeader(headerValue);
      if (!normalizedHeader) return { index, kind: "ignore" };

      const occurrence = (seenHeaders.get(normalizedHeader) || 0) + 1;
      seenHeaders.set(normalizedHeader, occurrence);

      if (
        normalizedHeader === "nis" ||
        normalizedHeader === "no induk" ||
        normalizedHeader === "no_induk"
      ) {
        return { index, kind: "nis" };
      }

      if (normalizedHeader === "nama" || normalizedHeader === "nama siswa") {
        return { index, kind: "ignore" };
      }

      if (formativeTemplateHeaderMap.has(normalizedHeader) && occurrence === 1) {
        return {
          index,
          kind: "score",
          scoreKey: formativeTemplateHeaderMap.get(normalizedHeader),
        };
      }

      if (/^input\s*nilai(?:[\s_-]*\d+)?$/i.test(normalizedHeader)) {
        return {
          index,
          kind: "score",
          scoreKey: reserveGeneratedScoreKey(),
        };
      }

      const scoreNumberMatch = normalizedHeader.match(/^nilai\s*(\d+)$/i);
      if (scoreNumberMatch && !formativeTemplateHeaderMap.has(normalizedHeader)) {
        const explicitScoreKey = String(Number(scoreNumberMatch[1]));
        usedGeneratedScoreKeys.add(explicitScoreKey);
        return {
          index,
          kind: "score",
          scoreKey: explicitScoreKey,
        };
      }

      if (/^nilai\s*\d+$/i.test(normalizedHeader) && occurrence > 1) {
        return {
          index,
          kind: "score",
          scoreKey: reserveGeneratedScoreKey(),
        };
      }

      return { index, kind: "ignore" };
    });
  };

  const hasPositiveSummativeScore = (scoreWritten, scoreSkill) =>
    (scoreWritten ?? 0) > 0 || (scoreSkill ?? 0) > 0;

  function extractSummativeSubId(entry) {
    const explicitSubId = Number(entry?.subchapter_id);
    if (Number.isFinite(explicitSubId) && explicitSubId > 0) {
      return explicitSubId;
    }
    const parsedSubId = extractSubIdFromType(entry?.type);
    if (parsedSubId != null) return parsedSubId;
    const rawType = String(entry?.type || "");
    if (/^M\d{2}-B\d+$/.test(rawType)) {
      return 1;
    }
    return null;
  }

  function buildSummativeSubchapters({
    students = [],
    slots = [],
    isSummativeFilterActive,
    activeChapterId,
    activeChapter,
    chaptersWithContents = [],
  }) {
    if (!isSummativeFilterActive) {
      return buildFormatifSubchapters({
        students,
        isFormativeFilterActive: false,
        activeChapterId,
        activeChapter,
        chaptersWithContents,
        slots,
      });
    }

    const activeSubchapterIndexMap = new Map(
      (activeChapter?.contents || []).map((subchapter, index) => [
        Number(subchapter.id),
        index + 1,
      ]),
    );
    const columns = new Map();

    (slots || []).forEach((slot, index) => {
      const scoreKey = String(slot?.slot_key ?? slot?.type ?? "");
      if (!scoreKey || columns.has(scoreKey)) return;
      const subchapterId = Number(slot?.subchapter_id) || extractSummativeSubId(slot);
      const labelIndex =
        Number(slot?.label_index) ||
        (activeChapterId && subchapterId
          ? activeSubchapterIndexMap.get(subchapterId)
          : null) ||
        index + 1;
      columns.set(scoreKey, {
        id: scoreKey,
        scoreKey,
        type: slot?.type || scoreKey,
        subchapterId,
        labelIndex,
        month: slot?.month || null,
        chapterTitle: slot?.chapter_title || null,
        examId: slot?.exam_id || null,
        examName: slot?.exam_name || null,
        createdAt: slot?.created_at || null,
        title: `Nilai ${labelIndex}`,
      });
    });

    students.forEach((student) => {
      (student?.scores || []).forEach((score) => {
        const scoreKey = String(score?.slot_key || score?.type || "").trim();
        const subchapterId = extractSummativeSubId(score);
        if (!scoreKey || !Number.isFinite(subchapterId) || subchapterId <= 0) {
          return;
        }
        if (columns.has(scoreKey)) return;

        const labelIndex =
          (activeChapterId
            ? activeSubchapterIndexMap.get(subchapterId)
            : null) ||
          subchapterId ||
          columns.size + 1;
        columns.set(scoreKey, {
          id: scoreKey,
          scoreKey,
          type: score?.type || scoreKey,
          subchapterId,
          labelIndex,
          month: score?.month || null,
          chapterTitle: score?.chapter_title || null,
          examId: score?.exam_id || null,
          examName: score?.exam_name || null,
          createdAt: score?.created_at || null,
          title: `Nilai ${labelIndex}`,
        });
      });
    });

    return Array.from(columns.values()).sort(
      (left, right) => left.labelIndex - right.labelIndex,
    );
  }

  const buildSummativeFinal = (scoreWritten, scoreSkill) => {
    const written =
      scoreWritten === null || scoreWritten === undefined || scoreWritten === ""
        ? null
        : normalizeScoreValue(scoreWritten);
    const skill =
      scoreSkill === null || scoreSkill === undefined || scoreSkill === ""
        ? null
        : normalizeScoreValue(scoreSkill);
    const values = [written, skill].filter(
      (value) => value !== null && value !== undefined,
    );
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  };

  const resolveSummativeSingleScore = (entry) => {
    const written =
      entry?.score_written === null || entry?.score_written === undefined
        ? null
        : Number(entry.score_written);
    const skill =
      entry?.score_skill === null || entry?.score_skill === undefined
        ? null
        : Number(entry.score_skill);
    const finalFromEntry =
      entry?.final_score === null || entry?.final_score === undefined
        ? null
        : Number(entry.final_score);
    const hasWritten = written !== null && !Number.isNaN(written);
    const hasSkill = skill !== null && !Number.isNaN(skill);
    if (hasWritten && !hasSkill) return written;
    if (hasSkill && !hasWritten) return skill;
    if (hasWritten && hasSkill) {
      if (finalFromEntry !== null && !Number.isNaN(finalFromEntry)) {
        return finalFromEntry;
      }
      return buildSummativeFinal(written, skill);
    }
    if (finalFromEntry !== null && !Number.isNaN(finalFromEntry)) {
      return finalFromEntry;
    }
    return null;
  };

  const getSummativeAverageFromScores = (scoresMap = {}) => {
    const values = Object.entries(scoresMap)
      .filter(([key]) => key !== "__new")
      .map(([, scoreObj]) => Number(scoreObj?.final_score ?? 0))
      .filter((value) => !Number.isNaN(value) && value > 0);
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  };

  const handleDownloadAttitudeTemplate = () => {
    if (!studentInputs.length) {
      message.warning("Belum ada data siswa untuk dibuatkan template.");
      return;
    }
    const headers = [
      "NIS",
      "Nama",
      "Kinerja",
      "Kedisiplinan",
      "Keaktifan",
      "Percaya Diri",
      "Catatan",
    ];
    const templateRows = studentInputs.map((student) => ({
      NIS: student.nis || "",
      Nama: student.name || "",
      Kinerja: student.attitude?.kinerja ?? 0,
      Kedisiplinan: student.attitude?.kedisiplinan ?? 0,
      Keaktifan: student.attitude?.keaktifan ?? 0,
      "Percaya Diri": student.attitude?.percaya_diri ?? 0,
      Catatan: student.attitude?.teacher_note || "",
    }));
    const worksheet = XLSX.utils.json_to_sheet(templateRows, {
      header: headers,
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Sikap");
    const className =
      classes.find((item) => String(item.id) === String(classId))?.name ||
      "Kelas";
    const monthLabel = attitudeMonthName ? `_${attitudeMonthName}` : "";
    const safeName = `Template_Nilai_Sikap_${className}${monthLabel}`.replace(
      /[\/:*?"<>|]/g,
      "-",
    );
    XLSX.writeFile(workbook, `${safeName}.xlsx`);
  };

  const handleDownloadFormativeTemplate = () => {
    if (!studentInputs.length) {
      message.warning("Belum ada data siswa untuk dibuatkan template.");
      return;
    }
    const headers = [
      "NIS",
      "Nama",
      ...visibleFormativeColumns.map((column) => column.header),
      "Input Nilai",
    ];
    const templateRows = studentInputs.map((student) => {
      const row = {
        NIS: student.nis || "",
        Nama: student.name || "",
      };
      visibleFormativeColumns.forEach((column) => {
        const currentValue = student.formatifScores?.[column.scoreKey];
        row[column.header] =
          currentValue === null || currentValue === undefined ? "" : currentValue;
      });
      row["Input Nilai"] = "";
      return row;
    });
    const worksheet = XLSX.utils.json_to_sheet(templateRows, {
      header: headers,
    });
    applyWorksheetColumnWidths(worksheet, headers);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Formatif");
    XLSX.utils.book_append_sheet(
      workbook,
      buildGradingTemplateGuideSheet("formative"),
      TEMPLATE_GUIDE_SHEET_NAME,
    );
    const className =
      classes.find((item) => String(item.id) === String(classId))?.name ||
      "Kelas";
    const safeName =
      `Template_Nilai_Formatif_${className}_InputNilai`.replace(
        /[\/:*?"<>|]/g,
        "-",
      );
    XLSX.writeFile(workbook, `${safeName}.xlsx`);
  };

  const handleImportAttitudeExcel = (file) => {
    if (!attitudeMonth) {
      message.warning("Pilih bulan sikap terlebih dahulu sebelum upload.");
      return false;
    }
    if (!studentInputs.length) {
      message.warning("Belum ada data siswa untuk diisi.");
      return false;
    }

    const availableNis = new Set(
      studentInputs.map((student) => String(student.nis || "").trim()),
    );

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
          defval: "",
        });

        if (!rows.length) {
          message.error("File Excel kosong atau format tidak sesuai.");
          return;
        }

        const updates = new Map();
        let unknownNisCount = 0;

        rows.forEach((row) => {
          const normalizedRow = Object.entries(row).reduce(
            (acc, [key, value]) => {
              const normalizedKey = String(key || "")
                .trim()
                .toLowerCase();
              if (normalizedKey) acc[normalizedKey] = value;
              return acc;
            },
            {},
          );

          const nisValue =
            normalizedRow.nis ||
            normalizedRow["no induk"] ||
            normalizedRow["no_induk"];
          const nis = String(nisValue || "").trim();
          if (!nis) return;
          if (!availableNis.has(nis)) {
            unknownNisCount += 1;
            return;
          }

          const kinerja = normalizeScoreValue(normalizedRow.kinerja);
          const kedisiplinan = normalizeScoreValue(normalizedRow.kedisiplinan);
          const keaktifan = normalizeScoreValue(normalizedRow.keaktifan);
          const percayaDiri = normalizeScoreValue(
            normalizedRow["percaya diri"] ?? normalizedRow.percaya_diri,
          );
          const teacherNote =
            normalizedRow.catatan ??
            normalizedRow["teacher_note"] ??
            normalizedRow.note ??
            "";

          updates.set(nis, {
            kinerja,
            kedisiplinan,
            keaktifan,
            percaya_diri: percayaDiri,
            teacher_note: teacherNote ? String(teacherNote) : "",
          });
        });

        if (updates.size === 0) {
          message.error("Tidak ada baris valid pada file Excel.");
          return;
        }

        setStudentInputs((prev) =>
          prev.map((student) => {
            const nisKey = String(student.nis || "").trim();
            if (!updates.has(nisKey)) {
              return student;
            }
            const update = updates.get(nisKey);
            const nextAttitude = {
              ...student.attitude,
              ...update,
            };
            const average =
              (Number(nextAttitude.kinerja || 0) +
                Number(nextAttitude.kedisiplinan || 0) +
                Number(nextAttitude.keaktifan || 0) +
                Number(nextAttitude.percaya_diri || 0)) /
              4;
            return {
              ...student,
              attitude: nextAttitude,
              summary: {
                ...student.summary,
                sikap: average,
              },
            };
          }),
        );

        setIsAttitudeDirty(true);
        if (unknownNisCount > 0) {
          message.warning(
            `Upload selesai. ${unknownNisCount} NIS tidak ditemukan di kelas ini.`,
          );
        } else {
          message.success("Upload nilai sikap berhasil diterapkan.");
        }
      } catch (error) {
        message.error("Gagal membaca file Excel.");
      }
    };
    reader.readAsArrayBuffer(file);
    return false;
  };

  const applyUploadContextFilters = (targetType, context) => {
    setTabFilters((prev) => ({
      ...prev,
      [targetType === "summative" ? "sumatif" : "formatif"]: {
        ...prev[targetType === "summative" ? "sumatif" : "formatif"],
        monthId: context.monthId,
        chapterId: context.chapterId || undefined,
        date: context.date || undefined,
      },
    }));
  };

  const processFormativeExcelFile = (file, context) =>
    new Promise((resolve, reject) => {
      if (!studentInputs.length) {
        message.warning("Belum ada data siswa untuk diisi.");
        reject(new Error("empty-students"));
        return;
      }
      const availableNis = new Set(
        studentInputs.map((student) => String(student.nis || "").trim()),
      );
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = getWorkbookDataSheetName(workbook);
          const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
            header: 1,
            defval: "",
          });

          if (!rows.length || !Array.isArray(rows[0])) {
            message.error("File Excel kosong atau format tidak sesuai.");
            reject(new Error("invalid-file"));
            return;
          }

          const [headerRow, ...dataRows] = rows;
          const importColumns = buildFormativeImportColumns(headerRow);
          const nisColumn = importColumns.find((column) => column.kind === "nis");

          if (!nisColumn) {
            message.error("Kolom NIS tidak ditemukan pada file Excel.");
            reject(new Error("missing-nis"));
            return;
          }

          const updates = new Map();
          let unknownNisCount = 0;

          dataRows.forEach((row) => {
            if (!Array.isArray(row)) return;
            const nisValue = row[nisColumn.index];
            const nis = String(nisValue || "").trim();
            if (!nis) return;
            if (!availableNis.has(nis)) {
              unknownNisCount += 1;
              return;
            }

            const nextScores = {};
            importColumns.forEach((column) => {
              if (column.kind !== "score" || !column.scoreKey) return;
              const value = row[column.index];
              if (value === null || value === undefined || value === "") return;
              nextScores[column.scoreKey] = normalizeScoreValue(value);
            });
            if (Object.keys(nextScores).length) {
              updates.set(nis, nextScores);
            }
          });

          if (updates.size === 0) {
            message.error("Tidak ada baris valid pada file Excel.");
            reject(new Error("empty-rows"));
            return;
          }

          applyUploadContextFilters("formative", context);
          setLastUploadContext(context);
          setStudentInputs((prev) =>
            prev.map((student) => {
              const nisKey = String(student.nis || "").trim();
              if (!updates.has(nisKey)) {
                return student;
              }
              const update = updates.get(nisKey);
              const nextScores = { ...(student.formatifScores || {}) };
              Object.entries(update || {}).forEach(([key, value]) => {
                nextScores[key] = value;
              });
              return {
                ...student,
                formatifScores: nextScores,
              };
            }),
          );

          setIsFormativeDirty(true);
          if (unknownNisCount > 0) {
            message.warning(
              `Upload selesai. ${unknownNisCount} NIS tidak ditemukan di kelas ini.`,
            );
          } else {
            message.success("Upload nilai formatif berhasil diterapkan.");
          }
          resolve();
        } catch (error) {
          message.error("Gagal membaca file Excel.");
          reject(error);
        }
      };
      reader.onerror = () => {
        message.error("Gagal membaca file Excel.");
        reject(new Error("read-error"));
      };
      reader.readAsArrayBuffer(file);
    });

  const handleImportFormativeExcel = (file) => {
    if (!studentInputs.length) {
      message.warning("Belum ada data siswa untuk diisi.");
      return false;
    }
    setPendingUploadFile(file);
    setScoreContextModal({
      mode: "upload",
      targetType: "formative",
    });
    return false;
  };

  const handleDownloadSummativeTemplate = () => {
    if (!studentInputs.length) {
      message.warning("Belum ada data siswa untuk dibuatkan template.");
      return;
    }
    const headers = [
      "NIS",
      "Nama",
      ...visibleSummativeColumns.map((column) => column.title),
      "Input Nilai",
    ];
    const templateRows = studentInputs.map((student) => {
      const row = {
        NIS: student.nis || "",
        Nama: student.name || "",
      };
      visibleSummativeColumns.forEach((column) => {
        const scoreObj = student.summativeScores?.[column.scoreKey] || {};
        const value =
          scoreObj.score_written ?? scoreObj.final_score ?? null;
        row[column.title] =
          value === null || value === undefined ? "" : value;
      });
      row["Input Nilai"] = "";
      return row;
    });
    const worksheet = XLSX.utils.json_to_sheet(templateRows, {
      header: headers,
    });
    applyWorksheetColumnWidths(worksheet, headers);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Sumatif");
    XLSX.utils.book_append_sheet(
      workbook,
      buildGradingTemplateGuideSheet("summative"),
      TEMPLATE_GUIDE_SHEET_NAME,
    );
    const className =
      classes.find((item) => String(item.id) === String(classId))?.name ||
      "Kelas";
    const safeName =
      `Template_Nilai_Sumatif_${className}_InputNilai`.replace(
        /[\/:*?"<>|]/g,
        "-",
      );
    XLSX.writeFile(workbook, `${safeName}.xlsx`);
  };

  const processSummativeExcelFile = (file, context) =>
    new Promise((resolve, reject) => {
      if (!studentInputs.length) {
        message.warning("Belum ada data siswa untuk diisi.");
        reject(new Error("empty-students"));
        return;
      }
      const availableNis = new Set(
        studentInputs.map((student) => String(student.nis || "").trim()),
      );
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = getWorkbookDataSheetName(workbook);
          const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
            defval: "",
          });

          if (!rows.length) {
            message.error("File Excel kosong atau format tidak sesuai.");
            reject(new Error("invalid-file"));
            return;
          }

          const updates = new Map();
          let unknownNisCount = 0;

          rows.forEach((row) => {
            const normalizedRow = Object.entries(row).reduce(
              (acc, [key, value]) => {
                const normalizedKey = String(key || "")
                  .trim()
                  .toLowerCase();
                if (normalizedKey) acc[normalizedKey] = value;
                return acc;
              },
              {},
            );

            const nisValue =
              normalizedRow.nis ||
              normalizedRow["no induk"] ||
              normalizedRow["no_induk"];
            const nis = String(nisValue || "").trim();
            if (!nis) return;
            if (!availableNis.has(nis)) {
              unknownNisCount += 1;
              return;
            }

            const nextScores = {};
            visibleSummativeColumns.forEach((column) => {
              const rawValue =
                normalizedRow[String(column.title || "").toLowerCase()] ??
                normalizedRow[`nilai ${column.labelIndex}`] ??
                normalizedRow[`nilai${column.labelIndex}`];
              if (
                rawValue === null ||
                rawValue === undefined ||
                rawValue === ""
              ) {
                return;
              }
              const scoreWritten = normalizeScoreValue(rawValue);
              nextScores[column.scoreKey] = {
                score_written: scoreWritten,
                score_skill: null,
                final_score: scoreWritten,
              };
            });

            const scoreWrittenRaw =
              normalizedRow["input nilai"] ??
              normalizedRow["nilai baru"] ??
              normalizedRow.nilai ??
              normalizedRow.score ??
              normalizedRow["score_written"] ??
              normalizedRow["nilai tertulis"] ??
              normalizedRow.tertulis;
            if (
              scoreWrittenRaw !== null &&
              scoreWrittenRaw !== undefined &&
              scoreWrittenRaw !== ""
            ) {
              const scoreWritten = normalizeScoreValue(scoreWrittenRaw);
              nextScores.__new = {
                score_written: scoreWritten,
                score_skill: null,
                final_score: scoreWritten,
              };
            }

            if (Object.keys(nextScores).length) {
              updates.set(nis, nextScores);
            }
          });

          if (updates.size === 0) {
            message.error("Tidak ada baris valid pada file Excel.");
            reject(new Error("empty-rows"));
            return;
          }

          applyUploadContextFilters("summative", context);
          setLastUploadContext(context);
          setStudentInputs((prev) =>
            prev.map((student) => {
              const nisKey = String(student.nis || "").trim();
              if (!updates.has(nisKey)) {
                return student;
              }
              const update = updates.get(nisKey);
              const nextScores = { ...(student.summativeScores || {}) };
              Object.entries(update || {}).forEach(([key, value]) => {
                nextScores[key] = value;
              });
              return {
                ...student,
                summativeScores: nextScores,
              };
            }),
          );

          setIsSummativeDirty(true);
          if (unknownNisCount > 0) {
            message.warning(
              `Upload selesai. ${unknownNisCount} NIS tidak ditemukan di kelas ini.`,
            );
          } else {
            message.success("Upload nilai sumatif berhasil diterapkan.");
          }
          resolve();
        } catch (error) {
          message.error("Gagal membaca file Excel.");
          reject(error);
        }
      };
      reader.onerror = () => {
        message.error("Gagal membaca file Excel.");
        reject(new Error("read-error"));
      };
      reader.readAsArrayBuffer(file);
    });

  const handleImportSummativeExcel = (file) => {
    if (!studentInputs.length) {
      message.warning("Belum ada data siswa untuk diisi.");
      return false;
    }
    setPendingUploadFile(file);
    setScoreContextModal({
      mode: "upload",
      targetType: "summative",
    });
    return false;
  };

const handleDownloadFinalTemplate = () => {
    if (!studentInputs.length) {
      message.warning("Belum ada data siswa untuk dibuatkan template.");
      return;
    }
    const headers = ["NIS", "Nama", "Nilai Ujian Akhir"];
    const templateRows = studentInputs.map((student) => ({
      NIS: student.nis || "",
      Nama: student.name || "",
      "Nilai Ujian Akhir": student.summary?.ujianAkhir ?? 0,
    }));
    const worksheet = XLSX.utils.json_to_sheet(templateRows, {
      header: headers,
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Ujian Akhir");
    const className =
      classes.find((item) => String(item.id) === String(classId))?.name ||
      "Kelas";
    const safeName = `Template_Nilai_UjianAkhir_${className}_Semester${finalSemester}`.replace(
      /[\/:*?"<>|]/g,
      "-",
    );
    XLSX.writeFile(workbook, `${safeName}.xlsx`);
  };

  const handleImportFinalExcel = (file) => {
    if (!studentInputs.length) {
      message.warning("Belum ada data siswa untuk diisi.");
      return false;
    }
    const availableNis = new Set(
      studentInputs.map((student) => String(student.nis || "").trim()),
    );

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
          defval: "",
        });

        if (!rows.length) {
          message.error("File Excel kosong atau format tidak sesuai.");
          return;
        }

        const updates = new Map();
        let unknownNisCount = 0;

        rows.forEach((row) => {
          const normalizedRow = Object.entries(row).reduce(
            (acc, [key, value]) => {
              const normalizedKey = String(key || "")
                .trim()
                .toLowerCase();
              if (normalizedKey) acc[normalizedKey] = value;
              return acc;
            },
            {},
          );

          const nisValue =
            normalizedRow.nis ||
            normalizedRow["no induk"] ||
            normalizedRow["no_induk"];
          const nis = String(nisValue || "").trim();
          if (!nis) return;
          if (!availableNis.has(nis)) {
            unknownNisCount += 1;
            return;
          }

          const rawScore =
            normalizedRow["nilai ujian akhir"] ??
            normalizedRow["ujian akhir"] ??
            normalizedRow["nilai akhir"] ??
            normalizedRow["final"] ??
            normalizedRow["final grade"] ??
            normalizedRow.final_grade ??
            normalizedRow.nilai ??
            normalizedRow.score;

          if (rawScore === null || rawScore === undefined || rawScore === "") {
            return;
          }

          updates.set(nis, normalizeScoreValue(rawScore));
        });

        if (updates.size === 0) {
          message.error("Tidak ada baris valid pada file Excel.");
          return;
        }

        setStudentInputs((prev) =>
          prev.map((student) => {
            const nisKey = String(student.nis || "").trim();
            if (!updates.has(nisKey)) {
              return student;
            }
            return {
              ...student,
              summary: {
                ...(student.summary || {}),
                ujianAkhir: updates.get(nisKey),
              },
            };
          }),
        );

        setIsFinalDirty(true);
        if (unknownNisCount > 0) {
          message.warning(
            `Upload selesai. ${unknownNisCount} NIS tidak ditemukan di kelas ini.`,
          );
        } else {
          message.success("Upload nilai ujian akhir berhasil diterapkan.");
        }
      } catch (error) {
        message.error("Gagal membaca file Excel.");
      }
    };
    reader.readAsArrayBuffer(file);
    return false;
  };

  const handleFilterChange = (typeKey, field, value) => {
    setTabFilters((prev) => {
      const current = prev[typeKey] || {};
      return {
        ...prev,
        [typeKey]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  const handleSaveAttitude = async () => {
    if (!subject?.id || !classId || !attitudeMonthName) {
      message.warning("Pilih bulan sikap terlebih dahulu.");
      return;
    }

    const items = studentInputs.map((student) => ({
      student_id: student.student_id,
      kinerja: student.attitude?.kinerja ?? 0,
      kedisiplinan: student.attitude?.kedisiplinan ?? 0,
      keaktifan: student.attitude?.keaktifan ?? 0,
      percaya_diri: student.attitude?.percaya_diri ?? 0,
      teacher_note: student.attitude?.teacher_note || "",
    }));

    try {
      const res = await submitAttitude({
        subject_id: subject.id,
        class_id: classId,
        month: attitudeMonthName,
        semester: attitudeSemester,
        items,
      }).unwrap();
      message.success(res?.message || "Nilai sikap tersimpan.");
      setIsAttitudeDirty(false);
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan nilai sikap.");
    }
  };

  const parseScoreTypeMeta = (typeValue, column = {}) => {
    const typeKey = String(typeValue || column?.type || column?.scoreKey || "");
    const match = typeKey.match(/^M(\d{2})-B(\d+)(?:-S(\d+))?$/i);
    const monthNumFromType = match ? Number(match[1]) : null;
    const chapterFromType = match ? Number(match[2]) : null;
    const subFromType =
      match && match[3]
        ? Number(match[3])
        : extractSubIdFromType(typeKey);
    const monthFromColumn = String(column?.month || "").trim();
    const monthName =
      monthNumFromType != null
        ? MONTH_NAMES[monthNumFromType - 1]
        : monthFromColumn || null;
    const monthNum =
      monthNumFromType != null
        ? monthNumFromType
        : MONTH_NAMES.findIndex(
            (name) => name.toLowerCase() === monthFromColumn.toLowerCase(),
          ) + 1 || null;
    const chapterIdRaw =
      chapterFromType != null
        ? chapterFromType
        : Number(column?.chapterId ?? column?.chapter_id);
    const chapterId =
      Number.isFinite(chapterIdRaw) && chapterIdRaw > 0 ? chapterIdRaw : null;
    const subchapterId = Number(
      column?.subchapterId ?? column?.subchapter_id ?? subFromType,
    );
    return {
      typeKey,
      monthName,
      monthNum: Number.isFinite(monthNum) && monthNum > 0 ? monthNum : null,
      chapterId,
      subchapterId:
        Number.isFinite(subchapterId) && subchapterId > 0 ? subchapterId : null,
      semester:
        Number.isFinite(monthNum) && monthNum > 0
          ? monthNum >= 7
            ? 1
            : 2
          : null,
    };
  };

  const handleSaveFormative = async () => {
    if (!subject?.id || !classId) {
      message.warning("Pilih kelas terlebih dahulu.");
      return;
    }

    const hasMeaningfulNewFormativeScore = studentInputs.some((student) => {
      const newRaw = student.formatifScores?.__new;
      if (newRaw === null || newRaw === undefined || newRaw === "") return false;
      const newValue = normalizeScoreValue(newRaw);
      return newValue > 0;
    });

    if (hasMeaningfulNewFormativeScore) {
      if (!formativeMonthName || !formativeChapterId) {
        message.warning(
          "Pilih bulan dan bab formatif untuk menyimpan nilai baru.",
        );
        return;
      }
      if (!nextFormatifIndex) {
        message.warning("Nilai formatif baru belum bisa ditentukan.");
        return;
      }
    }

    const groups = new Map();
    formativeTemplateColumns.forEach((sub) => {
      const scoreKey = String(
        sub?.scoreKey ?? sub?.slotKey ?? sub?.id ?? sub?.key ?? sub?.value ?? "",
      );
      if (!scoreKey || scoreKey === "__new") return;
      const meta = parseScoreTypeMeta(sub?.type || scoreKey, sub);
      if (!meta.monthName || !meta.chapterId || !meta.subchapterId) return;
      const groupKey = `${meta.monthName}|${meta.chapterId}`;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          month: meta.monthName,
          chapterId: meta.chapterId,
          semester: meta.semester || formativeSemester || 1,
          columns: [],
        });
      }
      groups.get(groupKey).columns.push({
        scoreKey,
        subchapterId: meta.subchapterId,
      });
    });

    if (hasMeaningfulNewFormativeScore) {
      const groupKey = `${formativeMonthName}|${formativeChapterId}`;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          month: formativeMonthName,
          chapterId: formativeChapterId,
          semester: formativeSemester || 1,
          columns: [],
        });
      }
      groups.get(groupKey).columns.push({
        scoreKey: "__new",
        subchapterId: nextFormatifIndex,
      });
    }

    if (!groups.size) {
      message.warning("Tidak ada nilai formatif yang dapat disimpan.");
      return;
    }

    try {
      for (const group of groups.values()) {
        const items = [];
        studentInputs.forEach((student) => {
          group.columns.forEach((column) => {
            const rawScore =
              column.scoreKey === "__new"
                ? student.formatifScores?.__new
                : student.formatifScores?.[column.scoreKey];
            if (
              column.scoreKey === "__new" &&
              (rawScore === null || rawScore === undefined || rawScore === "")
            ) {
              return;
            }
            const scoreValue =
              rawScore === null || rawScore === undefined || rawScore === ""
                ? null
                : normalizeScoreValue(rawScore);
            items.push({
              student_id: student.student_id,
              subchapter_id: column.subchapterId,
              score: scoreValue,
            });
          });
        });
        if (!items.length) continue;
        const hasNewColumn = group.columns.some(
          (column) => column.scoreKey === "__new",
        );
        await submitFormative({
          subject_id: subject.id,
          class_id: classId,
          month: group.month,
          semester: group.semester,
          chapter_id: group.chapterId,
          recorded_at: hasNewColumn
            ? tabFilters.formatif?.date || lastUploadContext?.date || undefined
            : undefined,
          items,
        }).unwrap();
      }
      message.success("Nilai formatif tersimpan.");
      setStudentInputs((prev) =>
        prev.map((student) => ({
          ...student,
          formatifScores: {
            ...(student.formatifScores || {}),
            __new: null,
          },
        })),
      );
      setIsFormativeDirty(false);
      await refetchFormative();
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan nilai formatif.");
    }
  };

  const handleSaveSummative = async () => {
    if (!subject?.id || !classId) {
      message.warning("Pilih kelas terlebih dahulu.");
      return;
    }

    const hasMeaningfulNewSummativeScore = studentInputs.some((student) => {
      const newObj = student.summativeScores?.__new || {};
      const newWritten =
        newObj.score_written === null ||
        newObj.score_written === undefined ||
        newObj.score_written === ""
          ? null
          : normalizeScoreValue(newObj.score_written);
      return hasPositiveSummativeScore(newWritten, null);
    });

    if (hasMeaningfulNewSummativeScore) {
      if (!summativeMonthName) {
        message.warning("Pilih bulan sumatif untuk menyimpan nilai baru.");
        return;
      }
      if (!nextSumatifIndex) {
        message.warning("Nilai sumatif baru belum bisa ditentukan.");
        return;
      }
    }

    const groups = new Map();
    summativeTemplateColumns.forEach((sub) => {
      const scoreKey = String(
        sub?.scoreKey ?? sub?.slotKey ?? sub?.id ?? sub?.key ?? sub?.value ?? "",
      );
      if (!scoreKey || scoreKey === "__new") return;
      const meta = parseScoreTypeMeta(sub?.type || scoreKey, sub);
      if (!meta.monthName || !meta.subchapterId) return;
      const chapterKey = meta.chapterId || 0;
      const groupKey = `${meta.monthName}|${chapterKey}`;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          month: meta.monthName,
          chapterId: meta.chapterId,
          semester: meta.semester || summativeSemester || 1,
          columns: [],
        });
      }
      groups.get(groupKey).columns.push({
        scoreKey,
        subchapterId: meta.subchapterId,
      });
    });

    if (hasMeaningfulNewSummativeScore) {
      const chapterKey = summativeChapterId || 0;
      const groupKey = `${summativeMonthName}|${chapterKey}`;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          month: summativeMonthName,
          chapterId: summativeChapterId || null,
          semester: summativeSemester || 1,
          columns: [],
        });
      }
      groups.get(groupKey).columns.push({
        scoreKey: "__new",
        subchapterId: nextSumatifIndex,
      });
    }

    if (!groups.size) {
      message.warning("Tidak ada nilai sumatif yang dapat disimpan.");
      return;
    }

    try {
      for (const group of groups.values()) {
        const items = [];
        studentInputs.forEach((student) => {
          group.columns.forEach((column) => {
            const rawObj =
              column.scoreKey === "__new"
                ? student.summativeScores?.__new || {}
                : student.summativeScores?.[column.scoreKey] || {};
            const scoreWritten =
              rawObj.score_written === null ||
              rawObj.score_written === undefined ||
              rawObj.score_written === ""
                ? null
                : normalizeScoreValue(rawObj.score_written);
            if (column.scoreKey === "__new") {
              if (!hasPositiveSummativeScore(scoreWritten, null)) return;
            }
            items.push({
              student_id: student.student_id,
              subchapter_id: column.subchapterId,
              score_written: scoreWritten,
              score_skill: null,
            });
          });
        });
        if (!items.length) continue;
        const hasNewColumn = group.columns.some(
          (column) => column.scoreKey === "__new",
        );
        await submitSummative({
          subject_id: subject.id,
          class_id: classId,
          month: group.month,
          semester: group.semester,
          chapter_id: group.chapterId || null,
          recorded_at: hasNewColumn
            ? tabFilters.sumatif?.date || lastUploadContext?.date || undefined
            : undefined,
          items,
        }).unwrap();
      }
      message.success("Nilai sumatif tersimpan.");
      setStudentInputs((prev) =>
        prev.map((student) => ({
          ...student,
          summativeScores: {
            ...(student.summativeScores || {}),
            __new: {
              score_written: null,
              score_skill: null,
              final_score: null,
            },
          },
        })),
      );
      setIsSummativeDirty(false);
      await refetchSummative();
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan nilai sumatif.");
    }
  };

  const handleSaveFinal = async () => {
    if (!subject?.id || !classId) {
      message.warning("Pilih kelas terlebih dahulu.");
      return;
    }

    const items = studentInputs.map((student) => {
      const rawValue = student.summary?.ujianAkhir;
      const normalizedValue =
        rawValue === null || rawValue === undefined || rawValue === ""
          ? null
          : normalizeScoreValue(rawValue);
      return {
        student_id: student.student_id,
        final_grade: normalizedValue === 0 ? null : normalizedValue,
      };
    });

    try {
      const res = await submitFinal({
        subject_id: subject.id,
        class_id: classId,
        semester: finalSemester,
        items,
      }).unwrap();
      message.success(res?.message || "Nilai ujian akhir tersimpan.");
      setIsFinalDirty(false);
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan ujian akhir.");
    }
  };

  const handleDeleteFinal = async () => {
    if (!subject?.id || !classId) {
      message.warning("Pilih kelas terlebih dahulu.");
      return;
    }
    try {
      const res = await deleteFinal({
        subject_id: subject.id,
        class_id: classId,
        semester: finalSemester,
      }).unwrap();
      message.success(res?.message || "Nilai ujian akhir berhasil dihapus.");
      setStudentInputs((prev) =>
        prev.map((student) => ({
          ...student,
          summary: {
            ...student.summary,
            ujianAkhir: 0,
          },
        })),
      );
      setIsFinalDirty(false);
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus ujian akhir.");
    }
  };

  const renderGradingContent = (typeKey) => (
    <StudentGradingTable
      students={studentInputs}
      chapters={chaptersWithContents}
      classes={classes}
      classId={classId}
      typeKey={typeKey}
      filters={tabFilters[typeKey]}
      onFilterChange={handleFilterChange}
      onClassChange={(value) => setClassId(value)}
      onStudentChange={handleStudentChange}
      onFormativeChange={handleFormativeChange}
      formativeSubchapters={visibleFormativeColumns}
      onDeleteFormativeColumn={handleDeleteFormativeColumn}
      onSummativeChange={handleSummativeChange}
      summativeSubchapters={visibleSummativeColumns}
      onDeleteSummativeColumn={handleDeleteSummativeColumn}
      onAttitudeChange={handleAttitudeChange}
      period={period}
      isAttitudeLoading={
        gradingTab === "sikap" && (isAttitudeLoading || isAttitudeFetching)
      }
      isFormativeLoading={
        gradingTab === "formatif" && (isFormativeLoading || isFormativeFetching)
      }
      isSummativeLoading={
        gradingTab === "sumatif" && (isSummativeLoading || isSummativeFetching)
      }
      isFinalLoading={
        gradingTab === "ujianAkhir" && (isFinalLoading || isFinalFetching)
      }
      showFilters
    />
  );

  return (
    <Suspense fallback={<LoadApp />}>
      <Flex vertical gap='middle' style={{ width: "100%", minWidth: 0 }}>
      <GradingHeader
        subject={subject}
        unit={unit}
        period={period}
        semesterLabel={activeSemesterLabel}
        classes={classes}
        classId={classId}
        onClassChange={(value) => setClassId(value)}
      />

      {unitId && periodId && classId ? (
        <Flex vertical gap={16} style={{ width: "100%", minWidth: 0 }}>
          <Card
            style={{ borderRadius: 14, border: "1px solid #f0f0f0" }}
            styles={{ body: { padding: 0 } }}
          >
            <Flex
              align={isMobile ? "stretch" : "center"}
              justify='space-between'
              wrap='wrap'
              gap={12}
              vertical={isMobile}
              style={{ padding: isMobile ? 14 : 16 }}
            >
              <div style={{ minWidth: 0 }}>
                <Typography.Title level={5} style={{ margin: 0 }}>
                  Input Penilaian
                </Typography.Title>
                <Typography.Text type='secondary'>
                  Guru dapat memberi nilai formatif/sumatif langsung lewat
                  Tambah Nilai (pilih tanggal & bab). Hover label Nilai untuk
                  melihat detail.
                </Typography.Text>
              </div>
              {gradingTab === "sikap" && (
                <Flex
                  align='center'
                  gap={8}
                  wrap='wrap'
                  style={{ width: isMobile ? "100%" : "auto" }}
                >
                  <Button
                    icon={<Download size={16} />}
                    onClick={handleDownloadAttitudeTemplate}
                    style={isMobile ? { flex: "1 1 140px" } : undefined}
                  >
                    {isCompact ? "Template" : "Template Sikap"}
                  </Button>
                  <Upload
                    accept='.xlsx,.xls'
                    showUploadList={false}
                    beforeUpload={handleImportAttitudeExcel}
                  >
                    <Button
                      icon={<UploadIcon size={16} />}
                      style={isMobile ? { flex: "1 1 140px" } : undefined}
                    >
                      Upload Excel
                    </Button>
                  </Upload>
                  <Button
                    type='primary'
                    icon={<Save size={16} />}
                    loading={isSubmittingAttitude}
                    disabled={!isAttitudeDirty}
                    onClick={handleSaveAttitude}
                    style={isMobile ? { flex: "1 1 100%" } : undefined}
                  >
                    Simpan Sikap
                  </Button>
                </Flex>
              )}
              {gradingTab === "formatif" && (
                <Flex
                  align='center'
                  gap={8}
                  wrap='wrap'
                  style={{ width: isMobile ? "100%" : "auto" }}
                >
                  {formativeMonthName && formativeChapterId ? (
                    <Tag color="blue" style={{ marginInlineEnd: 0 }}>
                      {tabFilters.formatif?.date
                        ? dayjs(tabFilters.formatif.date).format("DD/MM/YYYY")
                        : formativeMonthName}
                      {` · ${
                        chapters.find(
                          (chapter) =>
                            String(chapter.id) === String(formativeChapterId),
                        )?.title || "Bab"
                      }`}
                    </Tag>
                  ) : null}
                  <Button
                    icon={<Plus size={16} />}
                    onClick={() => {
                      if (!chapters.length) {
                        message.warning(
                          "Belum ada bab pada mapel ini. Tambahkan bab terlebih dahulu.",
                        );
                        return;
                      }
                      setScoreContextModal({
                        mode: "input",
                        targetType: "formative",
                      });
                    }}
                    style={isMobile ? { flex: "1 1 140px" } : undefined}
                  >
                    {isCompact ? "Tambah" : "Tambah Nilai"}
                  </Button>
                  <Button
                    icon={<RefreshCw size={16} />}
                    onClick={() => {
                      setScoreContextModal({
                        mode: "sync",
                        targetType: "formative",
                      });
                    }}
                    style={isMobile ? { flex: "1 1 140px" } : undefined}
                  >
                    {isCompact ? "Sync" : "Sync dari Ujian"}
                  </Button>
                  <Button
                    icon={<Download size={16} />}
                    onClick={handleDownloadFormativeTemplate}
                    title="Unduh Excel. Sheet Panduan berisi aturan penamaan header."
                    style={isMobile ? { flex: "1 1 140px" } : undefined}
                  >
                    {isCompact ? "Template" : "Template Formatif"}
                  </Button>
                  <Upload
                    accept='.xlsx,.xls'
                    showUploadList={false}
                    beforeUpload={handleImportFormativeExcel}
                  >
                    <Button
                      icon={<UploadIcon size={16} />}
                      style={isMobile ? { flex: "1 1 140px" } : undefined}
                    >
                      Upload Excel
                    </Button>
                  </Upload>
                  <Button
                    type='primary'
                    icon={<Save size={16} />}
                    loading={isSubmittingFormative}
                    disabled={!isFormativeDirty}
                    onClick={handleSaveFormative}
                    style={isMobile ? { flex: "1 1 100%" } : undefined}
                  >
                    Simpan Formatif
                  </Button>
                </Flex>
              )}
              {gradingTab === "sumatif" && (
                <Flex
                  align='center'
                  gap={8}
                  wrap='wrap'
                  style={{ width: isMobile ? "100%" : "auto" }}
                >
                  {summativeMonthName ? (
                    <Tag color="blue" style={{ marginInlineEnd: 0 }}>
                      {tabFilters.sumatif?.date
                        ? dayjs(tabFilters.sumatif.date).format("DD/MM/YYYY")
                        : summativeMonthName}
                      {summativeChapterId
                        ? ` · ${
                            chapters.find(
                              (chapter) =>
                                String(chapter.id) ===
                                String(summativeChapterId),
                            )?.title || "Bab"
                          }`
                        : ""}
                    </Tag>
                  ) : null}
                  <Button
                    icon={<Plus size={16} />}
                    onClick={() => {
                      setScoreContextModal({
                        mode: "input",
                        targetType: "summative",
                      });
                    }}
                    style={isMobile ? { flex: "1 1 140px" } : undefined}
                  >
                    {isCompact ? "Tambah" : "Tambah Nilai"}
                  </Button>
                  <Button
                    icon={<RefreshCw size={16} />}
                    onClick={() => {
                      setScoreContextModal({
                        mode: "sync",
                        targetType: "summative",
                      });
                    }}
                    style={isMobile ? { flex: "1 1 140px" } : undefined}
                  >
                    {isCompact ? "Sync" : "Sync dari Ujian"}
                  </Button>
                  <Button
                    icon={<Download size={16} />}
                    onClick={handleDownloadSummativeTemplate}
                    title="Unduh Excel. Sheet Panduan berisi aturan penamaan header."
                    style={isMobile ? { flex: "1 1 140px" } : undefined}
                  >
                    {isCompact ? "Template" : "Template Sumatif"}
                  </Button>
                  <Upload
                    accept='.xlsx,.xls'
                    showUploadList={false}
                    beforeUpload={handleImportSummativeExcel}
                  >
                    <Button
                      icon={<UploadIcon size={16} />}
                      style={isMobile ? { flex: "1 1 140px" } : undefined}
                    >
                      Upload Excel
                    </Button>
                  </Upload>
                  <Button
                    type='primary'
                    icon={<Save size={16} />}
                    loading={isSubmittingSummative}
                    disabled={!isSummativeDirty}
                    onClick={handleSaveSummative}
                    style={isMobile ? { flex: "1 1 100%" } : undefined}
                  >
                    Simpan Sumatif
                  </Button>
                </Flex>
              )}
              {gradingTab === "ujianAkhir" && (
                <Flex
                  align='center'
                  gap={8}
                  wrap='wrap'
                  style={{ width: isMobile ? "100%" : "auto" }}
                >
                  <Button
                    icon={<RefreshCw size={16} />}
                    disabled={!finalSemester}
                    onClick={() => {
                      if (!finalSemester) {
                        message.warning(
                          "Pilih semester ujian akhir terlebih dahulu.",
                        );
                        return;
                      }
                      setSyncExamTarget("final");
                    }}
                    style={isMobile ? { flex: "1 1 140px" } : undefined}
                  >
                    {isCompact ? "Sync" : "Sync dari Ujian"}
                  </Button>
                  <Button
                    icon={<Download size={16} />}
                    onClick={handleDownloadFinalTemplate}
                    style={isMobile ? { flex: "1 1 140px" } : undefined}
                  >
                    {isCompact ? "Template" : "Template Ujian Akhir"}
                  </Button>
                  <Upload
                    accept='.xlsx,.xls'
                    showUploadList={false}
                    beforeUpload={handleImportFinalExcel}
                  >
                    <Button
                      icon={<UploadIcon size={16} />}
                      style={isMobile ? { flex: "1 1 140px" } : undefined}
                    >
                      Upload Excel
                    </Button>
                  </Upload>
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    loading={isDeletingFinal}
                    onClick={() => {
                      Modal.confirm({
                        title: "Hapus semua nilai ujian akhir?",
                        icon: <ExclamationCircleOutlined />,
                        content:
                          "Semua nilai Ujian Akhir pada kelas dan semester ini akan dihapus.",
                        okText: "Hapus",
                        okType: "danger",
                        cancelText: "Batal",
                        onOk: handleDeleteFinal,
                      });
                    }}
                    style={isMobile ? { flex: "1 1 140px" } : undefined}
                  >
                    Hapus Nilai
                  </Button>
                  <Button
                    type='primary'
                    icon={<Save size={16} />}
                    loading={isSubmittingFinal}
                    disabled={!isFinalDirty}
                    onClick={handleSaveFinal}
                    style={isMobile ? { flex: "1 1 100%" } : undefined}
                  >
                    Simpan Ujian Akhir
                  </Button>
                </Flex>
              )}
            </Flex>
            <Tabs
              activeKey={gradingTab}
              items={gradingTabs.map((tab) => ({
                key: tab.key,
                label: tab.label,
                children: renderGradingContent(tab.key),
              }))}
              onChange={setGradingTab}
              size={isMobile ? "middle" : "large"}
              tabBarGutter={isMobile ? 8 : 16}
              style={{
                padding: isMobile ? "0 12px 12px" : "0 16px 16px",
                width: "100%",
              }}
            />
          </Card>
        </Flex>
      ) : (
        <Card
          style={{ borderRadius: 14, border: "1px solid #f0f0f0" }}
          styles={{ body: { padding: 24 } }}
        >
          <Empty description='Belum ada data penilaian pada semester ini.' />
        </Card>
      )}
      <SyncFormativeFromExamModal
        open={Boolean(syncExamTarget)}
        onClose={() => {
          setSyncExamTarget(null);
          setSyncContext(null);
        }}
        targetType={syncExamTarget || "formative"}
        subjectId={subject?.id}
        classId={classId}
        month={
          syncExamTarget === "final"
            ? undefined
            : syncContext?.monthName ||
              (syncExamTarget === "summative"
                ? summativeMonthName
                : formativeMonthName)
        }
        semester={
          syncExamTarget === "final"
            ? finalSemester
            : syncContext?.semester ||
              (syncExamTarget === "summative"
                ? summativeSemester
                : formativeSemester)
        }
        chapterId={
          syncExamTarget === "formative"
            ? syncContext?.chapterId || formativeChapterId
            : undefined
        }
        recordedAt={syncContext?.date || null}
        onSynced={async () => {
          if (syncExamTarget === "summative") {
            setDeletedSummativeScoreKeys([]);
            setIsSummativeDirty(false);
            await refetchSummative();
            setSyncContext(null);
            return;
          }
          if (syncExamTarget === "final") {
            setIsFinalDirty(false);
            await refetchFinal();
            setSyncContext(null);
            return;
          }
          setDeletedFormativeScoreKeys([]);
          setIsFormativeDirty(false);
          await refetchFormative();
          setSyncContext(null);
        }}
      />
      <ScoreContextModal
        open={
          scoreContextModal?.mode === "upload" ||
          scoreContextModal?.mode === "sync" ||
          scoreContextModal?.mode === "input"
        }
        title={
          scoreContextModal?.mode === "sync"
            ? "Pilih Tanggal & Bab untuk Sync"
            : scoreContextModal?.mode === "input"
              ? "Pilih Tanggal & Bab untuk Nilai Baru"
              : "Pilih Tanggal & Bab untuk Upload"
        }
        okText={
          scoreContextModal?.mode === "sync"
            ? "Pilih Ujian"
            : scoreContextModal?.mode === "input"
              ? "Mulai Input"
              : "Terapkan"
        }
        requireChapter={scoreContextModal?.targetType === "formative"}
        chapterOptional={scoreContextModal?.targetType === "summative"}
        chapters={chapters}
        period={period}
        initialDate={
          scoreContextModal?.targetType === "summative"
            ? tabFilters.sumatif?.date
            : tabFilters.formatif?.date
        }
        initialChapterId={
          scoreContextModal?.targetType === "summative"
            ? summativeChapterId
            : formativeChapterId
        }
        onCancel={() => {
          setScoreContextModal(null);
          setPendingUploadFile(null);
        }}
        onConfirm={async (context) => {
          if (scoreContextModal?.mode === "sync") {
            applyUploadContextFilters(scoreContextModal.targetType, context);
            setSyncContext(context);
            setSyncExamTarget(scoreContextModal.targetType);
            setScoreContextModal(null);
            return;
          }

          if (scoreContextModal?.mode === "input") {
            applyUploadContextFilters(scoreContextModal.targetType, context);
            setLastUploadContext(context);
            setScoreContextModal(null);
            message.success(
              "Kolom Input Nilai siap. Isi nilai siswa lalu simpan.",
            );
            return;
          }

          if (scoreContextModal?.mode === "upload") {
            const file = pendingUploadFile;
            if (!file) {
              message.error("File upload tidak ditemukan.");
              return;
            }
            if (scoreContextModal.targetType === "summative") {
              await processSummativeExcelFile(file, context);
            } else {
              await processFormativeExcelFile(file, context);
            }
            setPendingUploadFile(null);
            setScoreContextModal(null);
          }
        }}
      />
      </Flex>
    </Suspense>
  );
};

export default Grading;

