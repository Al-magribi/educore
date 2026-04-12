import { useEffect, useMemo, useState } from "react";
import { Alert, Form, Space, Tabs, message } from "antd";
import { LoadApp } from "../../../components";
import {
  useAddBankAccountMutation,
  useDeleteBankAccountMutation,
  useGetFinanceSettingsQuery,
  useGetSettingOptionsQuery,
  useSaveFinanceProfileMutation,
  useSaveMidtransConfigMutation,
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
const Setting = () => {
  const [selectedHomebaseId, setSelectedHomebaseId] = useState();
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [editingBankAccount, setEditingBankAccount] = useState(null);

  const [midtransForm] = Form.useForm();
  const [financeProfileForm] = Form.useForm();
  const [bankForm] = Form.useForm();

  const { data: optionsResponse, isLoading: isLoadingOptions } =
    useGetSettingOptionsQuery(
      selectedHomebaseId ? { homebase_id: selectedHomebaseId } : undefined,
    );

  const selectedHomebaseParam = useMemo(
    () =>
      selectedHomebaseId ? { homebase_id: selectedHomebaseId } : undefined,
    [selectedHomebaseId],
  );

  const {
    data: settingsResponse,
    isLoading: isLoadingSettings,
    isFetching: isFetchingSettings,
  } = useGetFinanceSettingsQuery(selectedHomebaseParam, {
    skip: !selectedHomebaseId,
  });

  const [saveMidtransConfig, { isLoading: isSavingMidtrans }] =
    useSaveMidtransConfigMutation();
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

  const optionData = optionsResponse?.data || {};
  const settingsData = settingsResponse?.data || {};
  const homebases = optionData.homebases || [];
  const selectedHomebase = settingsData.homebase || null;
  const gatewayConfig = settingsData.gateway_config || null;
  const financeSetting = settingsData.finance_setting || null;
  const bankAccounts = settingsData.bank_accounts || [];
  const paymentMethods = settingsData.payment_methods || [];

  useEffect(() => {
    if (!selectedHomebaseId && optionData.selected_homebase_id) {
      setSelectedHomebaseId(optionData.selected_homebase_id);
    }
  }, [optionData.selected_homebase_id, selectedHomebaseId]);

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
    if (!selectedHomebaseId) {
      message.error("Satuan wajib dipilih terlebih dahulu");
      return;
    }

    try {
      await saveMidtransConfig({
        homebase_id: selectedHomebaseId,
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
    if (!selectedHomebaseId) {
      message.error("Satuan wajib dipilih terlebih dahulu");
      return;
    }

    try {
      const values = await financeProfileForm.validateFields([
        "officer_name",
        "officer_signature_url",
      ]);

      await saveFinanceProfile({
        homebase_id: selectedHomebaseId,
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

  const handleUploadSignature = async ({ file, onSuccess, onError }) => {
    if (!selectedHomebaseId) {
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
    if (!selectedHomebaseId) {
      message.error("Satuan wajib dipilih terlebih dahulu");
      return;
    }

    try {
      if (editingBankAccount) {
        await updateBankAccount({
          id: editingBankAccount.id,
          homebase_id: selectedHomebaseId,
          ...values,
        }).unwrap();
        message.success("Rekening bank berhasil diperbarui");
      } else {
        await addBankAccount({
          homebase_id: selectedHomebaseId,
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
        homebase_id: selectedHomebaseId,
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

  if (isLoadingOptions && !optionsResponse) {
    return <LoadApp />;
  }

  return (
    <Space vertical size={24} style={{ width: "100%" }}>
      <Space vertical size={24} style={{ width: "100%" }}>
        <SettingHeader
          homebases={homebases}
          selectedHomebaseId={selectedHomebaseId}
          onChange={setSelectedHomebaseId}
        />

        {!selectedHomebaseId ? (
          <Alert
            type='info'
            showIcon
            title='Satuan belum dipilih'
            description='Pilih satuan terlebih dahulu untuk mengatur Midtrans dan rekening bank.'
          />
        ) : null}

        {selectedHomebaseId && isLoadingSettings && !settingsResponse ? (
          <LoadApp />
        ) : null}

        {selectedHomebaseId && settingsResponse ? (
          <Tabs
            items={[
              {
                key: "profile",
                label: "Petugas Invoice",
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
                label: "Midtrans",
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
                label: "Rekening Bank",
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
                label: "Metode Pembayaran",
                children: (
                  <PaymentMethodsCard paymentMethods={paymentMethods} />
                ),
              },
            ]}
          />
        ) : null}
      </Space>
    </Space>
  );
};

export default Setting;
