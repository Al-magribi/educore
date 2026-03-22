import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Form, Space, Tabs, Typography, message } from "antd";

import {
  useAddMonthlyTariffMutation,
  useDeleteMonthlyTariffMutation,
  useGetMonthlyOptionsQuery,
  useGetMonthlyPaymentsQuery,
  useGetMonthlyTariffsQuery,
  useUpdateMonthlyTariffMutation,
} from "../../../../service/finance/ApiMonthly";
import { LoadApp } from "../../../../components";
import { currentMonth, pageStyle } from "./constants";
import MonthlyHeader from "./components/MonthlyHeader";
import MonthlySummaryCards from "./components/MonthlySummaryCards";
import MonthlyFilters from "./components/MonthlyFilters";
import MonthlyPaymentTable from "./components/MonthlyPaymentTable";
import MonthlyTariffTable from "./components/MonthlyTariffTable";
import MonthlyReportPanel from "./components/MonthlyReportPanel";
import MonthlyTariffModal from "./components/MonthlyTariffModal";

const { Text } = Typography;

const Monthly = ({ initialTab = "payments" }) => {
  const { user } = useSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState(initialTab);
  const [filters, setFilters] = useState({
    periode_id: undefined,
    grade_id: undefined,
    class_id: undefined,
    student_id: undefined,
    bill_month: currentMonth,
  });
  const [tariffModalOpen, setTariffModalOpen] = useState(false);
  const [editingTariff, setEditingTariff] = useState(null);

  const [tariffForm] = Form.useForm();

  const { data: optionsResponse, isLoading: isLoadingOptions } = useGetMonthlyOptionsQuery();
  const { data: filterOptionsResponse, isLoading: isLoadingFilterOptions } = useGetMonthlyOptionsQuery({
    periode_id: filters.periode_id,
    grade_id: filters.grade_id,
    class_id: filters.class_id,
  });
  const { data: tariffResponse, isLoading: isLoadingTariffs, isFetching: isFetchingTariffs } =
    useGetMonthlyTariffsQuery({
      periode_id: filters.periode_id,
      grade_id: filters.grade_id,
    });
  const { data: paymentResponse, isLoading: isLoadingPayments, isFetching: isFetchingPayments } =
    useGetMonthlyPaymentsQuery(filters);

  const [addMonthlyTariff, { isLoading: isAddingTariff }] =
    useAddMonthlyTariffMutation();
  const [updateMonthlyTariff, { isLoading: isUpdatingTariff }] =
    useUpdateMonthlyTariffMutation();
  const [deleteMonthlyTariff, { isLoading: isDeletingTariff }] =
    useDeleteMonthlyTariffMutation();

  const options = optionsResponse?.data || {};
  const filterOptions = filterOptionsResponse?.data || {};
  const periodes = options.periodes || [];
  const grades = options.grades || [];
  const months = options.months || [];
  const mainClasses = filterOptions.classes || [];
  const mainStudents = filterOptions.students || [];
  const tariffs = tariffResponse?.data || [];
  const payments = paymentResponse?.data || [];
  const paymentSummary = paymentResponse?.summary || {};

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

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
      !mainClasses.some((item) => item.id === filters.class_id)
    ) {
      setFilters((previous) => ({
        ...previous,
        class_id: undefined,
        student_id: undefined,
      }));
    }
  }, [filters.class_id, mainClasses]);

  useEffect(() => {
    if (
      filters.student_id &&
      !mainStudents.some((item) => item.id === filters.student_id)
    ) {
      setFilters((previous) => ({
        ...previous,
        student_id: undefined,
      }));
    }
  }, [filters.student_id, mainStudents]);

  const summaryCards = [
    {
      key: "total",
      title: "Total Siswa",
      value: paymentSummary.total_records || 0,
      prefix: "",
      note: "Jumlah siswa sesuai filter yang dipilih",
    },
    {
      key: "paid",
      title: "Sudah Lunas",
      value: paymentSummary.paid_count || 0,
      prefix: "",
      note: "Siswa yang sudah melunasi bulan terpilih",
    },
    {
      key: "unpaid",
      title: "Belum Bayar",
      value: paymentSummary.unpaid_count || 0,
      prefix: "",
      note: "Siswa yang belum melunasi bulan terpilih",
    },
    {
      key: "amount",
      title: "SPP",
      value: paymentSummary.paid_amount || 0,
      prefix: "Rp",
      note: "Akumulasi SPP yang sudah lunas",
    },
  ];

  const openTariffModal = (record = null) => {
    setEditingTariff(record);

    if (record) {
      tariffForm.setFieldsValue({
        periode_id: record.periode_id,
        grade_id: record.grade_id,
        amount: Number(record.amount),
        description: record.description,
        is_active: record.is_active,
      });
    } else {
      tariffForm.resetFields();
      tariffForm.setFieldsValue({
        periode_id: filters.periode_id,
        grade_id: filters.grade_id,
        is_active: true,
      });
    }

    setTariffModalOpen(true);
  };

  const handleDeleteTariff = async (id) => {
    try {
      await deleteMonthlyTariff(id).unwrap();
      message.success("Tarif SPP berhasil dihapus");
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus tarif SPP");
    }
  };

  const handleSubmitTariff = async (values) => {
    try {
      if (editingTariff) {
        await updateMonthlyTariff({
          id: editingTariff.id,
          ...values,
        }).unwrap();
        message.success("Tarif SPP berhasil diperbarui");
      } else {
        await addMonthlyTariff(values).unwrap();
        message.success("Tarif SPP berhasil ditambahkan");
      }

      setTariffModalOpen(false);
      setEditingTariff(null);
      tariffForm.resetFields();
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan tarif SPP");
    }
  };

  const isPageBootstrapping =
    isLoadingOptions ||
    (!optionsResponse && !periodes.length) ||
    (Boolean(filters.periode_id) &&
      (isLoadingFilterOptions || isLoadingTariffs || isLoadingPayments) &&
      !filterOptionsResponse &&
      !tariffResponse &&
      !paymentResponse);

  if (isPageBootstrapping) {
    return <LoadApp />;
  }

  return (
    <div style={pageStyle}>
      <div style={{ width: "100%" }}>
        <Space vertical size={24} style={{ width: "100%" }}>
          <div>
            <MonthlyHeader
              onOpenTariff={() => openTariffModal()}
            />
          </div>

          <div>
            <MonthlySummaryCards items={summaryCards} />
          </div>

          <div>
            <MonthlyFilters
              filters={filters}
              setFilters={setFilters}
              periodes={periodes}
              grades={grades}
              classes={mainClasses}
              students={mainStudents}
              months={months}
            />
          </div>

          <div>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={[
                {
                  key: "payments",
                  label: `Pembayaran SPP (${payments.length})`,
                  children: (
                    <MonthlyPaymentTable
                      payments={payments}
                      loading={isFetchingPayments}
                    />
                  ),
                },
                {
                  key: "tariffs",
                  label: `Tarif SPP (${tariffs.length})`,
                  children: (
                    <MonthlyTariffTable
                      tariffs={tariffs}
                      loading={isFetchingTariffs}
                      onEdit={openTariffModal}
                      onDelete={handleDeleteTariff}
                      isDeletingTariff={isDeletingTariff}
                    />
                  ),
                },
                {
                  key: "report",
                  label: "Laporan SPP",
                  children: <MonthlyReportPanel payments={payments} />,
                },
              ]}
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <Text type='secondary'>
              Satuan aktif: {user?.homebase_name || user?.homebase_id || "-"}.
            </Text>
          </div>
        </Space>

        <MonthlyTariffModal
          open={tariffModalOpen}
          editingTariff={editingTariff}
          onCancel={() => {
            setTariffModalOpen(false);
            setEditingTariff(null);
          }}
          onSubmit={handleSubmitTariff}
          form={tariffForm}
          periodes={periodes}
          grades={grades}
          confirmLoading={isAddingTariff || isUpdatingTariff}
        />
      </div>
    </div>
  );
};

export default Monthly;
