import { useState } from "react";
import {
  Button,
  DatePicker,
  Flex,
  Form,
  Input,
  Modal,
  Popconfirm,
  Segmented,
  Space,
  Table,
  Upload,
  message,
} from "antd";
import dayjs from "dayjs";
import {
  useDeleteLetterMutation,
  useGetLettersQuery,
  useNextLetterNumberMutation,
  useSaveLetterMutation,
} from "../../../service/lms/ApiTu";
import { TuPage, notifyError, useTuDownload } from "./tuUi";

const SuratPage = () => {
  const [direction, setDirection] = useState("masuk");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [file, setFile] = useState(null);
  const [form] = Form.useForm();
  const { data, isFetching } = useGetLettersQuery({ direction, search });
  const [saveLetter, { isLoading }] = useSaveLetterMutation();
  const [nextNumber, { isLoading: isNumbering }] = useNextLetterNumberMutation();
  const [deleteLetter] = useDeleteLetterMutation();
  const { download, downloading } = useTuDownload();

  const submit = async () => {
    try {
      const values = await form.validateFields();
      const body = new FormData();
      body.append("direction", editing?.direction || direction);
      body.append("letter_no", values.letter_no || "");
      body.append("subject", values.subject || "");
      body.append("party", values.party || "");
      body.append("note", values.note || "");
      body.append(
        "letter_date",
        values.letter_date ? values.letter_date.format("YYYY-MM-DD") : "",
      );
      if (file) body.append("file", file);
      const response = await saveLetter({ id: editing?.id, body }).unwrap();
      message.success(response?.message || "Surat disimpan.");
      setOpen(false);
      setFile(null);
    } catch (error) {
      if (error?.errorFields) return;
      notifyError(error, "Gagal menyimpan surat.");
    }
  };

  const generateNumber = async () => {
    const letterDate = form.getFieldValue("letter_date");
    try {
      const response = await nextNumber({
        direction: editing?.direction || direction,
        letter_date: letterDate ? letterDate.format("YYYY-MM-DD") : undefined,
      }).unwrap();
      form.setFieldValue("letter_no", response.data.letter_no);
    } catch (error) {
      notifyError(error, "Nomor surat gagal dibuat.");
    }
  };

  return (
    <TuPage
      title="Arsip Surat"
      description="Surat masuk dan surat keluar, lengkap dengan nomor dan berkas."
      extra={
        <Space wrap>
          <Button
            loading={downloading}
            onClick={() =>
              download(
                `/api/lms/tu/letters/export?direction=${direction}`,
                "arsip-surat.xlsx",
              )
            }
          >
            Ekspor Excel
          </Button>
          <Button
            type="primary"
            onClick={() => {
              setEditing(null);
              setFile(null);
              form.resetFields();
              form.setFieldsValue({ letter_date: dayjs() });
              setOpen(true);
            }}
          >
            Tambah surat
          </Button>
        </Space>
      }
    >
      <Flex gap={12} wrap="wrap" style={{ marginBottom: 16 }}>
        <Segmented
          value={direction}
          onChange={setDirection}
          options={[
            { label: "Surat masuk", value: "masuk" },
            { label: "Surat keluar", value: "keluar" },
          ]}
        />
        <Input
          allowClear
          placeholder="Cari nomor, perihal, atau pihak"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={{ maxWidth: 320 }}
        />
      </Flex>
      <Table
        rowKey="id"
        loading={isFetching}
        dataSource={data?.data || []}
        scroll={{ x: 860 }}
        columns={[
          { title: "Nomor", dataIndex: "letter_no", width: 170 },
          { title: "Tanggal", dataIndex: "letter_date", width: 120 },
          { title: "Perihal", dataIndex: "subject" },
          {
            title: direction === "masuk" ? "Asal" : "Tujuan",
            dataIndex: "party",
          },
          {
            title: "Berkas",
            width: 90,
            render: (_, row) =>
              row.file_url ? (
                <a href={row.file_url} target="_blank" rel="noreferrer">
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
                      letter_date: row.letter_date ? dayjs(row.letter_date) : null,
                    });
                    setOpen(true);
                  }}
                >
                  Ubah
                </Button>
                <Popconfirm
                  title="Hapus surat ini?"
                  onConfirm={() =>
                    deleteLetter(row.id)
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
        title={editing ? "Ubah surat" : direction === "masuk" ? "Surat masuk" : "Surat keluar"}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={submit}
        confirmLoading={isLoading}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="letter_date" label="Tanggal">
            <DatePicker style={{ width: "100%" }} format="DD-MM-YYYY" />
          </Form.Item>
          <Form.Item label="Nomor surat" required>
            <Space.Compact style={{ width: "100%" }}>
              <Form.Item
                name="letter_no"
                noStyle
                rules={[{ required: true, message: "Nomor surat wajib diisi." }]}
              >
                <Input />
              </Form.Item>
              <Button loading={isNumbering} onClick={generateNumber}>
                Buat nomor
              </Button>
            </Space.Compact>
          </Form.Item>
          <Form.Item
            name="subject"
            label="Perihal"
            rules={[{ required: true, message: "Perihal wajib diisi." }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="party" label={direction === "masuk" ? "Asal surat" : "Tujuan surat"}>
            <Input />
          </Form.Item>
          <Form.Item name="note" label="Catatan">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Upload
            maxCount={1}
            beforeUpload={(next) => {
              setFile(next);
              return false;
            }}
            onRemove={() => setFile(null)}
          >
            <Button>Unggah berkas</Button>
          </Upload>
        </Form>
      </Modal>
    </TuPage>
  );
};

export default SuratPage;
