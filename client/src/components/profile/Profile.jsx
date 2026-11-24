import { useEffect, useMemo } from "react";
import {
  Alert,
  App,
  Avatar,
  Button,
  Col,
  Descriptions,
  Divider,
  Empty,
  Flex,
  Form,
  Grid,
  Input,
  Row,
  Tag,
  Typography,
} from "antd";
import { useSelector } from "react-redux";
import {
  BadgeCheck,
  BookOpen,
  Building2,
  GraduationCap,
  IdCard,
  KeyRound,
  LayoutGrid,
  Mail,
  Phone,
  Save,
  ShieldCheck,
  User,
  UserCog,
  Users,
} from "lucide-react";

import { useUpdateProfileMutation } from "../../service/auth/ApiAuth";
import { CardTitle, IconBox, MuseCard, PageTabs } from "../ui/muse";
import { museColors } from "../../config/theme";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const ROLE_META = {
  student: { label: "Siswa", icon: GraduationCap, tone: "primary" },
  teacher: { label: "Guru", icon: BookOpen, tone: "accent" },
  parent: { label: "Orang Tua", icon: Users, tone: "success" },
  staff: { label: "Tendik", icon: UserCog, tone: "navy" },
  admin: { label: "Admin", icon: ShieldCheck, tone: "navy" },
};

const ADMIN_LEVEL_LABEL = {
  pusat: "Admin Pusat",
  satuan: "Admin Satuan",
  tahfiz: "Admin Tahfiz",
};

// Server hanya menyimpan email & telepon untuk role ini (lihat /update-profile).
const CONTACT_EDITABLE_ROLES = ["teacher", "admin", "parent"];

const getRoleMeta = (user) => {
  const meta = ROLE_META[user?.role] || { label: user?.role || "Pengguna", icon: User, tone: "primary" };
  if (user?.role === "admin" && ADMIN_LEVEL_LABEL[user?.level]) {
    return { ...meta, label: ADMIN_LEVEL_LABEL[user.level] };
  }
  return meta;
};

const getInitial = (name) => name?.trim()?.[0]?.toUpperCase() || "U";

/** Gabungkan baris mapel-kelas guru menjadi satu entri per mapel. */
const groupTeacherSubjects = (subjects) => {
  if (!Array.isArray(subjects)) return [];
  const map = new Map();
  subjects.forEach((item) => {
    const name = item?.subject_name?.trim();
    if (!name && item?.subject_id == null) return;
    const key = item?.subject_id ?? name.toLowerCase();
    const entry = map.get(key) || { key, name: name || "Tanpa nama", classes: [] };
    if (item?.class_name && !entry.classes.includes(item.class_name)) {
      entry.classes.push(item.class_name);
    }
    map.set(key, entry);
  });
  return [...map.values()];
};

const descriptionStyles = {
  label: { color: museColors.muted, fontSize: 12, fontWeight: 600, paddingBottom: 2 },
  content: { color: museColors.text, fontWeight: 600, wordBreak: "break-word" },
};

const InfoDescriptions = ({ items }) => (
  <Descriptions
    layout='vertical'
    colon={false}
    column={{ xs: 1, sm: 2 }}
    items={items.map((item) => ({ ...item, children: item.children ?? "-" }))}
    styles={descriptionStyles}
  />
);

const ContactRow = ({ icon, label, value }) => (
  <Flex align='center' gap={12} style={{ minWidth: 0 }}>
    <IconBox icon={icon} tone='primarySoft' size={32} />
    <div style={{ minWidth: 0, flex: 1 }}>
      <Text type='secondary' style={{ display: "block", fontSize: 12 }}>
        {label}
      </Text>
      <Text strong style={{ display: "block", wordBreak: "break-word" }}>
        {value || "-"}
      </Text>
    </div>
  </Flex>
);

