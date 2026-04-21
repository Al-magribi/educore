import {
  Button,
  Card,
  Col,
  Flex,
  Form,
  Input,
  Modal,
  Row,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import { Landmark, ShieldCheck } from "lucide-react";
import { BankOutlined, PlusOutlined } from "@ant-design/icons";
import { cardStyle } from "../../fee/others/constants";

const { Paragraph, Text, Title } = Typography;
const MotionDiv = motion.div;

const BankAccountsTab = ({
  bankAccounts,
  bankColumns,
  isFetchingSettings,
  onOpenCreate,
  bankModalOpen,
  editingBankAccount,
  onCloseModal,
  onSubmitModal,
  bankForm,
  onFinish,
  isAddingBankAccount,
  isUpdatingBankAccount,
}) => (
  <>
    <MotionDiv initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card
        style={{
          ...cardStyle,
          background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
        }}
        styles={{ body: { padding: 24 } }}
      >
        <Flex vertical gap={18}>
          <div
            style={{
              padding: 20,
              borderRadius: 22,
              border: "1px solid rgba(59,130,246,0.14)",
              background:
                "linear-gradient(135deg, rgba(239,246,255,0.96), rgba(240,253,250,0.94))",
            }}
          >
            <Flex justify='space-between' align='flex-start' wrap='wrap' gap={16}>
              <Flex align='flex-start' gap={14} style={{ flex: 1 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 18,
                    background: "linear-gradient(135deg, #1d4ed8, #0f766e)",
                    color: "#fff",
                    flexShrink: 0,
                    boxShadow: "0 18px 30px rgba(29, 78, 216, 0.2)",
                  }}
                >
                  <Landmark size={22} />
                </div>
                <div>
                  <Title level={4} style={{ margin: 0 }}>
                    Rekening Bank Tujuan
                  </Title>
                  <Paragraph
                    type='secondary'
                    style={{ margin: "6px 0 0", maxWidth: 760 }}
                  >
                    Kelola rekening tujuan transfer manual untuk memperjelas
                    instruksi pembayaran dan menjaga validitas kanal pembayaran.
                  </Paragraph>
                </div>
              </Flex>
              <Button type='primary' icon={<PlusOutlined />} onClick={onOpenCreate}>
                Tambah Rekening
              </Button>
            </Flex>

            <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
              <Col xs={24} md={12}>
                <div
                  style={{
                    padding: "14px 16px",
                    borderRadius: 18,
                    background: "#ffffff",
                    border: "1px solid rgba(148,163,184,0.14)",
                  }}
                >
                  <Text type='secondary'>Total rekening</Text>
                  <Title level={5} style={{ margin: "8px 0 0" }}>
                    {bankAccounts.length} rekening
                  </Title>
                </div>
              </Col>
              <Col xs={24} md={12}>
                <div
                  style={{
                    padding: "14px 16px",
                    borderRadius: 18,
                    background: "#ffffff",
                    border: "1px solid rgba(148,163,184,0.14)",
                  }}
                >
                  <Flex align='center' gap={8}>
                    <ShieldCheck size={15} color='#166534' />
                    <Text type='secondary'>Rekening aktif</Text>
                  </Flex>
                  <Title level={5} style={{ margin: "8px 0 0" }}>
                    {bankAccounts.filter((item) => item.is_active).length} aktif
                  </Title>
                </div>
              </Col>
            </Row>
          </div>

          <Table
            rowKey='id'
            columns={bankColumns}
            dataSource={bankAccounts}
            loading={isFetchingSettings}
            pagination={false}
            locale={{
              emptyText: "Belum ada rekening bank untuk satuan ini",
            }}
            scroll={{ x: 760 }}
          />
        </Flex>
      </Card>
    </MotionDiv>

    <Modal
      title={null}
      open={bankModalOpen}
      onCancel={onCloseModal}
      footer={null}
      destroyOnHidden
      centered
      closable={false}
      width={620}
      styles={{
        content: {
          padding: 0,
          overflow: "hidden",
          borderRadius: 28,
          boxShadow: "0 28px 70px rgba(15, 23, 42, 0.18)",
        },
        body: { padding: 0 },
        footer: { padding: "0 24px 22px" },
      }}
      modalRender={(modalNode) => (
        <MotionDiv
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.24, ease: "easeOut" }}
        >
          {modalNode}
        </MotionDiv>
      )}
      >
        <div
          style={{
            padding: 24,
            background: "linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)",
        }}
      >
        <div
          style={{
            marginBottom: 20,
            padding: 20,
            borderRadius: 22,
            background: "linear-gradient(135deg, #eef2ff, #eff6ff)",
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              display: "grid",
              placeItems: "center",
              borderRadius: 18,
              background: "linear-gradient(135deg, #1d4ed8, #0f766e)",
              color: "#fff",
              boxShadow: "0 18px 32px rgba(29, 78, 216, 0.22)",
              marginBottom: 14,
            }}
          >
            <BankOutlined style={{ fontSize: 20 }} />
          </div>
          <Text strong style={{ display: "block", fontSize: 24, color: "#0f172a" }}>
            {editingBankAccount ? "Edit Rekening Bank" : "Tambah Rekening Bank"}
          </Text>
          <Text type='secondary'>
            Simpan rekening tujuan pembayaran manual untuk satuan yang sedang dipilih.
          </Text>
        </div>

        <Form form={bankForm} layout='vertical' onFinish={onFinish}>
          <Form.Item
            name='bank_name'
            label='Nama Bank'
            rules={[{ required: true, message: "Nama bank wajib diisi" }]}
          >
            <Input size='large' placeholder='BCA / BNI / Mandiri / dll' />
          </Form.Item>
          <Form.Item
            name='account_name'
            label='Nama Pemilik Rekening'
            rules={[{ required: true, message: "Nama pemilik rekening wajib diisi" }]}
          >
            <Input
              size='large'
              placeholder='Nama yayasan / sekolah / satuan'
            />
          </Form.Item>
          <Form.Item
            name='account_number'
            label='Nomor Rekening'
            rules={[{ required: true, message: "Nomor rekening wajib diisi" }]}
          >
            <Input size='large' placeholder='Nomor rekening tujuan' />
          </Form.Item>
          <Form.Item name='branch' label='Cabang'>
            <Input size='large' placeholder='Opsional' />
          </Form.Item>
          <Form.Item name='is_active' label='Aktif' valuePropName='checked'>
            <Switch />
          </Form.Item>

          <Flex justify='flex-end' gap={12} wrap='wrap'>
            <Button onClick={onCloseModal}>Batal</Button>
            <Button
              type='primary'
              onClick={onSubmitModal}
              loading={isAddingBankAccount || isUpdatingBankAccount}
            >
              {editingBankAccount ? "Simpan Perubahan" : "Simpan Rekening"}
            </Button>
          </Flex>
        </Form>
      </div>
    </Modal>
  </>
);

