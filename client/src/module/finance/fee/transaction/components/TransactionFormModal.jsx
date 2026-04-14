import { useMemo, useState } from "react";
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
  Typography,
  message,
} from "antd";

import TransactionStepConfirm from "./TransactionStepConfirm.jsx";
import TransactionStepOther from "./TransactionStepOther.jsx";
import TransactionStepSpp from "./TransactionStepSpp.jsx";
import TransactionStepStudent from "./TransactionStepStudent.jsx";
import { currencyFormatter } from "./transactionFormShared.jsx";

const { Text } = Typography;

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
  const [currentStep, setCurrentStep] = useState(0);

  const monthlySelection = Form.useWatch("bill_months", form) || [];

  const steps = useMemo(
    () => [
      { title: "Data Siswa" },
      { title: "Pembayaran SPP" },
      { title: "Pembayaran Lainnya" },
      { title: "Konfirmasi" },
    ],
    [],
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
  const handleReset = () => {
    setCurrentStep(0);
    onReset();
  };

  return (
    <Modal
      open={open}
      title={modalTitle}
      onCancel={onCancel}
      width={screens.lg ? 1120 : "100%"}
      style={{ top: 20 }}
      destroyOnHidden
      footer={null}
    >
      <Spin spinning={loadingOpen}>
        <Form form={form} layout='vertical' preserve>
          <Space direction='vertical' size={20} style={{ width: "100%" }}>
            <Card
              bordered={false}
              style={{
                borderRadius: 20,
                background:
                  "linear-gradient(135deg, rgba(248, 250, 252, 0.98), rgba(241, 245, 249, 0.96))",
              }}
            >
              <Flex justify='space-between' align='center' wrap='wrap' gap={12}>
                <Space direction='vertical' size={2}>
                  <Text strong style={{ fontSize: 18, color: "#0f172a" }}>
                    {modalTitle}
                  </Text>
                  <Text type='secondary'>
                    Wizard 4 langkah untuk input pembayaran siswa yang aman dan
                    cepat.
                  </Text>
                </Space>
                <Text strong style={{ color: "#2563eb", fontSize: 20 }}>
                  {currencyFormatter.format(grandTotal)}
                </Text>
              </Flex>
            </Card>

            <Steps
              current={currentStep}
              items={steps}
              responsive
              size={screens.md ? "default" : "small"}
            />

            {isStudentContextLoading ? (
              <Alert
                type='info'
                showIcon
                message='Memuat konteks tagihan siswa'
                description='Sistem sedang mengambil data SPP dan pembayaran lainnya untuk siswa terpilih.'
              />
            ) : null}

            {currentStep > 0 && student ? (
              <Card
                bordered={false}
                style={{
                  borderRadius: 18,
                  background:
                    "linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.95))",
                }}
                styles={{ body: { padding: 18 } }}
              >
                <Flex justify='space-between' align='center' wrap='wrap' gap={16}>
                  <Space size={14} align='start'>
                    <Avatar
                      size={48}
                      style={{ background: "#2563eb", fontWeight: 700 }}
                    >
                      {(student.student_name || student.full_name || "?")
                        .slice(0, 1)
                        .toUpperCase()}
                    </Avatar>
                    <Space direction='vertical' size={2}>
                      <Text strong style={{ color: "#ffffff", fontSize: 16 }}>
                        {student.student_name || student.full_name}
                      </Text>
                      <Text style={{ color: "rgba(255,255,255,0.72)" }}>
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
                monthlySelection={monthlySelection}
                unpaidMonths={unpaidMonths}
                tariffAmount={tariffAmount}
                selectedOtherPayments={selectedOtherPayments}
                totalMonthlyAmount={totalMonthlyAmount}
                selectedOtherTotal={selectedOtherTotal}
                grandTotal={grandTotal}
              />
            </div>

            <Flex justify='space-between' align='center' wrap='wrap' gap={12}>
              <Space wrap>
                <Button onClick={handleReset}>Reset</Button>
                <Button onClick={onCancel}>Batal</Button>
              </Space>

              <Space wrap>
                {currentStep > 0 ? (
                  <Button
                    onClick={() => setCurrentStep((previous) => previous - 1)}
                  >
                    Sebelumnya
                  </Button>
                ) : null}

                {currentStep < steps.length - 1 ? (
                  <Button type='primary' onClick={handleNext}>
                    Lanjut
                  </Button>
                ) : (
                  <Button
                    type='primary'
                    loading={confirmLoading}
                    onClick={handleFinish}
                  >
                    Simpan Transaksi
                  </Button>
                )}
              </Space>
            </Flex>
          </Space>
        </Form>
      </Spin>
    </Modal>
  );
};

export default TransactionFormModal;
