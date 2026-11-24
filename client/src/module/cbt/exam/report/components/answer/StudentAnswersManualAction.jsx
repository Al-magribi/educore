import React from "react";
import { Button, Card, Flex, Space, Tag } from "antd";
import { museRadius, museShadow } from "../../../../../../config/theme";

const StudentAnswersManualAction = ({
  isMobile,
  reviewSummary,
  finalizeableQuestionIds,
  isFinalizingAll,
  onFinalizeAllQuestions,
}) => (
  <Card
    variant='borderless'
    style={{
      borderRadius: museRadius.card,
      boxShadow: museShadow.card,
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
        disabled={finalizeableQuestionIds.length < 1}
        loading={isFinalizingAll}
        onClick={onFinalizeAllQuestions}
        block={isMobile}
      >
        Finalisasi Semua Soal
      </Button>
    </Flex>
  </Card>
);

export default StudentAnswersManualAction;
