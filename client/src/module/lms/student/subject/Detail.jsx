import React from "react";
import { Button } from "antd";
import { ArrowLeft, BarChart3, BookOpen, ListTodo } from "lucide-react";
import LearningTab from "./components/LearningTab";
import ReportTab from "./components/ReportTab";
import StudentTaskView from "../task/StudentTaskView";
import { PageTabs } from "../../../../components/ui/muse";

const Detail = ({ subject, classId, onBack }) => {
  const classLabel = subject?.class_name
    ? `Kelas ${subject.class_name}`
    : classId
      ? "Kelas aktif"
      : "Kelas belum tersedia";

  const description = [
    subject?.code || "Tanpa kode",
    subject?.category_name || "Umum",
    subject?.branch_name,
    classLabel,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <PageTabs
      title={subject?.name || "Mata Pelajaran"}
      description={description}
      extra={
        <Button icon={<ArrowLeft size={16} />} onClick={onBack}>
          Kembali ke daftar
        </Button>
      }
      items={[
        {
          key: "learning",
          label: "Pembelajaran",
          icon: <BookOpen />,
          render: () => <LearningTab subjectId={subject?.id} classId={classId} />,
        },
        {
          key: "task",
          label: "Tugas",
          icon: <ListTodo />,
          render: () => <StudentTaskView subjectId={subject?.id} classId={classId} />,
        },
        {
          key: "report",
          label: "Laporan Belajar",
          icon: <BarChart3 />,
          render: () => <ReportTab subject={subject} classId={classId} />,
        },
      ]}
    />
  );
};

export default Detail;
