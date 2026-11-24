import {
  Alert,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Typography,
} from "antd";
import { motion } from "framer-motion";

import { rupiahInputProps } from "../constants";

import { museColors, museRadius, museShadow } from "../../../../../config/theme";
const { Title, Text } = Typography;
const MotionDiv = motion.div;

const StudentContributionTransactionModal = ({
  open,
  form,
  editingTransaction,
  mode,
  selectableStudents,
  onCancel,
  onSubmit,
  confirmLoading,
}) => (
  <Modal
    title={null}
    open={open}
    onCancel={onCancel}
    onOk={form.submit}
    confirmLoading={confirmLoading}
    width='min(760px, calc(100vw - 24px))'
    destroyOnHidden
    closable={false}
    centered
    okText={editingTransaction ? "Simpan Perubahan" : "Simpan Transaksi"}
    cancelText='Batal'
    styles={{
      body: {
        padding: 16,
        background: museColors.bgLayout,
      },
    }}
    modalRender={(node) => (
      <MotionDiv
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        style={{ borderRadius: museRadius.card, overflow: "hidden" }}
      >
        {node}
      </MotionDiv>
    )}
  >
    <Space orientation='vertical' size={16} style={{ width: "100%" }}>
      <Card
        variant='borderless'
        style={{
          borderRadius: museRadius.card,
          background:
            mode === "expense"
              ? museColors.danger
              : museColors.success,
          boxShadow: museShadow.card,
        }}
        styles={{ body: { padding: 20 } }}
      >
        <Space orientation='vertical' size={10} style={{ width: "100%" }}>
          <Title level={4} style={{ margin: 0, color: museColors.bgLayout }}>
            {editingTransaction
              ? mode === "expense"
                ? "Edit Pengeluaran Kas Kelas"
                : "Edit Pembayaran Kas Kelas"
              : mode === "expense"
                ? "Catat Pengeluaran Kas Kelas"
                : "Catat Pembayaran Kas Kelas"}
          </Title>
          <Text style={{ color: "rgba(255,255,255,0.86)" }}>
            {mode === "expense"
              ? "Masukkan detail pengeluaran untuk memastikan saldo kas kelas tetap tercatat akurat."
              : "Catat pembayaran siswa agar status setoran dan saldo kas kelas langsung terbarui."}
          </Text>
        </Space>
      </Card>

      <Card
        variant='borderless'
        style={{
          borderRadius: museRadius.card,
          border: `1px solid ${museColors.divider}`,
        }}
        styles={{ body: { padding: 18 } }}
      >
        <Form form={form} layout='vertical' onFinish={onSubmit}>
          <Alert
            showIcon
            type={mode === "expense" ? "warning" : "success"}
            style={{ marginBottom: 16, borderRadius: museRadius.card }}
            title={
              mode === "expense"
                ? "Pengeluaran akan mengurangi saldo kas kelas."
                : "Pemasukan akan menandai siswa sebagai sudah membayar pada periode aktif."
            }
          />

          {mode === "income" ? (
            <Form.Item
              name='student_id'
              label='Siswa Pembayar'
              rules={[{ required: true, message: "Siswa wajib dipilih" }]}
            >
              <Select
                showSearch={{ optionFilterProp: "label" }}
                options={selectableStudents.map((item) => ({
                  value: item.student_id,
                  label: `${item.student_name}${item.nis ? ` (${item.nis})` : ""}`,
                }))}
                placeholder='Pilih siswa'
                virtual={false}
              />
            </Form.Item>
          ) : (
            <Form.Item
              name='description'
              label='Keperluan Pengeluaran'
              rules={[
                {
                  required: true,
                  message: "Keperluan pengeluaran wajib diisi",
                },
              ]}
            >
              <Input placeholder='Contoh: Beli sapu kelas' />
            </Form.Item>
          )}

          <Form.Item
            name='amount'
            label='Nominal'
            rules={[{ required: true, message: "Nominal wajib diisi" }]}
          >
            <InputNumber {...rupiahInputProps} placeholder='Rp 0' />
          </Form.Item>
        </Form>
      </Card>
    </Space>
  </Modal>
);

export default StudentContributionTransactionModal;
