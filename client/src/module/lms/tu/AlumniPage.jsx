import { useState } from "react";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Table,
  message,
} from "antd";
import {
  useDeleteAlumniMutation,
  useGetAlumniQuery,
  useSaveAlumniMutation,
} from "../../../service/lms/ApiTu";
import { StudentPicker, TuPage, notifyError } from "./tuUi";

const AlumniPage = () => {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const { data, isFetching } = useGetAlumniQuery({ search });
  const [saveAlumni, { isLoading }] = useSaveAlumniMutation();
  const [deleteAlumni] = useDeleteAlumniMutation();

  const submit = async () => {
    try {
      const values = await form.validateFields();
      const response = await saveAlumni({ id: editing?.id, ...values }).unwrap();
      message.success(response?.message || "Alumni disimpan.");
      setOpen(false);
    } catch (error) {
      if (error?.errorFields) return;
      notifyError(error, "Gagal menyimpan alumni.");
    }
  };

  return (
    <TuPage
      title="Data Alumni"
      description="Lulusan satuan ini, termasuk tujuan lanjut sekolah atau pekerjaan."
      extra={
        <Button
          type="primary"
          onClick={() => {
            setEditing(null);
            form.resetFields();
            setOpen(true);
          }}
        >
          Tambah alumni
        </Button>
      }
    >
      <Input
        allowClear
        placeholder="Cari nama, NIS, atau tujuan"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        style={{ maxWidth: 320, marginBottom: 16 }}
      />
      <Table
        rowKey="id"
        loading={isFetching}
        dataSource={data?.data || []}
        scroll={{ x: 980 }}
        columns={[
          { title: "Tahun", dataIndex: "graduation_year", width: 90 },
          { title: "Nama", dataIndex: "full_name" },
          { title: "NIS", dataIndex: "nis", width: 120 },
          { title: "Melanjutkan ke", dataIndex: "continue_to" },
          { title: "Jurusan", dataIndex: "major_name" },
          { title: "Bekerja di", dataIndex: "workplace" },
          { title: "Penghasilan", dataIndex: "income" },
          { title: "Telepon", dataIndex: "phone", width: 130 },
          {
            title: "",
            width: 150,
            render: (_, row) => (
              <Space>
                <Button
                  size="small"
                  onClick={() => {
                    setEditing(row);
                    form.setFieldsValue(row);
                    setOpen(true);
                  }}
                >
                  Ubah
                </Button>
                <Popconfirm
                  title="Hapus data alumni ini?"
                  onConfirm={() =>
                    deleteAlumni(row.id)
                      .unwrap()
                      .then((response) => message.success(response?.message || "Dihapus."))
                      .catch((error) => notifyError(error, "Gagal menghapus."))
                  }
                >
                  <Button size="small" danger>Hapus</Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
      <Modal
        title={editing ? "Ubah alumni" : "Alumni baru"}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={submit}
        confirmLoading={isLoading}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="student_id"
            label="Siswa"
            rules={[{ required: !editing, message: "Pilih siswa." }]}
          >
            <StudentPicker
              fallbackLabel={[editing?.full_name, editing?.nis].filter(Boolean).join(" — ")}
            />
          </Form.Item>
          <Form.Item name="graduation_year" label="Tahun lulus">
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="continue_to" label="Melanjutkan ke">
            <Input />
          </Form.Item>
          <Form.Item name="major_name" label="Jurusan">
            <Input />
          </Form.Item>
          <Form.Item name="workplace" label="Bekerja di">
            <Input />
          </Form.Item>
          <Form.Item name="income" label="Penghasilan">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Telepon">
            <Input />
          </Form.Item>
          <Form.Item name="note" label="Catatan">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </TuPage>
  );
};

export default AlumniPage;
