import React from "react";
import { Form, Select } from "antd";
import { UserRound } from "lucide-react";

const TeacherSelectField = ({
  teachers,
  loading,
  selectedTeacherId,
  onChange,
}) => (
  <Form.Item
    label="Guru Pemilik Bank"
    required
    style={{ background: "#f5f5f5", padding: 12, borderRadius: 8 }}
  >
    <Select
      placeholder="Pilih guru"
      loading={loading}
      value={selectedTeacherId}
      onChange={onChange}
      allowClear
      showSearch={{ optionFilterProp: ["label"] }}
      suffixIcon={<UserRound size={14} />}
    >
      {teachers?.map((t) => (
        <Select.Option key={t.id} value={t.id} label={t.full_name}>
          {t.full_name}
        </Select.Option>
      ))}
    </Select>
  </Form.Item>
);

export default TeacherSelectField;
