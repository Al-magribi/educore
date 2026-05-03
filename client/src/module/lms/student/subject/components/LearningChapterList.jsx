import React, { useMemo } from "react";
import { Card, Empty, Flex, Grid, Skeleton, Tag, Typography } from "antd";
import { BookOpenText } from "lucide-react";
import { useGetContentsQuery } from "../../../../../service/lms/ApiLms";
import LearningContentCard from "./LearningContentCard";

const { Paragraph } = Typography;

const LearningChapterList = ({ chapter }) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const { data: contentsRes, isLoading } = useGetContentsQuery({
    chapterId: chapter.id,
  });

  const contents = useMemo(() => {
    const list = contentsRes?.data || [];
    return [...list].sort((a, b) => {
      const orderA = a.order_number ?? 9999;
      const orderB = b.order_number ?? 9999;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    });
  }, [contentsRes]);

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 3 }} />;
  }

  return (
    <Flex vertical gap={12}>
      <Tag
        color='blue'
        icon={<BookOpenText size={12} />}
        style={{ width: "fit-content", marginRight: 0 }}
      >
        Total Subbab: {contents.length}
      </Tag>

      {chapter.description ? (
        <Card
          size='small'
          style={{ borderRadius: 10, borderColor: "#f0f0f0", background: "#fafafa" }}
          styles={{ body: { padding: isMobile ? 10 : 12 } }}
        >
          <div
            style={{ color: "rgba(0, 0, 0, 0.72)", lineHeight: 1.65 }}
            dangerouslySetInnerHTML={{ __html: chapter.description }}
          />
        </Card>
      ) : (
        <Paragraph type='secondary' style={{ marginBottom: 0 }}>
          Bab ini belum memiliki deskripsi.
        </Paragraph>
      )}

      {contents.length === 0 ? (
        <Empty description='Belum ada subbab pada bab ini.' image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Flex vertical gap={10}>
          {contents.map((content, index) => (
            <LearningContentCard key={content.id} content={content} index={index} />
          ))}
        </Flex>
      )}
    </Flex>
  );
};

export default LearningChapterList;
