import React, { Suspense, lazy } from "react";
import {
  Button,
  Card,
  Collapse,
  Empty,
  Flex,
  Popconfirm,
  Space,
  Tag,
  Typography,
  Skeleton,
} from "antd";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
const ChapterContents = lazy(() => import("./ChapterContents"));

const { Text } = Typography;
const chapterFallback = <Skeleton active paragraph={{ rows: 3 }} />;

const ChapterList = ({
  isLoading,
  chapterItems,
  onChapterDragEnd,
  onAddContent,
  onEditChapter,
  onDeleteChapter,
  onEditContent,
  onDeleteContent,
}) => {
  return (
    <Card style={{ borderRadius: 12 }}>
      {isLoading ? (
        <Text type="secondary">Memuat bab...</Text>
      ) : chapterItems.length === 0 ? (
        <Empty description="Belum ada bab untuk pelajaran ini." />
      ) : (
        <DragDropContext onDragEnd={onChapterDragEnd}>
          <Droppable droppableId="chapters" type="chapter">
            {(droppableProvided) => (
              <div
                ref={droppableProvided.innerRef}
                {...droppableProvided.droppableProps}
              >
                {chapterItems.map((chapter, index) => (
                  <Draggable
                    key={chapter.id}
                    draggableId={`chapter-${chapter.id}`}
                    index={index}
                  >
                    {(draggableProvided) => (
                      <div
                        ref={draggableProvided.innerRef}
                        {...draggableProvided.draggableProps}
                        style={{
                          marginBottom: 12,
                          ...draggableProvided.draggableProps.style,
                        }}
                      >
                        <Collapse
                          accordion
                          items={[
                            {
                              key: chapter.id,
                              label: (
                                <Flex
                                  align="center"
                                  justify="space-between"
                                  wrap="wrap"
                                  gap={8}
                                >
                                  <Space size={8}>
                                    <span
                                      {...draggableProvided.dragHandleProps}
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        color: "#8c8c8c",
                                      }}
                                    >
                                      <GripVertical size={14} />
                                    </span>
                                    <Text strong ellipsis>
                                      {chapter.title}
                                    </Text>
                                    {chapter.order_number && (
                                      <Tag color="geekblue">
                                        Urutan {chapter.order_number}
                                      </Tag>
                                    )}
                                    {chapter.class_names &&
                                    chapter.class_names.length > 0 ? (
                                      <Tag color="green">
                                        Kelas {chapter.class_names.join(", ")}
                                      </Tag>
                                    ) : chapter.class_name ? (
                                      <Tag color="green">
                                        Kelas {chapter.class_name}
                                      </Tag>
                                    ) : chapter.grade_name ? (
                                      <Tag color="orange">
                                        Tingkat {chapter.grade_name}
                                      </Tag>
                                    ) : (
                                      <Tag color="default">Semua kelas</Tag>
                                    )}
                                  </Space>
                                  <Space size={8}>
                                    <Button
                                      size="small"
                                      icon={<Plus size={14} />}
                                      onClick={() =>
                                        onAddContent(null, chapter.id)
                                      }
                                    >
                                      Subbab
                                    </Button>
                                    <Button
                                      size="small"
                                      icon={<Pencil size={14} />}
                                      onClick={() => onEditChapter(chapter)}
                                    >
                                      Edit
                                    </Button>
                                    <Popconfirm
                                      title="Hapus bab ini?"
                                      onConfirm={() =>
                                        onDeleteChapter(chapter.id)
                                      }
                                    >
                                      <Button
                                        size="small"
                                        danger
                                        icon={<Trash2 size={14} />}
                                      >
                                        Hapus
                                      </Button>
                                    </Popconfirm>
                                  </Space>
                                </Flex>
                              ),
                              children: (
                                <Flex vertical gap={12}>
                                  {chapter.description && (
                                    <div
                                      style={{ color: "rgba(0, 0, 0, 0.45)" }}
                                      dangerouslySetInnerHTML={{
                                        __html: chapter.description,
                                      }}
                                    />
                                  )}
                                  <Suspense fallback={chapterFallback}>
                                    <ChapterContents
                                      chapterId={chapter.id}
                                      onEdit={onEditContent}
                                      onDelete={onDeleteContent}
                                    />
                                  </Suspense>
                                </Flex>
                              ),
                            },
                          ]}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {droppableProvided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </Card>
  );
};

export default ChapterList;
