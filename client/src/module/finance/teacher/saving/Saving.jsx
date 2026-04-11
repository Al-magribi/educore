import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import dayjs from "dayjs";
import { Form, Space, Typography, message } from "antd";
import { skipToken } from "@reduxjs/toolkit/query";

import { LoadApp } from "../../../../components";
import {
  useAddSavingTransactionMutation,
  useDeleteSavingTransactionMutation,
  useGetSavingOptionsQuery,
  useGetSavingStudentsQuery,
  useGetSavingTransactionsQuery,
  useUpdateSavingTransactionMutation,
} from "../../../../service/finance/ApiSaving";
import SavingFilters from "./components/SavingFilters";
import SavingHeader from "./components/SavingHeader";
import SavingSummaryCards from "./components/SavingSummaryCards";
import SavingTabs from "./components/SavingTabs";
import SavingTransactionModal from "./components/SavingTransactionModal";
import { mapSavingFormValues } from "./formHelpers";

const { Text } = Typography;
const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};

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
  const options = optionsResponse?.data || {};
  const access = options.access || {};
  const isTeacherScope =
    user?.role === "teacher" || access?.role_scope === "teacher";
  const effectiveClassId = access?.homeroom_class?.id || filters.class_id;
  const baseListParams =
    isTeacherScope && !effectiveClassId
      ? skipToken
      : {
          class_id: effectiveClassId,
          search: filters.search,
        };
  const {
    data: studentsResponse,
    isFetching: isFetchingStudents,
  } = useGetSavingStudentsQuery(baseListParams);
  const {
    data: transactionsResponse,
    isFetching: isFetchingTransactions,
  } = useGetSavingTransactionsQuery(
    baseListParams === skipToken
      ? skipToken
      : {
          ...baseListParams,
          student_id: filters.student_id,
          transaction_type: filters.transaction_type,
        },
  );

  const [addSavingTransaction, { isLoading: isAddingTransaction }] =
    useAddSavingTransactionMutation();
  const [updateSavingTransaction, { isLoading: isUpdatingTransaction }] =
    useUpdateSavingTransactionMutation();
  const [deleteSavingTransaction] = useDeleteSavingTransactionMutation();

  const classes = options.classes ?? EMPTY_ARRAY;
  const selectableStudents = options.students ?? EMPTY_ARRAY;
  const activePeriode = options.active_periode || null;
  const students = studentsResponse?.data ?? EMPTY_ARRAY;
  const studentSummary = studentsResponse?.summary ?? EMPTY_OBJECT;
  const transactions = transactionsResponse?.data ?? EMPTY_ARRAY;
  const transactionSummary = transactionsResponse?.summary ?? EMPTY_OBJECT;
  const classOptions = useMemo(
    () =>
      classes.map((item) => ({
        value: item.id,
        label: `${item.name}${item.grade_name ? ` (${item.grade_name})` : ""}`,
      })),
    [classes],
  );
  const studentOptions = useMemo(
    () =>
      selectableStudents.map((item) => ({
        value: item.id,
        label: `${item.full_name}${item.nis ? ` (${item.nis})` : ""} - ${
          item.class_name || "-"
        }`,
      })),
    [selectableStudents],
  );

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

  const openCreateModal = useCallback(
    (student = null, type = "deposit") => {
      setEditingTransaction(null);
      setSelectedStudent(student);
      form.setFieldsValue(
        mapSavingFormValues({
          class_id: student?.class_id,
          student_id: student?.student_id || student?.id,
          transaction_type: type,
          transaction_date: dayjs(),
        }),
      );
      setModalOpen(true);
    },
    [form],
  );

  const handleEditTransaction = useCallback(
    (record) => {
      const recordStudent =
        students.find((item) => item.student_id === record.student_id) ||
        selectableStudents.find((item) => item.id === record.student_id) ||
        null;

      setEditingTransaction(record);
      setSelectedStudent(recordStudent);
      form.setFieldsValue(
        mapSavingFormValues({
          ...record,
          class_id: recordStudent?.class_id,
        }),
      );
      setModalOpen(true);
    },
    [form, selectableStudents, students],
  );

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setEditingTransaction(null);
    setSelectedStudent(null);
    form.resetFields();
  }, [form]);

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

  const handleSubmit = useCallback(async (values) => {
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
  }, [
    addSavingTransaction,
    editingTransaction,
    handleCloseModal,
    updateSavingTransaction,
  ]);

  const handleDelete = useCallback(async (record) => {
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
  }, [deleteSavingTransaction]);

  const isBootstrapping = isLoadingOptions;

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
          classOptions={classOptions}
          studentOptions={studentOptions}
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
        access={access}
        classOptions={classOptions}
        editingTransaction={editingTransaction}
        students={selectableStudents}
        studentOptions={studentOptions}
        selectedStudent={selectedStudent}
        onCancel={handleCloseModal}
        onSubmit={handleSubmit}
        confirmLoading={isAddingTransaction || isUpdatingTransaction}
      />
    </div>
  );
};

export default Saving;
