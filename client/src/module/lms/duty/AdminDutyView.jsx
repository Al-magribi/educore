import React, { useState } from "react";
import dayjs from "dayjs";
import { Alert, Flex, Space, Tabs } from "antd";
import { ClipboardList, FileText } from "lucide-react";
import AdminDutyAssignmentTab from "./AdminDutyAssignmentTab";
import AdminDutyReportTab from "./AdminDutyReportTab";

const AdminDutyView = () => {
  const [selectedDate, setSelectedDate] = useState(dayjs());

  return (
    <Tabs
      items={[
        {
          key: "assignments",
          label: (
            <Space size={6}>
              <ClipboardList size={14} />
              Penugasan
            </Space>
          ),
          children: (
            <AdminDutyAssignmentTab
              selectedDate={selectedDate}
              onChangeDate={setSelectedDate}
            />
          ),
        },
        {
          key: "reports",
          label: (
            <Space size={6}>
              <FileText size={14} />
              Laporan
            </Space>
          ),
          children: (
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
