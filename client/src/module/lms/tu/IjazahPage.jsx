import { useState } from "react";
import {
  Button,
  DatePicker,
  Form,
  Input,
  Modal,
  Popconfirm,
  Segmented,
  Space,
  Table,
  Tag,
  Upload,
  message,
} from "antd";
import dayjs from "dayjs";
import {
  useDeleteDiplomaMutation,
  useGetDiplomasQuery,
  useSaveDiplomaMutation,
} from "../../../service/lms/ApiTu";
import { StudentPicker, TuPage, notifyError } from "./tuUi";

const IjazahPage = () => {
  const [kind, setKind] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [file, setFile] = useState(null);
  const [form] = Form.useForm();
  const { data, isFetching } = useGetDiplomasQuery({ kind });
  const [saveDiploma, { isLoading }] = useSaveDiplomaMutation();
  const [deleteDiploma] = useDeleteDiplomaMutation();

  const submit = async () => {
    try {
      const values = await form.validateFields();
      const body = new FormData();
      body.append("student_id", values.student_id || "");
      body.append("kind", values.kind);
      body.append("school_name", values.school_name || "");
      body.append("diploma_no", values.diploma_no || "");
      body.append("skhun_no", values.skhun_no || "");
      body.append("exam_no", values.exam_no || "");
      body.append("note", values.note || "");
      body.append(
        "diploma_date",
        values.diploma_date ? values.diploma_date.format("YYYY-MM-DD") : "",
      );
      if (file) body.append("file", file);
      const response = await saveDiploma({ id: editing?.id, body }).unwrap();
      message.success(response?.message || "Ijazah disimpan.");
      setOpen(false);
      setFile(null);
    } catch (error) {
      if (error?.errorFields) return;
      notifyError(error, "Gagal menyimpan ijazah.");
    }
  };

  return (
    <TuPage
      title="Ijazah"
      description="Ijazah sekolah asal dan ijazah yang diterbitkan satuan ini."
      extra={
        <Button
          type="primary"
          onClick={() => {
            setEditing(null);
            setFile(null);
            form.resetFields();
            form.setFieldsValue({ kind: "terbit" });
            setOpen(true);
          }}
        >
          Tambah ijazah
        </Button>
      }
    >
      <Segmented
        value={kind}
        onChange={setKind}
        options={[
          { label: "Semua", value: "" },
          { label: "Sekolah asal", value: "asal" },
          { label: "Diterbitkan", value: "terbit" },
        ]}
        style={{ marginBottom: 16 }}
      />
      <Table
        rowKey="id"
        loading={isFetching}
        dataSource={data?.data || []}
        scroll={{ x: 980 }}
        columns={[
          {
            title: "Jenis",
            dataIndex: "kind",
            width: 130,
            render: (value) => (
              <Tag color={value === "terbit" ? "blue" : "default"}>
                {value === "terbit" ? "Diterbitkan" : "Sekolah asal"}
              </Tag>
            ),
          },
          { title: "Siswa", dataIndex: "full_name" },
          { title: "NIS", dataIndex: "nis", width: 110 },
          { title: "Nomor", dataIndex: "diploma_no" },
          { title: "Tanggal", dataIndex: "diploma_date", width: 120 },
          { title: "Sekolah", dataIndex: "school_name" },
          {
            title: "Berkas",
            dataIndex: "file_url",
            width: 90,
            render: (value) =>
              value ? (
                <a href={value} target="_blank" rel="noreferrer">
                  Lihat
                </a>
              ) : (
                "-"
              ),
          },
          {
            title: "",
            width: 150,
            render: (_, row) => (
              <Space>
                <Button
                  size="small"
                  onClick={() => {
                    setEditing(row);
                    setFile(null);
                    form.setFieldsValue({
                      ...row,
                      diploma_date: row.diploma_date ? dayjs(row.diploma_date) : null,
                    });
                    setOpen(true);
                  }}
                >
                  Ubah
                </Button>
                <Popconfirm
                  title="Hapus data ijazah ini?"
                  onConfirm={() =>
                    deleteDiploma(row.id)
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
        title={editing ? "Ubah ijazah" : "Ijazah baru"}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={submit}
        confirmLoading={isLoading}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="student_id" label="Siswa" rules={[{ required: !editing, message: "Pilih siswa." }]}>
            <StudentPicker
              fallbackLabel={[editing?.full_name, editing?.nis].filter(Boolean).join(" — ")}
            />
          </Form.Item>
          <Form.Item name="kind" label="Jenis" rules={[{ required: true }]}>
            <Segmented
              options={[
                { label: "Sekolah asal", value: "asal" },
                { label: "Diterbitkan sekolah ini", value: "terbit" },
              ]}
            />
          </Form.Item>
          <Form.Item name="school_name" label="Nama sekolah">
            <Input />
          </Form.Item>
          <Form.Item name="diploma_no" label="Nomor ijazah">
            <Input />
          </Form.Item>
          <Form.Item name="diploma_date" label="Tanggal">
            <DatePicker style={{ width: "100%" }} format="DD-MM-YYYY" />
          </Form.Item>
          <Form.Item name="skhun_no" label="Nomor SKHUN">
            <Input />
          </Form.Item>
          <Form.Item name="exam_no" label="Nomor peserta ujian">
            <Input />
          </Form.Item>
          <Form.Item name="note" label="Catatan">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Upload
            maxCount={1}
            beforeUpload={(next) => {
              setFile(next);
              return false;
            }}
            onRemove={() => setFile(null)}
          >
            <Button>Unggah scan</Button>
          </Upload>
        </Form>
      </Modal>
    </TuPage>
  );
};

export default IjazahPage;
