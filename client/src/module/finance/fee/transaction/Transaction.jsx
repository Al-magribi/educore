import { useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import dayjs from "dayjs";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Form,
  Image,
  Input,
  Modal,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { motion } from "framer-motion";

import { LoadApp } from "../../../../components";
import {
  useCreateTransactionMutation,
  useConfirmTransactionPaymentMutation,
  useDeleteTransactionMutation,
  useGetTransactionInvoiceQuery,
  useGetTransactionOptionsQuery,
  useGetTransactionsQuery,
  useUpdateTransactionMutation,
} from "../../../../service/finance/ApiTransaction";
import TransactionFormModal from "./components/TransactionFormModal";
import TransactionInvoicePanel from "./components/TransactionInvoicePanel.jsx";
import TransactionList from "./components/TransactionList";
import {
  buildOtherPaymentValue,
  getOtherPaymentSelectionKey,
} from "./components/transactionFormShared.jsx";

const MotionDiv = motion.div;
const { Text } = Typography;

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

const branchMotionProps = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
};

const resetStudentContextValue = {
  student_search: "",
  grade_id: undefined,
  class_id: undefined,
  student_id: undefined,
  bill_months: [],
  other_payments: {},
};

const formatStudentSearchLabel = (item) => {
  const fullName = item?.full_name || item?.student_name || "";
  const nis = item?.nis ? ` - ${item.nis}` : "";

  return `${fullName}${nis}`.trim();
};

const getEditableOtherPaymentItems = (transaction) =>
  (transaction?.payment_items || []).filter((item) => item.item_type === "other");

const getPrimaryInvoice = (record) =>
  (record?.invoices || []).find((invoice) => invoice?.id) || null;

