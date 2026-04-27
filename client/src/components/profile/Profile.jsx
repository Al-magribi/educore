import React, { useEffect } from "react";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Grid,
  Input,
  Row,
  Space,
  Tabs,
  Tag,
  Typography,
  message,
  theme,
} from "antd";
import { motion } from "framer-motion";
import { useSelector } from "react-redux";
import {
  BadgeCheck,
  BookOpen,
  Building2,
  GraduationCap,
  IdCard,
  KeyRound,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  User,
  UserCog,
  Users,
} from "lucide-react";

import { useUpdateProfileMutation } from "../../service/auth/ApiAuth";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const MotionDiv = motion.div;

const containerVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: "easeOut",
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

const roleConfig = {
  student: {
    label: "Siswa",
    color: "#2563eb",
    light: "#eff6ff",
    gradient: "linear-gradient(135deg, #1d4ed8 0%, #38bdf8 100%)",
    icon: <GraduationCap size={18} />,
  },
  teacher: {
    label: "Guru",
    color: "#b45309",
    light: "#fff7ed",
    gradient: "linear-gradient(135deg, #b45309 0%, #f59e0b 100%)",
    icon: <BookOpen size={18} />,
  },
  admin: {
    label: "Admin",
    color: "#4338ca",
    light: "#eef2ff",
    gradient: "linear-gradient(135deg, #312e81 0%, #6366f1 100%)",
    icon: <ShieldCheck size={18} />,
  },
  center: {
    label: "Center",
    color: "#0f766e",
    light: "#ecfeff",
    gradient: "linear-gradient(135deg, #115e59 0%, #14b8a6 100%)",
    icon: <Building2 size={18} />,
  },
  parent: {
    label: "Orang Tua",
    color: "#166534",
    light: "#f0fdf4",
    gradient: "linear-gradient(135deg, #166534 0%, #4ade80 100%)",
    icon: <Users size={18} />,
  },
};

const getRoleConfig = (role) =>
  roleConfig[role] || {
    label: role || "Pengguna",
    color: "#475569",
    light: "#f8fafc",
    gradient: "linear-gradient(135deg, #334155 0%, #64748b 100%)",
    icon: <User size={18} />,
  };

const getUniqueTeacherSubjects = (subjects) => {
  if (!Array.isArray(subjects) || subjects.length === 0) {
    return [];
  }

  const seen = new Set();

  return subjects.filter((subject) => {
    const subjectId = subject?.subject_id ?? subject?.id;
    const subjectName = subject?.subject_name?.trim()?.toLowerCase();
    const key = subjectId != null ? `id:${subjectId}` : `name:${subjectName || ""}`;

    if (!subjectName && subjectId == null) {
      return false;
    }

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
};

const StatTile = ({ label, value, icon, tone }) => (
  <div
    style={{
      borderRadius: 22,
      padding: 18,
      background: "#ffffff",
      border: "1px solid rgba(148, 163, 184, 0.16)",
      boxShadow: "0 12px 28px rgba(15, 23, 42, 0.06)",
      height: "100%",
    }}
  >
    <Space direction="vertical" size={10} style={{ width: "100%" }}>
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 14,
          display: "grid",
          placeItems: "center",
          background: tone.light,
          color: tone.color,
        }}
      >
        {icon}
      </div>
      <Text type="secondary" style={{ fontSize: 13 }}>
        {label}
      </Text>
      <Text strong style={{ fontSize: 16, color: "#0f172a" }}>
        {value || "-"}
      </Text>
    </Space>
  </div>
);

const DetailItem = ({ label, value }) => (
  <div
    style={{
      padding: 18,
      borderRadius: 18,
      background: "#f8fafc",
      border: "1px solid rgba(148, 163, 184, 0.12)",
      height: "100%",
    }}
  >
    <Text
      type="secondary"
      style={{ display: "block", fontSize: 12, marginBottom: 8 }}
    >
      {label}
    </Text>
    <Text strong style={{ color: "#0f172a", lineHeight: 1.6 }}>
      {value || "-"}
    </Text>
  </div>
);

