import {
  Button,
  Card,
  Col,
  Flex,
  Form,
  Grid,
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
}) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const mobileColumns = [
    {
      title: "Rekening",
      key: "account",
      render: (_, record) => {
        const actionColumn = bankColumns?.find((item) => item.key === "action");

        return (
          <Flex vertical gap={10} style={{ width: "100%" }}>
            <Flex justify='space-between' align='flex-start' gap={8}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <Text strong style={{ display: "block", wordBreak: "break-word" }}>
                  {record.bank_name}
                </Text>
                <Text type='secondary' style={{ fontSize: 12, wordBreak: "break-word" }}>
                  {record.account_name}
                </Text>
              </div>
              <Tag
                color={record.is_active ? "green" : "default"}
                style={{ borderRadius: 999, fontWeight: 600, margin: 0 }}
              >
                {record.is_active ? "Aktif" : "Nonaktif"}
              </Tag>
            </Flex>
            <div>
              <Text code style={{ wordBreak: "break-all" }}>
                {record.account_number}
              </Text>
              <Text type='secondary' style={{ display: "block", fontSize: 12, marginTop: 4 }}>
                Cabang: {record.branch || "-"}
              </Text>
            </div>
            {actionColumn?.render ? (
              <div>{actionColumn.render(null, record)}</div>
            ) : null}
          </Flex>
        );
      },
    },
  ];

  return (
    <>
      <MotionDiv initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card
          style={{
            ...cardStyle,
            borderRadius: isMobile ? 18 : undefined,
            background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
            overflow: "hidden",
          }}
          styles={{ body: { padding: isMobile ? 14 : 24 } }}
        >
          <Flex vertical gap={18}>
            <div
              style={{
                padding: isMobile ? 14 : 20,
                borderRadius: isMobile ? 16 : 22,
                border: "1px solid rgba(59,130,246,0.14)",
                background:
                  "linear-gradient(135deg, rgba(239,246,255,0.96), rgba(240,253,250,0.94))",
              }}
            >
              <Flex
                justify='space-between'
                align={isMobile ? "stretch" : "flex-start"}
                vertical={isMobile}
                wrap='wrap'
                gap={16}
              >
                <Flex align='flex-start' gap={14} style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      width: isMobile ? 44 : 52,
                      height: isMobile ? 44 : 52,
                      display: "grid",
                      placeItems: "center",
                      borderRadius: 18,
                      background: "linear-gradient(135deg, #1d4ed8, #0f766e)",
                      color: "#fff",
                      flexShrink: 0,
                      boxShadow: "0 18px 30px rgba(29, 78, 216, 0.2)",
                    }}
                  >
                    <Landmark size={isMobile ? 18 : 22} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <Title
                      level={isMobile ? 5 : 4}
                      style={{ margin: 0, lineHeight: 1.3 }}
                    >
                      Rekening Bank Tujuan
                    </Title>
                    {!isMobile ? (
                      <Paragraph
                        type='secondary'
                        style={{ margin: "6px 0 0", maxWidth: 760 }}
                      >
                        Kelola rekening tujuan transfer manual untuk memperjelas
                        instruksi pembayaran dan menjaga validitas kanal pembayaran.
                      </Paragraph>
                    ) : null}
                  </div>
                </Flex>
                <Button
                  type='primary'
                  icon={<PlusOutlined />}
                  onClick={onOpenCreate}
                  block={isMobile}
                >
                  Tambah Rekening
                </Button>
              </Flex>

              <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
                <Col xs={24} sm={12}>
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
                <Col xs={24} sm={12}>
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
              columns={isMobile ? mobileColumns : bankColumns}
              dataSource={bankAccounts}
              loading={isFetchingSettings}
              pagination={false}
              size={isMobile ? "small" : "middle"}
              locale={{
                emptyText: "Belum ada rekening bank untuk satuan ini",
              }}
              scroll={isMobile ? undefined : { x: 760 }}
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
        width={isMobile ? "calc(100vw - 24px)" : 620}
        styles={{
          content: {
            padding: 0,
            overflow: "hidden",
            borderRadius: isMobile ? 20 : 28,
            boxShadow: "0 28px 70px rgba(15, 23, 42, 0.18)",
          },
          body: {
            padding: 0,
            maxHeight: isMobile ? "calc(100vh - 40px)" : undefined,
            overflowY: isMobile ? "auto" : undefined,
          },
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
            padding: isMobile ? 16 : 24,
            background: "linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)",
          }}
        >
          <div
            style={{
              marginBottom: 20,
              padding: isMobile ? 16 : 20,
              borderRadius: isMobile ? 16 : 22,
              background: "linear-gradient(135deg, #eef2ff, #eff6ff)",
            }}
          >
            <div
              style={{
                width: isMobile ? 44 : 52,
                height: isMobile ? 44 : 52,
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
            <Text
              strong
              style={{
                display: "block",
                fontSize: isMobile ? 20 : 24,
                color: "#0f172a",
                lineHeight: 1.3,
              }}
            >
              {editingBankAccount ? "Edit Rekening Bank" : "Tambah Rekening Bank"}
            </Text>
            <Text type='secondary' style={{ fontSize: isMobile ? 13 : 14 }}>
              Simpan rekening tujuan pembayaran manual untuk satuan yang sedang
              dipilih.
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
              rules={[
                { required: true, message: "Nama pemilik rekening wajib diisi" },
              ]}
            >
              <Input size='large' placeholder='Nama yayasan / sekolah / satuan' />
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

            <Flex
              justify='flex-end'
              gap={12}
              wrap='wrap'
              vertical={isMobile}
            >
              <Button onClick={onCloseModal} block={isMobile}>
                Batal
              </Button>
              <Button
                type='primary'
                onClick={onSubmitModal}
                loading={isAddingBankAccount || isUpdatingBankAccount}
                block={isMobile}
              >
                {editingBankAccount ? "Simpan Perubahan" : "Simpan Rekening"}
              </Button>
            </Flex>
          </Form>
        </div>
      </Modal>
    </>
  );
};

/* eslint-disable react-refresh/only-export-components */
export const createBankColumns = ({ onEdit, onDelete, isDeleting }) => [
  {
    title: "Bank",
    dataIndex: "bank_name",
    key: "bank_name",
    render: (value, record) => (
      <div>
        <Text strong style={{ wordBreak: "break-word" }}>
          {value}
        </Text>
        <div
          style={{
            fontSize: 12,
            color: "#64748b",
            marginTop: 2,
            wordBreak: "break-word",
          }}
        >
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
    fixed: "right",
    render: (_, record) => (
      <Space wrap>
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
