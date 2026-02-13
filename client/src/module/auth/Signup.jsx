import { useState } from "react";
import { Form, Input, Button, Card, Typography } from "antd";
import {
  UserOutlined,
  MailOutlined,
  LockOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";

const { Title, Text } = Typography;

const Signup = () => {
  const [loading, setLoading] = useState(false);

  const onFinish = (values) => {
    setLoading(true);
    console.log("Register:", values);
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
      <title>Daftar</title>
      <Card style={{ width: 450, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Title level={2}>Daftar Akun</Title>
          <Text type="secondary">Bergabunglah untuk memulai pembelajaran</Text>
        </div>

        <Form
          name="register"
          onFinish={onFinish}
          layout="vertical"
          size="large"
          scrollToFirstError
        >
          <Form.Item
            name="fullname"
            rules={[
              { required: true, message: "Mohon masukkan nama lengkap!" },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="Nama Lengkap" />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[
              { type: "email", message: "Format email tidak valid!" },
              { required: true, message: "Mohon masukkan email!" },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="Email Address" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: "Mohon masukkan password!" }]}
            hasFeedback
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
          </Form.Item>

          <Form.Item
            name="confirm"
            dependencies={["password"]}
            hasFeedback
            rules={[
              { required: true, message: "Mohon konfirmasi password!" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error("Password yang anda masukkan tidak sama!"),
                  );
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Konfirmasi Password"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              icon={<UserAddOutlined />}
            >
              Daftar
            </Button>
          </Form.Item>

          <div style={{ textAlign: "center" }}>
            <Text>
              Sudah punya akun? <Link to="/">Masuk disini</Link>
            </Text>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default Signup;