const ProfileSummaryCard = ({ user, roleMeta }) => {
  const RoleIcon = roleMeta.icon;
  const isInactive = user?.is_active === false;

  return (
    <MuseCard style={{ height: "100%" }}>
      <Flex vertical align='center' gap={8} style={{ textAlign: "center", paddingTop: 8 }}>
        <Avatar
          size={88}
          src={user?.img_url || undefined}
          style={{ background: museColors.primary, fontSize: 32, fontWeight: 700 }}
        >
          {getInitial(user?.full_name)}
        </Avatar>
        <div style={{ minWidth: 0, maxWidth: "100%", marginTop: 8 }}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: museColors.text,
              lineHeight: 1.3,
              wordBreak: "break-word",
            }}
          >
            {user?.full_name || "Pengguna"}
          </div>
          <Text type='secondary'>{user?.username ? `@${user.username}` : "Username belum tersedia"}</Text>
        </div>
        <Flex gap={8} wrap justify='center'>
          <Tag color='geekblue' icon={<RoleIcon size={12} style={{ marginRight: 4 }} />} style={{ margin: 0 }}>
            {roleMeta.label}
          </Tag>
          <Tag color={isInactive ? "error" : "success"} style={{ margin: 0 }}>
            {isInactive ? "Nonaktif" : "Aktif"}
          </Tag>
        </Flex>
      </Flex>

      <Divider style={{ margin: "20px 0 16px" }} />

      <Flex vertical gap={16}>
        <ContactRow icon={<Mail size={16} />} label='Email' value={user?.email} />
        <ContactRow icon={<Phone size={16} />} label='No. Telepon' value={user?.phone} />
        <ContactRow icon={<Building2 size={16} />} label='Satuan' value={user?.homebase_name} />
      </Flex>
    </MuseCard>
  );
};

const getRoleDetails = (user) => {
  switch (user?.role) {
    case "student":
      return {
        title: "Data Akademik",
        description: "Kelas dan periode yang sedang Anda ikuti.",
        icon: <GraduationCap size={16} />,
        items: [
          { key: "nis", label: "NIS", children: user?.nis },
          { key: "nisn", label: "NISN", children: user?.nisn },
          {
            key: "class",
            label: "Kelas",
            children:
              user?.grade_name && user?.class_name
                ? `${user.grade_name} · ${user.class_name}`
                : user?.class_name,
          },
          { key: "major", label: "Jurusan", children: user?.major_name },
          {
            key: "periode",
            label: "Tahun Ajaran",
            children: user?.periode_name ? (
              <Flex gap={8} wrap align='center'>
                {user.periode_name}
                {user?.periode_active ? (
                  <Tag color='success' style={{ margin: 0 }}>
                    Aktif
                  </Tag>
                ) : null}
              </Flex>
            ) : null,
          },
        ],
      };
    case "teacher":
      return {
        title: "Data Kepegawaian",
        description: "Identitas guru di satuan pendidikan.",
        icon: <IdCard size={16} />,
        items: [
          { key: "nip", label: "NIP", children: user?.nip },
          {
            key: "homeroom",
            label: "Wali Kelas",
            children: user?.is_homeroom ? (
              <Tag color='success' style={{ margin: 0 }}>
                Ya
              </Tag>
            ) : (
              <Tag style={{ margin: 0 }}>Tidak</Tag>
            ),
          },
        ],
      };
    case "parent":
      return {
        title: "Data Anak",
        description: "Siswa yang terhubung dengan akun Anda.",
        icon: <Users size={16} />,
        items: [
          { key: "student", label: "Nama Siswa", children: user?.student_name },
          { key: "nis", label: "NIS", children: user?.student_nis },
          { key: "class", label: "Kelas", children: user?.class_name },
          { key: "homebase", label: "Satuan", children: user?.homebase_name },
        ],
      };
    case "staff":
      return {
        title: "Data Kepegawaian",
        description: "Identitas tenaga kependidikan di satuan pendidikan.",
        icon: <UserCog size={16} />,
        items: [
          { key: "nip", label: "NIP", children: user?.nip },
          { key: "homebase", label: "Satuan", children: user?.homebase_name },
        ],
      };
    case "admin":
      return {
        title: "Hak Akses",
        description: "Cakupan pengelolaan akun admin ini.",
        icon: <ShieldCheck size={16} />,
        items: [
          { key: "level", label: "Level Admin", children: ADMIN_LEVEL_LABEL[user?.level] || user?.level },
          { key: "unit", label: "Jenjang Satuan", children: user?.unit_level },
        ],
      };
    default:
      return null;
  }
};

const TeacherSubjectsCard = ({ subjects }) => (
  <MuseCard
    flush
    title={
      <CardTitle
        icon={<BookOpen size={16} />}
        title='Mapel yang Diampu'
        description={`${subjects.length} mata pelajaran`}
      />
    }
  >
    {subjects.length ? (
      subjects.map((subject, index) => (
        <Flex
          key={subject.key}
          gap={12}
          align='flex-start'
          wrap
          style={{
            padding: "14px 24px",
            borderTop: index === 0 ? 0 : `1px solid ${museColors.divider}`,
          }}
        >
          <Text strong style={{ flex: "1 1 160px", minWidth: 0 }}>
            {subject.name}
          </Text>
          <Flex gap={6} wrap style={{ flex: "2 1 200px" }}>
            {subject.classes.length ? (
              subject.classes.map((name) => (
                <Tag key={name} style={{ margin: 0 }}>
                  {name}
                </Tag>
              ))
            ) : (
              <Text type='secondary'>Belum ada kelas</Text>
            )}
          </Flex>
        </Flex>
      ))
    ) : (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description='Belum ada mapel. Hubungi admin satuan untuk pembagian mengajar.'
        style={{ padding: "16px 24px 24px" }}
      />
    )}
  </MuseCard>
);

