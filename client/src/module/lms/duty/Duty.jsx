import React, { useState } from "react";
import { useSelector } from "react-redux";
import { Alert, Tabs } from "antd";
import AdminDutyView from "./AdminDutyView";
import TeacherDutyView from "./TeacherDutyView";
import { canManageKurikulum } from "../../../utils/staffAssignment";

const Duty = () => {
  const { user } = useSelector((state) => state.auth);
  const canManage = canManageKurikulum(user);
  const isTeacher = user?.role === "teacher";
  const showTeacherDuty = isTeacher && Boolean(user?.has_duty_today);
  const [activeTab, setActiveTab] = useState("manage");

  if (canManage && showTeacherDuty) {
    return (
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "manage",
            label: "Kelola Piket",
            children: <AdminDutyView />,
          },
          {
            key: "mine",
            label: "Piket Saya",
            children: <TeacherDutyView />,
          },
        ]}
      />
    );
  }

  if (canManage) {
    return <AdminDutyView />;
  }

  if (isTeacher) {
    return <TeacherDutyView />;
  }

  return (
    <Alert
      showIcon
      type="info"
      title="Halaman Piket tidak tersedia untuk role ini."
    />
  );
};

export default Duty;
