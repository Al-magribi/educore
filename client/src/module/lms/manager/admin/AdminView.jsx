import React from "react";
import { Card, Flex, Typography } from "antd";

const { Title, Text } = Typography;

const AdminView = ({ subject }) => {
  return (
    <Card style={{ borderRadius: 12 }}>
      <Flex vertical gap={8}>
        <Title level={4} style={{ margin: 0 }}>
          {subject?.name || "Detail Pelajaran"}
        </Title>
        <Text type='secondary'>
          Tampilan admin untuk LMS sedang disiapkan.
        </Text>
      </Flex>
    </Card>
  );
};

export default AdminView;
