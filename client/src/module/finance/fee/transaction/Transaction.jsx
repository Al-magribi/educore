import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import dayjs from "dayjs";
import { Button, Card, Flex, Form, Space, Typography, message } from "antd";

import { LoadApp } from "../../../../components";
import {
  useCreateTransactionMutation,
  useDeleteTransactionMutation,
  useGetTransactionOptionsQuery,
  useGetTransactionsQuery,
  useUpdateTransactionMutation,
} from "../../../../service/finance/ApiTransaction";
import { cardStyle, pageStyle } from "../others/constants";
import TransactionFormModal from "./components/TransactionFormModal";
import TransactionList from "./components/TransactionList";

const { Title, Text } = Typography;

const getOtherPaymentSelectionKey = (charge) =>
  charge?.charge_id ? `charge-${charge.charge_id}` : `type-${charge?.type_id}`;

const buildOtherPaymentValue = (charge, currentValue = {}, overrides = {}) => ({
  charge_id: charge.charge_id || null,
  type_id: charge.type_id || null,
  amount_paid:
    overrides.amount_paid !== undefined
      ? overrides.amount_paid
      : currentValue.amount_paid,
});

const Transaction = () => {
  const { user } = useSelector((state) => state.auth);
  const [form] = Form.useForm();
  const [modalRequestedOpen, setModalRequestedOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [transactionFilters, setTransactionFilters] = useState({
    page: 1,
    limit: 10,
    search: "",
    category: undefined,
  });

  const periodeId = Form.useWatch("periode_id", form);
  const gradeId = Form.useWatch("grade_id", form);
  const classId = Form.useWatch("class_id", form);
  const studentId = Form.useWatch("student_id", form);
  const monthlySelection = Form.useWatch("bill_months", form) || [];
  const otherPaymentSelections = Form.useWatch("other_payments", form) || {};

  const {
    data: optionResponse,
    isLoading: isLoadingOptions,
    isFetching: isFetchingOptions,
  } = useGetTransactionOptionsQuery({
    periode_id: periodeId,
    grade_id: gradeId,
    class_id: classId,
    student_id: studentId,
  });
  const { data: transactionResponse, isLoading: isLoadingTransactions } =
    useGetTransactionsQuery(transactionFilters);
  const [createTransaction, { isLoading: isSubmitting }] =
    useCreateTransactionMutation();
  const [updateTransaction, { isLoading: isUpdatingTransaction }] =
    useUpdateTransactionMutation();
  const [deleteTransaction, { isLoading: isDeletingTransaction }] =
    useDeleteTransactionMutation();

  const options = optionResponse?.data || {};
  const periodes = options.periodes || [];
  const classes = options.classes || [];
  const students = options.students || [];
  const student = options.student || null;
  const unpaidMonths = options.spp?.unpaid_months || [];
  const tariffAmount = Number(options.spp?.tariff_amount || 0);
  const otherCharges = options.other_charges || [];
  const transactions = transactionResponse?.data || [];
  const transactionSummary = transactionResponse?.summary || {};
  const isFetchingStudentOptions =
    modalRequestedOpen &&
    Boolean(periodeId) &&
    isFetchingOptions &&
    students.length === 0;
  const modalOpen = modalRequestedOpen && !isFetchingStudentOptions;

  useEffect(() => {
    if (!modalRequestedOpen) {
      return;
    }

    if (!form.getFieldValue("payment_date")) {
      form.setFieldValue("payment_date", dayjs());
    }
  }, [form, modalRequestedOpen]);

  useEffect(() => {
    if (!modalRequestedOpen) {
      return;
    }

    if (!periodeId && periodes.length > 0) {
      const activePeriode =
        periodes.find((item) => item.is_active) || periodes[0];
      form.setFieldValue("periode_id", activePeriode?.id);
    }
  }, [form, modalRequestedOpen, periodeId, periodes]);

  useEffect(() => {
    if (!modalRequestedOpen) {
      return;
    }

    const currentClassId = form.getFieldValue("class_id");
    if (
      currentClassId &&
      !classes.some((item) => item.id === Number(currentClassId))
    ) {
      form.setFieldsValue({
        class_id: undefined,
        student_id: undefined,
        bill_months: [],
        other_payments: {},
      });
    }
  }, [classes, form, modalRequestedOpen]);

  useEffect(() => {
    if (!modalRequestedOpen) {
      return;
    }

    const currentStudentId = form.getFieldValue("student_id");
    if (
      currentStudentId &&
      !students.some((item) => item.id === Number(currentStudentId))
    ) {
      form.setFieldsValue({
        student_id: undefined,
        bill_months: [],
        other_payments: {},
      });
    }
  }, [form, modalRequestedOpen, students]);

  const totalMonthlyAmount = tariffAmount * monthlySelection.length;
  const selectedOtherTotal = otherCharges.reduce((sum, charge) => {
    const selectionKey = getOtherPaymentSelectionKey(charge);
    const selection = otherPaymentSelections?.[selectionKey];
    return sum + Number(selection?.amount_paid || 0);
  }, 0);
  const grandTotal = totalMonthlyAmount + selectedOtherTotal;

  const resetForm = () => {
    form.setFieldsValue({
      periode_id: undefined,
      grade_id: undefined,
      class_id: undefined,
      student_id: undefined,
      bill_months: [],
      other_payments: {},
      payment_method: undefined,
      notes: undefined,
      payment_date: dayjs(),
    });
  };

  const closeModal = () => {
    setModalRequestedOpen(false);
    setEditingTransaction(null);
    resetForm();
  };

  const openCreateModal = () => {
    setEditingTransaction(null);
    resetForm();
    const activePeriode =
      periodes.find((item) => item.is_active) || periodes[0];

    form.setFieldsValue({
      periode_id: activePeriode?.id,
      payment_date: dayjs(),
    });
    setModalRequestedOpen(true);
  };

  const handleOtherPaymentAmountChange = (charge, value) => {
    const selectionKey = getOtherPaymentSelectionKey(charge);
    const numericValue = Number(value || 0);

    form.setFieldValue(
      ["other_payments", selectionKey],
      buildOtherPaymentValue(charge, otherPaymentSelections?.[selectionKey], {
        amount_paid: numericValue > 0 ? numericValue : undefined,
      }),
    );
  };

  const handleSubmit = async (values) => {
    const rawOtherPayments = values.other_payments || {};
    const otherPayments = Object.values(rawOtherPayments)
      .filter((item) => Number(item?.amount_paid) > 0)
      .map((item) => ({
        charge_id: item.charge_id ? Number(item.charge_id) : null,
        type_id: item.type_id ? Number(item.type_id) : null,
        amount_paid: Number(item.amount_paid),
      }));
    const commonPayload = {
      periode_id: values.periode_id,
      grade_id: values.grade_id,
      student_id: values.student_id,
      payment_date: dayjs(values.payment_date).format("YYYY-MM-DD"),
      payment_method: values.payment_method,
      notes: values.notes,
    };

    try {
      if (editingTransaction?.category === "spp") {
        await updateTransaction({
          category: "spp",
          id: editingTransaction.id,
          ...commonPayload,
          bill_months: values.bill_months || [],
        }).unwrap();
        message.success("Transaksi SPP berhasil diperbarui");
      } else if (editingTransaction?.category === "other") {
        const currentOtherPayment = otherPayments[0];
        if (!currentOtherPayment) {
          message.error("Nominal pembayaran lainnya wajib diisi");
          return;
        }

        await updateTransaction({
          category: "other",
          id: editingTransaction.id,
          amount_paid: currentOtherPayment.amount_paid,
          payment_date: commonPayload.payment_date,
          payment_method: commonPayload.payment_method,
          notes: commonPayload.notes,
        }).unwrap();
        message.success("Transaksi pembayaran lainnya berhasil diperbarui");
      } else {
        await createTransaction({
          ...commonPayload,
          bill_months: values.bill_months || [],
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
    setEditingTransaction(record);

    if (record.category === "spp") {
      form.setFieldsValue({
        periode_id: record.periode_id,
        grade_id: record.grade_id,
        class_id: record.class_id,
        student_id: record.student_id,
        payment_date: record.paid_at ? dayjs(record.paid_at) : dayjs(),
        payment_method: record.payment_method,
        notes: record.notes,
        bill_months: record.bill_months || [],
        other_payments: {},
      });
    } else {
      const selectionKey = getOtherPaymentSelectionKey(record);
      form.setFieldsValue({
        periode_id: record.periode_id,
        grade_id: record.grade_id,
        class_id: record.class_id,
        student_id: record.student_id,
        payment_date: record.paid_at ? dayjs(record.paid_at) : dayjs(),
        payment_method: record.payment_method,
        notes: record.notes,
        bill_months: [],
        other_payments: {
          [selectionKey]: {
            charge_id: record.charge_id,
            type_id: record.type_id,
            amount_paid: Number(record.amount || 0),
          },
        },
      });
    }

    setModalRequestedOpen(true);
  };

  const handleDeleteCurrentTransaction = async (record) => {
    try {
      await deleteTransaction({
        category: record.category,
        id: record.id,
      }).unwrap();
      message.success("Transaksi berhasil dihapus");

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

  if (isLoadingOptions && !optionResponse) {
    return <LoadApp />;
  }

  return (
    <Space vertical size={24} style={{ width: "100%" }}>
      <Card style={cardStyle} styles={{ body: { padding: 20 } }}>
        <Flex justify='space-between' align='center' wrap='wrap' gap={16}>
          <div>
            <Text
              type='secondary'
              style={{
                display: "block",
                fontSize: 12,
                letterSpacing: 0.4,
                textTransform: "uppercase",
              }}
            >
              Finance / Transaksi Pembayaran
            </Text>
          </div>

          <Button type='primary' onClick={openCreateModal}>
            Buat Transaksi
          </Button>
        </Flex>
      </Card>

      <TransactionList
        user={user}
        transactions={transactions}
        transactionSummary={transactionSummary}
        transactionFilters={transactionFilters}
        setTransactionFilters={setTransactionFilters}
        loading={isLoadingTransactions}
        isDeletingTransaction={isDeletingTransaction}
        onEdit={handleEditTransaction}
        onDelete={handleDeleteCurrentTransaction}
      />

      <TransactionFormModal
        open={modalOpen}
        loadingOpen={modalRequestedOpen && !modalOpen}
        isStudentOptionsLoading={isFetchingStudentOptions}
        form={form}
        editingTransaction={editingTransaction}
        onCancel={closeModal}
        onSubmit={handleSubmit}
        onReset={() => {
          setEditingTransaction(null);
          resetForm();
        }}
        confirmLoading={isSubmitting || isUpdatingTransaction}
        periodes={periodes}
        students={students}
        student={student}
        unpaidMonths={unpaidMonths}
        tariffAmount={tariffAmount}
        otherCharges={otherCharges}
        otherPaymentSelections={otherPaymentSelections}
        totalMonthlyAmount={totalMonthlyAmount}
        selectedOtherTotal={selectedOtherTotal}
        grandTotal={grandTotal}
        onOtherPaymentAmountChange={handleOtherPaymentAmountChange}
      />
    </Space>
  );
};

export default Transaction;
