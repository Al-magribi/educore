import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import {
  Alert,
  Card,
  Col,
  Form,
  Row,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { skipToken } from "@reduxjs/toolkit/query";
import { motion } from "framer-motion";
import { Landmark, Search, Wallet } from "lucide-react";

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
import { cardStyle, currencyFormatter } from "./constants";
import FinanceFeaturePage from "../../report/FinanceFeaturePage";

const { Text } = Typography;
const MotionDiv = motion.div;
const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};
const resetStudentContextValue = {
  student_search: "",
  grade_id: undefined,
  class_id: undefined,
  student_id: undefined,
};

const formatStudentSearchLabel = (item) => {
  const fullName = item?.full_name || item?.student_name || "";
  const nis = item?.nis ? ` - ${item.nis}` : "";

  return `${fullName}${nis}`.trim();
};

const Saving = ({ pageVariant = "teacher" }) => {
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
  const [debouncedStudentSearch, setDebouncedStudentSearch] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const pendingSelectedStudentSearchRef = useRef(null);
  const currentStudentSearch = Form.useWatch("student_search", form) || "";

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
  const { data: studentsResponse, isFetching: isFetchingStudents } =
    useGetSavingStudentsQuery(baseListParams);
  const hasModalStudentKeyword = Boolean(
    String(debouncedStudentSearch || "").trim(),
  );
  const modalStudentParams =
    modalOpen && hasModalStudentKeyword
      ? {
          class_id: effectiveClassId,
          search: debouncedStudentSearch,
        }
      : skipToken;
  const { data: modalStudentsResponse, isFetching: isFetchingModalStudents } =
    useGetSavingStudentsQuery(modalStudentParams);
  const { data: transactionsResponse, isFetching: isFetchingTransactions } =
    useGetSavingTransactionsQuery(
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
  const modalStudents = modalStudentsResponse?.data ?? EMPTY_ARRAY;
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
  const modalStudentOptions = useMemo(() => {
    const keyword = String(currentStudentSearch || "").trim();

    if (!keyword) {
      return [];
    }

    return modalStudents;
  }, [currentStudentSearch, modalStudents]);

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
    const trimmedKeyword = String(currentStudentSearch || "").trim();

    const timer = setTimeout(() => {
      setDebouncedStudentSearch(trimmedKeyword);
    }, 300);

    return () => clearTimeout(timer);
  }, [currentStudentSearch]);

  const openCreateModal = useCallback(
    (student = null, type = "deposit") => {
      setEditingTransaction(null);
      setSelectedStudent(student);
      form.setFieldsValue(
        mapSavingFormValues({
          class_id: student?.class_id,
          student_id: student?.student_id || student?.id,
          transaction_type: type,
          grade_id: student?.grade_id,
          student_search: student ? formatStudentSearchLabel(student) : "",
        }),
      );
      pendingSelectedStudentSearchRef.current = student
        ? formatStudentSearchLabel(student)
        : null;
      setDebouncedStudentSearch("");
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
          grade_id: recordStudent?.grade_id,
          student_search: recordStudent
            ? formatStudentSearchLabel(recordStudent)
            : "",
        }),
      );
      pendingSelectedStudentSearchRef.current = recordStudent
        ? formatStudentSearchLabel(recordStudent)
        : null;
      setDebouncedStudentSearch("");
      setModalOpen(true);
    },
    [form, selectableStudents, students],
  );

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setEditingTransaction(null);
    setSelectedStudent(null);
    pendingSelectedStudentSearchRef.current = null;
    setDebouncedStudentSearch("");
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

  const handleSubmit = useCallback(
    async (values) => {
      const payload = {
        student_id: values.student_id,
        transaction_type: values.transaction_type,
        amount: Number(values.amount || 0),
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
    },
    [
      addSavingTransaction,
      editingTransaction,
      handleCloseModal,
      updateSavingTransaction,
    ],
  );

  const handleDelete = useCallback(
    async (record) => {
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
    },
    [deleteSavingTransaction],
  );

  const resolvedSelectedStudent = useMemo(() => {
    if (selectedStudent) {
      return selectedStudent;
    }

    if (editingTransaction) {
      return {
        student_id: editingTransaction.student_id,
        student_name: editingTransaction.student_name,
        nis: editingTransaction.nis,
        class_name: editingTransaction.class_name,
      };
    }

    return null;
  }, [editingTransaction, selectedStudent]);
  const isAdminWorkspace =
    pageVariant === "admin" && access?.role_scope === "admin";
  const adminStats = useMemo(
    () => [
      {
        title: "Saldo Terkelola",
        value: studentSummary.total_balance || 0,
        prefix: "Rp",
        note: "Akumulasi saldo tabungan siswa pada filter aktif.",
      },
      {
        title: "Setoran Masuk",
        value: studentSummary.total_deposit || 0,
        prefix: "Rp",
        note: "Total setoran yang sudah tercatat.",
      },
      {
        title: "Akun Aktif",
        value: studentSummary.active_students || 0,
        note: "Siswa dengan transaksi tabungan pada periode aktif.",
      },
      {
        title: "Penarikan",
        value: studentSummary.total_withdrawal || 0,
        prefix: "Rp",
        note: "Total dana yang sudah ditarik siswa.",
      },
    ],
    [studentSummary],
  );
  const adminSummary = useMemo(
    () => ({
      title: `${transactionSummary.total_transactions || 0} transaksi`,
      description:
        "Tim admin dapat memantau saldo, memproses setoran, dan mengoreksi transaksi dari satu workspace operasional.",
    }),
    [transactionSummary.total_transactions],
  );
  const adminHeaderExtra = (
    <Space wrap size={10}>
      <Tag
        color='cyan'
        style={{ borderRadius: 999, paddingInline: 12, fontWeight: 600 }}
      >
        {activePeriode?.name || "Periode aktif belum tersedia"}
      </Tag>
      <Tag
        color='gold'
        style={{ borderRadius: 999, paddingInline: 12, fontWeight: 600 }}
      >
        {`${classOptions.length || 0} kelas dalam cakupan`}
      </Tag>
      <Tag
        color='green'
        style={{ borderRadius: 999, paddingInline: 12, fontWeight: 600 }}
      >
        {`${students.length || 0} siswa terpantau`}
      </Tag>
    </Space>
  );

  const isBootstrapping = isLoadingOptions;

  if (isBootstrapping) {
    return <LoadApp />;
  }

  if (isAdminWorkspace) {
    return (
      <>
        <FinanceFeaturePage
          badge='Operasional Tabungan'
          title='Kelola tabungan siswa'
          description='Gunakan halaman ini untuk memilih cakupan siswa, memeriksa saldo, lalu mencatat setoran atau penarikan.'
          summary={adminSummary}
          stats={adminStats}
          headerExtra={adminHeaderExtra}
          actions={[]}
          notes={[]}
          columns={[]}
          dataSource={[]}
          showDataTable={false}
        >
          <Space orientation='vertical' size={20} style={{ width: "100%" }}>
            <MotionDiv
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <Card
                variant='borderless'
                style={{
                  ...cardStyle,
                  border: "none",
                  background:
                    "linear-gradient(135deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.95))",
                }}
                styles={{ body: { padding: 24 } }}
              >
                <Row gutter={[16, 16]}>
                  {[
                    {
                      key: "scope",
                      icon: <Search size={18} color='#38bdf8' />,
                      title: "1. Tentukan cakupan",
                      description:
                        "Saring data berdasarkan kelas, siswa, atau kata kunci agar admin bekerja pada konteks yang tepat.",
                    },
                    {
                      key: "verify",
                      icon: <Landmark size={18} color='#34d399' />,
                      title: "2. Verifikasi saldo",
                      description:
                        "Lihat kartu siswa dan riwayat transaksi untuk memastikan nominal sesuai kondisi tabungan aktif.",
                    },
                    {
                      key: "process",
                      icon: <Wallet size={18} color='#fbbf24' />,
                      title: "3. Proses transaksi",
                      description:
                        "Catat setoran, penarikan, edit, atau hapus transaksi langsung dari daftar siswa maupun riwayat transaksi.",
                    },
                  ].map((item) => (
                    <Col xs={24} md={8} key={item.key}>
                      <Card
                        variant='borderless'
                        style={{
                          borderRadius: 20,
                          height: "100%",
                          background: "rgba(255,255,255,0.06)",
                        }}
                      >
                        <Space orientation='vertical' size={10}>
                          <Space align='center'>
                            {item.icon}
                            <Text strong style={{ color: "#fff" }}>
                              {item.title}
                            </Text>
                          </Space>
                          <Text style={{ color: "rgba(255,255,255,0.72)" }}>
                            {item.description}
                          </Text>
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Card>
            </MotionDiv>

            <Alert
              showIcon
              type='info'
              message='Semua transaksi hanya tersimpan pada periode aktif.'
              description={`Admin dapat memproses tabungan lintas kelas pada satuan ${user?.homebase_name || user?.homebase_id || "-"}, sementara saldo siswa akan dihitung ulang otomatis setelah transaksi dibuat, diubah, atau dihapus.`}
              style={{ borderRadius: 18 }}
            />

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

            <Card variant='borderless' style={cardStyle}>
              <Row gutter={[16, 16]}>
                <Col xs={24} md={8}>
                  <Text type='secondary'>Saldo saat ini</Text>
                  <div
                    style={{ fontSize: 24, fontWeight: 700, color: "#0f766e" }}
                  >
                    {currencyFormatter.format(
                      studentSummary.total_balance || 0,
                    )}
                  </div>
                </Col>
                <Col xs={24} md={8}>
                  <Text type='secondary'>Siswa aktif</Text>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>
                    {studentSummary.active_students || 0}
                  </div>
                </Col>
                <Col xs={24} md={8}>
                  <Text type='secondary'>Periode operasional</Text>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>
                    {activePeriode?.name || "-"}
                  </div>
                </Col>
              </Row>
            </Card>
          </Space>
        </FinanceFeaturePage>

        <SavingTransactionModal
          open={modalOpen}
          form={form}
          access={{
            ...access,
            active_periode_name: activePeriode?.name,
          }}
          homebaseName={user?.homebase_name || user?.homebase_id}
          editingTransaction={editingTransaction}
          students={modalStudentOptions}
          selectedStudent={resolvedSelectedStudent}
          isStudentOptionsLoading={isFetchingModalStudents}
          currentStudentSearch={currentStudentSearch}
          onStudentSelect={(item) => {
            pendingSelectedStudentSearchRef.current = item
              ? formatStudentSearchLabel(item)
              : null;
            setSelectedStudent(item);
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
              setSelectedStudent(null);
              form.setFieldsValue(resetStudentContextValue);
            }
          }}
          onCancel={handleCloseModal}
          onSubmit={handleSubmit}
          confirmLoading={isAddingTransaction || isUpdatingTransaction}
        />
      </>
    );
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
        access={{
          ...access,
          active_periode_name: activePeriode?.name,
        }}
        homebaseName={user?.homebase_name || user?.homebase_id}
        editingTransaction={editingTransaction}
        students={modalStudentOptions}
        selectedStudent={resolvedSelectedStudent}
        isStudentOptionsLoading={isFetchingModalStudents}
        currentStudentSearch={currentStudentSearch}
        onStudentSelect={(item) => {
          pendingSelectedStudentSearchRef.current = item
            ? formatStudentSearchLabel(item)
            : null;
          setSelectedStudent(item);
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
            setSelectedStudent(null);
            form.setFieldsValue(resetStudentContextValue);
          }
        }}
        onCancel={handleCloseModal}
        onSubmit={handleSubmit}
        confirmLoading={isAddingTransaction || isUpdatingTransaction}
      />
    </div>
  );
};

export default Saving;
