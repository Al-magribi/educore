import { useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  message,
} from "antd";
import {
  useDeleteFacilityMutation,
  useGetFacilitiesQuery,
  useGetFacilityReportQuery,
  useSaveFacilityMutation,
} from "../../../service/lms/ApiTu";
import { TuPage, notifyError, useTuDownload } from "./tuUi";

const CONDITIONS = [
  { value: "baik", label: "Baik", color: "green" },
  { value: "rusak_ringan", label: "Rusak ringan", color: "gold" },
  { value: "rusak_berat", label: "Rusak berat", color: "red" },
];

const conditionOf = (value) =>
  CONDITIONS.find((item) => item.value === value) || CONDITIONS[0];

const SaranaPage = () => {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();
  const { data, isFetching } = useGetFacilitiesQuery({ search });
  const { data: report } = useGetFacilityReportQuery();
  const [saveFacility, { isLoading }] = useSaveFacilityMutation();
  const [deleteFacility] = useDeleteFacilityMutation();
  const { download, downloading } = useTuDownload();

  const totals = useMemo(() => {
    const rows = report?.data?.conditions || [];
    const pick = (key) => rows.find((row) => row.condition === key)?.quantity || 0;
    return {
      baik: pick("baik"),
      rusak_ringan: pick("rusak_ringan"),
      rusak_berat: pick("rusak_berat"),
    };
  }, [report]);

  const submit = async () => {
    try {
      const values = await form.validateFields();
      const response = await saveFacility({ id: editing?.id, ...values }).unwrap();
      message.success(response?.message || "Sarana disimpan.");
      setOpen(false);
    } catch (error) {
      if (error?.errorFields) return;
      notifyError(error, "Gagal menyimpan sarana.");
    }
  };

  return (
    <TuPage
      title="Sarana dan Prasarana"
      description="Inventaris barang, kondisi, dan rekap untuk laporan."
      extra={
        <Space>
          <Button
            loading={downloading}
            onClick={() => download("/api/lms/tu/facilities/export", "sarana-prasarana.xlsx")}
          >
            Ekspor laporan
          </Button>
          <Button
            type="primary"
            onClick={() => {
              setEditing(null);
              form.resetFields();
              form.setFieldsValue({ quantity: 1, condition: "baik" });
              setOpen(true);
            }}
          >
            Tambah barang
          </Button>
        </Space>
      }
    >
      <Row gutter={[12, 12]}>
        <Col xs={24} md={8}>
          <Card><Statistic title="Jumlah kondisi baik" value={totals.baik} /></Card>
        </Col>
        <Col xs={24} md={8}>
          <Card><Statistic title="Rusak ringan" value={totals.rusak_ringan} /></Card>
        </Col>
        <Col xs={24} md={8}>
          <Card><Statistic title="Rusak berat" value={totals.rusak_berat} /></Card>
        </Col>
      </Row>
      <Card>
        <Input
          allowClear
          placeholder="Cari nama, kode, lokasi, atau kategori"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={{ maxWidth: 360, marginBottom: 16 }}
        />
        <Table
          rowKey="id"
          loading={isFetching}
          dataSource={data?.data || []}
          scroll={{ x: 980 }}
          columns={[
            { title: "Kode", dataIndex: "code", width: 110 },
            { title: "Nama", dataIndex: "name" },
            { title: "Kategori", dataIndex: "category" },
            { title: "Lokasi", dataIndex: "location" },
            { title: "Jumlah", dataIndex: "quantity", width: 90 },
            {
              title: "Kondisi",
              dataIndex: "condition",
              width: 140,
              render: (value) => {
                const item = conditionOf(value);
                return <Tag color={item.color}>{item.label}</Tag>;
              },
            },
            { title: "Tahun", dataIndex: "acquired_year", width: 90 },
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
                    title="Hapus barang ini?"
                    onConfirm={() =>
                      deleteFacility(row.id)
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
      </Card>
      <Card title="Rekap per kategori">
        <Table
          rowKey={(row) => `${row.category}-${row.condition}`}
          pagination={false}
          dataSource={report?.data?.categories || []}
          columns={[
            { title: "Kategori", dataIndex: "category" },
            {
              title: "Kondisi",
              dataIndex: "condition",
              render: (value) => conditionOf(value).label,
            },
            { title: "Jenis barang", dataIndex: "items" },
            { title: "Jumlah unit", dataIndex: "quantity" },
          ]}
        />
      </Card>
      <Modal
        title={editing ? "Ubah sarana" : "Sarana baru"}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={submit}
        confirmLoading={isLoading}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="code" label="Kode">
            <Input />
          </Form.Item>
          <Form.Item name="name" label="Nama" rules={[{ required: true, message: "Nama wajib diisi." }]}>
            <Input />
          </Form.Item>
          <Form.Item name="category" label="Kategori">
            <Input placeholder="Ruang, mebel, elektronik" />
          </Form.Item>
          <Form.Item name="location" label="Lokasi">
            <Input />
          </Form.Item>
          <Form.Item name="quantity" label="Jumlah">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="condition" label="Kondisi">
            <Select options={CONDITIONS} />
          </Form.Item>
          <Form.Item name="acquired_year" label="Tahun perolehan">
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="note" label="Catatan">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </TuPage>
  );
};

export default SaranaPage;
