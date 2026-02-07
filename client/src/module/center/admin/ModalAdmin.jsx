import React, { useEffect } from "react";
import { Modal, Form, Input, Select, Switch, message, Row, Col } from "antd";
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  LockOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import {
  useAddAdminMutation,
  useUpdateAdminMutation,
} from "../../../service/center/ApiAdmin";
// Pastikan path import benar
import { useGetHomebaseQuery } from "../../../service/center/ApiHomebase";

const { Option } = Select;

const ModalAdmin = ({ open, onCancel, onSuccess, initialData }) => {
  const [form] = Form.useForm();

  // Load Data Homebase (Ambil banyak sekaligus untuk dropdown)
  const { data: homebaseData, isLoading: loadingHomebase } =
    useGetHomebaseQuery({
      page: 1,
      limit: 100, // Ambil 100 data untuk dropdown
    });

  const [addAdmin, { isLoading: isAdding }] = useAddAdminMutation();
  const [updateAdmin, { isLoading: isUpdating }] = useUpdateAdminMutation();

  // Reset/Set Form Data
  useEffect(() => {
    if (open) {
      if (initialData) {
        form.setFieldsValue({
          ...initialData,
          password: "",
          // Pastikan homebase_id terisi jika ada di initialData
          homebase_id: initialData.homebase_id || undefined,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, initialData, form]);

  const handleFinish = async (values) => {
    try {
      // Bersihkan homebase_id jika level bukan satuan
      if (values.level !== "satuan") {
        values.homebase_id = null;
      }

      if (initialData) {
        await updateAdmin({ id: initialData.id, ...values }).unwrap();
        message.success("Data admin diperbarui");
      } else {
        await addAdmin(values).unwrap();
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
      title={initialData ? "Edit Admin" : "Tambah Admin Baru"}
      open={open}
      onCancel={onCancel}
      onOk={form.submit}
      confirmLoading={isAdding || isUpdating}
      destroyOnHidden
      width={600}
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="full_name"
              label="Nama Lengkap"
              rules={[{ required: true, message: "Wajib diisi" }]}
            >
              <Input placeholder="Nama Admin" prefix={<UserOutlined />} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="username"
              label="Username"
              rules={[{ required: true, message: "Wajib diisi" }]}
            >
              <Input placeholder="Username Login" disabled={!!initialData} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="level"
              label="Level Akses"
              initialValue="admin"
              rules={[{ required: true, message: "Pilih level akses" }]}
            >
              <Select placeholder="Pilih Level">
                <Option value="pusat">Pusat</Option>
                <Option value="satuan">Satuan (Sekolah)</Option>
                <Option value="tahfiz">Tahfiz</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="phone" label="No. Telepon">
              <Input placeholder="08xxx" prefix={<PhoneOutlined />} />
            </Form.Item>
          </Col>
        </Row>

        {/* LOGIKA KONDISIONAL: Muncul jika Level = Satuan */}
        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) =>
            prevValues.level !== currentValues.level
          }
        >
          {({ getFieldValue }) =>
            getFieldValue("level") === "satuan" ? (
              <Form.Item
                name="homebase_id"
                label="Pilih Satuan Pendidikan (Homebase)"
                rules={[
                  {
                    required: true,
                    message: "Admin Satuan wajib memilih Homebase!",
                  },
                ]}
              >
                <Select
                  placeholder="Pilih Homebase"
                  loading={loadingHomebase}
                  allowClear
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
            ) : null
          }
        </Form.Item>

        <Form.Item name="email" label="Email">
          <Input placeholder="email@sekolah.com" prefix={<MailOutlined />} />
        </Form.Item>

        <Form.Item
          name="password"
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
            prefix={<LockOutlined />}
            placeholder={
              initialData
                ? "Isi jika ingin mengganti password"
                : "Password akun"
            }
          />
        </Form.Item>

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

export default ModalAdmin;
