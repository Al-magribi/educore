import React from "react";
import { motion } from "framer-motion";
import { Grid, Tabs } from "antd";
import { BookOpen, GitBranch, Layers } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import CategoryPanel from "./CategoryPanel";
import BranchPanel from "./BranchPanel";
import SubjectTable from "./SubjectTable";
import {
  useGetSubjectCategoriesQuery,
  useGetSubjectBranchesQuery,
  useGetSubjectsQuery,
} from "../../../../service/academic/ApiSubject";
import { StatCard } from "../../../../components/ui/muse";

const { useBreakpoint } = Grid;
const MotionDiv = motion.div;
const SUB_TABS = ["subjects", "categories", "branches"];

const Subject = ({ screens }) => {
  const breakpointScreens = useBreakpoint();
  const activeScreens = screens || breakpointScreens;
  const isMobile = !activeScreens.md;
  const [searchParams, setSearchParams] = useSearchParams();
  const activeKey = SUB_TABS.includes(searchParams.get("sub")) ? searchParams.get("sub") : "subjects";

  const { data: categoriesData } = useGetSubjectCategoriesQuery();
  const { data: branchesData } = useGetSubjectBranchesQuery(null);
  const { data: subjectsData } = useGetSubjectsQuery({
    page: 1,
    limit: 1,
    search: "",
    branch_id: "",
    category_id: "",
  });

  const handleTabChange = (key) => {
    const next = new URLSearchParams(searchParams);
    next.set("sub", key);
    setSearchParams(next, { replace: true });
  };

  const items = [
    {
      key: "subjects",
      label: "Mata Pelajaran",
      icon: <BookOpen size={16} />,
      children: <SubjectTable screens={activeScreens} />,
    },
    {
      key: "categories",
      label: "Kategori",
      icon: <Layers size={16} />,
      children: <CategoryPanel screens={activeScreens} />,
    },
    {
      key: "branches",
      label: "Cabang",
      icon: <GitBranch size={16} />,
      children: <BranchPanel screens={activeScreens} />,
    },
  ];

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      style={{ display: "flex", flexDirection: "column", gap: isMobile ? 16 : 24 }}
    >
      <div
        style={{
          display: "grid",
          gap: isMobile ? 16 : 24,
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        }}
      >
        <StatCard
          title='Mata Pelajaran'
          value={subjectsData?.total || subjectsData?.data?.length || 0}
          icon={<BookOpen size={24} />}
          tone='primary'
        />
        <StatCard
          title='Kategori'
          value={categoriesData?.data?.length || 0}
          icon={<Layers size={24} />}
          tone='warning'
        />
        <StatCard
          title='Cabang'
          value={branchesData?.data?.length || 0}
          icon={<GitBranch size={24} />}
          tone='accent'
        />
      </div>

      <Tabs activeKey={activeKey} onChange={handleTabChange} items={items} destroyOnHidden />
    </MotionDiv>
  );
};

export default Subject;
