import { useState } from "react";
import {
  Button,
  Card,
  Divider,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from "antd";
import { motion } from "framer-motion";
import { CalendarRange, FileText, Plus } from "lucide-react";
import {
  useGetAttendancePoliciesQuery,
  useSaveAttendancePolicyMutation,
} from "../../../../../../service/lms/ApiAttendance";
import {
  DAY_OPTIONS,
  POLICY_TYPE_OPTIONS,
  innerCardStyle,
  itemVariants,
  mapRuleRows,
} from "../configShared";

const MotionDiv = motion.div;

const PolicySettingsTab = ({
  fallbackPolicies = [],
  loadingFallback = false,
}) => {
  const [policyForm] = Form.useForm();
  const selectedPolicyType = Form.useWatch("policy_type", policyForm);
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);

  const { data: policiesRes, isFetching: fetchingPolicies } =
    useGetAttendancePoliciesQuery();
  const [saveAttendancePolicy, { isLoading: savingPolicy }] =
    useSaveAttendancePolicyMutation();

  const policyRows = policiesRes?.data || fallbackPolicies;

  const openCreatePolicyModal = () => {
    setEditingPolicy(null);
    policyForm.setFieldsValue({
      name: "",
      code: "",
      target_role: "student",
      policy_type: "student_fixed",
      description: "",
      is_active: true,
      day_rules: mapRuleRows([]),
    });
    setPolicyModalOpen(true);
  };

  const openEditPolicyModal = (record) => {
    setEditingPolicy(record);
    policyForm.setFieldsValue({
      id: record.id,
      name: record.name,
      code: record.code,
      target_role: record.target_role,
      policy_type: record.policy_type,
      description: record.description || "",
      is_active: record.is_active === true,
      day_rules: mapRuleRows(record.day_rules),
    });
    setPolicyModalOpen(true);
  };

  const handleSavePolicy = async () => {
    try {
      const values = await policyForm.validateFields();
      const normalizedDayRules = (values.day_rules || []).map((rule) => {
        const baseRule = {
          ...rule,
          checkin_start: rule.checkin_start || null,
          checkin_end: rule.checkin_end || null,
          reference_checkin_time: rule.reference_checkin_time || null,
          late_tolerance_minutes: Number(rule.late_tolerance_minutes || 0),
          checkout_start: rule.checkout_start || null,
          reference_checkout_time: rule.reference_checkout_time || null,
          min_presence_minutes:
            rule.min_presence_minutes === undefined ||
            rule.min_presence_minutes === ""
              ? null
              : Number(rule.min_presence_minutes),
          checkout_is_optional: rule.checkout_is_optional === true,
        };

        if (values.policy_type === "teacher_schedule_based") {
          return {
            ...baseRule,
            reference_checkin_time: null,
            late_tolerance_minutes: 0,
            checkout_start: null,
            reference_checkout_time: null,
            min_presence_minutes: null,
            checkout_is_optional: false,
          };
        }

        if (values.policy_type === "student_fixed") {
          return {
            ...baseRule,
            min_presence_minutes: null,
            checkout_is_optional: false,
          };
        }

        return baseRule;
      });

      await saveAttendancePolicy({
        ...values,
        day_rules: normalizedDayRules,
      }).unwrap();
      setPolicyModalOpen(false);
      setEditingPolicy(null);
      message.success("Policy absensi berhasil disimpan.");
    } catch (error) {
      if (error?.errorFields) return;
      message.error(error?.data?.message || "Gagal menyimpan policy absensi.");
    }
  };

  return (
    <>
      <Card
        title='Policy Absensi'
        style={innerCardStyle}
        extra={
          <Button
            type='primary'
            icon={<Plus size={14} />}
            onClick={openCreatePolicyModal}
          >
            Tambah Policy
          </Button>
        }
      >
        <MotionDiv variants={itemVariants} initial='hidden' animate='show'>
          <Table
            rowKey='id'
            loading={fetchingPolicies || loadingFallback}
            dataSource={policyRows}
            pagination={{ pageSize: 8 }}
            scroll={{ x: 920 }}
            columns={[
              { title: "Nama", dataIndex: "name", width: 220 },
              { title: "Code", dataIndex: "code", width: 180 },
              {
                title: "Role",
                dataIndex: "target_role",
                width: 120,
                render: (value) => (
                  <Tag color={value === "teacher" ? "blue" : "green"}>
                    {value}
                  </Tag>
                ),
              },
              { title: "Tipe", dataIndex: "policy_type", width: 220 },
              {
                title: "Rule Hari Aktif",
                width: 140,
                render: (_, record) =>
                  (record.day_rules || []).filter(
                    (item) => item.is_active !== false,
                  ).length,
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
                width: 100,
                render: (_, record) => (
                  <Button
                    size='small'
                    onClick={() => openEditPolicyModal(record)}
                  >
                    Edit
                  </Button>
                ),
              },
            ]}
          />
        </MotionDiv>
      </Card>

      <Modal
        title={editingPolicy ? "Edit Policy Absensi" : "Tambah Policy Absensi"}
        open={policyModalOpen}
        width={1100}
        onCancel={() => setPolicyModalOpen(false)}
        onOk={handleSavePolicy}
        confirmLoading={savingPolicy}
        centered
      >
        <Form form={policyForm} layout='vertical'>
          <Form.Item name='id' hidden>
            <Input />
          </Form.Item>
          <Flex gap={12} wrap='wrap'>
            <Form.Item
              style={{ minWidth: 240, flex: 1 }}
              name='name'
              label='Nama Policy'
              rules={[{ required: true, message: "Nama policy wajib diisi." }]}
            >
              <Input placeholder='Contoh: Policy Siswa Reguler' />
            </Form.Item>
            <Form.Item
              style={{ minWidth: 220 }}
              name='code'
              label='Code'
              rules={[{ required: true, message: "Code wajib diisi." }]}
            >
              <Input placeholder='student_regular' />
            </Form.Item>
          </Flex>
          <Flex gap={12} wrap='wrap'>
            <Form.Item
              style={{ minWidth: 200 }}
              name='target_role'
              label='Target Role'
              rules={[{ required: true, message: "Target role wajib diisi." }]}
            >
              <Select
                options={[
                  { label: "Siswa", value: "student" },
                  { label: "Guru", value: "teacher" },
                ]}
              />
            </Form.Item>
            <Form.Item
              style={{ minWidth: 260 }}
              name='policy_type'
              label='Tipe Policy'
              rules={[{ required: true, message: "Tipe policy wajib diisi." }]}
            >
              <Select options={POLICY_TYPE_OPTIONS} />
            </Form.Item>
            <Form.Item name='is_active' label='Status' valuePropName='checked'>
              <Switch checkedChildren='Aktif' unCheckedChildren='Nonaktif' />
            </Form.Item>
          </Flex>
          <Form.Item name='description' label='Deskripsi'>
            <Input.TextArea
              rows={2}
              placeholder='Catatan atau konteks policy'
            />
          </Form.Item>

          <Divider orientation='left'>
            <Space>
              <CalendarRange size={14} />
              Rule Harian
            </Space>
          </Divider>
          <Form.List name='day_rules'>
            {(fields) => (
              <Space vertical style={{ width: "100%" }} size={12}>
                {fields.map((field, index) => (
                  <Card
                    size='small'
                    key={field.key}
                    title={DAY_OPTIONS[index]?.label || `Hari ${index + 1}`}
                    extra={<FileText size={14} color='#475569' />}
                    style={{ borderRadius: 12 }}
                  >
                    <Form.Item name={[field.name, "day_of_week"]} hidden>
                      <InputNumber />
                    </Form.Item>
                    <Flex gap={12} wrap='wrap'>
                      <Form.Item
                        name={[field.name, "is_active"]}
                        valuePropName='checked'
                        label='Aktif'
                      >
                        <Switch
                          checkedChildren='Ya'
                          unCheckedChildren='Tidak'
                        />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, "checkin_start"]}
                        label='Checkin Mulai'
                      >
                        <Input placeholder='07:00' />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, "checkin_end"]}
                        label='Checkin Selesai'
                      >
                        <Input placeholder='08:00' />
                      </Form.Item>
                      {selectedPolicyType !== "teacher_schedule_based" && (
                        <Form.Item
                          name={[field.name, "reference_checkin_time"]}
                          label='Jam Masuk'
                        >
                          <Input placeholder='07:15' />
                        </Form.Item>
                      )}
                      {selectedPolicyType !== "teacher_schedule_based" && (
                        <Form.Item
                          name={[field.name, "late_tolerance_minutes"]}
                          label='Toleransi Telat (menit)'
                        >
                          <InputNumber min={0} />
                        </Form.Item>
                      )}
                      {selectedPolicyType !== "teacher_schedule_based" && (
                        <Form.Item
                          name={[field.name, "checkout_start"]}
                          label='Checkout Mulai'
                        >
                          <Input placeholder='14:00' />
                        </Form.Item>
                      )}
                      {selectedPolicyType !== "teacher_schedule_based" && (
                        <Form.Item
                          name={[field.name, "reference_checkout_time"]}
                          label='Jam Pulang'
                        >
                          <Input placeholder='15:00' />
                        </Form.Item>
                      )}
                      {selectedPolicyType === "teacher_fixed_daily" && (
                        <Form.Item
                          name={[field.name, "min_presence_minutes"]}
                          label='Minimal Hadir (menit)'
                        >
                          <InputNumber min={0} />
                        </Form.Item>
                      )}
                      {selectedPolicyType === "teacher_fixed_daily" && (
                        <Form.Item
                          name={[field.name, "checkout_is_optional"]}
                          valuePropName='checked'
                          label='Checkout Opsional'
                        >
                          <Switch
                            checkedChildren='Ya'
                            unCheckedChildren='Tidak'
                          />
                        </Form.Item>
                      )}
                    </Flex>
                  </Card>
                ))}
              </Space>
            )}
          </Form.List>
        </Form>
      </Modal>
    </>
  );
};

export default PolicySettingsTab;
