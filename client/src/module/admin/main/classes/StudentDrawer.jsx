import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Drawer,
  Tabs,
  Typography,
  Button,
  Flex,
  Card,
  Tag,
  Grid,
  Space,
} from "antd";
import { Users, UserPlus, X, GraduationCap, LayoutGrid } from "lucide-react";
import StudentList from "./components/StudentList";
import { AddStudentForm } from "./components/StudentForm";

const { Title, Text } = Typography;
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
      label: (
        <Flex align='center' gap={8}>
          <Users size={16} />
          <span>Daftar Siswa</span>
        </Flex>
      ),
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
      label: (
        <Flex align='center' gap={8}>
          <UserPlus size={16} />
          <span>Tambah Manual</span>
        </Flex>
      ),
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

  return (
    <Drawer
      title={null}
      width={isMobile ? "100%" : 720}
      onClose={() => {
        setActiveTab("list");
        onClose();
      }}
      afterOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setActiveTab("list");
        }
      }}
      open={open}
      destroyOnHidden
      closable={false}
      styles={{
        body: {
          padding: 0,
          background: "#f8fafc",
        },
        header: {
          display: "none",
        },
      }}
    >
      <MotionDiv
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
        style={{ height: "100%", display: "flex", flexDirection: "column" }}
      >
        <div
          style={{
            padding: isMobile ? 20 : 24,
            background:
              "linear-gradient(135deg, rgba(240,253,244,1), rgba(239,246,255,0.98))",
            borderBottom: "1px solid rgba(148, 163, 184, 0.16)",
          }}
        >
          <Flex justify='space-between' align='flex-start' gap={16}>
            <Flex align='flex-start' gap={16}>
              <div
                style={{
                  width: isMobile ? 50 : 58,
                  height: isMobile ? 50 : 58,
                  borderRadius: 20,
                  display: "grid",
                  placeItems: "center",
                  background: "linear-gradient(135deg, #0f766e, #0284c7)",
                  color: "#fff",
                  boxShadow: "0 18px 32px rgba(2, 132, 199, 0.24)",
                  flexShrink: 0,
                }}
              >
                <Users size={24} />
              </div>

              <div>
                <Flex
                  align={isMobile ? "flex-start" : "center"}
                  vertical={isMobile}
                  gap={10}
                  style={{ marginBottom: 6 }}
                >
                  <Title level={3} style={{ margin: 0 }}>
                    Manajemen Siswa
                  </Title>

                  <Space>
                    <Tag
                      variant='filled'
                      style={{
                        marginInlineEnd: 0,
                        borderRadius: 999,
                        padding: "6px 12px",
                        background: "rgba(3, 105, 161, 0.10)",
                        color: "#0369a1",
                        fontWeight: 600,
                      }}
                    >
                      {classData?.name}
                    </Tag>

                    <Tag
                      variant='filled'
                      style={{
                        marginInlineEnd: 0,
                        borderRadius: 999,
                        padding: "6px 12px",
                        background: "rgba(3, 105, 161, 0.10)",
                        color: "#0369a1",
                        fontWeight: 600,
                      }}
                    >
                      {classData?.grade_name}
                    </Tag>
                  </Space>
                </Flex>

                <Text
                  type='secondary'
                  style={{ display: "block", maxWidth: 520 }}
                >
                  Kelola daftar siswa pada kelas ini, tambahkan siswa secara
                  manual, dan jaga data tetap rapi dari satu panel yang lebih
                  fokus.
                </Text>
              </div>
            </Flex>

            <Button
              onClick={onClose}
              icon={<X size={16} />}
              style={{
                borderRadius: 14,
                flexShrink: 0,
              }}
            >
              Tutup
            </Button>
          </Flex>
        </div>

        <div style={{ padding: isMobile ? 16 : 20, flex: 1, overflow: "auto" }}>
          <Card
            bordered={false}
            style={{
              borderRadius: 24,
              boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)",
            }}
            styles={{ body: { padding: isMobile ? 14 : 18 } }}
          >
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={items}
              type='card'
              size='large'
            />
          </Card>
        </div>
      </MotionDiv>
    </Drawer>
  );
};

export default StudentDrawer;
