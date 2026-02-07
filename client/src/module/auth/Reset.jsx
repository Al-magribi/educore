import React, { useState } from "react";
import { Form, Input, Button, Card, Typography } from "antd";
import { LockOutlined, CheckCircleOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Title, Text } = Typography;

const Reset = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = (values) => {
    setLoading(true);
    console.log("Reset Password:", values);
    // Simulasi redirect setelah sukses
    setTimeout(() => {
      setLoading(false);
      navigate("/signin");
    }, 2000);
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
      <Card
        style={{ width: 400, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
        bordered={false}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Title level={3}>Reset Password</Title>
          <Text type="secondary">Silakan buat password baru Anda</Text>
        </div>

        <Form name="reset" onFinish={onFinish} layout="vertical" size="large">
          <Form.Item
            name="newPassword"
            rules={[
              { required: true, message: "Mohon masukkan password baru!" },
            ]}
            hasFeedback
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password Baru"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            dependencies={["newPassword"]}
            hasFeedback
            rules={[
              { required: true, message: "Mohon konfirmasi password!" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Password tidak sama!"));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Konfirmasi Password Baru"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              icon={<CheckCircleOutlined />}
            >
              Ubah Password
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Reset;
