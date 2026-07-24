import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Card, Form, Space, Tabs, Typography, message } from "antd";
import { motion } from "framer-motion";
import { CreditCard, ReceiptText, Sparkles } from "lucide-react";

import { LoadApp } from "../../../../components";
import {
  useAddOtherPaymentTypeMutation,
  useDeleteOtherChargeMutation,
  useDeleteOtherPaymentTypeMutation,
  useGetOtherChargesQuery,
  useGetOtherOptionsQuery,
  useGetOtherPaymentTypesQuery,
  useUpdateOtherPaymentTypeMutation,
} from "../../../../service/finance/ApiOthers";
import { cardStyle } from "./constants";
import OthersChargesTable from "./components/OthersChargesTable";
import OthersFilters from "./components/OthersFilters";
import OthersHeader from "./components/OthersHeader";
import OthersReportPanel from "./components/OthersReportPanel";
import OthersSummaryCards from "./components/OthersSummaryCards";
import OthersTypeModal from "./components/OthersTypeModal";
import OthersTypesTable from "./components/OthersTypesTable";

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

const Others = () => {
  const { user } = useSelector((state) => state.auth);

  const [filters, setFilters] = useState({
    homebase_id: undefined,
    periode_id: undefined,
    grade_id: undefined,
    class_id: undefined,
    student_id: undefined,
    student_search: "",
    type_id: undefined,
    status: undefined,
  });
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [periodeInitialized, setPeriodeInitialized] = useState(false);
  const [typeStudentFilter, setTypeStudentFilter] = useState({
    grade_id: undefined,
    class_id: undefined,
    search: "",
  });

  const [typeForm] = Form.useForm();
  const selectedTypeHomebaseId = Form.useWatch("homebase_id", typeForm);
  const selectedTypePeriodeId = Form.useWatch("periode_id", typeForm);
  const selectedTypeScope = Form.useWatch("scope", typeForm) || "grade";
  const selectedTypeStudentIds = Form.useWatch("student_ids", typeForm) || [];
  const hasPeriodeFilter = Boolean(filters.periode_id);

  const typeQueryFilters = {
    ...(filters.homebase_id ? { homebase_id: filters.homebase_id } : {}),
    ...(filters.periode_id ? { periode_id: filters.periode_id } : {}),
  };

  const chargeQueryFilters = {
    ...(filters.homebase_id ? { homebase_id: filters.homebase_id } : {}),
    ...(filters.periode_id ? { periode_id: filters.periode_id } : {}),
    ...(filters.grade_id ? { grade_id: filters.grade_id } : {}),
    ...(filters.class_id ? { class_id: filters.class_id } : {}),
    ...(filters.student_id ? { student_id: filters.student_id } : {}),
    ...(filters.student_search ? { student_search: filters.student_search } : {}),
    ...(filters.type_id ? { type_id: filters.type_id } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  };

  const { data: optionsResponse, isLoading: isLoadingOptions } =
    useGetOtherOptionsQuery(
      filters.homebase_id ? { homebase_id: filters.homebase_id } : undefined,
    );
  const { data: scopedOptionsResponse, isLoading: isLoadingScopedOptions } =
    useGetOtherOptionsQuery(
      hasPeriodeFilter
        ? {
            homebase_id: filters.homebase_id,
            periode_id: filters.periode_id,
            grade_id: filters.grade_id,
            class_id: filters.class_id,
            search: filters.student_search,
          }
        : filters.homebase_id
          ? { homebase_id: filters.homebase_id }
          : undefined,
    );
  const { data: typeModalOptionsResponse } = useGetOtherOptionsQuery(
    {
      homebase_id:
        selectedTypeHomebaseId || filters.homebase_id || undefined,
    },
    {
      skip:
        !typeModalOpen ||
        !(selectedTypeHomebaseId || filters.homebase_id),
    },
  );
  const {
    data: typeStudentOptionsResponse,
    isFetching: isFetchingTypeStudents,
  } = useGetOtherOptionsQuery(
    {
      homebase_id: selectedTypeHomebaseId || filters.homebase_id,
      periode_id: selectedTypePeriodeId,
      grade_id: typeStudentFilter.grade_id,
      class_id: typeStudentFilter.class_id,
      search: typeStudentFilter.search || undefined,
      limit: 500,
    },
    {
      skip:
        !typeModalOpen ||
        !(selectedTypeHomebaseId || filters.homebase_id) ||
        !selectedTypePeriodeId ||
        selectedTypeScope !== "student",
    },
  );
  const {
    data: typeResponse,
    isLoading: isLoadingTypes,
    isFetching: isFetchingTypes,
  } = useGetOtherPaymentTypesQuery(typeQueryFilters);
  const {
    data: chargeResponse,
    isLoading: isLoadingCharges,
    isFetching: isFetchingCharges,
  } = useGetOtherChargesQuery(chargeQueryFilters);

  const [addOtherPaymentType, { isLoading: isAddingType }] =
    useAddOtherPaymentTypeMutation();
  const [updateOtherPaymentType, { isLoading: isUpdatingType }] =
    useUpdateOtherPaymentTypeMutation();
  const [deleteOtherPaymentType, { isLoading: isDeletingType }] =
    useDeleteOtherPaymentTypeMutation();
  const [deleteOtherCharge, { isLoading: isDeletingCharge }] =
    useDeleteOtherChargeMutation();

  const options = optionsResponse?.data || {};
  const scopedOptions = scopedOptionsResponse?.data || {};
  const homebases = useMemo(() => options.homebases || [], [options.homebases]);
  const periodes = useMemo(() => options.periodes || [], [options.periodes]);
  const grades = useMemo(() => options.grades || [], [options.grades]);
  const typeModalOptions = typeModalOptionsResponse?.data || {};
  const typeModalGrades = useMemo(
    () => typeModalOptions.grades || grades,
    [typeModalOptions.grades, grades],
  );
  const typeModalPeriodes = useMemo(
    () => typeModalOptions.periodes || periodes,
    [typeModalOptions.periodes, periodes],
  );
  const typeModalClasses = useMemo(() => {
    const apiClasses = typeStudentOptionsResponse?.data?.classes || [];
    if (!typeStudentFilter.grade_id) {
      return apiClasses;
    }

    return apiClasses.filter(
      (item) => Number(item.grade_id) === Number(typeStudentFilter.grade_id),
    );
  }, [typeStudentFilter.grade_id, typeStudentOptionsResponse?.data?.classes]);
  const typeModalStudents = useMemo(() => {
    const apiStudents = typeStudentOptionsResponse?.data?.students || [];
    const studentMap = new Map();

    apiStudents.forEach((item) => {
      const id = Number(item.id);
      if (!Number.isFinite(id)) {
        return;
      }

      studentMap.set(id, {
        ...item,
        id,
        full_name: item.full_name || item.name || `Siswa #${id}`,
        nis: item.nis || "-",
        class_name: item.class_name || "-",
        grade_name: item.grade_name || "-",
      });
    });

    selectedTypeStudentIds.forEach((studentId) => {
      const key = Number(studentId);
      if (!Number.isFinite(key) || studentMap.has(key)) {
        return;
      }

      studentMap.set(key, {
        id: key,
        full_name: `Siswa #${key}`,
        nis: "-",
        class_name: "-",
        grade_name: "-",
      });
    });

    return [...studentMap.values()].sort((left, right) =>
      String(left.full_name).localeCompare(String(right.full_name), "id", {
        sensitivity: "base",
      }),
    );
  }, [selectedTypeStudentIds, typeStudentOptionsResponse?.data?.students]);
  const classes = useMemo(
    () => scopedOptions.classes || [],
    [scopedOptions.classes],
  );
  const students = useMemo(
    () => scopedOptions.students || [],
    [scopedOptions.students],
  );
  const types = useMemo(() => typeResponse?.data || [], [typeResponse?.data]);
  const charges = useMemo(
    () => chargeResponse?.data || [],
    [chargeResponse?.data],
  );
  const summary = useMemo(
    () => chargeResponse?.summary || {},
    [chargeResponse?.summary],
  );

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!homebases.length || filters.homebase_id) {
      return;
    }

    const defaultHomebase =
      options.selected_homebase_id ||
      (homebases.length === 1 ? homebases[0]?.id : undefined);

    if (defaultHomebase) {
      setFilters((previous) => ({
        ...previous,
        homebase_id: defaultHomebase,
      }));
    }
  }, [filters.homebase_id, homebases, options.selected_homebase_id]);

  useEffect(() => {
    if (!periodes.length || periodeInitialized) {
      return;
    }

    const activePeriode =
      periodes.find((item) => item.is_active) || periodes[0];

    setFilters((previous) => ({
      ...previous,
      periode_id: previous.periode_id || activePeriode?.id,
    }));
    setPeriodeInitialized(true);
  }, [periodes, periodeInitialized]);

  useEffect(() => {
    if (!periodes.length || !filters.periode_id) {
      return;
    }

    const periodeExists = periodes.some(
      (item) => Number(item.id) === Number(filters.periode_id),
    );
    if (periodeExists) {
      return;
    }

    const activePeriode =
      periodes.find((item) => item.is_active) || periodes[0];
    setFilters((previous) => ({
      ...previous,
      periode_id: activePeriode?.id,
      grade_id: undefined,
      class_id: undefined,
      student_id: undefined,
      student_search: "",
      type_id: undefined,
    }));
  }, [periodes, filters.periode_id]);

  useEffect(() => {
    if (
      filters.class_id &&
      !classes.some((item) => item.id === filters.class_id)
    ) {
      setFilters((previous) => ({
        ...previous,
        class_id: undefined,
        student_id: undefined,
        student_search: "",
      }));
    }
  }, [classes, filters.class_id]);

  useEffect(() => {
    if (
      filters.student_id &&
      !students.some((item) => Number(item.id) === Number(filters.student_id))
    ) {
      setFilters((previous) => ({
        ...previous,
        student_id: undefined,
      }));
    }
  }, [filters.student_id, students]);

  useEffect(() => {
    if (
      filters.type_id &&
      !types.some((item) => Number(item.type_id) === Number(filters.type_id))
    ) {
      setFilters((previous) => ({
        ...previous,
        type_id: undefined,
      }));
    }
  }, [filters.type_id, types]);

  useEffect(() => {
    if (!typeModalOpen) {
      return;
    }

    const currentHomebaseId = typeForm.getFieldValue("homebase_id");
    const fallbackHomebaseId =
      filters.homebase_id ||
      options.selected_homebase_id ||
      homebases[0]?.id;

    if (!currentHomebaseId && fallbackHomebaseId) {
      typeForm.setFieldValue("homebase_id", fallbackHomebaseId);
    }
  }, [
    filters.homebase_id,
    homebases,
    options.selected_homebase_id,
    typeForm,
    typeModalOpen,
  ]);

  useEffect(() => {
    if (!typeModalOpen || !(selectedTypeHomebaseId || filters.homebase_id)) {
      return;
    }

    const currentGradeIds = typeForm.getFieldValue("grade_ids") || [];
    const validGradeIds = new Set(typeModalGrades.map((item) => Number(item.id)));
    const nextGradeIds = currentGradeIds.filter((item) =>
      validGradeIds.has(Number(item)),
    );

    if (nextGradeIds.length !== currentGradeIds.length) {
      typeForm.setFieldValue("grade_ids", nextGradeIds);
    }

    const currentPeriodeId = typeForm.getFieldValue("periode_id");
    if (
      currentPeriodeId &&
      typeModalPeriodes.length > 0 &&
      !typeModalPeriodes.some(
        (item) => Number(item.id) === Number(currentPeriodeId),
      )
    ) {
      const activePeriode =
        typeModalPeriodes.find((item) => item.is_active) || typeModalPeriodes[0];
      typeForm.setFieldValue("periode_id", activePeriode?.id);
      typeForm.setFieldValue("student_ids", []);
    }
  }, [
    selectedTypeHomebaseId,
    typeForm,
    typeModalOpen,
    typeModalGrades,
    typeModalPeriodes,
  ]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const resetTypeStudentFilter = () => {
    setTypeStudentFilter({
      grade_id: undefined,
      class_id: undefined,
      search: "",
    });
  };

  const openTypeModal = (record = null) => {
    setEditingType(record);
    resetTypeStudentFilter();

    const defaultPeriode =
      filters.periode_id ||
      periodes.find((item) => item.is_active)?.id ||
      periodes[0]?.id;

    if (record) {
      typeForm.setFieldsValue({
        homebase_id: record.homebase_id,
        periode_id: record.periode_id || defaultPeriode,
        scope: record.scope === "student" ? "student" : "grade",
        name: record.name,
        description: record.description,
        amount: Number(record.amount || 0),
        grade_ids: record.grade_ids || [],
        student_ids: record.student_ids || [],
        is_active: record.is_active,
      });
    } else {
      typeForm.resetFields();
      typeForm.setFieldsValue({
        homebase_id:
          filters.homebase_id || options.selected_homebase_id || homebases[0]?.id,
        periode_id: defaultPeriode,
        scope: "grade",
        is_active: true,
        grade_ids: [],
        student_ids: [],
      });
    }

    setTypeModalOpen(true);
  };

  const handleDeleteType = async (record) => {
    try {
      await deleteOtherPaymentType({
        id: record.type_id,
        homebase_id: record.homebase_id || filters.homebase_id,
      }).unwrap();
      message.success("Jenis biaya berhasil dihapus");
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus jenis biaya");
    }
  };

  const handleBulkDeleteType = async (records) => {
    const results = await Promise.allSettled(
      records.map((record) =>
        deleteOtherPaymentType({
          id: record.type_id,
          homebase_id: record.homebase_id || filters.homebase_id,
        }).unwrap(),
      ),
    );

    const succeeded = results.filter((item) => item.status === "fulfilled").length;
    const failed = results.length - succeeded;

    if (succeeded > 0) {
      message.success(`${succeeded} jenis biaya berhasil dihapus`);
    }

    if (failed > 0) {
      const firstError = results.find((item) => item.status === "rejected");
      message.error(
        firstError?.reason?.data?.message ||
          `${failed} jenis biaya gagal dihapus`,
      );
    }
  };

  const handleDeleteCharge = async (record) => {
    try {
      await deleteOtherCharge({
        id: record.charge_id,
        homebase_id: record.homebase_id || filters.homebase_id,
      }).unwrap();
      message.success("Tagihan berhasil dihapus");
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus tagihan");
    }
  };

  const handleSubmitType = async (values) => {
    try {
      const payload = {
        ...values,
        homebase_id:
          values.homebase_id ||
          editingType?.homebase_id ||
          filters.homebase_id,
        scope: values.scope === "student" ? "student" : "grade",
      };

      if (payload.scope === "student") {
        payload.student_ids = values.student_ids || [];
        payload.grade_ids = [];
      } else {
        payload.grade_ids = values.grade_ids || [];
        payload.student_ids = [];
      }

      if (editingType) {
        await updateOtherPaymentType({
          id: editingType.type_id,
          ...payload,
        }).unwrap();
        message.success("Jenis biaya berhasil diperbarui");
      } else {
        await addOtherPaymentType(payload).unwrap();
        message.success("Jenis biaya berhasil ditambahkan");
      }

      setTypeModalOpen(false);
      setEditingType(null);
      resetTypeStudentFilter();
      typeForm.resetFields();
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan jenis biaya");
    }
  };

  const isPageBootstrapping =
    isLoadingOptions ||
    (!optionsResponse && !periodes.length) ||
    ((isLoadingTypes || isLoadingCharges || isLoadingScopedOptions) &&
      !typeResponse &&
      !chargeResponse &&
      !periodeInitialized);

  if (isPageBootstrapping) {
    return <LoadApp />;
  }

  const activeHomebaseName =
    homebases.find((item) => Number(item.id) === Number(filters.homebase_id))
      ?.name ||
    (filters.homebase_id
      ? user?.homebase_name || user?.homebase_id || "-"
      : "Semua satuan");
  const activePeriodeName = filters.periode_id
    ? periodes.find((item) => Number(item.id) === Number(filters.periode_id))
        ?.name || "-"
    : "Semua periode";

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
          <OthersHeader onOpenType={() => openTypeModal()} />
        </MotionDiv>

        <MotionDiv variants={itemVariants}>
          <OthersSummaryCards summary={summary} />
        </MotionDiv>

        <MotionDiv variants={itemVariants}>
          <OthersFilters
            filters={filters}
            setFilters={setFilters}
            homebases={homebases}
            periodes={periodes}
            grades={grades}
            classes={classes}
            students={students}
            types={types}
          />
        </MotionDiv>

        <MotionDiv variants={itemVariants}>
          <Card
            style={{
              ...cardStyle,
              borderRadius: 28,
              boxShadow: "0 24px 60px rgba(15, 23, 42, 0.07)",
            }}
            styles={{ body: { paddingTop: 12 } }}
          >
            <Tabs
              tabBarGutter={14}
              tabBarStyle={{ marginBottom: 20, paddingBottom: 8 }}
              items={[
                {
                  key: "types",
                  label: createTabLabel(
                    "Jenis Biaya",
                    <ReceiptText size={16} />,
                    types.length,
                    "Master biaya non-SPP",
                  ),
                  children: (
                    <OthersTypesTable
                      types={types}
                      loading={isFetchingTypes}
                      onAddType={() => openTypeModal()}
                      onEditType={openTypeModal}
                      onDeleteType={handleDeleteType}
                      onBulkDeleteType={handleBulkDeleteType}
                      isDeletingType={isDeletingType}
                    />
                  ),
                },
                {
                  key: "report",
                  label: createTabLabel(
                    "Laporan Pembayaran",
                    <CreditCard size={16} />,
                    charges.length,
                    "Ringkasan dan daftar tagihan",
                  ),
                  children: (
                    <Tabs
                      tabBarGutter={12}
                      items={[
                        {
                          key: "summary",
                          label: "Rangkuman",
                          children: <OthersReportPanel charges={charges} />,
                        },
                        {
                          key: "payments",
                          label: `Daftar Pembayaran (${charges.length})`,
                          children: (
                            <OthersChargesTable
                              charges={charges}
                              loading={isFetchingCharges}
                              onDeleteCharge={handleDeleteCharge}
                              isDeletingCharge={isDeletingCharge}
                            />
                          ),
                        },
                      ]}
                    />
                  ),
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
                Tampilan saat ini: {activeHomebaseName} · {activePeriodeName}.
                Kosongkan filter periode untuk melihat semua periode. Tagihan
                mengikuti cakupan jenis (tingkat / individu); siswa yang pindah
                kelas tetap terikat jika masuk roster individu.
              </Text>
            </Space>
          </Card>
        </MotionDiv>
      </Space>

      <OthersTypeModal
        open={typeModalOpen}
        editingType={editingType}
        onCancel={() => {
          setTypeModalOpen(false);
          setEditingType(null);
          resetTypeStudentFilter();
        }}
        onSubmit={handleSubmitType}
        onHomebaseChange={() => {
          typeForm.setFieldValue("grade_ids", []);
          typeForm.setFieldValue("student_ids", []);
          typeForm.setFieldValue("periode_id", undefined);
          resetTypeStudentFilter();
        }}
        onPeriodeChange={() => {
          typeForm.setFieldValue("student_ids", []);
          resetTypeStudentFilter();
        }}
        onScopeChange={(nextScope) => {
          if (nextScope === "student") {
            typeForm.setFieldValue("grade_ids", []);
          } else {
            typeForm.setFieldValue("student_ids", []);
            resetTypeStudentFilter();
          }
        }}
        onStudentFilterChange={(patch) => {
          setTypeStudentFilter((previous) => ({
            ...previous,
            ...patch,
          }));
        }}
        form={typeForm}
        confirmLoading={isAddingType || isUpdatingType}
        homebases={homebases}
        periodes={typeModalPeriodes}
        grades={typeModalGrades}
        classes={typeModalClasses}
        students={typeModalStudents}
        studentsLoading={isFetchingTypeStudents}
        studentFilter={typeStudentFilter}
      />
    </MotionDiv>
  );
};

export default Others;