const Transaction = () => {
  const { user } = useSelector((state) => state.auth);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialInvoiceId = Number(searchParams.get("invoice") || 0) || null;
  const [form] = Form.useForm();
  const [modalRequestedOpen, setModalRequestedOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [openedInvoiceId, setOpenedInvoiceId] = useState(initialInvoiceId);
  const [confirmationState, setConfirmationState] = useState({
    open: false,
    action: null,
    record: null,
  });
  const [confirmationNotes, setConfirmationNotes] = useState("");
  const [debouncedStudentSearch, setDebouncedStudentSearch] = useState("");
  const [selectedStudentOption, setSelectedStudentOption] = useState(null);
  const [otherPaymentSelectionsState, setOtherPaymentSelectionsState] =
    useState({});
  const pendingSelectedStudentSearchRef = useRef(null);
  const [transactionFilters, setTransactionFilters] = useState({
    homebase_id: undefined,
    periode_id: undefined,
    page: 1,
    limit: 10,
    search: "",
    category: undefined,
    status: undefined,
    payment_source: undefined,
  });

  const formHomebaseId = Form.useWatch("homebase_id", form);
  const periodeId = Form.useWatch("periode_id", form);
  const studentId = Form.useWatch("student_id", form);
  const studentSearch = Form.useWatch("student_search", form);
  const monthlySelection = Form.useWatch("bill_months", form) || [];
  const otherPaymentSelections = useMemo(
    () => otherPaymentSelectionsState || {},
    [otherPaymentSelectionsState],
  );
  const effectiveOptionHomebaseId =
    formHomebaseId || transactionFilters.homebase_id;

  const {
    data: optionResponse,
    isLoading: isLoadingOptions,
    isFetching: isFetchingOptions,
    refetch: refetchTransactionOptions,
  } = useGetTransactionOptionsQuery(
    {
      homebase_id: effectiveOptionHomebaseId,
      periode_id: periodeId,
      student_id: studentId,
      search: debouncedStudentSearch,
    },
    {
      refetchOnMountOrArgChange: true,
    },
  );

  const options = optionResponse?.data || {};
  const homebases = useMemo(() => options.homebases || [], [options.homebases]);
  const resolvedTransactionHomebaseId = transactionFilters.homebase_id ||
    (homebases.length === 1 ? homebases[0]?.id : undefined) ||
    (user?.homebase_id ? optionResponse?.data?.selected_homebase_id : undefined);

  const { data: transactionResponse, isLoading: isLoadingTransactions } =
    useGetTransactionsQuery(
      {
        ...transactionFilters,
        homebase_id: resolvedTransactionHomebaseId,
      },
      {
        skip: !resolvedTransactionHomebaseId,
      },
    );
  const transactions = useMemo(
    () => transactionResponse?.data || [],
    [transactionResponse?.data],
  );
  const selectedInvoiceRecord = useMemo(
    () =>
      transactions.find(
        (record) =>
          Number(getPrimaryInvoice(record)?.id) === Number(openedInvoiceId),
      ) || null,
    [openedInvoiceId, transactions],
  );
  const activeInvoiceId =
    openedInvoiceId &&
    (!isLoadingTransactions ? (selectedInvoiceRecord ? openedInvoiceId : null) : openedInvoiceId);
  const { data: invoiceResponse, isFetching: isFetchingInvoice } =
    useGetTransactionInvoiceQuery(
      {
        invoiceId: activeInvoiceId,
        homebase_id:
          selectedInvoiceRecord?.homebase_id ||
          resolvedTransactionHomebaseId,
      },
      {
        skip: !activeInvoiceId,
      },
    );
  const [createTransaction, { isLoading: isSubmitting }] =
    useCreateTransactionMutation();
  const [confirmTransactionPayment, { isLoading: isConfirmingTransaction }] =
    useConfirmTransactionPaymentMutation();
  const [updateTransaction, { isLoading: isUpdatingTransaction }] =
    useUpdateTransactionMutation();
  const [deleteTransaction, { isLoading: isDeletingTransaction }] =
    useDeleteTransactionMutation();
  const selectedHomebaseId = resolvedTransactionHomebaseId;
  const periodes = useMemo(() => options.periodes || [], [options.periodes]);
  const students = useMemo(() => options.students || [], [options.students]);
  const student = options.student || null;
  const unpaidMonths = useMemo(
    () => options.spp?.unpaid_months || [],
    [options.spp?.unpaid_months],
  );
  const tariffAmount = Number(options.spp?.tariff_amount || 0);
  const otherCharges = useMemo(
    () => options.other_charges || [],
    [options.other_charges],
  );
  const invoiceData = invoiceResponse?.data || null;
  const transactionSummary = transactionResponse?.summary || {};
  const hasStudentKeyword = Boolean(String(studentSearch || "").trim());

  const isFetchingStudentOptions =
    modalRequestedOpen &&
    Boolean(periodeId) &&
    hasStudentKeyword &&
    !studentId &&
    isFetchingOptions;
  const isResolvingStudentContext =
    modalRequestedOpen &&
    Boolean(periodeId) &&
    Boolean(studentId) &&
    isFetchingOptions;
  const isSelectedStudentContextReady =
    !studentId ||
    (!isFetchingOptions &&
      Number(student?.student_id || student?.id) === Number(studentId));
  const modalOpen = modalRequestedOpen;

  useEffect(() => {
    if (!student) {
      return;
    }

    form.setFieldsValue({
      grade_id: student.grade_id,
      class_id: student.class_id,
    });
  }, [form, student]);

  useEffect(() => {
    const nextParams = new URLSearchParams(searchParams);

    if (openedInvoiceId) {
      nextParams.set("invoice", String(openedInvoiceId));
    } else {
      nextParams.delete("invoice");
    }

    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams);
    }
  }, [openedInvoiceId, searchParams, setSearchParams]);

  useEffect(() => {
    if (!modalRequestedOpen || !effectiveOptionHomebaseId) {
      return;
    }

    refetchTransactionOptions();
  }, [
    modalRequestedOpen,
    effectiveOptionHomebaseId,
    periodeId,
    studentId,
    debouncedStudentSearch,
    refetchTransactionOptions,
  ]);

  useEffect(() => {
    const trimmedKeyword = String(studentSearch || "").trim();

    const timer = setTimeout(() => {
      setDebouncedStudentSearch(trimmedKeyword);
    }, 300);

    return () => clearTimeout(timer);
  }, [studentSearch]);

  const wizardUnpaidMonths = useMemo(() => {
    if (!editingTransaction?.bill_months?.length) {
      return unpaidMonths;
    }

    const monthMap = new Map(unpaidMonths.map((item) => [item.value, item]));
    (editingTransaction.bill_months || []).forEach((month) => {
      if (!monthMap.has(month)) {
        monthMap.set(month, {
          value: month,
          label: dayjs().month(month - 1).format("MMMM"),
        });
      }
    });

    return Array.from(monthMap.values()).sort(
      (left, right) => left.value - right.value,
    );
  }, [editingTransaction, unpaidMonths]);

  const wizardOtherCharges = useMemo(() => {
    const editingOtherItems = getEditableOtherPaymentItems(editingTransaction);

    if (editingOtherItems.length === 0) {
      return otherCharges;
    }

    const chargeMap = new Map(
      otherCharges.map((item) => [getOtherPaymentSelectionKey(item), item]),
    );

    editingOtherItems.forEach((paymentItem) => {
      const selectionKey = getOtherPaymentSelectionKey(paymentItem);
      const existingCharge = chargeMap.get(selectionKey);
      const currentPaidAmount = Number(paymentItem.amount_paid || 0);

      chargeMap.set(selectionKey, {
        ...existingCharge,
        charge_id: paymentItem.charge_id,
        type_id: paymentItem.type_id,
        type_name:
          existingCharge?.type_name ||
          paymentItem.type_name ||
          editingTransaction?.item_names?.[0] ||
          editingTransaction?.description,
        amount_due: Number(
          existingCharge?.amount_due || paymentItem.amount_due || 0,
        ),
        paid_amount: Math.max(
          Number(existingCharge?.paid_amount || 0) - currentPaidAmount,
          0,
        ),
        remaining_amount: Math.max(
          Number(existingCharge?.remaining_amount || 0) + currentPaidAmount,
          currentPaidAmount,
        ),
        description:
          existingCharge?.description || editingTransaction?.description || null,
        is_existing_charge:
          existingCharge?.is_existing_charge ?? Boolean(paymentItem.charge_id),
        status: existingCharge?.status || "unpaid",
      });
    });

    return Array.from(chargeMap.values());
  }, [editingTransaction, otherCharges]);

  const selectedOtherPayments = useMemo(
    () =>
      wizardOtherCharges
        .map((charge) => {
          const selectionKey = getOtherPaymentSelectionKey(charge);
          const selection = otherPaymentSelections?.[selectionKey];
          const amountPaid = Number(selection?.amount_paid || 0);

          if (amountPaid <= 0) {
            return null;
          }

          return {
            ...charge,
            amount_paid: amountPaid,
          };
        })
        .filter(Boolean),
    [otherPaymentSelections, wizardOtherCharges],
  );

  const totalMonthlyAmount = tariffAmount * monthlySelection.length;
  const selectedOtherTotal = selectedOtherPayments.reduce(
    (sum, item) => sum + Number(item.amount_paid || 0),
    0,
  );
  const grandTotal = totalMonthlyAmount + selectedOtherTotal;
  const resolvedStudent = useMemo(() => {
    if (student) {
      return student;
    }

    if (selectedStudentOption) {
      return {
        student_id: selectedStudentOption.id,
        student_name: selectedStudentOption.full_name,
        nis: selectedStudentOption.nis,
        grade_name: selectedStudentOption.grade_name,
        class_name: selectedStudentOption.class_name,
        periode_name: selectedStudentOption.periode_name,
      };
    }

    if (editingTransaction) {
      return {
        student_id: editingTransaction.student_id,
        student_name: editingTransaction.student_name,
        nis: editingTransaction.nis,
        grade_name: editingTransaction.grade_name,
        class_name: editingTransaction.class_name,
        periode_name: editingTransaction.periode_name,
      };
    }

    return null;
  }, [editingTransaction, selectedStudentOption, student]);

  const resetForm = () => {
    form.setFieldsValue({
      homebase_id: undefined,
      periode_id: undefined,
      ...resetStudentContextValue,
    });
    pendingSelectedStudentSearchRef.current = null;
    setOtherPaymentSelectionsState({});
    setDebouncedStudentSearch("");
    setSelectedStudentOption(null);
  };

  const closeModal = () => {
    setModalRequestedOpen(false);
    setEditingTransaction(null);
    resetForm();
  };

  const closeInvoicePanel = () => {
    setOpenedInvoiceId(null);
  };

  const openCreateModal = () => {
    setEditingTransaction(null);
    resetForm();
    setModalRequestedOpen(true);
  };

  const handleOtherPaymentAmountChange = (charge, value) => {
    const selectionKey = getOtherPaymentSelectionKey(charge);
    const numericValue = Number(value || 0);
    const nextValue = buildOtherPaymentValue(
      charge,
      otherPaymentSelectionsState?.[selectionKey],
      {
        amount_paid: numericValue > 0 ? numericValue : undefined,
      },
    );

    setOtherPaymentSelectionsState((previous) => ({
      ...previous,
      [selectionKey]: nextValue,
    }));
    form.setFieldValue(["other_payments", selectionKey], nextValue);
  };

  const handleSubmit = async (values) => {
    const currentFormValues = form.getFieldsValue(true);
    const otherPayments = selectedOtherPayments.map((item) => ({
      charge_id: item.charge_id ? Number(item.charge_id) : null,
      type_id: item.type_id ? Number(item.type_id) : null,
      amount_paid: Number(item.amount_paid || 0),
    }));

    const commonPayload = {
      homebase_id:
        currentFormValues.homebase_id || values.homebase_id || selectedHomebaseId,
      periode_id: currentFormValues.periode_id || values.periode_id,
      grade_id: currentFormValues.grade_id || values.grade_id,
      student_id: currentFormValues.student_id || values.student_id,
    };

    try {
      if (editingTransaction) {
        await updateTransaction({
          category: editingTransaction.category,
          id: editingTransaction.id,
          ...commonPayload,
          bill_months: currentFormValues.bill_months || values.bill_months || [],
          other_payments: otherPayments,
        }).unwrap();
        message.success("Transaksi pembayaran berhasil diperbarui");
      } else {
        await createTransaction({
          ...commonPayload,
          bill_months: currentFormValues.bill_months || values.bill_months || [],
          other_payments: otherPayments,
        }).unwrap();
        message.success("Transaksi pembayaran berhasil disimpan");
      }

      closeModal();
    } catch (error) {
      message.error(
        error?.data?.message || "Gagal menyimpan transaksi pembayaran",
      );
    }
  };

  const handleEditTransaction = (record) => {
    const editingOtherItems = getEditableOtherPaymentItems(record);
    const initialOtherPayments = editingOtherItems.reduce((accumulator, item) => {
      const selectionKey = getOtherPaymentSelectionKey(item);

      accumulator[selectionKey] = buildOtherPaymentValue(item, {}, {
        amount_paid: Number(item.amount_paid || 0),
      });

      return accumulator;
    }, {});

    setEditingTransaction(record);
    setSelectedStudentOption({
      id: record.student_id,
      full_name: record.student_name,
      nis: record.nis,
      grade_name: record.grade_name,
      class_name: record.class_name,
      periode_name: record.periode_name,
      grade_id: record.grade_id,
      class_id: record.class_id,
    });
    setTransactionFilters((previous) => ({
      ...previous,
      homebase_id: record.homebase_id || previous.homebase_id,
    }));
    form.setFieldsValue({
      homebase_id: record.homebase_id,
      periode_id: record.periode_id,
      student_search: formatStudentSearchLabel({
        full_name: record.student_name,
        nis: record.nis,
      }),
      grade_id: record.grade_id,
      class_id: record.class_id,
      student_id: record.student_id,
      bill_months: record.bill_months || [],
      other_payments: initialOtherPayments,
    });
    setOtherPaymentSelectionsState(initialOtherPayments);

    setModalRequestedOpen(true);
  };

  const handleDeleteCurrentTransaction = async (record) => {
    try {
      await deleteTransaction({
        category: record.category,
        id: record.id,
        homebase_id: record.homebase_id,
      }).unwrap();
      message.success("Transaksi berhasil dihapus");

      if (
        activeInvoiceId &&
        Number(getPrimaryInvoice(record)?.id) === Number(activeInvoiceId)
      ) {
        closeInvoicePanel();
      }

      if (
        editingTransaction?.category === record.category &&
        editingTransaction?.id === record.id
      ) {
        closeModal();
      }
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus transaksi");
    }
  };

  const openConfirmationModal = (record, action) => {
    setConfirmationState({
      open: true,
      action,
      record,
    });
    setConfirmationNotes(
      action === "reject"
        ? record?.notes || ""
        : "",
    );
  };

  const closeConfirmationModal = () => {
    setConfirmationState({
      open: false,
      action: null,
      record: null,
    });
    setConfirmationNotes("");
  };

  const handleConfirmTransaction = async () => {
    if (!confirmationState.record || !confirmationState.action) {
      return;
    }

    if (
      confirmationState.action === "reject" &&
      !String(confirmationNotes || "").trim()
    ) {
      message.error("Alasan penolakan wajib diisi");
      return;
    }

    try {
      await confirmTransactionPayment({
        id: confirmationState.record.id,
        homebase_id: confirmationState.record.homebase_id,
        action: confirmationState.action,
        notes: String(confirmationNotes || "").trim() || undefined,
      }).unwrap();
      message.success(
        confirmationState.action === "approve"
          ? "Pembayaran berhasil dikonfirmasi"
          : confirmationState.action === "reject"
            ? "Pembayaran berhasil ditolak"
            : "Status pembayaran berhasil dikembalikan ke pending",
      );
      closeConfirmationModal();
    } catch (error) {
      message.error(
        error?.data?.message || "Gagal memproses konfirmasi pembayaran",
      );
    }
  };

  if (isLoadingOptions && !optionResponse) {
    return <LoadApp />;
  }

  const isInvoiceOpen = Boolean(activeInvoiceId);

  return (
    <MotionDiv
      variants={containerVariants}
      initial='hidden'
      animate='visible'
      style={{ width: "100%" }}
    >
      <Space vertical size={24} style={{ width: "100%", display: "flex" }}>
        {isInvoiceOpen ? (
          <MotionDiv key='invoice-panel' {...branchMotionProps}>
            <TransactionInvoicePanel
              invoiceId={activeInvoiceId}
              invoiceData={invoiceData}
              loading={isFetchingInvoice}
              onClose={closeInvoicePanel}
            />
          </MotionDiv>
        ) : (
          <MotionDiv key='transaction-list' {...branchMotionProps}>
            <TransactionList
              user={user}
              homebases={homebases}
              periodes={periodes}
              transactions={transactions}
              transactionSummary={transactionSummary}
              transactionFilters={{
                ...transactionFilters,
                homebase_id: resolvedTransactionHomebaseId,
              }}
              setTransactionFilters={setTransactionFilters}
              loading={isLoadingTransactions}
              isDeletingTransaction={isDeletingTransaction}
              isConfirmingTransaction={isConfirmingTransaction}
              activeInvoiceId={activeInvoiceId}
              onEdit={handleEditTransaction}
              onDelete={handleDeleteCurrentTransaction}
              onViewInvoice={(invoiceId) => {
                if (!invoiceId) {
                  return;
                }

                setOpenedInvoiceId(Number(invoiceId));
              }}
              onApprove={(record) => openConfirmationModal(record, "approve")}
              onReject={(record) => openConfirmationModal(record, "reject")}
              onRevoke={(record) => openConfirmationModal(record, "revoke")}
              onCreate={openCreateModal}
            />
          </MotionDiv>
        )}

        <TransactionFormModal
          open={modalOpen}
          loadingOpen={modalRequestedOpen && isLoadingOptions && !optionResponse}
          isStudentOptionsLoading={isFetchingStudentOptions}
          isStudentContextLoading={isResolvingStudentContext}
          isStudentContextReady={isSelectedStudentContextReady}
          form={form}
          editingTransaction={editingTransaction}
          onCancel={closeModal}
          onSubmit={handleSubmit}
          onReset={() => {
            setEditingTransaction(null);
            resetForm();
          }}
          confirmLoading={isSubmitting || isUpdatingTransaction}
          homebases={homebases}
          periodes={periodes}
          students={students}
          student={resolvedStudent}
          onStudentSelect={(item) => {
            pendingSelectedStudentSearchRef.current = item
              ? formatStudentSearchLabel(item)
              : null;
            setSelectedStudentOption(item);
          }}
          onHomebaseChange={(value) => {
            pendingSelectedStudentSearchRef.current = null;
            setOtherPaymentSelectionsState({});
            setSelectedStudentOption(null);
            setTransactionFilters((prev) => ({
              ...prev,
              homebase_id: value,
              periode_id: undefined,
              page: 1,
            }));
            form.setFieldsValue({
              homebase_id: value,
              periode_id: undefined,
              ...resetStudentContextValue,
            });
          }}
          onPeriodeChange={(value) => {
            pendingSelectedStudentSearchRef.current = null;
            setOtherPaymentSelectionsState({});
            setSelectedStudentOption(null);
            setTransactionFilters((prev) => ({
              ...prev,
              homebase_id: form.getFieldValue("homebase_id"),
              periode_id: value,
              page: 1,
            }));
            form.setFieldsValue({
              periode_id: value,
              ...resetStudentContextValue,
            });
          }}
          onStudentSearchChange={(value) => {
            const keyword = String(value || "");
            const activeStudentId = form.getFieldValue("student_id");

            form.setFieldValue("student_search", keyword);

            if (pendingSelectedStudentSearchRef.current !== null) {
              const pendingKeyword = pendingSelectedStudentSearchRef.current;
              pendingSelectedStudentSearchRef.current = null;

              if (keyword === pendingKeyword || keyword === "") {
                return;
              }
            }

            if (activeStudentId) {
              setSelectedStudentOption(null);
              setOtherPaymentSelectionsState({});
              form.setFieldsValue({
                student_id: undefined,
                grade_id: undefined,
                class_id: undefined,
                bill_months: [],
                other_payments: {},
              });
            }
          }}
          currentStudentSearch={studentSearch}
          unpaidMonths={wizardUnpaidMonths}
          tariffAmount={tariffAmount}
          otherCharges={wizardOtherCharges}
          selectedOtherPayments={selectedOtherPayments}
          otherPaymentSelections={otherPaymentSelections}
          totalMonthlyAmount={totalMonthlyAmount}
          selectedOtherTotal={selectedOtherTotal}
          grandTotal={grandTotal}
          onOtherPaymentAmountChange={handleOtherPaymentAmountChange}
        />

        <Modal
          open={confirmationState.open}
          onCancel={closeConfirmationModal}
          footer={null}
          title={
            confirmationState.action === "approve"
              ? "Review Konfirmasi Pembayaran"
              : confirmationState.action === "reject"
                ? "Review Penolakan Pembayaran"
                : "Review Revoke Pembayaran"
          }
          width={760}
          destroyOnHidden
        >
          {!confirmationState.record ? null : (
            <Space vertical size={16} style={{ width: "100%" }}>
              <Alert
                type={
                  confirmationState.action === "approve" ? "info" : "warning"
                }
                showIcon
                message={
                  confirmationState.action === "approve"
                    ? "Periksa bukti transfer sebelum mengonfirmasi"
                    : confirmationState.action === "reject"
                      ? "Tambahkan alasan penolakan untuk memudahkan tindak lanjut"
                      : "Status pembayaran akan dikembalikan ke pending"
                }
                description={
                  confirmationState.action === "approve"
                    ? "Pembayaran transfer manual akan berubah menjadi terkonfirmasi setelah Anda menyetujui konfirmasi ini."
                    : confirmationState.action === "reject"
                      ? "Pembayaran parent manual akan diberi status ditolak dan tidak akan dihitung sebagai pelunasan."
                      : "Pembayaran parent manual akan kembali ke status menunggu verifikasi agar dapat direview ulang."
                }
              />

              <Card
                size='small'
                style={{
                  borderRadius: 18,
                  border: "1px solid rgba(148,163,184,0.14)",
                }}
              >
                <Descriptions
                  column={1}
                  size='small'
                  labelStyle={{ width: 180, fontWeight: 700 }}
                >
                  <Descriptions.Item label='Siswa'>
                    {confirmationState.record.student_name || "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label='Tagihan'>
                    {confirmationState.record.description || "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label='Nominal'>
                    {Number(confirmationState.record.amount || 0).toLocaleString(
                      "id-ID",
                      {
                        style: "currency",
                        currency: "IDR",
                        maximumFractionDigits: 0,
                      },
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label='Status Saat Ini'>
                    <Tag color='gold' style={{ borderRadius: 999 }}>
                      {confirmationState.record.status_label || "Pending"}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label='Metode'>
                    {confirmationState.record.payment_source_label || "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label='Kanal'>
                    {confirmationState.record.payment_method_name ||
                      confirmationState.record.payment_source_label ||
                      "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label='Rekening Tujuan'>
                    {confirmationState.record.bank_name
                      ? `${confirmationState.record.bank_name} - ${confirmationState.record.account_number || "-"}`
                      : "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label='Referensi'>
                    {confirmationState.record.reference_no || "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label='Tanggal Upload'>
                    {confirmationState.record.paid_at
                      ? dayjs(confirmationState.record.paid_at).format(
                          "DD MMM YYYY HH:mm",
                        )
                      : "-"}
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              {confirmationState.record.proof_url ? (
                <Card
                  size='small'
                  title='Preview Bukti Transfer'
                  style={{
                    borderRadius: 18,
                    border: "1px solid rgba(148,163,184,0.14)",
                  }}
                >
                  {/\.(png|jpe?g|webp|gif)$/i.test(
                    confirmationState.record.proof_url,
                  ) ? (
                    <Image
                      src={confirmationState.record.proof_url}
                      alt='Bukti transfer'
                      style={{ maxHeight: 320, objectFit: "contain" }}
                    />
                  ) : (
                    <Button
                      href={confirmationState.record.proof_url}
                      target='_blank'
                      rel='noreferrer'
                    >
                      Buka Bukti Transfer
                    </Button>
                  )}
                </Card>
              ) : (
                <Alert
                  type='warning'
                  showIcon
                  message='Bukti transfer tidak tersedia'
                  description='Tidak ditemukan file bukti transfer pada pembayaran ini.'
                />
              )}

              {confirmationState.action === "reject" ? (
                <div>
                  <Text strong>Alasan Penolakan</Text>
                  <Input.TextArea
                    value={confirmationNotes}
                    onChange={(event) => setConfirmationNotes(event.target.value)}
                    placeholder='Contoh: nominal transfer tidak sesuai dengan tagihan atau bukti transfer tidak valid.'
                    rows={4}
                    style={{ marginTop: 8 }}
                  />
                </div>
              ) : null}

              <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                <Button onClick={closeConfirmationModal}>Batal</Button>
                <Button
                  type='primary'
                  danger={confirmationState.action === "reject"}
                  loading={isConfirmingTransaction}
                  onClick={handleConfirmTransaction}
                >
                  {confirmationState.action === "approve"
                    ? "Konfirmasi Pembayaran"
                    : confirmationState.action === "reject"
                      ? "Tolak Pembayaran"
                      : "Revoke Pembayaran"}
                </Button>
              </Space>
            </Space>
          )}
        </Modal>
      </Space>
    </MotionDiv>
  );
};

export default Transaction;
