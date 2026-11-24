import React, { useEffect, useMemo, useState } from "react";
import {
  Card,
  Empty,
  Flex,
  Grid,
  Input,
  Select,
  Space,
  Tag,
  Typography,
  Skeleton,
} from "antd";
import { motion } from "framer-motion";
import {
  FileClock,
  LayoutGrid,
  Plus,
  Scale,
  Search,
  ShieldAlert,
  Trophy,
  Users,
} from "lucide-react";
import TeacherPointEntryTable from "../components/TeacherPointEntryTable";
import PointCatalogPanel from "../components/PointCatalogPanel";
import {
  useGetTeacherPointBootstrapQuery,
  useGetTeacherPointEntriesQuery,
} from "../../../../service/lms/ApiPoint";

import { museColors, museRadius, museShadow } from "../../../../config/theme";
import { PageTabs } from "../../../../components/ui/muse";
const { Text, Title } = Typography;
const { useBreakpoint } = Grid;



const emptyCardStyle = {
  borderRadius: museRadius.card,
  background: "#ffffff",
  boxShadow: museShadow.card,
};

const panelCardStyle = {
  borderRadius: museRadius.card,
  background: "#ffffff",
  boxShadow: museShadow.card,
};


const TeacherPointView = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [searchStudent, setSearchStudent] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [classId, setClassId] = useState(null);

  const {
    data: bootstrapRes,
    isLoading: isBootstrapLoading,
    isError: isBootstrapError,
    error: bootstrapError,
  } = useGetTeacherPointBootstrapQuery({ classId }, { skip: false });

  const activePeriode = bootstrapRes?.data?.active_periode || null;
  const pointConfig = bootstrapRes?.data?.point_config || null;
  const homeroomClass = bootstrapRes?.data?.homeroom_class || null;
  const classOptions = bootstrapRes?.data?.classes || [];
  const canPickClass = Boolean(bootstrapRes?.data?.can_pick_class);
  const students = bootstrapRes?.data?.students || [];
  const catalog = bootstrapRes?.data?.catalog || { reward: [], punishment: [] };

  useEffect(() => {
    if (!classId && homeroomClass?.id) {
      setClassId(homeroomClass.id);
    }
  }, [classId, homeroomClass?.id]);

  const {
    data: entriesRes,
    isLoading: isEntriesLoading,
    isFetching: isEntriesFetching,
  } = useGetTeacherPointEntriesQuery(
    {
      periodeId: activePeriode?.id,
      classId: classId || homeroomClass?.id,
    },
    { skip: !activePeriode?.id },
  );

  const filteredStudents = useMemo(() => {
    const keyword = searchStudent.trim().toLowerCase();
    if (!keyword) return students;
    return students.filter((item) => {
      const name = item.student_name?.toLowerCase() || "";
      const nis = item.nis?.toLowerCase() || "";
      return name.includes(keyword) || nis.includes(keyword);
    });
  }, [searchStudent, students]);

  const entries = useMemo(() => entriesRes?.data || [], [entriesRes?.data]);

  const selectedStudent = useMemo(
    () =>
      students.find((item) => Number(item.student_id) === Number(selectedStudentId)) ||
      null,
    [selectedStudentId, students],
  );

  const summaryStats = useMemo(() => {
    return students.reduce(
      (acc, item) => {
        acc.totalStudents += 1;
        acc.totalReward += Number(item.total_reward || 0);
        acc.totalPunishment += Number(item.total_punishment || 0);
        acc.totalEntries += Number(item.total_entries || 0);
        return acc;
      },
      {
        totalStudents: 0,
        totalReward: 0,
        totalPunishment: 0,
        totalEntries: 0,
      },
    );
  }, [students]);

  const renderStudentCards = () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile
          ? "1fr"
          : "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 12,
      }}
    >
      {filteredStudents.map((student) => {
        const isActive = Number(selectedStudentId) === Number(student.student_id);
        return (
          <motion.div
            key={student.student_id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
          >
            <Card
              hoverable
              onClick={() =>
                setSelectedStudentId((prev) =>
                  Number(prev) === Number(student.student_id)
                    ? null
                    : student.student_id,
                )
              }
              style={{
                borderRadius: museRadius.card,
                border: `1px solid ${isActive ? museColors.primary : museColors.divider}`,
                background: isActive ? museColors.primarySoft : "#ffffff",
                boxShadow: museShadow.card,
              }}
              styles={{ body: { padding: 18 } }}
            >
              <Flex vertical gap={12}>
                <div>
                  <Text strong style={{ color: museColors.text, fontSize: 15 }}>
                    {student.student_name}
                  </Text>
                  <div>
                    <Text style={{ color: museColors.muted }}>
                      NIS {student.nis || "-"}
                    </Text>
                  </div>
                </div>

                <Flex justify='space-between' gap={10}>
                  <Tag
                    style={{
                      margin: 0,
                      borderColor: "#fcd34d",
                      background: "#fffbeb",
                      color: "#a16207",
                    }}
                  >
                    Penghargaan {student.total_reward || 0}
                  </Tag>
                  <Tag
                    style={{
                      margin: 0,
                      borderColor: "#fecaca",
                      background: "#fef2f2",
                      color: museColors.danger,
                    }}
                  >
                    Pelanggaran {student.total_punishment || 0}
                  </Tag>
                </Flex>
                {pointConfig?.show_balance ? (
                  <Tag
                    style={{
                      margin: 0,
                      borderColor: museColors.primarySoft,
                      background: museColors.primarySoft,
                      color: museColors.primary,
                      width: "fit-content",
                    }}
                  >
                    Poin bersih {student.balance || 0}
                  </Tag>
                ) : null}
              </Flex>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );

  const tabSummary = {
    summary: {
      title: "Ringkasan Kelas",
      description:
        "Pilih siswa dan pantau akumulasi penghargaan serta pelanggaran di kelas wali Anda.",
    },
    history: {
      title: "Riwayat Poin Siswa",
      description:
        "Lihat riwayat poin siswa. Penambahan dan perubahan poin hanya dapat dilakukan admin atau kesiswaan.",
    },
    catalog: {
      title: "Bobot Penghargaan dan Pelanggaran",
      description:
        "Daftar jenis dan bobot poin yang berlaku pada periode aktif.",
    },
  };

  const tabItems = [
    {
      key: "summary",
      description: tabSummary.summary.description,
      label: "Ringkasan Kelas",
      icon: <LayoutGrid />,
      render: () => (
        <motion.div
          key='teacher-point-summary'
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
        >
          <Card
            style={panelCardStyle}
            styles={{ body: { padding: isMobile ? 16 : 20 } }}
          >
            <Flex vertical gap={16}>
              <Flex
                vertical={isMobile}
                justify='space-between'
                align={isMobile ? "flex-start" : "center"}
                gap={12}
              >
                <div>
                  <Title level={4} style={{ margin: 0 }}>
                    Ringkasan Kelas
                  </Title>
                  <Text style={{ color: museColors.muted }}>
                    Gunakan panel ini untuk melihat akumulasi poin per siswa di
                    kelas wali Anda.
                  </Text>
                </div>
              </Flex>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "repeat(2, minmax(0, 1fr))"
                    : "repeat(4, minmax(0, 1fr))",
                  gap: 12,
                }}
              >
                <Card style={{ borderRadius: museRadius.card, border: `1px solid ${museColors.divider}`, boxShadow: "none" }}>
                  <Space>
                    <Users size={18} color={museColors.primary} />
                    <div>
                      <Text style={{ color: museColors.muted, fontSize: 12 }}>Siswa</Text>
                      <Title level={4} style={{ margin: "2px 0 0" }}>
                        {summaryStats.totalStudents}
                      </Title>
                    </div>
                  </Space>
                </Card>
                <Card style={{ borderRadius: museRadius.card, border: "1px solid #fef3c7", boxShadow: "none" }}>
                  <Space>
                    <Trophy size={18} color='#a16207' />
                    <div>
                      <Text style={{ color: museColors.muted, fontSize: 12 }}>
                        Penghargaan
                      </Text>
                      <Title level={4} style={{ margin: "2px 0 0", color: "#a16207" }}>
                        {summaryStats.totalReward}
                      </Title>
                    </div>
                  </Space>
                </Card>
                <Card style={{ borderRadius: museRadius.card, border: "1px solid #fecaca", boxShadow: "none" }}>
                  <Space>
                    <ShieldAlert size={18} color={museColors.danger} />
                    <div>
                      <Text style={{ color: museColors.muted, fontSize: 12 }}>
                        Pelanggaran
                      </Text>
                      <Title level={4} style={{ margin: "2px 0 0", color: museColors.danger }}>
                        {summaryStats.totalPunishment}
                      </Title>
                    </div>
                  </Space>
                </Card>
                <Card style={{ borderRadius: museRadius.card, border: `1px solid ${museColors.primarySoft}`, boxShadow: "none" }}>
                  <Space>
                    <Plus size={18} color={museColors.primary} />
                    <div>
                      <Text style={{ color: museColors.muted, fontSize: 12 }}>
                        Total Entri
                      </Text>
                      <Title level={4} style={{ margin: "2px 0 0", color: museColors.primary }}>
                        {summaryStats.totalEntries}
                      </Title>
                    </div>
                  </Space>
                </Card>
              </div>

              <div
                style={{
                  maxWidth: isMobile ? "100%" : 420,
                }}
              >
                <Input
                  allowClear
                  value={searchStudent}
                  onChange={(event) => setSearchStudent(event.target.value)}
                  prefix={<Search size={16} color={museColors.muted} />}
                  placeholder='Cari siswa berdasarkan nama atau NIS'
                  style={{ borderRadius: museRadius.card, height: 42 }}
                />
              </div>

              {filteredStudents.length ? (
                renderStudentCards()
              ) : (
                <Empty
                  description='Tidak ada siswa yang cocok dengan pencarian.'
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </Flex>
          </Card>
        </motion.div>
      ),
    },
    {
      key: "history",
      description: tabSummary.history.description,
      label: "Riwayat Poin Siswa",
      icon: <FileClock />,
      render: () => (
        <motion.div
          key='teacher-point-history'
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
        >
          <TeacherPointEntryTable
            dataSource={entries}
            loading={isEntriesLoading || isEntriesFetching}
            isMobile={isMobile}
            selectedStudent={selectedStudent}
            readOnly
          />
        </motion.div>
      ),
    },
    {
      key: "catalog",
      description: tabSummary.catalog.description,
      label: "Bobot Poin",
      icon: <Scale />,
      render: () => (
        <motion.div
          key='teacher-point-catalog'
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
        >
          <PointCatalogPanel catalog={catalog} isMobile={isMobile} />
        </motion.div>
      ),
    },
  ];

  const isPageLoading =
    isBootstrapLoading || (!!activePeriode?.id && isEntriesLoading);

  if (isPageLoading) return <Skeleton active paragraph={{ rows: 6 }} />;

  if (isBootstrapError) {
    return (
      <Card style={emptyCardStyle} styles={{ body: { padding: 28 } }}>
        <Flex vertical align='center' gap={12}>
          <Title level={4} style={{ margin: 0 }}>
            Akses poin tidak tersedia
          </Title>
          <Text style={{ color: museColors.muted, textAlign: "center" }}>
            {bootstrapError?.data?.message ||
              "Halaman ini hanya bisa diakses wali kelas."}
          </Text>
        </Flex>
      </Card>
    );
  }

  const classPicker =
    canPickClass && classOptions.length > 0 ? (
      <Select
        aria-label='Pilih kelas'
        value={classId || homeroomClass?.id}
        options={classOptions.map((item) => ({
          value: item.id,
          label: item.grade_name ? `${item.name} · ${item.grade_name}` : item.name,
        }))}
        onChange={(value) => {
          setClassId(value);
          setSelectedStudentId(null);
        }}
        style={{ minWidth: isMobile ? "100%" : 280 }}
      />
    ) : (
      <Tag>Kelas: {homeroomClass?.name || "-"}</Tag>
    );

  return (
    <PageTabs
      title='Poin Siswa'
      description={`${activePeriode?.name || "Periode belum aktif"} · ${
        pointConfig?.show_balance ? "Poin bersih aktif" : "Rangkuman prestasi dan pelanggaran"
      }. Pemberian dan perubahan poin dilakukan oleh admin atau kesiswaan.`}
      items={tabItems}
      extra={classPicker}
    />
  );
};

export default TeacherPointView;
