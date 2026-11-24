import React from "react";
import { Col, Empty, Form, Row } from "antd";
import ConfigInput from "./ConfigInput";

const formatLabel = (value) =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const ConfigCategoryPanel = ({ configs = [] }) => {
  if (configs.length === 0) {
    return <Empty description="Tidak ada konfigurasi untuk kategori ini." />;
  }

  return (
    <Row gutter={[24, 0]} style={{ paddingTop: 8 }}>
      {configs.map((item) => (
        <Col xs={24} lg={12} key={item.key} style={{ minWidth: 0 }}>
          <Form.Item
            label={formatLabel(item.key)}
            name={item.key}
            extra={item.description}
            rules={[{ required: true, message: "Field ini tidak boleh kosong" }]}
          >
            <ConfigInput type={item.type} placeholder={item.description} />
          </Form.Item>
        </Col>
      ))}
    </Row>
  );
};

export default ConfigCategoryPanel;
