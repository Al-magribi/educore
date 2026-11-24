import React, { useState } from "react";
import dayjs from "dayjs";
import { ClipboardList, FileText } from "lucide-react";
import AdminDutyAssignmentTab from "./AdminDutyAssignmentTab";
import AdminDutyReportTab from "./AdminDutyReportTab";
import { PageTabs } from "../../../components/ui/muse";

const AdminDutyView = () => {
  const [selectedDate, setSelectedDate] = useState(dayjs());

  return (
    <PageTabs
      title='Kelola Piket Guru'
      description='Atur penugasan piket dan lihat laporan harian guru.'
      items={[
        {
          key: "assignments",
          label: "Penugasan",
          icon: <ClipboardList />,
          description:
            "Atur guru piket Senin–Jumat sekali saja. Jadwal berulang setiap minggu dan bisa diubah kapan saja.",
          render: () => <AdminDutyAssignmentTab />,
        },
        {
          key: "reports",
          label: "Laporan",
          icon: <FileText />,
          description:
            "Tinjau rekap siswa, guru, aktivitas kelas, dan catatan harian dalam satu area kerja.",
          render: () => (
            <AdminDutyReportTab
              selectedDate={selectedDate}
              onChangeDate={setSelectedDate}
            />
          ),
        },
      ]}
    />
  );
};

export default AdminDutyView;
