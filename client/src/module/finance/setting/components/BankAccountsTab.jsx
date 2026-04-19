import { Button, Card, Form, Input, Modal, Space, Switch, Table, Tag, Typography } from "antd";
import { BankOutlined, PlusOutlined } from "@ant-design/icons";
import { cardStyle } from "../../fee/others/constants";

const { Text } = Typography;

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
    <Card
      style={cardStyle}
      title={
        <Space>
          <BankOutlined />
          <span>Rekening Bank Tujuan</span>
        </Space>
      }
      extra={
        <Button type='primary' icon={<PlusOutlined />} onClick={onOpenCreate}>
          Tambah Rekening
        </Button>
      }
    >
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
    </Card>

    <Modal
      title={editingBankAccount ? "Edit Rekening Bank" : "Tambah Rekening Bank"}
      open={bankModalOpen}
      onCancel={onCloseModal}
      onOk={onSubmitModal}
      confirmLoading={isAddingBankAccount || isUpdatingBankAccount}
      destroyOnHidden
      centered
    >
      <Form form={bankForm} layout='vertical' onFinish={onFinish}>
        <Form.Item
          name='bank_name'
          label='Nama Bank'
          rules={[{ required: true, message: "Nama bank wajib diisi" }]}
        >
          <Input placeholder='BCA / BNI / Mandiri / dll' />
        </Form.Item>
        <Form.Item
          name='account_name'
          label='Nama Pemilik Rekening'
          rules={[{ required: true, message: "Nama pemilik rekening wajib diisi" }]}
        >
          <Input placeholder='Nama yayasan / sekolah / satuan' />
        </Form.Item>
        <Form.Item
          name='account_number'
          label='Nomor Rekening'
          rules={[{ required: true, message: "Nomor rekening wajib diisi" }]}
        >
          <Input placeholder='Nomor rekening tujuan' />
        </Form.Item>
        <Form.Item name='branch' label='Cabang'>
          <Input placeholder='Opsional' />
        </Form.Item>
        <Form.Item name='is_active' label='Aktif' valuePropName='checked'>
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  </>
);

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
      <Tag color={value ? "green" : "default"}>
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

export default BankAccountsTab;
