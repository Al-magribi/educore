import { useState } from 'react';
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
  TimePicker,
  Typography,
  message,
} from 'antd';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { motion } from 'framer-motion';
import { CalendarRange, Copy, FileText, Plus } from 'lucide-react';
import {
  useDeleteAttendancePolicyMutation,
  useGetAttendancePoliciesQuery,
  useSaveAttendancePolicyMutation,
} from '../../../../../service/lms/ApiAttendance';
import {
  DAY_OPTIONS,
  POLICY_TARGET_ROLE_OPTIONS,
  POLICY_TYPE_OPTIONS,
  innerCardStyle,
  itemVariants,
  mapRuleRows,
  toTimeHm,
} from '../configShared';

dayjs.extend(customParseFormat);

const { Text } = Typography;
const MotionDiv = motion.div;
const TIME_FORMAT = 'HH:mm';
const ALL_DAY_VALUES = DAY_OPTIONS.map((day) => day.value);

const emptyRuleTemplate = () => ({
  checkin_start: null,
  checkin_end: null,
  reference_checkin_time: null,
  late_tolerance_minutes: 0,
  checkout_start: null,
  reference_checkout_time: null,
  min_presence_minutes: null,
  checkout_is_optional: false,
});

const toDayjsTime = (value) => {
  if (dayjs.isDayjs(value)) {
    return value.isValid() ? value : null;
  }
  const hm = toTimeHm(value);
  if (!hm) return null;
  const parsed = dayjs(hm, TIME_FORMAT, true);
  return parsed.isValid() ? parsed : null;
};

const cloneTimeValue = (value) => {
  const parsed = toDayjsTime(value);
  return parsed ? parsed.clone() : null;
};

const cloneRuleTimes = (source = {}) => ({
  checkin_start: cloneTimeValue(source.checkin_start),
  checkin_end: cloneTimeValue(source.checkin_end),
  reference_checkin_time: cloneTimeValue(source.reference_checkin_time),
  late_tolerance_minutes: Number(source.late_tolerance_minutes || 0),
  checkout_start: cloneTimeValue(source.checkout_start),
  reference_checkout_time: cloneTimeValue(source.reference_checkout_time),
  min_presence_minutes:
    source.min_presence_minutes === undefined || source.min_presence_minutes === ''
      ? null
      : Number(source.min_presence_minutes),
  checkout_is_optional: source.checkout_is_optional === true,
});

const slugifyCode = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50);

const nextUniqueCode = (baseCode, existingCodes = []) => {
  const used = new Set(
    existingCodes.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean),
  );
  const base = slugifyCode(baseCode) || 'policy';
  if (!used.has(base)) return base;
  let index = 2;
  while (used.has(`${base}_${index}`)) {
    index += 1;
  }
  return `${base}_${index}`;
};

const rulesToFormValues = (rules = []) =>
  mapRuleRows(rules).map((rule) => ({
    ...rule,
    checkin_start: toDayjsTime(rule.checkin_start),
    checkin_end: toDayjsTime(rule.checkin_end),
    reference_checkin_time: toDayjsTime(rule.reference_checkin_time),
    checkout_start: toDayjsTime(rule.checkout_start),
    reference_checkout_time: toDayjsTime(rule.reference_checkout_time),
  }));

