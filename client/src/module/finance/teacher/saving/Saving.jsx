import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import dayjs from "dayjs";
import { Form, Space, Typography, message } from "antd";

import { LoadApp } from "../../../../components";
import {
  useAddSavingTransactionMutation,
  useDeleteSavingTransactionMutation,
  useGetSavingOptionsQuery,
  useGetSavingStudentsQuery,
  useGetSavingTransactionsQuery,
  useUpdateSavingTransactionMutation,
} from "../../../../service/finance/ApiSaving";
import { pageStyle } from "./constants";
import SavingFilters from "./components/SavingFilters";
import SavingHeader from "./components/SavingHeader";
import SavingSummaryCards from "./components/SavingSummaryCards";
import SavingTabs from "./components/SavingTabs";
import SavingTransactionModal, {
  mapSavingFormValues,
} from "./components/SavingTransactionModal";

const { Text } = Typography;

const Saving = () => {
  const { user } = useSelector((state) => state.auth);
  const [form] = Form.useForm();
  const [filters, setFilters] = useState({
    class_id: undefined,
    student_id: undefined,
    transaction_type: undefined,
    search: "",
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const { data: optionsResponse, isLoading: isLoadingOptions } =
    useGetSavingOptionsQuery({
      class_id: filters.class_id,
    });
  const {
    data: studentsResponse,
    isLoading: isLoadingStudents,
    isFetching: isFetchingStudents,
  } = useGetSavingStudentsQuery({
    class_id: filters.class_id,
    search: filters.search,
  });
  const {
    data: transactionsResponse,
    isLoading: isLoadingTransactions,
    isFetching: isFetchingTransactions,
  } = useGetSavingTransactionsQuery({
    class_id: filters.class_id,
    student_id: filters.student_id,
    transaction_type: filters.transaction_type,
    search: filters.search,
  });

  const [addSavingTransaction, { isLoading: isAddingTransaction }] =
    useAddSavingTransactionMutation();
  const [updateSavingTransaction, { isLoading: isUpdatingTransaction }] =
    useUpdateSavingTransactionMutation();
  const [deleteSavingTransaction] = useDeleteSavingTransactionMutation();

  const options = optionsResponse?.data || {};
  const access = options.access || {};
  const classes = options.classes || [];
  const selectableStudents = options.students || [];
  const activePeriode = options.active_periode || null;
  const students = studentsResponse?.data || [];
  const studentSummary = studentsResponse?.summary || {};
  const transactions = transactionsResponse?.data || [];
  const transactionSummary = transactionsResponse?.summary || {};

  useEffect(() => {
    if (
      access?.homeroom_class?.id &&
      filters.class_id !== access.homeroom_class.id
    ) {
      setFilters((previous) => ({
        ...previous,
        class_id: access.homeroom_class.id,
      }));
    }
  }, [access?.homeroom_class?.id, filters.class_id]);

  useEffect(() => {
    if (
      filters.student_id &&
      !selectableStudents.some((item) => item.id === filters.student_id)
    ) {
      setFilters((previous) => ({
        ...previous,
        student_id: undefined,
      }));
    }
  }, [filters.student_id, selectableStudents]);

  const openCreateModal = (student = null, type = "deposit") => {
    setEditingTransaction(null);
    setSelectedStudent(student);
    form.setFieldsValue(
      mapSavingFormValues({
        student_id: student?.student_id || student?.id,
        transaction_type: type,
        transaction_date: dayjs(),
      }),
    );
    setModalOpen(true);
  };

  const handleEditTransaction = (record) => {
    const recordStudent =
      students.find((item) => item.student_id === record.student_id) ||
      selectableStudents.find((item) => item.id === record.student_id) ||
      null;

    setEditingTransaction(record);
    setSelectedStudent(recordStudent);
    form.setFieldsValue(mapSavingFormValues(record));
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingTransaction(null);
    setSelectedStudent(null);
    form.resetFields();
  };

  const handleSubmit = async (values) => {
    const payload = {
      student_id: values.student_id,
      transaction_type: values.transaction_type,
      amount: Number(values.amount || 0),
      transaction_date: dayjs(values.transaction_date).format("YYYY-MM-DD"),
      description: values.description,
    };

    try {
      if (editingTransaction) {
        await updateSavingTransaction({
          id: editingTransaction.transaction_id,
          ...payload,
        }).unwrap();
        message.success("Transaksi tabungan berhasil diperbarui");
      } else {
        await addSavingTransaction(payload).unwrap();
        message.success("Transaksi tabungan berhasil ditambahkan");
      }

      handleCloseModal();
    } catch (error) {
      message.error(
        error?.data?.message || "Gagal menyimpan transaksi tabungan",
      );
    }
  };

  const handleDelete = async (record) => {
    setDeletingId(record.transaction_id);
    try {
      await deleteSavingTransaction(record.transaction_id).unwrap();
      message.success("Transaksi tabungan berhasil dihapus");
    } catch (error) {
      message.error(
        error?.data?.message || "Gagal menghapus transaksi tabungan",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const isBootstrapping =
    isLoadingOptions ||
    (isLoadingStudents && !studentsResponse) ||
    (isLoadingTransactions && !transactionsResponse);

  if (isBootstrapping) {
    return <LoadApp />;
  }

  return (
    <div>
      <Space vertical size={24} style={{ width: "100%" }}>
        <SavingHeader
          access={access}
          activePeriode={activePeriode}
          onCreate={openCreateModal}
        />

        <SavingSummaryCards summary={studentSummary} />

        <SavingFilters
          filters={filters}
          setFilters={setFilters}
          access={access}
          classes={classes}
          students={selectableStudents}
        />

        <SavingTabs
          students={students}
          studentsLoading={isFetchingStudents}
          transactions={transactions}
          transactionSummary={transactionSummary}
          transactionsLoading={isFetchingTransactions}
          onCreate={openCreateModal}
          onEditTransaction={handleEditTransaction}
          onDeleteTransaction={handleDelete}
          deletingId={deletingId}
        />

        <Text type='secondary'>
          Pengelolaan tabungan berjalan pada periode aktif{" "}
          {activePeriode?.name || "-"} untuk satuan{" "}
          {user?.homebase_name || user?.homebase_id || "-"}.
        </Text>
      </Space>

      <SavingTransactionModal
        open={modalOpen}
        form={form}
        editingTransaction={editingTransaction}
        students={selectableStudents}
        selectedStudent={selectedStudent}
        onCancel={handleCloseModal}
        onSubmit={handleSubmit}
        confirmLoading={isAddingTransaction || isUpdatingTransaction}
      />
    </div>
  );
};

export default Saving;
