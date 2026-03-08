import React, { useMemo, useState } from "react";
import {
  Button,
  Card,
  Form,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
} from "antd";
import { BookOpenText, Pencil, Plus, Trash2 } from "lucide-react";

const ScheduleLoadCard = ({
  canManage,
  classes,
  subjects,
  teachers,
  loads,
  loading,
  onSave,
  onDelete,
}) => {
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const classOptions = useMemo(
    () => (classes || []).map((item) => ({ value: item.id, label: item.name })),
    [classes],
  );
  const subjectOptions = useMemo(
    () => (subjects || []).map((item) => ({ value: item.id, label: item.name })),
    [subjects],
  );
  const teacherOptions = useMemo(
    () => (teachers || []).map((item) => ({ value: item.id, label: item.full_name })),
    [teachers],
  );

  const handleOpenCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      weekly_sessions: 2,
      max_sessions_per_meeting: 2,
      require_different_days: true,
      allow_same_day_with_gap: true,
      minimum_gap_slots: 4,
      is_active: true,
    });
    setOpenModal(true);
  };

  const handleOpenEdit = (record) => {
    setEditing(record);
    form.setFieldsValue(record);
    setOpenModal(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    await onSave({ ...values, id: editing?.id });
    setOpenModal(false);
  };

  const columns = [
    { title: "Kelas", dataIndex: "class_name", key: "class_name", width: 160 },
    { title: "Mapel", dataIndex: "subject_name", key: "subject_name", width: 180 },
    { title: "Guru", dataIndex: "teacher_name", key: "teacher_name", width: 220 },
    {
      title: "Beban Sesi",
      dataIndex: "weekly_sessions",
      width: 100,
      render: (value) => <Tag color='blue'>{value} sesi</Tag>,
    },
    {
      title: "Aturan",
      key: "rule",
      width: 220,
      render: (_, record) => (
        <Space wrap size={4}>
          <Tag>{record.max_sessions_per_meeting} sesi/pertemuan</Tag>
          {record.require_different_days ? <Tag color='gold'>Pisah hari</Tag> : null}
          {record.allow_same_day_with_gap ? (
            <Tag color='purple'>Gap {record.minimum_gap_slots}</Tag>
          ) : null}
        </Space>
      ),
    },
    {
      title: "Aksi",
      key: "action",
      width: 120,
      render: (_, record) =>
        canManage ? (
          <Space>
            <Button
              type='text'
              icon={<Pencil size={14} />}
              onClick={() => handleOpenEdit(record)}
            />
            <Popconfirm title='Hapus beban ajar ini?' onConfirm={() => onDelete(record.id)}>
              <Button type='text' danger icon={<Trash2 size={14} />} />
            </Popconfirm>
          </Space>
        ) : null,
    },
  ];

  return (
    <Card
      style={{ borderRadius: 16 }}
      styles={{ body: { padding: 20 } }}
      title={
        <Space>
          <BookOpenText size={18} />
          <span>Beban Ajar Per Kelas</span>
        </Space>
      }
      extra={
        canManage ? (
          <Button type='primary' icon={<Plus size={14} />} onClick={handleOpenCreate}>
            Tambah
          </Button>
        ) : null
      }
    >
      <Table
        rowKey='id'
        size='small'
        loading={loading}
        columns={columns}
        dataSource={loads || []}
        scroll={{ x: 960 }}
        pagination={{ pageSize: 6 }}
      />

      <Modal
        open={openModal}
        title={editing ? "Ubah Beban Ajar" : "Tambah Beban Ajar"}
        onCancel={() => setOpenModal(false)}
        onOk={handleSubmit}
        okText='Simpan'
        confirmLoading={loading}
      >
        <Form form={form} layout='vertical'>
          <Form.Item name='class_id' label='Kelas' rules={[{ required: true }]}>
            <Select showSearch optionFilterProp='label' options={classOptions} />
          </Form.Item>
          <Form.Item name='subject_id' label='Mata Pelajaran' rules={[{ required: true }]}>
            <Select showSearch optionFilterProp='label' options={subjectOptions} />
          </Form.Item>
          <Form.Item name='teacher_id' label='Guru' rules={[{ required: true }]}>
            <Select showSearch optionFilterProp='label' options={teacherOptions} />
          </Form.Item>
          <Form.Item name='weekly_sessions' label='Beban sesi per minggu' rules={[{ required: true }]}>
            <InputNumber min={1} max={12} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name='max_sessions_per_meeting'
            label='Maks sesi per pertemuan'
            rules={[{ required: true }]}
          >
            <InputNumber min={1} max={4} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name='minimum_gap_slots' label='Minimal gap slot'>
            <InputNumber min={0} max={10} style={{ width: "100%" }} />
          </Form.Item>
          <Space size={16}>
            <Form.Item name='require_different_days' valuePropName='checked' style={{ marginBottom: 0 }}>
              <Switch checkedChildren='Pisah Hari' unCheckedChildren='Boleh Sama Hari' />
            </Form.Item>
            <Form.Item name='allow_same_day_with_gap' valuePropName='checked' style={{ marginBottom: 0 }}>
              <Switch checkedChildren='Gap Aktif' unCheckedChildren='Gap Nonaktif' />
            </Form.Item>
            <Form.Item name='is_active' valuePropName='checked' style={{ marginBottom: 0 }}>
              <Switch checkedChildren='Aktif' unCheckedChildren='Nonaktif' />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </Card>
  );
};

export default ScheduleLoadCard;
