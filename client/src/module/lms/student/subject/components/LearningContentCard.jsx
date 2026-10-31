import React, { useMemo, useState } from "react";
import { Button, Card, Flex, Grid, Space, Tag, Typography } from "antd";
import { FileText, Link2, PlayCircle, Youtube } from "lucide-react";
import YouTubePlayer from "../../../player/YouTubePlayer";

const { Paragraph, Text } = Typography;

const stripHtml = (value = "") =>
  value
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") return value ? [value] : [];
  return [];
};

const LearningContentCard = ({ content, index }) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [videoOpen, setVideoOpen] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState("");

  const plainBody = useMemo(
    () => stripHtml(content.body || ""),
    [content.body],
  );
  const videoUrls = useMemo(
    () =>
      toArray(content.video_urls).length
        ? toArray(content.video_urls)
        : toArray(content.video_url),
    [content.video_urls, content.video_url],
  );
  const attachmentUrls = useMemo(
    () =>
      toArray(content.attachment_urls).length
        ? toArray(content.attachment_urls)
        : toArray(content.attachment_url),
    [content.attachment_urls, content.attachment_url],
  );
  const attachmentNames = useMemo(
    () =>
      toArray(content.attachment_names).length
        ? toArray(content.attachment_names)
        : toArray(content.attachment_name),
    [content.attachment_names, content.attachment_name],
  );

  return (
    <Card
      size="small"
      style={{ borderRadius: 12, borderColor: "#f0f0f0" }}
      styles={{ body: { padding: isMobile ? 12 : 14 } }}
    >
      <YouTubePlayer
        open={videoOpen}
        onClose={() => setVideoOpen(false)}
        videoUrl={activeVideoUrl}
        title={content.title}
      />

      <Flex vertical gap={10}>
        <Flex justify="space-between" align="flex-start" wrap="wrap" gap={10}>
          <Flex align="center" gap={8} wrap style={{ minWidth: 0 }}>
            <Tag color="purple" style={{ marginRight: 0, borderRadius: 999 }}>
              Subbab {index + 1}
            </Tag>
            <Text strong ellipsis={{ tooltip: content.title }} style={{ maxWidth: isMobile ? "100%" : 360 }}>
              {content.title}
            </Text>
          </Flex>

          <Space size={8} wrap>
            {videoUrls.length > 0 ? (
              <Tag
                color="red"
                icon={<Youtube size={12} />}
                style={{ marginRight: 0 }}
              >
                Video {videoUrls.length}
              </Tag>
            ) : null}
            {attachmentUrls.length > 0 ? (
              <Tag
                color="blue"
                icon={<FileText size={12} />}
                style={{ marginRight: 0 }}
              >
                File {attachmentUrls.length}
              </Tag>
            ) : null}
          </Space>
        </Flex>

        {content.body ? (
          <div
            style={{
              background: "#fafafa",
              border: "1px solid #f0f0f0",
              borderRadius: 10,
              padding: isMobile ? 10 : 12,
            }}
          >
            <Paragraph style={{ marginBottom: 0 }}>{plainBody || "-"}</Paragraph>
          </div>
        ) : (
          <Text type="secondary">
            Subbab ini belum memiliki deskripsi materi.
          </Text>
        )}

        <Flex vertical gap={10}>
          {videoUrls.length > 0 ? (
            <Flex vertical gap={6}>
              <Text type='secondary' style={{ fontSize: 12 }}>
                Video Pembelajaran
              </Text>
              <Space size={8} wrap>
                {videoUrls.map((url, videoIndex) => (
                  <Button
                    key={`video-${content.id}-${videoIndex}`}
                    type="primary"
                    ghost
                    size={isMobile ? "middle" : "small"}
                    icon={<PlayCircle size={14} />}
                    style={isMobile ? { flex: 1, minWidth: 150 } : undefined}
                    onClick={() => {
                      setActiveVideoUrl(url);
                      setVideoOpen(true);
                    }}
                  >
                    Putar Video {videoIndex + 1}
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
                    key={`file-${content.id}-${fileIndex}`}
                    size={isMobile ? "middle" : "small"}
                    icon={<Link2 size={14} />}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {attachmentNames[fileIndex]
                      ? `Buka ${attachmentNames[fileIndex]}`
                      : `Buka File ${fileIndex + 1}`}
                  </Button>
                ))}
              </Space>
            </Flex>
          ) : null}

          {!videoUrls.length && !attachmentUrls.length ? (
            <Text type='secondary'>Belum ada media pada subbab ini.</Text>
          ) : null}
        </Flex>
      </Flex>
    </Card>
  );
};

export default LearningContentCard;
