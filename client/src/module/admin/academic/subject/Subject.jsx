import React from "react";
import { Typography, Tabs } from "antd";
import { BookOpen, GitBranch, Layers } from "lucide-react";
import CategoryPanel from "./CategoryPanel";
import BranchPanel from "./BranchPanel";
import SubjectTable from "./SubjectTable";

const { Title, Text } = Typography;

const Subject = ({ screens }) => {
  const items = [
    {
      key: "1",
      label: (
        <span className='flex items-center gap-2'>
          <Layers size={16} /> Kategori Mapel
        </span>
      ),
      children: (
        <div className='p-4 bg-white rounded shadow-sm'>
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
      children: <BranchPanel screens={screens} />,
    },
    {
      key: "3",
      label: (
        <span className='flex items-center gap-2'>
          <BookOpen size={16} /> Mata Pelajaran
        </span>
      ),
      children: <SubjectTable screens={screens} />,
    },
  ];

  return (
    <div className='p-6 min-h-screen bg-gray-50'>
      <div className='mb-6'>
        <Title level={3}>Manajemen Kurikulum</Title>
        <Text type='secondary'>
          Kelola Kategori, Cabang, dan Mata Pelajaran Sekolah
        </Text>
      </div>

      <div className='bg-white p-4 rounded-lg shadow'>
        <Tabs defaultActiveKey='1' items={items} />
      </div>
    </div>
  );
};

export default Subject;
