import { Flex, Tag } from "antd";
import PageHeader from "../../../../components/ui/PageHeader";

const TeacherPointHero = ({ periode, homeroomClass, pointConfig }) => (
  <PageHeader
    title='Poin Siswa'
    description='Pantau akumulasi penghargaan dan pelanggaran siswa kelas wali Anda. Pemberian dan perubahan poin dilakukan oleh admin atau kesiswaan.'
    meta={
      <Flex gap={8} wrap='wrap'>
        <Tag>Wali Kelas</Tag>
        <Tag>{periode?.name || "Periode belum aktif"}</Tag>
        <Tag>Kelas: {homeroomClass?.name || "-"}</Tag>
        <Tag>
          {pointConfig?.show_balance
            ? "Poin bersih aktif"
            : "Rangkuman prestasi dan pelanggaran"}
        </Tag>
      </Flex>
    }
  />
);

export default TeacherPointHero;
