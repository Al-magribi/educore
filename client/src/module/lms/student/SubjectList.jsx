import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  Alert,
  Card,
  Col,
  Empty,
  Flex,
  Grid,
  Input,
  Row,
  Space,
  Typography,
} from "antd";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, GraduationCap, Search, Users } from "lucide-react";
import { useGetSubjectsQuery } from "../../../service/lms/ApiLms";
import PageHeader from "../../../components/ui/PageHeader";
import Detail from "./subject/Detail";
import Subject from "./subject/Subject";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const EMPTY_LIST = [];
const MotionDiv = motion.div;

const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.38,
      staggerChildren: 0.08,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.34, ease: [0.22, 1, 0.36, 1] },
  },
};

const statCardStyle = {
  borderRadius: 22,
  height: "100%",
  border: "1px solid rgba(148, 163, 184, 0.18)",
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
};

const SubjectList = () => {
  const { user } = useSelector((state) => state.auth);
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [keyword, setKeyword] = useState("");
  const [selectedSubject, setSelectedSubject] = useState(null);

  const {
    data: subjectsRes,
    isLoading,
    isError,
    error,
  } = useGetSubjectsQuery();

  const subjects = subjectsRes?.data ?? EMPTY_LIST;

  const filteredSubjects = useMemo(() => {
    if (!keyword.trim()) return subjects;

    const lowerKeyword = keyword.toLowerCase();
    return subjects.filter((item) => {
      const values = [
        item?.name,
        item?.code,
        item?.category_name,
        item?.branch_name,
        ...(Array.isArray(item?.teacher_names) ? item.teacher_names : []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return values.includes(lowerKeyword);
    });
  }, [subjects, keyword]);

  const teacherCount = useMemo(() => {
    const teachers = subjects.flatMap((item) =>
      Array.isArray(item?.teacher_names) ? item.teacher_names : [],
    );

    return new Set(teachers.filter(Boolean)).size;
  }, [subjects]);

  const stats = [
    {
      key: "total",
      label: "Total Mata Pelajaran",
      value: subjects.length,
      caption: "Terdaftar di kelas Anda",
      icon: <BookOpen size={18} />,
      background: "linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)",
      color: "#1d4ed8",
    },
    {
      key: "visible",
      label: "Hasil Ditampilkan",
      value: filteredSubjects.length,
      caption: keyword.trim()
        ? "Sesuai pencarian aktif"
        : "Semua mapel terlihat",
      icon: <Search size={18} />,
      background: "linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%)",
      color: "#15803d",
    },
    {
      key: "teacher",
      label: "Pengampu Terlibat",
      value: teacherCount,
      caption: "Guru yang tercatat di data",
      icon: <Users size={18} />,
      background: "linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)",
      color: "#b45309",
    },
  ];

  const searchWidth = screens.xs ? "100%" : 320;
  const errorMessage = error?.data?.message || "Gagal memuat mata pelajaran.";
  const trimmedKeyword = keyword.trim();

  if (selectedSubject) {
    return (
      <MotionDiv
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <Detail
          subject={selectedSubject}
          classId={selectedSubject?.class_id || user?.class_id || null}
          onBack={() => setSelectedSubject(null)}
        />
      </MotionDiv>
    );
  }

  return (
    <MotionDiv
      initial='hidden'
      animate='show'
      variants={containerVariants}
      style={{ display: "flex", flexDirection: "column", gap: 20 }}
    >
      <MotionDiv variants={itemVariants}>
        <PageHeader
          title='Mata Pelajaran'
          description={
            user?.class_name
              ? `Kelas ${user.class_name}`
              : "Kelas Anda belum terdata, tetapi daftar mata pelajaran tetap bisa ditelusuri."
          }
          meta={
            <Text type='secondary'>
              {trimmedKeyword
                ? `${filteredSubjects.length} hasil ditemukan untuk "${trimmedKeyword}".`
                : "Cari berdasarkan nama, kode, kategori, jurusan, atau guru."}
            </Text>
          }
          extra={
            <Input
              allowClear
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder='Cari mata pelajaran, kode, guru...'
              prefix={<Search size={16} />}
              style={{ width: searchWidth }}
            />
          }
        />
      </MotionDiv>

      {!isMobile && (
        <MotionDiv variants={itemVariants}>
          <Row gutter={[16, 16]}>
            {stats.map((stat) => (
              <Col key={stat.key} xs={24} sm={12} xl={8}>
                <Card
                  variant='borderless'
                  style={statCardStyle}
                  styles={{ body: { padding: 18 } }}
                >
                  <Flex align='center' justify='space-between' gap={16}>
                    <Space vertical size={4} style={{ minWidth: 0 }}>
                      <Text type='secondary'>{stat.label}</Text>
                      <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>
                        {stat.value}
                      </Title>
                      <Text type='secondary' style={{ fontSize: 12 }}>
                        {stat.caption}
                      </Text>
                    </Space>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 16,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: stat.background,
                        color: stat.color,
                        flexShrink: 0,
                      }}
                    >
                      {stat.icon}
                    </div>
                  </Flex>
                </Card>
              </Col>
            ))}
          </Row>
        </MotionDiv>
      )}

      <AnimatePresence mode='wait'>
        {isError ? (
          <MotionDiv
            key='error'
            variants={itemVariants}
            initial='hidden'
            animate='show'
            exit={{ opacity: 0, y: -12 }}
          >
            <Alert
              type='error'
              showIcon
              message='Terjadi kendala saat memuat mata pelajaran'
              description={errorMessage}
              style={{ borderRadius: 18 }}
            />
          </MotionDiv>
        ) : isLoading ? (
          <MotionDiv
            key='loading'
            variants={itemVariants}
            initial='hidden'
            animate='show'
            exit={{ opacity: 0, y: -12 }}
          >
            <Row gutter={[16, 16]}>
              {[1, 2, 3, 4, 5, 6].map((key) => (
                <Subject.Skeleton key={key} />
              ))}
            </Row>
          </MotionDiv>
        ) : filteredSubjects.length === 0 ? (
          <MotionDiv
            key='empty'
            variants={itemVariants}
            initial='hidden'
            animate='show'
            exit={{ opacity: 0, y: -12 }}
          >
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
                      {trimmedKeyword
                        ? "Tidak ada mata pelajaran yang cocok"
                        : "Belum ada mata pelajaran untuk kelas ini"}
                    </Text>
                    <Text type='secondary'>
                      {trimmedKeyword
                        ? "Coba gunakan kata kunci lain atau hapus filter pencarian."
                        : "Daftar mapel akan muncul di sini ketika data pembelajaran sudah tersedia."}
                    </Text>
                  </Space>
                }
              />
            </Card>
          </MotionDiv>
        ) : (
          <MotionDiv
            key='list'
            variants={itemVariants}
            initial='hidden'
            animate='show'
            exit={{ opacity: 0, y: -12 }}
          >
            <Flex
              justify='space-between'
              align={isMobile ? "flex-start" : "center"}
              wrap='wrap'
              gap={12}
              style={{ marginBottom: 4 }}
            >
              <Space vertical size={0}>
                <Title level={5} style={{ margin: 0 }}>
                  Daftar Mata Pelajaran
                </Title>
                <Text type='secondary'>
                  Pilih salah satu mata pelajaran untuk melihat detail materi
                  dan laporan belajar.
                </Text>
              </Space>
              <Text type='secondary' style={{ fontSize: 13 }}>
                Menampilkan {filteredSubjects.length} dari {subjects.length}{" "}
                mata pelajaran
              </Text>
            </Flex>

            <Row gutter={[16, 16]}>
              {filteredSubjects.map((item) => (
                <Subject
                  key={item.id}
                  subject={item}
                  onClick={() => setSelectedSubject(item)}
                />
              ))}
            </Row>
          </MotionDiv>
        )}
      </AnimatePresence>
    </MotionDiv>
  );
};

export default SubjectList;