const OverviewSection = ({ user, roleMeta }) => {
  const roleDetails = getRoleDetails(user);
  const teacherSubjects = useMemo(() => groupTeacherSubjects(user?.subjects), [user?.subjects]);

  const accountItems = [
    { key: "name", label: "Nama Lengkap", children: user?.full_name },
    { key: "username", label: "Username", children: user?.username ? `@${user.username}` : null },
    { key: "role", label: "Peran", children: roleMeta.label },
    {
      key: "gender",
      label: "Jenis Kelamin",
      children: user?.gender === "L" ? "Laki-laki" : user?.gender === "P" ? "Perempuan" : user?.gender,
    },
  ];

  return (
    <Row gutter={[24, 24]}>
      <Col xs={24} lg={8}>
        <ProfileSummaryCard user={user} roleMeta={roleMeta} />
      </Col>
      <Col xs={24} lg={16}>
        <Flex vertical gap={24}>
          <MuseCard
            title={
              <CardTitle
                icon={<User size={16} />}
                title='Informasi Akun'
                description='Identitas yang dipakai untuk masuk ke aplikasi.'
              />
            }
          >
            <InfoDescriptions items={accountItems} />
          </MuseCard>

          {roleDetails ? (
            <MuseCard
              title={
                <CardTitle icon={roleDetails.icon} title={roleDetails.title} description={roleDetails.description} />
              }
            >
              <InfoDescriptions items={roleDetails.items} />
            </MuseCard>
          ) : null}

          {user?.role === "teacher" ? <TeacherSubjectsCard subjects={teacherSubjects} /> : null}
        </Flex>
      </Col>
    </Row>
  );
};

const FormActions = ({ loading, label, icon, isMobile }) => (
  <Flex justify='flex-end' style={{ marginTop: 8 }}>
    <Button type='primary' htmlType='submit' icon={icon} loading={loading} block={isMobile}>
      {label}
    </Button>
  </Flex>
);

const PersonalDataSection = ({ user, isMobile }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [updateProfile, { isLoading }] = useUpdateProfileMutation();
  const canEditContact = CONTACT_EDITABLE_ROLES.includes(user?.role);

  useEffect(() => {
    form.setFieldsValue({ full_name: user?.full_name, email: user?.email, phone: user?.phone });
  }, [user?.full_name, user?.email, user?.phone, form]);

  const onFinish = async (values) => {
    const payload = { full_name: values.full_name?.trim() };
    if (canEditContact) {
      payload.email = values.email?.trim() || undefined;
      payload.phone = values.phone?.trim() || undefined;
    }
    try {
      await updateProfile(payload).unwrap();
      message.success("Data diri berhasil disimpan");
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan data diri");
    }
  };

  return (
    <Row gutter={[24, 24]}>
      <Col xs={24} xl={16}>
        <MuseCard
          title={
            <CardTitle
              icon={<UserCog size={16} />}
              title='Data Diri'
              description='Perbarui nama dan kontak yang bisa dihubungi sekolah.'
            />
          }
        >
          <Form form={form} layout='vertical' onFinish={onFinish} autoComplete='off' requiredMark={false}>
            <Form.Item
              label='Nama Lengkap'
              name='full_name'
              rules={[
                { required: true, whitespace: true, message: "Nama lengkap wajib diisi" },
                { max: 120, message: "Nama maksimal 120 karakter" },
              ]}
            >
              <Input prefix={<User size={16} color={museColors.muted} />} placeholder='Masukkan nama lengkap' />
            </Form.Item>

            {canEditContact ? (
              <Row gutter={[16, 0]}>
                <Col xs={24} md={12}>
                  <Form.Item
                    label='Email'
                    name='email'
                    rules={[{ type: "email", message: "Format email tidak valid" }]}
                  >
                    <Input
                      prefix={<Mail size={16} color={museColors.muted} />}
                      placeholder='email@contoh.com'
                      inputMode='email'
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    label='No. Telepon'
                    name='phone'
                    rules={[{ pattern: /^[0-9+\-\s]{8,16}$/, message: "Nomor telepon tidak valid" }]}
                  >
                    <Input
                      prefix={<Phone size={16} color={museColors.muted} />}
                      placeholder='08xxxxxxxxxx'
                      inputMode='tel'
                    />
                  </Form.Item>
                </Col>
              </Row>
            ) : (
              <Alert
                type='info'
                showIcon
                title='Email dan nomor telepon dikelola admin sekolah'
                description='Hubungi admin satuan bila data kontak Anda perlu diubah.'
                style={{ marginBottom: 16 }}
              />
            )}

            <FormActions loading={isLoading} label='Simpan Data Diri' icon={<Save size={16} />} isMobile={isMobile} />
          </Form>
        </MuseCard>
      </Col>
    </Row>
  );
};

