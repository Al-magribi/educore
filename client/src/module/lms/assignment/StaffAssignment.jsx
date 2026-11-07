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
import { Search, UserRound } from "lucide-react";
import {
  useGetStaffAssignmentsQuery,
  useSaveStaffAssignmentMutation,
} from "../../../service/lms/ApiStaffAssignment";
import { useFinanceAssignmentColumn } from "../../finance/assignment/FinanceStaffSlot";
import PageHeader from "../../../components/ui/PageHeader";

const { Text } = Typography;
const { useBreakpoint } = Grid;

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

const isStaffRow = (record) => record.person_type === "staff";

const StaffAssignment = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isCompact = !screens.sm;
  const [searchText, setSearchText] = useState("");

  const { data, isLoading } = useGetStaffAssignmentsQuery();
  const [saveAssignment, { isLoading: isSaving }] =
    useSaveStaffAssignmentMutation();
  const financeColumn = useFinanceAssignmentColumn();

  const assignmentTypes = data?.meta?.assignment_types || [
    { value: "cbt", label: "CBT" },
    { value: "kurikulum", label: "Kurikulum" },
    { value: "kesiswaan", label: "Kesiswaan" },
    { value: "tu", label: "Tata Usaha" },
  ];

  const people = useMemo(() => {
    const teachers = (data?.data || []).map((teacher) => ({
      ...teacher,
      person_type: "teacher",
      row_key: `teacher-${teacher.id}`,
    }));
    return [...teachers, ...(financeColumn?.staffRows || [])];
  }, [data, financeColumn?.staffRows]);

  const filteredPeople = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return people;
    return people.filter((item) => {
      const name = item.full_name?.toLowerCase() || "";
      const nip = item.nip?.toLowerCase() || "";
      return name.includes(keyword) || nip.includes(keyword);
    });
  }, [searchText, people]);

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

  const renderIdentity = (record) => (
    <Flex vertical gap={4} style={{ minWidth: 0 }}>
      <Text
        strong
        ellipsis={{ tooltip: record.full_name }}
        style={{ fontSize: isMobile ? 14 : 15, maxWidth: "100%" }}
      >
        {record.full_name}
      </Text>
      <Flex gap={6} wrap="wrap" align="center">
        <Text type="secondary" style={{ fontSize: 12 }}>
          {record.nip || "Tanpa NIP"}
        </Text>
        {isStaffRow(record) ? (
          <Tag color="purple" style={{ margin: 0, fontSize: 11 }}>
            Tendik
          </Tag>
        ) : null}
        {isStaffRow(record) && !record.has_account ? (
          <Tag color="orange" style={{ margin: 0, fontSize: 11 }}>
            Belum ada akun
          </Tag>
        ) : null}
        {record.is_homeroom ? (
          <Tag color="blue" style={{ margin: 0, fontSize: 11 }}>
            Wali kelas
          </Tag>
        ) : null}
        {record.is_active === false ? (
          <Tag style={{ margin: 0, fontSize: 11 }}>Nonaktif</Tag>
        ) : null}
      </Flex>
    </Flex>
  );

  const renderLmsCheckbox = (record, type) =>
    isStaffRow(record) ? (
      <Text type="secondary">-</Text>
    ) : (
      <Checkbox
        checked={record.assignments?.includes(type)}
        disabled={isTeacherDisabled(record)}
        onChange={(event) => handleToggle(record, type, event.target.checked)}
      />
    );

  const renderFinanceCheckbox = (record) => (
    <Checkbox
      checked={financeColumn.isChecked(record)}
      disabled={financeColumn.isDisabled(record)}
      onChange={(event) => financeColumn.toggle(record, event.target.checked)}
    />
  );

  const renderTile = (label, control) => (
    <Flex
      justify="space-between"
      align="center"
      gap={10}
      style={assignmentTileStyle}
    >
      <Text style={{ fontSize: 13, fontWeight: 500 }}>{label}</Text>
      {control}
    </Flex>
  );

  const renderMobileCard = (record) => (
    <Card style={recordCardStyle} styles={{ body: { padding: 14 } }}>
      <Flex vertical gap={12} style={{ minWidth: 0 }}>
        {renderIdentity(record)}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 1fr))",
            gap: 8,
          }}
        >
          {isStaffRow(record)
            ? null
            : assignmentTypes.map((item) => (
                <React.Fragment key={item.value}>
                  {renderTile(item.label, renderLmsCheckbox(record, item.value))}
                </React.Fragment>
              ))}
          {financeColumn
            ? renderTile(financeColumn.label, renderFinanceCheckbox(record))
            : null}
        </div>
      </Flex>
    </Card>
  );

  const columns = [
    {
      title: "Guru / Tendik",
      dataIndex: "full_name",
      width: isMobile ? 200 : 280,
      fixed: isMobile ? "left" : undefined,
      ellipsis: true,
      render: (_, record) => renderIdentity(record),
    },
    ...assignmentTypes.map((item) => ({
      title: item.label,
      dataIndex: item.value,
      align: "center",
      width: 120,
      render: (_, record) => renderLmsCheckbox(record, item.value),
    })),
    ...(financeColumn
      ? [
          {
            title: financeColumn.label,
            key: financeColumn.value,
            align: "center",
            width: 120,
            render: (_, record) => renderFinanceCheckbox(record),
          },
        ]
      : []),
  ];

  const loading = isLoading || Boolean(financeColumn?.loading);
  const emptyNode = <Empty description="Belum ada guru pada satuan ini." />;

  return (
    <Flex vertical gap={isMobile ? 14 : 18} style={{ width: "100%", minWidth: 0 }}>
      <PageHeader
        title="Penugasan Wewenang"
        description="Guru atau tendik yang ditugaskan mendapat otoritas setara admin satuan pada modul itu, sampai penugasan dicabut. Hanya admin satuan yang dapat menugaskan."
      />

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
              {filteredPeople.length} {financeColumn ? "guru & tendik" : "guru"} satuan
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

        {loading ? (
          <Flex justify="center" style={{ padding: "48px 0" }}>
            <Spin />
          </Flex>
        ) : filteredPeople.length === 0 ? (
          emptyNode
        ) : isMobile ? (
          <List
            dataSource={filteredPeople}
            rowKey="row_key"
            split={false}
            renderItem={(record) => (
              <List.Item
                style={{ padding: 0, marginBottom: 10, borderBlockEnd: "none" }}
              >
                {renderMobileCard(record)}
              </List.Item>
            )}
          />
        ) : (
          <Table
            rowKey="row_key"
            columns={columns}
            dataSource={filteredPeople}
            pagination={false}
            size={screens.lg ? "middle" : "small"}
            scroll={{ x: 280 + (columns.length - 1) * 120 }}
            locale={{ emptyText: emptyNode }}
          />
        )}
      </Card>
    </Flex>
  );
};

export default StaffAssignment;
