import React from "react";
import { Row, Col, Form } from "antd";
import ConfigInput from "./ConfigInput"; // Import komponen input di atas

const ConfigCategoryPanel = ({ configs = [] }) => {
  if (configs.length === 0) {
    return (
      <p style={{ color: "#999" }}>Tidak ada konfigurasi untuk kategori ini.</p>
    );
  }

  return (
    <Row gutter={[24, 24]}>
      {configs.map((item) => (
        <Col span={24} lg={12} key={item.key}>
          <Form.Item
            label={item.key} // Bisa diganti label user-friendly jika ada
            name={item.key}
            tooltip={item.description} // Menampilkan deskripsi saat di-hover
            rules={[
              { required: true, message: "Field ini tidak boleh kosong" },
            ]}
          >
            <ConfigInput type={item.type} placeholder={item.description} />
          </Form.Item>
          {/* Helper text di bawah input */}
          <div style={{ fontSize: "12px", color: "#888", marginTop: "-10px" }}>
            {item.description}
          </div>
        </Col>
      ))}
    </Row>
  );
};

export default ConfigCategoryPanel;
