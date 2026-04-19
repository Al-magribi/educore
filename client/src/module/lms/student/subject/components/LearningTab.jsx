import React, { useMemo } from "react";
import { Alert, Card, Collapse, Empty, Skeleton, Space, Tag, Typography } from "antd";
import { BookOpenText, FolderKanban, Layers3 } from "lucide-react";
import { useGetChaptersQuery } from "../../../../../service/lms/ApiLms";
import LearningChapterList from "./LearningChapterList";

const { Text } = Typography;

const LearningTab = ({ subjectId, classId }) => {
  const {
    data: chaptersRes,
    isLoading,
    isError,
    error,
  } = useGetChaptersQuery({ subjectId, gradeId: null, classId });

  const chapters = useMemo(() => {
    const list = chaptersRes?.data || [];
    return [...list].sort((a, b) => {
      const orderA = a.order_number ?? 9999;
      const orderB = b.order_number ?? 9999;
      if (orderA !== orderB) return orderA - orderB;
      return (a.title || "").localeCompare(b.title || "");
    });
  }, [chaptersRes]);

  if (isLoading) {
    return (
      <Card style={{ borderRadius: 12 }}>
        <Skeleton active paragraph={{ rows: 4 }} />
      </Card>
    );
  }

  if (isError) {
    return (
      <Alert
        type='error'
        showIcon
        message={error?.data?.message || "Gagal memuat daftar materi."}
      />
    );
  }

  if (chapters.length === 0) {
    return (
      <Card style={{ borderRadius: 12 }}>
        <Empty description='Belum ada materi pembelajaran untuk kelas ini.' />
      </Card>
    );
  }

  return (
    <Card style={{ borderRadius: 12 }}>
      <Space direction='vertical' size={12} style={{ width: "100%" }}>
        <Tag color='blue' icon={<BookOpenText size={12} />} style={{ width: "fit-content" }}>
          Total Bab: {chapters.length}
        </Tag>

        <Collapse
          accordion
          items={chapters.map((chapter, index) => ({
            key: String(chapter.id),
            label: (
              <Space size={8} wrap>
                <Text strong>
                  {chapter.order_number || index + 1}. {chapter.title}
                </Text>
                {chapter.class_name ? (
                  <Tag color='green' icon={<Layers3 size={12} />} style={{ marginRight: 0 }}>
                    {chapter.class_name}
                  </Tag>
                ) : null}
                {Array.isArray(chapter.class_names) && chapter.class_names.length > 0 ? (
                  <Tag
                    color='cyan'
                    icon={<FolderKanban size={12} />}
                    style={{ marginRight: 0 }}
                  >
                    {chapter.class_names.join(", ")}
                  </Tag>
                ) : null}
              </Space>
            ),
            children: <LearningChapterList chapter={chapter} />,
          }))}
        />
      </Space>
    </Card>
  );
};

export default LearningTab;