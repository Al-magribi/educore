import React, { Suspense, lazy, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Empty,
  Flex,
  Tabs,
  Typography,
  message,
  Upload,
  Select,
  Modal,
} from "antd";
import { Download, Save, Upload as UploadIcon } from "lucide-react";
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

const Grading = ({ subject }) => {
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
        monthId: prev.formatif.monthId || initialMonthValue,
      },
      sumatif: {
        ...prev.sumatif,
        monthId: prev.sumatif.monthId || initialMonthValue,
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
      month: formativeMonthName,
      semester: formativeSemester,
      chapterId: formativeChapterId,
    },
    {
      skip:
        gradingTab !== "formatif" ||
        !subject?.id ||
        !classId ||
        !formativeMonthName ||
        !formativeChapterId,
    },
  );
  const formatifSubchapters = useMemo(
    () =>
      buildFormatifSubchapters({
        students: formativeRes?.data?.students || [],
        isFormativeFilterActive,
        activeChapterId,
        activeChapter,
        chaptersWithContents,
        slots: formativeRes?.data?.slots || [],
      }),
    [
      formativeRes,
      isFormativeFilterActive,
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
        return {
          ...sub,
          scoreKey,
          labelIndex,
          title: sub?.title || `Nilai ${labelIndex}`,
          header: `Nilai ${labelIndex}`,
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
    const subIds = new Set();
    formativeTemplateColumns.forEach((column) => {
      const explicitSubId = Number(
        column?.subchapterId ?? column?.subchapter_id ?? column?.scoreKey,
      );
      if (Number.isFinite(explicitSubId) && explicitSubId > 0) {
        subIds.add(explicitSubId);
      }
    });
    if (!subIds.size) return 1;
    return Math.max(...Array.from(subIds)) + 1;
  }, [formativeTemplateColumns, isFormativeFilterActive]);

  useEffect(() => {
    if (gradingTab !== "formatif") return;
    if (!formativeMonthName || !formativeChapterId) {
      setDeletedFormativeScoreKeys([]);
      setStudentInputs((prev) =>
        prev.map((student) => ({
          ...student,
          summary: {
            ...student.summary,
            formatif: 0,
          },
          formatifScores: {},
        })),
      );
      setIsFormativeDirty(false);
    }
  }, [gradingTab, formativeMonthName, formativeChapterId]);

  useEffect(() => {
    setDeletedFormativeScoreKeys([]);
  }, [classId, formativeChapterId, formativeMonthName, gradingTab]);

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
          const explicitSubId = Number(entry?.subchapter_id);
          const parsedSubId =
            Number.isFinite(explicitSubId) && explicitSubId > 0
              ? explicitSubId
              : extractSubIdFromType(entry.type);
          const resolvedSubId =
            parsedSubId != null || !/^M\d{2}-B\d+$/.test(String(entry.type || ""))
              ? parsedSubId
              : 1;
          const scoreKey = isFormativeFilterActive
            ? (slotKey || (resolvedSubId ?? "default"))
            : slotKey ||
              entry.type ||
              `${entry.month || "M00"}-B${entry.chapter_id ?? "0"}-S${
                resolvedSubId ?? "0"
              }`;
          if (
            isFormativeFilterActive &&
            scoreKey !== "default" &&
            Object.prototype.hasOwnProperty.call(nextScores, scoreKey)
          ) {
            return;
          }
          nextScores[scoreKey] = entry.score ?? 0;
        });
        nextScores.__new = null;
        return {
          ...student,
          summary: {
            ...student.summary,
            formatif: isFormativeFilterActive
              ? (record.score ?? student.summary.formatif)
              : student.summary.formatif,
          },
          formatifScores: nextScores,
        };
      }),
    );
    setIsFormativeDirty(false);
  }, [formativeRes]);

  const summativeMonthName = monthNameFromValue(summativeMonth);
  const summativeChapterId = tabFilters.sumatif?.chapterId;
  const isSummativeFilterActive = !!(summativeMonthName && summativeChapterId);
  const {
    data: summativeRes,
    refetch: refetchSummative,
    isLoading: isSummativeLoading,
    isFetching: isSummativeFetching,
  } = useGetGradingSummativeQuery(
    {
      subjectId: subject?.id,
      classId,
      month: summativeMonthName,
      semester: summativeSemester,
      chapterId: summativeChapterId,
    },
    {
      skip:
        gradingTab !== "sumatif" ||
        !subject?.id ||
        !classId ||
        !summativeMonthName ||
        !summativeChapterId,
    },
  );
  const sumatifSubchapters = useMemo(
    () =>
      buildSummativeSubchapters({
        students: summativeRes?.data?.students || [],
        isSummativeFilterActive,
        activeChapterId,
        activeChapter,
        chaptersWithContents,
      }),
    [
      summativeRes,
      isSummativeFilterActive,
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
        labelIndex,
        title: sub?.title || `Nilai ${labelIndex}`,
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
    const subIds = new Set();
    summativeTemplateColumns.forEach((column) => {
      const explicitSubId = Number(
        column?.subchapterId ?? column?.subchapter_id ?? column?.scoreKey,
      );
      if (Number.isFinite(explicitSubId) && explicitSubId > 0) {
        subIds.add(explicitSubId);
      }
    });
    if (!subIds.size) return 1;
    return Math.max(...Array.from(subIds)) + 1;
  }, [isSummativeFilterActive, summativeTemplateColumns]);

  useEffect(() => {
    if (gradingTab !== "sumatif") return;
    if (!summativeMonthName || !summativeChapterId) {
      setDeletedSummativeScoreKeys([]);
      setStudentInputs((prev) =>
        prev.map((student) => ({
          ...student,
          summary: {
            ...student.summary,
            sumatif: 0,
          },
          summativeScores: {},
        })),
      );
      setIsSummativeDirty(false);
    }
  }, [gradingTab, summativeMonthName, summativeChapterId]);

  useEffect(() => {
    setDeletedSummativeScoreKeys([]);
  }, [classId, gradingTab, summativeChapterId, summativeMonthName]);

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
          const parsedSubId = extractSummativeSubId(entry);
          const scoreKey = isSummativeFilterActive
            ? (parsedSubId ?? "default")
            : entry.type ||
              `${entry.month || "M00"}-B${entry.chapter_id ?? "0"}-S${
                parsedSubId ?? "0"
              }`;
          nextScores[scoreKey] = {
            score_written: entry.score_written ?? 0,
            score_skill: entry.score_skill ?? 0,
            final_score:
              entry.final_score ??
              buildSummativeFinal(entry.score_written, entry.score_skill),
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
            sumatif: isSummativeFilterActive
              ? (record.score ?? getSummativeAverageFromScores(nextScores))
              : student.summary.sumatif,
          },
          summativeScores: nextScores,
        };
      }),
    );
    setIsSummativeDirty(false);
  }, [summativeRes, isSummativeFilterActive]);

  const {
    data: finalRes,
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
    if (!subject?.id || !classId || !formativeMonthName || !formativeChapterId) {
      message.error("Pilih kelas, bulan, dan bab formatif terlebih dahulu.");
      return;
    }

    const targetColumn = formativeTemplateColumns.find(
      (column) => String(column?.scoreKey ?? column?.id ?? "").trim() === normalizedKey,
    );
    const subchapterId = Number(
      targetColumn?.subchapterId ?? targetColumn?.subchapter_id ?? normalizedKey,
    );
    if (!Number.isFinite(subchapterId) || subchapterId <= 0) {
      message.error("Kolom formatif tidak dapat dihapus.");
      return;
    }

    const items = studentInputs.map((student) => ({
      student_id: student.student_id,
      subchapter_id: subchapterId,
      score: null,
    }));

    const loadingKey = `delete-formatif-${normalizedKey}`;
    message.loading({
      key: loadingKey,
      content: `Menghapus ${targetColumn?.title || "kolom formatif"}...`,
      duration: 0,
    });

    try {
      const res = await submitFormative({
        subject_id: subject.id,
        class_id: classId,
        month: formativeMonthName,
        semester: formativeSemester,
        chapter_id: formativeChapterId,
        items,
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

  const handleSummativeChange = (index, subchapterId, field, value) => {
    setStudentInputs((prev) => {
      const next = [...prev];
      const current = next[index] || {};
      const scoreKey = subchapterId ?? "default";
      const currentScores = current.summativeScores || {};
      const currentScoreObj = currentScores[scoreKey] || {};
      const normalizedValue =
        value === null || value === undefined || value === ""
          ? null
          : Number(value);
      const nextScoreObj = {
        ...currentScoreObj,
        [field]: normalizedValue,
      };
      nextScoreObj.final_score = buildSummativeFinal(
        nextScoreObj.score_written,
        nextScoreObj.score_skill,
      );
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
    if (!subject?.id || !classId || !summativeMonthName || !summativeChapterId) {
      message.error("Pilih kelas, bulan, dan bab sumatif terlebih dahulu.");
      return;
    }

    const targetColumn = summativeTemplateColumns.find(
      (column) =>
        String(column?.scoreKey ?? column?.id ?? "").trim() === normalizedKey,
    );
    const subchapterId = Number(
      targetColumn?.subchapterId ?? targetColumn?.subchapter_id ?? normalizedKey,
    );
    if (!Number.isFinite(subchapterId) || subchapterId <= 0) {
      message.error("Kolom sumatif tidak dapat dihapus.");
      return;
    }

    const items = studentInputs.map((student) => ({
      student_id: student.student_id,
      subchapter_id: subchapterId,
      score_written: null,
      score_skill: null,
    }));

    const loadingKey = `delete-sumatif-${normalizedKey}`;
    message.loading({
      key: loadingKey,
      content: `Menghapus ${targetColumn?.title || "kolom sumatif"}...`,
      duration: 0,
    });

    try {
      const res = await submitSummative({
        subject_id: subject.id,
        class_id: classId,
        month: summativeMonthName,
        semester: summativeSemester,
        chapter_id: summativeChapterId,
        items,
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
      });
    }
    if (!activeChapterId) return [];

    const activeSubchapterIndexMap = new Map(
      (activeChapter?.contents || []).map((subchapter, index) => [
        Number(subchapter.id),
        index + 1,
      ]),
    );
    const columns = new Map();

    students.forEach((student) => {
      (student?.scores || []).forEach((score) => {
        const subchapterId = extractSummativeSubId(score);
        if (!Number.isFinite(subchapterId) || subchapterId <= 0) return;
        const scoreKey = String(subchapterId);
        if (columns.has(scoreKey)) return;

        const labelIndex =
          activeSubchapterIndexMap.get(subchapterId) || columns.size + 1;
        columns.set(scoreKey, {
          id: scoreKey,
          scoreKey,
          subchapterId,
          labelIndex,
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
    if (!formativeMonthName || !formativeChapterId) {
      message.warning("Pilih bulan dan bab formatif terlebih dahulu.");
      return;
    }
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
      const newValue = student.formatifScores?.__new;
      row["Input Nilai"] =
        newValue === null || newValue === undefined ? "" : newValue;
      return row;
    });
    const worksheet = XLSX.utils.json_to_sheet(templateRows, {
      header: headers,
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Formatif");
    const className =
      classes.find((item) => String(item.id) === String(classId))?.name ||
      "Kelas";
    const chapterName =
      chapters.find((item) => String(item.id) === String(formativeChapterId))
        ?.title || "Bab";
    const monthLabel = formativeMonthName ? `_${formativeMonthName}` : "";
    const safeName =
      `Template_Nilai_Formatif_${className}_${chapterName}_InputNilai${monthLabel}`.replace(
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

  const handleImportFormativeExcel = (file) => {
    if (!formativeMonthName || !formativeChapterId) {
      message.warning(
        "Pilih bulan dan bab formatif terlebih dahulu sebelum upload.",
      );
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

          const nextScores = {};
          Object.entries(normalizedRow).forEach(([key, value]) => {
            if (value === null || value === undefined || value === "") return;
            if (formativeTemplateHeaderMap.has(key)) {
              nextScores[formativeTemplateHeaderMap.get(key)] =
                normalizeScoreValue(value);
              return;
            }
            if (!/^nilai\s*\d+$/i.test(key)) return;
            const match = key.match(/\d+/);
            const index = match ? Number(match[0]) : null;
            if (!index) return;
            nextScores[String(index)] = normalizeScoreValue(value);
          });
          const inputValue =
            normalizedRow["input nilai"] ??
            normalizedRow.nilai ??
            normalizedRow.score ??
            normalizedRow.formatif ??
            null;
          if (
            inputValue !== null &&
            inputValue !== undefined &&
            inputValue !== ""
          ) {
            nextScores.__new = normalizeScoreValue(inputValue);
          }
          if (Object.keys(nextScores).length) {
            updates.set(nis, nextScores);
          }
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
      } catch (error) {
        message.error("Gagal membaca file Excel.");
      }
    };
    reader.readAsArrayBuffer(file);
    return false;
  };

  const handleDownloadSummativeTemplate = () => {
    if (!summativeMonthName || !summativeChapterId) {
      message.warning("Pilih bulan dan bab sumatif terlebih dahulu.");
      return;
    }
    if (!studentInputs.length) {
      message.warning("Belum ada data siswa untuk dibuatkan template.");
      return;
    }
    const headers = ["NIS", "Nama"];
    visibleSummativeColumns.forEach((column) => {
      headers.push(`${column.title} - Tertulis`);
      headers.push(`${column.title} - Praktik`);
    });
    headers.push("Nilai Tertulis");
    headers.push("Nilai Praktik");
    const templateRows = studentInputs.map((student) => {
      const row = {
        NIS: student.nis || "",
        Nama: student.name || "",
      };
      visibleSummativeColumns.forEach((column) => {
        const scoreObj = student.summativeScores?.[column.scoreKey] || {};
        row[`${column.title} - Tertulis`] =
          scoreObj.score_written === null || scoreObj.score_written === undefined
            ? ""
            : scoreObj.score_written;
        row[`${column.title} - Praktik`] =
          scoreObj.score_skill === null || scoreObj.score_skill === undefined
            ? ""
            : scoreObj.score_skill;
      });
      row["Nilai Tertulis"] =
        student.summativeScores?.__new?.score_written === null ||
        student.summativeScores?.__new?.score_written === undefined
          ? ""
          : student.summativeScores.__new.score_written;
      row["Nilai Praktik"] =
        student.summativeScores?.__new?.score_skill === null ||
        student.summativeScores?.__new?.score_skill === undefined
          ? ""
          : student.summativeScores.__new.score_skill;
      return row;
    });
    const worksheet = XLSX.utils.json_to_sheet(templateRows, {
      header: headers,
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Sumatif");
    const className =
      classes.find((item) => String(item.id) === String(classId))?.name ||
      "Kelas";
    const chapterName =
      chapters.find((item) => String(item.id) === String(summativeChapterId))
        ?.title || "Bab";
    const monthLabel = summativeMonthName ? `_${summativeMonthName}` : "";
    const safeName =
      `Template_Nilai_Sumatif_${className}_${chapterName}_InputNilai${monthLabel}`.replace(
        /[\/:*?"<>|]/g,
        "-",
      );
    XLSX.writeFile(workbook, `${safeName}.xlsx`);
  };

  const handleImportSummativeExcel = (file) => {
    if (!summativeMonthName || !summativeChapterId) {
      message.warning("Pilih bulan dan bab sumatif terlebih dahulu sebelum upload.");
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

          const nextScores = {};
          visibleSummativeColumns.forEach((column) => {
            const writtenValue =
              normalizedRow[`${String(column.title || "").toLowerCase()} - tertulis`] ??
              normalizedRow[`nilai ${column.labelIndex} - tertulis`] ??
              normalizedRow[`nilai ${column.labelIndex} tertulis`];
            const skillValue =
              normalizedRow[`${String(column.title || "").toLowerCase()} - praktik`] ??
              normalizedRow[`${String(column.title || "").toLowerCase()} - praktek`] ??
              normalizedRow[`nilai ${column.labelIndex} - praktik`] ??
              normalizedRow[`nilai ${column.labelIndex} - praktek`] ??
              normalizedRow[`nilai ${column.labelIndex} praktik`] ??
              normalizedRow[`nilai ${column.labelIndex} praktek`];
            if (
              writtenValue === null ||
              writtenValue === undefined ||
              writtenValue === ""
            ) {
              if (
                skillValue === null ||
                skillValue === undefined ||
                skillValue === ""
              ) {
                return;
              }
            }
            const scoreWritten =
              writtenValue === null || writtenValue === undefined || writtenValue === ""
                ? null
                : normalizeScoreValue(writtenValue);
            const scoreSkill =
              skillValue === null || skillValue === undefined || skillValue === ""
                ? null
                : normalizeScoreValue(skillValue);
            nextScores[column.scoreKey] = {
              score_written: scoreWritten,
              score_skill: scoreSkill,
              final_score: buildSummativeFinal(scoreWritten, scoreSkill),
            };
          });

          const scoreWrittenRaw =
            normalizedRow["nilai tertulis"] ??
            normalizedRow.tertulis ??
            normalizedRow["score_written"] ??
            normalizedRow["nilai tulis"];
          const scoreSkillRaw =
            normalizedRow["nilai praktik"] ??
            normalizedRow.praktik ??
            normalizedRow.praktek ??
            normalizedRow["score_skill"];
          if (
            scoreWrittenRaw !== null &&
            scoreWrittenRaw !== undefined &&
            scoreWrittenRaw !== "" ||
            scoreSkillRaw !== null &&
            scoreSkillRaw !== undefined &&
            scoreSkillRaw !== ""
          ) {
            const scoreWritten =
              scoreWrittenRaw === null ||
              scoreWrittenRaw === undefined ||
              scoreWrittenRaw === ""
                ? null
                : normalizeScoreValue(scoreWrittenRaw);
            const scoreSkill =
              scoreSkillRaw === null ||
              scoreSkillRaw === undefined ||
              scoreSkillRaw === ""
                ? null
                : normalizeScoreValue(scoreSkillRaw);
            nextScores.__new = {
              score_written: scoreWritten,
              score_skill: scoreSkill,
              final_score: buildSummativeFinal(scoreWritten, scoreSkill),
            };
          }

          if (Object.keys(nextScores).length) {
            updates.set(nis, nextScores);
          }
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
      } catch (error) {
        message.error("Gagal membaca file Excel.");
      }
    };
    reader.readAsArrayBuffer(file);
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

  const handleSaveFormative = async () => {
    if (
      !subject?.id ||
      !classId ||
      !formativeMonthName ||
      !formativeChapterId
    ) {
      message.warning("Pilih bulan dan bab formatif terlebih dahulu.");
      return;
    }
    const hasMeaningfulNewFormativeScore = studentInputs.some((student) => {
      const newRaw = student.formatifScores?.__new;
      if (newRaw === null || newRaw === undefined || newRaw === "") return false;
      const newValue = normalizeScoreValue(newRaw);
      return newValue > 0;
    });

    if (hasMeaningfulNewFormativeScore && !nextFormatifIndex) {
      message.warning("Nilai formatif baru belum bisa ditentukan.");
      return;
    }

    const items = [];
    studentInputs.forEach((student) => {
      formativeTemplateColumns.forEach((sub) => {
        const scoreKey = String(
          sub?.scoreKey ?? sub?.slotKey ?? sub?.id ?? sub?.key ?? sub?.value ?? "",
        );
        const rawScore = student.formatifScores?.[scoreKey];
        const scoreValue =
          rawScore === null || rawScore === undefined
            ? null
            : normalizeScoreValue(rawScore);
        const subchapterId = Number(
          sub?.subchapterId ??
            sub?.subchapter_id ??
            scoreKey,
        );
        if (!Number.isFinite(subchapterId) || subchapterId <= 0) {
          return;
        }
        items.push({
          student_id: student.student_id,
          subchapter_id: subchapterId,
          score: scoreValue,
        });
      });

      const newRaw = student.formatifScores?.__new;
      if (
        hasMeaningfulNewFormativeScore &&
        newRaw !== null &&
        newRaw !== undefined &&
        newRaw !== ""
      ) {
        const newValue = normalizeScoreValue(newRaw);
        items.push({
          student_id: student.student_id,
          subchapter_id: nextFormatifIndex,
          score: newValue,
        });
      }
    });

    try {
      const res = await submitFormative({
        subject_id: subject.id,
        class_id: classId,
        month: formativeMonthName,
        semester: formativeSemester,
        chapter_id: formativeChapterId,
        items,
      }).unwrap();
      message.success(res?.message || "Nilai formatif tersimpan.");
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
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan nilai formatif.");
    }
  };

  const handleSaveSummative = async () => {
    if (
      !subject?.id ||
      !classId ||
      !summativeMonthName ||
      !summativeChapterId
    ) {
      message.warning("Pilih bulan dan bab sumatif terlebih dahulu.");
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
      const newSkill =
        newObj.score_skill === null ||
        newObj.score_skill === undefined ||
        newObj.score_skill === ""
          ? null
          : normalizeScoreValue(newObj.score_skill);
      return hasPositiveSummativeScore(newWritten, newSkill);
    });

    if (hasMeaningfulNewSummativeScore && !nextSumatifIndex) {
      message.warning("Nilai sumatif baru belum bisa ditentukan.");
      return;
    }

    const items = [];
    studentInputs.forEach((student) => {
      summativeTemplateColumns.forEach((sub) => {
        const scoreKey = String(
          sub?.scoreKey ?? sub?.slotKey ?? sub?.id ?? sub?.key ?? sub?.value ?? "",
        );
        const rawObj = student.summativeScores?.[scoreKey] || {};
        const scoreWritten =
          rawObj.score_written === null ||
          rawObj.score_written === undefined ||
          rawObj.score_written === ""
            ? null
            : normalizeScoreValue(rawObj.score_written);
        const scoreSkill =
          rawObj.score_skill === null ||
          rawObj.score_skill === undefined ||
          rawObj.score_skill === ""
            ? null
            : normalizeScoreValue(rawObj.score_skill);
        const subchapterId = Number(
          sub?.subchapterId ??
            sub?.subchapter_id ??
            scoreKey,
        );
        if (!Number.isFinite(subchapterId) || subchapterId <= 0) {
          return;
        }
        if (!hasPositiveSummativeScore(scoreWritten, scoreSkill)) {
          return;
        }
        items.push({
          student_id: student.student_id,
          subchapter_id: subchapterId,
          score_written: scoreWritten,
          score_skill: scoreSkill,
        });
      });

      const newObj = student.summativeScores?.__new || {};
      const newWritten =
        newObj.score_written === null ||
        newObj.score_written === undefined ||
        newObj.score_written === ""
          ? null
          : normalizeScoreValue(newObj.score_written);
      const newSkill =
        newObj.score_skill === null ||
        newObj.score_skill === undefined ||
        newObj.score_skill === ""
          ? null
          : normalizeScoreValue(newObj.score_skill);
      if (!hasMeaningfulNewSummativeScore) return;
      if (!hasPositiveSummativeScore(newWritten, newSkill)) return;
      items.push({
        student_id: student.student_id,
        subchapter_id: nextSumatifIndex,
        score_written: newWritten,
        score_skill: newSkill,
      });
    });
    if (!items.length) {
      message.warning("Belum ada nilai sumatif yang dapat disimpan.");
      return;
    }

    try {
      const res = await submitSummative({
        subject_id: subject.id,
        class_id: classId,
        month: summativeMonthName,
        semester: summativeSemester,
        chapter_id: summativeChapterId,
        items,
      }).unwrap();
      message.success(res?.message || "Nilai sumatif tersimpan.");
      setStudentInputs((prev) =>
        prev.map((student) => ({
          ...student,
          summativeScores: {
            ...(student.summativeScores || {}),
            __new: { score_written: null, score_skill: null, final_score: null },
          },
        })),
      );
      setIsSummativeDirty(false);
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
      <Flex vertical gap="middle">
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
        <Flex vertical gap={16}>
          <Card
            style={{ borderRadius: 14, border: "1px solid #f0f0f0" }}
            styles={{ body: { padding: 0 } }}
          >
            <Flex
              align="center"
              justify="space-between"
              wrap="wrap"
              gap={12}
              style={{ padding: 16 }}
            >
              <div>
                <Typography.Title level={5} style={{ margin: 0 }}>
                  Input Penilaian
                </Typography.Title>
                <Typography.Text type="secondary">
                  Pilih tab penilaian, atur filter bulan/bab/subbab, lalu isi
                  nilai siswa.
                </Typography.Text>
              </div>
              {gradingTab === "sikap" && (
                <Flex align="center" gap={8} wrap="wrap">
                  <Button
                    icon={<Download size={16} />}
                    onClick={handleDownloadAttitudeTemplate}
                  >
                    Template Sikap
                  </Button>
                  <Upload
                    accept=".xlsx,.xls"
                    showUploadList={false}
                    beforeUpload={handleImportAttitudeExcel}
                  >
                    <Button icon={<UploadIcon size={16} />}>
                      Upload Excel
                    </Button>
                  </Upload>
                  <Button
                    type="primary"
                    icon={<Save size={16} />}
                    loading={isSubmittingAttitude}
                    disabled={!isAttitudeDirty}
                    onClick={handleSaveAttitude}
                  >
                    Simpan Sikap
                  </Button>
                </Flex>
              )}
              {gradingTab === "formatif" && (
                <Flex align="center" gap={8} wrap="wrap">
                  <Button
                    icon={<Download size={16} />}
                    onClick={handleDownloadFormativeTemplate}
                  >
                    Template Formatif
                  </Button>
                  <Upload
                    accept=".xlsx,.xls"
                    showUploadList={false}
                    beforeUpload={handleImportFormativeExcel}
                  >
                    <Button icon={<UploadIcon size={16} />}>
                      Upload Excel
                    </Button>
                  </Upload>
                  <Button
                    type="primary"
                    icon={<Save size={16} />}
                    loading={isSubmittingFormative}
                    disabled={!isFormativeDirty}
                    onClick={handleSaveFormative}
                  >
                    Simpan Formatif
                  </Button>
                </Flex>
              )}
              {gradingTab === "sumatif" && (
                <Flex align="center" gap={8} wrap="wrap">
                  <Button
                    icon={<Download size={16} />}
                    onClick={handleDownloadSummativeTemplate}
                  >
                    Template Sumatif
                  </Button>
                  <Upload
                    accept=".xlsx,.xls"
                    showUploadList={false}
                    beforeUpload={handleImportSummativeExcel}
                  >
                    <Button icon={<UploadIcon size={16} />}>
                      Upload Excel
                    </Button>
                  </Upload>
                  <Button
                    type="primary"
                    icon={<Save size={16} />}
                    loading={isSubmittingSummative}
                    disabled={!isSummativeDirty}
                    onClick={handleSaveSummative}
                  >
                    Simpan Sumatif
                  </Button>
                </Flex>
              )}
              {gradingTab === "ujianAkhir" && (
                <Flex align="center" gap={8} wrap="wrap">
                  <Button
                    icon={<Download size={16} />}
                    onClick={handleDownloadFinalTemplate}
                  >
                    Template Ujian Akhir
                  </Button>
                  <Upload
                    accept=".xlsx,.xls"
                    showUploadList={false}
                    beforeUpload={handleImportFinalExcel}
                  >
                    <Button icon={<UploadIcon size={16} />}>
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
                  >
                    Hapus Nilai
                  </Button>
                  <Button
                    type="primary"
                    icon={<Save size={16} />}
                    loading={isSubmittingFinal}
                    disabled={!isFinalDirty}
                    onClick={handleSaveFinal}
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
              style={{ padding: "0 16px 16px" }}
            />
          </Card>
        </Flex>
      ) : (
        <Card
          style={{ borderRadius: 14, border: "1px solid #f0f0f0" }}
          styles={{ body: { padding: 24 } }}
        >
          <Empty description="Belum ada data penilaian pada semester ini." />
        </Card>
      )}
      </Flex>
    </Suspense>
  );
};

export default Grading;