const PolicySettingsTab = ({ fallbackPolicies = [], loadingFallback = false }) => {
  const [policyForm] = Form.useForm();
  const [templateForm] = Form.useForm();
  const selectedPolicyType = Form.useWatch('policy_type', policyForm);
  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [applyDayTargets, setApplyDayTargets] = useState(ALL_DAY_VALUES);

  const { data: policiesRes, isFetching: fetchingPolicies } = useGetAttendancePoliciesQuery();
  const [saveAttendancePolicy, { isLoading: savingPolicy }] = useSaveAttendancePolicyMutation();
  const [deleteAttendancePolicy, { isLoading: deletingPolicy }] = useDeleteAttendancePolicyMutation();

  const policyRows = policiesRes !== undefined ? (policiesRes?.data ?? []) : fallbackPolicies;

  const resetTemplateForm = (seed = null) => {
    templateForm.setFieldsValue(seed ? cloneRuleTimes(seed) : emptyRuleTemplate());
    setApplyDayTargets(ALL_DAY_VALUES);
  };

  const openCreatePolicyModal = () => {
    setEditingPolicy(null);
    policyForm.resetFields();
    policyForm.setFieldsValue({
      id: undefined,
      name: '',
      code: '',
      target_role: 'student',
      policy_type: 'student_fixed',
      description: '',
      is_active: true,
      day_rules: rulesToFormValues([]),
    });
    resetTemplateForm();
    setPolicyModalOpen(true);
  };

  const openDuplicatePolicyModal = (record) => {
    setEditingPolicy(null);
    policyForm.resetFields();
    const uniqueCode = nextUniqueCode(`${record.code || record.name}_copy`, policyRows.map((item) => item.code));
    policyForm.setFieldsValue({
      id: undefined,
      name: `${record.name || 'Policy'} (salinan)`,
      code: uniqueCode,
      target_role: record.target_role,
      policy_type: record.policy_type,
      description: record.description || '',
      is_active: record.is_active === true,
      day_rules: rulesToFormValues(record.day_rules),
    });
    const seed = mapRuleRows(record.day_rules).find((rule) => rule?.is_active !== false);
    resetTemplateForm(seed);
    setPolicyModalOpen(true);
  };

  const openEditPolicyModal = (record) => {
    setEditingPolicy(record);
    const dayRules = rulesToFormValues(record.day_rules);
    policyForm.setFieldsValue({
      id: record.id,
      name: record.name,
      code: record.code,
      target_role: record.target_role,
      policy_type: record.policy_type,
      description: record.description || '',
      is_active: record.is_active === true,
      day_rules: dayRules,
    });
    const seed = dayRules.find((rule) => rule?.is_active !== false) || dayRules[0];
    resetTemplateForm(seed);
    setPolicyModalOpen(true);
  };

  const applyRuleToDays = (source, targetDayValues, { activate = true } = {}) => {
    const targets = new Set((targetDayValues || []).map(Number));
    if (targets.size === 0) {
      message.warning('Pilih minimal satu hari tujuan.');
      return false;
    }

    const dayRules = policyForm.getFieldValue('day_rules') || [];
    const cloned = cloneRuleTimes(source);
    const nextRules = dayRules.map((rule) => {
      if (!targets.has(Number(rule.day_of_week))) return rule;
      return {
        ...rule,
        ...cloned,
        day_of_week: rule.day_of_week,
        is_active: activate ? true : rule.is_active,
        notes: rule.notes || null,
      };
    });

    policyForm.setFieldsValue({ day_rules: nextRules });
    return true;
  };

  const handleApplyTemplateToDays = async () => {
    try {
      const values = await templateForm.validateFields();
      const ok = applyRuleToDays(values, applyDayTargets, { activate: true });
      if (!ok) return;
      const labels = DAY_OPTIONS.filter((day) => applyDayTargets.includes(day.value))
        .map((day) => day.label)
        .join(', ');
      message.success(`Jam template diterapkan ke: ${labels}.`);
    } catch {
      // form validation errors already shown
    }
  };

  const handleDuplicateDayRule = (sourceIndex) => {
    const dayRules = policyForm.getFieldValue('day_rules') || [];
    const source = dayRules[sourceIndex];
    if (!source) return;

    const otherDays = dayRules
      .filter((_, index) => index !== sourceIndex)
      .map((rule) => Number(rule.day_of_week));

    const ok = applyRuleToDays(source, otherDays, { activate: true });
    if (!ok) return;

    const sourceLabel = DAY_OPTIONS[sourceIndex]?.label || `Hari ${sourceIndex + 1}`;
    message.success(`Jam ${sourceLabel} diduplikasi ke semua hari lain.`);
  };

  const handleSavePolicy = async () => {
    try {
      const values = await policyForm.validateFields();
      const normalizedDayRules = (values.day_rules || []).map((rule) => {
        const isActive = rule.is_active !== false;
        const baseRule = {
          day_of_week: Number(rule.day_of_week),
          is_active: isActive,
          checkin_start: isActive ? toTimeHm(rule.checkin_start) : null,
          checkin_end: isActive ? toTimeHm(rule.checkin_end) : null,
          reference_checkin_time: isActive ? toTimeHm(rule.reference_checkin_time) : null,
          late_tolerance_minutes: isActive ? Number(rule.late_tolerance_minutes || 0) : 0,
          checkout_start: isActive ? toTimeHm(rule.checkout_start) : null,
          reference_checkout_time: isActive ? toTimeHm(rule.reference_checkout_time) : null,
          min_presence_minutes:
            !isActive || rule.min_presence_minutes === undefined || rule.min_presence_minutes === ''
              ? null
              : Number(rule.min_presence_minutes),
          checkout_is_optional: isActive && rule.checkout_is_optional === true,
          notes: rule.notes || null,
        };

        if (values.policy_type === 'teacher_schedule_based') {
          return {
            ...baseRule,
            checkin_end: null,
            reference_checkin_time: null,
            late_tolerance_minutes: 0,
            checkout_start: null,
            reference_checkout_time: isActive ? toTimeHm(rule.reference_checkout_time) : null,
            min_presence_minutes: null,
            checkout_is_optional: false,
          };
        }

        if (values.policy_type === 'student_fixed' || values.policy_type === 'activity_fixed') {
          return {
            ...baseRule,
            min_presence_minutes: null,
            checkout_is_optional: false,
          };
        }

        return baseRule;
      });

      for (const rule of normalizedDayRules) {
        if (rule.is_active === false) continue;
        if (
          values.policy_type !== 'teacher_schedule_based' &&
          rule.checkin_start &&
          rule.checkin_end &&
          rule.checkin_start >= rule.checkin_end
        ) {
          const dayLabel =
            DAY_OPTIONS.find((item) => item.value === rule.day_of_week)?.label || `Hari ${rule.day_of_week}`;
          message.error(`${dayLabel}: Checkin Mulai harus lebih awal dari Checkin Selesai.`);
          return;
        }
      }

      await saveAttendancePolicy({
        ...values,
        id: editingPolicy?.id || undefined,
        day_rules: normalizedDayRules,
      }).unwrap();
      setPolicyModalOpen(false);
      setEditingPolicy(null);
      message.success('Policy absensi berhasil disimpan.');
    } catch (error) {
      if (error?.errorFields) return;
      message.error(error?.data?.message || 'Gagal menyimpan policy absensi.');
    }
  };

  const handleDeletePolicy = async (id) => {
    try {
      await deleteAttendancePolicy(id).unwrap();
      message.success('Policy absensi berhasil dihapus.');
    } catch (error) {
      message.error(error?.data?.message || 'Gagal menghapus policy absensi.');
      throw error;
    }
  };

  const handleRowAction = (action, record) => {
    if (action === 'edit') {
      openEditPolicyModal(record);
      return;
    }

    if (action === 'duplicate') {
      openDuplicatePolicyModal(record);
      return;
    }

    if (action === 'delete') {
      const dayRuleCount = (record.day_rules || []).filter((item) => item.is_active !== false).length;

      Modal.confirm({
        title: 'Hapus policy absensi ini?',
        content: (
          <div>
            <p>
              Policy <strong>{record.name}</strong> akan dihapus permanen.
            </p>
            <p style={{ marginBottom: 0 }}>
              Semua data terkait ikut terhapus, termasuk rule harian
              {dayRuleCount > 0 ? ` (${dayRuleCount} hari aktif)` : ''} dan seluruh assignment policy yang memakai
              policy ini. Data presensi yang sudah tercatat tidak akan terhapus, namun referensi policy-nya akan
              dikosongkan.
            </p>
          </div>
        ),
        okText: 'Hapus',
        okType: 'danger',
        cancelText: 'Batal',
        okButtonProps: { loading: deletingPolicy },
        onOk: () => handleDeletePolicy(record.id),
      });
    }
  };

  return (
    <>
      <Card
        title="Policy Absensi"
        style={innerCardStyle}
        extra={
          <Button type="primary" icon={<Plus size={14} />} onClick={openCreatePolicyModal}>
            Tambah Policy
          </Button>
        }>
        <MotionDiv variants={itemVariants} initial="hidden" animate="show">
          <Table
            rowKey="id"
            loading={fetchingPolicies || loadingFallback}
            dataSource={policyRows}
            pagination={{ pageSize: 8 }}
            scroll={{ x: 920 }}
            columns={[
              { title: 'Nama', dataIndex: 'name', width: 220 },
              { title: 'Code', dataIndex: 'code', width: 180 },
              {
                title: 'Role',
                dataIndex: 'target_role',
                width: 120,
                render: (value) => (
                  <Tag color={value === 'teacher' ? 'blue' : value === 'all' ? 'purple' : 'green'}>
                    {value === 'all' ? 'guru & siswa' : value}
                  </Tag>
                ),
              },
              { title: 'Tipe', dataIndex: 'policy_type', width: 220 },
              {
                title: 'Rule Hari Aktif',
                width: 140,
                render: (_, record) => (record.day_rules || []).filter((item) => item.is_active !== false).length,
              },
              {
                title: 'Status',
                dataIndex: 'is_active',
                width: 120,
                render: (value) => <Tag color={value ? 'success' : 'default'}>{value ? 'Aktif' : 'Nonaktif'}</Tag>,
              },
              {
                title: 'Aksi',
                width: 130,
                render: (_, record) => (
                  <Select
                    placeholder="Aksi"
                    value={null}
                    virtual={false}
                    style={{ width: '100%', maxWidth: 130 }}
                    options={[
                      { value: 'edit', label: 'Edit' },
                      { value: 'duplicate', label: 'Duplikat' },
                      { value: 'delete', label: 'Hapus' },
                    ]}
                    onChange={(value) => handleRowAction(value, record)}
                  />
                ),
              },
            ]}
          />
        </MotionDiv>
      </Card>

      <Modal
        title={editingPolicy ? 'Edit Policy Absensi' : 'Tambah Policy Absensi'}
        open={policyModalOpen}
        width={1100}
        onCancel={() => setPolicyModalOpen(false)}
        onOk={handleSavePolicy}
        confirmLoading={savingPolicy}
        centered>
        <Form form={policyForm} layout="vertical">
          <Form.Item name="id" hidden>
            <Input />
          </Form.Item>
          <Flex gap={12} wrap="wrap">
            <Form.Item
              style={{ minWidth: 240, flex: 1 }}
              name="name"
              label="Nama Policy"
              rules={[{ required: true, message: 'Nama policy wajib diisi.' }]}
              extra="Contoh: Kelas Pagi, Guru Pagi, atau Silat. Setiap tipe policy boleh lebih dari satu.">
              <Input placeholder="Contoh: Kelas Pagi" />
            </Form.Item>
            <Form.Item
              style={{ minWidth: 220 }}
              name="code"
              label="Code"
              rules={[{ required: true, message: 'Code wajib diisi.' }]}
              extra="Harus unik per sekolah">
              <Input placeholder="kelas_pagi" />
            </Form.Item>
          </Flex>
          <Flex gap={12} wrap="wrap">
            <Form.Item
              style={{ minWidth: 200 }}
              name="target_role"
              label="Target Role"
              rules={[{ required: true, message: 'Target role wajib diisi.' }]}
              extra="Boleh ada banyak policy aktif untuk role dan tipe yang sama">
              <Select
                options={
                  selectedPolicyType === 'activity_fixed'
                    ? POLICY_TARGET_ROLE_OPTIONS
                    : POLICY_TARGET_ROLE_OPTIONS.filter((item) => item.value !== 'all')
                }
              />
            </Form.Item>
            <Form.Item
              style={{ minWidth: 260 }}
              name="policy_type"
              label="Tipe Policy"
              rules={[{ required: true, message: 'Tipe policy wajib diisi.' }]}
              extra="Siswa, guru, dan ekstra masing-masing boleh punya beberapa policy.">
              <Select
                options={POLICY_TYPE_OPTIONS}
                onChange={(value) => {
                  const matched = POLICY_TYPE_OPTIONS.find((item) => item.value === value);
                  if (matched?.role) {
                    policyForm.setFieldValue('target_role', matched.role);
                  }
                }}
              />
            </Form.Item>
            <Form.Item name="is_active" label="Status" valuePropName="checked">
              <Switch checkedChildren="Aktif" unCheckedChildren="Nonaktif" />
            </Form.Item>
          </Flex>
          <Form.Item name="description" label="Deskripsi">
            <Input.TextArea rows={2} placeholder="Catatan atau konteks policy" />
          </Form.Item>

          <Divider orientation="left">
            <Space>
              <CalendarRange size={14} />
              Rule Harian
            </Space>
          </Divider>

          <Card
            size="small"
            title="Template jam (isi sekali, terapkan ke banyak hari)"
            style={{ borderRadius: 12, marginBottom: 12, background: '#f8fafc' }}>
            <Form form={templateForm} layout="vertical" initialValues={emptyRuleTemplate()}>
              <Flex gap={12} wrap="wrap">
                <Form.Item
                  name="checkin_start"
                  label="Checkin Mulai"
                  style={{ marginBottom: 8 }}>
                  <TimePicker
                    format={TIME_FORMAT}
                    needConfirm={false}
                    style={{ width: 120 }}
                    placeholder="07:00"
                  />
                </Form.Item>
                {selectedPolicyType !== 'teacher_schedule_based' && (
                  <Form.Item name="checkin_end" label="Checkin Selesai" style={{ marginBottom: 8 }}>
                    <TimePicker
                      format={TIME_FORMAT}
                      needConfirm={false}
                      style={{ width: 120 }}
                      placeholder="08:00"
                    />
                  </Form.Item>
                )}
                {selectedPolicyType !== 'teacher_schedule_based' && (
                  <Form.Item name="reference_checkin_time" label="Jam Masuk" style={{ marginBottom: 8 }}>
                    <TimePicker
                      format={TIME_FORMAT}
                      needConfirm={false}
                      style={{ width: 120 }}
                      placeholder="07:15"
                    />
                  </Form.Item>
                )}
                {selectedPolicyType !== 'teacher_schedule_based' && (
                  <Form.Item
                    name="late_tolerance_minutes"
                    label="Toleransi Telat (menit)"
                    style={{ marginBottom: 8 }}>
                    <InputNumber min={0} />
                  </Form.Item>
                )}
                {selectedPolicyType !== 'teacher_schedule_based' && (
                  <Form.Item name="checkout_start" label="Checkout Mulai" style={{ marginBottom: 8 }}>
                    <TimePicker
                      format={TIME_FORMAT}
                      needConfirm={false}
                      style={{ width: 120 }}
                      placeholder="14:00"
                    />
                  </Form.Item>
                )}
                <Form.Item name="reference_checkout_time" label="Jam Pulang" style={{ marginBottom: 8 }}>
                  <TimePicker
                    format={TIME_FORMAT}
                    needConfirm={false}
                    style={{ width: 120 }}
                    placeholder="15:00"
                  />
                </Form.Item>
                {selectedPolicyType === 'teacher_fixed_daily' && (
                  <Form.Item
                    name="min_presence_minutes"
                    label="Minimal Hadir (menit)"
                    style={{ marginBottom: 8 }}>
                    <InputNumber min={0} />
                  </Form.Item>
                )}
                {selectedPolicyType === 'teacher_fixed_daily' && (
                  <Form.Item
                    name="checkout_is_optional"
                    valuePropName="checked"
                    label="Checkout Opsional"
                    style={{ marginBottom: 8 }}>
                    <Switch checkedChildren="Ya" unCheckedChildren="Tidak" />
                  </Form.Item>
                )}
              </Flex>
              <Flex gap={12} wrap="wrap" align="end">
                <div style={{ minWidth: 280, flex: 1 }}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>
                    Terapkan ke hari
                  </Text>
                  <Select
                    mode="multiple"
                    allowClear
                    value={applyDayTargets}
                    onChange={(values) =>
                      setApplyDayTargets(
                        values.length > 0 ? values.map(Number) : [],
                      )
                    }
                    options={DAY_OPTIONS.map((day) => ({
                      value: day.value,
                      label: day.label,
                    }))}
                    maxTagCount="responsive"
                    style={{ width: '100%' }}
                    placeholder="Pilih hari tujuan"
                  />
                </div>
                <Space wrap>
                  <Button onClick={() => setApplyDayTargets(ALL_DAY_VALUES)}>
                    Semua hari
                  </Button>
                  <Button
                    type="primary"
                    icon={<Copy size={14} />}
                    onClick={handleApplyTemplateToDays}>
                    Terapkan ke hari terpilih
                  </Button>
                </Space>
              </Flex>
            </Form>
          </Card>

          <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
            Setelah diterapkan, boleh sesuaikan per hari. Tombol Duplikat di tiap kartu
            menyalin jam hari itu ke semua hari lain.
          </Text>
          <Form.List name="day_rules">
            {(fields) => (
              <Space vertical style={{ width: '100%' }} size={12}>
                {fields.map((field, index) => (
                  <Card
                    size="small"
                    key={field.key}
                    title={DAY_OPTIONS[index]?.label || `Hari ${index + 1}`}
                    extra={
                      <Space size={8}>
                        <Button
                          size="small"
                          icon={<Copy size={12} />}
                          onClick={() => handleDuplicateDayRule(index)}>
                          Duplikat ke semua hari
                        </Button>
                        <FileText size={14} color="#475569" />
                      </Space>
                    }
                    style={{ borderRadius: 12 }}>
                    <Form.Item name={[field.name, 'day_of_week']} hidden>
                      <InputNumber />
                    </Form.Item>
                    <Flex gap={12} wrap="wrap">
                      <Form.Item
                        name={[field.name, 'is_active']}
                        valuePropName="checked"
                        label="Aktif"
                        tooltip="Hari aktif = scan RFID di hari ini diproses. Nonaktif = scan diabaikan.">
                        <Switch checkedChildren="Ya" unCheckedChildren="Tidak" />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, 'checkin_start']}
                        label="Checkin Mulai"
                        tooltip={
                          selectedPolicyType === 'teacher_schedule_based'
                            ? 'Awal jendela scan masuk gerbang (gate). Untuk schedule-based wajib diisi agar absensi harian terkontrol.'
                            : 'Awal jendela scan masuk RFID. Scan sebelum jam ini ditolak.'
                        }>
                        <TimePicker
                          format={TIME_FORMAT}
                          needConfirm={false}
                          style={{ width: 120 }}
                          placeholder="07:00"
                        />
                      </Form.Item>
                      {selectedPolicyType !== 'teacher_schedule_based' && (
                        <Form.Item
                          name={[field.name, 'checkin_end']}
                          label="Checkin Selesai"
                          tooltip="Akhir jendela scan masuk RFID. Scan setelah jam ini ditolak. Setelah jam ini, yang belum tap masuk otomatis berstatus absent.">
                          <TimePicker
                            format={TIME_FORMAT}
                            needConfirm={false}
                            style={{ width: 120 }}
                            placeholder="08:00"
                          />
                        </Form.Item>
                      )}
                      {selectedPolicyType !== 'teacher_schedule_based' && (
                        <Form.Item
                          name={[field.name, 'reference_checkin_time']}
                          label="Jam Masuk"
                          tooltip="Jam masuk resmi. Dipakai menghitung status hadir/telat dari waktu scan RFID masuk.">
                          <TimePicker
                            format={TIME_FORMAT}
                            needConfirm={false}
                            style={{ width: 120 }}
                            placeholder="07:15"
                          />
                        </Form.Item>
                      )}
                      {selectedPolicyType !== 'teacher_schedule_based' && (
                        <Form.Item
                          name={[field.name, 'late_tolerance_minutes']}
                          label="Toleransi Telat (menit)"
                          tooltip="Kelonggaran setelah Jam Masuk. Masih dalam toleransi = hadir; lewat = telat.">
                          <InputNumber min={0} />
                        </Form.Item>
                      )}
                      {selectedPolicyType !== 'teacher_schedule_based' && (
                        <Form.Item
                          name={[field.name, 'checkout_start']}
                          label="Checkout Mulai"
                          tooltip="Awal jendela scan pulang RFID. Scan pulang sebelum jam ini ditolak.">
                          <TimePicker
                            format={TIME_FORMAT}
                            needConfirm={false}
                            style={{ width: 120 }}
                            placeholder="14:00"
                          />
                        </Form.Item>
                      )}
                      <Form.Item
                        name={[field.name, 'reference_checkout_time']}
                        label="Jam Pulang"
                        tooltip={
                          selectedPolicyType === 'teacher_schedule_based'
                            ? 'Jam pulang resmi gate. Setelah jam ini, guru yang sudah tap masuk tapi belum tap pulang otomatis diisi jam pulang policy.'
                            : 'Akhir jendela scan pulang RFID sekaligus jam pulang resmi. Setelah jam ini, yang sudah masuk tapi belum tap pulang otomatis diisi jam pulang policy.'
                        }>
                        <TimePicker
                          format={TIME_FORMAT}
                          needConfirm={false}
                          style={{ width: 120 }}
                          placeholder="15:00"
                        />
                      </Form.Item>
                      {selectedPolicyType === 'teacher_fixed_daily' && (
                        <Form.Item
                          name={[field.name, 'min_presence_minutes']}
                          label="Minimal Hadir (menit)"
                          tooltip="Durasi minimal antara scan masuk dan scan pulang agar kehadiran dianggap cukup.">
                          <InputNumber min={0} />
                        </Form.Item>
                      )}
                      {selectedPolicyType === 'teacher_fixed_daily' && (
                        <Form.Item
                          name={[field.name, 'checkout_is_optional']}
                          valuePropName="checked"
                          label="Checkout Opsional"
                          tooltip="Jika Ya, scan pulang tidak wajib. Jika Tidak, harus ada scan pulang RFID.">
                          <Switch checkedChildren="Ya" unCheckedChildren="Tidak" />
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
