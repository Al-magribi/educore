import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useFinanceScope } from '../../center/finance/FinanceScopeContext';
import { Alert, Flex, Form, Grid, Select, message } from 'antd';
import { Banknote, Building2, CreditCard, FileBadge2, Wallet } from 'lucide-react';

import { MuseCard, PageTabs } from '../../../components/ui/muse';
import FinanceStatGrid from '../shared/FinanceStatGrid';
import FinanceSkeleton from '../shared/FinanceSkeleton';
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
} from '../../../service/finance/ApiSetting';
import FinanceProfileTab from './components/FinanceProfileTab';
import MidtransTab from './components/MidtransTab';
import PaymentMethodsCard from './components/PaymentMethodsCard';
import BankAccountsTab, { createBankColumns } from './components/BankAccountsTab';


const hasValue = (value) => value !== undefined && value !== null && value !== '';

const Setting = () => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const financeScope = useFinanceScope();
  const [selectedHomebaseId, setSelectedHomebaseId] = useState(financeScope?.homebaseId || undefined);
  const [, setSearchParams] = useSearchParams();
  const setActiveTab = useCallback(
    (key) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.set('tab', key);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [editingBankAccount, setEditingBankAccount] = useState(null);

  const [midtransForm] = Form.useForm();
  const [financeProfileForm] = Form.useForm();
  const [bankForm] = Form.useForm();

  const { data: optionsResponse, isLoading: isLoadingOptions } = useGetSettingOptionsQuery(
    hasValue(selectedHomebaseId) ? { homebase_id: selectedHomebaseId } : undefined,
  );

  const optionData = optionsResponse?.data || {};
  const homebases = Array.isArray(optionData.homebases) ? optionData.homebases : [];
  const fallbackHomebaseId = optionData.selected_homebase_id ?? homebases[0]?.id ?? null;
  const effectiveSelectedHomebaseId = hasValue(selectedHomebaseId) ? selectedHomebaseId : fallbackHomebaseId;
  const hasSelectedHomebase = hasValue(effectiveSelectedHomebaseId);

  const selectedHomebaseParam = useMemo(
    () => (hasSelectedHomebase ? { homebase_id: effectiveSelectedHomebaseId } : undefined),
    [effectiveSelectedHomebaseId, hasSelectedHomebase],
  );

  const {
    data: settingsResponse,
    isLoading: isLoadingSettings,
    isFetching: isFetchingSettings,
  } = useGetFinanceSettingsQuery(selectedHomebaseParam, {
    skip: !hasSelectedHomebase,
  });

  const [saveMidtransConfig, { isLoading: isSavingMidtrans }] = useSaveMidtransConfigMutation();
  const [updatePaymentMethod, { isLoading: isUpdatingPaymentMethod }] = useUpdatePaymentMethodMutation();
  const [saveFinanceProfile, { isLoading: isSavingFinanceProfile }] = useSaveFinanceProfileMutation();
  const [uploadFinanceSignature, { isLoading: isUploadingSignature }] = useUploadFinanceSignatureMutation();
  const [addBankAccount, { isLoading: isAddingBankAccount }] = useAddBankAccountMutation();
  const [updateBankAccount, { isLoading: isUpdatingBankAccount }] = useUpdateBankAccountMutation();
  const [deleteBankAccount, { isLoading: isDeletingBankAccount }] = useDeleteBankAccountMutation();

  const settingsData = settingsResponse?.data || {};
  const selectedHomebase =
    settingsData.homebase || homebases.find((item) => String(item.id) === String(effectiveSelectedHomebaseId)) || null;
  const gatewayConfig = settingsData.gateway_config || null;
  const financeSetting = settingsData.finance_setting || null;
  const bankAccounts = settingsData.bank_accounts || [];
  const paymentMethods = settingsData.payment_methods || [];
  const manualBankMethod = paymentMethods.find((item) => item.method_type === 'manual_bank') || null;
  const manualCashMethod = paymentMethods.find((item) => item.method_type === 'manual_cash') || null;
  const midtransMethod = paymentMethods.find((item) => item.method_type === 'midtrans') || null;

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
      message.error('Satuan wajib dipilih terlebih dahulu');
      return;
    }

    try {
      await saveMidtransConfig({
        homebase_id: effectiveSelectedHomebaseId,
        ...values,
      }).unwrap();
      message.success('Pengaturan Midtrans berhasil disimpan');
      midtransForm.setFieldValue('server_key', undefined);
    } catch (error) {
      message.error(error?.data?.message || 'Gagal menyimpan pengaturan Midtrans');
    }
  };

  const handleSubmitFinanceProfile = async () => {
    if (!hasSelectedHomebase) {
      message.error('Satuan wajib dipilih terlebih dahulu');
      return;
    }

    try {
      const values = await financeProfileForm.validateFields(['officer_name', 'officer_signature_url']);

      await saveFinanceProfile({
        homebase_id: effectiveSelectedHomebaseId,
        ...values,
      }).unwrap();
      message.success('Data petugas invoice berhasil disimpan');
    } catch (error) {
      if (error?.errorFields) {
        return;
      }

      message.error(error?.data?.message || 'Gagal menyimpan data petugas invoice');
    }
  };

  const handleTogglePaymentMethod = async (methodType, nextActive) => {
    if (!hasSelectedHomebase) {
      message.error('Satuan wajib dipilih terlebih dahulu');
      return;
    }

    try {
      await updatePaymentMethod({
        homebase_id: effectiveSelectedHomebaseId,
        method_type: methodType,
        is_active: nextActive,
      }).unwrap();
      message.success(
        nextActive ? 'Metode pembayaran berhasil diaktifkan' : 'Metode pembayaran berhasil dinonaktifkan',
      );
    } catch (error) {
      message.error(error?.data?.message || 'Gagal memperbarui metode pembayaran');
    }
  };

  const handleUploadSignature = async ({ file, onSuccess, onError }) => {
    if (!hasSelectedHomebase) {
      const uploadError = new Error('Satuan wajib dipilih terlebih dahulu');
      onError?.(uploadError);
      message.error(uploadError.message);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await uploadFinanceSignature(formData).unwrap();
      const uploadedUrl = response?.data?.url || response?.url || '';

      financeProfileForm.setFieldValue('officer_signature_url', uploadedUrl);
      onSuccess?.(response, file);
      message.success('Tanda tangan berhasil diunggah');
    } catch (error) {
      onError?.(error);
      message.error(error?.data?.message || 'Gagal mengunggah tanda tangan');
    }
  };

  const handleSubmitBankAccount = async (values) => {
    if (!hasSelectedHomebase) {
      message.error('Satuan wajib dipilih terlebih dahulu');
      return;
    }

    try {
      if (editingBankAccount) {
        await updateBankAccount({
          id: editingBankAccount.id,
          homebase_id: effectiveSelectedHomebaseId,
          ...values,
        }).unwrap();
        message.success('Rekening bank berhasil diperbarui');
      } else {
        await addBankAccount({
          homebase_id: effectiveSelectedHomebaseId,
          ...values,
        }).unwrap();
        message.success('Rekening bank berhasil ditambahkan');
      }

      closeBankModal();
    } catch (error) {
      message.error(error?.data?.message || 'Gagal menyimpan rekening bank');
    }
  };

  const handleDeleteBankAccount = async (record) => {
    try {
      await deleteBankAccount({
        id: record.id,
        homebase_id: effectiveSelectedHomebaseId,
      }).unwrap();
      message.success('Rekening bank berhasil dihapus');
    } catch (error) {
      message.error(error?.data?.message || 'Gagal menghapus rekening bank');
    }
  };

  const bankColumns = createBankColumns({
    onEdit: openEditBankModal,
    onDelete: handleDeleteBankAccount,
    isDeleting: isDeletingBankAccount,
  });

  const financeSummaryItems = [
    {
      title: 'Satuan aktif',
      icon: <Building2 size={18} />,
      tone: 'primary',
      value: selectedHomebase?.name || 'Belum dipilih',
      caption: 'Konfigurasi akan tersimpan per unit',
    },
    {
      title: 'Rekening bank',
      icon: <Banknote size={18} />,
      tone: 'success',
      value: `${bankAccounts.length} rekening`,
      caption: `${bankAccounts.filter((item) => item.is_active).length} aktif`,
    },
    {
      title: 'Metode pembayaran',
      icon: <Wallet size={18} />,
      tone: 'purple',
      value: `${paymentMethods.length} kanal`,
      caption: `${paymentMethods.filter((item) => item.is_active).length} metode aktif`,
    },
    {
      title: 'Gateway Midtrans',
      icon: <CreditCard size={18} />,
      tone: 'cyan',
      value: midtransMethod?.is_active ? 'Aktif' : 'Belum aktif',
      caption: gatewayConfig?.is_production ? 'Mode production' : 'Mode sandbox',
    },
  ];
  const isSettingsBusy = isLoadingSettings || isFetchingSettings;

  if (isLoadingOptions && !optionsResponse) {
    return <FinanceSkeleton withHeader />;
  }

  const tabItems = [
    {
      key: 'profile',
      label: 'Petugas Invoice',
      icon: <FileBadge2 />,
      render: () => (
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
      key: 'midtrans',
      label: 'Midtrans',
      icon: <CreditCard />,
      render: () => (
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
      key: 'banks',
      label: 'Rekening Bank',
      icon: <Banknote />,
      render: () => (
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
      key: 'methods',
      label: 'Metode Pembayaran',
      icon: <Building2 />,
      render: () => (
        <PaymentMethodsCard
          paymentMethods={paymentMethods}
          manualBankMethod={manualBankMethod}
          manualCashMethod={manualCashMethod}
          midtransMethod={midtransMethod}
          bankAccounts={bankAccounts}
          isUpdatingPaymentMethod={isUpdatingPaymentMethod}
          onTogglePaymentMethod={handleTogglePaymentMethod}
          onOpenMidtransTab={() => setActiveTab('midtrans')}
          onOpenBankTab={() => setActiveTab('banks')}
        />
      ),
    },
  ];

  // Ringkasan satuan berlaku untuk semua tab; tanpa satuan, tab hanya menampilkan petunjuk.
  const withContext = (content) =>
    hasSelectedHomebase ? (
      <Flex vertical gap={isMobile ? 16 : 24} style={{ minWidth: 0 }}>
        {isSettingsBusy ? (
          <Alert
            type="info"
            showIcon
            title="Memuat konfigurasi satuan"
            description="Panel akan diperbarui otomatis saat data Midtrans, rekening, dan profil invoice selesai dimuat."
          />
        ) : null}
        <FinanceStatGrid
          items={financeSummaryItems.map(({ caption, ...item }) => ({
            ...item,
            key: item.title,
            note: caption,
            noteAsText: true,
          }))}
        />
        {content}
      </Flex>
    ) : (
      <MuseCard>
        <Alert
          type="info"
          showIcon
          title="Satuan belum dipilih"
          description="Pilih satuan di kanan atas untuk mengatur Midtrans, rekening bank, metode pembayaran, dan profil invoice."
        />
      </MuseCard>
    );

  return (
    <PageTabs
      title="Pengaturan Keuangan"
      description="Kelola kanal pembayaran, rekening tujuan transfer, dan identitas invoice. Perubahan tersimpan khusus untuk satuan yang dipilih."
      extra={
        <Select
          aria-label="Pilih satuan"
          value={effectiveSelectedHomebaseId}
          onChange={setSelectedHomebaseId}
          options={homebases.map((item) => ({ value: item.id, label: item.name }))}
          suffixIcon={<Building2 size={14} />}
          style={{ width: isMobile ? '100%' : 260, maxWidth: '100%' }}
          placeholder="Pilih satuan"
          disabled={homebases.length <= 1}
        />
      }
      items={tabItems.map((item) => ({ ...item, render: () => withContext(item.render()) }))}
    />
  );
};

export default Setting;
