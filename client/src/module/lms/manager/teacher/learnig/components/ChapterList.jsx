import React, { Suspense, lazy } from "react";
import {
  Button,
  Card,
  Collapse,
  Empty,
  Flex,
  Grid,
  Popconfirm,
  Tag,
  Typography,
  Skeleton,
} from "antd";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";

const ChapterContents = lazy(() => import("./ChapterContents"));

const { Text } = Typography;
const { useBreakpoint } = Grid;
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
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isCompact = !screens.sm;

  return (
    <Card
      style={{ borderRadius: 12 }}
      styles={{ body: { padding: isMobile ? 12 : 20 } }}
    >
      {isLoading ? (
        <Text type='secondary'>Memuat bab...</Text>
      ) : chapterItems.length === 0 ? (
        <Empty description='Belum ada bab untuk pelajaran ini.' />
      ) : (
        <DragDropContext onDragEnd={onChapterDragEnd}>
          <Droppable droppableId='chapters' type='chapter'>
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
                          size={isMobile ? "small" : "middle"}
                          items={[
                            {
                              key: chapter.id,
                              label: (
                                <Flex
                                  align={isMobile ? "stretch" : "center"}
                                  justify='space-between'
                                  wrap='wrap'
                                  gap={8}
                                  vertical={isMobile}
                                  style={{ width: "100%" }}
                                >
                                  <Flex
                                    align='center'
                                    gap={8}
                                    wrap='wrap'
                                    style={{ minWidth: 0, flex: 1 }}
                                  >
                                    <span
                                      {...draggableProvided.dragHandleProps}
                                      onClick={(event) =>
                                        event.stopPropagation()
                                      }
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        color: "#8c8c8c",
                                        cursor: "grab",
                                        flexShrink: 0,
                                      }}
                                    >
                                      <GripVertical size={14} />
                                    </span>
                                    <Text
                                      strong
                                      style={{
                                        maxWidth: isMobile ? "100%" : 280,
                                      }}
                                      ellipsis={{ tooltip: chapter.title }}
                                    >
                                      {chapter.title}
                                    </Text>
                                    {chapter.order_number ? (
                                      <Tag color='geekblue'>
                                        Urutan {chapter.order_number}
                                      </Tag>
                                    ) : null}
                                    {chapter.class_names &&
                                    chapter.class_names.length > 0 ? (
                                      <Tag
                                        color='green'
                                        style={{
                                          maxWidth: isMobile ? "100%" : 220,
                                          whiteSpace: "normal",
                                          height: "auto",
                                        }}
                                      >
                                        Kelas {chapter.class_names.join(", ")}
                                      </Tag>
                                    ) : chapter.class_name ? (
                                      <Tag color='green'>
                                        Kelas {chapter.class_name}
                                      </Tag>
                                    ) : chapter.grade_name ? (
                                      <Tag color='orange'>
                                        Tingkat {chapter.grade_name}
                                      </Tag>
                                    ) : (
                                      <Tag color='default'>Semua kelas</Tag>
                                    )}
                                  </Flex>
                                  <Flex
                                    gap={8}
                                    wrap='wrap'
                                    onClick={(event) =>
                                      event.stopPropagation()
                                    }
                                    style={{
                                      width: isMobile ? "100%" : "auto",
                                    }}
                                  >
                                    <Button
                                      size='small'
                                      icon={<Plus size={14} />}
                                      onClick={() =>
                                        onAddContent(null, chapter.id)
                                      }
                                      style={
                                        isMobile
                                          ? { flex: 1, minWidth: 96 }
                                          : undefined
                                      }
                                    >
                                      {isCompact ? null : "Subbab"}
                                    </Button>
                                    <Button
                                      size='small'
                                      icon={<Pencil size={14} />}
                                      onClick={() => onEditChapter(chapter)}
                                      style={
                                        isMobile
                                          ? { flex: 1, minWidth: 72 }
                                          : undefined
                                      }
                                    >
                                      {isCompact ? null : "Edit"}
                                    </Button>
                                    <Popconfirm
                                      title='Hapus bab ini?'
                                      onConfirm={() =>
                                        onDeleteChapter(chapter.id)
                                      }
                                    >
                                      <Button
                                        size='small'
                                        danger
                                        icon={<Trash2 size={14} />}
                                        style={
                                          isMobile
                                            ? { flex: 1, minWidth: 72 }
                                            : undefined
                                        }
                                      >
                                        {isCompact ? null : "Hapus"}
                                      </Button>
                                    </Popconfirm>
                                  </Flex>
                                </Flex>
                              ),
                              children: (
                                <Flex vertical gap={12}>
                                  {chapter.description ? (
                                    <div
                                      style={{
                                        color: "rgba(0, 0, 0, 0.45)",
                                        overflowWrap: "anywhere",
                                        wordBreak: "break-word",
                                      }}
                                      dangerouslySetInnerHTML={{
                                        __html: chapter.description,
                                      }}
                                    />
                                  ) : null}
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
