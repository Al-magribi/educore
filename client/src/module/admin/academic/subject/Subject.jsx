import React from "react";
import { Typography, Tabs, Layout, Card, Flex, Grid, Statistic } from "antd";
import { BookOpen, GitBranch, Layers } from "lucide-react";
import CategoryPanel from "./CategoryPanel";
import BranchPanel from "./BranchPanel";
import SubjectTable from "./SubjectTable";
import {
  useGetSubjectCategoriesQuery,
  useGetSubjectBranchesQuery,
  useGetSubjectsQuery,
} from "../../../../service/academic/ApiSubject";

const { Title, Text } = Typography;
const { Content } = Layout;
const { useBreakpoint } = Grid;

const Subject = ({ screens }) => {
  const breakpointScreens = useBreakpoint();
  const activeScreens = screens || breakpointScreens;
  const { data: categoriesData } = useGetSubjectCategoriesQuery();
  const { data: branchesData } = useGetSubjectBranchesQuery(null);
  const { data: subjectsData } = useGetSubjectsQuery({
    page: 1,
    limit: 1,
    search: "",
    branch_id: "",
    category_id: "",
  });

  const summaryCards = [
    {
      key: "categories",
      title: "Kategori",
      value: categoriesData?.data?.length || 0,
      icon: <Layers size={18} />,
    },
    {
      key: "branches",
      title: "Cabang",
      value: branchesData?.data?.length || 0,
      icon: <GitBranch size={18} />,
    },
    {
      key: "subjects",
      title: "Mata Pelajaran",
      value: subjectsData?.total || subjectsData?.data?.length || 0,
      icon: <BookOpen size={18} />,
    },
  ];

  const items = [
    {
      key: "1",
      label: (
        <span className='flex items-center gap-2'>
          <Layers size={16} /> Kategori Mapel
        </span>
      ),
      children: (
        <div>
          <CategoryPanel />
        </div>
      ),
    },
    {
      key: "2",
      label: (
        <span className='flex items-center gap-2'>
          <GitBranch size={16} /> Cabang Mapel
        </span>
      ),
      children: <BranchPanel screens={activeScreens} />,
    },
    {
      key: "3",
      label: (
        <span className='flex items-center gap-2'>
          <BookOpen size={16} /> Mata Pelajaran
        </span>
      ),
      children: <SubjectTable screens={activeScreens} />,
    },
  ];

  return (
    <div>
      <Flex gap={16} wrap='wrap' style={{ marginBottom: 20 }}>
        {summaryCards.map((item) => (
          <Card
            key={item.key}
            style={{
              flex: activeScreens.md ? "1 1 0" : "1 1 100%",
              minWidth: activeScreens.md ? 0 : "100%",
            }}
            styles={{ body: { padding: "18px 20px" } }}
            hoverable
          >
            <Flex justify='space-between' align='start'>
              <Statistic title={item.title} value={item.value} />
              <div
                style={{
                  width: 42,
                  height: 42,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 14,
                  background: "linear-gradient(135deg, #ccfbf1, #dbeafe)",
                  color: "#0f766e",
                }}
              >
                {item.icon}
              </div>
            </Flex>
          </Card>
        ))}
      </Flex>

      <Card
        styles={{ body: { padding: activeScreens.md ? 20 : 16 } }}
        hoverable
      >
        <div style={{ marginBottom: 18 }}>
          <Title level={4} style={{ margin: 0 }}>
            Direktori Kurikulum
          </Title>
          <Text type='secondary'>
            Gunakan tab untuk berpindah antara kategori, cabang, dan daftar mata
            pelajaran.
          </Text>
        </div>
        <Tabs defaultActiveKey='1' items={items} />
      </Card>
    </div>
  );
};

export default Subject;