/* eslint-disable react-refresh/only-export-components */
export const createBankColumns = ({ onEdit, onDelete, isDeleting }) => [
  {
    title: "Bank",
    dataIndex: "bank_name",
    key: "bank_name",
    render: (value, record) => (
      <div>
        <Text strong>{value}</Text>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
          {record.account_name}
        </div>
      </div>
    ),
  },
  {
    title: "No. Rekening",
    dataIndex: "account_number",
    key: "account_number",
    render: (value) => <Text code>{value}</Text>,
  },
  {
    title: "Cabang",
    dataIndex: "branch",
    key: "branch",
    render: (value) => value || "-",
  },
  {
    title: "Status",
    dataIndex: "is_active",
    key: "is_active",
    width: 120,
    align: "center",
    render: (value) => (
      <Tag
        color={value ? "green" : "default"}
        style={{ borderRadius: 999, fontWeight: 600 }}
      >
        {value ? "Aktif" : "Nonaktif"}
      </Tag>
    ),
  },
  {
    title: "Aksi",
    key: "action",
    width: 180,
    render: (_, record) => (
      <Space>
        <Button size='small' onClick={() => onEdit(record)}>
          Edit
        </Button>
        <Button
          size='small'
          danger
          loading={isDeleting}
          onClick={() => onDelete(record)}
        >
          Hapus
        </Button>
      </Space>
    ),
  },
];
/* eslint-enable react-refresh/only-export-components */

export default BankAccountsTab;
