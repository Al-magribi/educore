import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Empty,
  Flex,
  Grid,
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
const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") return value ? [value] : [];
  return [];
};

const ChapterContents = ({ chapterId, onEdit, onDelete }) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
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
        updated.map((item, idx) => {
          const videoUrls = toArray(item.video_urls).length
            ? toArray(item.video_urls)
            : toArray(item.video_url);
          const attachmentUrls = toArray(item.attachment_urls).length
            ? toArray(item.attachment_urls)
            : toArray(item.attachment_url);
          const attachmentNames = toArray(item.attachment_names).length
            ? toArray(item.attachment_names)
            : toArray(item.attachment_name);
          return updateContent({
            id: item.id,
            title: item.title,
            body: item.body,
            video_urls: videoUrls,
            attachment_urls: attachmentUrls,
            attachment_names: attachmentNames,
            video_url: videoUrls[0] || null,
            attachment_url: attachmentUrls[0] || null,
            attachment_name: attachmentNames[0] || null,
            order_number: idx + 1,
          }).unwrap();
        }),
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
              {contentItems.map((item, index) => {
                const videoUrls = toArray(item.video_urls).length
                  ? toArray(item.video_urls)
                  : toArray(item.video_url);
                const attachmentUrls = toArray(item.attachment_urls).length
                  ? toArray(item.attachment_urls)
                  : toArray(item.attachment_url);
                const attachmentNames = toArray(item.attachment_names).length
                  ? toArray(item.attachment_names)
                  : toArray(item.attachment_name);

                return (
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
                          size='small'
                          style={{ borderRadius: 12, borderColor: "#f0f0f0" }}
                          styles={{ body: { padding: isMobile ? 12 : 16 } }}
                        >
                          <Flex vertical gap={12}>
                            <Flex
                              align='flex-start'
                              justify='space-between'
                              wrap='wrap'
                              gap={10}
                            >
                              <Flex
                                align='center'
                                gap={8}
                                style={{ minWidth: 0, flex: 1 }}
                                wrap='wrap'
                              >
                                <span
                                  {...draggableProvided.dragHandleProps}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    color: "#8c8c8c",
                                    cursor: "grab",
                                    marginTop: 2,
                                  }}
                                >
                                  <GripVertical size={14} />
                                </span>
                                <Text
                                  strong
                                  style={{
                                    fontSize: 14,
                                    maxWidth: isMobile ? "100%" : "68%",
                                  }}
                                  ellipsis={{ tooltip: item.title }}
                                >
                                  {item.title}
                                </Text>
                                {videoUrls.length > 0 ? (
                                  <Tag
                                    color='red'
                                    icon={<Youtube size={12} />}
                                    style={{ marginRight: 0, cursor: "pointer" }}
                                    onClick={() => {
                                      setActiveVideoUrl(videoUrls[0]);
                                      setActiveVideoTitle(item.title);
                                      setVideoModalOpen(true);
                                    }}
                                  >
                                    Video {videoUrls.length}
                                  </Tag>
                                ) : null}
                                {attachmentUrls.length > 0 ? (
                                  <Tag
                                    color='blue'
                                    icon={<LinkIcon size={12} />}
                                    style={{ marginRight: 0, cursor: "pointer" }}
                                    onClick={() =>
                                      window.open(
                                        attachmentUrls[0],
                                        "_blank",
                                        "noreferrer",
                                      )
                                    }
                                  >
                                    File {attachmentUrls.length}
                                  </Tag>
                                ) : null}
                              </Flex>

                              <Space size={8} wrap>
                                <Button
                                  size={isMobile ? "middle" : "small"}
                                  icon={<Pencil size={14} />}
                                  onClick={() => onEdit(item, chapterId)}
                                >
                                  Edit
                                </Button>
                                <Popconfirm
                                  title='Hapus subbab ini?'
                                  onConfirm={() => onDelete(item.id)}
                                >
                                  <Button
                                    size={isMobile ? "middle" : "small"}
                                    danger
                                    icon={<Trash2 size={14} />}
                                  >
                                    Hapus
                                  </Button>
                                </Popconfirm>
                              </Space>
                            </Flex>

                            {item.body ? (
                              <div
                                style={{
                                  background: "#fafafa",
                                  border: "1px solid #f0f0f0",
                                  borderRadius: 10,
                                  padding: isMobile ? 10 : 12,
                                }}
                                dangerouslySetInnerHTML={{ __html: item.body }}
                              />
                            ) : (
                              <Text type='secondary'>Tanpa deskripsi.</Text>
                            )}

                            {(videoUrls.length > 0 || attachmentUrls.length > 0) && (
                              <Flex vertical gap={10}>
                                {videoUrls.length > 0 ? (
                                  <Flex vertical gap={6}>
                                    <Text type='secondary' style={{ fontSize: 12 }}>
                                      Video Pembelajaran
                                    </Text>
                                    <Space size={8} wrap>
                                      {videoUrls.map((url, mediaIndex) => (
                                        <Button
                                          key={`play-${item.id}-${mediaIndex}`}
                                          size={isMobile ? "middle" : "small"}
                                          type='primary'
                                          ghost
                                          icon={<PlayCircle size={14} />}
                                          style={
                                            isMobile
                                              ? { flex: 1, minWidth: 140 }
                                              : undefined
                                          }
                                          onClick={() => {
                                            setActiveVideoUrl(url);
                                            setActiveVideoTitle(
                                              `${item.title} (${mediaIndex + 1})`,
                                            );
                                            setVideoModalOpen(true);
                                          }}
                                        >
                                          Putar Video {mediaIndex + 1}
                                        </Button>
                                      ))}
                                    </Space>
                                  </Flex>
                                ) : null}

                                {attachmentUrls.length > 0 ? (
                                  <Flex vertical gap={6}>
                                    <Text type='secondary' style={{ fontSize: 12 }}>
                                      File Lampiran
                                    </Text>
                                    <Space size={8} wrap>
                                      {attachmentUrls.map((url, fileIndex) => (
                                        <Button
                                          key={`download-${item.id}-${fileIndex}`}
                                          size={isMobile ? "middle" : "small"}
                                          icon={<Download size={14} />}
                                          href={url}
                                          target='_blank'
                                          rel='noreferrer'
                                          download
                                          style={
                                            isMobile
                                              ? { flex: 1, minWidth: 170 }
                                              : undefined
                                          }
                                        >
                                          {attachmentNames[fileIndex]
                                            ? `Download ${attachmentNames[fileIndex]}`
                                            : `Download File ${fileIndex + 1}`}
                                        </Button>
                                      ))}
                                    </Space>
                                  </Flex>
                                ) : null}
                              </Flex>
                            )}
                          </Flex>
                        </Card>
                      </div>
                    )}
                  </Draggable>
                );
              })}
            </Flex>
            {droppableProvided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};

export default ChapterContents;
