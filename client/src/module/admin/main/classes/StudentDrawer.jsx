import React, { useState } from "react";
import { motion } from "framer-motion";
import { Drawer, Grid, Tabs, Tag } from "antd";
import { UserPlus, Users } from "lucide-react";
import StudentList from "./components/StudentList";
import { AddStudentForm } from "./components/StudentForm";
import { CardTitle } from "../../../../components/ui/muse";
import { museColors } from "../../../../config/theme";

const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const StudentDrawer = ({ open, classData, onClose }) => {
  const [activeTab, setActiveTab] = useState("list");
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  if (!classData) return null;

  const items = [
    {
      key: "list",
      label: "Daftar Siswa",
      icon: <Users size={16} />,
      children: (
        <MotionDiv
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          <StudentList classId={classData.id} />
        </MotionDiv>
      ),
    },
    {
      key: "add",
      label: "Tambah Manual",
      icon: <UserPlus size={16} />,
      children: (
        <MotionDiv
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          <AddStudentForm
            classId={classData.id}
            onSuccess={() => setActiveTab("list")}
          />
        </MotionDiv>
      ),
    },
  ];

  const handleClose = () => {
    setActiveTab("list");
    onClose();
  };

  return (
    <Drawer
      width={isMobile ? "100%" : 720}
      onClose={handleClose}
      afterOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setActiveTab("list");
        }
      }}
      open={open}
      destroyOnHidden
      title={
        <CardTitle
          icon={<Users size={16} />}
          title={`Siswa ${classData?.name || ""}`}
          description={
            isMobile ? undefined : "Kelola daftar siswa kelas ini atau tambahkan siswa secara manual."
          }
        />
      }
      extra={
        classData?.grade_name ? (
          <Tag style={{ margin: 0 }}>Tingkat {classData.grade_name}</Tag>
        ) : null
      }
      styles={{ body: { background: museColors.bgLayout, paddingTop: 8 } }}
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={items} />
    </Drawer>
  );
};

export default StudentDrawer;
