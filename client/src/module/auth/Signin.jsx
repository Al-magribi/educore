import React, { useEffect, useState } from "react";
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  Segmented,
  Checkbox,
  Flex,
  message,
  ConfigProvider,
  Space, // 1. Import ConfigProvider
} from "antd";
import { UserOutlined, LockOutlined, LoginOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import { useDoSigninMutation } from "../../service/auth/ApiAuth";
import { useSelector } from "react-redux";

const { Title, Text } = Typography;

const Signin = () => {
  const { publicConfig } = useSelector((state) => state.app);

  const [role, setRole] = useState("Admin");

  const [doSignin, { data, error, isLoading, isSuccess }] =
    useDoSigninMutation();

  const onFinish = (values) => {
    // Menggabungkan role ke dalam values agar dikirim ke backend
    // Backend perlu tahu role apa yang sedang mencoba login
    const payload = { ...values, role: role.toLowerCase() }; // pastikan format role sesuai (lowercase)
    doSignin(payload);
  };

  useEffect(() => {
    if (isSuccess) {
      message.success(data?.message || "Login berhasil");
    }

    if (error) {
      message.error(error?.data?.message || "Terjadi kesalahan");
    }
  }, [data, error, isSuccess]);

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
      <Card style={{ width: 400, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
        <Flex align="center" gap={"middle"} style={{ marginBottom: 24 }}>
          <img src={publicConfig.app_logo} alt="Logo" width={70} height={70} />

          <Flex vertical gap={"small"}>
            <Title level={2} style={{ marginBottom: 0 }}>
              Masuk
            </Title>
            <Text type="secondary">
              Selamat datang kembali di platform kami
            </Text>
          </Flex>
        </Flex>

        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
          {/* Role Selection dengan Warna Custom */}
          <Form.Item style={{ marginBottom: 16 }}>
            <ConfigProvider
              theme={{
                components: {
                  Segmented: {
                    itemSelectedBg: "#1677ff", // Warna Background saat dipilih (Biru)
                    itemSelectedColor: "#ffffff", // Warna Teks saat dipilih (Putih)
                    trackBg: "#f5f5f5", // Warna track background (abu muda)
                    itemColor: "#595959", // Warna teks saat tidak dipilih
                    itemHoverColor: "#1677ff", // Warna teks saat di-hover
                  },
                },
              }}
            >
              <Segmented
                block
                options={["Admin", "Guru", "Siswa", "Wali"]}
                value={role}
                onChange={setRole}
              />
            </ConfigProvider>
          </Form.Item>

          <Form.Item
            name="username"
            rules={[{ required: true, message: "Mohon masukkan username!" }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Username" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: "Mohon masukkan Password!" }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
          </Form.Item>

          <Flex
            justify="space-between"
            align="center"
            style={{ marginBottom: 24 }}
          >
            <Form.Item name="remember" valuePropName="checked" noStyle>
              <Checkbox>Ingat Saya</Checkbox>
            </Form.Item>
            <Link to="/forgot-password" style={{ color: "#1677ff" }}>
              Lupa Password?
            </Link>
          </Flex>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              loading={isLoading}
              icon={<LoginOutlined />}
            >
              Masuk
            </Button>
          </Form.Item>

          <div style={{ textAlign: "center" }}>
            <Text>
              Belum punya akun? <Link to="/signup">Daftar sekarang</Link>
            </Text>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default Signin;