const SecuritySection = ({ isMobile }) => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [updateProfile, { isLoading }] = useUpdateProfileMutation();

  const onFinish = async ({ oldPassword, newPassword }) => {
    try {
      await updateProfile({ oldPassword, newPassword }).unwrap();
      message.success("Password berhasil diperbarui");
      form.resetFields();
    } catch (error) {
      message.error(error?.data?.message || "Gagal memperbarui password");
    }
  };

  return (
    <Row gutter={[24, 24]}>
      <Col xs={24} xl={16}>
        <MuseCard
          title={
            <CardTitle
              icon={<KeyRound size={16} />}
              title='Ganti Password'
              description='Masukkan password lama untuk mengonfirmasi perubahan.'
            />
          }
        >
          <Form form={form} layout='vertical' onFinish={onFinish} autoComplete='off' requiredMark={false}>
            <Form.Item
              label='Password Lama'
              name='oldPassword'
              rules={[{ required: true, message: "Password lama wajib diisi" }]}
            >
              <Input.Password
                prefix={<KeyRound size={16} color={museColors.muted} />}
                placeholder='Masukkan password lama'
                autoComplete='current-password'
              />
            </Form.Item>
            <Row gutter={[16, 0]}>
              <Col xs={24} md={12}>
                <Form.Item
                  label='Password Baru'
                  name='newPassword'
                  dependencies={["oldPassword"]}
                  rules={[
                    { required: true, message: "Password baru wajib diisi" },
                    { min: 6, message: "Minimal 6 karakter" },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || value !== getFieldValue("oldPassword")) return Promise.resolve();
                        return Promise.reject(new Error("Password baru harus berbeda dari password lama"));
                      },
                    }),
                  ]}
                >
                  <Input.Password
                    prefix={<ShieldCheck size={16} color={museColors.muted} />}
                    placeholder='Minimal 6 karakter'
                    autoComplete='new-password'
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label='Konfirmasi Password Baru'
                  name='confirmPassword'
                  dependencies={["newPassword"]}
                  rules={[
                    { required: true, message: "Ulangi password baru" },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue("newPassword") === value) return Promise.resolve();
                        return Promise.reject(new Error("Konfirmasi password tidak cocok"));
                      },
                    }),
                  ]}
                >
                  <Input.Password
                    prefix={<BadgeCheck size={16} color={museColors.muted} />}
                    placeholder='Ulangi password baru'
                    autoComplete='new-password'
                  />
                </Form.Item>
              </Col>
            </Row>
            <FormActions
              loading={isLoading}
              label='Perbarui Password'
              icon={<ShieldCheck size={16} />}
              isMobile={isMobile}
            />
          </Form>
        </MuseCard>
      </Col>
      <Col xs={24} xl={8}>
        <Alert
          type='info'
          showIcon
          title='Tips password aman'
          description={
            <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
              <li>Gabungkan huruf, angka, dan simbol.</li>
              <li>Jangan pakai tanggal lahir atau NIS/NIP.</li>
              <li>Jangan bagikan password ke siapa pun.</li>
            </ul>
          }
        />
      </Col>
    </Row>
  );
};

const Profile = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { user } = useSelector((state) => state.auth);
  const roleMeta = getRoleMeta(user);

  const items = [
    {
      key: "ringkasan",
      label: "Ringkasan",
      icon: <LayoutGrid />,
      render: () => <OverviewSection user={user} roleMeta={roleMeta} />,
    },
    {
      key: "data-diri",
      label: "Data Diri",
      icon: <UserCog />,
      render: () => <PersonalDataSection user={user} isMobile={isMobile} />,
    },
    {
      key: "keamanan",
      label: "Keamanan",
      icon: <KeyRound />,
      render: () => <SecuritySection isMobile={isMobile} />,
    },
  ];

  return (
    <PageTabs
      title='Profil Saya'
      description='Lihat informasi akun, perbarui data diri, dan ganti password.'
      items={items}
    />
  );
};

export default Profile;
