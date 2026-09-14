import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Flex,
  Form,
  Grid,
  Modal,
  Space,
  Spin,
  Steps,
  Tag,
  Typography,
  message,
} from "antd";
import { motion } from "framer-motion";
import { CreditCard, ReceiptText, UserRound } from "lucide-react";

import TransactionStepConfirm from "./TransactionStepConfirm.jsx";
import TransactionStepOther from "./TransactionStepOther.jsx";
import TransactionStepSpp from "./TransactionStepSpp.jsx";
import TransactionStepStudent from "./TransactionStepStudent.jsx";
import { currencyFormatter } from "./transactionFormShared.jsx";

const { Text } = Typography;
const MotionDiv = motion.div;

const stepVisibilityStyle = (active) => ({
  display: active ? "block" : "none",
});

const TransactionFormModal = ({
  open,
  loadingOpen,
  isStudentOptionsLoading,
  isStudentContextLoading,
  isStudentContextReady,
  form,
  editingTransaction,
  onCancel,
  onSubmit,
  onReset,
  confirmLoading,
  homebases,
  periodes,
  students,
  student,
  onStudentSelect,
  onHomebaseChange,
  onPeriodeChange,
  onStudentSearchChange,
  currentStudentSearch,
  unpaidMonths,
  tariffAmount,
  otherCharges,
  otherPaymentSelections,
  selectedOtherPayments,
  totalMonthlyAmount,
  selectedOtherTotal,
  grandTotal,
  onOtherPaymentAmountChange,
}) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [currentStep, setCurrentStep] = useState(0);

  const monthlySelection = Form.useWatch("bill_months", form) || [];
  const normalizedMonthlySelection = useMemo(
    () => monthlySelection.map((month) => Number(month)),
    [monthlySelection],
  );

  const steps = useMemo(
    () => [
      {
        title: isMobile ? "Siswa" : "Data Siswa",
        icon: <UserRound size={14} />,
      },
      {
        title: isMobile ? "SPP" : "Pembayaran SPP",
        icon: <CreditCard size={14} />,
      },
      {
        title: isMobile ? "Lainnya" : "Pembayaran Lainnya",
        icon: <ReceiptText size={14} />,
      },
      {
        title: isMobile ? "Konfirmasi" : "Konfirmasi",
        icon: <CreditCard size={14} />,
      },
    ],
    [isMobile],
  );

  const validateStep = async () => {
    if (currentStep === 0) {
      await form.validateFields(["homebase_id", "periode_id", "student_id"]);

      if (!isStudentContextReady) {
        throw new Error("Data siswa masih diproses");
      }
    }

    if (currentStep === 3 && grandTotal <= 0) {
      throw new Error("Pilih minimal satu item pembayaran");
    }
  };

  const handleNext = async () => {
    try {
      await validateStep();
      setCurrentStep((previous) => Math.min(previous + 1, steps.length - 1));
    } catch (error) {
      if (error?.message) {
        message.warning(error.message);
      }
    }
  };

  const handleFinish = async () => {
    try {
      const values = await form.validateFields();

      if (grandTotal <= 0) {
        message.warning("Pilih minimal satu item pembayaran");
        return;
      }

      onSubmit(values);
    } catch {
      message.warning("Masih ada data transaksi yang perlu dilengkapi");
    }
  };

  const modalTitle = editingTransaction
    ? "Ubah Transaksi Pembayaran"
    : "Input Transaksi Pembayaran";
  const modeTag = editingTransaction
    ? { color: "gold", label: "Mode Edit" }
    : { color: "cyan", label: "Transaksi Baru" };

  useEffect(() => {
    if (!open) {
      setCurrentStep(0);
    }
  }, [open]);

  const handleReset = () => {
    setCurrentStep(0);
    onReset();
  };

  return (
    <Modal
      open={open}
      title={null}
      onCancel={onCancel}
      width={screens.lg ? 1120 : "calc(100vw - 20px)"}
      style={{ top: isMobile ? 8 : 20 }}
      destroyOnHidden
      footer={null}
      closable={false}
      styles={{
        content: {
          padding: 0,
          overflow: "hidden",
          borderRadius: isMobile ? 20 : 30,
          boxShadow: "0 28px 70px rgba(15, 23, 42, 0.18)",
          maxHeight: isMobile ? "calc(100vh - 16px)" : undefined,
        },
        body: {
          padding: 0,
          maxHeight: isMobile ? "calc(100vh - 16px)" : undefined,
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
          padding: isMobile ? 14 : 24,
          background: "linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)",
        }}
      >
        <Spin spinning={loadingOpen}>
          <Form form={form} layout='vertical' preserve>
            <Space vertical size={isMobile ? 14 : 20} style={{ width: "100%" }}>
              <Card
                variant='borderless'
                style={{
                  borderRadius: isMobile ? 18 : 24,
                  overflow: "hidden",
                  position: "relative",
                  background:
                    "radial-gradient(circle at top left, rgba(56,189,248,0.22), transparent 28%), linear-gradient(135deg, #0f172a 0%, #1d4ed8 52%, #0f766e 100%)",
                }}
                styles={{ body: { padding: isMobile ? 14 : 20 } }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(135deg, rgba(255,255,255,0.06), transparent 42%)",
                    pointerEvents: "none",
                  }}
                />
                <Flex
                  justify='space-between'
                  align={isMobile ? "stretch" : "center"}
                  vertical={isMobile}
                  wrap='wrap'
                  gap={12}
                  style={{ position: "relative" }}
                >
                  <Space direction='vertical' size={2} style={{ minWidth: 0 }}>
                    <Tag
                      color={modeTag.color}
                      style={{
                        borderRadius: 999,
                        width: "fit-content",
                        margin: 0,
                        fontWeight: 700,
                      }}
                    >
                      {modeTag.label}
                    </Tag>
                    <Text
                      strong
                      style={{
                        fontSize: isMobile ? 17 : 20,
                        color: "#fff",
                        lineHeight: 1.3,
                      }}
                    >
                      {modalTitle}
                    </Text>
                    {!isMobile ? (
                      <Text style={{ color: "rgba(255,255,255,0.8)" }}>
                        Wizard 4 langkah untuk input pembayaran siswa yang aman
                        dan lebih nyaman dipakai.
                      </Text>
                    ) : null}
                  </Space>
                  <Text
                    strong
                    style={{
                      color: "#fff",
                      fontSize: isMobile ? 20 : 24,
                      wordBreak: "break-word",
                    }}
                  >
                    {currencyFormatter.format(grandTotal)}
                  </Text>
                </Flex>
              </Card>

              <Card
                variant='borderless'
                style={{
                  borderRadius: isMobile ? 16 : 20,
                  border: "1px solid rgba(148,163,184,0.14)",
                }}
                styles={{ body: { padding: isMobile ? 10 : 24 } }}
              >
                <Steps
                  current={currentStep}
                  items={steps}
                  responsive
                  size={screens.md ? "default" : "small"}
                  direction={screens.sm ? "horizontal" : "vertical"}
                />
              </Card>

              {isStudentContextLoading ? (
                <Alert
                  type='info'
                  showIcon
                  message='Memuat konteks tagihan siswa'
                  description='Sistem sedang mengambil data SPP dan pembayaran lainnya untuk siswa terpilih.'
                  style={{ borderRadius: 16 }}
                />
              ) : null}

              {currentStep > 0 && student ? (
                <Card
                  variant='borderless'
                  style={{
                    borderRadius: isMobile ? 16 : 20,
                    background:
                      "linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.95))",
                  }}
                  styles={{ body: { padding: isMobile ? 14 : 18 } }}
                >
                  <Flex
                    justify='space-between'
                    align='center'
                    wrap='wrap'
                    gap={16}
                  >
                    <Space size={14} align='start'>
                      <Avatar
                        size={isMobile ? 40 : 48}
                        style={{ background: "#2563eb", fontWeight: 700 }}
                      >
                        {(student.student_name || student.full_name || "?")
                          .slice(0, 1)
                          .toUpperCase()}
                      </Avatar>
                      <Space direction='vertical' size={2} style={{ minWidth: 0 }}>
                        <Text
                          strong
                          style={{
                            color: "#ffffff",
                            fontSize: isMobile ? 14 : 16,
                            wordBreak: "break-word",
                          }}
                        >
                          {student.student_name || student.full_name}
                        </Text>
                        <Text
                          style={{
                            color: "rgba(255,255,255,0.72)",
                            fontSize: isMobile ? 12 : 14,
                            wordBreak: "break-word",
                          }}
                        >
                          {`NIS ${student.nis || "-"} | ${student.grade_name || "-"} | ${student.class_name || "-"}`}
                        </Text>
                        <Text style={{ color: "rgba(255,255,255,0.72)" }}>
                          {student.periode_name || "-"}
                        </Text>
                      </Space>
                    </Space>
                  </Flex>
                </Card>
              ) : null}

              <div style={stepVisibilityStyle(currentStep === 0)}>
                <TransactionStepStudent
                  form={form}
                  homebases={homebases}
                  periodes={periodes}
                  students={students}
                  student={student}
                  editingTransaction={editingTransaction}
                  isStudentOptionsLoading={isStudentOptionsLoading}
                  onStudentSelect={onStudentSelect}
                  onHomebaseChange={onHomebaseChange}
                  onPeriodeChange={onPeriodeChange}
                  onStudentSearchChange={onStudentSearchChange}
                  currentStudentSearch={currentStudentSearch}
                />
              </div>

              <div style={stepVisibilityStyle(currentStep === 1)}>
                <TransactionStepSpp
                  form={form}
                  unpaidMonths={unpaidMonths}
                  tariffAmount={tariffAmount}
                  loading={isStudentContextLoading}
                  editingTransaction={editingTransaction}
                />
              </div>

              <div style={stepVisibilityStyle(currentStep === 2)}>
                <TransactionStepOther
                  form={form}
                  otherCharges={otherCharges}
                  otherPaymentSelections={otherPaymentSelections}
                  onOtherPaymentAmountChange={onOtherPaymentAmountChange}
                  loading={isStudentContextLoading}
                />
              </div>

              <div style={stepVisibilityStyle(currentStep === 3)}>
                <TransactionStepConfirm
                  student={student}
                  monthlySelection={normalizedMonthlySelection}
                  unpaidMonths={unpaidMonths}
                  tariffAmount={tariffAmount}
                  selectedOtherPayments={selectedOtherPayments}
                  totalMonthlyAmount={totalMonthlyAmount}
                  selectedOtherTotal={selectedOtherTotal}
                  grandTotal={grandTotal}
                />
              </div>

              <Flex
                justify='space-between'
                align={isMobile ? "stretch" : "center"}
                vertical={isMobile}
                wrap='wrap'
                gap={12}
              >
                <Space wrap style={{ width: isMobile ? "100%" : undefined }}>
                  <Button onClick={handleReset} block={isMobile}>
                    Reset
                  </Button>
                  <Button onClick={onCancel} block={isMobile}>
                    Batal
                  </Button>
                </Space>

                <Space wrap style={{ width: isMobile ? "100%" : undefined }}>
                  {currentStep > 0 ? (
                    <Button
                      onClick={() => setCurrentStep((previous) => previous - 1)}
                      block={isMobile}
                    >
                      Sebelumnya
                    </Button>
                  ) : null}

                  {currentStep < steps.length - 1 ? (
                    <Button type='primary' onClick={handleNext} block={isMobile}>
                      Lanjut
                    </Button>
                  ) : (
                    <Button
                      type='primary'
                      loading={confirmLoading}
                      onClick={handleFinish}
                      block={isMobile}
                    >
                      Simpan Transaksi
                    </Button>
                  )}
                </Space>
              </Flex>
            </Space>
          </Form>
        </Spin>
      </div>
    </Modal>
  );
};

export default TransactionFormModal;
