import React, { useMemo } from "react";
import {
  Alert,
  Card,
  Collapse,
  Empty,
  Flex,
  Grid,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import {
  BookOpenText,
  FolderKanban,
  GraduationCap,
  Layers3,
  LibraryBig,
} from "lucide-react";
import { useGetChaptersQuery } from "../../../../../service/lms/ApiLms";
import LearningChapterList from "./LearningChapterList";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const containerVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.34,
      staggerChildren: 0.07,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  },
};

const summaryCardStyle = {
  borderRadius: 20,
  height: "100%",
  border: "1px solid rgba(148, 163, 184, 0.16)",
  boxShadow: "0 16px 32px rgba(15, 23, 42, 0.06)",
};

const LearningTab = ({ subjectId, classId }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

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

  const multiClassCount = useMemo(
    () =>
      chapters.filter(
        (item) =>
          Array.isArray(item?.class_names) && item.class_names.length > 0,
      ).length,
    [chapters],
  );

  const summaryItems = [
    {
      key: "chapter",
      label: "Total Bab",
      value: chapters.length,
      caption: "Materi yang tersedia",
      icon: <BookOpenText size={18} />,
      background: "linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)",
      color: "#1d4ed8",
    },
    {
      key: "class",
      label: "Kelas Terhubung",
      value: classId ? "Aktif" : "Umum",
      caption: classId
        ? "Mengikuti kelas yang dipilih"
        : "Belum spesifik kelas",
      icon: <GraduationCap size={18} />,
      background: "linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%)",
      color: "#15803d",
    },
    {
      key: "scope",
      label: "Bab Multi Kelas",
      value: multiClassCount,
      caption: "Materi dengan cakupan beberapa kelas",
      icon: <FolderKanban size={18} />,
      background: "linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)",
      color: "#b45309",
    },
  ];

  if (isLoading) {
    return (
      <MotionDiv initial='hidden' animate='show' variants={containerVariants}>
        <Card
          variant='borderless'
          style={{
            borderRadius: 24,
            boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)",
          }}
          styles={{ body: { padding: isMobile ? 18 : 24 } }}
        >
          <Space vertical size={18} style={{ width: "100%" }}>
            <Skeleton.Node
              active
              style={{ width: "100%", height: isMobile ? 120 : 140 }}
            />
            <Skeleton active paragraph={{ rows: 4 }} />
          </Space>
        </Card>
      </MotionDiv>
    );
  }

  if (isError) {
    return (
      <MotionDiv initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Alert
          type='error'
          showIcon
          message='Gagal memuat daftar materi'
          description={
            error?.data?.message ||
            "Terjadi kendala saat mengambil data bab pembelajaran."
          }
          style={{ borderRadius: 18 }}
        />
      </MotionDiv>
    );
  }

  if (chapters.length === 0) {
    return (
      <MotionDiv initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card
          variant='borderless'
          style={{
            borderRadius: 24,
            boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)",
          }}
          styles={{ body: { padding: isMobile ? 24 : 32 } }}
        >
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space vertical size={4}>
                <Text strong style={{ fontSize: 16 }}>
                  Belum ada materi pembelajaran
                </Text>
                <Text type='secondary'>
                  Materi untuk mata pelajaran ini akan muncul di sini ketika bab
                  sudah tersedia.
                </Text>
              </Space>
            }
          />
        </Card>
      </MotionDiv>
    );
  }

  return (
    <MotionDiv
      initial='hidden'
      animate='show'
      variants={containerVariants}
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <MotionDiv variants={itemVariants}>
        <Card
          variant='borderless'
          style={{
            borderRadius: 24,
            background: "linear-gradient(135deg, #f8fbff 0%, #eef6ff 100%)",
            border: "1px solid #dbeafe",
          }}
          styles={{ body: { padding: isMobile ? 18 : 22 } }}
        >
          <Flex
            justify='space-between'
            align={isMobile ? "flex-start" : "center"}
            gap={16}
            wrap='wrap'
          >
            <Space align='start' size={14}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    "linear-gradient(135deg, #1d4ed8 0%, #38bdf8 100%)",
                  color: "#fff",
                  flexShrink: 0,
                  boxShadow: "0 14px 30px rgba(29, 78, 216, 0.22)",
                }}
              >
                <LibraryBig size={24} />
              </div>

              <Space vertical size={4} style={{ minWidth: 0 }}>
                <Text type='secondary'>Workspace Materi</Text>
                <Title level={isMobile ? 5 : 4} style={{ margin: 0 }}>
                  Struktur Bab Pembelajaran
                </Title>
                <Text type='secondary'>
                  Jelajahi urutan bab dan subbab yang telah disusun untuk
                  menunjang proses belajar.
                </Text>
              </Space>
            </Space>

            <Tag
              color='blue'
              icon={<BookOpenText size={12} />}
              style={{
                marginRight: 0,
                borderRadius: 999,
                paddingInline: 12,
                height: 32,
                lineHeight: "30px",
              }}
            >
              Total Bab: {chapters.length}
            </Tag>
          </Flex>
        </Card>
      </MotionDiv>

      <MotionDiv variants={itemVariants}>
        <GridContent isMobile={isMobile} summaryItems={summaryItems} />
      </MotionDiv>

      <MotionDiv variants={itemVariants}>
        <Card
          variant='borderless'
          style={{
            borderRadius: 24,
            boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)",
          }}
          styles={{ body: { padding: isMobile ? 14 : 18 } }}
        >
          <Collapse
            accordion
            ghost
            expandIconPosition='end'
            items={chapters.map((chapter, index) => ({
              key: String(chapter.id),
              label: (
                <Flex
                  justify='space-between'
                  align={isMobile ? "flex-start" : "center"}
                  gap={12}
                  wrap='wrap'
                  style={{ width: "100%", paddingRight: 8 }}
                >
                  <Space align='start' size={12}>
                    <div
                      style={{
                        minWidth: 34,
                        height: 34,
                        borderRadius: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "#eff6ff",
                        color: "#1d4ed8",
                        fontWeight: 700,
                      }}
                    >
                      {index + 1}
                    </div>
                    <Space vertical size={4} style={{ minWidth: 0 }}>
                      <Text
                        strong
                        style={{ fontSize: 15, overflowWrap: "anywhere" }}
                      >
                        {chapter.title}
                      </Text>
                      <Space size={[8, 8]} wrap>
                        {chapter.class_name ? (
                          <Tag
                            color='green'
                            icon={<Layers3 size={12} />}
                            style={{ marginRight: 0, borderRadius: 999 }}
                          >
                            {chapter.class_name}
                          </Tag>
                        ) : null}
                        {Array.isArray(chapter.class_names) &&
                        chapter.class_names.length > 0 ? (
                          <Tag
                            color='cyan'
                            icon={<FolderKanban size={12} />}
                            style={{ marginRight: 0, borderRadius: 999 }}
                          >
                            {chapter.class_names.join(", ")}
                          </Tag>
                        ) : null}
                      </Space>
                    </Space>
                  </Space>

                  <Text type='secondary' style={{ fontSize: 12 }}>
                    {chapter.order_number
                      ? `Urutan ${chapter.order_number}`
                      : "Urutan otomatis"}
                  </Text>
                </Flex>
              ),
              styles: {
                header: {
                  padding: isMobile ? "14px 8px" : "16px 12px",
                  borderRadius: 16,
                  background: "#fff",
                },
                body: {
                  padding: isMobile ? "6px 4px 12px" : "8px 8px 14px",
                },
              },
              children: <LearningChapterList chapter={chapter} />,
            }))}
          />
        </Card>
      </MotionDiv>
    </MotionDiv>
  );
};

const GridContent = ({ isMobile, summaryItems }) => {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
        gap: 16,
      }}
    >
      {summaryItems.map((item) => (
        <Card
          key={item.key}
          variant='borderless'
          style={summaryCardStyle}
          styles={{ body: { padding: 18 } }}
        >
          <Flex align='center' justify='space-between' gap={16}>
            <Space vertical size={4} style={{ minWidth: 0 }}>
              <Text type='secondary'>{item.label}</Text>
              <Title
                level={isMobile ? 5 : 4}
                style={{ margin: 0, overflowWrap: "anywhere" }}
              >
                {item.value}
              </Title>
              <Text type='secondary' style={{ fontSize: 12 }}>
                {item.caption}
              </Text>
            </Space>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: item.background,
                color: item.color,
                flexShrink: 0,
              }}
            >
              {item.icon}
            </div>
          </Flex>
        </Card>
      ))}
    </div>
  );
};

export default LearningTab;
