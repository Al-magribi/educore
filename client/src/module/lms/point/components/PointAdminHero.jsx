import { Button, Tag } from "antd";
import { Plus } from "lucide-react";
import PageHeader from "../../../../components/ui/PageHeader";

const PointAdminHero = ({ activePeriode, onCreate }) => (
  <PageHeader
    title='Kelola Poin Peraturan'
    description='Susun rule poin, lalu berikan prestasi dan pelanggaran kepada siswa. Hanya admin dan kesiswaan yang dapat menambah atau mengubah poin.'
    meta={<Tag>{activePeriode?.name || "Periode belum aktif"}</Tag>}
    extra={
      <Button type='primary' icon={<Plus size={16} />} onClick={onCreate}>
        Tambah Rule Baru
      </Button>
    }
  />
);

export default PointAdminHero;
