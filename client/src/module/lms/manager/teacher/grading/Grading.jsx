import React, { useEffect, useMemo, useState } from "react";
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
import GradingHeader from "./components/GradingHeader";
import StudentGradingTable from "./components/StudentGradingTable";
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
  const [semesterKey, setSemesterKey] = useState("semester1");
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

  const semesterLabel =
    semesterKey === "semester1" ? "Semester 1" : "Semester 2";
  const semesterValue = semesterKey === "semester1" ? 1 : 2;

  const semesterTabs = [
    { key: "semester1", label: "Semester 1" },
    { key: "semester2", label: "Semester 2" },
  ];

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
  const [tabFilters, setTabFilters] = useState({
    sikap: { monthId: undefined, chapterId: undefined },
    formatif: { monthId: undefined, chapterId: undefined },
    sumatif: { monthId: undefined, chapterId: undefined },
  });

  const currentMonthValue = useMemo(() => dayjs().format("YYYY-MM"), []);
  const monthNameFromValue = (value) => {
    if (!value) return "";
    const match = String(value).match(/^(\d{4})-(\d{2})$/);
    if (!match) return String(value);
    const monthIndex = Number(match[2]) - 1;
    const monthNames = [
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
    return monthNames[monthIndex] || String(value);
  };

  useEffect(() => {
    setTabFilters((prev) => ({
      sikap: {
        ...prev.sikap,
        monthId: prev.sikap.monthId || currentMonthValue,
      },
      formatif: {
        ...prev.formatif,
        monthId: prev.formatif.monthId || currentMonthValue,
      },
      sumatif: {
        ...prev.sumatif,
        monthId: prev.sumatif.monthId || currentMonthValue,
      },
    }));
  }, [currentMonthValue]);

  const attitudeMonth = tabFilters.sikap?.monthId;
  const attitudeMonthName = monthNameFromValue(attitudeMonth);
  const { data: attitudeRes } = useGetGradingAttitudeQuery(
    {
      subjectId: subject?.id,
      classId,
      month: attitudeMonthName,
      semester: semesterValue,
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

  const formativeMonth = tabFilters.formatif?.monthId;
  const formativeMonthName = monthNameFromValue(formativeMonth);
  const formativeChapterId = tabFilters.formatif?.chapterId;
  const isFormativeFilterActive = !!(formativeMonthName && formativeChapterId);
  const { data: formativeRes } = useGetGradingFormativeQuery(
    {
      subjectId: subject?.id,
      classId,
      month: formativeMonthName,
      semester: semesterValue,
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
      }),
    [
      formativeRes,
      isFormativeFilterActive,
      activeChapterId,
      activeChapter,
      chaptersWithContents,
    ],
  );
  const nextFormatifIndex = useMemo(() => {
    if (!isFormativeFilterActive) return null;
    const subIds = new Set();
    (formativeRes?.data?.students || []).forEach((student) => {
      (student.scores || []).forEach((score) => {
        const subId = extractSubIdFromType(score?.type);
        if (subId != null) subIds.add(subId);
      });
    });
    if (!subIds.size) return 1;
    return Math.max(...Array.from(subIds)) + 1;
  }, [formativeRes, isFormativeFilterActive]);

  useEffect(() => {
    if (gradingTab !== "formatif") return;
    if (!formativeMonthName || !formativeChapterId) {
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
          const parsedSubId = extractSubIdFromType(entry.type);
          const scoreKey = isFormativeFilterActive
            ? (parsedSubId ?? "default")
            : entry.type ||
              `${entry.month || "M00"}-B${entry.chapter_id ?? "0"}-S${
                parsedSubId ?? "0"
              }`;
          nextScores[scoreKey] = entry.score ?? 0;
        });
        nextScores.__new = 0;
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

  const summativeMonth = tabFilters.sumatif?.monthId;
  const summativeMonthName = monthNameFromValue(summativeMonth);
  const summativeChapterId = tabFilters.sumatif?.chapterId;
  const isSummativeFilterActive = !!(summativeMonthName && summativeChapterId);
  const { data: summativeRes } = useGetGradingSummativeQuery(
    {
      subjectId: subject?.id,
      classId,
      month: summativeMonthName,
      semester: semesterValue,
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
      buildFormatifSubchapters({
        students: summativeRes?.data?.students || [],
        isFormativeFilterActive: isSummativeFilterActive,
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
  const nextSumatifIndex = useMemo(() => {
    if (!isSummativeFilterActive) return null;
    const subIds = new Set();
    (summativeRes?.data?.students || []).forEach((student) => {
      (student.scores || []).forEach((score) => {
        const subId = extractSummativeSubId(score);
        if (subId != null) subIds.add(subId);
      });
    });
    if (!subIds.size) return 1;
    return Math.max(...Array.from(subIds)) + 1;
  }, [summativeRes, isSummativeFilterActive]);

  useEffect(() => {
    if (gradingTab !== "sumatif") return;
    if (!summativeMonthName || !summativeChapterId) {
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
        nextScores.__new = { score_written: 0, score_skill: 0, final_score: 0 };
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

  const { data: finalRes } = useGetGradingFinalQuery(
    {
      subjectId: subject?.id,
      classId,
      semester: semesterValue,
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
      const nextValue = value === null ? null : (value ?? 0);
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
      const normalizedValue = value === null ? null : (value ?? 0);
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

  const normalizeScoreValue = (value) => {
    const numberValue = Number(value);
    if (Number.isNaN(numberValue)) return 0;
    return Math.max(0, Math.min(100, Math.round(numberValue)));
  };

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
    const headers = ["NIS", "Nama", "Input Nilai"];
    const templateRows = studentInputs.map((student) => {
      const row = {
        NIS: student.nis || "",
        Nama: student.name || "",
      };
      row["Input Nilai"] = student.formatifScores?.__new ?? 0;
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

          const nilaiKeys = Object.keys(normalizedRow).filter((key) =>
            /^nilai\s*\d+$/i.test(key),
          );
          if (nilaiKeys.length) {
            const multiValues = {};
            nilaiKeys.forEach((key) => {
              const match = key.match(/\d+/);
              const index = match ? Number(match[0]) : null;
              if (!index) return;
              const value = normalizedRow[key];
              if (value === null || value === undefined || value === "") return;
              multiValues[index] = normalizeScoreValue(value);
            });
            if (Object.keys(multiValues).length) {
              updates.set(nis, multiValues);
              return;
            }
          }

          const inputValue =
            normalizedRow["input nilai"] ??
            normalizedRow.nilai ??
            normalizedRow.score ??
            normalizedRow.formatif ??
            null;
          if (inputValue != null) {
            updates.set(nis, normalizeScoreValue(inputValue));
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
            if (typeof update === "object" && update !== null) {
              Object.entries(update).forEach(([key, value]) => {
                nextScores[Number(key)] = value;
              });
            } else {
              nextScores.__new = update;
            }
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
    const headers = ["NIS", "Nama", "Nilai Tertulis", "Nilai Praktik"];
    const templateRows = studentInputs.map((student) => ({
      NIS: student.nis || "",
      Nama: student.name || "",
      "Nilai Tertulis": student.summativeScores?.__new?.score_written ?? 0,
      "Nilai Praktik": student.summativeScores?.__new?.score_skill ?? 0,
    }));
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

          const scoreWritten = normalizeScoreValue(
            normalizedRow["nilai tertulis"] ??
              normalizedRow.tertulis ??
              normalizedRow["score_written"] ??
              normalizedRow["nilai tulis"] ??
              0,
          );
          const scoreSkill = normalizeScoreValue(
            normalizedRow["nilai praktik"] ??
              normalizedRow.praktik ??
              normalizedRow.praktek ??
              normalizedRow["score_skill"] ??
              0,
          );

          updates.set(nis, {
            score_written: scoreWritten,
            score_skill: scoreSkill,
            final_score: buildSummativeFinal(scoreWritten, scoreSkill),
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
            const nextScores = {
              ...(student.summativeScores || {}),
              __new: update,
            };
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
    const safeName = `Template_Nilai_UjianAkhir_${className}_Semester${semesterValue}`.replace(
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
        semester: semesterValue,
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
    if (!nextFormatifIndex) {
      message.warning("Nilai formatif baru belum bisa ditentukan.");
      return;
    }

    const items = [];
    studentInputs.forEach((student) => {
      formatifSubchapters.forEach((sub) => {
        const rawScore = student.formatifScores?.[sub.id];
        const scoreValue =
          rawScore === null || rawScore === undefined
            ? null
            : normalizeScoreValue(rawScore);
        const normalizedValue = scoreValue === 0 ? null : scoreValue;
        items.push({
          student_id: student.student_id,
          subchapter_id: sub.id,
          score: normalizedValue,
        });
      });

      const newRaw = student.formatifScores?.__new;
      if (newRaw !== null && newRaw !== undefined && newRaw !== "") {
        const newValue = normalizeScoreValue(newRaw);
        if (newValue === 0) return;
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
        semester: semesterValue,
        chapter_id: formativeChapterId,
        items,
      }).unwrap();
      message.success(res?.message || "Nilai formatif tersimpan.");
      setStudentInputs((prev) =>
        prev.map((student) => ({
          ...student,
          formatifScores: {
            ...(student.formatifScores || {}),
            __new: 0,
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
    if (!nextSumatifIndex) {
      message.warning("Nilai sumatif baru belum bisa ditentukan.");
      return;
    }

    const items = [];
    studentInputs.forEach((student) => {
      sumatifSubchapters.forEach((sub) => {
        const rawObj = student.summativeScores?.[sub.id] || {};
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
        items.push({
          student_id: student.student_id,
          subchapter_id: sub.id,
          score_written: scoreWritten === 0 ? null : scoreWritten,
          score_skill: scoreSkill === 0 ? null : scoreSkill,
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
      if (newWritten == null && newSkill == null) return;
      if (newWritten === 0 && newSkill === 0) return;
      items.push({
        student_id: student.student_id,
        subchapter_id: nextSumatifIndex,
        score_written: newWritten === 0 ? null : newWritten,
        score_skill: newSkill === 0 ? null : newSkill,
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
        semester: semesterValue,
        chapter_id: summativeChapterId,
        items,
      }).unwrap();
      message.success(res?.message || "Nilai sumatif tersimpan.");
      setStudentInputs((prev) =>
        prev.map((student) => ({
          ...student,
          summativeScores: {
            ...(student.summativeScores || {}),
            __new: { score_written: 0, score_skill: 0, final_score: 0 },
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
        semester: semesterValue,
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
        semester: semesterValue,
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
      typeKey={typeKey}
      filters={tabFilters[typeKey]}
      onFilterChange={handleFilterChange}
      onStudentChange={handleStudentChange}
      onFormativeChange={handleFormativeChange}
      formativeSubchapters={formatifSubchapters}
      onSummativeChange={handleSummativeChange}
      summativeSubchapters={sumatifSubchapters}
      onAttitudeChange={handleAttitudeChange}
      showFilters={typeKey !== "ujianAkhir"}
    />
  );

  return (
    <Flex vertical gap="middle">
      <GradingHeader
        subject={subject}
        unit={unit}
        period={period}
        semesterLabel={semesterLabel}
        classes={classes}
        classId={classId}
        onClassChange={(value) => setClassId(value)}
      />

      <Card
        style={{ borderRadius: 14, border: "1px solid #f0f0f0" }}
        styles={{ body: { padding: 12 } }}
      >
        <Flex align="center" justify="space-between" wrap="wrap" gap={12}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <Tabs
              activeKey={semesterKey}
              items={semesterTabs}
              onChange={setSemesterKey}
            />
          </div>
          <Select
            value={classId}
            placeholder="Pilih kelas"
            options={classes.map((item) => ({
              label: item.name,
              value: item.id,
            }))}
            onChange={(value) => setClassId(value)}
            disabled={!classes.length}
            style={{ minWidth: 220 }}
          />
        </Flex>
      </Card>

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
  );
};

export default Grading;
