import { useState } from "react";
import {
  Button,
  DatePicker,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  message,
} from "antd";
import dayjs from "dayjs";
import {
  useDeleteMutationMutation,
  useGetMutationsQuery,
  useSaveMutationMutation,
} from "../../../service/lms/ApiTu";
import { errorMessage } from "./profileDefaults";
import { StudentPicker, TuPage, notifyError } from "./tuUi";

const MutasiSiswa = () => {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const { data, isLoading } = useGetMutationsQuery();
  const [saveMutation, { isLoading: isSaving }] = useSaveMutationMutation();
  const [deleteMutation] = useDeleteMutationMutation();

  const submit = async () => {
    try {
      const values = await form.validateFields();
      const response = await saveMutation({
        id: editing?.id,
        student_id: values.student_id,
        direction: values.direction,
        school_name: values.school_name,
        class_name: values.class_name,
        reason: values.reason,
        mutation_date: values.mutation_date
          ? values.mutation_date.format("YYYY-MM-DD")
          : null,
      }).unwrap();
      message.success(response?.message || "Mutasi disimpan.");
      setOpen(false);
    } catch (error) {
      if (error?.errorFields) return;
      notifyError(error, "Gagal menyimpan mutasi.");
    }
  };

  return (
    <TuPage
      title="Mutasi Siswa"
      description="Pindahan masuk dan keluar. Data yang sama mengisi bagian pindahan di buku induk."
      extra={
        <Button
          type="primary"
          onClick={() => {
            setEditing(null);
            form.resetFields();
            form.setFieldsValue({ direction: "masuk" });
            setOpen(true);
          }}
        >
          Catat mutasi
        </Button>
      }
    >
      <Table
        rowKey="id"
        loading={isLoading}
        dataSource={data?.data || []}
        scroll={{ x: 860 }}
        columns={[
          { title: "Tanggal", dataIndex: "mutation_date", width: 120 },
          { title: "Siswa", dataIndex: "full_name" },
          { title: "NIS", dataIndex: "nis", width: 120 },
          {
            title: "Arah",
            dataIndex: "direction",
            width: 110,
            render: (value) => (
              <Tag color={value === "masuk" ? "green" : "gold"}>
                {value === "masuk" ? "Masuk" : "Keluar"}
              </Tag>
            ),
          },
          { title: "Sekolah", dataIndex: "school_name" },
          { title: "Kelas", dataIndex: "class_name", width: 120 },
          { title: "Alasan", dataIndex: "reason" },
          {
            title: "",
            width: 150,
            render: (_, row) => (
              <Space>
                <Button
                  size="small"
                  onClick={() => {
                    setEditing(row);
                    form.setFieldsValue({
                      ...row,
                      mutation_date: row.mutation_date ? dayjs(row.mutation_date) : null,
                    });
                    setOpen(true);
                  }}
                >
                  Ubah
                </Button>
                <Popconfirm
                  title="Hapus mutasi ini?"
                  onConfirm={() =>
                    deleteMutation(row.id)
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
        title={editing ? "Ubah mutasi" : "Mutasi baru"}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={submit}
        confirmLoading={isSaving}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="student_id"
            label="Siswa"
            rules={[{ required: true, message: "Pilih siswa." }]}
          >
            <StudentPicker
              fallbackLabel={[editing?.full_name, editing?.nis].filter(Boolean).join(" — ")}
            />
          </Form.Item>
          <Form.Item name="direction" label="Arah" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "masuk", label: "Masuk pindahan" },
                { value: "keluar", label: "Keluar / pindah" },
              ]}
            />
          </Form.Item>
          <Form.Item name="mutation_date" label="Tanggal">
            <DatePicker style={{ width: "100%" }} format="DD-MM-YYYY" />
          </Form.Item>
          <Form.Item
            name="school_name"
            label="Sekolah asal atau tujuan"
            rules={[{ required: true, message: "Nama sekolah wajib diisi." }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="class_name" label="Kelas">
            <Input />
          </Form.Item>
          <Form.Item name="reason" label="Alasan">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </TuPage>
  );
};

export default MutasiSiswa;
