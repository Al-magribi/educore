import React from "react";
import { Button, Card, Flex, Grid, Segmented, Typography } from "antd";
import { BookOpen, NotebookText, Plus } from "lucide-react";

const { Text, Title } = Typography;
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
    <Card
      style={{ borderRadius: 12 }}
      styles={{ body: { padding: isMobile ? 14 : 20 } }}
    >
      <Flex
        justify='space-between'
        align={isMobile ? "stretch" : "center"}
        wrap='wrap'
        gap={12}
        vertical={isMobile}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <Title
            level={isMobile ? 5 : 4}
            style={{ margin: 0, overflowWrap: "anywhere" }}
          >
            {subject?.name || "Detail Pelajaran"}
          </Title>
          <Text type='secondary'>
            {isModuleSection
              ? "Buat, upload, dan unduh modul ajar mata pelajaran ini."
              : "Kelola bab, subbab, file, dan Youtube."}
          </Text>
        </div>
        {isModuleSection ? null : (
          <Button
            type='primary'
            icon={<Plus size={16} />}
            onClick={onAddChapter}
            block={isMobile}
            style={isMobile ? undefined : { flexShrink: 0 }}
          >
            Tambah Bab
          </Button>
        )}
      </Flex>
      <Segmented
        options={SECTION_OPTIONS}
        value={section}
        onChange={onSectionChange}
        block={isMobile}
        style={{ marginTop: 14 }}
      />
    </Card>
  );
};

export default LearningHeader;
