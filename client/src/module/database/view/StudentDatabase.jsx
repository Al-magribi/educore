import React, { useState } from "react";
import { Alert, App, Button, Empty, Flex, Grid } from "antd";
import { Pencil } from "lucide-react";
import {
  useGetMyStudentProfileQuery,
  useUpdateMyStudentProfileMutation,
} from "../../../service/database/ApiDatabase";
import PageHeader from "../../../components/ui/PageHeader";
import { MuseCard } from "../../../components/ui/muse";
import DbForm from "../form/DbForm";
import {
  StudentProfileLayout,
  StudentProfileSections,
  StudentSummaryCard,
} from "../components/StudentProfile";

const { useBreakpoint } = Grid;

const StudentDatabase = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { message } = App.useApp();
  const [isOpen, setIsOpen] = useState(false);
  const { data, isLoading, error } = useGetMyStudentProfileQuery();
  const [updateProfile, { isLoading: isUpdating }] = useUpdateMyStudentProfileMutation();

  const student = data?.data || null;

  const handleSubmit = async (values) => {
    try {
      await updateProfile(values).unwrap();
      message.success("Data diri berhasil diperbarui");
      setIsOpen(false);
    } catch (err) {
      message.error(err?.data?.message || "Gagal memperbarui data");
    }
  };

  return (
    <>
      <Flex vertical gap={isMobile ? 16 : 24}>
        <PageHeader
          title='Database Siswa'
          description='Tinjau dan lengkapi biodata, data orang tua, serta keluarga kamu.'
          extra={
            !isMobile ? (
              <Button type='primary' icon={<Pencil size={16} />} onClick={() => setIsOpen(true)} disabled={!student}>
                Perbarui Data
              </Button>
            ) : null
          }
        />

        {error ? (
          <Alert
            type='error'
            showIcon
            title='Gagal memuat data siswa'
            description={error?.data?.message || "Coba muat ulang halaman."}
          />
        ) : !isLoading && !student ? (
          <MuseCard>
            <Empty description='Data siswa belum ditemukan. Hubungi admin sekolah.' />
          </MuseCard>
        ) : (
          <StudentProfileLayout
            aside={
              <StudentSummaryCard
                student={student}
                loading={isLoading}
                onEdit={isMobile ? () => setIsOpen(true) : undefined}
              />
            }
          >
            <StudentProfileSections student={student} loading={isLoading} />
          </StudentProfileLayout>
        )}
      </Flex>

      <DbForm
        open={isOpen}
        student={student}
        loading={isUpdating}
        onCancel={() => setIsOpen(false)}
        onSubmit={handleSubmit}
      />
    </>
  );
};

export default StudentDatabase;
