import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  Alert,
  Button,
  Card,
  Flex,
  Form,
  Grid,
  Input,
  Select,
  Typography,
  message,
} from "antd";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import { RefreshCw } from "lucide-react";

import { LoadApp } from "../../../../components";
import { useFinanceScope } from "../../../center/finance/FinanceScopeContext";
import {
  useAddExpenseMutation,
  useDeleteExpenseMutation,
  useGetExpenseOptionsQuery,
  useGetExpensesQuery,
  useUpdateExpenseMutation,
} from "../../../../service/finance/ApiExpense";
import { cardStyle, categoryLabel } from "../constants";
import ExpenseFormModal from "./ExpenseFormModal";
import ExpenseHeader from "./ExpenseHeader";
import ExpenseListTable from "./ExpenseListTable";
import ExpenseSummaryCards from "./ExpenseSummaryCards";

const { Text } = Typography;
const MotionDiv = motion.div;

const ExpenseDailyTab = () => {
  const { user } = useSelector((state) => state.auth);
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const financeScope = useFinanceScope();
  const lockHomebase =
    Boolean(user?.homebase_id) || Boolean(financeScope?.homebaseId);

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [periodeFilter, setPeriodeFilter] = useState(undefined);
  const [search, setSearch] = useState("");
  const [form] = Form.useForm();

  const effectiveHomebaseId = user?.homebase_id || financeScope?.homebaseId;

  const optionsQuery = useGetExpenseOptionsQuery(
    lockHomebase ? { homebase_id: effectiveHomebaseId } : undefined,
  );
  const options = optionsQuery.data?.data || {};
  const homebases = options.homebases || [];
  const periodes = options.periodes || [];
  // Pakai kategori aktif dari API apa adanya (tanpa filter hardcode).
  const categories = useMemo(
    () =>
      (options.categories || []).map((item) => ({
        ...item,
        value: item.value || item.code,
        label: item.label || categoryLabel[item.value || item.code] || item.code,
      })),
    [options.categories],
  );
  const paymentMethods = options.payment_methods || [];
  const categoryMeta = useMemo(() => {
    const map = {};
    for (const item of categories) {
      const key = item.value || item.code;
      map[key] = {
        label: item.label || categoryLabel[key] || key,
        color: item.color || "default",
      };
    }
    return map;
  }, [categories]);

  const selectedHomebaseId =
    options.selected_homebase_id ||
    user?.homebase_id ||
    financeScope?.homebaseId ||
    homebases[0]?.id ||
    undefined;

  const defaultPeriodeId = useMemo(() => {
    const defaultPeriode = periodes.find(
      (item) => item.is_default || item.is_active,
    );
    return defaultPeriode ? Number(defaultPeriode.id) : undefined;
  }, [periodes]);

  const listQueryArgs = {
    ...(selectedHomebaseId ? { homebase_id: selectedHomebaseId } : {}),
    ...(periodeFilter ? { periode_id: periodeFilter } : {}),
    ...(categoryFilter !== "all" ? { category: categoryFilter } : {}),
    ...(search ? { search } : {}),
  };

  const {
    data: listResponse,
    isLoading: isLoadingList,
    isFetching: isFetchingList,
    isError: isListError,
    error: listError,
    refetch,
  } = useGetExpensesQuery(listQueryArgs, {
    skip: !selectedHomebaseId,
  });

  const expenses = listResponse?.data || [];
  const summary = listResponse?.summary || {};

  const [addExpense, addExpenseState] = useAddExpenseMutation();
  const [updateExpense, updateExpenseState] = useUpdateExpenseMutation();
  const [deleteExpense, deleteExpenseState] = useDeleteExpenseMutation();

  const categoryOptions = useMemo(
    () => [
      { value: "all", label: "Semua kategori" },
      ...categories.map((item) => ({
        value: item.value,
        label: item.label,
      })),
    ],
    [categories],
  );

  useEffect(() => {
    if (
      categoryFilter !== "all" &&
      !categories.some((item) => item.value === categoryFilter)
    ) {
      setCategoryFilter("all");
    }
  }, [categories, categoryFilter]);

  const formCategories = useMemo(() => {
    if (!editingExpense?.category) return categories;
    const exists = categories.some(
      (item) => item.value === editingExpense.category,
    );
    if (exists) return categories;
    // Saat edit, tetap tampilkan kategori lama meski sudah nonaktif/terhapus dari list aktif.
    return [
      ...categories,
      {
        value: editingExpense.category,
        code: editingExpense.category,
        label:
          categoryMeta[editingExpense.category]?.label ||
          categoryLabel[editingExpense.category] ||
          editingExpense.category,
        color: categoryMeta[editingExpense.category]?.color || "default",
      },
    ];
  }, [categories, categoryMeta, editingExpense]);

  const openCreate = () => {
    setEditingExpense(null);
    form.resetFields();
    form.setFieldsValue({
      homebase_id: selectedHomebaseId,
      periode_id: periodeFilter || defaultPeriodeId,
      category: categories[0]?.value || undefined,
      payment_method: "cash",
      expense_date: dayjs(),
      amount: undefined,
      title: "",
      description: "",
      reference_no: "",
      notes: "",
    });
    setFormModalOpen(true);
  };

  const openEdit = (record) => {
    setEditingExpense(record);
    form.setFieldsValue({
      homebase_id: record.homebase_id || selectedHomebaseId,
      periode_id: record.periode_id || undefined,
      category: record.category,
      payment_method: record.payment_method || "cash",
      expense_date: record.expense_date ? dayjs(record.expense_date) : dayjs(),
      amount: Number(record.amount || 0),
      title: record.title,
      description: record.description || "",
      reference_no: record.reference_no || "",
      notes: record.notes || "",
    });
    setFormModalOpen(true);
  };

  const closeModal = () => {
    setFormModalOpen(false);
    setEditingExpense(null);
    form.resetFields();
  };

  const handleSubmit = async (values) => {
    const payload = {
      homebase_id: lockHomebase
        ? selectedHomebaseId
        : values.homebase_id || selectedHomebaseId,
      periode_id: values.periode_id || null,
      category: values.category,
      title: values.title?.trim(),
      description: values.description?.trim() || null,
      amount: Number(values.amount),
      expense_date: values.expense_date
        ? dayjs(values.expense_date).format("YYYY-MM-DD")
        : null,
      payment_method: values.payment_method,
      reference_no: values.reference_no?.trim() || null,
      notes: values.notes?.trim() || null,
    };

    try {
      if (editingExpense?.id) {
        await updateExpense({ id: editingExpense.id, ...payload }).unwrap();
        message.success("Pengeluaran berhasil diperbarui");
      } else {
        await addExpense(payload).unwrap();
        message.success("Pengeluaran berhasil ditambahkan");
      }
      closeModal();
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan data pengeluaran");
    }
  };

  const handleDelete = async (record) => {
    try {
      await deleteExpense({
        id: record.id,
        homebase_id: selectedHomebaseId,
      }).unwrap();
      message.success("Pengeluaran berhasil dihapus");
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus pengeluaran");
    }
  };

  if (optionsQuery.isLoading) {
    return <LoadApp />;
  }

  return (
    <>
      <Flex vertical gap={isMobile ? 12 : 16}>
        <ExpenseHeader onCreate={openCreate} />

        <ExpenseSummaryCards summary={summary} />

        <MotionDiv
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card
            style={{
              ...cardStyle,
              borderRadius: isMobile ? 18 : 24,
            }}
            styles={{ body: { padding: isMobile ? 14 : 20 } }}
          >
            <Flex vertical gap={14}>
              <Flex
                justify='space-between'
                align={isMobile ? "stretch" : "center"}
                vertical={isMobile}
                gap={12}
                wrap='wrap'
              >
                <div>
                  <Text strong style={{ fontSize: 16 }}>
                    Daftar Pengeluaran
                  </Text>
                  <div>
                    <Text type='secondary' style={{ fontSize: 12 }}>
                      Filter berdasarkan periode, kategori, atau pencarian
                    </Text>
                  </div>
                </div>
                <Button
                  icon={<RefreshCw size={14} />}
                  onClick={() => refetch()}
                  loading={isFetchingList}
                  block={isMobile}
                >
                  Muat Ulang
                </Button>
              </Flex>

              <Flex
                gap={10}
                wrap='wrap'
                vertical={isMobile}
                style={{ width: "100%" }}
              >
                <Select
                  value={periodeFilter}
                  onChange={setPeriodeFilter}
                  allowClear
                  placeholder='Semua periode'
                  style={{ width: isMobile ? "100%" : 220 }}
                  options={periodes.map((item) => ({
                    value: Number(item.id),
                    label: item.name,
                  }))}
                  virtual={false}
                />
                <Select
                  value={categoryFilter}
                  onChange={setCategoryFilter}
                  style={{ width: isMobile ? "100%" : 200 }}
                  options={categoryOptions}
                  virtual={false}
                />
                <Input.Search
                  allowClear
                  placeholder='Cari judul / keterangan / referensi'
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  style={{ width: isMobile ? "100%" : 280 }}
                />
              </Flex>

              {isListError ? (
                <Alert
                  type='error'
                  showIcon
                  message={
                    listError?.data?.message ||
                    "Gagal memuat daftar pengeluaran"
                  }
                />
              ) : null}

              <ExpenseListTable
                data={expenses}
                loading={isLoadingList || isFetchingList}
                onEdit={openEdit}
                onDelete={handleDelete}
                deleting={deleteExpenseState.isLoading}
                categoryMeta={categoryMeta}
              />
            </Flex>
          </Card>
        </MotionDiv>
      </Flex>

      <ExpenseFormModal
        open={formModalOpen}
        editing={editingExpense}
        form={form}
        confirmLoading={
          addExpenseState.isLoading || updateExpenseState.isLoading
        }
        homebases={homebases}
        periodes={periodes}
        categories={formCategories}
        paymentMethods={paymentMethods}
        lockHomebase={lockHomebase}
        onCancel={closeModal}
        onSubmit={handleSubmit}
      />
    </>
  );
};

export default ExpenseDailyTab;
