import React, { useEffect } from "react";
import { Alert, Col, Form, Input, Modal, Row, Select, Space, Switch, message } from "antd";
import {
  EditOutlined,
  HomeOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined,
  PlusOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  useAddAdminMutation,
  useUpdateAdminMutation,
} from "../../../service/center/ApiAdmin";
import { useGetHomebaseQuery } from "../../../service/center/ApiHomebase";
import { CardTitle } from "../../../components/ui/muse";
import { museColors } from "../../../config/theme";

const ModalAdmin = ({ open, onCancel, onSuccess, initialData }) => {
  const [form] = Form.useForm();

  const { data: homebaseData, isLoading: loadingHomebase } =
    useGetHomebaseQuery({
      page: 1,
      limit: 100,
    });

  const [addAdmin, { isLoading: isAdding }] = useAddAdminMutation();
  const [updateAdmin, { isLoading: isUpdating }] = useUpdateAdminMutation();

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
      const payload = {
        ...values,
        homebase_id: values.level === "satuan" ? values.homebase_id : null,
      };

      if (initialData) {
        await updateAdmin({ id: initialData.id, ...payload }).unwrap();
        message.success("Data admin diperbarui");
      } else {
        await addAdmin(payload).unwrap();
        message.success("Admin baru ditambahkan");
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
          title={initialData ? "Edit Admin" : "Tambah Admin Baru"}
          description="Atur level akses sesuai tanggung jawab admin."
        />
      }
      open={open}
      onCancel={onCancel}
      onOk={form.submit}
      confirmLoading={isAdding || isUpdating}
      destroyOnHidden
      centered
      width={760}
      okText={initialData ? "Simpan Perubahan" : "Simpan Admin"}
      cancelText='Batal'
    >
      <Space orientation='vertical' size={18} style={{ width: "100%" }}>
        <Form form={form} layout='vertical' onFinish={handleFinish}>
          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                name='full_name'
                label='Nama Lengkap'
                rules={[{ required: true, message: "Wajib diisi" }]}
              >
                <Input
                  placeholder='Nama Admin'
                  prefix={<UserOutlined style={{ color: museColors.muted }} />}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name='username'
                label='Username'
                rules={[{ required: true, message: "Wajib diisi" }]}
              >
                <Input
                  placeholder='Username Login'
                  disabled={!!initialData}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                name='level'
                label='Level Akses'
                initialValue='admin'
                rules={[{ required: true, message: "Pilih level akses" }]}
              >
                <Select
                  placeholder='Pilih Level'
                  style={{ width: "100%" }}
                  options={[
                    { value: "pusat", label: "Pusat" },
                    { value: "satuan", label: "Satuan (Sekolah)" },
                    { value: "tahfiz", label: "Tahfiz" },
                    { value: "keuangan", label: "Keuangan" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name='phone' label='No. Telepon'>
                <Input
                  placeholder='08xxx'
                  prefix={<PhoneOutlined style={{ color: museColors.muted }} />}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.level !== currentValues.level
            }
          >
            {({ getFieldValue }) =>
              getFieldValue("level") === "satuan" ? (
                <Form.Item
                  name='homebase_id'
                  label='Pilih Satuan Pendidikan (Homebase)'
                  rules={[
                    {
                      required: true,
                      message: "Admin Satuan wajib memilih Homebase",
                    },
                  ]}
                >
                  <Select
                    placeholder='Pilih Homebase'
                    loading={loadingHomebase}
                    allowClear
                    showSearch
                    optionFilterProp='label'
                    suffixIcon={<HomeOutlined style={{ color: museColors.muted }} />}
                    options={(homebaseData?.data || []).map((hb) => ({
                      value: hb.id,
                      label: hb.name,
                    }))}
                  />
                </Form.Item>
              ) : null
            }
          </Form.Item>

          <Form.Item name='email' label='Email'>
            <Input
              placeholder='email@sekolah.com'
              prefix={<MailOutlined style={{ color: museColors.muted }} />}
            />
          </Form.Item>

          <Form.Item
            name='password'
            label={initialData ? "Password Baru (Opsional)" : "Password"}
            rules={[
              {
                required: !initialData,
                message: "Password wajib diisi untuk admin baru",
              },
              { min: 6, message: "Minimal 6 karakter" },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: museColors.muted }} />}
              placeholder={
                initialData
                  ? "Isi jika ingin mengganti password"
                  : "Password akun"
              }
            />
          </Form.Item>

          {initialData ? (
            <Form.Item
              name='is_active'
              label='Status Akun'
              valuePropName='checked'
            >
              <Switch checkedChildren='Aktif' unCheckedChildren='Nonaktif' />
            </Form.Item>
          ) : null}

          <Alert
            type="info"
            showIcon
            title="Catatan akses"
            description="Pilih level akses sesuai tanggung jawab admin. Jika level adalah satuan, hubungkan akun dengan homebase yang tepat."
          />
        </Form>
      </Space>
    </Modal>
  );
};

export default ModalAdmin;
