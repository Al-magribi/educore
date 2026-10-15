import { useCallback, useMemo, useState } from "react";
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
  useSaveFinanceTendikAssignmentMutation,
} from "../../../service/finance/ApiFinanceStaff";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const cardStyle = {
  borderRadius: 24,
  border: "1px solid #e5edf6",
  background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
  boxShadow: "0 18px 36px rgba(15, 23, 42, 0.06)",
};

export const hasFinanceStaffDesk = true;

// Kontrak slot ini juga dipakai stub di feature/lms; nama export harus tetap sama.
export const useFinanceAssignmentColumn = () => {
  const { data, isLoading, isError, error } =
    useGetFinanceStaffAssignmentsQuery();
  const [saveTeacher] = useSaveFinanceStaffAssignmentMutation();
  const [saveTendik] = useSaveFinanceTendikAssignmentMutation();
  const [pendingKey, setPendingKey] = useState(null);

  const teacherFlags = useMemo(
    () =>
      new Map(
        (data?.data || []).map((teacher) => [
          Number(teacher.id),
          teacher.is_finance_admin === true,
        ]),
      ),
    [data],
  );

  const staffRows = useMemo(
    () =>
      (data?.staff || []).map((staff) => ({
        ...staff,
        person_type: "staff",
        row_key: `staff-${staff.id}`,
      })),
    [data],
  );

  const isChecked = useCallback(
    (record) =>
      record.person_type === "staff"
        ? record.is_finance_admin === true
        : teacherFlags.get(Number(record.id)) === true,
    [teacherFlags],
  );

  const isDisabled = useCallback(
    (record) =>
      pendingKey === record.row_key ||
      (record.is_active === false && !isChecked(record)),
    [isChecked, pendingKey],
  );

  const toggle = useCallback(
    async (record, active) => {
      setPendingKey(record.row_key);
      try {
        const result =
          record.person_type === "staff"
            ? await saveTendik({ staffId: record.id, active }).unwrap()
            : await saveTeacher({ teacherId: record.id, active }).unwrap();
        message.success(result?.message || "Penugasan keuangan disimpan.");
      } catch (saveError) {
        message.error(
          saveError?.data?.message || "Gagal menyimpan penugasan keuangan.",
        );
      } finally {
        setPendingKey(null);
      }
    },
    [saveTeacher, saveTendik],
  );

  return useMemo(
    () => ({
      value: "keuangan",
      label: "Keuangan",
      loading: isLoading,
      isError,
      error,
      homebaseName: data?.meta?.homebase_name || "",
      teacherRows: (data?.data || []).map((teacher) => ({
        ...teacher,
        person_type: "teacher",
        row_key: `teacher-${teacher.id}`,
      })),
      staffRows,
      isChecked,
      isDisabled,
      toggle,
    }),
    [data, error, isChecked, isDisabled, isError, isLoading, staffRows, toggle],
  );
};

const FinanceStaffSlot = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [searchText, setSearchText] = useState("");
  const column = useFinanceAssignmentColumn();

  const people = useMemo(
    () => [...column.teacherRows, ...column.staffRows],
    [column.staffRows, column.teacherRows],
  );
  const filteredPeople = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return people;
    return people.filter((person) => {
      const name = String(person.full_name || "").toLowerCase();
      const nip = String(person.nip || "").toLowerCase();
      return name.includes(keyword) || nip.includes(keyword);
    });
  }, [people, searchText]);

  const renderToggle = (person) => (
    <Checkbox
      checked={column.isChecked(person)}
      disabled={column.isDisabled(person)}
      onChange={(event) => column.toggle(person, event.target.checked)}
    >
      Admin keuangan
    </Checkbox>
  );

  const renderTags = (person) => (
    <Flex gap={6} wrap="wrap">
      {person.person_type === "staff" ? <Tag color="purple">Tendik</Tag> : null}
      {person.person_type === "staff" && !person.has_account ? (
        <Tag color="orange">Belum ada akun</Tag>
      ) : null}
      {person.is_active === false ? <Tag>Tidak aktif</Tag> : null}
    </Flex>
  );

  if (column.isError) {
    return (
      <Card style={cardStyle}>
        <Result
          status="warning"
          title="Penugasan keuangan tidak dapat dimuat"
          subTitle={
            column.error?.data?.message ||
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
            Guru atau tendik yang ditugaskan mengelola keuangan{" "}
            {column.homebaseName || "satuan ini"} dan tidak dapat membuka
            keuangan satuan lain. Tendik butuh akun login dari menu Tendik.
          </Text>
        </Flex>

        <Flex
          justify="space-between"
          align={isMobile ? "stretch" : "center"}
          vertical={isMobile}
          gap={12}
        >
          <Text strong>{filteredPeople.length} guru & tendik</Text>
          <Input
            allowClear
            value={searchText}
            placeholder="Cari nama atau NIP..."
            prefix={<Search size={16} style={{ color: "#64748b" }} />}
            onChange={(event) => setSearchText(event.target.value)}
            style={{ width: isMobile ? "100%" : 280, borderRadius: 14 }}
          />
        </Flex>

        {column.loading ? (
          <Flex justify="center" style={{ padding: "48px 0" }}>
            <Spin />
          </Flex>
        ) : filteredPeople.length === 0 ? (
          <Empty description="Belum ada guru atau tendik pada satuan ini." />
        ) : isMobile ? (
          <List
            dataSource={filteredPeople}
            rowKey="row_key"
            split={false}
            renderItem={(person) => (
              <List.Item
                style={{ padding: 0, marginBottom: 10, borderBlockEnd: "none" }}
              >
                <Card size="small" style={{ width: "100%", borderRadius: 16 }}>
                  <Flex vertical gap={8}>
                    <Text strong>{person.full_name}</Text>
                    <Text type="secondary">
                      {person.nip || "NIP belum diisi"}
                    </Text>
                    {renderTags(person)}
                    {renderToggle(person)}
                  </Flex>
                </Card>
              </List.Item>
            )}
          />
        ) : (
          <Table
            rowKey="row_key"
            pagination={false}
            dataSource={filteredPeople}
            columns={[
              {
                title: "Guru / Tendik",
                dataIndex: "full_name",
                render: (_, person) => (
                  <Flex vertical gap={2}>
                    <Text strong>{person.full_name}</Text>
                    <Text type="secondary">
                      {person.nip || "NIP belum diisi"}
                    </Text>
                  </Flex>
                ),
              },
              {
                title: "Status",
                width: 200,
                render: (_, person) =>
                  person.person_type === "staff" ||
                  person.is_active === false ? (
                    renderTags(person)
                  ) : (
                    <Tag color="green">Aktif</Tag>
                  ),
              },
              {
                title: "Keuangan",
                width: 220,
                render: (_, person) => renderToggle(person),
              },
            ]}
          />
        )}
      </Flex>
    </Card>
  );
};

export default FinanceStaffSlot;
