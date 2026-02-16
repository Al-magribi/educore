import React, { useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Avatar,
  Typography,
  Tabs,
  Descriptions,
  Tag,
  Button,
  Form,
  Input,
  message,
  Divider,
  Alert,
} from "antd";
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  SafetyCertificateOutlined,
  IdcardOutlined,
  LockOutlined,
  SaveOutlined,
} from "@ant-design/icons";
import { useSelector } from "react-redux";
import { useUpdateProfileMutation } from "../../service/auth/ApiAuth";

const { Title, Text } = Typography;

// --- SUB-COMPONENT: EDIT FORM ---
// Dipisah agar useForm hanya berjalan saat Tab ini aktif/dirender
const EditProfileForm = ({ user, updateProfile, isLoading }) => {
  const [form] = Form.useForm();

  // Efek ini hanya jalan saat komponen form ini MOUNTED (Tab dibuka)
  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
      });
    }
  }, [user, form]);

  const onFinish = async (values) => {
    try {
      await updateProfile(values).unwrap();
      message.success("Profil berhasil diperbarui!");
      form.resetFields(["oldPassword", "newPassword", "confirmPassword"]);
    } catch (error) {
      message.error(error?.data?.message || "Gagal memperbarui profil.");
    }
  };

  return (
    <div style={{ maxWidth: 600, marginTop: 16 }}>
      <Alert
        title="Perhatian"
        description="Kosongkan kolom password jika Anda hanya ingin mengubah data diri."
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        autoComplete="off"
      >
        <Title level={5}>Data Diri</Title>
        <Form.Item
          label="Nama Lengkap"
          name="full_name"
          rules={[{ required: true, message: "Nama lengkap wajib diisi" }]}
        >
          <Input prefix={<UserOutlined />} placeholder="Nama Lengkap" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Email"
              name="email"
              rules={[{ type: "email", message: "Format email tidak valid" }]}
            >
              <Input prefix={<MailOutlined />} placeholder="email@contoh.com" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="No. Telepon" name="phone">
              <Input prefix={<PhoneOutlined />} placeholder="0812..." />
            </Form.Item>
          </Col>
        </Row>

        <Divider />

        <Title level={5}>Ganti Password</Title>
        <Form.Item
          label="Password Lama"
          name="oldPassword"
          rules={[{ min: 6, message: "Minimal 6 karakter" }]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Masukkan password lama"
          />
        </Form.Item>

        <Form.Item
          label="Password Baru"
          name="newPassword"
          rules={[{ min: 6, message: "Minimal 6 karakter" }]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Masukkan password baru"
          />
        </Form.Item>

        <Form.Item
          label="Konfirmasi Password Baru"
          name="confirmPassword"
          dependencies={["newPassword"]}
          rules={[
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue("newPassword") === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error("Password baru tidak cocok!"));
              },
            }),
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Ulangi password baru"
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={isLoading}
          >
            Simpan Perubahan
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

// --- COMPONENT UTAMA: PROFILE ---
const Profile = () => {
  const { user } = useSelector((state) => state.auth);
  const [updateProfile, { isLoading }] = useUpdateProfileMutation();

  // Helper untuk menampilkan info spesifik role
  const renderSpecificInfo = () => {
    switch (user?.role) {
      case "student":
        return (
          <>
            <Descriptions.Item label="NIS">{user.nis}</Descriptions.Item>
            <Descriptions.Item label="NISN">
              {user.nisn || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Kelas">
              {user.grade_name} - {user.class_name}
            </Descriptions.Item>
            <Descriptions.Item label="Jurusan">
              {user.major_name || "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Tahun Ajaran">
              {user.periode_name}
            </Descriptions.Item>
            <Descriptions.Item label="Homebase">
              {user.homebase_name}
            </Descriptions.Item>
          </>
        );
      case "teacher":
        return (
          <>
            <Descriptions.Item label="NIP">{user.nip || "-"}</Descriptions.Item>
            <Descriptions.Item label="Wali Kelas">
              {user.is_homeroom ? (
                <Tag color="green">Ya</Tag>
              ) : (
                <Tag color="default">Tidak</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="Homebase">
              {user.homebase_name}
            </Descriptions.Item>
            <Descriptions.Item label="Mata Pelajaran">
              {Array.isArray(user.subjects) && user.subjects.length > 0
                ? user.subjects.map((s) => s.subject_name).join(", ")
                : "Belum ada mapel"}
            </Descriptions.Item>
          </>
        );
      case "parent":
        return (
          <>
            <Descriptions.Item label="Wali Murid Dari">
              <b>{user.student_name}</b> ({user.student_nis})
            </Descriptions.Item>
            <Descriptions.Item label="Kelas Siswa">
              {user.class_name}
            </Descriptions.Item>
            <Descriptions.Item label="Homebase">
              {user.homebase_name}
            </Descriptions.Item>
          </>
        );
      case "admin":
      case "center":
        return (
          <>
            <Descriptions.Item label="Level Admin">
              <Tag color="purple">
                {user.level ? user.level.toUpperCase() : "ADMIN"}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              {user.is_active ? (
                <Tag color="success">Aktif</Tag>
              ) : (
                <Tag color="error">Nonaktif</Tag>
              )}
            </Descriptions.Item>
          </>
        );
      default:
        return null;
    }
  };

  const getHeaderColor = () => {
    if (user?.role === "student") return "#1890ff";
    if (user?.role === "teacher") return "#faad14";
    if (user?.role === "admin" || user?.role === "center") return "#722ed1";
    return "#52c41a";
  };

  // Definisi Item Tabs
  const tabItems = [
    {
      key: "1",
      label: (
        <span>
          <IdcardOutlined /> Detail Informasi
        </span>
      ),
      children: (
        <div style={{ marginTop: 16 }}>
          <Title level={5} style={{ marginBottom: 24 }}>
            Informasi Akun
          </Title>
          <Descriptions bordered column={{ xs: 1, sm: 1, md: 2 }} size="middle">
            <Descriptions.Item label="Nama Lengkap">
              {user?.full_name}
            </Descriptions.Item>
            <Descriptions.Item label="Username">
              {user?.username}
            </Descriptions.Item>
            <Descriptions.Item label="Role">
              {user?.role?.toUpperCase()}
            </Descriptions.Item>
            {renderSpecificInfo()}
            <Descriptions.Item label="Terakhir Login">
              {user?.last_login
                ? new Date(user.last_login).toLocaleString("id-ID")
                : "-"}
            </Descriptions.Item>
          </Descriptions>
        </div>
      ),
    },
    {
      key: "2",
      label: (
        <span>
          <SafetyCertificateOutlined /> Pengaturan Akun
        </span>
      ),
      // Komponen form hanya dirender di sini, mengatasi masalah "not connected"
      children: (
        <EditProfileForm
          user={user}
          updateProfile={updateProfile}
          isLoading={isLoading}
        />
      ),
    },
  ];

  return (
    <>
      <Row gutter={[24, 24]}>
        <Col xs={24} md={8} lg={7}>
          <Card
            hoverable
            style={{ textAlign: "center", overflow: "hidden" }}
            cover={
              <div
                style={{
                  height: 100,
                  backgroundColor: getHeaderColor(),
                  position: "relative",
                }}
              />
            }
          >
            <Avatar
              size={100}
              src={user?.img_url}
              icon={<UserOutlined />}
              style={{
                backgroundColor: "#fff",
                color: getHeaderColor(),
                border: "4px solid white",
                marginTop: -60,
                fontSize: "40px",
              }}
            />
            <Title level={4} style={{ marginTop: 16, marginBottom: 4 }}>
              {user?.full_name}
            </Title>
            <Text
              type="secondary"
              style={{ display: "block", marginBottom: 12 }}
            >
              @{user?.username}
            </Text>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <Tag color="blue">{user?.role?.toUpperCase()}</Tag>
              {user?.level && (
                <Tag color="purple">{user?.level?.toUpperCase()}</Tag>
              )}
              {user?.gender && <Tag color="default">{user?.gender}</Tag>}
            </div>

            <Divider />

            <div style={{ textAlign: "left" }}>
              <p>
                <MailOutlined style={{ marginRight: 8 }} /> {user?.email || "-"}
              </p>
              <p>
                <PhoneOutlined style={{ marginRight: 8 }} />{" "}
                {user?.phone || "-"}
              </p>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={16} lg={17}>
          <Card className="card-profile-tabs">
            <Tabs defaultActiveKey="1" items={tabItems} />
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default Profile;

