import {
  Alert,
  Form,
  Grid,
  Input,
  Modal,
  Select,
  Space,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import { CreditCard } from "lucide-react";

import { currencyFormatter } from "../constants";

const { Text } = Typography;
const MotionDiv = motion.div;

const MonthlyPaymentModal = ({
  open,
  editingPayment,
  onCancel,
  onSubmit,
  onStudentChange,
  form,
  periodes,
  students,
  months,
  tariffAmount,
  availableMonths,
  activeHomebaseName,
  activePeriodeName,
  confirmLoading,
}) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  return (
    <Modal
      title={null}
      open={open}
      onCancel={onCancel}
      onOk={form.submit}
      confirmLoading={confirmLoading}
      destroyOnHidden
      centered
      width={isMobile ? "calc(100vw - 24px)" : 680}
      closable={false}
      styles={{
        content: {
          padding: 0,
          overflow: "hidden",
          borderRadius: isMobile ? 20 : 28,
          boxShadow: "0 28px 70px rgba(15, 23, 42, 0.18)",
        },
        body: { padding: 0 },
        footer: { padding: isMobile ? "0 16px 16px" : "0 24px 22px" },
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
          maxHeight: isMobile ? "calc(100vh - 140px)" : undefined,
          overflowY: isMobile ? "auto" : undefined,
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
              background: "linear-gradient(135deg, #2563eb, #0f766e)",
              color: "#fff",
              boxShadow: "0 18px 32px rgba(37, 99, 235, 0.22)",
              marginBottom: 14,
            }}
          >
            <CreditCard size={isMobile ? 18 : 22} />
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
            {editingPayment ? "Perbarui Pembayaran SPP" : "Input Pembayaran SPP"}
          </Text>
          <Text type='secondary' style={{ fontSize: isMobile ? 13 : 14 }}>
            Pembayaran mengikuti periode filter aktif dan tarif SPP tingkat siswa
            pada periode tersebut.
          </Text>
        </div>

        <Form form={form} layout='vertical' onFinish={onSubmit}>
          <Form.Item name='homebase_id' hidden>
            <Input />
          </Form.Item>

          <Form.Item name='grade_id' hidden>
            <Input />
          </Form.Item>

          <Form.Item
            name='periode_id'
            label='Periode'
            rules={[{ required: true, message: "Periode wajib dipilih" }]}
            extra='Periode dikunci mengikuti filter yang sedang aktif.'
          >
            <Select
              size='large'
              options={periodes.map((item) => ({
                value: item.id,
                label: item.is_active ? `${item.name} (Aktif)` : item.name,
              }))}
              virtual={false}
              disabled
              style={{ width: "100%" }}
            />
          </Form.Item>

          <Form.Item
            name='student_id'
            label='Siswa'
            rules={[{ required: true, message: "Siswa wajib dipilih" }]}
          >
            <Select
              size='large'
              showSearch
              optionFilterProp='label'
              placeholder={
                students.length
                  ? "Pilih siswa"
                  : "Tidak ada siswa pada periode filter ini"
              }
              options={students.map((item) => ({
                value: item.id,
                label: `${item.grade_name || "-"} | ${item.class_name || "-"} | ${item.full_name}${item.nis ? ` (${item.nis})` : ""}`,
              }))}
              onChange={onStudentChange}
              virtual={false}
              disabled={students.length <= 1}
              style={{ width: "100%" }}
            />
          </Form.Item>

          <Space direction='vertical' size={2} style={{ marginBottom: 12 }}>
            {activePeriodeName ? (
              <Text type='secondary'>
                Periode filter: {activePeriodeName}
              </Text>
            ) : null}
            {activeHomebaseName ? (
              <Text type='secondary'>Satuan aktif: {activeHomebaseName}</Text>
            ) : null}
          </Space>

          <Alert
            type={tariffAmount > 0 ? "info" : "warning"}
            showIcon
            style={{ marginBottom: 16, borderRadius: 16 }}
            message={
              tariffAmount > 0
                ? `Tarif SPP periode ini ${currencyFormatter.format(tariffAmount)} per bulan`
                : activePeriodeName
                  ? `Tarif SPP untuk tingkat siswa pada periode ${activePeriodeName} belum tersedia`
                  : "Tarif SPP untuk periode filter ini belum tersedia"
            }
          />

          <Form.Item
            name='bill_months'
            label='Bulan yang Dibayar'
            rules={[{ required: true, message: "Pilih minimal satu bulan" }]}
          >
            <Select
              size='large'
              mode='multiple'
              placeholder='Pilih bulan'
              options={months
                .filter((month) => availableMonths.includes(month.value))
                .map((item) => ({
                  value: item.value,
                  label: item.label,
                }))}
              disabled={tariffAmount <= 0}
              virtual={false}
              style={{ width: "100%" }}
            />
          </Form.Item>

          <Space direction='vertical' size={2} style={{ marginBottom: 16 }}>
            <Text type='secondary' style={{ fontSize: isMobile ? 12 : 14 }}>
              Bulan yang masih tersedia:{" "}
              {months
                .filter((month) => availableMonths.includes(month.value))
                .map((month) => month.label)
                .join(", ") || "-"}
            </Text>
          </Space>

          <Form.Item name='payment_method' label='Metode Pembayaran'>
            <Select
              size='large'
              placeholder='Pilih metode pembayaran'
              options={[
                { value: "Cash", label: "Cash" },
                { value: "Transfer", label: "Transfer" },
              ]}
              virtual={false}
              style={{ width: "100%" }}
            />
          </Form.Item>

          <Form.Item name='notes' label='Catatan'>
            <Input.TextArea rows={3} placeholder='Opsional' />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
};

export default MonthlyPaymentModal;
