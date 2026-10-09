import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  DatePicker,
  Flex,
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
  useDeleteInspectionMutation,
  useGetBukuIndukQuery,
  useGetInspectionsQuery,
  useOpenBukuIndukMutation,
  useSaveInspectionMutation,
} from "../../../service/lms/ApiTu";
import { STATUS_OPTIONS, errorMessage, statusColor } from "./profileDefaults";
import { TuPage, useTuDownload } from "./tuUi";

const BukuIndukList = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [entryYear, setEntryYear] = useState();
  const [status, setStatus] = useState();
  const [inspectionOpen, setInspectionOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const { data, isLoading, isFetching } = useGetBukuIndukQuery({
    search,
    entryYear,
    status,
  });
  const { data: inspections, isLoading: inspectionLoading } = useGetInspectionsQuery();
  const [openBuku, { isLoading: isOpening }] = useOpenBukuIndukMutation();
  const [saveInspection, { isLoading: isSaving }] = useSaveInspectionMutation();
  const [deleteInspection] = useDeleteInspectionMutation();
  const { download, downloading } = useTuDownload();

  const years = useMemo(() => {
    const values = new Set(
      (data?.data || []).map((item) => item.entry_year).filter(Boolean),
    );
    return Array.from(values).sort((left, right) => right - left);
  }, [data]);

  const openRecord = async (studentId) => {
    try {
      const response = await openBuku({ student_id: studentId }).unwrap();
      navigate(`/tata-usaha/buku-induk/${response.data.id}`);
    } catch (error) {
      message.error(errorMessage(error, "Buku induk gagal dibuka."));
    }
  };

  const submitInspection = async () => {
    try {
      const values = await form.validateFields();
      const response = await saveInspection({
        id: editing?.id,
        ...values,
        inspected_on: values.inspected_on
          ? values.inspected_on.format("YYYY-MM-DD")
          : null,
      }).unwrap();
      message.success(response?.message || "Pemeriksaan disimpan.");
      setInspectionOpen(false);
    } catch (error) {
      if (error?.errorFields) return;
      message.error(errorMessage(error, "Gagal menyimpan pemeriksaan."));
    }
  };

  return (
    <TuPage
      title="Buku Induk"
      description="Catatan peserta didik satu angkatan. Nilai ditarik dari LMS dan dapat dikoreksi."
      extra={
        <Button
          loading={downloading}
          onClick={() =>
            download(
              `/api/lms/tu/buku-induk/export${entryYear ? `?entry_year=${entryYear}` : ""}`,
              "buku-induk.xlsx",
            )
          }
        >
          Ekspor Excel
        </Button>
      }
    >
      <Card>
        <Flex gap={8} wrap="wrap" style={{ marginBottom: 16 }}>
          <Input
            allowClear
            placeholder="Cari nama, NIS, atau NISN"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{ width: 260 }}
          />
          <Select
            allowClear
            placeholder="Angkatan"
            value={entryYear}
            options={years.map((year) => ({ value: year, label: year }))}
            onChange={setEntryYear}
            style={{ width: 140 }}
          />
          <Select
            allowClear
            placeholder="Status"
            value={status}
            options={STATUS_OPTIONS}
            onChange={setStatus}
            style={{ width: 140 }}
          />
        </Flex>
        <Table
          rowKey="student_id"
          loading={isLoading || isFetching || isOpening}
          dataSource={data?.data || []}
          scroll={{ x: 860 }}
          columns={[
            { title: "No", dataIndex: "register_no", width: 70 },
            { title: "Angkatan", dataIndex: "entry_year", width: 100 },
            { title: "NIS", dataIndex: "nis", width: 120 },
            { title: "Nama", dataIndex: "full_name" },
            {
              title: "Kelas",
              render: (_, row) =>
                [row.grade_name, row.class_name].filter(Boolean).join(" ") || "-",
            },
            {
              title: "Status",
              dataIndex: "student_status",
              width: 110,
              render: (value) => (
                <Tag color={statusColor[value] || "default"}>
                  {STATUS_OPTIONS.find((item) => item.value === value)?.label || value}
                </Tag>
              ),
            },
            {
              title: "",
              width: 110,
              render: (_, row) => (
                <Button size="small" onClick={() => openRecord(row.student_id)}>
                  Kelola
                </Button>
              ),
            },
          ]}
        />
      </Card>

      <Card
        title="Pemeriksaan buku induk"
        extra={
          <Button
            onClick={() => {
              setEditing(null);
              form.resetFields();
              setInspectionOpen(true);
            }}
          >
            Tambah
          </Button>
        }
      >
        <Table
          rowKey="id"
          loading={inspectionLoading}
          dataSource={inspections?.data || []}
          pagination={false}
          columns={[
            { title: "Tanggal", dataIndex: "inspected_on", width: 120 },
            { title: "Petugas", dataIndex: "officer_name" },
            { title: "Jabatan", dataIndex: "position" },
            { title: "Catatan", dataIndex: "note" },
            {
              title: "",
              width: 160,
              render: (_, row) => (
                <Space>
                  <Button
                    size="small"
                    onClick={() => {
                      setEditing(row);
                      form.setFieldsValue({
                        ...row,
                        inspected_on: row.inspected_on ? dayjs(row.inspected_on) : null,
                      });
                      setInspectionOpen(true);
                    }}
                  >
                    Ubah
                  </Button>
                  <Popconfirm
                    title="Hapus catatan ini?"
                    onConfirm={() =>
                      deleteInspection(row.id)
                        .unwrap()
                        .then((response) => message.success(response?.message || "Dihapus."))
                        .catch((error) => message.error(errorMessage(error, "Gagal menghapus.")))
                    }
                  >
                    <Button size="small" danger>
                      Hapus
                    </Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title={editing ? "Ubah pemeriksaan" : "Pemeriksaan baru"}
        open={inspectionOpen}
        onCancel={() => setInspectionOpen(false)}
        onOk={submitInspection}
        confirmLoading={isSaving}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="inspected_on" label="Tanggal">
            <DatePicker style={{ width: "100%" }} format="DD-MM-YYYY" />
          </Form.Item>
          <Form.Item
            name="officer_name"
            label="Nama petugas"
            rules={[{ required: true, message: "Nama petugas wajib diisi." }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="position" label="Jabatan">
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

export default BukuIndukList;
