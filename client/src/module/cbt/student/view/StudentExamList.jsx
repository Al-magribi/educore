import React, { useDeferredValue, useState } from "react";
import { useGetStudentExamsQuery } from "../../../../service/cbt/ApiExam";
import JoinExamModal from "./JoinExamModal";
import {
  Alert,
  Button,
  Col,
  Empty,
  Flex,
  Grid,
  Input,
  Row,
  Skeleton,
  Tag,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  ClipboardList,
  GraduationCap,
  Timer,
  UserRound,
} from "lucide-react";
import PageHeader from "../../../../components/ui/PageHeader";
import {
  CardTitle,
  IconBox,
  MuseCard,
  StatCard,
} from "../../../../components/ui/muse";
import { museColors, museRadius } from "../../../../config/theme";

const { Text } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const MetaLine = ({ icon, children }) => (
  <Flex align='center' gap={8} style={{ minWidth: 0, color: museColors.muted }}>
    <span style={{ display: "inline-flex", flexShrink: 0 }}>{icon}</span>
    <Text type='secondary' ellipsis style={{ fontSize: 13, minWidth: 0 }}>
      {children}
    </Text>
  </Flex>
);

const StudentExamList = () => {
  const { data, isLoading, isError, error, refetch } = useGetStudentExamsQuery();
  const [activeExam, setActiveExam] = useState(null);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [search, setSearch] = useState("");
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const deferredSearch = useDeferredValue(search);

  const exams = data || [];
  const normalizedSearch = deferredSearch.trim().toLowerCase();
  const filteredExams = exams.filter((item) => {
    if (!normalizedSearch) return true;

    return [item.name, item.subject_name, item.teacher_name].some((value) =>
      String(value || "")
        .toLowerCase()
        .includes(normalizedSearch),
    );
  });
  const examCount = exams.length;
  const className = exams[0]?.class_name || "Kelas belum tersedia";

  const openJoinModal = (exam) => {
    setActiveExam(exam);
    setIsJoinOpen(true);
  };

  const closeJoinModal = () => {
    setIsJoinOpen(false);
    setActiveExam(null);
  };

  if (isLoading) {
    return (
      <Flex vertical gap={isMobile ? 16 : 24}>
        <Skeleton active title paragraph={{ rows: 1 }} />
        <MuseCard>
          <Skeleton active paragraph={{ rows: 6 }} />
        </MuseCard>
      </Flex>
    );
  }

  if (isError) {
    return (
      <MuseCard>
        <Alert
          type='error'
          showIcon
          title='Gagal memuat jadwal ujian'
          description={
            error?.data?.message || "Periksa koneksi lalu muat ulang halaman."
          }
          action={
            <Button size='small' onClick={refetch}>
              Coba lagi
            </Button>
          }
        />
      </MuseCard>
    );
  }

  return (
    <>
      <MotionDiv
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        <Flex vertical gap={isMobile ? 16 : 24} style={{ minWidth: 0 }}>
          <PageHeader
            title='Jadwal Ujian'
            description='Pilih ujian lalu masukkan token dari pengawas untuk mulai mengerjakan.'
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: isMobile ? 16 : 24,
            }}
          >
            <StatCard
              title='Ujian Tersedia'
              value={examCount}
              suffix='ujian'
              icon={<ClipboardList size={24} />}
            />
            <StatCard
              title='Kelas'
              value={className}
              icon={<GraduationCap size={24} />}
              tone='navy'
            />
          </div>

          <MuseCard
            title={
              <CardTitle
                icon={<ClipboardList size={16} />}
                title='Ujian yang Bisa Diikuti'
                description={`${filteredExams.length} dari ${examCount} ujian`}
              />
            }
            extra={
              <Input.Search
                allowClear
                aria-label='Cari ujian'
                placeholder='Cari ujian, mapel, atau guru'
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                style={{ width: isMobile ? "100%" : 280, padding: "8px 0" }}
              />
            }
            styles={
              isMobile
                ? { header: { flexWrap: "wrap", paddingBlock: 8 } }
                : undefined
            }
          >
            {filteredExams.length ? (
              <Row gutter={[16, 16]}>
                {filteredExams.map((item) => (
                  <Col key={item.id} xs={24} md={12} xl={8}>
                    <div
                      style={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        gap: 14,
                        padding: 16,
                        border: `1px solid ${museColors.divider}`,
                        borderRadius: museRadius.card,
                        background: "#fff",
                      }}
                    >
                      <Flex align='flex-start' gap={12}>
                        <IconBox icon={<BookOpen size={18} />} tone='primarySoft' size={40} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Text
                            strong
                            style={{ display: "block", fontSize: 15, lineHeight: 1.4 }}
                          >
                            {item.name}
                          </Text>
                          <Flex gap={6} wrap style={{ marginTop: 6 }}>
                            <Tag color='blue' style={{ margin: 0 }}>
                              {item.bank_type || "Ujian"}
                            </Tag>
                            <Tag color='green' style={{ margin: 0 }}>
                              Aktif
                            </Tag>
                          </Flex>
                        </div>
                      </Flex>

                      <Flex vertical gap={6}>
                        <MetaLine icon={<BookOpen size={14} />}>
                          {item.subject_name || "Mata pelajaran belum tersedia"}
                        </MetaLine>
                        <MetaLine icon={<UserRound size={14} />}>
                          {item.teacher_name || "Guru belum tersedia"}
                        </MetaLine>
                        <MetaLine icon={<Timer size={14} />}>
                          Durasi {item.duration_minutes || 0} menit
                        </MetaLine>
                      </Flex>

                      <Button
                        type='primary'
                        block
                        onClick={() => openJoinModal(item)}
                        style={{ marginTop: "auto" }}
                        aria-label={`Ikuti ujian ${item.name}`}
                      >
                        Ikuti Ujian
                        <ArrowRight size={16} />
                      </Button>
                    </div>
                  </Col>
                ))}
              </Row>
            ) : (
              <Empty
                style={{ padding: "24px 0" }}
                description={
                  normalizedSearch
                    ? "Tidak ada ujian yang cocok. Coba kata kunci lain."
                    : "Belum ada jadwal ujian untuk kelas Anda. Tanyakan jadwal ke guru atau wali kelas."
                }
              >
                {normalizedSearch ? (
                  <Button onClick={() => setSearch("")}>Hapus pencarian</Button>
                ) : null}
              </Empty>
            )}
          </MuseCard>
        </Flex>
      </MotionDiv>

      <JoinExamModal
        open={isJoinOpen}
        onClose={closeJoinModal}
        exam={activeExam}
      />
    </>
  );
};

export default StudentExamList;