const EditProfileForm = ({ user, updateProfile, isLoading, isMobile, tone }) => {
  const [form] = Form.useForm();

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
    <div style={{ marginTop: 8 }}>
      <Alert
        showIcon
        type="info"
        message="Perubahan akun"
        description="Kosongkan kolom password bila Anda hanya ingin memperbarui data diri."
        style={{
          marginBottom: 24,
          borderRadius: 18,
          border: "1px solid rgba(59, 130, 246, 0.18)",
        }}
      />

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        autoComplete="off"
        size="large"
      >
        <Row gutter={[20, 0]}>
          <Col xs={24}>
            <Form.Item
              label="Nama Lengkap"
              name="full_name"
              rules={[{ required: true, message: "Nama lengkap wajib diisi" }]}
            >
              <Input
                prefix={<User size={16} color="#64748b" />}
                placeholder="Masukkan nama lengkap"
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="Email"
              name="email"
              rules={[{ type: "email", message: "Format email tidak valid" }]}
            >
              <Input
                prefix={<Mail size={16} color="#64748b" />}
                placeholder="email@contoh.com"
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item label="No. Telepon" name="phone">
              <Input
                prefix={<Phone size={16} color="#64748b" />}
                placeholder="08xxxxxxxxxx"
              />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: "8px 0 24px" }} />

        <Space direction="vertical" size={4} style={{ marginBottom: 20 }}>
          <Title level={5} style={{ margin: 0 }}>
            Keamanan Akun
          </Title>
          <Text type="secondary">
            Gunakan password baru yang kuat untuk menjaga akun tetap aman.
          </Text>
        </Space>

        <Row gutter={[20, 0]}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Password Lama"
              name="oldPassword"
              rules={[{ min: 6, message: "Minimal 6 karakter" }]}
            >
              <Input.Password
                prefix={<KeyRound size={16} color="#64748b" />}
                placeholder="Masukkan password lama"
              />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="Password Baru"
              name="newPassword"
              rules={[{ min: 6, message: "Minimal 6 karakter" }]}
            >
              <Input.Password
                prefix={<ShieldCheck size={16} color="#64748b" />}
                placeholder="Masukkan password baru"
              />
            </Form.Item>
          </Col>

          <Col xs={24}>
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
                    return Promise.reject(
                      new Error("Password baru tidak cocok!"),
                    );
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<BadgeCheck size={16} color="#64748b" />}
                placeholder="Ulangi password baru"
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
          <Button
            type="primary"
            htmlType="submit"
            icon={<Save size={16} />}
            loading={isLoading}
            block={isMobile}
            style={{
              height: 46,
              paddingInline: 20,
              borderRadius: 14,
              background: tone.gradient,
              border: "none",
              boxShadow: "0 12px 28px rgba(15, 23, 42, 0.14)",
            }}
          >
            Simpan Perubahan
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

