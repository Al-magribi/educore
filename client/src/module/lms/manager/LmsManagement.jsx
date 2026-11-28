import React, { Suspense, lazy, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Button, Col, Empty, Flex, Grid, Row, Skeleton, Tag, Typography } from "antd";
import { ArrowLeft, BookOpen, Layers, Library, Users } from "lucide-react";
import { useGetSubjectsQuery } from "../../../service/lms/ApiLms";
import {
  canManageKurikulum,
  teacherOwnsSubject,
} from "../../../utils/staffAssignment";
import { useSearchParams } from "react-router-dom";
import PageHeader from "../../../components/ui/PageHeader";
import { IconBox, MuseCard } from "../../../components/ui/muse";
import { DataListCard } from "../../../components/ui/muse/DataSection";
import { museColors, museRadius } from "../../../config/theme";

const TeacherView = lazy(() => import("./teacher/TeacherView"));
const AdminView = lazy(() => import("./admin/AdminView"));

const { Text } = Typography;
const { useBreakpoint } = Grid;

const subjectCardStyle = {
  height: "100%",
  borderRadius: museRadius.item,
  border: `1px solid ${museColors.divider}`,
};

const LmsManagement = () => {
  const { user } = useSelector((state) => state.auth);
  const isTeacher = user?.role === "teacher";
  const isAdmin = user?.role === "admin" || canManageKurikulum(user);
  const canKurikulum = canManageKurikulum(user);
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [searchParams, setSearchParams] = useSearchParams();

  const view = searchParams.get("view");
  const subject_id = searchParams.get("subject_id");

  const [searchText, setSearchText] = useState("");
  const { data: subjectsRes, isLoading } = useGetSubjectsQuery();
  const subjects = useMemo(() => subjectsRes?.data || [], [subjectsRes]);

  const filteredSubjects = useMemo(() => {
    if (!searchText) return subjects;
    const keyword = searchText.toLowerCase();
    return subjects.filter((item) => {
      const name = item?.name?.toLowerCase() || "";
      const code = item?.code?.toLowerCase() || "";
      const category = item?.category_name?.toLowerCase() || "";
      const branch = item?.branch_name?.toLowerCase() || "";
      return (
        name.includes(keyword) ||
        code.includes(keyword) ||
        category.includes(keyword) ||
        branch.includes(keyword)
      );
    });
  }, [subjects, searchText]);

  const roleLabel = isAdmin ? (isTeacher ? "Kurikulum" : "Admin") : "Guru";
  const roleHint = isAdmin
    ? isTeacher
      ? "Mapel yang Anda ampu dibuka sebagai guru; mapel lain sebagai pengelola satuan."
      : "Menampilkan semua pelajaran pada satuan Anda."
    : "Menampilkan pelajaran yang Anda ampu.";
  const activeSubject = subjects.find(
    (item) => String(item.id) === String(subject_id),
  );
  const isDetail = Boolean(view && subject_id);

  const handleDetail = (nextView, nextSubjectId) => {
    setSearchParams({ view: nextView, subject_id: nextSubjectId });
  };

  const handleReset = () => setSearchParams({});

  const renderCatalog = () => {
    if (isLoading) {
      return (
        <Row gutter={[16, 16]} style={{ padding: 16 }}>
          {[1, 2, 3, 4, 5, 6].map((key) => (
            <Col xs={24} sm={12} lg={8} xl={6} key={key}>
              <Skeleton active paragraph={{ rows: 3 }} />
            </Col>
          ))}
        </Row>
      );
    }

    if (filteredSubjects.length === 0) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{ padding: "32px 16px" }}
          description={
            searchText
              ? `Tidak ada pelajaran yang cocok dengan "${searchText}". Coba kata kunci lain.`
              : isTeacher
                ? "Belum ada pelajaran yang Anda ampu. Hubungi bagian kurikulum untuk penugasan mapel."
                : "Belum ada pelajaran terdaftar. Tambahkan mapel di menu Data Akademik."
          }
        />
      );
    }

    return (
      <Row gutter={[16, 16]} style={{ padding: isMobile ? 12 : 16 }}>
        {filteredSubjects.map((item) => (
          <Col xs={24} sm={12} lg={8} xl={6} key={item.id}>
            <MuseCard
              hoverable
              onClick={() => handleDetail(isTeacher ? "teacher" : "admin", item.id)}
              style={{ ...subjectCardStyle, boxShadow: "none" }}
            >
              <Flex vertical gap={12}>
                <Flex align='center' gap={12}>
                  <IconBox icon={<BookOpen size={20} />} size={40} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      strong
                      ellipsis={{ tooltip: item.name }}
                      style={{ display: "block", fontSize: 14 }}
                    >
                      {item.name}
                    </Text>
                    <Text type='secondary' style={{ fontSize: 12 }}>
                      Kode: {item.code || "-"} · KKM {item.kkm ?? "-"}
                    </Text>
                  </div>
                </Flex>

                <Flex gap={6} wrap>
                  <Tag icon={<Layers size={12} />} style={{ marginRight: 0 }}>
                    {item.category_name || "Umum"}
                  </Tag>
                  {item.branch_name ? (
                    <Tag color='cyan' style={{ marginRight: 0 }}>
                      {item.branch_name}
                    </Tag>
                  ) : null}
                  {isTeacher && item.class_names?.length > 0 ? (
                    <Tag color='green' icon={<Users size={12} />} style={{ marginRight: 0 }}>
                      {item.class_names.length} Kelas
                    </Tag>
                  ) : null}
                </Flex>

                {isTeacher && item.class_names?.length > 0 ? (
                  <Text type='secondary' ellipsis={{ tooltip: item.class_names.join(", ") }} style={{ fontSize: 12 }}>
                    {item.class_names.join(", ")}
                  </Text>
                ) : null}
              </Flex>
            </MuseCard>
          </Col>
        ))}
      </Row>
    );
  };

  const showTeacherView =
    isTeacher &&
    (!canKurikulum ||
      teacherOwnsSubject(user, subject_id) ||
      activeSubject?.taught_by_me);

  const headerTitle = isDetail
    ? activeSubject?.name || "Detail Pelajaran"
    : "Kelola Mata Pelajaran";
  const backButton = isDetail ? (
    <Button icon={<ArrowLeft size={16} />} onClick={handleReset}>
      Kembali ke Katalog
    </Button>
  ) : null;
  const detailFallback = (
    <MuseCard>
      <Skeleton active paragraph={{ rows: 4 }} />
    </MuseCard>
  );

  if (isDetail && showTeacherView) {
    return (
      <Suspense fallback={detailFallback}>
        <title>{headerTitle}</title>
        <TeacherView
          subjectId={subject_id}
          subject={activeSubject}
          title={headerTitle}
          description={roleHint}
          extra={backButton}
        />
      </Suspense>
    );
  }

  return (
    <Flex vertical gap={isMobile ? 16 : 24} style={{ minWidth: 0 }}>
      <title>{isDetail ? headerTitle : "Daftar Pelajaran"}</title>
      <PageHeader
        title={headerTitle}
        description={roleHint}
        meta={<Tag>Akses {roleLabel}</Tag>}
        extra={backButton}
      />

      {isDetail ? (
        <Suspense fallback={detailFallback}>
          <AdminView subjectId={subject_id} subject={activeSubject} />
        </Suspense>
      ) : (
        <DataListCard
          title='Katalog Pelajaran'
          icon={<Library size={18} />}
          count={filteredSubjects.length}
          unit='mapel'
          description='Pilih pelajaran untuk membuka ringkasan, rekap, dan pengelolaan detail.'
          searchProps={{
            placeholder: "Cari pelajaran, kategori, atau cabang",
            value: searchText,
            onChange: (e) => setSearchText(e.target.value),
          }}
        >
          {renderCatalog()}
        </DataListCard>
      )}
    </Flex>
  );
};

export default LmsManagement;
