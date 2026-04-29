import React from "react";
import { Button, Card, Flex, Space, Tag } from "antd";

const StudentAnswersManualAction = ({
  isMobile,
  reviewSummary,
  finalizeableEssayIds,
  isFinalizingAll,
  onFinalizeAllEssay,
}) => (
  <Card
    variant='borderless'
    style={{
      borderRadius: 20,
      boxShadow: "0 14px 28px rgba(15, 23, 42, 0.06)",
    }}
    styles={{ body: { padding: isMobile ? 16 : 18 } }}
  >
    <Flex
      align={isMobile ? "stretch" : "center"}
      justify='space-between'
      wrap='wrap'
      gap={10}
      style={{ flexDirection: isMobile ? "column" : "row" }}
    >
      <Space wrap size={8}>
        <Tag color='default' style={{ borderRadius: 999, margin: 0 }}>
          Pending: {reviewSummary.pending}
        </Tag>
        <Tag color='gold' style={{ borderRadius: 999, margin: 0 }}>
          Reviewed: {reviewSummary.reviewed}
        </Tag>
        <Tag color='green' style={{ borderRadius: 999, margin: 0 }}>
          Finalized: {reviewSummary.finalized}
        </Tag>
      </Space>
      <Button
        type='primary'
        disabled={finalizeableEssayIds.length < 1}
        loading={isFinalizingAll}
        onClick={onFinalizeAllEssay}
      >
        Finalisasi Semua Uraian
      </Button>
    </Flex>
  </Card>
);

export default StudentAnswersManualAction;
