import {
  Col,
  DatePicker,
  Form,
  Grid,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import { BanknoteArrowDown } from "lucide-react";

import { rupiahInputProps } from "../constants";

const { Text } = Typography;
const { TextArea } = Input;
const MotionDiv = motion.div;

const ExpenseFormModal = ({
  open,
  editing,
  form,
  confirmLoading,
  homebases = [],
  periodes = [],
  categories = [],
  paymentMethods = [],
  lockHomebase = false,
  onCancel,
  onSubmit,
}) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  return (
    <Modal
      title={null}
      open={open}
      onCancel={onCancel}
      onOk={form.submit}
      okText={editing ? "Simpan" : "Tambah"}
      cancelText="Batal"
      confirmLoading={confirmLoading}
      width={isMobile ? "calc(100vw - 24px)" : 640}
      destroyOnClose
      centered
      styles={{
        content: {
          padding: 0,
          overflow: "hidden",
          borderRadius: isMobile ? 20 : 28,
        },
        body: { padding: 0 },
        footer: { padding: isMobile ? "0 16px 16px" : "0 24px 22px" },
      }}
      modalRender={(modalNode) => (
        <MotionDiv
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
        >
          {modalNode}
        </MotionDiv>
      )}
    >
      <div
        style={{
          padding: isMobile ? "18px 16px 8px" : "22px 24px 10px",
          background:
            "linear-gradient(135deg, rgba(234,88,12,0.1), rgba(251,146,60,0.06))",
        }}
      >
        <Space align="start" size={12}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              display: "grid",
              placeItems: "center",
              background: "linear-gradient(135deg, #ea580c, #c2410c)",
              color: "#fff",
            }}
          >
            <BanknoteArrowDown size={18} />
          </div>
          <div>
            <Text strong style={{ fontSize: 16 }}>
              {editing ? "Edit Pengeluaran" : "Tambah Pengeluaran"}
            </Text>
            <div>
              <Text type="secondary">
                Catat detail biaya operasional satuan pendidikan.
              </Text>
            </div>
          </div>
        </Space>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
        style={{ padding: isMobile ? "8px 16px 0" : "10px 24px 0" }}
        initialValues={{
          payment_method: "cash",
          category: "operational",
        }}
      >
        {!lockHomebase ? (
          <Form.Item
            name="homebase_id"
            label="Satuan"
            rules={[{ required: true, message: "Satuan wajib dipilih" }]}
          >
            <Select
              placeholder="Pilih satuan"
              options={homebases.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
            />
          </Form.Item>
        ) : null}

        <Form.Item
          name="title"
          label="Judul"
          rules={[
            { required: true, message: "Judul wajib diisi" },
            { max: 150, message: "Maksimal 150 karakter" },
          ]}
        >
          <Input placeholder="Contoh: Pembelian ATK bulan Maret" />
        </Form.Item>

        <Row gutter={12}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="category"
              label="Kategori"
              rules={[{ required: true, message: "Kategori wajib dipilih" }]}
            >
              <Select
                options={categories.map((item) => ({
                  value: item.value,
                  label: item.label,
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="amount"
              label="Nominal"
              rules={[
                { required: true, message: "Nominal wajib diisi" },
                {
                  type: "number",
                  min: 1,
                  message: "Nominal harus lebih dari 0",
                },
              ]}
            >
              <InputNumber {...rupiahInputProps} placeholder="Rp 0" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="expense_date"
              label="Tanggal"
              rules={[{ required: true, message: "Tanggal wajib diisi" }]}
            >
              <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="payment_method"
              label="Metode Bayar"
              rules={[{ required: true, message: "Metode wajib dipilih" }]}
            >
              <Select
                options={paymentMethods.map((item) => ({
                  value: item.value,
                  label: item.label,
                }))}
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="periode_id"
          label="Periode"
          rules={[{ required: true, message: "Periode wajib dipilih" }]}
        >
          <Select
            placeholder="Pilih periode"
            options={periodes.map((item) => ({
              value: item.id,
              label: item.name,
            }))}
          />
        </Form.Item>

        <Form.Item name="reference_no" label="No. Referensi">
          <Input placeholder="No. bukti / transfer (opsional)" />
        </Form.Item>

        <Form.Item name="description" label="Keterangan">
          <TextArea rows={2} placeholder="Detail pengeluaran (opsional)" />
        </Form.Item>

        <Form.Item name="notes" label="Catatan Internal">
          <TextArea rows={2} placeholder="Catatan internal (opsional)" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ExpenseFormModal;
