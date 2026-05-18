import React from "react";
import { Button, Card, Flex, Typography } from "antd";
import { Plus } from "lucide-react";

const { Text, Title } = Typography;

const LearningHeader = ({ subject, onAddChapter }) => {
  return (
    <Card style={{ borderRadius: 12 }}>
      <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            {subject?.name || "Detail Pelajaran"}
          </Title>
          <Text type="secondary">Kelola bab, subbab, file, dan Youtube.</Text>
        </div>
        <Button type="primary" icon={<Plus size={16} />} onClick={onAddChapter}>
          Bab
        </Button>
      </Flex>
    </Card>
  );
};

export default LearningHeader;
