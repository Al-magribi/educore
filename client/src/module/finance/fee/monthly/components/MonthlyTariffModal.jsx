import {
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Switch,
  Tag,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import { ReceiptText } from "lucide-react";

const { Text } = Typography;
const MotionDiv = motion.div;

const rupiahInputProps = {
  min: 0,
  precision: 0,
  style: { width: "100%" },
  formatter: (value) =>
    value === undefined || value === null || value === ""
      ? ""
      : `Rp ${new Intl.NumberFormat("id-ID").format(Number(value))}`,
  parser: (value) => value?.replace(/[^\d]/g, "") || "",
};

const renderPeriodeOption = (option) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    }}
  >
    <span>{option.data.label}</span>
    <Tag
      color={option.data.is_active ? "green" : "default"}
      style={{ borderRadius: 999, fontWeight: 600 }}
    >
      {option.data.is_active ? "Aktif" : "Nonaktif"}
    </Tag>
  </div>
);

const MonthlyTariffModal = ({
  open,
  editingTariff,
  onCancel,
  onSubmit,
  onHomebaseChange,
  form,
  homebases,
  periodes,
  grades,
  confirmLoading,
}) => (
  <Modal
    title={null}
    open={open}
    onCancel={onCancel}
    onOk={form.submit}
    confirmLoading={confirmLoading}
    destroyOnHidden
    centered
    closable={false}
    width={640}
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
            background: "linear-gradient(135deg, #4f46e5, #2563eb)",
            color: "#fff",
            boxShadow: "0 18px 32px rgba(79, 70, 229, 0.22)",
            marginBottom: 14,
          }}
        >
          <ReceiptText size={22} />
        </div>
        <Text strong style={{ display: "block", fontSize: 24, color: "#0f172a" }}>
          {editingTariff ? "Perbarui Tarif SPP" : "Tambah Tarif SPP Baru"}
        </Text>
        <Text type='secondary'>
          Atur tarif SPP berdasarkan satuan, periode, dan tingkat agar proses
          penagihan tetap konsisten.
        </Text>
      </div>

      <Form form={form} layout='vertical' onFinish={onSubmit}>
        <Form.Item
          name='homebase_id'
          label='Satuan'
          rules={[{ required: true, message: "Satuan wajib dipilih" }]}
        >
          <Select
            size='large'
            options={homebases.map((item) => ({
              value: item.id,
              label: item.name,
            }))}
            onChange={onHomebaseChange}
            placeholder='Pilih satuan'
            virtual={false}
            disabled={homebases.length <= 1}
          />
        </Form.Item>
        <Form.Item
          name='periode_id'
          label='Periode'
          rules={[{ required: true, message: "Periode wajib dipilih" }]}
        >
          <Select
            size='large'
            options={periodes.map((item) => ({
              value: item.id,
              label: item.name,
              is_active: item.is_active,
            }))}
            placeholder='Pilih periode'
            virtual={false}
            optionRender={renderPeriodeOption}
          />
        </Form.Item>
        <Form.Item
          name='grade_id'
          label='Tingkat'
          rules={[{ required: true, message: "Tingkat wajib dipilih" }]}
        >
          <Select
            size='large'
            options={grades.map((item) => ({
              value: item.id,
              label: item.name,
            }))}
          />
        </Form.Item>
        <Form.Item
          name='amount'
          label='Nominal Tarif'
          rules={[{ required: true, message: "Nominal tarif wajib diisi" }]}
        >
          <InputNumber {...rupiahInputProps} placeholder='Rp 0' size='large' />
        </Form.Item>
        <Form.Item name='description' label='Keterangan'>
          <Input.TextArea rows={3} placeholder='Opsional' />
        </Form.Item>
        <Form.Item name='is_active' label='Aktif' valuePropName='checked'>
          <Switch />
        </Form.Item>
      </Form>
    </div>
  </Modal>
);

export default MonthlyTariffModal;