const Profile = () => {
  const { token } = theme.useToken();
  const screens = useBreakpoint();
  const { user } = useSelector((state) => state.auth);
  const [updateProfile, { isLoading }] = useUpdateProfileMutation();

  const isMobile = !screens.md;
  const tone = getRoleConfig(user?.role);
  const teacherSubjects = getUniqueTeacherSubjects(user?.subjects);

  const accountDetails = [
    { label: "Nama Lengkap", value: user?.full_name },
    { label: "Username", value: user?.username ? `@${user.username}` : "-" },
    {
      label: "Role",
      value: (
        <Tag
          style={{
            margin: 0,
            border: "none",
            borderRadius: 999,
            padding: "6px 12px",
            background: tone.light,
            color: tone.color,
            fontWeight: 700,
          }}
        >
          {tone.label.toUpperCase()}
        </Tag>
      ),
    },
    {
      label: "Terakhir Login",
      value: user?.last_login
        ? new Date(user.last_login).toLocaleString("id-ID")
        : "-",
    },
  ];

  const renderSpecificDetails = () => {
    switch (user?.role) {
      case "student":
        return [
          { label: "NIS", value: user?.nis },
          { label: "NISN", value: user?.nisn || "-" },
          {
            label: "Kelas",
            value:
              user?.grade_name && user?.class_name
                ? `${user.grade_name} - ${user.class_name}`
                : user?.class_name || "-",
          },
          { label: "Jurusan", value: user?.major_name || "-" },
          { label: "Tahun Ajaran", value: user?.periode_name || "-" },
          { label: "Homebase", value: user?.homebase_name || "-" },
        ];
      case "teacher":
        return [
          { label: "NIP", value: user?.nip || "-" },
          {
            label: "Wali Kelas",
            value: user?.is_homeroom ? (
              <Tag color="success" style={{ margin: 0, borderRadius: 999 }}>
                Ya
              </Tag>
            ) : (
              <Tag style={{ margin: 0, borderRadius: 999 }}>Tidak</Tag>
            ),
          },
          { label: "Homebase", value: user?.homebase_name || "-" },
          {
            label: "Mata Pelajaran",
            value:
              teacherSubjects.length > 0
                ? teacherSubjects
                    .map((subject) => subject.subject_name)
                    .filter(Boolean)
                    .join(", ")
                : "Belum ada mapel",
          },
        ];
      case "parent":
        return [
          {
            label: "Wali Murid Dari",
            value:
              user?.student_name && user?.student_nis
                ? `${user.student_name} (${user.student_nis})`
                : user?.student_name || "-",
          },
          { label: "Kelas Siswa", value: user?.class_name || "-" },
          { label: "Homebase", value: user?.homebase_name || "-" },
        ];
      case "admin":
      case "center":
        return [
          {
            label: "Level Admin",
            value: (
              <Tag
                style={{
                  margin: 0,
                  border: "none",
                  borderRadius: 999,
                  padding: "6px 12px",
                  background: tone.light,
                  color: tone.color,
                  fontWeight: 700,
                }}
              >
                {(user?.level || "admin").toUpperCase()}
              </Tag>
            ),
          },
          {
            label: "Status",
            value: user?.is_active ? (
              <Tag color="success" style={{ margin: 0, borderRadius: 999 }}>
                Aktif
              </Tag>
            ) : (
              <Tag color="error" style={{ margin: 0, borderRadius: 999 }}>
                Nonaktif
              </Tag>
            ),
          },
        ];
      default:
        return [];
    }
  };

  const tabItems = [
    {
      key: "details",
      label: (
        <Space size={8}>
          <IdCard size={16} />
          Detail Informasi
        </Space>
      ),
      children: (
        <div style={{ marginTop: 8 }}>
          <Space direction="vertical" size={4} style={{ marginBottom: 20 }}>
            <Title level={5} style={{ margin: 0 }}>
              Informasi Akun
            </Title>
            <Text type="secondary">
              Ringkasan identitas akun dan data akademik yang terkait.
            </Text>
          </Space>

          <Row gutter={[16, 16]}>
            {accountDetails.map((item) => (
              <Col xs={24} md={12} key={item.label}>
                <DetailItem label={item.label} value={item.value} />
              </Col>
            ))}
            {renderSpecificDetails().map((item) => (
              <Col xs={24} md={12} key={item.label}>
                <DetailItem label={item.label} value={item.value} />
              </Col>
            ))}
          </Row>
        </div>
      ),
    },
    {
      key: "settings",
      label: (
        <Space size={8}>
          <UserCog size={16} />
          Pengaturan Akun
        </Space>
      ),
      children: (
        <EditProfileForm
          user={user}
          updateProfile={updateProfile}
          isLoading={isLoading}
          isMobile={isMobile}
          tone={tone}
        />
      ),
    },
  ];

  return (
    <MotionDiv variants={containerVariants} initial="hidden" animate="show">
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={9}>
          <MotionDiv variants={itemVariants}>
            <Card
              variant="borderless"
              style={{
                overflow: "hidden",
                borderRadius: 28,
                boxShadow: "0 24px 52px rgba(15, 23, 42, 0.12)",
              }}
              styles={{ body: { padding: 0 } }}
            >
              <div
                style={{
                  padding: isMobile ? 22 : 28,
                  background: tone.gradient,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: "auto -40px -55px auto",
                    width: 170,
                    height: 170,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.1)",
                    filter: "blur(4px)",
                  }}
                />
                <Space
                  direction={isMobile ? "vertical" : "horizontal"}
                  size={18}
                  align={isMobile ? "start" : "center"}
                  style={{ width: "100%", position: "relative" }}
                >
                  <Avatar
                    size={isMobile ? 88 : 104}
                    src={user?.img_url}
                    style={{
                      background: "rgba(255,255,255,0.18)",
                      color: "#ffffff",
                      border: "3px solid rgba(255,255,255,0.45)",
                      flexShrink: 0,
                    }}
                    icon={<User size={40} />}
                  />

                  <div style={{ flex: 1 }}>
                    <Tag
                      style={{
                        margin: "0 0 12px",
                        border: "none",
                        borderRadius: 999,
                        padding: "6px 12px",
                        background: "rgba(255,255,255,0.16)",
                        color: "#ffffff",
                        fontWeight: 700,
                      }}
                    >
                      {tone.label}
                    </Tag>
                    <Title
                      level={isMobile ? 4 : 3}
                      style={{ margin: 0, color: "#ffffff" }}
                    >
                      {user?.full_name || "Pengguna"}
                    </Title>
                    <Text
                      style={{
                        display: "block",
                        color: "rgba(255,255,255,0.82)",
                        marginTop: 6,
                      }}
                    >
                      {user?.username ? `@${user.username}` : "Username belum tersedia"}
                    </Text>
                  </div>
                </Space>
              </div>

              <div style={{ padding: isMobile ? 20 : 24, background: "#ffffff" }}>
                <Row gutter={[14, 14]} style={{ marginBottom: 20 }}>
                  <Col xs={24} sm={12}>
                    <StatTile
                      label="Peran Akun"
                      value={tone.label}
                      icon={tone.icon}
                      tone={tone}
                    />
                  </Col>
                  <Col xs={24} sm={12}>
                    <StatTile
                      label="Status"
                      value={user?.is_active === false ? "Nonaktif" : "Aktif"}
                      icon={<BadgeCheck size={18} />}
                      tone={{
                        color: user?.is_active === false ? "#b91c1c" : "#15803d",
                        light:
                          user?.is_active === false ? "#fef2f2" : "#f0fdf4",
                      }}
                    />
                  </Col>
                </Row>

                <Space direction="vertical" size={14} style={{ width: "100%" }}>
                  <div
                    style={{
                      padding: 16,
                      borderRadius: 18,
                      background: token.colorBgLayout,
                    }}
                  >
                    <Space size={12} align="start">
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 12,
                          display: "grid",
                          placeItems: "center",
                          background: tone.light,
                          color: tone.color,
                          flexShrink: 0,
                        }}
                      >
                        <Mail size={18} />
                      </div>
                      <div>
                        <Text type="secondary" style={{ display: "block" }}>
                          Email
                        </Text>
                        <Text strong style={{ color: "#0f172a" }}>
                          {user?.email || "-"}
                        </Text>
                      </div>
                    </Space>
                  </div>

                  <div
                    style={{
                      padding: 16,
                      borderRadius: 18,
                      background: token.colorBgLayout,
                    }}
                  >
                    <Space size={12} align="start">
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 12,
                          display: "grid",
                          placeItems: "center",
                          background: tone.light,
                          color: tone.color,
                          flexShrink: 0,
                        }}
                      >
                        <Phone size={18} />
                      </div>
                      <div>
                        <Text type="secondary" style={{ display: "block" }}>
                          No. Telepon
                        </Text>
                        <Text strong style={{ color: "#0f172a" }}>
                          {user?.phone || "-"}
                        </Text>
                      </div>
                    </Space>
                  </div>
                </Space>
              </div>
            </Card>
          </MotionDiv>
        </Col>

        <Col xs={24} lg={15}>
          <MotionDiv variants={itemVariants}>
            <Card
              variant="borderless"
              style={{
                borderRadius: 28,
                boxShadow: "0 24px 52px rgba(15, 23, 42, 0.1)",
              }}
              styles={{ body: { padding: isMobile ? 18 : 24 } }}
            >
              <Tabs
                defaultActiveKey="details"
                items={tabItems}
                size="large"
                tabBarStyle={{ marginBottom: 8 }}
              />
            </Card>
          </MotionDiv>
        </Col>
      </Row>
    </MotionDiv>
  );
};

export default Profile;
