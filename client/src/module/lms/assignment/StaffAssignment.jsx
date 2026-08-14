import React, { useMemo, useState } from "react";
import {
  Card,
  Checkbox,
  Empty,
  Flex,
  Grid,
  Input,
  Space,
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
};

const StaffAssignment = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
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

  const columns = [
    {
      title: "Guru",
      dataIndex: "full_name",
      render: (value, record) => (
        <Flex vertical gap={2}>
          <Text strong>{value}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.nip || "Tanpa NIP"}
            {record.is_homeroom ? " · Wali kelas" : ""}
          </Text>
        </Flex>
      ),
    },
    ...assignmentTypes.map((item) => ({
      title: item.label,
      dataIndex: item.value,
      align: "center",
      width: isMobile ? 88 : 140,
      render: (_, record) => (
        <Checkbox
          checked={record.assignments?.includes(item.value)}
          disabled={isSaving || record.is_active === false}
          onChange={(event) =>
            handleToggle(record, item.value, event.target.checked)
          }
        />
      ),
    })),
  ];

  return (
    <Flex vertical gap={18}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36 }}
      >
        <Card
          variant="borderless"
          style={{ ...heroStyle, borderRadius: isMobile ? 22 : 28 }}
          styles={{ body: { padding: isMobile ? 20 : 28 } }}
        >
          <Flex vertical gap={12}>
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
              level={isMobile ? 3 : 2}
              style={{ margin: 0, color: "#fff", lineHeight: 1.15 }}
            >
              Tugaskan guru untuk modul tertentu
            </Title>
            <Text style={{ color: "rgba(255,255,255,0.82)", maxWidth: 720 }}>
              Guru yang ditugaskan mendapat otoritas setara admin satuan pada
              modul itu, sampai penugasan dicabut. Hanya admin satuan yang
              dapat menugaskan.
            </Text>
          </Flex>
        </Card>
      </motion.div>

      <Card
        style={tableCardStyle}
        styles={{ body: { padding: isMobile ? 16 : 20 } }}
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
            <Text strong>
              {filteredTeachers.length} guru satuan
            </Text>
          </Space>
          <Input
            allowClear
            value={searchText}
            placeholder="Cari nama atau NIP..."
            prefix={<Search size={16} style={{ color: "#64748b" }} />}
            onChange={(event) => setSearchText(event.target.value)}
            style={{ maxWidth: isMobile ? "100%" : 280, borderRadius: 14 }}
          />
        </Flex>

        <Table
          rowKey="id"
          loading={isLoading}
          columns={columns}
          dataSource={filteredTeachers}
          pagination={false}
          scroll={{ x: 640 }}
          locale={{
            emptyText: (
              <Empty description="Belum ada guru pada satuan ini." />
            ),
          }}
        />
      </Card>
    </Flex>
  );
};

export default StaffAssignment;
