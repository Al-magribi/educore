import React, { useEffect } from "react";
import { Alert, Col, Form, Input, Modal, Row, Select, Space, Switch, message } from "antd";
import {
  EditOutlined,
  HomeOutlined,
  IdcardOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  PlusOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  useAddTeacherMutation,
  useUpdateTeacherMutation,
} from "../../../service/main/ApiTeacher";
import { useGetHomebaseQuery } from "../../../service/center/ApiHomebase";
import { CardTitle } from "../../../components/ui/muse";
import { museColors } from "../../../config/theme";

const ModalTeacher = ({ open, onCancel, onSuccess, initialData }) => {
  const [form] = Form.useForm();

  const { data: homebaseData, isLoading: loadingHomebase } =
    useGetHomebaseQuery({
      page: 1,
      limit: 100,
    });

  const [addTeacher, { isLoading: isAdding }] = useAddTeacherMutation();
  const [updateTeacher, { isLoading: isUpdating }] = useUpdateTeacherMutation();

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.setFieldsValue({
          ...initialData,
          password: "",
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
      title={
        <CardTitle
          icon={initialData ? <EditOutlined /> : <PlusOutlined />}
          title={initialData ? "Edit Guru" : "Tambah Guru"}
          description="Lengkapi akun, penempatan satuan, dan kontak guru."
        />
      }
      open={open}
      onCancel={onCancel}
      onOk={form.submit}
      confirmLoading={isAdding || isUpdating}
      destroyOnHidden
      width={760}
      okText={initialData ? "Simpan Perubahan" : "Simpan Guru"}
      cancelText="Batal"
    >
      <Space orientation="vertical" size={18} style={{ width: "100%" }}>
        <Form form={form} layout="vertical" onFinish={handleFinish}>
          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="full_name"
                label="Nama Lengkap (dengan gelar)"
                rules={[{ required: true, message: "Nama wajib diisi" }]}
              >
                <Input
                  placeholder="Contoh: Budi Santoso, S.Pd."
                  prefix={<UserOutlined style={{ color: museColors.muted }} />}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="username"
                label="Username Login"
                rules={[{ required: true, message: "Username wajib diisi" }]}
              >
                <Input
                  placeholder="Username unik"
                  disabled={!!initialData}
                />
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
              prefix={<LockOutlined style={{ color: museColors.muted }} />}
              placeholder={
                initialData
                  ? "Biarkan kosong jika tidak diubah"
                  : "Password akun"
              }
            />
          </Form.Item>

          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
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
                  optionFilterProp="label"
                  suffixIcon={<HomeOutlined style={{ color: museColors.muted }} />}
                  options={(homebaseData?.data || []).map((hb) => ({
                    value: hb.id,
                    label: hb.name,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="nip" label="NIP / NIY">
                <Input
                  placeholder="Nomor Induk"
                  prefix={<IdcardOutlined style={{ color: museColors.muted }} />}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item name="phone" label="No. Telepon / WhatsApp">
                <Input
                  placeholder="08xxx"
                  prefix={<PhoneOutlined style={{ color: museColors.muted }} />}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="email" label="Email">
                <Input
                  type="email"
                  placeholder="email@sekolah.sch.id"
                  prefix={<MailOutlined style={{ color: museColors.muted }} />}
                />
              </Form.Item>
            </Col>
          </Row>

          {initialData ? (
            <Form.Item
              name="is_active"
              label="Status Akun"
              valuePropName="checked"
            >
              <Switch checkedChildren="Aktif" unCheckedChildren="Nonaktif" />
            </Form.Item>
          ) : null}

          <Alert
            type="info"
            showIcon
            title="Catatan data guru"
            description="Pastikan penempatan homebase, identitas, dan kontak guru terisi dengan benar agar proses akademik dan administrasi tetap sinkron."
          />
        </Form>
      </Space>
    </Modal>
  );
};

export default ModalTeacher;
