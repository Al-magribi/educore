import { useState } from "react";
import { Alert, Card, Space, Tabs, Typography, message } from "antd";
import { motion } from "framer-motion";
import { Building2, CreditCard, Landmark, ReceiptText } from "lucide-react";

import { LoadApp } from "../../../../components";
import {
  useCreateParentTransactionPaymentMutation,
  useGetParentTransactionInvoiceQuery,
  useGetParentTransactionOverviewQuery,
} from "../../../../service/finance/ApiParentTransaction";
import ParentPaymentCheckoutModal from "./components/ParentPaymentCheckoutModal";
import ParentInvoiceModal from "./components/ParentInvoiceModal";
import ParentPaymentList from "./components/ParentPaymentList";
import ParentStudentSelector from "./components/ParentStudentSelector";
import ParentSummaryCards from "./components/ParentSummaryCards";
import ParentTransactionHero from "./components/ParentTransactionHero";

const { Paragraph } = Typography;
const MotionDiv = motion.div;

const containerVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.08,
    },
  },
};

const getPaymentSetupAlert = (paymentSetup, student) => {
  if (paymentSetup.mode === "midtrans") {
    return {
      type: "success",
      icon: <CreditCard size={16} />,
      title: "Pembayaran online aktif",
      description: `Satuan ${student?.homebase_name || "siswa"} menggunakan Midtrans. Tombol Bayar akan mengarahkan ke checkout Midtrans secara otomatis.`,
    };
  }

  if (paymentSetup.mode === "bank_transfer") {
    const bankAccountCount = Number(paymentSetup?.bank_accounts?.length || 0);

    return {
      type: "info",
      icon: <Landmark size={16} />,
      title: "Pembayaran menggunakan rekening bank",
      description: `Midtrans sedang tidak aktif. Pilih salah satu dari ${bankAccountCount} rekening aktif yang tersedia dan unggah bukti transfer agar admin keuangan dapat memverifikasi pembayaran.`,
    };
  }

  return {
    type: "warning",
    icon: <Building2 size={16} />,
    title: "Metode pembayaran belum tersedia",
    description:
      "Midtrans dan transfer bank sedang tidak tersedia untuk satuan siswa ini. Tombol bayar akan dinonaktifkan sampai pengaturan keuangan dilengkapi.",
  };
};

