import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Empty,
  Flex,
  Popconfirm,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import {
  Download,
  GripVertical,
  Link as LinkIcon,
  Pencil,
  PlayCircle,
  Trash2,
  Youtube,
} from "lucide-react";
import {
  useGetContentsQuery,
  useUpdateContentMutation,
} from "../../../../../../service/lms/ApiLms";
import YouTubePlayer from "../../../../player/YouTubePlayer";

const { Text } = Typography;

const ChapterContents = ({ chapterId, onEdit, onDelete }) => {
  const { data: contentsRes, isLoading } = useGetContentsQuery({ chapterId });
  const contents = contentsRes?.data || [];
  const [contentItems, setContentItems] = useState([]);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState("");
  const [activeVideoTitle, setActiveVideoTitle] = useState("");
  const [updateContent] = useUpdateContentMutation();

  const sortedContents = useMemo(() => {
    const copy = [...contents];
    copy.sort((a, b) => {
      const orderA = a.order_number ?? 9999;
      const orderB = b.order_number ?? 9999;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(a.created_at) - new Date(b.created_at);
    });
    return copy;
  }, [contents]);

  useEffect(() => {
    setContentItems(sortedContents);
  }, [sortedContents]);

  const handleContentDragEnd = async (result) => {
    if (!result.destination) return;
    if (result.destination.index === result.source.index) return;

    const updated = [...contentItems];
    const [moved] = updated.splice(result.source.index, 1);
    updated.splice(result.destination.index, 0, moved);
    setContentItems(updated);

    try {
      await Promise.all(
        updated.map((item, idx) =>
          updateContent({
            id: item.id,
            title: item.title,
            body: item.body,
            video_url: item.video_url,
            attachment_url: item.attachment_url,
            order_number: idx + 1,
          }).unwrap(),
        ),
      );
      message.success("Urutan subbab diperbarui.");
    } catch (error) {
      message.error("Gagal mengubah urutan subbab.");
    }
  };

  if (isLoading) {
    return <Text type="secondary">Memuat subbab...</Text>;
  }

  if (contentItems.length === 0) {
    return <Empty description="Belum ada subbab." />;
  }

  return (
    <DragDropContext onDragEnd={handleContentDragEnd}>
      <YouTubePlayer
        open={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
        videoUrl={activeVideoUrl}
        title={activeVideoTitle}
      />
      <Droppable droppableId={`contents-${chapterId}`} type="content">
        {(droppableProvided) => (
          <div
            ref={droppableProvided.innerRef}
            {...droppableProvided.droppableProps}
          >
            <Flex vertical gap={12}>
              {contentItems.map((item, index) => (
                <Draggable
                  draggableId={`content-${item.id}`}
                  index={index}
                  key={item.id}
                >
                  {(draggableProvided) => (
                    <div
                      ref={draggableProvided.innerRef}
                      {...draggableProvided.draggableProps}
                      style={{
                        ...draggableProvided.draggableProps.style,
                      }}
                    >
                      <Card
                        size="small"
                        style={{ borderRadius: 12 }}
                        styles={{ body: { padding: 16 } }}
                      >
                        <Flex vertical gap={12}>
                          <Flex align="center" justify="space-between" wrap="wrap" gap={8}>
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
                              <Text strong>{item.title}</Text>
                              {item.video_url && (
                                <Tag
                                  color="red"
                                  icon={<Youtube size={12} />}
                                  style={{ cursor: "pointer" }}
                                  onClick={() => {
                                    setActiveVideoUrl(item.video_url);
                                    setActiveVideoTitle(item.title);
                                    setVideoModalOpen(true);
                                  }}
                                >
                                  Youtube
                                </Tag>
                              )}
                              {item.attachment_url && (
                                <Tag
                                  color="blue"
                                  icon={<LinkIcon size={12} />}
                                  style={{ cursor: "pointer" }}
                                  onClick={() => {
                                    window.open(
                                      item.attachment_url,
                                      "_blank",
                                      "noreferrer",
                                    );
                                  }}
                                >
                                  File
                                </Tag>
                              )}
                            </Space>
                            <Space size={8} wrap>
                              {item.video_url ? (
                                <Button
                                  key="play"
                                  size="small"
                                  type="primary"
                                  icon={<PlayCircle size={14} />}
                                  onClick={() => {
                                    setActiveVideoUrl(item.video_url);
                                    setActiveVideoTitle(item.title);
                                    setVideoModalOpen(true);
                                  }}
                                >
                                  Putar
                                </Button>
                              ) : null}
                              {item.attachment_url ? (
                                <Button
                                  key="download"
                                  size="small"
                                  icon={<Download size={14} />}
                                  href={item.attachment_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  download
                                >
                                  Download
                                </Button>
                              ) : null}
                              <Button
                                key="edit"
                                size="small"
                                icon={<Pencil size={14} />}
                                onClick={() => onEdit(item, chapterId)}
                              >
                                Edit
                              </Button>
                              <Popconfirm
                                key="delete"
                                title="Hapus subbab ini?"
                                onConfirm={() => onDelete(item.id)}
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
                          <div>
                            {item.body ? (
                              <div
                                dangerouslySetInnerHTML={{ __html: item.body }}
                              />
                            ) : (
                              <Text type="secondary">Tanpa deskripsi.</Text>
                            )}
                          </div>
                        </Flex>
                      </Card>
                    </div>
                  )}
                </Draggable>
              ))}
            </Flex>
            {droppableProvided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};

export default ChapterContents;
