import { useMemo, useState } from "react";
import { Form, Tabs, message } from "antd";
import dayjs from "dayjs";
import { useSelector } from "react-redux";

import { LoadApp } from "../../../../components";
import {
  useAddContributionTransactionMutation,
  useAssignContributionOfficerMutation,
  useDeleteContributionTransactionMutation,
  useGetContributionOfficersQuery,
  useGetContributionOptionsQuery,
  useGetContributionStudentsQuery,
  useGetContributionTransactionsQuery,
  useRemoveContributionOfficerMutation,
  useUpdateContributionTransactionMutation,
} from "../../../../service/finance/ApiContribution";
import { mapTransactionFormValues } from "./constants";
import ContributionHeader from "./components/ContributionHeader";
import ContributionMetaCard from "./components/ContributionMetaCard";
import ContributionOfficerModal from "./components/ContributionOfficerModal";
import ContributionOfficersTab from "./components/ContributionOfficersTab";
import ContributionStudentsTab from "./components/ContributionStudentsTab";
import ContributionSummaryCards from "./components/ContributionSummaryCards";
import ContributionTransactionModal from "./components/ContributionTransactionModal";
import ContributionTransactionsTab from "./components/ContributionTransactionsTab";

const Contribution = () => {
  const { user } = useSelector((state) => state.auth);
  const [transactionForm] = Form.useForm();
  const [officerForm] = Form.useForm();
  const [studentFilters, setStudentFilters] = useState({
    search: "",
    status: undefined,
  });
  const [transactionFilters, setTransactionFilters] = useState({
    student_id: undefined,
    transaction_type: undefined,
    search: "",
  });
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [officerModalOpen, setOfficerModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [removingOfficerId, setRemovingOfficerId] = useState(null);
  const [deletingTransactionId, setDeletingTransactionId] = useState(null);

  const { data: optionsResponse, isLoading: isLoadingOptions } =
    useGetContributionOptionsQuery();
  const {
    data: studentsResponse,
    isLoading: isLoadingStudents,
    isFetching: isFetchingStudents,
  } = useGetContributionStudentsQuery(studentFilters);
  const {
    data: transactionsResponse,
    isLoading: isLoadingTransactions,
    isFetching: isFetchingTransactions,
  } = useGetContributionTransactionsQuery(transactionFilters);
  const {
    data: officersResponse,
    isLoading: isLoadingOfficers,
    isFetching: isFetchingOfficers,
  } = useGetContributionOfficersQuery();

  const [addTransaction, { isLoading: isAddingTransaction }] =
    useAddContributionTransactionMutation();
  const [updateTransaction, { isLoading: isUpdatingTransaction }] =
    useUpdateContributionTransactionMutation();
  const [deleteTransaction] = useDeleteContributionTransactionMutation();
  const [assignOfficer, { isLoading: isAssigningOfficer }] =
    useAssignContributionOfficerMutation();
  const [removeOfficer] = useRemoveContributionOfficerMutation();

  const options = useMemo(() => optionsResponse?.data || {}, [optionsResponse]);
  const access = options.access || {};
  const activePeriode = options.active_periode || null;
  const classSummary = options.class_summary || {};
  const selectableStudents = useMemo(() => options.students || [], [options]);
  const students = studentsResponse?.data || [];
  const studentSummary = studentsResponse?.summary || {};
  const transactions = transactionsResponse?.data || [];
  const transactionSummary = transactionsResponse?.summary || {};
  const officers = officersResponse?.data || options.officers || [];
  const transactionType = Form.useWatch("transaction_type", transactionForm);
  const unpaidStudents = useMemo(
    () => selectableStudents.filter((item) => !item.is_paid),
    [selectableStudents],
  );

  const isBootstrapping =
    isLoadingOptions ||
    (isLoadingStudents && !studentsResponse) ||
    (isLoadingTransactions && !transactionsResponse) ||
    (isLoadingOfficers && !officersResponse && !options.officers);

  const handleOpenCreateTransaction = (student = null, type = "income") => {
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

  const handleOpenEditTransaction = (record) => {
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
      student_id:
        values.transaction_type === "income" ? values.student_id : undefined,
      transaction_type: values.transaction_type,
      amount: Number(values.amount || 0),
      transaction_date: dayjs(values.transaction_date).format(),
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

  const handleAssignOfficer = async (values) => {
    try {
      await assignOfficer(values).unwrap();
      message.success("Petugas kas kelas berhasil ditetapkan");
      officerForm.resetFields();
      setOfficerModalOpen(false);
    } catch (error) {
      message.error(error?.data?.message || "Gagal menetapkan petugas");
    }
  };

  const handleRemoveOfficer = async (studentId) => {
    setRemovingOfficerId(studentId);
    try {
      await removeOfficer(studentId).unwrap();
      message.success("Petugas kas kelas berhasil dinonaktifkan");
    } catch (error) {
      message.error(error?.data?.message || "Gagal menonaktifkan petugas");
    } finally {
      setRemovingOfficerId(null);
    }
  };

  if (isBootstrapping) {
    return <LoadApp />;
  }

  const officerCandidates = selectableStudents.filter(
    (student) => !student.is_officer,
  );

  return (
    <div>
      <ContributionHeader
        activePeriode={activePeriode}
        access={access}
        onOpenOfficerModal={() => setOfficerModalOpen(true)}
        onOpenTransactionModal={handleOpenCreateTransaction}
      />

      <div style={{ marginTop: 24 }}>
        <ContributionSummaryCards summary={classSummary} />
      </div>

      <div style={{ marginTop: 24 }}>
        <ContributionMetaCard
          user={user}
          access={access}
          summary={classSummary}
        />
      </div>

      <Tabs
        style={{ marginTop: 24 }}
        items={[
          {
            key: "students",
            label: `Siswa (${studentSummary.total_students || selectableStudents.length || 0})`,
            children: (
              <ContributionStudentsTab
                filters={studentFilters}
                setFilters={setStudentFilters}
                summary={studentSummary}
                students={students}
                unpaidStudents={unpaidStudents}
                loading={isFetchingStudents}
                onCreatePayment={handleOpenCreateTransaction}
              />
            ),
          },
          {
            key: "transactions",
            label: `Transaksi (${transactionSummary.total_transactions || 0})`,
            children: (
              <ContributionTransactionsTab
                selectableStudents={selectableStudents}
                summary={transactionSummary}
                transactions={transactions}
                loading={isFetchingTransactions}
                filters={transactionFilters}
                setFilters={setTransactionFilters}
                deletingTransactionId={deletingTransactionId}
                onCreate={handleOpenCreateTransaction}
                onEdit={handleOpenEditTransaction}
                onDelete={handleDeleteTransaction}
              />
            ),
          },
          {
            key: "officers",
            label: `Petugas (${officers.filter((item) => item.is_active).length})`,
            children: (
              <ContributionOfficersTab
                officers={officers}
                loading={isFetchingOfficers}
                removingOfficerId={removingOfficerId}
                onOpenOfficerModal={() => setOfficerModalOpen(true)}
                onRemoveOfficer={handleRemoveOfficer}
              />
            ),
          },
        ]}
      />

      <ContributionTransactionModal
        open={transactionModalOpen}
        form={transactionForm}
        editingTransaction={editingTransaction}
        selectableStudents={selectableStudents}
        transactionType={transactionType}
        onCancel={handleCloseTransactionModal}
        onSubmit={handleSubmitTransaction}
        confirmLoading={isAddingTransaction || isUpdatingTransaction}
      />

      <ContributionOfficerModal
        open={officerModalOpen}
        form={officerForm}
        officerCandidates={officerCandidates}
        onCancel={() => {
          setOfficerModalOpen(false);
          officerForm.resetFields();
        }}
        onSubmit={handleAssignOfficer}
        confirmLoading={isAssigningOfficer}
      />
    </div>
  );
};

export default Contribution;
