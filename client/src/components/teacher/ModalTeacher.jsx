import React, { useEffect } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  Switch,
  message,
  Row,
  Col,
  Divider,
} from "antd";
import {
  UserOutlined,
  IdcardOutlined,
  PhoneOutlined,
  MailOutlined,
  LockOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import {
  useAddTeacherMutation,
  useUpdateTeacherMutation,
} from "../../service/main/ApiTeacher";
import { useGetHomebaseQuery } from "../../service/center/ApiHomebase";

const { Option } = Select;

const ModalTeacher = ({ open, onCancel, onSuccess, initialData }) => {
  const [form] = Form.useForm();

  // API Hooks
  const { data: homebaseData, isLoading: loadingHomebase } =
    useGetHomebaseQuery({
      page: 1,
      limit: 100, // Ambil list homebase untuk dropdown
    });

  const [addTeacher, { isLoading: isAdding }] = useAddTeacherMutation();
  const [updateTeacher, { isLoading: isUpdating }] = useUpdateTeacherMutation();

  // Load Data to Form
  useEffect(() => {
    if (open) {
      if (initialData) {
        form.setFieldsValue({
          ...initialData,
          password: "", // Kosongkan password saat edit
          homebase_id: initialData.homebase_id || undefined,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, initialData, form]);

  const handleFinish = async (values) => {
    try {
      if (initialData) {
        await updateTeacher({ id: initialData.id, ...values }).unwrap();
        message.success("Data guru diperbarui");
      } else {
        await addTeacher(values).unwrap();
        message.success("Guru berhasil ditambahkan");
      }
      form.resetFields();
      onSuccess();
    } catch (error) {
      message.error(error?.data?.message || "Terjadi kesalahan");
    }
  };

  return (
    <Modal
      title={initialData ? "Edit Data Guru" : "Tambah Guru Baru"}
      open={open}
      onCancel={onCancel}
      onOk={form.submit}
      confirmLoading={isAdding || isUpdating}
      destroyOnHidden
      width={700}
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        {/* Section: Akun Login */}
        <Divider orientation="left" style={{ margin: "0 0 16px 0" }}>
          Informasi Akun
        </Divider>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="full_name"
              label="Nama Lengkap (dengan gelar)"
              rules={[{ required: true, message: "Nama wajib diisi" }]}
            >
              <Input
                placeholder="Contoh: Budi Santoso, S.Pd."
                prefix={<UserOutlined />}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="username"
              label="Username Login"
              rules={[{ required: true, message: "Username wajib diisi" }]}
            >
              <Input placeholder="Username unik" disabled={!!initialData} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="password"
          label={initialData ? "Password Baru (Opsional)" : "Password"}
          rules={[
            { required: !initialData, message: "Password wajib diisi" },
            { min: 6, message: "Minimal 6 karakter" },
          ]}
        >
          <Input.Password
            prefix={<LockOutlined />}
            placeholder={
              initialData ? "Biarkan kosong jika tidak diubah" : "Password akun"
            }
          />
        </Form.Item>

        {/* Section: Biodata & Penempatan */}
        <Divider orientation="left" style={{ margin: "10px 0 16px 0" }}>
          Data Kepegawaian
        </Divider>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="homebase_id"
              label="Penempatan (Homebase)"
              rules={[
                { required: true, message: "Guru wajib memiliki Homebase" },
              ]}
            >
              <Select
                placeholder="Pilih Satuan Pendidikan"
                loading={loadingHomebase}
                showSearch
                optionFilterProp="children"
              >
                {homebaseData?.data?.map((hb) => (
                  <Option key={hb.id} value={hb.id}>
                    {hb.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="nip" label="NIP / NIY">
              <Input placeholder="Nomor Induk" prefix={<IdcardOutlined />} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="phone" label="No. Telepon / WhatsApp">
              <Input placeholder="08xxx" prefix={<PhoneOutlined />} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="email" label="Email">
              <Input
                type="email"
                placeholder="email@sekolah.sch.id"
                prefix={<MailOutlined />}
              />
            </Form.Item>
          </Col>
        </Row>

        {initialData && (
          <Form.Item
            name="is_active"
            label="Status Akun"
            valuePropName="checked"
          >
            <Switch checkedChildren="Aktif" unCheckedChildren="Nonaktif" />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default ModalTeacher;
