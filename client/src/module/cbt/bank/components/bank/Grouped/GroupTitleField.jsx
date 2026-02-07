import React from "react";
import { Form, Input } from "antd";
import { Layers } from "lucide-react";

const GroupTitleField = () => (
  <Form.Item
    label="Nama Bank Soal Gabungan"
    name="title"
    rules={[{ required: true, message: "Nama bank soal wajib diisi" }]}
  >
    <Input
      placeholder="Contoh: Bank Soal Kombinasi UH Semester 1"
      prefix={<Layers size={16} />}
    />
  </Form.Item>
);

export default GroupTitleField;
