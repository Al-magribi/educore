import { useMemo, useState } from "react";
import {
  Button,
  Card,
  Flex,
  Form,
  Grid,
  Modal,
  Space,
  Steps,
  Tag,
  Typography,
  message,
} from "antd";
import { motion } from "framer-motion";
import { CreditCard, ReceiptText } from "lucide-react";

import TransactionStepConfirm from "../../transaction/components/TransactionStepConfirm.jsx";
import TransactionStepOther from "../../transaction/components/TransactionStepOther.jsx";
import { currencyFormatter } from "../../transaction/components/transactionFormShared.jsx";

const { Text } = Typography;
const MotionDiv = motion.div;

const OthersPaymentModal = ({
  open,
  selectedCharge,
  form,
  student,
  otherCharges,
  otherPaymentSelections,
  selectedOtherPayments,
  selectedOtherTotal,
  loadingCharges,
  confirmLoading,
  onCancel,
  onSubmit,
  onOtherPaymentAmountChange,
}) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [currentStep, setCurrentStep] = useState(0);

  const steps = useMemo(
    () => [
      {
        title: isMobile ? "Bayar" : "Nominal Pembayaran",
        icon: <ReceiptText size={14} />,
      },
      {
        title: "Konfirmasi",
        icon: <CreditCard size={14} />,
      },
    ],
    [isMobile],
  );

  const handleNext = () => {
    if (selectedOtherTotal <= 0) {
      message.warning("Isi nominal pembayaran terlebih dahulu");
      return;
    }
    setCurrentStep(1);
  };

  const handleFinish = async () => {
    try {
      const values = await form.validateFields();
      if (selectedOtherTotal <= 0) {
        message.warning("Isi nominal pembayaran terlebih dahulu");
        return;
      }
      onSubmit(values);
    } catch {
      message.warning("Lengkapi data pembayaran terlebih dahulu");
    }
  };

  const handleCancel = () => {
    setCurrentStep(0);
    onCancel();
  };

  return (
    <Modal
      open={open}
      title={null}
      onCancel={handleCancel}
      width={screens.lg ? 920 : "calc(100vw - 20px)"}
      style={{ top: isMobile ? 8 : 20 }}
      destroyOnHidden
      footer={null}
      afterOpenChange={(isOpen) => {
        if (!isOpen) {
          setCurrentStep(0);
        }
      }}
      styles={{
        content: {
          padding: 0,
          overflow: "hidden",
          borderRadius: isMobile ? 20 : 28,
          boxShadow: "0 28px 70px rgba(15, 23, 42, 0.18)",
        },
        body: {
          padding: 0,
          maxHeight: isMobile ? "calc(100vh - 16px)" : undefined,
          overflowY: isMobile ? "auto" : undefined,
        },
      }}
      modalRender={(modalNode) => (
        <MotionDiv
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          {modalNode}
        </MotionDiv>
      )}
    >
      <div
        style={{
          padding: isMobile ? 14 : 22,
          background: "linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)",
        }}
      >
        <Form form={form} layout='vertical' preserve>
          <Space direction='vertical' size={isMobile ? 14 : 18} style={{ width: "100%" }}>
            <Card
              variant='borderless'
              style={{
                borderRadius: isMobile ? 16 : 20,
                background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
              }}
              styles={{ body: { padding: isMobile ? 14 : 18 } }}
            >
              <Flex justify='space-between' align='flex-start' gap={12} wrap='wrap'>
                <Space direction='vertical' size={4} style={{ minWidth: 0, flex: 1 }}>
                  <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
                    Input Pembayaran Lainnya
                  </Text>
                  <Text strong style={{ color: "#fff", fontSize: isMobile ? 16 : 18 }}>
                    {selectedCharge?.type_name || "Pembayaran Lainnya"}
                  </Text>
                  <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 13 }}>
                    {student?.student_name || selectedCharge?.student_name || "-"}
                    {student?.nis || selectedCharge?.nis
                      ? ` · NIS ${student?.nis || selectedCharge?.nis}`
                      : ""}
                  </Text>
                </Space>
                <Space wrap size={[6, 6]}>
                  <Tag color='cyan' style={{ borderRadius: 999, margin: 0, fontWeight: 600 }}>
                    Modal Transaksi
                  </Tag>
                  <Tag color='blue' style={{ borderRadius: 999, margin: 0, fontWeight: 600 }}>
                    Sisa{" "}
                    {currencyFormatter.format(
                      Number(selectedCharge?.remaining_amount || 0),
                    )}
                  </Tag>
                </Space>
              </Flex>
            </Card>

            <Steps
              size='small'
              current={currentStep}
              items={steps.map((step) => ({
                title: step.title,
                icon: step.icon,
              }))}
            />

            <div style={{ display: currentStep === 0 ? "block" : "none" }}>
              <TransactionStepOther
                otherCharges={otherCharges}
                otherPaymentSelections={otherPaymentSelections}
                onOtherPaymentAmountChange={onOtherPaymentAmountChange}
                loading={loadingCharges}
              />
            </div>

            <div style={{ display: currentStep === 1 ? "block" : "none" }}>
              <TransactionStepConfirm
                student={{
                  student_name: student?.student_name || selectedCharge?.student_name,
                  nis: student?.nis || selectedCharge?.nis,
                  class_name: student?.class_name || selectedCharge?.class_name,
                  grade_name: student?.grade_name || selectedCharge?.grade_name,
                  periode_name:
                    student?.periode_name || selectedCharge?.periode_name,
                }}
                monthlySelection={[]}
                unpaidMonths={[]}
                tariffAmount={0}
                selectedOtherPayments={selectedOtherPayments}
                totalMonthlyAmount={0}
                selectedOtherTotal={selectedOtherTotal}
                grandTotal={selectedOtherTotal}
              />
            </div>

            <Flex justify='space-between' gap={10} wrap='wrap'>
              <Button onClick={handleCancel} block={isMobile}>
                Batal
              </Button>
              <Space wrap style={{ marginLeft: isMobile ? 0 : "auto" }}>
                {currentStep > 0 ? (
                  <Button onClick={() => setCurrentStep(0)} block={isMobile}>
                    Kembali
                  </Button>
                ) : null}
                {currentStep === 0 ? (
                  <Button type='primary' onClick={handleNext} block={isMobile}>
                    Lanjut Konfirmasi
                  </Button>
                ) : (
                  <Button
                    type='primary'
                    loading={confirmLoading}
                    onClick={handleFinish}
                    block={isMobile}
                  >
                    Simpan Pembayaran
                  </Button>
                )}
              </Space>
            </Flex>
          </Space>
        </Form>
      </div>
    </Modal>
  );
};

export default OthersPaymentModal;
