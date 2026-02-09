import React, { useEffect, useMemo, useState } from "react";
import { Button, Card, Empty, Flex, Tabs, Typography, message, Upload } from "antd";
import { Download, Save, Upload as UploadIcon } from "lucide-react";
import * as XLSX from "xlsx";
import GradingHeader from "./components/GradingHeader";
import StudentGradingTable from "./components/StudentGradingTable";
import {
  useGetGradingClassesQuery,
  useGetGradingMetaQuery,
  useGetGradingAttitudeQuery,
  useGetGradingStudentsQuery,
  useSubmitGradingAttitudeMutation,
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
    if (!classId || !classes.some((item) => String(item.id) === String(classId))) {
      setClassId(classes[0]?.id);
    }
  }, [classes, classId]);

  const { data: studentRes } = useGetGradingStudentsQuery(
    { subjectId: subject?.id, classId },
    { skip: !subject?.id || !classId },
  );

  const unit = unitOptions[0] || null;
  const period = periodOptions[0] || null;

  const semesterLabel = semesterKey === "semester1" ? "Semester 1" : "Semester 2";

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
  const [tabFilters, setTabFilters] = useState({
    sikap: { monthId: undefined, chapterId: undefined, subchapterId: undefined },
    formatif: { monthId: undefined, chapterId: undefined, subchapterId: undefined },
    sumatif: { monthId: undefined, chapterId: undefined, subchapterId: undefined },
  });

  const currentDate = useMemo(() => new Date(), []);
  const currentMonthName = currentDate.toLocaleString("id-ID", {
    month: "long",
  });
  const currentYear = currentDate.getFullYear();

  useEffect(() => {
    setTabFilters((prev) => ({
      sikap: {
        ...prev.sikap,
        monthId: prev.sikap.monthId || currentMonthName,
      },
      formatif: {
        ...prev.formatif,
        monthId: prev.formatif.monthId || currentMonthName,
      },
      sumatif: {
        ...prev.sumatif,
        monthId: prev.sumatif.monthId || currentMonthName,
      },
    }));
  }, [currentMonthName]);

  const attitudeMonth = tabFilters.sikap?.monthId;
  const { data: attitudeRes } = useGetGradingAttitudeQuery(
    { subjectId: subject?.id, classId, month: attitudeMonth },
    {
      skip:
        gradingTab !== "sikap" ||
        !subject?.id ||
        !classId ||
        !attitudeMonth,
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

  const [submitAttitude, { isLoading: isSubmittingAttitude }] =
    useSubmitGradingAttitudeMutation();

  useEffect(() => {
    if (!studentRes?.data?.students) {
      setStudentInputs([]);
      setIsAttitudeDirty(false);
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
  }, [studentRes]);

  useEffect(() => {
    if (!attitudeRes?.data?.students) return;
    const attitudeMap = new Map(
      attitudeRes.data.students.map((item) => [
        String(item.student_id),
        item,
      ]),
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
  };

  const handleAttitudeChange = (index, key, value) => {
    setStudentInputs((prev) => {
      const next = [...prev];
      const current = next[index] || {};
      const attitude = current.attitude || {};
      const isNote = key === "teacher_note";
      const nextValue = isNote ? value || "" : value ?? 0;
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

  const normalizeScoreValue = (value) => {
    const numberValue = Number(value);
    if (Number.isNaN(numberValue)) return 0;
    return Math.max(0, Math.min(100, Math.round(numberValue)));
  };

  const handleDownloadAttitudeTemplate = () => {
    const headers = [
      "NIS",
      "Nama",
      "Kinerja",
      "Kedisiplinan",
      "Keaktifan",
      "Percaya Diri",
      "Catatan",
    ];
    const templateRows = [
      {
        NIS: "123456",
        Nama: "Contoh Siswa",
        Kinerja: 80,
        Kedisiplinan: 85,
        Keaktifan: 90,
        "Percaya Diri": 88,
        Catatan: "Catatan singkat",
      },
      {
        NIS: "123457",
        Nama: "Siswa Kedua",
        Kinerja: 75,
        Kedisiplinan: 80,
        Keaktifan: 70,
        "Percaya Diri": 78,
        Catatan: "",
      },
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateRows, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template Sikap");
    XLSX.writeFile(workbook, "Template_Nilai_Sikap.xlsx");
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
          const normalizedRow = Object.entries(row).reduce((acc, [key, value]) => {
            const normalizedKey = String(key || "").trim().toLowerCase();
            if (normalizedKey) acc[normalizedKey] = value;
            return acc;
          }, {});

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

  const handleFilterChange = (typeKey, field, value) => {
    setTabFilters((prev) => {
      const current = prev[typeKey] || {};
      return {
        ...prev,
        [typeKey]: {
          ...current,
          [field]: value,
          ...(field === "chapterId" ? { subchapterId: undefined } : {}),
        },
      };
    });
  };

  const handleSaveAttitude = async () => {
    if (!subject?.id || !classId || !attitudeMonth) {
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
        month: attitudeMonth,
        items,
      }).unwrap();
      message.success(res?.message || "Nilai sikap tersimpan.");
      setIsAttitudeDirty(false);
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan nilai sikap.");
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
      onAttitudeChange={handleAttitudeChange}
      monthYear={currentYear}
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
        <Tabs
          activeKey={semesterKey}
          items={semesterTabs}
          onChange={setSemesterKey}
        />
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
                  Pilih tab penilaian, atur filter bulan/bab/subbab, lalu isi nilai siswa.
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
                    <Button icon={<UploadIcon size={16} />}>Upload Excel</Button>
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
