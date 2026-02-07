import React, { useState } from "react";
import { Drawer, Tabs } from "antd";
import StudentList from "./components/StudentList";
import { AddStudentForm } from "./components/StudentForm";

const StudentDrawer = ({ open, classData, onClose }) => {
  const [activeTab, setActiveTab] = useState("list");

  if (!classData) return null;

  const items = [
    {
      key: "list",
      label: "Daftar Siswa",
      children: <StudentList classId={classData.id} />,
    },
    {
      key: "add",
      label: "Tambah Manual",
      children: (
        <AddStudentForm
          classId={classData.id}
          onSuccess={() => setActiveTab("list")}
        />
      ),
    },
  ];

  return (
    <Drawer
      title={`Manajemen Siswa - ${classData.name}`}
      size={600}
      onClose={onClose}
      open={open}
      destroyOnHidden
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={items}
        type="card"
      />
    </Drawer>
  );
};

export default StudentDrawer;
