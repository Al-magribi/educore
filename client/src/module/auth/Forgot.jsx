import React, { useState } from "react";
import { Form, Input, Button, Card, Typography } from "antd";
import { MailOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";

const { Title, Text } = Typography;

const Forgot = () => {
  const [loading, setLoading] = useState(false);

  const onFinish = (values) => {
    setLoading(true);
    console.log("Forgot Password:", values);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundColor: "#f0f2f5",
      }}
    >
      <title>Lupa Password</title>
      <Card
        style={{ width: 400, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
        variant="borderless"
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Title level={3}>Lupa Password?</Title>
          <Text type="secondary">
            Masukkan email Anda untuk mereset password
          </Text>
        </div>

        <Form name="forgot" onFinish={onFinish} layout="vertical" size="large">
          <Form.Item
            name="email"
            rules={[
              { type: "email", message: "Format email tidak valid!" },
              { required: true, message: "Mohon masukkan email!" },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="Email Address" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Kirim Link Reset
            </Button>
          </Form.Item>

          <div style={{ textAlign: "center" }}>
            <Link
              to="/signin"
              style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
            >
              <ArrowLeftOutlined /> Kembali ke Masuk
            </Link>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default Forgot;
