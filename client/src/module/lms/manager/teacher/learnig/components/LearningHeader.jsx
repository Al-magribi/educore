import React from "react";
import { Button, Flex, Grid, Segmented } from "antd";
import { BookOpen, NotebookText, Plus } from "lucide-react";
import PageHeader from "../../../../../../components/ui/PageHeader";

const { useBreakpoint } = Grid;

const SECTION_OPTIONS = [
  {
    value: "materi",
    label: (
      <Flex align='center' gap={6}>
        <BookOpen size={15} />
        Materi (Bab)
      </Flex>
    ),
  },
  {
    value: "modul",
    label: (
      <Flex align='center' gap={6}>
        <NotebookText size={15} />
        Modul Ajar
      </Flex>
    ),
  },
];

const LearningHeader = ({ subject, onAddChapter, section, onSectionChange }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isModuleSection = section === "modul";

  return (
    <Flex vertical gap={14}>
      <PageHeader
        size='section'
        title={subject?.name || "Detail Pelajaran"}
        description={
          isModuleSection
            ? "Buat, upload, dan unduh modul ajar mata pelajaran ini."
            : "Kelola bab, subbab, file, dan Youtube."
        }
        extra={
          isModuleSection ? null : (
            <Button type='primary' icon={<Plus size={16} />} onClick={onAddChapter}>
              Tambah Bab
            </Button>
          )
        }
      />
      <Segmented
        options={SECTION_OPTIONS}
        value={section}
        onChange={onSectionChange}
        block={isMobile}
      />
    </Flex>
  );
};

export default LearningHeader;
