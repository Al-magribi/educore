import React, { useMemo, useState } from "react";
import { Button, Card, Form, Input, InputNumber, Modal, Select, Space, Table, Tag } from "antd";
import { BookOpenText, Pencil, Plus } from "lucide-react";

const ScheduleLoadCard = ({ canManage, grades, subjects, teacherAssignments, loading, onSave }) => {
  const [openModal, setOpenModal] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [teacherKeyword, setTeacherKeyword] = useState("");
  const [selectedGradeId, setSelectedGradeId] = useState(null);
  const [form] = Form.useForm();

  const gradeOptions = useMemo(
    () => (grades || []).map((item) => ({ value: item.id, label: item.name })),
    [grades],
  );
  const subjectOptions = useMemo(
    () => (subjects || []).map((item) => ({ value: item.id, label: item.name })),
    [subjects],
  );
  const sortedAssignments = useMemo(() => {
    return [...(teacherAssignments || [])].sort((a, b) => {
      const gradeCompare = (a.grade_name || "").localeCompare(b.grade_name || "");
      if (gradeCompare !== 0) return gradeCompare;
      const subjectCompare = (a.subject_name || "").localeCompare(b.subject_name || "");
      if (subjectCompare !== 0) return subjectCompare;
      const teacherCompare = (a.teacher_name || "").localeCompare(b.teacher_name || "");
      if (teacherCompare !== 0) return teacherCompare;
      return (a.class_name || "").localeCompare(b.class_name || "");
    });
  }, [teacherAssignments]);

  const filteredAssignments = useMemo(() => {
    const keyword = String(teacherKeyword || "").trim().toLowerCase();
    return sortedAssignments.filter((item) => {
      const matchTeacher = keyword
        ? String(item.teacher_name || "").toLowerCase().includes(keyword)
        : true;
      const matchGrade = selectedGradeId ? Number(item.grade_id) === Number(selectedGradeId) : true;
      return matchTeacher && matchGrade;
    });
  }, [sortedAssignments, teacherKeyword, selectedGradeId]);

  const handleOpenCreate = () => {
    setEditingRuleId(null);
    form.resetFields();
    form.setFieldsValue({
      weekly_sessions: 4,
      max_sessions_per_meeting: 2,
      minimum_gap_slots: 4,
      require_different_days: true,
      allow_same_day_with_gap: true,
      is_active: true,
    });
    setOpenModal(true);
  };

  const handleOpenEdit = (record) => {
    setEditingRuleId(record.teaching_load_grade_rule_id || null);
    form.setFieldsValue({
      grade_id: record.grade_id,
      subject_id: record.subject_id,
      weekly_sessions: record.weekly_sessions || 4,
      max_sessions_per_meeting: record.max_sessions_per_meeting || 2,
      minimum_gap_slots: Number.isFinite(record.minimum_gap_slots)
        ? record.minimum_gap_slots
        : 4,
      require_different_days: record.require_different_days ?? true,
      allow_same_day_with_gap: record.allow_same_day_with_gap ?? true,
      is_active: record.is_active ?? true,
      id: record.teaching_load_grade_rule_id || undefined,
    });
    setOpenModal(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    await onSave({
      ...values,
      id: editingRuleId || values.id,
      scope_type: "grade",
    });
    setOpenModal(false);
  };

  const assignmentColumns = [
    { title: "Guru", dataIndex: "teacher_name", key: "teacher_name", width: 240 },
    { title: "Mapel", dataIndex: "subject_name", key: "subject_name", width: 180 },
    { title: "Tingkat", dataIndex: "grade_name", key: "grade_name", width: 120 },
    {
      title: "Kelas",
      dataIndex: "class_name",
      key: "class_name",
      width: 260,
      render: (_, record) => {
        const total = Number(record.class_count || 0);
        const classNames = Array.isArray(record.class_names) ? record.class_names : [];
        return (
          <Space wrap size={4}>
            {classNames.map((name) => (
              <Tag key={`${record.teacher_id}-${record.subject_id}-${record.grade_id}-${name}`}>
                {name}
              </Tag>
            ))}
            {total > 0 ? <Tag color='cyan'>{total} kelas</Tag> : null}
          </Space>
        );
      },
    },
    {
      title: "Beban Sesi",
      dataIndex: "weekly_sessions",
      key: "weekly_sessions",
      width: 120,
      render: (value) =>
        value ? <Tag color='blue'>{value} sesi</Tag> : <Tag color='default'>Belum diatur</Tag>,
    },
    {
      title: "Status Beban",
      dataIndex: "teaching_load_grade_rule_id",
      key: "teaching_load_grade_rule_id",
      width: 140,
      render: (value) =>
        value ? <Tag color='green'>Sudah diatur</Tag> : <Tag color='orange'>Belum diatur</Tag>,
    },
    {
      title: "Aksi",
      key: "action",
      width: 120,
      render: (_, record) =>
        canManage ? (
          <Button
            size='small'
            icon={<Pencil size={12} />}
            onClick={() => handleOpenEdit(record)}
          >
            Edit
          </Button>
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
          <span>Beban Ajar</span>
        </Space>
      }
      extra={
        canManage ? (
          <Button type='primary' icon={<Plus size={14} />} onClick={handleOpenCreate}>
            Atur Per Tingkat
          </Button>
        ) : null
      }
    >
      <Table
        rowKey={(record) =>
          `${record.teacher_id}-${record.subject_id}-${record.grade_id || "general"}`
        }
        size='small'
        loading={loading}
        columns={assignmentColumns}
        dataSource={filteredAssignments}
        scroll={{ x: 900 }}
        pagination={{ pageSize: 8 }}
        title={() => (
          <Space wrap>
            <Input
              allowClear
              placeholder='Filter nama guru'
              value={teacherKeyword}
              onChange={(event) => setTeacherKeyword(event.target.value)}
              style={{ width: 240 }}
            />
            <Select
              allowClear
              placeholder='Filter tingkat'
              options={gradeOptions}
              value={selectedGradeId}
              onChange={(value) => setSelectedGradeId(value)}
              style={{ width: 180 }}
            />
          </Space>
        )}
      />

      <Modal
        open={openModal}
        title={editingRuleId ? "Edit Beban Ajar Per Tingkat" : "Atur Beban Ajar Per Tingkat"}
        onCancel={() => setOpenModal(false)}
        onOk={handleSubmit}
        okText='Simpan'
        confirmLoading={loading}
      >
        <Form form={form} layout='vertical'>
          <Form.Item name='id' hidden>
            <InputNumber />
          </Form.Item>
          <Form.Item name='grade_id' label='Tingkat' rules={[{ required: true }]}>
            <Select showSearch optionFilterProp='label' options={gradeOptions} />
          </Form.Item>
          <Form.Item name='subject_id' label='Mata Pelajaran' rules={[{ required: true }]}>
            <Select showSearch optionFilterProp='label' options={subjectOptions} />
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
          <Form.Item name='minimum_gap_slots' label='Minimal gap slot' rules={[{ required: true }]}>
            <InputNumber min={0} max={10} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default ScheduleLoadCard;
