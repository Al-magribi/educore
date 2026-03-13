import React from "react";
import {
  Typography,
  Tabs,
  Layout,
  Card,
  Flex,
  Grid,
  Statistic,
} from "antd";
import { BookOpen, GitBranch, Layers, LibraryBig } from "lucide-react";
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
    <Layout
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #f4f7fb 0%, #eef3f9 32%, #f8fafc 100%)",
      }}
    >
      <Content style={{ padding: activeScreens.md ? "24px" : "12px" }}>
        <Card
          bordered={false}
          style={{
            marginBottom: 20,
            borderRadius: 24,
            overflow: "hidden",
            background:
              "linear-gradient(135deg, #0f172a 0%, #0f766e 52%, #2dd4bf 100%)",
          }}
          styles={{ body: { padding: activeScreens.md ? 28 : 20 } }}
        >
          <Flex
            justify='space-between'
            align={activeScreens.md ? "center" : "start"}
            vertical={!activeScreens.md}
            gap={20}
          >
            <div>
              <Text style={{ color: "rgba(255,255,255,0.72)" }}>
                Akademik / Mata Pelajaran
              </Text>
              <Title
                level={2}
                style={{ color: "#fff", margin: "8px 0 6px", fontSize: 34 }}
              >
                Manajemen Kurikulum
              </Title>
              <Text style={{ color: "rgba(255,255,255,0.82)", fontSize: 15 }}>
                Kelola kategori, cabang, dan struktur mata pelajaran dalam satu
                area kerja.
              </Text>
            </div>
            <div
              style={{
                width: 68,
                height: 68,
                display: "grid",
                placeItems: "center",
                borderRadius: 20,
                background: "rgba(255,255,255,0.14)",
                color: "#fff",
              }}
            >
              <LibraryBig size={28} />
            </div>
          </Flex>
        </Card>

        <Flex gap={16} wrap='wrap' style={{ marginBottom: 20 }}>
          {summaryCards.map((item) => (
            <Card
              key={item.key}
              bordered={false}
              style={{
                flex: activeScreens.md ? "1 1 0" : "1 1 100%",
                minWidth: activeScreens.md ? 0 : "100%",
                borderRadius: 20,
                background: "rgba(255,255,255,0.88)",
                boxShadow: "0 16px 36px rgba(15, 23, 42, 0.06)",
              }}
              styles={{ body: { padding: "18px 20px" } }}
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
          bordered={false}
          style={{
            borderRadius: 22,
            background: "rgba(255,255,255,0.92)",
            boxShadow: "0 16px 36px rgba(15, 23, 42, 0.06)",
          }}
          styles={{ body: { padding: activeScreens.md ? 20 : 16 } }}
        >
          <div style={{ marginBottom: 18 }}>
            <Title level={4} style={{ margin: 0 }}>
              Direktori Kurikulum
            </Title>
            <Text type='secondary'>
              Gunakan tab untuk berpindah antara kategori, cabang, dan daftar
              mata pelajaran.
            </Text>
          </div>
          <Tabs defaultActiveKey='1' items={items} />
        </Card>
      </Content>
    </Layout>
  );
};

export default Subject;
