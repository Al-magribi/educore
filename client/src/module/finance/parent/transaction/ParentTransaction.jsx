import { useState } from "react";
import { Alert, Card, Space, Tabs, Typography } from "antd";
import { motion } from "framer-motion";
import { CreditCard, ReceiptText } from "lucide-react";

import { LoadApp } from "../../../../components";
import {
  useGetParentTransactionInvoiceQuery,
  useGetParentTransactionOverviewQuery,
} from "../../../../service/finance/ApiParentTransaction";
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

const ParentTransaction = () => {
  const [selectedStudentId, setSelectedStudentId] = useState();
  const [selectedPeriodeId, setSelectedPeriodeId] = useState();
  const [activeTab, setActiveTab] = useState("spp");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);

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
  const resolvedStudentId = selectedStudentId || payload.selected_student_id;
  const resolvedPeriodeId = selectedPeriodeId || payload.selected_periode_id;

  const {
    data: invoiceResponse,
    isFetching: isFetchingInvoice,
  } = useGetParentTransactionInvoiceQuery(selectedInvoiceId, {
    skip: !selectedInvoiceId,
  });

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
          onOpenInvoice={setSelectedInvoiceId}
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
          onOpenInvoice={setSelectedInvoiceId}
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
        <Space direction='vertical' size={24} style={{ width: "100%", display: "flex" }}>
          <ParentTransactionHero student={student} summary={summary} />

          <ParentStudentSelector
            childrenOptions={children}
            selectedStudentId={resolvedStudentId}
            selectedPeriodeId={resolvedPeriodeId}
            periodes={periodes}
            onStudentChange={handleStudentChange}
            onPeriodeChange={setSelectedPeriodeId}
          />

          {error ? (
            <Alert
              type='error'
              showIcon
              message='Gagal memuat data pembayaran'
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
              message='Memperbarui data pembayaran'
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
            <Space direction='vertical' size={18} style={{ width: "100%" }}>
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
        open={Boolean(selectedInvoiceId)}
        invoiceId={selectedInvoiceId}
        invoiceData={invoiceData}
        loading={isFetchingInvoice}
        onClose={() => setSelectedInvoiceId(null)}
      />
    </>
  );
};

export default ParentTransaction;
