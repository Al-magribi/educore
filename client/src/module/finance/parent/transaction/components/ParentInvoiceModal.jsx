import {
  Alert,
  Card,
  Descriptions,
  Empty,
  Image,
  Modal,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd";
import { FileSignature } from "lucide-react";
import {
  currencyFormatter,
  dateFormatter,
  statusMetaMap,
} from "./parentTransactionShared";

const { Paragraph, Text, Title } = Typography;

const ParentInvoiceModal = ({ open, invoiceId, invoiceData, loading, onClose }) => {
  const invoice = invoiceData?.invoice;
  const officer = invoiceData?.officer;
  const items = invoiceData?.items || [];
  const payments = invoiceData?.payments || [];
  const statusMeta =
    statusMetaMap[invoice?.status] || statusMetaMap.unpaid;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={960}
      title='Invoice Pembayaran'
      destroyOnHidden
    >
      {loading ? (
        <div style={{ padding: "48px 0", textAlign: "center" }}>
          <Spin size='large' />
        </div>
      ) : !invoiceId || !invoice ? (
        <Empty description='Invoice belum dipilih' />
      ) : (
        <Space direction='vertical' size={18} style={{ width: "100%" }}>
          <Card
            variant='borderless'
            style={{
              borderRadius: 24,
              border: "1px solid rgba(148,163,184,0.14)",
              background:
                "radial-gradient(circle at top left, rgba(56,189,248,0.12), transparent 24%), linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
            }}
          >
            <Space direction='vertical' size={12} style={{ width: "100%" }}>
              <Space align='center' size={10} wrap>
                <Tag color='blue' style={{ margin: 0, borderRadius: 999 }}>
                  {invoice.invoice_no}
                </Tag>
                <Tag
                  color={statusMeta.color}
                  style={{ margin: 0, borderRadius: 999, fontWeight: 700 }}
                >
                  {statusMeta.label}
                </Tag>
              </Space>
              <Title level={4} style={{ margin: 0 }}>
                Invoice {invoice.student_name}
              </Title>
              <Paragraph type='secondary' style={{ marginBottom: 0 }}>
                Dokumen ini menampilkan detail item pembayaran, histori alokasi
                pembayaran, dan identitas petugas keuangan yang terkait.
              </Paragraph>
            </Space>
          </Card>

          <Descriptions
            bordered
            column={{ xs: 1, md: 2 }}
            labelStyle={{ fontWeight: 700, width: 170 }}
          >
            <Descriptions.Item label='Nama Siswa'>
              {invoice.student_name}
            </Descriptions.Item>
            <Descriptions.Item label='NIS'>{invoice.nis || "-"}</Descriptions.Item>
            <Descriptions.Item label='Satuan'>
              {invoice.homebase_name || "-"}
            </Descriptions.Item>
            <Descriptions.Item label='Kelas'>
              {invoice.grade_name || "-"} {invoice.class_name || ""}
            </Descriptions.Item>
            <Descriptions.Item label='Periode'>
              {invoice.periode_name || "-"}
            </Descriptions.Item>
            <Descriptions.Item label='Tanggal Invoice'>
              {dateFormatter(invoice.issue_date)}
            </Descriptions.Item>
            <Descriptions.Item label='Total Tagihan'>
              {currencyFormatter.format(Number(invoice.total_due || 0))}
            </Descriptions.Item>
            <Descriptions.Item label='Sudah Dibayar'>
              {currencyFormatter.format(Number(invoice.total_paid || 0))}
            </Descriptions.Item>
          </Descriptions>

          <Card
            title='Rincian Item'
            variant='borderless'
            style={{
              borderRadius: 24,
              border: "1px solid rgba(148,163,184,0.14)",
            }}
            styles={{ body: { padding: 0 } }}
          >
            <Table
              rowKey='id'
              dataSource={items}
              pagination={false}
              scroll={{ x: 720 }}
              columns={[
                {
                  title: "Item",
                  dataIndex: "description",
                  key: "description",
                  render: (_, record) => (
                    <Space direction='vertical' size={0}>
                      <Text strong>{record.description}</Text>
                      <Text type='secondary'>
                        {record.billing_period_label ||
                          record.component_name ||
                          "-"}
                      </Text>
                    </Space>
                  ),
                },
                {
                  title: "Nominal",
                  dataIndex: "amount_due",
                  key: "amount_due",
                  render: (value) => currencyFormatter.format(Number(value || 0)),
                },
                {
                  title: "Dibayar",
                  dataIndex: "paid_amount",
                  key: "paid_amount",
                  render: (value) => currencyFormatter.format(Number(value || 0)),
                },
                {
                  title: "Status",
                  dataIndex: "status",
                  key: "status",
                  render: (value) => {
                    const meta = statusMetaMap[value] || statusMetaMap.unpaid;
                    return (
                      <Tag
                        color={meta.color}
                        style={{ margin: 0, borderRadius: 999, fontWeight: 700 }}
                      >
                        {meta.label}
                      </Tag>
                    );
                  },
                },
              ]}
            />
          </Card>

          <Card
            title='Riwayat Pembayaran'
            variant='borderless'
            style={{
              borderRadius: 24,
              border: "1px solid rgba(148,163,184,0.14)",
            }}
            styles={{ body: { padding: 0 } }}
          >
            <Table
              rowKey='id'
              dataSource={payments}
              pagination={false}
              locale={{ emptyText: "Belum ada pembayaran yang masuk." }}
              columns={[
                {
                  title: "Tanggal",
                  dataIndex: "payment_date",
                  key: "payment_date",
                  render: (value) => dateFormatter(value, true),
                },
                {
                  title: "Kanal",
                  dataIndex: "payment_channel",
                  key: "payment_channel",
                },
                {
                  title: "Alokasi ke Invoice",
                  dataIndex: "allocated_amount",
                  key: "allocated_amount",
                  render: (value) => currencyFormatter.format(Number(value || 0)),
                },
                {
                  title: "Referensi",
                  dataIndex: "reference_no",
                  key: "reference_no",
                  render: (value) => value || "-",
                },
              ]}
            />
          </Card>

          <Card
            variant='borderless'
            style={{
              borderRadius: 24,
              border: "1px solid rgba(148,163,184,0.14)",
            }}
          >
            <Space
              direction='vertical'
              size={16}
              style={{ width: "100%" }}
            >
              <Space align='center' size={10}>
                <span
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 14,
                    display: "grid",
                    placeItems: "center",
                    background: "linear-gradient(135deg, #dbeafe, #dcfce7)",
                    color: "#0f766e",
                  }}
                >
                  <FileSignature size={18} />
                </span>
                <div>
                  <div style={{ fontWeight: 700 }}>Petugas Keuangan</div>
                  <Text type='secondary'>
                    Nama dan tanda tangan resmi yang tercantum pada invoice.
                  </Text>
                </div>
              </Space>

              {!officer?.name ? (
                <Alert
                  type='info'
                  showIcon
                  message='Profil petugas invoice belum diisi'
                  description='Nama atau tanda tangan petugas keuangan belum tersedia pada pengaturan keuangan satuan.'
                />
              ) : (
                <Space
                  size={24}
                  align='start'
                  wrap
                  style={{ width: "100%", justifyContent: "space-between" }}
                >
                  <div>
                    <Text type='secondary'>Nama Petugas</Text>
                    <div style={{ marginTop: 4, fontWeight: 700 }}>
                      {officer.name}
                    </div>
                  </div>
                  <div>
                    <Text type='secondary'>Tanda Tangan</Text>
                    <div style={{ marginTop: 8 }}>
                      {officer.signature_url ? (
                        <Image
                          src={officer.signature_url}
                          alt='Tanda tangan petugas'
                          width={180}
                          style={{ objectFit: "contain" }}
                        />
                      ) : (
                        <Text type='secondary'>Belum diunggah</Text>
                      )}
                    </div>
                  </div>
                </Space>
              )}
            </Space>
          </Card>
        </Space>
      )}
    </Modal>
  );
};

export default ParentInvoiceModal;
