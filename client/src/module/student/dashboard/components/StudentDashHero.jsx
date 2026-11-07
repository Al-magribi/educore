import { Flex, Tag } from "antd";
import PageHeader from "../../../../components/ui/PageHeader";

const StudentDashHero = ({
  studentName,
  nis,
  classSummary,
  periodeName,
}) => (
  <PageHeader
    title={studentName || "Dashboard Siswa"}
    description='Ringkasan belajar, tugas, dan kehadiran Anda.'
    meta={
      <Flex gap={8} wrap='wrap'>
        <Tag>NIS {nis || "-"}</Tag>
        <Tag>{classSummary || "Kelas belum tersedia"}</Tag>
        <Tag>{periodeName || "Periode belum aktif"}</Tag>
      </Flex>
    }
  />
);

export default StudentDashHero;
