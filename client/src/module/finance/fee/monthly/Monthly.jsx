import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Form, Card, Space, Tabs, Typography, message } from "antd";
import { motion } from "framer-motion";
import {
  BarChart3,
  CreditCard,
  ReceiptText,
  Sparkles,
} from "lucide-react";

import {
  useAddMonthlyTariffMutation,
  useAddMonthlyPaymentMutation,
  useDeleteMonthlyPaymentMutation,
  useDeleteMonthlyTariffMutation,
  useGetMonthlyOptionsQuery,
  useGetMonthlyPaymentsQuery,
  useGetMonthlyTariffsQuery,
  useUpdateMonthlyPaymentMutation,
  useUpdateMonthlyTariffMutation,
} from "../../../../service/finance/ApiMonthly";
import { LoadApp } from "../../../../components";
import { currentMonth } from "./constants";
import MonthlyHeader from "./components/MonthlyHeader";
import MonthlyPaymentModal from "./components/MonthlyPaymentModal";
import MonthlySummaryCards from "./components/MonthlySummaryCards";
import MonthlyFilters from "./components/MonthlyFilters";
import MonthlyPaymentTable from "./components/MonthlyPaymentTable";
import MonthlyTariffTable from "./components/MonthlyTariffTable";
import MonthlyReportPanel from "./components/MonthlyReportPanel";
import MonthlyTariffModal from "./components/MonthlyTariffModal";

const { Text } = Typography;
const MotionDiv = motion.div;

const containerVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.07,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const Monthly = ({ initialTab = "tariffs" }) => {
  const { user } = useSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState(initialTab);
  const [filters, setFilters] = useState({
    homebase_id: undefined,
    periode_id: undefined,
    grade_id: undefined,
    class_id: undefined,
    student_id: undefined,
    student_search: "",
    bill_month: currentMonth,
  });
  const [tariffModalOpen, setTariffModalOpen] = useState(false);
  const [editingTariff, setEditingTariff] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);

  const [tariffForm] = Form.useForm();
  const [paymentForm] = Form.useForm();
  const selectedTariffHomebaseId = Form.useWatch("homebase_id", tariffForm);
  const selectedPaymentStudentId = Form.useWatch("student_id", paymentForm);
  const selectedPaymentPeriodeId = Form.useWatch("periode_id", paymentForm);

  const { data: optionsResponse, isLoading: isLoadingOptions } =
    useGetMonthlyOptionsQuery(
      filters.homebase_id ? { homebase_id: filters.homebase_id } : undefined,
    );
  const { data: tariffOptionResponse } = useGetMonthlyOptionsQuery(
    { homebase_id: selectedTariffHomebaseId },
    { skip: !selectedTariffHomebaseId },
  );
  const { data: filterOptionsResponse, isLoading: isLoadingFilterOptions } =
    useGetMonthlyOptionsQuery({
      homebase_id: filters.homebase_id,
      periode_id: filters.periode_id,
      grade_id: filters.grade_id,
      class_id: filters.class_id,
      search: filters.student_search,
    });
  const {
    data: tariffResponse,
    isLoading: isLoadingTariffs,
    isFetching: isFetchingTariffs,
  } = useGetMonthlyTariffsQuery({
    homebase_id: filters.homebase_id,
    periode_id: filters.periode_id,
    grade_id: filters.grade_id,
  });
  const {
    data: paymentResponse,
    isLoading: isLoadingPayments,
    isFetching: isFetchingPayments,
  } = useGetMonthlyPaymentsQuery(filters);

  const [addMonthlyTariff, { isLoading: isAddingTariff }] =
    useAddMonthlyTariffMutation();
  const [updateMonthlyTariff, { isLoading: isUpdatingTariff }] =
    useUpdateMonthlyTariffMutation();
  const [deleteMonthlyTariff, { isLoading: isDeletingTariff }] =
    useDeleteMonthlyTariffMutation();
  const [addMonthlyPayment, { isLoading: isAddingPayment }] =
    useAddMonthlyPaymentMutation();
  const [updateMonthlyPayment, { isLoading: isUpdatingPayment }] =
    useUpdateMonthlyPaymentMutation();
  const [deleteMonthlyPayment, { isLoading: isDeletingPayment }] =
    useDeleteMonthlyPaymentMutation();

  const options = optionsResponse?.data || {};
  const tariffOptions = tariffOptionResponse?.data || options;
  const filterOptions = filterOptionsResponse?.data || {};
  const homebases = useMemo(() => options.homebases || [], [options.homebases]);
  const periodes = useMemo(() => options.periodes || [], [options.periodes]);
  const grades = useMemo(() => options.grades || [], [options.grades]);
  const months = useMemo(() => options.months || [], [options.months]);
  const mainClasses = useMemo(
    () => filterOptions.classes || [],
    [filterOptions.classes],
  );
  const mainStudents = useMemo(
    () => filterOptions.students || [],
    [filterOptions.students],
  );
  const tariffs = tariffResponse?.data || [];
  const payments = paymentResponse?.data || [];
  const paymentSummary = paymentResponse?.summary || {};
  const paymentStudents = [...mainStudents].sort((left, right) =>
    String(left.full_name || "").localeCompare(
      String(right.full_name || ""),
      "id",
      {
        sensitivity: "base",
      },
    ),
  );

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!filters.homebase_id && options.selected_homebase_id) {
      setFilters((previous) => ({
        ...previous,
        homebase_id: options.selected_homebase_id,
      }));
    }
  }, [filters.homebase_id, options.selected_homebase_id]);

  useEffect(() => {
    if (!filters.periode_id && periodes.length > 0) {
      const activePeriode =
        periodes.find((item) => item.is_active) || periodes[0];
      setFilters((previous) => ({
        ...previous,
        periode_id: activePeriode?.id,
      }));
    }
  }, [filters.periode_id, periodes]);

  useEffect(() => {
    if (
      filters.class_id &&
      !mainClasses.some((item) => item.id === filters.class_id)
    ) {
      setFilters((previous) => ({
        ...previous,
        class_id: undefined,
        student_id: undefined,
      }));
    }
  }, [filters.class_id, mainClasses]);

  useEffect(() => {
    if (
      filters.student_id &&
      !mainStudents.some((item) => item.id === filters.student_id)
    ) {
      setFilters((previous) => ({
        ...previous,
        student_id: undefined,
      }));
    }
  }, [filters.student_id, mainStudents]);

  useEffect(() => {
    if (!tariffModalOpen || !selectedTariffHomebaseId) {
      return;
    }

    const currentPeriodeId = tariffForm.getFieldValue("periode_id");
    const currentGradeId = tariffForm.getFieldValue("grade_id");
    const scopedPeriodes = tariffOptions.periodes || [];
    const scopedGrades = tariffOptions.grades || [];

    if (!currentPeriodeId && scopedPeriodes.length > 0) {
      const activePeriode =
        scopedPeriodes.find((item) => item.is_active) || scopedPeriodes[0];
      tariffForm.setFieldValue("periode_id", activePeriode?.id);
    }

    if (
      currentGradeId &&
      !scopedGrades.some((item) => Number(item.id) === Number(currentGradeId))
    ) {
      tariffForm.setFieldValue("grade_id", undefined);
    }
  }, [
    selectedTariffHomebaseId,
    tariffForm,
    tariffModalOpen,
    tariffOptions.grades,
    tariffOptions.periodes,
  ]);

  const summaryCards = [
    {
      key: "total",
      title: "Total Siswa",
      value: paymentSummary.total_records || 0,
      prefix: "",
      note: "Jumlah siswa sesuai filter yang dipilih",
    },
    {
      key: "paid",
      title: "Sudah Lunas",
      value: paymentSummary.paid_count || 0,
      prefix: "",
      note: "Siswa yang sudah melunasi bulan terpilih",
    },
    {
      key: "unpaid",
      title: "Belum Bayar",
      value: paymentSummary.unpaid_count || 0,
      prefix: "",
      note: "Siswa yang belum melunasi bulan terpilih",
    },
    {
      key: "amount",
      title: "SPP Terkumpul",
      value: paymentSummary.paid_amount || 0,
      prefix: "Rp",
      note: "Akumulasi SPP yang sudah lunas",
    },
  ];

  const openTariffModal = (record = null) => {
    setEditingTariff(record);

    if (record) {
      tariffForm.setFieldsValue({
        homebase_id: record.homebase_id,
        periode_id: record.periode_id,
        grade_id: record.grade_id,
        amount: Number(record.amount),
        description: record.description,
        is_active: record.is_active,
      });
    } else {
      tariffForm.resetFields();
      const defaultHomebaseId =
        filters.homebase_id ||
        options.selected_homebase_id ||
        homebases[0]?.id ||
        user?.homebase_id;
      const defaultPeriode =
        tariffOptions.periodes?.find((item) => item.is_active) ||
        tariffOptions.periodes?.[0] ||
        periodes.find((item) => item.is_active) ||
        periodes[0];
      tariffForm.setFieldsValue({
        homebase_id: defaultHomebaseId,
        periode_id: filters.periode_id || defaultPeriode?.id,
        grade_id: filters.grade_id,
        is_active: true,
      });
    }

    setTariffModalOpen(true);
  };

  const closePaymentModal = () => {
    setPaymentModalOpen(false);
    setEditingPayment(null);
    paymentForm.resetFields();
  };

  const getStudentPaymentContext = (
    studentId,
    periodeId = filters.periode_id,
  ) => {
    if (!studentId) {
      return {
        student: null,
        paidMonths: [],
        currentTransactionMonths: [],
      };
    }

    const student =
      paymentStudents.find((item) => item.id === studentId) || null;
    const paymentRows = payments.filter(
      (item) =>
        Number(item.student_id) === Number(studentId) &&
        Number(item.periode_id) === Number(periodeId),
    );
    const paidMonths = [
      ...new Set(paymentRows.flatMap((item) => item.paid_months || [])),
    ].sort((left, right) => left - right);

    return {
      student,
      paidMonths,
      currentTransactionMonths: [],
    };
  };

  const openCreatePaymentModal = (record = null) => {
    const targetStudentId = record?.student_id || filters.student_id;
    const targetPeriodeId = record?.periode_id || filters.periode_id;
    const { student } = getStudentPaymentContext(
      targetStudentId,
      targetPeriodeId,
    );

    paymentForm.resetFields();
    paymentForm.setFieldsValue({
      homebase_id: filters.homebase_id,
      periode_id: targetPeriodeId,
      student_id: targetStudentId,
      grade_id: student?.grade_id || record?.grade_id,
      payment_method: undefined,
      notes: undefined,
      bill_months: record?.bill_month ? [record.bill_month] : [],
    });

    setEditingPayment(null);
    setPaymentModalOpen(true);
  };

  const openEditPaymentModal = (record) => {
    const { student } = getStudentPaymentContext(
      record.student_id,
      record.periode_id,
    );
    paymentForm.resetFields();
    paymentForm.setFieldsValue({
      homebase_id: filters.homebase_id,
      periode_id: record.periode_id,
      student_id: record.student_id,
      grade_id: student?.grade_id || record.grade_id,
      payment_method: record.payment_method,
      notes: record.notes,
      bill_months: record.bill_months || [record.bill_month].filter(Boolean),
    });

    setEditingPayment(record);
    setPaymentModalOpen(true);
  };

  const handleDeleteTariff = async (id) => {
    try {
      await deleteMonthlyTariff(id).unwrap();
      message.success("Tarif SPP berhasil dihapus");
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus tarif SPP");
    }
  };

  const handleSubmitTariff = async (values) => {
    try {
      if (editingTariff) {
        await updateMonthlyTariff({
          id: editingTariff.id,
          ...values,
        }).unwrap();
        message.success("Tarif SPP berhasil diperbarui");
      } else {
        await addMonthlyTariff(values).unwrap();
        message.success("Tarif SPP berhasil ditambahkan");
      }

      setTariffModalOpen(false);
      setEditingTariff(null);
      tariffForm.resetFields();
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan tarif SPP");
    }
  };

  const handleDeletePayment = async (id) => {
    try {
      await deleteMonthlyPayment(id).unwrap();
      message.success("Pembayaran SPP berhasil dihapus");

      if (editingPayment?.id === id) {
        closePaymentModal();
      }
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus pembayaran SPP");
    }
  };

  const handleSubmitPayment = async (values) => {
    const selectedStudent = paymentStudents.find(
      (item) => Number(item.id) === Number(values.student_id),
    );
    const effectiveHomebaseId = Number(
      values.homebase_id || filters.homebase_id || user?.homebase_id,
    );
    const effectivePeriodeId = Number(
      values.periode_id || selectedStudent?.periode_id || filters.periode_id,
    );
    const effectiveStudentId = Number(values.student_id);
    const effectiveGradeId = Number(
      selectedStudent?.grade_id || values.grade_id,
    );

    const payload = {
      homebase_id: effectiveHomebaseId,
      periode_id: effectivePeriodeId,
      student_id: effectiveStudentId,
      grade_id: effectiveGradeId,
      payment_method: values.payment_method,
      notes: values.notes,
      bill_months: values.bill_months || [],
    };

    if (
      !payload.homebase_id ||
      !payload.periode_id ||
      !payload.student_id ||
      !payload.grade_id
    ) {
      message.error(
        "Satuan, periode aktif, siswa, atau tingkat belum sinkron. Pilih siswa dari data yang tampil lalu coba lagi.",
      );
      return;
    }

    try {
      if (editingPayment?.id) {
        await updateMonthlyPayment({
          id: editingPayment.id,
          ...payload,
        }).unwrap();
        message.success("Pembayaran SPP berhasil diperbarui");
      } else {
        await addMonthlyPayment(payload).unwrap();
        message.success("Pembayaran SPP berhasil ditambahkan");
      }

      closePaymentModal();
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan pembayaran SPP");
    }
  };

  const paymentStudentContext = getStudentPaymentContext(
    selectedPaymentStudentId || editingPayment?.student_id,
    selectedPaymentPeriodeId ||
      editingPayment?.periode_id ||
      filters.periode_id,
  );
  const paymentTariffAmount =
    payments.find(
      (item) =>
        Number(item.student_id) ===
          Number(selectedPaymentStudentId || editingPayment?.student_id) &&
        Number(item.periode_id) ===
          Number(selectedPaymentPeriodeId || filters.periode_id),
    )?.amount || 0;
  const blockedMonths = new Set(paymentStudentContext.paidMonths);
  const editingMonths = (
    editingPayment?.bill_months || [editingPayment?.bill_month].filter(Boolean)
  ).map(Number);
  editingMonths.forEach((month) => blockedMonths.delete(month));
  const availableMonths = months
    .map((item) => item.value)
    .filter((month) => !blockedMonths.has(month));

  const isPageBootstrapping =
    isLoadingOptions ||
    (!optionsResponse && !periodes.length) ||
    (Boolean(filters.periode_id) &&
      (isLoadingFilterOptions || isLoadingTariffs || isLoadingPayments) &&
      !filterOptionsResponse &&
      !tariffResponse &&
      !paymentResponse);

  if (isPageBootstrapping) {
    return <LoadApp />;
  }

  const activeHomebaseName =
    homebases.find((item) => Number(item.id) === Number(filters.homebase_id))
      ?.name ||
    user?.homebase_name ||
    user?.homebase_id ||
    "-";

  const createTabLabel = (label, icon, count, caption) => (
    <Space size={10}>
      <span
        style={{
          width: 34,
          height: 34,
          display: "grid",
          placeItems: "center",
          borderRadius: 12,
          background: "linear-gradient(135deg, #dbeafe, #dcfce7)",
          color: "#0369a1",
          border: "1px solid rgba(148,163,184,0.14)",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <div>
        <div style={{ fontWeight: 600, lineHeight: 1.2 }}>
          {label} {count !== undefined ? `(${count})` : ""}
        </div>
        <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.2 }}>
          {caption}
        </div>
      </div>
    </Space>
  );

  return (
    <MotionDiv
      variants={containerVariants}
      initial='hidden'
      animate='visible'
      style={{ width: "100%" }}
    >
      <Space vertical size={24} style={{ width: "100%", display: "flex" }}>
        <MotionDiv variants={itemVariants}>
          <MonthlyHeader
            onOpenTariff={() => {
              setActiveTab("tariffs");
              openTariffModal();
            }}
          />
        </MotionDiv>

        <MotionDiv variants={itemVariants}>
          <MonthlySummaryCards items={summaryCards} />
        </MotionDiv>

        <MotionDiv variants={itemVariants}>
          <MonthlyFilters
            filters={filters}
            setFilters={setFilters}
            homebases={homebases}
            periodes={periodes}
            grades={grades}
            classes={mainClasses}
            months={months}
          />
        </MotionDiv>

        <MotionDiv variants={itemVariants}>
          <Card
            variant='borderless'
            style={{
              borderRadius: 28,
              border: "1px solid rgba(148, 163, 184, 0.14)",
              boxShadow: "0 24px 60px rgba(15, 23, 42, 0.07)",
            }}
            styles={{ body: { padding: 12 } }}
          >
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              tabBarGutter={14}
              tabBarStyle={{ marginBottom: 20, paddingBottom: 8 }}
              items={[
                {
                  key: "tariffs",
                  label: createTabLabel(
                    "Tarif SPP",
                    <ReceiptText size={16} />,
                    tariffs.length,
                    "Pengaturan tarif per periode",
                  ),
                  children: (
                    <MonthlyTariffTable
                      tariffs={tariffs}
                      loading={isFetchingTariffs}
                      onEdit={openTariffModal}
                      onDelete={handleDeleteTariff}
                      isDeletingTariff={isDeletingTariff}
                      onCreate={() => openTariffModal()}
                    />
                  ),
                },
                {
                  key: "payments",
                  label: createTabLabel(
                    "Pembayaran SPP",
                    <CreditCard size={16} />,
                    payments.length,
                    "Monitoring status pelunasan",
                  ),
                  children: (
                    <MonthlyPaymentTable
                      payments={payments}
                      loading={isFetchingPayments}
                      selectedMonth={months.find(
                        (item) => Number(item.value) === Number(filters.bill_month),
                      )?.label}
                      homebaseName={
                        homebases.find(
                          (item) => Number(item.id) === Number(filters.homebase_id),
                        )?.name || user?.homebase_name
                      }
                      onCreatePayment={openCreatePaymentModal}
                      onEditPayment={openEditPaymentModal}
                      onDeletePayment={handleDeletePayment}
                      isDeletingPayment={isDeletingPayment}
                    />
                  ),
                },
                {
                  key: "report",
                  label: createTabLabel(
                    "Laporan SPP",
                    <BarChart3 size={16} />,
                    undefined,
                    "Ringkasan capaian per kelas",
                  ),
                  children: <MonthlyReportPanel payments={payments} />,
                },
              ]}
            />
          </Card>
        </MotionDiv>

        <MotionDiv variants={itemVariants}>
          <Card
            variant='borderless'
            style={{
              borderRadius: 20,
              border: "1px solid rgba(148,163,184,0.14)",
              background: "linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)",
            }}
            styles={{ body: { padding: "14px 16px" } }}
          >
            <Space align='center' size={8}>
              <Sparkles size={14} color='#64748b' />
              <Text type='secondary'>
                Satuan aktif: {activeHomebaseName}. Gunakan filter untuk
                mempersempit pemantauan SPP per periode, tingkat, kelas, dan siswa.
              </Text>
            </Space>
          </Card>
        </MotionDiv>
      </Space>

      <MonthlyTariffModal
        open={tariffModalOpen}
        editingTariff={editingTariff}
        onCancel={() => {
          setTariffModalOpen(false);
          setEditingTariff(null);
        }}
        onSubmit={handleSubmitTariff}
        onHomebaseChange={() => {
          tariffForm.setFieldsValue({
            periode_id: undefined,
            grade_id: undefined,
          });
        }}
        form={tariffForm}
        homebases={homebases}
        periodes={tariffOptions.periodes || []}
        grades={tariffOptions.grades || []}
        confirmLoading={isAddingTariff || isUpdatingTariff}
      />

      <MonthlyPaymentModal
        open={paymentModalOpen}
        editingPayment={editingPayment}
        onCancel={closePaymentModal}
        onSubmit={handleSubmitPayment}
        onStudentChange={(value) => {
          const selectedStudent = paymentStudents.find(
            (item) => Number(item.id) === Number(value),
          );

          paymentForm.setFieldsValue({
            grade_id: selectedStudent?.grade_id,
            periode_id: selectedStudent?.periode_id || filters.periode_id,
            homebase_id: filters.homebase_id,
          });
        }}
        form={paymentForm}
        periodes={periodes}
        students={paymentStudents}
        months={months}
        tariffAmount={paymentTariffAmount}
        availableMonths={availableMonths}
        activeHomebaseName={
          homebases.find(
            (item) => Number(item.id) === Number(filters.homebase_id),
          )?.name || user?.homebase_name
        }
        confirmLoading={isAddingPayment || isUpdatingPayment}
      />
    </MotionDiv>
  );
};

export default Monthly;
