import React, { useMemo, useState } from "react";
import {
  Card,
  Checkbox,
  Empty,
  Flex,
  Grid,
  Input,
  List,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { motion } from "framer-motion";
import { Search, ShieldCheck, UserRound } from "lucide-react";
import {
  useGetStaffAssignmentsQuery,
  useSaveStaffAssignmentMutation,
} from "../../../service/lms/ApiStaffAssignment";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const heroStyle = {
  borderRadius: 28,
  overflow: "hidden",
  border: "1px solid rgba(191, 219, 254, 0.76)",
  background:
    "radial-gradient(circle at top right, rgba(125, 211, 252, 0.35), transparent 34%), linear-gradient(135deg, #0f172a 0%, #0f3d8f 45%, #0ea5e9 100%)",
  boxShadow: "0 24px 60px rgba(15, 23, 42, 0.18)",
};

const tableCardStyle = {
  borderRadius: 24,
  border: "1px solid #e5edf6",
  background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
  boxShadow: "0 18px 36px rgba(15, 23, 42, 0.06)",
  width: "100%",
  minWidth: 0,
};

const recordCardStyle = {
  borderRadius: 14,
  border: "1px solid #e8eef6",
  background: "#ffffff",
  boxShadow: "0 6px 16px rgba(15, 23, 42, 0.04)",
  width: "100%",
  minWidth: 0,
};

const assignmentTileStyle = {
  borderRadius: 10,
  border: "1px solid #eef2f7",
  background: "#f8fafc",
  padding: "10px 12px",
  minWidth: 0,
};

const StaffAssignment = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isCompact = !screens.sm;
  const [searchText, setSearchText] = useState("");

  const { data, isLoading } = useGetStaffAssignmentsQuery();
  const [saveAssignment, { isLoading: isSaving }] =
    useSaveStaffAssignmentMutation();

  const teachers = data?.data || [];
  const assignmentTypes = data?.meta?.assignment_types || [
    { value: "cbt", label: "CBT" },
    { value: "kurikulum", label: "Kurikulum" },
    { value: "kesiswaan", label: "Kesiswaan" },
  ];

  const filteredTeachers = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return teachers;
    return teachers.filter((item) => {
      const name = item.full_name?.toLowerCase() || "";
      const nip = item.nip?.toLowerCase() || "";
      return name.includes(keyword) || nip.includes(keyword);
    });
  }, [searchText, teachers]);

  const handleToggle = async (teacher, type, checked) => {
    const current = Array.isArray(teacher.assignments)
      ? teacher.assignments
      : [];
    const nextTypes = checked
      ? [...new Set([...current, type])]
      : current.filter((item) => item !== type);

    try {
      const res = await saveAssignment({
        teacherId: teacher.id,
        assignment_types: nextTypes,
      }).unwrap();
      message.success(res?.message || "Penugasan wewenang disimpan.");
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan penugasan.");
    }
  };

  const isTeacherDisabled = (teacher) =>
    isSaving || teacher.is_active === false;

  const renderTeacherIdentity = (teacher) => (
    <Flex vertical gap={4} style={{ minWidth: 0 }}>
      <Text
        strong
        ellipsis={{ tooltip: teacher.full_name }}
        style={{ fontSize: isMobile ? 14 : 15, maxWidth: "100%" }}
      >
        {teacher.full_name}
      </Text>
      <Flex gap={6} wrap="wrap" align="center">
        <Text type="secondary" style={{ fontSize: 12 }}>
          {teacher.nip || "Tanpa NIP"}
        </Text>
        {teacher.is_homeroom ? (
          <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>
            Wali kelas
          </Tag>
        ) : null}
        {teacher.is_active === false ? (
          <Tag style={{ margin: 0, fontSize: 11 }}>Nonaktif</Tag>
        ) : null}
      </Flex>
    </Flex>
  );

  const renderAssignmentControls = (teacher, layout = "grid") => (
    <div
      style={
        layout === "grid"
          ? {
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "repeat(2, minmax(0, 1fr))",
              gap: 8,
            }
          : undefined
      }
    >
      {assignmentTypes.map((item) => (
        <Flex
          key={item.value}
          justify="space-between"
          align="center"
          gap={10}
          style={layout === "grid" ? assignmentTileStyle : undefined}
        >
          <Text style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</Text>
          <Checkbox
            checked={teacher.assignments?.includes(item.value)}
            disabled={isTeacherDisabled(teacher)}
            onChange={(event) =>
              handleToggle(teacher, item.value, event.target.checked)
            }
          />
        </Flex>
      ))}
    </div>
  );

  const renderMobileCard = (teacher) => (
    <Card style={recordCardStyle} styles={{ body: { padding: 14 } }}>
      <Flex vertical gap={12} style={{ minWidth: 0 }}>
        {renderTeacherIdentity(teacher)}
        {renderAssignmentControls(teacher, "grid")}
      </Flex>
    </Card>
  );

  const columns = [
    {
      title: "Guru",
      dataIndex: "full_name",
      width: isMobile ? 200 : 280,
      fixed: isMobile ? "left" : undefined,
      ellipsis: true,
      render: (_, record) => renderTeacherIdentity(record),
    },
    ...assignmentTypes.map((item) => ({
      title: item.label,
      dataIndex: item.value,
      align: "center",
      width: 120,
      render: (_, record) => (
        <Checkbox
          checked={record.assignments?.includes(item.value)}
          disabled={isTeacherDisabled(record)}
          onChange={(event) =>
            handleToggle(record, item.value, event.target.checked)
          }
        />
      ),
    })),
  ];

  const emptyNode = (
    <Empty description="Belum ada guru pada satuan ini." />
  );

  return (
    <Flex vertical gap={isMobile ? 14 : 18} style={{ width: "100%", minWidth: 0 }}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36 }}
      >
        <Card
          variant="borderless"
          style={{ ...heroStyle, borderRadius: isMobile ? 22 : 28 }}
          styles={{ body: { padding: isMobile ? 18 : 28 } }}
        >
          <Flex vertical gap={isMobile ? 10 : 12}>
            <Space size={[10, 10]} wrap>
              <Tag
                style={{
                  margin: 0,
                  borderRadius: 999,
                  paddingInline: 12,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.12)",
                  color: "#fff",
                }}
                icon={<ShieldCheck size={13} />}
              >
                Penugasan Wewenang
              </Tag>
            </Space>
            <Title
              level={isMobile ? 4 : 2}
              style={{ margin: 0, color: "#fff", lineHeight: 1.2 }}
            >
              Tugaskan guru untuk modul tertentu
            </Title>
            <Text
              style={{
                color: "rgba(255,255,255,0.82)",
                maxWidth: 720,
                fontSize: isMobile ? 13 : 14,
                lineHeight: 1.5,
              }}
            >
              Guru yang ditugaskan mendapat otoritas setara admin satuan pada
              modul itu, sampai penugasan dicabut. Hanya admin satuan yang dapat
              menugaskan.
            </Text>
          </Flex>
        </Card>
      </motion.div>

      <Card
        style={tableCardStyle}
        styles={{ body: { padding: isMobile ? 14 : 20 } }}
      >
        <Flex
          justify="space-between"
          align={isMobile ? "stretch" : "center"}
          gap={12}
          vertical={isMobile}
          style={{ marginBottom: 16 }}
        >
          <Space>
            <UserRound size={16} />
            <Text strong style={{ fontSize: isMobile ? 13 : 14 }}>
              {filteredTeachers.length} guru satuan
            </Text>
          </Space>
          <Input
            allowClear
            value={searchText}
            placeholder="Cari nama atau NIP..."
            prefix={<Search size={16} style={{ color: "#64748b" }} />}
            onChange={(event) => setSearchText(event.target.value)}
            style={{
              width: isMobile ? "100%" : undefined,
              maxWidth: isMobile ? "100%" : 280,
              borderRadius: 14,
            }}
          />
        </Flex>

        {isLoading ? (
          <Flex justify="center" style={{ padding: "48px 0" }}>
            <Spin />
          </Flex>
        ) : filteredTeachers.length === 0 ? (
          emptyNode
        ) : isMobile ? (
          <List
            dataSource={filteredTeachers}
            rowKey="id"
            split={false}
            renderItem={(teacher) => (
              <List.Item
                style={{ padding: 0, marginBottom: 10, borderBlockEnd: "none" }}
              >
                {renderMobileCard(teacher)}
              </List.Item>
            )}
          />
        ) : (
          <Table
            rowKey="id"
            loading={isLoading}
            columns={columns}
            dataSource={filteredTeachers}
            pagination={false}
            size={screens.lg ? "middle" : "small"}
            scroll={{ x: 280 + assignmentTypes.length * 120 }}
            locale={{ emptyText: emptyNode }}
          />
        )}
      </Card>
    </Flex>
  );
};

export default StaffAssignment;
