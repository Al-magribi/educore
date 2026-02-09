import React, { useMemo } from "react";
import { Modal, Typography } from "antd";

const { Text } = Typography;

const getYouTubeId = (input) => {
  if (!input) return null;
  try {
    const url = new URL(input);
    if (url.hostname === "youtu.be") {
      return url.pathname.replace("/", "") || null;
    }
    if (url.hostname.includes("youtube.com")) {
      if (url.searchParams.get("v")) return url.searchParams.get("v");
      if (url.pathname.startsWith("/embed/")) {
        return url.pathname.replace("/embed/", "") || null;
      }
      if (url.pathname.startsWith("/shorts/")) {
        return url.pathname.replace("/shorts/", "") || null;
      }
    }
  } catch (error) {
    const match = input.match(/[?&]v=([^&]+)/);
    return match ? match[1] : null;
  }
  return null;
};

const YouTubePlayer = ({ open, onClose, videoUrl, title }) => {
  const videoId = useMemo(() => getYouTubeId(videoUrl), [videoUrl]);
  const embedUrl = videoId
    ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`
    : null;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={onClose}
      okText="Tutup"
      cancelButtonProps={{ style: { display: "none" } }}
      width={860}
      centered
      title={title || "Video Youtube"}
      styles={{ body: { paddingTop: 8 } }}
    >
      {embedUrl ? (
        <div
          style={{
            position: "relative",
            paddingTop: "56.25%",
            borderRadius: 12,
            overflow: "hidden",
            background: "#000",
          }}
        >
          <iframe
            title={title || "Youtube video"}
            src={embedUrl}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            frameBorder="0"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
            }}
          />
        </div>
      ) : (
        <Text type="secondary">Link Youtube tidak valid.</Text>
      )}
    </Modal>
  );
};

export default YouTubePlayer;
