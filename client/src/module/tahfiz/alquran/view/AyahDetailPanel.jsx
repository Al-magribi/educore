import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Grid,
  Row,
  Skeleton,
  Space,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import {
  ArrowLeft,
  Info,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  Square,
  Volume2,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const BATCH_SIZE = 30;
let sharedAudio = null;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

const baseAyahCardStyle = {
  position: "relative",
  overflow: "hidden",
  borderRadius: 22,
  border: "1px solid #e2e8f0",
  boxShadow: "0 14px 34px rgba(15, 23, 42, 0.05)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)",
};

const getAyahCardStyle = (isActive, isPausedAt) => {
  if (isActive) {
    return {
      ...baseAyahCardStyle,
      border: "1px solid #93c5fd",
      boxShadow: "0 18px 40px rgba(37, 99, 235, 0.14)",
      background:
        "linear-gradient(135deg, rgba(239,246,255,1) 0%, rgba(255,255,255,1) 72%)",
    };
  }

  if (isPausedAt) {
    return {
      ...baseAyahCardStyle,
      border: "1px solid #fcd34d",
      boxShadow: "0 18px 40px rgba(245, 158, 11, 0.1)",
      background:
        "linear-gradient(135deg, rgba(255,251,235,1) 0%, rgba(255,255,255,1) 72%)",
    };
  }

  return baseAyahCardStyle;
};

const getSharedAudio = () => {
  if (!sharedAudio) {
    sharedAudio = new Audio();
  }

  return sharedAudio;
};

const clampRepeatCount = (value) => Math.min(20, Math.max(1, value || 1));

const AyahDetailPanel = ({
  title,
  subtitle,
  onBack,
  isLoading,
  isError,
  errorMessage,
  items = [],
  arabicTextStyle,
  renderMeta,
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [playingIndex, setPlayingIndex] = useState(-1);
  const [playerState, setPlayerState] = useState("idle");
  const [resumeTime, setResumeTime] = useState(0);
  const [repeatTargets, setRepeatTargets] = useState({});
  const [remainingRepeats, setRemainingRepeats] = useState(0);
  const sentinelRef = useRef(null);
  const itemRefs = useRef(new Map());

  const list = useMemo(() => items || [], [items]);
  const hasMore = visibleCount < list.length;
  const visibleItems = useMemo(
    () => list.slice(0, visibleCount),
    [list, visibleCount],
  );
  const currentAyah = playingIndex >= 0 ? list[playingIndex] : null;
  const loadMoreAyah = React.useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, list.length));
  }, [list.length]);

  useEffect(() => {
    const resetTimer = window.setTimeout(() => {
      setVisibleCount(BATCH_SIZE);
      setPlayingIndex(-1);
      setPlayerState("idle");
      setResumeTime(0);
      setRepeatTargets({});
      setRemainingRepeats(0);
      const audio = getSharedAudio();
      audio.pause();
      audio.currentTime = 0;
    }, 0);

    return () => window.clearTimeout(resetTimer);
  }, [title]);

  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          loadMoreAyah();
        }
      },
      { root: null, rootMargin: "500px 0px", threshold: 0 },
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, visibleCount, loadMoreAyah]);

  useEffect(() => {
    const isPlaying = playerState === "playing";
    if (!isPlaying || playingIndex < 0 || playingIndex >= list.length) {
      return undefined;
    }

    const ayah = list[playingIndex];
    if (!ayah?.audio_url) {
      const skipTimer = window.setTimeout(() => {
        const nextIndex = playingIndex + 1;
        if (nextIndex >= list.length) {
          setPlayerState("idle");
          setPlayingIndex(-1);
          setResumeTime(0);
          setRemainingRepeats(0);
        } else {
          setPlayingIndex(nextIndex);
          setResumeTime(0);
          const nextRepeat = repeatTargets[nextIndex] || 1;
          setRemainingRepeats(Math.max(nextRepeat - 1, 0));
        }
      }, 0);

      return () => window.clearTimeout(skipTimer);
    }

    const audio = getSharedAudio();
    audio.src = ayah.audio_url;
    audio.currentTime = resumeTime > 0 ? resumeTime : 0;
    audio.play().catch(() => {
      setPlayerState("idle");
      setPlayingIndex(-1);
      setResumeTime(0);
    });

    const handleEnded = () => {
      if (remainingRepeats > 0) {
        setRemainingRepeats((prev) => Math.max(prev - 1, 0));
        setResumeTime(0);
        return;
      }

      if ((repeatTargets[playingIndex] || 1) > 1) {
        setRepeatTargets((prev) => ({ ...prev, [playingIndex]: 1 }));
      }

      const nextIndex = playingIndex + 1;
      if (nextIndex >= list.length) {
        setPlayerState("idle");
        setPlayingIndex(-1);
        setResumeTime(0);
        setRemainingRepeats(0);
      } else {
        setPlayingIndex(nextIndex);
        setResumeTime(0);
        const nextRepeat = repeatTargets[nextIndex] || 1;
        setRemainingRepeats(Math.max(nextRepeat - 1, 0));
      }
    };

    audio.addEventListener("ended", handleEnded);

    let extendTimer;
    if (playingIndex >= visibleCount - 2) {
      extendTimer = window.setTimeout(() => {
        loadMoreAyah();
      }, 0);
    }

    return () => {
      if (extendTimer) {
        window.clearTimeout(extendTimer);
      }
      audio.pause();
      audio.removeEventListener("ended", handleEnded);
    };
  }, [
    list,
    playerState,
    playingIndex,
    visibleCount,
    resumeTime,
    remainingRepeats,
    repeatTargets,
    loadMoreAyah,
  ]);

  useEffect(() => {
    const isPlaying = playerState === "playing";
    if (!isPlaying || playingIndex < 0) return;

    const node = itemRefs.current.get(playingIndex);
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight;
    const bottomThreshold = viewportHeight - 120;
    const topThreshold = 120;

    if (rect.bottom > bottomThreshold || rect.top < topThreshold) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [playingIndex, playerState, visibleCount]);

  useEffect(() => {
    return () => {
      const audio = getSharedAudio();
      audio.pause();
    };
  }, []);

  const handlePlayAll = () => {
    if (!list.length) return;
    setPlayingIndex(0);
    const repeatCount = repeatTargets[0] || 1;
    setRemainingRepeats(Math.max(repeatCount - 1, 0));
    setResumeTime(0);
    setPlayerState("playing");
  };

  const handleStop = () => {
    if (playingIndex < 0) return;
    setPlayerState("paused");
    const audio = getSharedAudio();
    setResumeTime(audio.currentTime || 0);
    audio.pause();
  };

  const handleResume = () => {
    if (playingIndex < 0) return;
    setPlayerState("playing");
  };

  const handleRestart = () => {
    if (!list.length) return;
    setPlayingIndex(0);
    const repeatCount = repeatTargets[0] || 1;
    setRemainingRepeats(Math.max(repeatCount - 1, 0));
    setResumeTime(0);
    setPlayerState("playing");
  };

  const handleJumpToAyah = (targetIndex) => {
    if (targetIndex < 0 || targetIndex >= list.length) return;
    setPlayingIndex(targetIndex);
    const repeatCount = repeatTargets[targetIndex] || 1;
    setRemainingRepeats(Math.max(repeatCount - 1, 0));
    setResumeTime(0);
    setPlayerState((prev) => (prev === "playing" ? "playing" : "paused"));
  };

  const setAyahRepeat = (index, value) => {
    const count = Number.isFinite(value) ? clampRepeatCount(value) : 1;
    setRepeatTargets((prev) => ({ ...prev, [index]: count }));
    if (index === playingIndex) {
      setRemainingRepeats(Math.max(count - 1, 0));
    }
  };

  const statCards = [
    {
      label: "Total Ayat",
      value: list.length,
      color: "#1d4ed8",
      background: "linear-gradient(135deg, #dbeafe, #eff6ff)",
    },
    {
      label: "Sedang Dipilih",
      value: currentAyah?.ayah_number || currentAyah?.ayah_global_number || "-",
      color: playerState === "playing" ? "#0f766e" : "#92400e",
      background:
        playerState === "playing"
          ? "linear-gradient(135deg, #ccfbf1, #f0fdfa)"
          : "linear-gradient(135deg, #fef3c7, #fff7ed)",
    },
    {
      label: "Status Audio",
      value:
        playerState === "playing"
          ? "Memutar"
          : playerState === "paused"
            ? "Dijeda"
            : "Siap",
      color:
        playerState === "playing"
          ? "#0f766e"
          : playerState === "paused"
            ? "#b45309"
            : "#475569",
      background:
        playerState === "playing"
          ? "linear-gradient(135deg, #ccfbf1, #f0fdfa)"
          : playerState === "paused"
            ? "linear-gradient(135deg, #fef3c7, #fff7ed)"
            : "linear-gradient(135deg, #e2e8f0, #f8fafc)",
    },
  ];

  return (
    <div
      style={{
        position: "relative",
        paddingBottom: currentAyah ? (isMobile ? 104 : 0) : 0,
      }}
    >
      <Card
        bordered={false}
        style={{
          borderRadius: isMobile ? 20 : 28,
          overflow: "hidden",
          background:
            "radial-gradient(circle at top left, rgba(191,219,254,0.52), transparent 26%), linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
          boxShadow: "0 20px 46px rgba(15, 23, 42, 0.08)",
          border: "1px solid #dbeafe",
        }}
        styles={{ body: { padding: isMobile ? 16 : 24 } }}
      >
        <Space direction='vertical' size={18} style={{ width: "100%" }}>
          <div
            style={{
              padding: isMobile ? 18 : 24,
              borderRadius: isMobile ? 18 : 24,
              background:
                "linear-gradient(135deg, rgba(15,23,42,1) 0%, rgba(29,78,216,0.97) 52%, rgba(56,189,248,0.88) 100%)",
              color: "#fff",
              boxShadow: "0 22px 42px rgba(30, 64, 175, 0.24)",
            }}
          >
            <Row gutter={[16, 16]} align='middle'>
              <Col xs={24} lg={16}>
                <Space direction='vertical' size={10} style={{ width: "100%" }}>
                  <Tag
                    style={{
                      width: "fit-content",
                      margin: 0,
                      borderRadius: 999,
                      padding: "6px 12px",
                      border: "1px solid rgba(255,255,255,0.18)",
                      background: "rgba(255,255,255,0.12)",
                      color: "#e0f2fe",
                      fontWeight: 600,
                    }}
                  >
                    Panel Detail Ayat
                  </Tag>
                  <div>
                    <Title
                      level={isMobile ? 4 : 3}
                      style={{ margin: 0, color: "#fff" }}
                    >
                      {title}
                    </Title>
                    {subtitle ? (
                      <Text
                        style={{
                          display: "block",
                          marginTop: 6,
                          color: "rgba(241,245,249,0.9)",
                          fontSize: isMobile ? 14 : 15,
                        }}
                      >
                        {subtitle}
                      </Text>
                    ) : null}
                  </div>
                </Space>
              </Col>
              <Col xs={24} lg={8}>
                <Flex
                  vertical={isMobile}
                  gap={12}
                  align={isMobile ? "stretch" : "flex-end"}
                  justify='center'
                  style={{ height: "100%" }}
                >
                  <Button
                    onClick={onBack}
                    icon={<ArrowLeft size={16} />}
                    style={{
                      width: isMobile ? "100%" : "auto",
                      height: 44,
                      borderRadius: 14,
                      fontWeight: 600,
                      border: "1px solid rgba(255,255,255,0.18)",
                      background: "rgba(255,255,255,0.12)",
                      color: "#fff",
                    }}
                  >
                    Kembali
                  </Button>
                </Flex>
              </Col>
            </Row>
          </div>

          <Card
            bordered={false}
            style={{
              borderRadius: 22,
              border: "1px solid #e2e8f0",
              boxShadow: "0 14px 34px rgba(15, 23, 42, 0.05)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.95) 100%)",
            }}
            styles={{ body: { padding: isMobile ? 16 : 20 } }}
          >
            <Flex
              vertical={isMobile}
              align={isMobile ? "stretch" : "center"}
              justify='space-between'
              gap={16}
            >
              <Space direction='vertical' size={4}>
                <Text strong style={{ color: "#0f172a" }}>
                  Kontrol Pemutaran
                </Text>
                <Text type='secondary'>
                  Jalankan seluruh ayat, jeda di posisi terakhir, atau ulangi
                  dari awal.
                </Text>
              </Space>

              <Flex
                wrap='wrap'
                gap={10}
                style={{ width: isMobile ? "100%" : "auto" }}
              >
                <Button
                  type='primary'
                  icon={<Play size={16} />}
                  onClick={handlePlayAll}
                  disabled={!list.length || playerState === "playing"}
                  style={{
                    borderRadius: 12,
                    height: 42,
                    fontWeight: 600,
                    flex: isMobile ? "1 1 calc(50% - 5px)" : "none",
                  }}
                >
                  Putar Semua
                </Button>
                <Button
                  icon={<Square size={16} />}
                  onClick={handleStop}
                  disabled={playerState !== "playing"}
                  style={{
                    borderRadius: 12,
                    height: 42,
                    fontWeight: 600,
                    flex: isMobile ? "1 1 calc(50% - 5px)" : "none",
                  }}
                >
                  Jeda
                </Button>
                {playerState === "paused" ? (
                  <>
                    <Button
                      icon={<Play size={16} />}
                      onClick={handleResume}
                      style={{
                        borderRadius: 12,
                        height: 42,
                        fontWeight: 600,
                        flex: isMobile ? "1 1 calc(50% - 5px)" : "none",
                      }}
                    >
                      Lanjutkan
                    </Button>
                    <Button
                      icon={<RotateCcw size={16} />}
                      onClick={handleRestart}
                      style={{
                        borderRadius: 12,
                        height: 42,
                        fontWeight: 600,
                        flex: isMobile ? "1 1 calc(50% - 5px)" : "none",
                      }}
                    >
                      Ulangi
                    </Button>
                  </>
                ) : null}
              </Flex>
            </Flex>
          </Card>

          {isLoading ? (
            <Card style={{ borderRadius: 22 }}>
              <Skeleton active paragraph={{ rows: 10 }} />
            </Card>
          ) : null}

          {isError ? (
            <Alert
              type='error'
              showIcon
              message={errorMessage}
              style={{ borderRadius: 16 }}
            />
          ) : null}

          {!isLoading && !isError ? (
            <MotionDiv
              variants={containerVariants}
              initial='hidden'
              animate='visible'
              style={{ width: "100%" }}
            >
              <Space direction='vertical' size={16} style={{ width: "100%" }}>
                {visibleItems.map((ayah, index) => {
                  const absoluteIndex = index;
                  const isActive =
                    playingIndex === absoluteIndex && playerState === "playing";
                  const isPausedAt =
                    playingIndex === absoluteIndex && playerState === "paused";

                  return (
                    <MotionDiv
                      variants={itemVariants}
                      layout
                      key={ayah.ayah_global_number || absoluteIndex}
                      ref={(el) => {
                        if (el) itemRefs.current.set(absoluteIndex, el);
                        else itemRefs.current.delete(absoluteIndex);
                      }}
                      whileHover={{ y: isMobile ? 0 : -3 }}
                    >
                      <Card
                        hoverable={!isMobile}
                        bordered={false}
                        onClick={() => handleJumpToAyah(absoluteIndex)}
                        style={getAyahCardStyle(isActive, isPausedAt)}
                        styles={{ body: { padding: isMobile ? 16 : 20 } }}
                      >
                        {isActive ? (
                          <motion.div
                            layoutId='activeIndicator'
                            style={{
                              position: "absolute",
                              inset: 0,
                              borderRadius: 22,
                              boxShadow: "inset 0 0 0 2px rgba(59,130,246,0.3)",
                              pointerEvents: "none",
                            }}
                          />
                        ) : null}

                        <Row gutter={[20, 20]} align='top'>
                          <Col span={24}>
                            <Space
                              direction='vertical'
                              size={14}
                              style={{ width: "100%" }}
                            >
                              <Flex
                                vertical={isMobile}
                                align={isMobile ? "stretch" : "center"}
                                justify='space-between'
                                gap={isMobile ? 10 : 12}
                              >
                                <Space
                                  direction='vertical'
                                  size={10}
                                  style={{ flex: 1, width: "100%" }}
                                >
                                  {renderMeta ? (
                                    <div
                                      style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 8,
                                        width: "100%",
                                      }}
                                    >
                                      {renderMeta(ayah, {
                                        isMobile,
                                        isActive,
                                        isPausedAt,
                                      })}
                                    </div>
                                  ) : null}
                                  <Space wrap size={8}>
                                    {isActive && remainingRepeats > 0 ? (
                                      <Tag
                                        color='blue'
                                        icon={<RotateCcw size={12} />}
                                        style={{
                                          borderRadius: 999,
                                          paddingInline: 10,
                                          fontWeight: 600,
                                        }}
                                      >
                                        Sisa {remainingRepeats}
                                      </Tag>
                                    ) : null}
                                    {isActive || isPausedAt ? (
                                      <Tag
                                        color={isActive ? "success" : "warning"}
                                        icon={
                                          isActive ? (
                                            <Volume2 size={12} />
                                          ) : (
                                            <Pause size={12} />
                                          )
                                        }
                                        style={{
                                          borderRadius: 999,
                                          paddingInline: 10,
                                          fontWeight: 600,
                                        }}
                                      >
                                        {isActive ? "Memutar" : "Dijeda"}
                                      </Tag>
                                    ) : null}
                                  </Space>
                                </Space>
                                <Text
                                  type='secondary'
                                  style={{
                                    width: isMobile ? "100%" : "auto",
                                    textAlign: isMobile ? "left" : "right",
                                    fontSize: isMobile ? 12 : 14,
                                  }}
                                >
                                  Ketuk ayat untuk audio
                                </Text>
                              </Flex>

                              <div
                                style={{
                                  padding: isMobile ? "16px 14px" : "24px 22px",
                                  borderRadius: isMobile ? 16 : 20,
                                  background:
                                    "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)",
                                  border: "1px solid rgba(226,232,240,0.95)",
                                }}
                              >
                                <div
                                  style={{
                                    ...arabicTextStyle,
                                    fontFamily:
                                      "'Amiri', 'Noto Naskh Arabic', 'Scheherazade New', serif",
                                    fontSize: isMobile ? "1rem" : "1.5rem",
                                    lineHeight: isMobile ? 1.9 : 2.05,
                                    textAlign: "right",
                                    color: "#0f172a",
                                    wordBreak: "break-word",
                                  }}
                                >
                                  {ayah.text_arabic}
                                </div>
                              </div>

                              <Card
                                size='small'
                                bordered={false}
                                onClick={(event) => event.stopPropagation()}
                                style={{
                                  borderRadius: 18,
                                  background:
                                    "linear-gradient(180deg, rgba(248,250,252,0.95) 0%, rgba(241,245,249,0.95) 100%)",
                                  border: "1px solid #e2e8f0",
                                  boxShadow:
                                    "inset 0 0 0 1px rgba(255,255,255,0.55)",
                                }}
                                styles={{
                                  body: { padding: isMobile ? 12 : 14 },
                                }}
                              >
                                <Flex
                                  vertical={isMobile}
                                  align={isMobile ? "stretch" : "center"}
                                  justify='space-between'
                                  gap={12}
                                >
                                  <Space direction='vertical' size={2}>
                                    <Flex align='center' gap={8}>
                                      <Repeat size={14} color='#64748b' />
                                      <Text strong style={{ color: "#334155" }}>
                                        Pengulangan ayat
                                      </Text>
                                    </Flex>
                                    <Text type='secondary'>
                                      Atur berapa kali ayat ini diulang sebelum
                                      lanjut.
                                    </Text>
                                  </Space>

                                  <Space
                                    wrap
                                    size={8}
                                    style={{
                                      width: isMobile ? "100%" : "auto",
                                    }}
                                    onClick={(event) => event.stopPropagation()}
                                  >
                                    <Button
                                      size='small'
                                      onClick={() =>
                                        setAyahRepeat(
                                          absoluteIndex,
                                          clampRepeatCount(
                                            (repeatTargets[absoluteIndex] ||
                                              1) - 1,
                                          ),
                                        )
                                      }
                                      disabled={
                                        (repeatTargets[absoluteIndex] || 1) <= 1
                                      }
                                      style={{
                                        borderRadius: 10,
                                        minWidth: isMobile ? 44 : 36,
                                      }}
                                    >
                                      -
                                    </Button>
                                    <Button
                                      size='small'
                                      onClick={() =>
                                        setAyahRepeat(absoluteIndex, 1)
                                      }
                                      style={{
                                        borderRadius: 10,
                                        minWidth: isMobile ? 72 : 92,
                                        fontWeight: 700,
                                      }}
                                    >
                                      {repeatTargets[absoluteIndex] || 1}x
                                    </Button>
                                    <Button
                                      size='small'
                                      onClick={() =>
                                        setAyahRepeat(
                                          absoluteIndex,
                                          clampRepeatCount(
                                            (repeatTargets[absoluteIndex] ||
                                              1) + 1,
                                          ),
                                        )
                                      }
                                      disabled={
                                        (repeatTargets[absoluteIndex] || 1) >=
                                        20
                                      }
                                      style={{
                                        borderRadius: 10,
                                        minWidth: isMobile ? 44 : 36,
                                      }}
                                    >
                                      +
                                    </Button>
                                    {(repeatTargets[absoluteIndex] || 1) !==
                                    1 ? (
                                      <Button
                                        size='small'
                                        icon={<RotateCcw size={14} />}
                                        onClick={() =>
                                          setAyahRepeat(absoluteIndex, 1)
                                        }
                                        style={{ borderRadius: 10 }}
                                      >
                                        Reset
                                      </Button>
                                    ) : null}
                                  </Space>
                                </Flex>
                              </Card>
                            </Space>
                          </Col>
                        </Row>
                      </Card>
                    </MotionDiv>
                  );
                })}

                {!list.length ? (
                  <Card
                    bordered={false}
                    style={{
                      borderRadius: 22,
                      border: "1px dashed #cbd5e1",
                      background: "#f8fafc",
                    }}
                  >
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description='Belum ada data ayat.'
                    />
                  </Card>
                ) : null}

                {hasMore ? (
                  <div
                    ref={sentinelRef}
                    style={{ height: 24, width: "100%" }}
                  />
                ) : null}
              </Space>
            </MotionDiv>
          ) : null}
        </Space>
      </Card>

      <AnimatePresence>
        {currentAyah ? (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            style={{
              position: "fixed",
              left: isMobile ? 12 : "auto",
              right: isMobile ? 12 : 28,
              bottom: isMobile ? 12 : 28,
              zIndex: 1200,
              width: isMobile ? "auto" : "min(420px, calc(100vw - 56px))",
              borderRadius: isMobile ? 18 : 22,
              border: "1px solid rgba(255,255,255,0.55)",
              boxShadow:
                "0 24px 54px rgba(15, 23, 42, 0.18), 0 10px 24px rgba(15, 23, 42, 0.08)",
              background: "rgba(255, 255, 255, 0.88)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              padding: isMobile ? 14 : 18,
            }}
          >
            <Flex
              vertical={isMobile}
              gap={isMobile ? 12 : 16}
              align={isMobile ? "stretch" : "center"}
              justify='space-between'
            >
              <Space direction='vertical' size={2}>
                <Text
                  style={{
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    color: "#64748b",
                    fontWeight: 700,
                  }}
                >
                  {playerState === "playing"
                    ? "Sedang Memutar"
                    : "Siap / Dijeda"}
                </Text>
                <Text
                  style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}
                >
                  Ayat{" "}
                  {currentAyah.ayah_number || currentAyah.ayah_global_number}
                </Text>
                {currentAyah.surah_name ? (
                  <Text
                    type='secondary'
                    ellipsis={{ tooltip: currentAyah.surah_name }}
                  >
                    {currentAyah.surah_name}
                  </Text>
                ) : null}
              </Space>

              <Space wrap size={10}>
                {playerState !== "playing" ? (
                  <Tooltip title='Putar dari awal'>
                    <Button
                      type='primary'
                      shape='circle'
                      icon={<Play size={18} />}
                      onClick={handlePlayAll}
                      style={{
                        width: 42,
                        height: 42,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    />
                  </Tooltip>
                ) : null}

                {playerState === "playing" ? (
                  <Tooltip title='Jeda'>
                    <Button
                      type='primary'
                      danger
                      shape='circle'
                      icon={<Pause size={18} />}
                      onClick={handleStop}
                      style={{
                        width: 42,
                        height: 42,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    />
                  </Tooltip>
                ) : (
                  <Tooltip title='Lanjutkan'>
                    <Button
                      shape='circle'
                      icon={<Play size={18} />}
                      onClick={handleResume}
                      disabled={playingIndex < 0}
                      style={{
                        width: 42,
                        height: 42,
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    />
                  </Tooltip>
                )}

                <Tooltip title='Ulangi dari awal'>
                  <Button
                    shape='circle'
                    icon={<RotateCcw size={18} />}
                    onClick={handleRestart}
                    disabled={!list.length}
                    style={{
                      width: 42,
                      height: 42,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  />
                </Tooltip>
              </Space>
            </Flex>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default AyahDetailPanel;
