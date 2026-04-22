import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Card,
  Flex,
  Form,
  Grid,
  Button,
  Space,
  Typography,
  message,
} from "antd";
import { motion } from "framer-motion";
import { Banknote, Building2, CreditCard, FileBadge2 } from "lucide-react";
import { LoadApp } from "../../../components";
import {
  useAddBankAccountMutation,
  useDeleteBankAccountMutation,
  useGetFinanceSettingsQuery,
  useGetSettingOptionsQuery,
  useSaveFinanceProfileMutation,
  useSaveMidtransConfigMutation,
  useUpdatePaymentMethodMutation,
  useUploadFinanceSignatureMutation,
  useUpdateBankAccountMutation,
} from "../../../service/finance/ApiSetting";
import SettingHeader from "./components/SettingHeader";
import FinanceProfileTab from "./components/FinanceProfileTab";
import MidtransTab from "./components/MidtransTab";
import PaymentMethodsCard from "./components/PaymentMethodsCard";
import BankAccountsTab, {
  createBankColumns,
} from "./components/BankAccountsTab";

const MotionDiv = motion.div;

const containerVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.28,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const { Paragraph, Text, Title } = Typography;

const hasValue = (value) =>
  value !== undefined && value !== null && value !== "";

const Setting = () => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [selectedHomebaseId, setSelectedHomebaseId] = useState();
  const [activeTab, setActiveTab] = useState("profile");
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [editingBankAccount, setEditingBankAccount] = useState(null);

  const [midtransForm] = Form.useForm();
  const [financeProfileForm] = Form.useForm();
  const [bankForm] = Form.useForm();

  const { data: optionsResponse, isLoading: isLoadingOptions } =
    useGetSettingOptionsQuery(
      hasValue(selectedHomebaseId) ? { homebase_id: selectedHomebaseId } : undefined,
    );

  const optionData = optionsResponse?.data || {};
  const homebases = Array.isArray(optionData.homebases) ? optionData.homebases : [];
  const fallbackHomebaseId =
    optionData.selected_homebase_id ?? homebases[0]?.id ?? null;
  const effectiveSelectedHomebaseId =
    hasValue(selectedHomebaseId) ? selectedHomebaseId : fallbackHomebaseId;
  const hasSelectedHomebase = hasValue(effectiveSelectedHomebaseId);

  const selectedHomebaseParam = useMemo(
    () =>
      hasSelectedHomebase
        ? { homebase_id: effectiveSelectedHomebaseId }
        : undefined,
    [effectiveSelectedHomebaseId, hasSelectedHomebase],
  );

  const {
    data: settingsResponse,
    isLoading: isLoadingSettings,
    isFetching: isFetchingSettings,
  } = useGetFinanceSettingsQuery(selectedHomebaseParam, {
    skip: !hasSelectedHomebase,
  });

  const [saveMidtransConfig, { isLoading: isSavingMidtrans }] =
    useSaveMidtransConfigMutation();
  const [updatePaymentMethod, { isLoading: isUpdatingPaymentMethod }] =
    useUpdatePaymentMethodMutation();
  const [saveFinanceProfile, { isLoading: isSavingFinanceProfile }] =
    useSaveFinanceProfileMutation();
  const [uploadFinanceSignature, { isLoading: isUploadingSignature }] =
    useUploadFinanceSignatureMutation();
  const [addBankAccount, { isLoading: isAddingBankAccount }] =
    useAddBankAccountMutation();
  const [updateBankAccount, { isLoading: isUpdatingBankAccount }] =
    useUpdateBankAccountMutation();
  const [deleteBankAccount, { isLoading: isDeletingBankAccount }] =
    useDeleteBankAccountMutation();

  const settingsData = settingsResponse?.data || {};
  const selectedHomebase =
    settingsData.homebase ||
    homebases.find(
      (item) => String(item.id) === String(effectiveSelectedHomebaseId),
    ) ||
    null;
  const gatewayConfig = settingsData.gateway_config || null;
  const financeSetting = settingsData.finance_setting || null;
  const bankAccounts = settingsData.bank_accounts || [];
  const paymentMethods = settingsData.payment_methods || [];
  const manualBankMethod =
    paymentMethods.find((item) => item.method_type === "manual_bank") || null;
  const manualCashMethod =
    paymentMethods.find((item) => item.method_type === "manual_cash") || null;
  const midtransMethod =
    paymentMethods.find((item) => item.method_type === "midtrans") || null;

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!hasValue(selectedHomebaseId) && hasValue(fallbackHomebaseId)) {
      setSelectedHomebaseId(fallbackHomebaseId);
    }
  }, [fallbackHomebaseId, selectedHomebaseId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!settingsResponse) {
      return;
    }

    midtransForm.setFieldsValue({
      merchant_id: gatewayConfig?.merchant_id,
      client_key: gatewayConfig?.client_key,
      server_key: undefined,
      va_fee_amount: gatewayConfig?.va_fee_amount || 0,
      is_production: gatewayConfig?.is_production || false,
      is_active: gatewayConfig?.is_active ?? true,
      snap_enabled: gatewayConfig?.snap_enabled ?? true,
    });
  }, [gatewayConfig, midtransForm, settingsResponse]);

  useEffect(() => {
    if (!settingsResponse) {
      return;
    }

    financeProfileForm.setFieldsValue({
      officer_name: financeSetting?.officer_name,
      officer_signature_url: financeSetting?.officer_signature_url,
    });
  }, [financeProfileForm, financeSetting, settingsResponse]);

  const openCreateBankModal = () => {
    setEditingBankAccount(null);
    setBankModalOpen(true);
  };

  const openEditBankModal = (record) => {
    setEditingBankAccount(record);
    setBankModalOpen(true);
  };

  const closeBankModal = () => {
    setBankModalOpen(false);
    setEditingBankAccount(null);
    bankForm.resetFields();
  };

  useEffect(() => {
    if (!bankModalOpen) {
      return;
    }

    if (editingBankAccount) {
      bankForm.setFieldsValue({
        bank_name: editingBankAccount.bank_name,
        account_name: editingBankAccount.account_name,
        account_number: editingBankAccount.account_number,
        branch: editingBankAccount.branch,
        is_active: editingBankAccount.is_active,
      });
      return;
    }

    bankForm.resetFields();
    bankForm.setFieldsValue({ is_active: true });
  }, [bankForm, bankModalOpen, editingBankAccount]);

  const handleSubmitMidtrans = async (values) => {
    if (!hasSelectedHomebase) {
      message.error("Satuan wajib dipilih terlebih dahulu");
      return;
    }

    try {
      await saveMidtransConfig({
        homebase_id: effectiveSelectedHomebaseId,
        ...values,
      }).unwrap();
      message.success("Pengaturan Midtrans berhasil disimpan");
      midtransForm.setFieldValue("server_key", undefined);
    } catch (error) {
      message.error(
        error?.data?.message || "Gagal menyimpan pengaturan Midtrans",
      );
    }
  };

  const handleSubmitFinanceProfile = async () => {
    if (!hasSelectedHomebase) {
      message.error("Satuan wajib dipilih terlebih dahulu");
      return;
    }

    try {
      const values = await financeProfileForm.validateFields([
        "officer_name",
        "officer_signature_url",
      ]);

      await saveFinanceProfile({
        homebase_id: effectiveSelectedHomebaseId,
        ...values,
      }).unwrap();
      message.success("Data petugas invoice berhasil disimpan");
    } catch (error) {
      if (error?.errorFields) {
        return;
      }

      message.error(
        error?.data?.message || "Gagal menyimpan data petugas invoice",
      );
    }
  };

  const handleTogglePaymentMethod = async (methodType, nextActive) => {
    if (!hasSelectedHomebase) {
      message.error("Satuan wajib dipilih terlebih dahulu");
      return;
    }

    try {
      await updatePaymentMethod({
        homebase_id: effectiveSelectedHomebaseId,
        method_type: methodType,
        is_active: nextActive,
      }).unwrap();
      message.success(
        nextActive
          ? "Metode pembayaran berhasil diaktifkan"
          : "Metode pembayaran berhasil dinonaktifkan",
      );
    } catch (error) {
      message.error(
        error?.data?.message || "Gagal memperbarui metode pembayaran",
      );
    }
  };

  const handleUploadSignature = async ({ file, onSuccess, onError }) => {
    if (!hasSelectedHomebase) {
      const uploadError = new Error("Satuan wajib dipilih terlebih dahulu");
      onError?.(uploadError);
      message.error(uploadError.message);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await uploadFinanceSignature(formData).unwrap();
      const uploadedUrl = response?.data?.url || response?.url || "";

      financeProfileForm.setFieldValue("officer_signature_url", uploadedUrl);
      onSuccess?.(response, file);
      message.success("Tanda tangan berhasil diunggah");
    } catch (error) {
      onError?.(error);
      message.error(error?.data?.message || "Gagal mengunggah tanda tangan");
    }
  };

  const handleSubmitBankAccount = async (values) => {
    if (!hasSelectedHomebase) {
      message.error("Satuan wajib dipilih terlebih dahulu");
      return;
    }

    try {
      if (editingBankAccount) {
        await updateBankAccount({
          id: editingBankAccount.id,
          homebase_id: effectiveSelectedHomebaseId,
          ...values,
        }).unwrap();
        message.success("Rekening bank berhasil diperbarui");
      } else {
        await addBankAccount({
          homebase_id: effectiveSelectedHomebaseId,
          ...values,
        }).unwrap();
        message.success("Rekening bank berhasil ditambahkan");
      }

      closeBankModal();
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan rekening bank");
    }
  };

  const handleDeleteBankAccount = async (record) => {
    try {
      await deleteBankAccount({
        id: record.id,
        homebase_id: effectiveSelectedHomebaseId,
      }).unwrap();
      message.success("Rekening bank berhasil dihapus");
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus rekening bank");
    }
  };

  const bankColumns = createBankColumns({
    onEdit: openEditBankModal,
    onDelete: handleDeleteBankAccount,
    isDeleting: isDeletingBankAccount,
  });

  const financeSummaryItems = [
    {
      title: "Satuan aktif",
      value: selectedHomebase?.name || "Belum dipilih",
      caption: "Konfigurasi akan tersimpan per unit",
    },
    {
      title: "Rekening bank",
      value: `${bankAccounts.length} rekening`,
      caption: `${bankAccounts.filter((item) => item.is_active).length} aktif`,
    },
    {
      title: "Metode pembayaran",
      value: `${paymentMethods.length} kanal`,
      caption: `${
        paymentMethods.filter((item) => item.is_active).length
      } metode aktif`,
    },
    {
      title: "Gateway Midtrans",
      value: midtransMethod?.is_active ? "Aktif" : "Belum aktif",
      caption: gatewayConfig?.is_production ? "Mode production" : "Mode sandbox",
    },
  ];
  const isSettingsBusy = isLoadingSettings || isFetchingSettings;

  if (isLoadingOptions && !optionsResponse) {
    return <LoadApp />;
  }

  const createTabLabel = (label, icon, caption) => (
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
        <div style={{ fontWeight: 600, lineHeight: 1.2 }}>{label}</div>
        <div style={{ fontSize: 12, color: "#64748b", lineHeight: 1.2 }}>
          {caption}
        </div>
      </div>
    </Space>
  );

  const tabItems = [
    {
      key: "profile",
      label: createTabLabel(
        "Petugas Invoice",
        <FileBadge2 size={16} />,
        "Profil penandatangan",
      ),
      children: (
        <FinanceProfileTab
          form={financeProfileForm}
          selectedHomebaseName={selectedHomebase?.name}
          isUploadingSignature={isUploadingSignature}
          isSavingFinanceProfile={isSavingFinanceProfile}
          onUploadSignature={handleUploadSignature}
          onSubmit={handleSubmitFinanceProfile}
        />
      ),
    },
    {
      key: "midtrans",
      label: createTabLabel(
        "Midtrans",
        <CreditCard size={16} />,
        "Gateway pembayaran",
      ),
      children: (
        <MidtransTab
          form={midtransForm}
          gatewayConfig={gatewayConfig}
          selectedHomebaseName={selectedHomebase?.name}
          isSavingMidtrans={isSavingMidtrans}
          onSubmit={handleSubmitMidtrans}
        />
      ),
    },
    {
      key: "banks",
      label: createTabLabel(
        "Rekening Bank",
        <Banknote size={16} />,
        "Tujuan transfer manual",
      ),
      children: (
        <BankAccountsTab
          bankAccounts={bankAccounts}
          bankColumns={bankColumns}
          isFetchingSettings={isFetchingSettings}
          onOpenCreate={openCreateBankModal}
          bankModalOpen={bankModalOpen}
          editingBankAccount={editingBankAccount}
          onCloseModal={closeBankModal}
          onSubmitModal={bankForm.submit}
          bankForm={bankForm}
          onFinish={handleSubmitBankAccount}
          isAddingBankAccount={isAddingBankAccount}
          isUpdatingBankAccount={isUpdatingBankAccount}
        />
      ),
    },
    {
      key: "methods",
      label: createTabLabel(
        "Metode Pembayaran",
        <Building2 size={16} />,
        "Aktif atau nonaktifkan kanal",
      ),
      children: (
        <PaymentMethodsCard
          paymentMethods={paymentMethods}
          manualBankMethod={manualBankMethod}
          manualCashMethod={manualCashMethod}
          midtransMethod={midtransMethod}
          bankAccounts={bankAccounts}
          isUpdatingPaymentMethod={isUpdatingPaymentMethod}
          onTogglePaymentMethod={handleTogglePaymentMethod}
          onOpenMidtransTab={() => setActiveTab("midtrans")}
          onOpenBankTab={() => setActiveTab("banks")}
        />
      ),
    },
  ];

  return (
    <MotionDiv
      variants={containerVariants}
      initial='hidden'
      animate='visible'
      style={{ width: "100%" }}
    >
      <Space vertical size={24} style={{ width: "100%", display: "flex" }}>
        <MotionDiv variants={itemVariants}>
          <SettingHeader
            homebases={homebases}
            selectedHomebaseId={effectiveSelectedHomebaseId}
            onChange={setSelectedHomebaseId}
          />
        </MotionDiv>

        {!hasSelectedHomebase ? (
          <MotionDiv variants={itemVariants}>
            <Alert
              type='info'
              showIcon
              message='Satuan belum dipilih'
              description='Pilih satuan terlebih dahulu untuk mengatur Midtrans, rekening bank, metode pembayaran, dan profil invoice.'
              style={{ borderRadius: 18 }}
            />
          </MotionDiv>
        ) : null}

        {hasSelectedHomebase ? (
          <MotionDiv variants={itemVariants}>
            <Flex vertical gap={18}>
              <Card
                variant='borderless'
                style={{
                  width: "100%",
                  borderRadius: 28,
                  border: "1px solid rgba(148,163,184,0.14)",
                  boxShadow: "0 24px 60px rgba(15,23,42,0.07)",
                  background:
                    "linear-gradient(180deg, rgba(248,250,252,0.96) 0%, #ffffff 100%)",
                }}
                styles={{ body: { padding: isMobile ? 18 : 22 } }}
              >
                <Flex vertical gap={18}>
                  {isSettingsBusy ? (
                    <Alert
                      type='info'
                      showIcon
                      message='Memuat konfigurasi satuan'
                      description='Panel tetap tersedia dan akan diperbarui otomatis saat data Midtrans, rekening, dan profil invoice selesai dimuat.'
                      style={{ borderRadius: 18 }}
                    />
                  ) : null}

                  <div
                    style={{
                      padding: isMobile ? 18 : 20,
                      borderRadius: 22,
                      border: "1px solid rgba(59,130,246,0.12)",
                      background:
                        "linear-gradient(135deg, rgba(239,246,255,0.92), rgba(240,253,250,0.88))",
                    }}
                  >
                    <Title level={4} style={{ margin: 0 }}>
                      Workspace Pengaturan Pembayaran
                    </Title>
                    <Paragraph
                      type='secondary'
                      style={{ margin: "6px 0 0", maxWidth: 760 }}
                    >
                      Gunakan panel ini untuk memastikan profil invoice, rekening
                      bank, dan koneksi Midtrans setiap satuan tersusun rapi dan
                      siap dipakai operasional harian.
                    </Paragraph>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isMobile
                          ? "1fr"
                          : "repeat(4, minmax(0, 1fr))",
                        gap: 12,
                        marginTop: 16,
                      }}
                    >
                      {financeSummaryItems.map((item) => (
                        <div
                          key={item.title}
                          style={{
                            padding: "14px 16px",
                            borderRadius: 18,
                            background: "#ffffff",
                            border: "1px solid rgba(148,163,184,0.14)",
                            boxShadow: "0 10px 24px rgba(15,23,42,0.04)",
                          }}
                        >
                          <Text type='secondary'>{item.title}</Text>
                          <div
                            style={{
                              marginTop: 8,
                              fontSize: 16,
                              fontWeight: 700,
                              color: "#0f172a",
                            }}
                          >
                            {item.value}
                          </div>
                          <div
                            style={{
                              marginTop: 4,
                              fontSize: 12,
                              color: "#64748b",
                            }}
                          >
                            {item.caption}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isMobile
                          ? "1fr"
                          : "repeat(4, minmax(0, 1fr))",
                        gap: 12,
                        marginBottom: 18,
                      }}
                    >
                      {tabItems.map((item) => {
                        const isActive = activeTab === item.key;

                        return (
                          <Button
                            key={item.key}
                            type={isActive ? "primary" : "default"}
                            onClick={() => setActiveTab(item.key)}
                            style={{
                              height: "auto",
                              minHeight: 74,
                              padding: "12px 14px",
                              borderRadius: 18,
                              justifyContent: "flex-start",
                              textAlign: "left",
                              whiteSpace: "normal",
                              boxShadow: isActive
                                ? "0 18px 32px rgba(37, 99, 235, 0.18)"
                                : "none",
                            }}
                          >
                            {item.label}
                          </Button>
                        );
                      })}
                    </div>

                    <div style={{ width: "100%" }}>
                      {tabItems.find((item) => item.key === activeTab)?.children}
                    </div>
                  </div>
                </Flex>
              </Card>
            </Flex>
          </MotionDiv>
        ) : null}
      </Space>
    </MotionDiv>
  );
};

export default Setting;
