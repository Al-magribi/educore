import { useMemo, useState } from "react";
import {
  Card,
  Checkbox,
  Empty,
  Flex,
  Grid,
  Input,
  List,
  Result,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { Search, ShieldCheck } from "lucide-react";

import {
  useGetFinanceStaffAssignmentsQuery,
  useSaveFinanceStaffAssignmentMutation,
} from "../../../service/finance/ApiFinanceStaff";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const cardStyle = {
  borderRadius: 24,
  border: "1px solid #e5edf6",
  background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
  boxShadow: "0 18px 36px rgba(15, 23, 42, 0.06)",
};

const FinanceStaffSlot = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [searchText, setSearchText] = useState("");
  const [pendingTeacherId, setPendingTeacherId] = useState(null);
  const { data, isLoading, isError, error } = useGetFinanceStaffAssignmentsQuery();
  const [saveAssignment] = useSaveFinanceStaffAssignmentMutation();

  const teachers = data?.data || [];
  const homebaseName = data?.meta?.homebase_name || "satuan ini";
  const filteredTeachers = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return teachers;
    return teachers.filter((teacher) => {
      const name = String(teacher.full_name || "").toLowerCase();
      const nip = String(teacher.nip || "").toLowerCase();
      return name.includes(keyword) || nip.includes(keyword);
    });
  }, [searchText, teachers]);

  const handleToggle = async (teacher, active) => {
    setPendingTeacherId(teacher.id);
    try {
      const result = await saveAssignment({
        teacherId: teacher.id,
        active,
      }).unwrap();
      message.success(result?.message || "Penugasan keuangan disimpan.");
    } catch (saveError) {
      message.error(
        saveError?.data?.message || "Gagal menyimpan penugasan keuangan.",
      );
    } finally {
      setPendingTeacherId(null);
    }
  };

  const renderToggle = (teacher) => (
    <Checkbox
      checked={teacher.is_finance_admin === true}
      disabled={teacher.is_active === false || pendingTeacherId === teacher.id}
      onChange={(event) => handleToggle(teacher, event.target.checked)}
    >
      Admin keuangan
    </Checkbox>
  );

  if (isError) {
    return (
      <Card style={cardStyle}>
        <Result
          status="warning"
          title="Penugasan keuangan tidak dapat dimuat"
          subTitle={
            error?.data?.message ||
            "Halaman ini hanya untuk admin satuan."
          }
        />
      </Card>
    );
  }

  return (
    <Card style={cardStyle} styles={{ body: { padding: isMobile ? 14 : 20 } }}>
      <Flex vertical gap={16}>
        <Flex vertical gap={6}>
          <Space size={8}>
            <ShieldCheck size={16} />
            <Title level={5} style={{ margin: 0 }}>
              Admin Keuangan
            </Title>
          </Space>
          <Text type="secondary">
            Guru yang ditugaskan mengelola keuangan {homebaseName} dan tidak
            dapat membuka keuangan satuan lain. Beberapa guru boleh ditugaskan.
          </Text>
        </Flex>

        <Flex justify="space-between" align={isMobile ? "stretch" : "center"} vertical={isMobile} gap={12}>
          <Text strong>
            {filteredTeachers.length} guru
          </Text>
          <Input
            allowClear
            value={searchText}
            placeholder="Cari nama atau NIP..."
            prefix={<Search size={16} style={{ color: "#64748b" }} />}
            onChange={(event) => setSearchText(event.target.value)}
            style={{ width: isMobile ? "100%" : 280, borderRadius: 14 }}
          />
        </Flex>

        {isLoading ? (
          <Flex justify="center" style={{ padding: "48px 0" }}>
            <Spin />
          </Flex>
        ) : filteredTeachers.length === 0 ? (
          <Empty description="Belum ada guru pada satuan ini." />
        ) : isMobile ? (
          <List
            dataSource={filteredTeachers}
            rowKey="id"
            split={false}
            renderItem={(teacher) => (
              <List.Item style={{ padding: 0, marginBottom: 10, borderBlockEnd: "none" }}>
                <Card size="small" style={{ width: "100%", borderRadius: 16 }}>
                  <Flex vertical gap={8}>
                    <Text strong>{teacher.full_name}</Text>
                    <Text type="secondary">{teacher.nip || "NIP belum diisi"}</Text>
                    {teacher.is_active === false ? (
                      <Tag>Tidak aktif</Tag>
                    ) : null}
                    {renderToggle(teacher)}
                  </Flex>
                </Card>
              </List.Item>
            )}
          />
        ) : (
          <Table
            rowKey="id"
            pagination={false}
            dataSource={filteredTeachers}
            columns={[
              {
                title: "Guru",
                dataIndex: "full_name",
                render: (_, teacher) => (
                  <Flex vertical gap={2}>
                    <Text strong>{teacher.full_name}</Text>
                    <Text type="secondary">{teacher.nip || "NIP belum diisi"}</Text>
                  </Flex>
                ),
              },
              {
                title: "Status",
                width: 140,
                render: (_, teacher) =>
                  teacher.is_active === false ? (
                    <Tag>Tidak aktif</Tag>
                  ) : (
                    <Tag color="green">Aktif</Tag>
                  ),
              },
              {
                title: "Keuangan",
                width: 220,
                render: (_, teacher) => renderToggle(teacher),
              },
            ]}
          />
        )}
      </Flex>
    </Card>
  );
};

export default FinanceStaffSlot;
