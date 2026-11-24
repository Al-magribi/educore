import React, { useMemo, useState } from "react";
import { Alert, App, Button, Empty, Flex, Grid, Typography } from "antd";
import { Pencil, Users } from "lucide-react";
import {
  useGetParentStudentsQuery,
  useUpdateParentStudentMutation,
} from "../../../service/database/ApiDatabase";
import PageHeader from "../../../components/ui/PageHeader";
import { CardTitle, MuseCard } from "../../../components/ui/muse";
import { museColors, museRadius } from "../../../config/theme";
import DbForm from "../form/DbForm";
import {
  CompletionTag,
  StudentAvatar,
  StudentProfileLayout,
  StudentProfileSections,
  StudentSummaryCard,
} from "../components/StudentProfile";

const { Text } = Typography;
const { useBreakpoint } = Grid;
const EMPTY_LIST = [];

const ChildPicker = ({ students, selectedId, onSelect }) => (
  <MuseCard
    title={
      <CardTitle
        icon={<Users size={16} />}
        title='Pilih Anak'
        description={`${students.length} anak terhubung ke akun ini`}
      />
    }
    styles={{ body: { paddingTop: 0 } }}
  >
    <Flex vertical gap={8} role='radiogroup' aria-label='Pilih anak'>
      {students.map((item) => {
        const active = item.student_id === selectedId;
        return (
          <Flex
            key={item.student_id}
            role='radio'
            aria-checked={active}
            tabIndex={0}
            align='center'
            gap={12}
            onClick={() => onSelect(item.student_id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(item.student_id);
              }
            }}
            style={{
              padding: "10px 12px",
              borderRadius: museRadius.item,
              border: `1px solid ${active ? museColors.primary : museColors.divider}`,
              background: active ? museColors.primarySoft : "#fff",
              cursor: "pointer",
              minWidth: 0,
            }}
          >
            <StudentAvatar gender={item.gender} size={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text strong ellipsis style={{ display: "block" }}>
                {item.full_name}
              </Text>
              <Text type='secondary' style={{ fontSize: 12 }}>
                {item.class_name || "-"} · {item.completion_percent || 0}%
              </Text>
            </div>
            <CompletionTag status={item.completion_status} />
          </Flex>
        );
      })}
    </Flex>
  </MuseCard>
);

const ParentStudentDatabase = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { message } = App.useApp();
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  const { data, isLoading, error } = useGetParentStudentsQuery();
  const [updateParentStudent, { isLoading: isUpdating }] = useUpdateParentStudentMutation();

  const students = data?.data ?? EMPTY_LIST;

  const selectedStudent = useMemo(() => {
    if (!students.length) return null;
    return students.find((item) => item.student_id === selectedStudentId) || students[0];
  }, [students, selectedStudentId]);

  const handleSubmit = async (values) => {
    if (!selectedStudent?.student_id) return;
    try {
      await updateParentStudent({ studentId: selectedStudent.student_id, ...values }).unwrap();
      message.success(`Data ${selectedStudent.full_name} berhasil diperbarui`);
      setIsOpen(false);
    } catch (err) {
      message.error(err?.data?.message || "Gagal memperbarui data siswa");
    }
  };

  return (
    <>
      <Flex vertical gap={isMobile ? 16 : 24}>
        <PageHeader
          title='Database Anak'
          description='Tinjau kelengkapan data anak dan perbarui bila ada perubahan.'
          extra={
            !isMobile && selectedStudent ? (
              <Button type='primary' icon={<Pencil size={16} />} onClick={() => setIsOpen(true)}>
                Perbarui Data
              </Button>
            ) : null
          }
        />

        {error ? (
          <Alert
            type='error'
            showIcon
            title='Gagal memuat data anak'
            description={error?.data?.message || "Coba muat ulang halaman."}
          />
        ) : !isLoading && !students.length ? (
          <MuseCard>
            <Empty description='Belum ada siswa yang terhubung ke akun ini. Hubungi admin atau wali kelas.' />
          </MuseCard>
        ) : (
          <StudentProfileLayout
            aside={
              <Flex vertical gap={isMobile ? 16 : 24}>
                {students.length > 1 ? (
                  <ChildPicker
                    students={students}
                    selectedId={selectedStudent?.student_id}
                    onSelect={setSelectedStudentId}
                  />
                ) : null}
                <StudentSummaryCard
                  student={selectedStudent}
                  loading={isLoading}
                  onEdit={isMobile ? () => setIsOpen(true) : undefined}
                />
              </Flex>
            }
          >
            <StudentProfileSections student={selectedStudent} loading={isLoading} />
          </StudentProfileLayout>
        )}
      </Flex>

      <DbForm
        open={isOpen}
        student={selectedStudent}
        loading={isUpdating}
        onCancel={() => setIsOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  );
};

export default ParentStudentDatabase;
