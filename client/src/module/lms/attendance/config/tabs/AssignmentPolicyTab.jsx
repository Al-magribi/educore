import { useMemo, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Flex,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import { motion } from "framer-motion";
import { Plus, Search, Trash2 } from "lucide-react";
import {
  useBulkDeletePolicyAssignmentsMutation,
  useDeletePolicyAssignmentMutation,
  useGetPolicyAssignmentBootstrapQuery,
  useGetPolicyAssignmentsQuery,
  useSavePolicyAssignmentMutation,
} from "../../../../../service/lms/ApiAttendance";
import { innerCardStyle, itemVariants } from "../configShared";

const { Text } = Typography;

const MotionDiv = motion.div;
const PAGE_SIZE_OPTIONS = ["8", "10", "20", "50"];

const parseDbDateToDayjs = (value) => {
  if (!value) return null;
  if (dayjs.isDayjs(value)) return value;
  const text = String(value).trim();
  if (!text) return null;
  const normalized = text.length <= 10 ? `${text}T00:00:00` : text;
  const parsed = dayjs(normalized);
  return parsed.isValid() ? parsed : null;
};

const formatDateLabel = (value) => {
  const parsed = parseDbDateToDayjs(value);
  return parsed ? parsed.format("DD MMM YYYY") : "-";
};

const TargetTags = ({ row }) => {
  const targets = Array.isArray(row.targets) ? row.targets : [];
  if (targets.length === 0) {
    return <Text type='secondary'>-</Text>;
  }

  const visible = targets.slice(0, 4);
  const rest = targets.length - visible.length;

  return (
    <Space size={[4, 4]} wrap style={{ maxWidth: "100%" }}>
      {visible.map((item) => (
        <Tag
          key={`${item.type}-${item.id ?? "all"}`}
          color={
            item.type === "user"
              ? "blue"
              : item.type === "class"
                ? "purple"
                : item.type === "grade"
                  ? "geekblue"
                  : "default"
          }
          style={{ marginInlineEnd: 0 }}
        >
          {item.name}
        </Tag>
      ))}
      {rest > 0 ? <Tag style={{ marginInlineEnd: 0 }}>+{rest} lainnya</Tag> : null}
    </Space>
  );
};

const AssignmentPolicyTab = () => {
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [nameFilter, setNameFilter] = useState("");
  const [pagination, setPagination] = useState({ current: 1, pageSize: 8 });
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const selectedRole = Form.useWatch("target_role", form);
  const selectedScope = Form.useWatch("assignment_scope", form);

  const { data: bootstrapRes, isFetching: loadingBootstrap } =
    useGetPolicyAssignmentBootstrapQuery();
  const { data: listRes, isFetching: loadingList } =
    useGetPolicyAssignmentsQuery();
  const [savePolicyAssignment, { isLoading: savingAssignment }] =
    useSavePolicyAssignmentMutation();
  const [deletePolicyAssignment, { isLoading: deletingAssignment }] =
    useDeletePolicyAssignmentMutation();
  const [bulkDeletePolicyAssignments, { isLoading: bulkDeleting }] =
    useBulkDeletePolicyAssignmentsMutation();

  const options = bootstrapRes?.data?.options || {};
  const assignments =
    listRes !== undefined
      ? listRes?.data ?? []
      : bootstrapRes?.data?.assignments ?? [];

  const filteredAssignments = useMemo(() => {
    const keyword = nameFilter.trim().toLowerCase();
    if (!keyword) return assignments;
    return assignments.filter((item) => {
      const targetText =
        item.target_label ||
        (Array.isArray(item.targets)
          ? item.targets.map((target) => target.name).join(" ")
          : "");
      return [item.policy_name, item.policy_code, targetText].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(keyword),
      );
    });
  }, [assignments, nameFilter]);

  const assignmentByKey = useMemo(() => {
    const map = new Map();
    for (const row of assignments) {
      map.set(row.group_key || String(row.id), row);
    }
    return map;
  }, [assignments]);

  const policies = options.policies || [];
  const teachers = options.teachers || [];
  const students = options.students || [];
  const classes = options.classes || [];
  const grades = options.grades || [];

  const policyOptions = useMemo(() => {
    if (!selectedRole) return [];
    return policies
      .filter((item) => {
        if (selectedRole === "all") return item.target_role === "all";
        return item.target_role === selectedRole || item.target_role === "all";
      })
      .map((item) => ({
        value: Number(item.id),
        label: `${item.name} (${item.code})`,
      }));
  }, [policies, selectedRole]);

  const userOptions = useMemo(() => {
    if (selectedRole === "teacher") {
      return teachers.map((item) => ({
        value: Number(item.user_id),
        label: item.full_name,
      }));
    }
    if (selectedRole === "student") {
      return students.map((item) => ({
        value: Number(item.user_id),
        label: `${item.full_name}${item.nis ? ` (${item.nis})` : ""}`,
      }));
    }
    if (selectedRole === "all") {
      const teacherOpts = teachers.map((item) => ({
        value: Number(item.user_id),
        label: `[Guru] ${item.full_name}`,
      }));
      const studentOpts = students.map((item) => ({
        value: Number(item.user_id),
        label: `[Siswa] ${item.full_name}${item.nis ? ` (${item.nis})` : ""}`,
      }));
      return [...teacherOpts, ...studentOpts];
    }
    return [];
  }, [selectedRole, students, teachers]);

  const openCreateModal = () => {
    setEditingRow(null);
    form.setFieldsValue({
      group_ids: [],
      target_role: "teacher",
      assignment_scope: "user",
      policy_ids: [],
      user_ids: [],
      class_ids: [],
      grade_ids: [],
      effective_start_date: null,
      effective_end_date: null,
      is_active: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    setEditingRow(row);
    form.setFieldsValue({
      id: row.id,
      group_ids: Array.isArray(row.ids) ? row.ids : [row.id],
      target_role: row.target_role,
      assignment_scope: row.assignment_scope,
      policy_ids: row.policy_id ? [Number(row.policy_id)] : [],
      user_ids: Array.isArray(row.user_ids) ? row.user_ids.map(Number) : [],
      class_ids: Array.isArray(row.class_ids) ? row.class_ids.map(Number) : [],
      grade_ids: Array.isArray(row.grade_ids) ? row.grade_ids.map(Number) : [],
      effective_start_date: row.effective_start_date
        ? parseDbDateToDayjs(row.effective_start_date)
        : null,
      effective_end_date: row.effective_end_date
        ? parseDbDateToDayjs(row.effective_end_date)
        : null,
      is_active: row.is_active === true,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const groupIds = Array.isArray(values.group_ids)
        ? values.group_ids.map(Number).filter(Boolean)
        : editingRow?.ids || [];
      const policyIds = Array.isArray(values.policy_ids)
        ? values.policy_ids.map(Number).filter(Boolean)
        : [];
      const payload = {
        id: groupIds[0] || values.id || undefined,
        group_ids: groupIds,
        policy_id: policyIds[0],
        policy_ids: policyIds,
        assignment_scope: values.assignment_scope,
        user_ids:
          values.assignment_scope === "user" ? values.user_ids || [] : [],
        class_ids:
          values.assignment_scope === "class" ? values.class_ids || [] : [],
        grade_ids:
          values.assignment_scope === "grade" ? values.grade_ids || [] : [],
        effective_start_date: values.effective_start_date
          ? values.effective_start_date.format("YYYY-MM-DD")
          : null,
        effective_end_date: values.effective_end_date
          ? values.effective_end_date.format("YYYY-MM-DD")
          : null,
        is_active: values.is_active === true,
      };

      await savePolicyAssignment(payload).unwrap();
      message.success(
        policyIds.length > 1
          ? `${policyIds.length} assignment policy berhasil disimpan.`
          : "Assignment policy berhasil disimpan.",
      );
      setModalOpen(false);
      setEditingRow(null);
    } catch (error) {
      if (error?.errorFields) return;
      message.error(
        error?.data?.message || "Gagal menyimpan assignment policy.",
      );
    }
  };

  const handleDelete = async (row) => {
    try {
      const groupIds = Array.isArray(row.ids) ? row.ids : [row.id];
      await deletePolicyAssignment({
        id: row.id,
        group_ids: groupIds,
      }).unwrap();
      message.success("Assignment policy berhasil dihapus.");
      setSelectedRowKeys((prev) =>
        prev.filter((key) => String(key) !== String(row.group_key || row.id)),
      );
    } catch (error) {
      message.error(
        error?.data?.message || "Gagal menghapus assignment policy.",
      );
      throw error;
    }
  };

  const handleBulkDelete = () => {
    if (selectedRowKeys.length === 0) return;

    const deleteIds = [
      ...new Set(
        selectedRowKeys.flatMap((key) => {
          const row = assignmentByKey.get(key);
          if (!row) return [];
          return Array.isArray(row.ids) ? row.ids : [row.id];
        }),
      ),
    ];

    Modal.confirm({
      title: `Hapus ${selectedRowKeys.length} assignment policy terpilih?`,
      content:
        "Semua target dalam grup assignment terpilih akan dihapus permanen. Policy utama, rule harian, dan data presensi yang sudah tercatat tidak akan terhapus.",
      okText: "Hapus",
      okType: "danger",
      cancelText: "Batal",
      okButtonProps: { loading: bulkDeleting },
      onOk: async () => {
        try {
          const result = await bulkDeletePolicyAssignments(deleteIds).unwrap();
          message.success(
            result?.message || "Assignment policy terpilih berhasil dihapus.",
          );
          setSelectedRowKeys([]);
        } catch (error) {
          message.error(
            error?.data?.message ||
              "Gagal menghapus assignment policy terpilih.",
          );
          throw error;
        }
      },
    });
  };

  const handleRowAction = (action, row) => {
    if (action === "edit") {
      openEditModal(row);
      return;
    }

    if (action === "delete") {
      const count = Array.isArray(row.ids) ? row.ids.length : 1;
      Modal.confirm({
        title: "Hapus assignment policy ini?",
        content: `Grup ini berisi ${count} target. Semua target dalam grup akan dihapus permanen. Policy utama, rule harian, dan data presensi yang sudah tercatat tidak akan terhapus.`,
        okText: "Hapus",
        okType: "danger",
        cancelText: "Batal",
        okButtonProps: { loading: deletingAssignment },
        onOk: () => handleDelete(row),
      });
    }
  };

  return (
    <>
      <Card
        title='Assignment Policy'
        style={innerCardStyle}
        extra={
          <Button
            type='primary'
            icon={<Plus size={14} />}
            onClick={openCreateModal}
          >
            Tambah Assignment
          </Button>
        }
      >
        <MotionDiv variants={itemVariants} initial='hidden' animate='show'>
          <Flex gap={12} wrap='wrap' style={{ marginBottom: 16 }}>
            <Input
              allowClear
              value={nameFilter}
              onChange={(event) => {
                setNameFilter(event.target.value);
                setPagination((prev) => ({ ...prev, current: 1 }));
              }}
              prefix={<Search size={16} />}
              placeholder='Filter nama policy / target'
              style={{ width: 300, maxWidth: "100%" }}
            />
          </Flex>
          {filteredAssignments.length > 0 && (
            <Flex
              justify='space-between'
              align='center'
              wrap='wrap'
              gap={12}
              style={{ marginBottom: 16 }}
            >
              <Text type='secondary'>
                {selectedRowKeys.length > 0
                  ? `${selectedRowKeys.length} assignment terpilih`
                  : "Centang baris untuk hapus bulk"}
              </Text>
              <Button
                danger
                icon={<Trash2 size={16} />}
                disabled={selectedRowKeys.length === 0}
                loading={bulkDeleting}
                onClick={handleBulkDelete}
              >
                Hapus Terpilih
              </Button>
            </Flex>
          )}
          <Table
            rowKey={(row) => row.group_key || String(row.id)}
            loading={loadingBootstrap || loadingList}
            dataSource={filteredAssignments}
            tableLayout='fixed'
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
            }}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              showSizeChanger: true,
              pageSizeOptions: PAGE_SIZE_OPTIONS,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} dari ${total} assignment`,
              onChange: (page, pageSize) => {
                setPagination({ current: page, pageSize });
              },
            }}
            columns={[
              {
                title: "Policy",
                key: "policy",
                render: (_, row) => (
                  <Flex vertical gap={2} style={{ minWidth: 0 }}>
                    <Text strong style={{ wordBreak: "break-word" }}>
                      {row.policy_name}
                    </Text>
                    <Text type='secondary' style={{ fontSize: 12 }}>
                      {row.policy_code || "-"}
                    </Text>
                  </Flex>
                ),
              },
              {
                title: "Role",
                dataIndex: "target_role",
                width: 110,
                render: (value) => (
                  <Tag
                    color={
                      value === "teacher"
                        ? "blue"
                        : value === "all"
                          ? "purple"
                          : "green"
                    }
                  >
                    {value === "all" ? "guru & siswa" : value}
                  </Tag>
                ),
              },
              {
                title: "Scope",
                dataIndex: "assignment_scope",
                width: 110,
              },
              {
                title: "Target",
                key: "targets",
                render: (_, row) => (
                  <Flex vertical gap={4} style={{ minWidth: 0 }}>
                    <TargetTags row={row} />
                    <Text type='secondary' style={{ fontSize: 12 }}>
                      {row.target_count || 0} target
                    </Text>
                  </Flex>
                ),
              },
              {
                title: "Periode",
                width: 170,
                responsive: ["md"],
                render: (_, row) =>
                  `${formatDateLabel(row.effective_start_date)} s/d ${formatDateLabel(row.effective_end_date)}`,
              },
              {
                title: "Status",
                dataIndex: "is_active",
                width: 96,
                render: (value) => (
                  <Tag color={value ? "success" : "default"}>
                    {value ? "Aktif" : "Nonaktif"}
                  </Tag>
                ),
              },
              {
                title: "Aksi",
                width: 110,
                render: (_, row) => (
                  <Select
                    placeholder='Aksi'
                    value={null}
                    virtual={false}
                    style={{ width: "100%" }}
                    options={[
                      { value: "edit", label: "Edit" },
                      { value: "delete", label: "Hapus" },
                    ]}
                    onChange={(value) => handleRowAction(value, row)}
                  />
                ),
              },
            ]}
          />
        </MotionDiv>
      </Card>

      <Modal
        title={
          editingRow ? "Edit Assignment Policy" : "Tambah Assignment Policy"
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSave}
        confirmLoading={savingAssignment}
        width={780}
        centered
      >
        <Form form={form} layout='vertical'>
          <Form.Item name='id' hidden>
            <Input />
          </Form.Item>
          <Form.Item name='group_ids' hidden>
            <Select mode='multiple' />
          </Form.Item>
          <Flex gap={12} wrap='wrap'>
            <Form.Item
              name='target_role'
              label='Target Role'
              style={{ minWidth: 200 }}
              rules={[{ required: true, message: "Target role wajib diisi." }]}
            >
              <Select
                options={[
                  { value: "teacher", label: "Guru" },
                  { value: "student", label: "Siswa" },
                  { value: "all", label: "Guru & Siswa (Ekstra)" },
                ]}
                onChange={() => {
                  form.setFieldsValue({
                    policy_ids: [],
                    user_ids: [],
                  });
                }}
              />
            </Form.Item>
            <Form.Item
              name='policy_ids'
              label='Policy'
              style={{ minWidth: 320, flex: 1 }}
              rules={[
                {
                  validator: (_, value) => {
                    if (Array.isArray(value) && value.length > 0) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error("Minimal satu policy wajib dipilih."),
                    );
                  },
                },
              ]}
              extra={
                selectedRole === "all"
                  ? "Bisa pilih beberapa policy ekstra sekaligus (mis. Silat, Tari)."
                  : undefined
              }
            >
              <Select
                mode='multiple'
                showSearch={{ optionFilterProp: "label" }}
                virtual={false}
                options={policyOptions}
                placeholder={
                  selectedRole === "all"
                    ? "Pilih satu atau lebih policy ekstra"
                    : "Pilih satu atau lebih policy"
                }
                maxTagCount='responsive'
              />
            </Form.Item>
          </Flex>

          <Flex gap={12} wrap='wrap'>
            <Form.Item
              name='assignment_scope'
              label='Scope Assignment'
              style={{ minWidth: 220 }}
              rules={[
                { required: true, message: "Scope assignment wajib dipilih." },
              ]}
            >
              <Select
                options={[
                  { value: "user", label: "Per User" },
                  { value: "class", label: "Per Kelas" },
                  { value: "grade", label: "Per Grade" },
                  { value: "homebase", label: "Semua Homebase" },
                ]}
                onChange={() => {
                  form.setFieldsValue({
                    user_ids: [],
                    class_ids: [],
                    grade_ids: [],
                  });
                }}
              />
            </Form.Item>

            {selectedScope === "user" && (
              <Form.Item
                name='user_ids'
                label='User'
                style={{ minWidth: 320, flex: 1 }}
                rules={[
                  {
                    validator: (_, value) => {
                      if (Array.isArray(value) && value.length > 0) {
                        return Promise.resolve();
                      }
                      return Promise.reject(
                        new Error("Minimal satu user wajib dipilih."),
                      );
                    },
                  },
                ]}
              >
                <Select
                  mode='multiple'
                  showSearch={{ optionFilterProp: "label" }}
                  virtual={false}
                  options={userOptions}
                  placeholder='Pilih satu atau lebih user'
                  maxTagCount='responsive'
                />
              </Form.Item>
            )}

            {selectedScope === "class" && (
              <Form.Item
                name='class_ids'
                label='Kelas'
                style={{ minWidth: 320, flex: 1 }}
                rules={[
                  {
                    validator: (_, value) => {
                      if (Array.isArray(value) && value.length > 0) {
                        return Promise.resolve();
                      }
                      return Promise.reject(
                        new Error("Minimal satu kelas wajib dipilih."),
                      );
                    },
                  },
                ]}
              >
                <Select
                  mode='multiple'
                  showSearch={{ optionFilterProp: "label" }}
                  virtual={false}
                  options={classes.map((item) => ({
                    value: Number(item.id),
                    label: item.name,
                  }))}
                  placeholder='Pilih satu atau lebih kelas'
                  maxTagCount='responsive'
                />
              </Form.Item>
            )}

            {selectedScope === "grade" && (
              <Form.Item
                name='grade_ids'
                label='Grade'
                style={{ minWidth: 320, flex: 1 }}
                rules={[
                  {
                    validator: (_, value) => {
                      if (Array.isArray(value) && value.length > 0) {
                        return Promise.resolve();
                      }
                      return Promise.reject(
                        new Error("Minimal satu grade wajib dipilih."),
                      );
                    },
                  },
                ]}
              >
                <Select
                  mode='multiple'
                  showSearch={{ optionFilterProp: "label" }}
                  virtual={false}
                  options={grades.map((item) => ({
                    value: Number(item.id),
                    label: item.name,
                  }))}
                  placeholder='Pilih satu atau lebih grade'
                  maxTagCount='responsive'
                />
              </Form.Item>
            )}
          </Flex>

          <Flex gap={12} wrap='wrap'>
            <Form.Item
              name='effective_start_date'
              label='Tanggal Mulai Berlaku'
              style={{ minWidth: 220 }}
            >
              <DatePicker style={{ width: "100%" }} format='YYYY-MM-DD' />
            </Form.Item>
            <Form.Item
              name='effective_end_date'
              label='Tanggal Selesai Berlaku'
              style={{ minWidth: 220 }}
            >
              <DatePicker style={{ width: "100%" }} format='YYYY-MM-DD' />
            </Form.Item>
            <Form.Item name='is_active' label='Status' valuePropName='checked'>
              <Switch checkedChildren='Aktif' unCheckedChildren='Nonaktif' />
            </Form.Item>
          </Flex>
        </Form>
      </Modal>
    </>
  );
};

export default AssignmentPolicyTab;
