import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  Card,
  Flex,
  Form,
  Space,
  Tabs,
  Typography,
  message,
} from "antd";

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
import OthersReportPanel from "./components/OthersReportPanel";
import OthersSummaryCards from "./components/OthersSummaryCards";
import OthersTypeModal from "./components/OthersTypeModal";
import OthersTypesTable from "./components/OthersTypesTable";

const { Text, Title } = Typography;

const Others = () => {
  const { user } = useSelector((state) => state.auth);

  const [filters, setFilters] = useState({
    periode_id: undefined,
    grade_id: undefined,
    class_id: undefined,
    student_id: undefined,
    type_id: undefined,
    status: undefined,
  });
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);

  const [typeForm] = Form.useForm();

  const { data: optionsResponse, isLoading: isLoadingOptions } =
    useGetOtherOptionsQuery();
  const { data: scopedOptionsResponse, isLoading: isLoadingScopedOptions } =
    useGetOtherOptionsQuery({
      periode_id: filters.periode_id,
      grade_id: filters.grade_id,
      class_id: filters.class_id,
    });
  const {
    data: typeResponse,
    isLoading: isLoadingTypes,
    isFetching: isFetchingTypes,
  } = useGetOtherPaymentTypesQuery();
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
  const periodes = options.periodes || [];
  const grades = options.grades || [];
  const classes = scopedOptions.classes || [];
  const students = scopedOptions.students || [];
  const types = typeResponse?.data || [];
  const charges = chargeResponse?.data || [];
  const summary = chargeResponse?.summary || {};
  const paidCharges = charges.filter((item) => item.status === "paid");
  const unpaidCharges = charges.filter((item) => item.status !== "paid");

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
      }));
    }
  }, [classes, filters.class_id]);

  useEffect(() => {
    if (
      filters.student_id &&
      !students.some((item) => item.id === filters.student_id)
    ) {
      setFilters((previous) => ({
        ...previous,
        student_id: undefined,
      }));
    }
  }, [filters.student_id, students]);

  const openTypeModal = (record = null) => {
    setEditingType(record);

    if (record) {
      typeForm.setFieldsValue({
        name: record.name,
        description: record.description,
        amount: Number(record.amount || 0),
        grade_ids: record.grade_ids || [],
        is_active: record.is_active,
      });
    } else {
      typeForm.resetFields();
      typeForm.setFieldsValue({ is_active: true, grade_ids: [] });
    }

    setTypeModalOpen(true);
  };

  const handleDeleteType = async (id) => {
    try {
      await deleteOtherPaymentType(id).unwrap();
      message.success("Jenis biaya berhasil dihapus");
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus jenis biaya");
    }
  };

  const handleDeleteCharge = async (id) => {
    try {
      await deleteOtherCharge(id).unwrap();
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
          ...values,
        }).unwrap();
        message.success("Jenis biaya berhasil diperbarui");
      } else {
        await addOtherPaymentType(values).unwrap();
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

  return (
    <div>
      <Space vertical size={24} style={{ width: "100%" }}>
        <div>
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
                    marginBottom: 4,
                  }}
                >
                  Finance / Pembayaran Lainnya
                </Text>
                <Title level={4} style={{ margin: 0 }}>
                  Pengelolaan Tagihan Non-SPP
                </Title>
              </div>
            </Flex>
          </Card>
        </div>

        <div>
          <OthersSummaryCards summary={summary} />
        </div>

        <div>
          <OthersFilters
            filters={filters}
            setFilters={setFilters}
            periodes={periodes}
            grades={grades}
            classes={classes}
            students={students}
            types={types}
          />
        </div>

        <div>
          <Card style={cardStyle} styles={{ body: { paddingTop: 12 } }}>
            <Tabs
              items={[
                {
                  key: "types",
                  label: `Jenis Biaya (${types.length})`,
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
                  key: "paid",
                  label: `Lunas (${paidCharges.length})`,
                  children: (
                    <OthersChargesTable
                      charges={paidCharges}
                      loading={isFetchingCharges}
                      onDeleteCharge={handleDeleteCharge}
                      isDeletingCharge={isDeletingCharge}
                    />
                  ),
                },
                {
                  key: "unpaid",
                  label: `Belum Lunas (${unpaidCharges.length})`,
                  children: (
                    <OthersChargesTable
                      charges={unpaidCharges}
                      loading={isFetchingCharges}
                      onDeleteCharge={handleDeleteCharge}
                      isDeletingCharge={isDeletingCharge}
                    />
                  ),
                },
                {
                  key: "report",
                  label: "Laporan Pembayaran",
                  children: <OthersReportPanel charges={charges} />,
                },
              ]}
            />
          </Card>
        </div>

        <div style={{ marginTop: 12 }}>
          <Text type='secondary'>
            Satuan aktif: {user?.homebase_name || user?.homebase_id || "-"}.
          </Text>
        </div>
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
        grades={grades}
      />
    </div>
  );
};

export default Others;
