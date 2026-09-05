import React, { Suspense, lazy, useMemo, useState } from "react";
import { Grid, Tabs, Tooltip } from "antd";
import {
  BookOpen,
  ChartBar,
  ChartScatter,
  CheckCircle,
  ListTodo,
  NotebookPen,
} from "lucide-react";
import LoadApp from "../../../../components/loader/LoadApp";

const Learning = lazy(() => import("./learnig/Learning"));
const Attendance = lazy(() => import("./attendance/Attendance"));
const Grading = lazy(() => import("./grading/Grading"));
const Recap = lazy(() => import("../recap/Recap"));
const TaskView = lazy(() => import("./task/TaskView"));
const TeacherJournal = lazy(() => import("./journal/TeacherJournal"));

const { useBreakpoint } = Grid;

const TAB_META = [
  {
    key: "1",
    fullLabel: "Pembelajaran",
    shortLabel: "Belajar",
    icon: BookOpen,
  },
  {
    key: "6",
    fullLabel: "Jurnal Pembelajaran",
    shortLabel: "Jurnal",
    icon: NotebookPen,
  },
  {
    key: "5",
    fullLabel: "Penugasan",
    shortLabel: "Tugas",
    icon: ListTodo,
  },
  {
    key: "2",
    fullLabel: "Absen",
    shortLabel: "Absen",
    icon: CheckCircle,
  },
  {
    key: "3",
    fullLabel: "Penilaian",
    shortLabel: "Nilai",
    icon: ChartBar,
  },
  {
    key: "4",
    fullLabel: "Rekapitulasi",
    shortLabel: "Rekap",
    icon: ChartScatter,
  },
];

const renderTabLabel = ({ fullLabel, shortLabel, icon: Icon }, mode) => {
  if (mode === "icon") {
    return (
      <Tooltip title={fullLabel} placement='bottom'>
        <span
          style={{
            display: "inline-flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            minWidth: 0,
            width: "100%",
            lineHeight: 1.1,
          }}
        >
          <Icon size={16} />
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              maxWidth: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {shortLabel}
          </span>
        </span>
      </Tooltip>
    );
  }

  if (mode === "short") {
    return shortLabel;
  }

  return fullLabel;
};

const TeacherView = ({ subjectId, subject }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [activeKey, setActiveKey] = useState("1");

  // icon+caption keeps all 6 tabs visible below md (~768px)
  const labelMode = isMobile ? "icon" : "full";

  const tabChildren = useMemo(
    () => ({
      1: (
        <Suspense fallback={<LoadApp />}>
          <Learning subjectId={subjectId} subject={subject} />
        </Suspense>
      ),
      6: (
        <Suspense fallback={<LoadApp />}>
          <TeacherJournal subjectId={subjectId} subject={subject} />
        </Suspense>
      ),
      5: (
        <Suspense fallback={<LoadApp />}>
          <TaskView subjectId={subjectId} subject={subject} />
        </Suspense>
      ),
      2: (
        <Suspense fallback={<LoadApp />}>
          <Attendance subjectId={subjectId} subject={subject} />
        </Suspense>
      ),
      3: (
        <Suspense fallback={<LoadApp />}>
          <Grading subject={subject} subjectId={subjectId} />
        </Suspense>
      ),
      4: (
        <Suspense fallback={<LoadApp />}>
          <Recap subject={subject} subjectId={subjectId} />
        </Suspense>
      ),
    }),
    [subject, subjectId],
  );

  const items = TAB_META.map((tab) => ({
    key: tab.key,
    icon:
      labelMode === "icon" ? null : (
        <tab.icon size={16} style={{ flexShrink: 0 }} />
      ),
    label: renderTabLabel(tab, labelMode),
    children: tabChildren[tab.key],
  }));

  return (
    <div style={{ width: "100%", minWidth: 0 }}>
      <Tabs
        className={
          labelMode === "icon"
            ? "teacher-view-tabs teacher-view-tabs--compact"
            : "teacher-view-tabs"
        }
        items={items}
        activeKey={activeKey}
        onChange={setActiveKey}
        size={isMobile ? "middle" : "large"}
        tabBarGutter={labelMode === "icon" ? 0 : isMobile ? 8 : 16}
        style={{ width: "100%" }}
        tabBarStyle={{
          marginBottom: isMobile ? 12 : 16,
          width: "100%",
        }}
      />
      <style>{`
        .teacher-view-tabs .ant-tabs-nav {
          margin-bottom: 0;
        }
        .teacher-view-tabs .ant-tabs-nav-wrap {
          flex: 1 1 auto !important;
          overflow: visible !important;
        }
        .teacher-view-tabs .ant-tabs-nav-list {
          transform: none !important;
        }
        .teacher-view-tabs--compact .ant-tabs-nav-list {
          width: 100%;
          display: flex;
        }
        .teacher-view-tabs--compact .ant-tabs-tab {
          flex: 1 1 0;
          justify-content: center;
          margin: 0 !important;
          padding-inline: 4px !important;
          min-width: 0;
        }
        .teacher-view-tabs--compact .ant-tabs-tab-btn {
          width: 100%;
          justify-content: center;
        }
        .teacher-view-tabs--compact .ant-tabs-nav-operations {
          display: none !important;
        }
      `}</style>
    </div>
  );
};

export default TeacherView;
