import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Button, Empty, Flex, Grid, Skeleton, Tag, Tooltip, Typography, theme } from "antd";
import { ArrowLeft, Minus, Pause, Play, Plus, Repeat, RotateCcw, Volume2 } from "lucide-react";

import { IconBox, MuseCard } from "../../../../components/ui/muse";
import { museCardStyle, museColors, museRadius, museShadow } from "../../../../config/theme";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const BATCH_SIZE = 30;
let sharedAudio = null;

const getSharedAudio = () => {
  if (!sharedAudio) {
    sharedAudio = new Audio();
  }

  return sharedAudio;
};

const clampRepeatCount = (value) => Math.min(20, Math.max(1, value || 1));
const getAyahLabel = (ayah) => ayah?.ayah_number || ayah?.ayah_global_number || "-";
const getAyahSurahName = (ayah) => ayah?.surah_name || ayah?.surah_name_latin || null;

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
  const { token } = theme.useToken();

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
    setPlayerState("playing");
  };

  const setAyahRepeat = (index, value) => {
    const count = Number.isFinite(value) ? clampRepeatCount(value) : 1;
    setRepeatTargets((prev) => ({ ...prev, [index]: count }));
    if (index === playingIndex) {
      setRemainingRepeats(Math.max(count - 1, 0));
    }
  };

  const statusLabel =
    playerState === "playing" ? "Memutar" : playerState === "paused" ? "Dijeda" : "Siap";
  const gap = isMobile ? 16 : 24;

  const renderRepeatControl = (absoluteIndex) => {
    const count = repeatTargets[absoluteIndex] || 1;
    return (
      <Flex
        align='center'
        justify='space-between'
        gap={12}
        wrap
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
        style={{
          padding: "8px 12px",
          borderRadius: museRadius.item,
          background: token.colorFillQuaternary,
        }}
      >
        <Flex align='center' gap={8}>
          <Repeat size={14} aria-hidden />
          <Text type='secondary' style={{ fontSize: 12 }}>
            Ulangi ayat ini
          </Text>
        </Flex>
        <Flex align='center' gap={6}>
          <Button
            size='small'
            aria-label='Kurangi pengulangan'
            onClick={() => setAyahRepeat(absoluteIndex, clampRepeatCount(count - 1))}
            disabled={count <= 1}
            icon={<Minus size={14} />}
          />
          <Text strong style={{ minWidth: 32, textAlign: "center" }} aria-live='polite'>
            {count}x
          </Text>
          <Button
            size='small'
            aria-label='Tambah pengulangan'
            onClick={() => setAyahRepeat(absoluteIndex, clampRepeatCount(count + 1))}
            disabled={count >= 20}
            icon={<Plus size={14} />}
          />
          {count !== 1 ? (
            <Tooltip title='Kembalikan ke 1x'>
              <Button
                size='small'
                type='text'
                aria-label='Reset pengulangan'
                icon={<RotateCcw size={14} />}
                onClick={() => setAyahRepeat(absoluteIndex, 1)}
              />
            </Tooltip>
          ) : null}
        </Flex>
      </Flex>
    );
  };

  return (
    <div style={{ position: "relative", paddingBottom: currentAyah ? (isMobile ? 120 : 96) : 0 }}>
      <Flex vertical gap={gap}>
        <MuseCard>
          <Flex
            justify='space-between'
            align={isMobile ? "stretch" : "center"}
            vertical={isMobile}
            gap={16}
          >
            <Flex align='center' gap={12} style={{ minWidth: 0 }}>
              <Tooltip title='Kembali ke daftar'>
                <Button aria-label='Kembali ke daftar' icon={<ArrowLeft size={16} />} onClick={onBack} />
              </Tooltip>
              <div style={{ minWidth: 0 }}>
                <Text strong style={{ display: "block", fontSize: 18 }}>
                  {title}
                </Text>
                <Text type='secondary' style={{ fontSize: 12 }}>
                  {subtitle ? `${subtitle} · ` : ""}
                  {list.length.toLocaleString("id-ID")} ayat · Audio: {statusLabel}
                </Text>
              </div>
            </Flex>

            <Flex wrap gap={8}>
              {playerState === "paused" ? (
                <>
                  <Button type='primary' icon={<Play size={16} />} onClick={handleResume}>
                    Lanjutkan
                  </Button>
                  <Button icon={<RotateCcw size={16} />} onClick={handleRestart}>
                    Ulangi dari Awal
                  </Button>
                </>
              ) : playerState === "playing" ? (
                <Button icon={<Pause size={16} />} onClick={handleStop}>
                  Jeda
                </Button>
              ) : (
                <Button
                  type='primary'
                  icon={<Play size={16} />}
                  onClick={handlePlayAll}
                  disabled={!list.length}
                >
                  Putar Semua
                </Button>
              )}
            </Flex>
          </Flex>
        </MuseCard>

        {isLoading ? (
          <MuseCard>
            <Skeleton active paragraph={{ rows: 10 }} />
          </MuseCard>
        ) : null}

        {isError ? <Alert type='error' showIcon title={errorMessage} /> : null}

        {!isLoading && !isError ? (
          <Flex vertical gap={isMobile ? 12 : 16}>
            {visibleItems.map((ayah, absoluteIndex) => {
              const isActive = playingIndex === absoluteIndex && playerState === "playing";
              const isPausedAt = playingIndex === absoluteIndex && playerState === "paused";
              const highlight = isActive
                ? token.colorPrimary
                : isPausedAt
                  ? token.colorWarning
                  : "transparent";

              return (
                <div
                  key={ayah.ayah_global_number || absoluteIndex}
                  ref={(el) => {
                    if (el) itemRefs.current.set(absoluteIndex, el);
                    else itemRefs.current.delete(absoluteIndex);
                  }}
                  role='button'
                  tabIndex={0}
                  aria-label={`Putar ayat ${getAyahLabel(ayah)}`}
                  aria-current={isActive ? "true" : undefined}
                  onClick={() => handleJumpToAyah(absoluteIndex)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleJumpToAyah(absoluteIndex);
                    }
                  }}
                  style={{
                    ...museCardStyle,
                    padding: isMobile ? 16 : 20,
                    cursor: "pointer",
                    boxShadow: `inset 0 0 0 2px ${highlight}, ${museCardStyle.boxShadow}`,
                    outlineOffset: 2,
                  }}
                >
                  <Flex vertical gap={isMobile ? 12 : 16}>
                    <Flex justify='space-between' align='center' gap={8} wrap>
                      {renderMeta ? (
                        <Flex gap={8} align='center' wrap>
                          {renderMeta(ayah, { isMobile, isActive, isPausedAt })}
                        </Flex>
                      ) : (
                        <span />
                      )}
                      <Flex gap={6} wrap>
                        {isActive && remainingRepeats > 0 ? (
                          <Tag color='blue' icon={<RotateCcw size={12} />} style={{ margin: 0 }}>
                            Sisa {remainingRepeats}
                          </Tag>
                        ) : null}
                        {isActive || isPausedAt ? (
                          <Tag
                            color={isActive ? "success" : "warning"}
                            icon={isActive ? <Volume2 size={12} /> : <Pause size={12} />}
                            style={{ margin: 0 }}
                          >
                            {isActive ? "Memutar" : "Dijeda"}
                          </Tag>
                        ) : null}
                      </Flex>
                    </Flex>

                    <div
                      lang='ar'
                      style={{
                        ...arabicTextStyle,
                        fontFamily: "'Amiri', 'Noto Naskh Arabic', 'Scheherazade New', serif",
                        fontSize: isMobile ? "1.5rem" : "1.85rem",
                        lineHeight: 2.1,
                        textAlign: "right",
                        color: museColors.text,
                        wordBreak: "break-word",
                      }}
                    >
                      {ayah.text_arabic}
                    </div>

                    {renderRepeatControl(absoluteIndex)}
                  </Flex>
                </div>
              );
            })}

            {!list.length ? (
              <MuseCard>
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description='Belum ada data ayat.' />
              </MuseCard>
            ) : null}

            {hasMore ? <div ref={sentinelRef} style={{ height: 24, width: "100%" }} /> : null}
          </Flex>
        ) : null}
      </Flex>

      {currentAyah ? (
        <div
          role='region'
          aria-label='Pemutar audio ayat'
          style={{
            position: "fixed",
            left: isMobile ? 12 : "auto",
            right: isMobile ? 12 : 24,
            bottom: isMobile ? 12 : 24,
            zIndex: 1200,
            width: isMobile ? "auto" : "min(400px, calc(100vw - 48px))",
            ...museCardStyle,
            boxShadow: museShadow.card,
            padding: isMobile ? 12 : 16,
          }}
        >
          <Flex gap={12} align='center' justify='space-between'>
            <Flex align='center' gap={12} style={{ minWidth: 0 }}>
              <IconBox
                icon={playerState === "playing" ? <Volume2 size={18} /> : <Pause size={18} />}
                tone={playerState === "playing" ? "primary" : "warning"}
                size={40}
              />
              <div style={{ minWidth: 0 }}>
                <Text type='secondary' style={{ fontSize: 12, display: "block" }}>
                  {playerState === "playing" ? "Sedang memutar" : "Dijeda"}
                </Text>
                <Text strong ellipsis style={{ display: "block" }}>
                  Ayat {getAyahLabel(currentAyah)}
                  {getAyahSurahName(currentAyah) ? ` · ${getAyahSurahName(currentAyah)}` : ""}
                </Text>
              </div>
            </Flex>

            <Flex gap={8} style={{ flexShrink: 0 }}>
              {playerState === "playing" ? (
                <Tooltip title='Jeda'>
                  <Button
                    type='primary'
                    shape='circle'
                    aria-label='Jeda'
                    icon={<Pause size={18} />}
                    onClick={handleStop}
                  />
                </Tooltip>
              ) : (
                <Tooltip title='Lanjutkan'>
                  <Button
                    type='primary'
                    shape='circle'
                    aria-label='Lanjutkan'
                    icon={<Play size={18} />}
                    onClick={handleResume}
                    disabled={playingIndex < 0}
                  />
                </Tooltip>
              )}
              <Tooltip title='Ulangi dari awal'>
                <Button
                  shape='circle'
                  aria-label='Ulangi dari awal'
                  icon={<RotateCcw size={18} />}
                  onClick={handleRestart}
                  disabled={!list.length}
                />
              </Tooltip>
            </Flex>
          </Flex>
        </div>
      ) : null}
    </div>
  );
};

export default AyahDetailPanel;
