import { useMemo, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Flex,
  Form,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from "antd";
import dayjs from "dayjs";
import { motion } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import {
  useDeletePolicyAssignmentMutation,
  useGetPolicyAssignmentBootstrapQuery,
  useGetPolicyAssignmentsQuery,
  useSavePolicyAssignmentMutation,
} from "../../../../../../service/lms/ApiAttendance";
import { innerCardStyle, itemVariants } from "../configShared";

const MotionDiv = motion.div;

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

const AssignmentPolicyTab = () => {
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
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

  const options = bootstrapRes?.data?.options || {};
  const assignments = listRes?.data || bootstrapRes?.data?.assignments || [];
  const policies = options.policies || [];
  const teachers = options.teachers || [];
  const students = options.students || [];
  const classes = options.classes || [];
  const grades = options.grades || [];

  const policyOptions = useMemo(() => {
    if (!selectedRole) return [];
    return policies
      .filter((item) => item.target_role === selectedRole)
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
    return [];
  }, [selectedRole, students, teachers]);

  const openCreateModal = () => {
    setEditingRow(null);
    form.setFieldsValue({
      target_role: "teacher",
      assignment_scope: "user",
      policy_id: undefined,
      user_ids: [],
      class_id: undefined,
      grade_id: undefined,
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
      target_role: row.target_role,
      assignment_scope: row.assignment_scope,
      policy_id: Number(row.policy_id),
      user_ids: row.user_id ? [Number(row.user_id)] : [],
      class_id: row.class_id ? Number(row.class_id) : undefined,
      grade_id: row.grade_id ? Number(row.grade_id) : undefined,
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
      const payload = {
        id: values.id,
        policy_id: values.policy_id,
        assignment_scope: values.assignment_scope,
        user_id:
          values.assignment_scope === "user"
            ? values.user_ids?.[0] || null
            : null,
        user_ids:
          values.assignment_scope === "user" ? values.user_ids || [] : [],
        class_id: values.assignment_scope === "class" ? values.class_id : null,
        grade_id: values.assignment_scope === "grade" ? values.grade_id : null,
        effective_start_date: values.effective_start_date
          ? values.effective_start_date.format("YYYY-MM-DD")
          : null,
        effective_end_date: values.effective_end_date
          ? values.effective_end_date.format("YYYY-MM-DD")
          : null,
        is_active: values.is_active === true,
      };

      await savePolicyAssignment(payload).unwrap();
      message.success("Assignment policy berhasil disimpan.");
      setModalOpen(false);
      setEditingRow(null);
    } catch (error) {
      if (error?.errorFields) return;
      message.error(
        error?.data?.message || "Gagal menyimpan assignment policy.",
      );
    }
  };

  const handleDelete = async (id) => {
    try {
      await deletePolicyAssignment(id).unwrap();
      message.success("Assignment policy berhasil dihapus.");
    } catch (error) {
      message.error(
        error?.data?.message || "Gagal menghapus assignment policy.",
      );
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
          <Table
            rowKey='id'
            loading={loadingBootstrap || loadingList}
            dataSource={assignments}
            pagination={{ pageSize: 8 }}
            scroll={{ x: 1020 }}
            columns={[
              { title: "Policy", dataIndex: "policy_name", width: 220 },
              {
                title: "Role",
                dataIndex: "target_role",
                width: 110,
                render: (value) => (
                  <Tag color={value === "teacher" ? "blue" : "green"}>
                    {value}
                  </Tag>
                ),
              },
              { title: "Scope", dataIndex: "assignment_scope", width: 130 },
              {
                title: "Target",
                width: 210,
                render: (_, row) =>
                  row.user_name ||
                  row.class_name ||
                  row.grade_name ||
                  "Semua Homebase",
              },
              {
                title: "Periode Berlaku",
                width: 220,
                render: (_, row) =>
                  `${formatDateLabel(row.effective_start_date)} s/d ${formatDateLabel(row.effective_end_date)}`,
              },
              {
                title: "Status",
                dataIndex: "is_active",
                width: 120,
                render: (value) => (
                  <Tag color={value ? "success" : "default"}>
                    {value ? "Aktif" : "Nonaktif"}
                  </Tag>
                ),
              },
              {
                title: "Aksi",
                width: 150,
                render: (_, row) => (
                  <Space>
                    <Button size='small' onClick={() => openEditModal(row)}>
                      Edit
                    </Button>
                    <Popconfirm
                      title='Hapus assignment policy?'
                      okText='Hapus'
                      cancelText='Batal'
                      onConfirm={() => handleDelete(row.id)}
                    >
                      <Button
                        size='small'
                        danger
                        icon={<Trash2 size={14} />}
                        loading={deletingAssignment}
                      />
                    </Popconfirm>
                  </Space>
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
        width={760}
        centered
      >
        <Form form={form} layout='vertical'>
          <Form.Item name='id' hidden>
            <Select />
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
                ]}
              />
            </Form.Item>
            <Form.Item
              name='policy_id'
              label='Policy'
              style={{ minWidth: 320, flex: 1 }}
              rules={[{ required: true, message: "Policy wajib dipilih." }]}
            >
              <Select
                showSearch={{ optionFilterProp: "label" }}
                virtual={false}
                options={policyOptions}
                placeholder='Pilih policy'
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
                      return Promise.reject(new Error("User wajib dipilih."));
                    },
                  },
                ]}
              >
                <Select
                  mode='multiple'
                  showSearch={{ optionFilterProp: "label" }}
                  virtual={false}
                  options={userOptions}
                  placeholder={
                    editingRow
                      ? "Edit assignment per user"
                      : "Pilih satu atau lebih user"
                  }
                  maxTagCount='responsive'
                  maxCount={editingRow ? 1 : undefined}
                />
              </Form.Item>
            )}

            {selectedScope === "class" && (
              <Form.Item
                name='class_id'
                label='Kelas'
                style={{ minWidth: 320, flex: 1 }}
                rules={[{ required: true, message: "Kelas wajib dipilih." }]}
              >
                <Select
                  showSearch={{ optionFilterProp: "label" }}
                  virtual={false}
                  options={classes.map((item) => ({
                    value: Number(item.id),
                    label: item.name,
                  }))}
                  placeholder='Pilih kelas'
                />
              </Form.Item>
            )}

            {selectedScope === "grade" && (
              <Form.Item
                name='grade_id'
                label='Grade'
                style={{ minWidth: 320, flex: 1 }}
                rules={[{ required: true, message: "Grade wajib dipilih." }]}
              >
                <Select
                  showSearch={{ optionFilterProp: "label" }}
                  virtual={false}
                  options={grades.map((item) => ({
                    value: Number(item.id),
                    label: item.name,
                  }))}
                  placeholder='Pilih grade'
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
