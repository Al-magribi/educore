import React from "react";
import { useSelector } from "react-redux";
import { Alert } from "antd";
import AdminDutyView from "./AdminDutyView";
import TeacherDutyView from "./TeacherDutyView";

const Duty = () => {
  const { user } = useSelector((state) => state.auth);
  const isManager = user?.role === "admin" && user?.level === "satuan";
  const isTeacher = user?.role === "teacher";

  if (isManager) {
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
