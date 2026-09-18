import React from "react";
import { Button, Card, Flex, Grid, Typography } from "antd";
import { Plus } from "lucide-react";

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

const LearningHeader = ({ subject, onAddChapter }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

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
            Kelola bab, subbab, file, dan Youtube.
          </Text>
        </div>
        <Button
          type='primary'
          icon={<Plus size={16} />}
          onClick={onAddChapter}
          block={isMobile}
          style={isMobile ? undefined : { flexShrink: 0 }}
        >
          Tambah Bab
        </Button>
      </Flex>
    </Card>
  );
};

export default LearningHeader;
