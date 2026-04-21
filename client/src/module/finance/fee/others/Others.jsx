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

  const [typeForm] = Form.useForm();

  const { data: optionsResponse, isLoading: isLoadingOptions } =
    useGetOtherOptionsQuery(
      filters.homebase_id ? { homebase_id: filters.homebase_id } : undefined,
    );
  const { data: scopedOptionsResponse, isLoading: isLoadingScopedOptions } =
    useGetOtherOptionsQuery({
      homebase_id: filters.homebase_id,
      periode_id: filters.periode_id,
      grade_id: filters.grade_id,
      class_id: filters.class_id,
      search: filters.student_search,
    });
  const {
    data: typeResponse,
    isLoading: isLoadingTypes,
    isFetching: isFetchingTypes,
  } = useGetOtherPaymentTypesQuery({
    homebase_id: filters.homebase_id,
  });
  const {
    data: chargeResponse,
    isLoading: isLoadingCharges,
    isFetching: isFetchingCharges,
  } = useGetOtherChargesQuery(filters);

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
  const classes = useMemo(
    () => scopedOptions.classes || [],
    [scopedOptions.classes],
  );
  const students = useMemo(
    () => scopedOptions.students || [],
    [scopedOptions.students],
  );
  const types = typeResponse?.data || [];
  const charges = chargeResponse?.data || [];
  const summary = chargeResponse?.summary || {};

  /* eslint-disable react-hooks/set-state-in-effect */
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
      typeModalOpen &&
      homebases.length === 1 &&
      !typeForm.getFieldValue("homebase_id")
    ) {
      typeForm.setFieldValue("homebase_id", homebases[0]?.id);
    }
  }, [homebases, typeForm, typeModalOpen]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const openTypeModal = (record = null) => {
    setEditingType(record);

    if (record) {
      typeForm.setFieldsValue({
        homebase_id: record.homebase_id,
        name: record.name,
        description: record.description,
        amount: Number(record.amount || 0),
        grade_ids: record.grade_ids || [],
        is_active: record.is_active,
      });
    } else {
      typeForm.resetFields();
      typeForm.setFieldsValue({
        homebase_id:
          filters.homebase_id || options.selected_homebase_id || homebases[0]?.id,
        is_active: true,
        grade_ids: [],
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
      if (editingType) {
        await updateOtherPaymentType({
          id: editingType.type_id,
          homebase_id:
            values.homebase_id || editingType.homebase_id || filters.homebase_id,
          ...values,
        }).unwrap();
        message.success("Jenis biaya berhasil diperbarui");
      } else {
        await addOtherPaymentType({
          ...values,
          homebase_id: values.homebase_id || filters.homebase_id,
        }).unwrap();
        message.success("Jenis biaya berhasil ditambahkan");
      }

      setTypeModalOpen(false);
      setEditingType(null);
      typeForm.resetFields();
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan jenis biaya");
    }
  };

  const isPageBootstrapping =
    isLoadingOptions ||
    (!optionsResponse && !periodes.length) ||
    (Boolean(filters.periode_id) &&
      (isLoadingScopedOptions || isLoadingTypes || isLoadingCharges) &&
      !scopedOptionsResponse &&
      !typeResponse &&
      !chargeResponse);

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
                Satuan aktif: {activeHomebaseName}. Gunakan filter untuk
                memantau jenis biaya, status tagihan, dan realisasi pembayaran
                non-SPP dengan lebih terarah.
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
        }}
        onSubmit={handleSubmitType}
        form={typeForm}
        confirmLoading={isAddingType || isUpdatingType}
        homebases={homebases}
        grades={grades}
      />
    </MotionDiv>
  );
};

export default Others;
