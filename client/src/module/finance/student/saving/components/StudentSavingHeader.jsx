import { Space, Tag } from "antd";

import PageHeader from "../../../../../components/ui/PageHeader";

const StudentSavingHeader = ({ activePeriode, student }) => (
  <PageHeader
    title='Riwayat tabungan siswa'
    description='Lihat saldo, mutasi setoran, dan penarikan tabungan lintas periode.'
    meta={
      <Space wrap size={[8, 8]}>
        <Tag color='blue' style={{ margin: 0 }}>
          {activePeriode?.name || "Periode aktif"}
        </Tag>
        <Tag color='cyan' style={{ margin: 0 }}>
          {student?.class_name || "-"}
          {student?.grade_name ? ` • ${student.grade_name}` : ""}
        </Tag>
      </Space>
    }
  />
);

export default StudentSavingHeader;
