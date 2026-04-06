import { useMemo, useState } from "react";
import { Flex, Form, Tabs, message } from "antd";
import dayjs from "dayjs";

import { LoadApp } from "../../../../components";
import {
  useAddStudentContributionTransactionMutation,
  useDeleteStudentContributionTransactionMutation,
  useGetStudentContributionOverviewQuery,
  useGetStudentContributionStudentsQuery,
  useGetStudentContributionTransactionsQuery,
  useUpdateStudentContributionTransactionMutation,
} from "../../../../service/finance/ApiContribution";
import { mapTransactionFormValues, pageStyle } from "./constants";
import StudentContributionHeader from "./components/StudentContributionHeader";
import StudentContributionOverviewTab from "./components/StudentContributionOverviewTab";
import StudentContributionSummaryCards from "./components/StudentContributionSummaryCards";
import StudentContributionSummaryTab from "./components/StudentContributionSummaryTab";
import StudentContributionTransactionsTab from "./components/StudentContributionTransactionsTab";
import StudentContributionTransactionModal from "./components/StudentContributionTransactionModal";

const StudentContribution = () => {
  const [transactionForm] = Form.useForm();
  const [incomeFilters, setIncomeFilters] = useState({
    student_id: undefined,
    search: "",
  });
  const [expenseFilters, setExpenseFilters] = useState({
    search: "",
  });
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [transactionMode, setTransactionMode] = useState("income");
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [deletingTransactionId, setDeletingTransactionId] = useState(null);

  const { data: overviewResponse, isLoading: isLoadingOverview } =
    useGetStudentContributionOverviewQuery();
  const {
    data: studentsResponse,
    isLoading: isLoadingStudents,
    isFetching: isFetchingStudents,
  } = useGetStudentContributionStudentsQuery();
  const {
    data: transactionsResponse,
    isLoading: isLoadingTransactions,
    isFetching: isFetchingTransactions,
  } = useGetStudentContributionTransactionsQuery();

  const [addTransaction, { isLoading: isAddingTransaction }] =
    useAddStudentContributionTransactionMutation();
  const [updateTransaction, { isLoading: isUpdatingTransaction }] =
    useUpdateStudentContributionTransactionMutation();
  const [deleteTransaction] = useDeleteStudentContributionTransactionMutation();

  const overview = useMemo(
    () => overviewResponse?.data || {},
    [overviewResponse],
  );
  const access = overview.access || {};
  const activePeriode = overview.active_periode || null;
  const ownStudent = overview.own_student || null;
  const classSummary = overview.class_summary || {};
  const officers = overview.officers || [];
  const students = useMemo(
    () => studentsResponse?.data || [],
    [studentsResponse],
  );
  const transactions = useMemo(
    () => transactionsResponse?.data || [],
    [transactionsResponse],
  );
  const transactionSummary = transactionsResponse?.summary || {};
  const selectableStudents = students;
  const incomeTransactions = useMemo(
    () =>
      transactions.filter((item) => {
        if (item.transaction_type !== "income") {
          return false;
        }

        if (
          incomeFilters.student_id &&
          Number(item.student_id) !== Number(incomeFilters.student_id)
        ) {
          return false;
        }

        if (!incomeFilters.search) {
          return true;
        }

        const keyword = incomeFilters.search.toLowerCase();
        return (
          String(item.student_name || "")
            .toLowerCase()
            .includes(keyword) ||
          String(item.nis || "")
            .toLowerCase()
            .includes(keyword)
        );
      }),
    [incomeFilters.search, incomeFilters.student_id, transactions],
  );
  const expenseTransactions = useMemo(
    () =>
      transactions.filter((item) => {
        if (item.transaction_type !== "expense") {
          return false;
        }

        if (!expenseFilters.search) {
          return true;
        }

        const keyword = expenseFilters.search.toLowerCase();
        return String(item.description || "")
          .toLowerCase()
          .includes(keyword);
      }),
    [expenseFilters.search, transactions],
  );

  const isBootstrapping =
    isLoadingOverview ||
    (isLoadingStudents && !studentsResponse) ||
    (isLoadingTransactions && !transactionsResponse);

  const handleOpenTransactionModal = (student = null, type = "income") => {
    setTransactionMode(type);
    setEditingTransaction(null);
    transactionForm.setFieldsValue(
      mapTransactionFormValues({
        student_id: student?.student_id,
        transaction_type: type,
        transaction_date: dayjs(),
      }),
    );
    setTransactionModalOpen(true);
  };

  const handleEditTransaction = (record) => {
    setTransactionMode(record.transaction_type || "income");
    setEditingTransaction(record);
    transactionForm.setFieldsValue(mapTransactionFormValues(record));
    setTransactionModalOpen(true);
  };

  const handleCloseTransactionModal = () => {
    setEditingTransaction(null);
    setTransactionModalOpen(false);
    transactionForm.resetFields();
  };

  const handleSubmitTransaction = async (values) => {
    const payload = {
      student_id: transactionMode === "income" ? values.student_id : undefined,
      transaction_type: transactionMode,
      amount: Number(values.amount || 0),
      transaction_date:
        editingTransaction?.transaction_date || dayjs().format(),
      description:
        transactionMode === "expense" ? values.description : undefined,
    };

    try {
      if (editingTransaction) {
        await updateTransaction({
          id: editingTransaction.transaction_id,
          ...payload,
        }).unwrap();
        message.success("Transaksi kas kelas berhasil diperbarui");
      } else {
        await addTransaction(payload).unwrap();
        message.success("Transaksi kas kelas berhasil ditambahkan");
      }

      handleCloseTransactionModal();
    } catch (error) {
      message.error(
        error?.data?.message || "Gagal menyimpan transaksi kas kelas",
      );
    }
  };

  const handleDeleteTransaction = async (record) => {
    setDeletingTransactionId(record.transaction_id);
    try {
      await deleteTransaction(record.transaction_id).unwrap();
      message.success("Transaksi kas kelas berhasil dihapus");
    } catch (error) {
      message.error(
        error?.data?.message || "Gagal menghapus transaksi kas kelas",
      );
    } finally {
      setDeletingTransactionId(null);
    }
  };

  if (isBootstrapping) {
    return <LoadApp />;
  }

  return (
    <div>
      <Flex vertical gap={"middle"}>
        <StudentContributionHeader
          activePeriode={activePeriode}
          access={access}
          ownStudent={ownStudent}
          onOpenIncomeModal={() => handleOpenTransactionModal(null, "income")}
          onOpenExpenseModal={() => handleOpenTransactionModal(null, "expense")}
        />

        <StudentContributionSummaryCards summary={classSummary} />

        <Tabs
          style={{ marginTop: 24 }}
          items={[
            {
              key: "overview",
              label: "Ringkasan Kelas",
              children: (
                <StudentContributionOverviewTab
                  ownStudent={ownStudent}
                  officers={officers}
                  students={students}
                  studentsLoading={isFetchingStudents}
                />
              ),
            },
            {
              key: "income",
              label: `Pemasukan (${incomeTransactions.length})`,
              children: (
                <StudentContributionTransactionsTab
                  access={access}
                  variant='income'
                  selectableStudents={selectableStudents}
                  transactions={incomeTransactions}
                  loading={isFetchingTransactions}
                  filters={incomeFilters}
                  setFilters={setIncomeFilters}
                  deletingTransactionId={deletingTransactionId}
                  onCreate={handleOpenTransactionModal}
                  onEdit={handleEditTransaction}
                  onDelete={handleDeleteTransaction}
                />
              ),
            },
            {
              key: "expense",
              label: `Pengeluaran (${expenseTransactions.length})`,
              children: (
                <StudentContributionTransactionsTab
                  access={access}
                  variant='expense'
                  selectableStudents={selectableStudents}
                  transactions={expenseTransactions}
                  loading={isFetchingTransactions}
                  filters={expenseFilters}
                  setFilters={setExpenseFilters}
                  deletingTransactionId={deletingTransactionId}
                  onCreate={handleOpenTransactionModal}
                  onEdit={handleEditTransaction}
                  onDelete={handleDeleteTransaction}
                />
              ),
            },
            {
              key: "summary",
              label: "Rangkuman",
              children: (
                <StudentContributionSummaryTab
                  summary={transactionSummary}
                  incomeTransactions={incomeTransactions}
                  expenseTransactions={expenseTransactions}
                />
              ),
            },
          ]}
        />

        {access?.is_officer ? (
          <StudentContributionTransactionModal
            open={transactionModalOpen}
            form={transactionForm}
            editingTransaction={editingTransaction}
            mode={transactionMode}
            selectableStudents={selectableStudents}
            onCancel={handleCloseTransactionModal}
            onSubmit={handleSubmitTransaction}
            confirmLoading={isAddingTransaction || isUpdatingTransaction}
          />
        ) : null}
      </Flex>
    </div>
  );
};

export default StudentContribution;