const ParentTransaction = () => {
  const [selectedStudentId, setSelectedStudentId] = useState();
  const [selectedPeriodeId, setSelectedPeriodeId] = useState();
  const [activeTab, setActiveTab] = useState("spp");
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedPaymentItem, setSelectedPaymentItem] = useState(null);

  const {
    data: overviewResponse,
    isLoading,
    isFetching,
    error,
  } = useGetParentTransactionOverviewQuery({
    student_id: selectedStudentId,
    periode_id: selectedPeriodeId,
  });

  const payload = overviewResponse?.data || {};
  const children = payload.children || [];
  const student = payload.student || null;
  const periodes = payload.periodes || [];
  const summary = payload.summary || {};
  const sppItems = payload.spp_items || [];
  const otherItems = payload.other_items || [];
  const paymentSetup = payload.payment_setup || { mode: "unavailable" };
  const paymentSetupAlert = getPaymentSetupAlert(paymentSetup, student);
  const resolvedStudentId = selectedStudentId || payload.selected_student_id;
  const resolvedPeriodeId = selectedPeriodeId || payload.selected_periode_id;
  const [createParentTransactionPayment, { isLoading: isSubmittingPayment }] =
    useCreateParentTransactionPaymentMutation();

  const { data: invoiceResponse, isFetching: isFetchingInvoice } =
    useGetParentTransactionInvoiceQuery(
      selectedInvoice
        ? {
            invoiceId: selectedInvoice.invoice_id,
            invoiceItemId: selectedInvoice.invoice_item_id,
          }
        : undefined,
      {
        skip: !selectedInvoice?.invoice_id,
      },
    );

  const invoiceData = invoiceResponse?.data || null;

  const tabItems = [
    {
      key: "spp",
      label: "SPP",
      children: (
        <ParentPaymentList
          title='Tagihan SPP Bulanan'
          description='Seluruh bulan aktif pada periode siswa ditampilkan lengkap dengan status pembayaran dan akses invoice.'
          items={sppItems}
          emptyTitle='Belum ada tagihan SPP pada periode ini.'
          paymentEnabled={paymentSetup.mode !== "unavailable"}
          onOpenInvoice={setSelectedInvoice}
          onPay={(item) =>
            setSelectedPaymentItem({
              ...item,
              checkout_key: `${item.key || item.invoice_id || item.charge_id || item.bill_month}-${Date.now()}`,
            })
          }
        />
      ),
    },
    {
      key: "other",
      label: "Pembayaran Lainnya",
      children: (
        <ParentPaymentList
          title='Pembayaran Lainnya dan Cicilan'
          description='Pantau tagihan non-SPP, progres cicilan, dan buka invoice resmi untuk item yang sudah diterbitkan.'
          items={otherItems}
          emptyTitle='Belum ada pembayaran lainnya pada periode ini.'
          paymentEnabled={paymentSetup.mode !== "unavailable"}
          onOpenInvoice={setSelectedInvoice}
          onPay={(item) =>
            setSelectedPaymentItem({
              ...item,
              checkout_key: `${item.key || item.invoice_id || item.charge_id || item.bill_month}-${Date.now()}`,
            })
          }
        />
      ),
    },
  ];

  const handleStudentChange = (value) => {
    setSelectedStudentId(value);
    const selectedChild = children.find(
      (item) => Number(item.student_id) === Number(value),
    );
    setSelectedPeriodeId(selectedChild?.active_periode_id);
  };

  const handlePaymentSubmit = async ({
    item,
    paymentMode,
    bankAccountId,
    proofFile,
    paymentAmount,
  }) => {
    const formData = new FormData();

    formData.append("student_id", String(resolvedStudentId));
    formData.append("periode_id", String(resolvedPeriodeId));
    formData.append("item_type", String(item.item_type || ""));

    if (item.item_type === "spp" && item.bill_month) {
      formData.append("bill_month", String(item.bill_month));
    }

    if (item.charge_id) {
      formData.append("charge_id", String(item.charge_id));
    }

    if (item.component_id) {
      formData.append("component_id", String(item.component_id));
    }

    if (item.item_type === "other" && paymentAmount) {
      formData.append("payment_amount", String(paymentAmount));
    }

    if (paymentMode === "bank_transfer") {
      formData.append("bank_account_id", String(bankAccountId));
      if (proofFile) {
        formData.append("proof_file", proofFile);
      }
    }

    try {
      const response = await createParentTransactionPayment(formData).unwrap();
      const paymentData = response?.data || {};

      if (paymentData.method === "midtrans" && paymentData.snap_redirect_url) {
        message.success("Checkout Midtrans berhasil dibuat");
        window.open(
          paymentData.snap_redirect_url,
          "_blank",
          "noopener,noreferrer",
        );
      } else if (paymentData.method === "bank_transfer") {
        message.success("Bukti transfer berhasil dikirim");
      } else {
        message.success(response?.message || "Pembayaran berhasil diproses");
      }

      setSelectedPaymentItem(null);
    } catch (paymentError) {
      message.error(
        paymentError?.data?.message || "Gagal memproses pembayaran tagihan",
      );
    }
  };

  if (isLoading && !overviewResponse) {
    return <LoadApp />;
  }

  return (
    <>
      <MotionDiv
        variants={containerVariants}
        initial='hidden'
        animate='visible'
        style={{ width: "100%" }}
      >
        <Space vertical size={24} style={{ width: "100%", display: "flex" }}>
          <ParentTransactionHero student={student} summary={summary} />

          <ParentStudentSelector
            childrenOptions={children}
            selectedStudentId={resolvedStudentId}
            selectedPeriodeId={resolvedPeriodeId}
            periodes={periodes}
            onStudentChange={handleStudentChange}
            onPeriodeChange={setSelectedPeriodeId}
          />

          <Alert
            type={paymentSetupAlert.type}
            showIcon
            icon={paymentSetupAlert.icon}
            title={paymentSetupAlert.title}
            description={paymentSetupAlert.description}
            style={{ borderRadius: 20 }}
          />

          {error ? (
            <Alert
              type='error'
              showIcon
              title='Gagal memuat data pembayaran'
              description={
                error?.data?.message ||
                "Terjadi kendala saat mengambil data transaksi orang tua."
              }
              style={{ borderRadius: 20 }}
            />
          ) : null}

          {isFetching ? (
            <Alert
              type='info'
              showIcon
              title='Memperbarui data pembayaran'
              description='Ringkasan, daftar SPP, dan pembayaran lainnya sedang disegarkan sesuai anak atau periode yang dipilih.'
              style={{ borderRadius: 20 }}
            />
          ) : null}

          <ParentSummaryCards summary={summary} />

          <Card
            variant='borderless'
            style={{
              borderRadius: 28,
              border: "1px solid rgba(148,163,184,0.14)",
              boxShadow: "0 22px 48px rgba(15,23,42,0.06)",
              background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
            }}
            styles={{ body: { padding: 22 } }}
          >
            <Space vertical size={18} style={{ width: "100%" }}>
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 8,
                    color: "#0f766e",
                    fontWeight: 700,
                  }}
                >
                  {activeTab === "spp" ? (
                    <CreditCard size={18} />
                  ) : (
                    <ReceiptText size={18} />
                  )}
                  <span>Detail Pembayaran</span>
                </div>
                <Paragraph type='secondary' style={{ marginBottom: 0 }}>
                  Setiap item menampilkan status lunas, cicilan, atau belum
                  dibayar, sekaligus tombol invoice ketika dokumennya sudah
                  tersedia.
                </Paragraph>
              </div>

              <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={tabItems}
                destroyInactiveTabPane={false}
              />
            </Space>
          </Card>
        </Space>
      </MotionDiv>

      <ParentInvoiceModal
        open={Boolean(selectedInvoice)}
        invoiceId={selectedInvoice?.invoice_id || null}
        invoiceData={invoiceData}
        loading={isFetchingInvoice}
        onClose={() => setSelectedInvoice(null)}
      />

      <ParentPaymentCheckoutModal
        key={selectedPaymentItem?.checkout_key || "parent-payment-checkout"}
        open={Boolean(selectedPaymentItem)}
        item={selectedPaymentItem}
        student={student}
        paymentSetup={paymentSetup}
        submitting={isSubmittingPayment}
        onClose={() => setSelectedPaymentItem(null)}
        onSubmit={handlePaymentSubmit}
      />
    </>
  );
};

export default ParentTransaction;
