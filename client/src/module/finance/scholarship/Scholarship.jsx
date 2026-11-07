import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useFinanceScope } from '../../center/finance/FinanceScopeContext';
import { Alert, Button, Card, Flex, Form, Grid, Input, Select, Space, Tabs, Typography, message } from 'antd';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

import { LoadApp } from '../../../components';
import {
  useAddScholarshipBenefitMutation,
  useAddScholarshipMutation,
  useAddScholarshipStudentsMutation,
  useDeleteScholarshipBenefitMutation,
  useDeleteScholarshipMutation,
  useGetScholarshipByIdQuery,
  useGetScholarshipOptionsQuery,
  useGetScholarshipsQuery,
  useRemoveScholarshipStudentsMutation,
  useSyncScholarshipStudentsMutation,
  useUpdateScholarshipBenefitMutation,
  useUpdateScholarshipMutation,
  useUpdateScholarshipStudentMutation,
} from '../../../service/finance/ApiScholarship';
import { cardStyle, monthKey, pageStyle, parseMonthKey } from './constants';
import ScholarshipBenefitModal from './components/ScholarshipBenefitModal';
import ScholarshipBenefitTable from './components/ScholarshipBenefitTable';
import ScholarshipDetailSummary from './components/ScholarshipDetailSummary';
import ScholarshipFormModal from './components/ScholarshipFormModal';
import ScholarshipHeader from './components/ScholarshipHeader';
import ScholarshipListTable from './components/ScholarshipListTable';
import ScholarshipStudentsPanel from './components/ScholarshipStudentsPanel';
import ScholarshipSummaryCards from './components/ScholarshipSummaryCards';

const { Text } = Typography;
const MotionDiv = motion.div;

const Scholarship = () => {
  const { user } = useSelector((state) => state.auth);
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const financeScope = useFinanceScope();
  const lockHomebase = Boolean(user?.homebase_id) || Boolean(financeScope?.homebaseId);

  const [activeTab, setActiveTab] = useState('list');
  const [selectedId, setSelectedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingScholarship, setEditingScholarship] = useState(null);
  const [benefitModalOpen, setBenefitModalOpen] = useState(false);
  const [editingBenefit, setEditingBenefit] = useState(null);
  const [studentFilter, setStudentFilter] = useState({
    periode_id: undefined,
    grade_id: undefined,
    class_id: undefined,
    search: '',
  });

  const [scholarshipForm] = Form.useForm();
  const [benefitForm] = Form.useForm();

  const effectiveHomebaseId = user?.homebase_id || financeScope?.homebaseId;
  const optionsQuery = useGetScholarshipOptionsQuery(lockHomebase ? { homebase_id: effectiveHomebaseId } : undefined);
  const options = optionsQuery.data?.data || {};
  const homebases = options.homebases || [];
  const selectedHomebaseId =
    options.selected_homebase_id || user?.homebase_id || financeScope?.homebaseId || homebases[0]?.id || undefined;

  const studentOptionsQuery = useGetScholarshipOptionsQuery(
    selectedHomebaseId
      ? {
          homebase_id: selectedHomebaseId,
          periode_id: studentFilter.periode_id,
          grade_id: studentFilter.grade_id,
          class_id: studentFilter.class_id,
          search: studentFilter.search,
          limit: 200,
        }
      : undefined,
    { skip: !selectedHomebaseId },
  );
  const studentOptions = studentOptionsQuery.data?.data || {};

  const listQueryArgs = {
    ...(selectedHomebaseId ? { homebase_id: selectedHomebaseId } : {}),
    ...(statusFilter === 'active' ? { is_active: true } : statusFilter === 'inactive' ? { is_active: false } : {}),
    ...(search ? { search } : {}),
  };

  const {
    data: listResponse,
    isLoading: isLoadingList,
    isError: isListError,
    error: listError,
  } = useGetScholarshipsQuery(listQueryArgs, {
    skip: !selectedHomebaseId,
  });
  const scholarships = listResponse?.data || [];
  const listImpactSummary = listResponse?.summary || {};

  const { data: detailResponse, isFetching: isFetchingDetail } = useGetScholarshipByIdQuery(
    selectedId ? { id: selectedId, homebase_id: selectedHomebaseId } : undefined,
    { skip: !selectedId || !selectedHomebaseId },
  );
  const detail = detailResponse?.data || null;
  const benefits = detail?.benefits || [];
  const recipients = detail?.students || [];
  const impact = detail?.impact || {};

  const [addScholarship, addScholarshipState] = useAddScholarshipMutation();
  const [updateScholarship, updateScholarshipState] = useUpdateScholarshipMutation();
  const [deleteScholarship, deleteScholarshipState] = useDeleteScholarshipMutation();
  const [addBenefit, addBenefitState] = useAddScholarshipBenefitMutation();
  const [updateBenefit, updateBenefitState] = useUpdateScholarshipBenefitMutation();
  const [deleteBenefit, deleteBenefitState] = useDeleteScholarshipBenefitMutation();
  const [addStudents, addStudentsState] = useAddScholarshipStudentsMutation();
  const [removeStudents, removeStudentsState] = useRemoveScholarshipStudentsMutation();
  const [updateScholarshipStudent, updateStudentState] = useUpdateScholarshipStudentMutation();
  const [syncScholarship, syncScholarshipState] = useSyncScholarshipStudentsMutation();

  useEffect(() => {
    if (!selectedId && scholarships.length > 0) {
      setSelectedId(scholarships[0].id);
    }
  }, [scholarships, selectedId]);

  useEffect(() => {
    if (!studentFilter.periode_id && (studentOptions.periodes || options.periodes)?.length) {
      const defaultPeriode = (studentOptions.periodes || options.periodes).find(
        (item) => item.is_default || item.is_active,
      );
      if (defaultPeriode) {
        setStudentFilter((prev) => ({
          ...prev,
          periode_id: Number(defaultPeriode.id),
        }));
      }
    }
  }, [options.periodes, studentFilter.periode_id, studentOptions.periodes]);

  const summary = useMemo(() => {
    const active = scholarships.filter((item) => item.is_active !== false);
    return {
      total: scholarships.length,
      active: active.length,
      students: scholarships.reduce((sum, item) => sum + Number(item.student_count || 0), 0),
      benefits: scholarships.reduce((sum, item) => sum + Number(item.benefit_count || 0), 0),
      total_cover: Number(listImpactSummary.total_cover || 0),
      spp_cover: Number(listImpactSummary.spp_cover || 0),
      other_cover: Number(listImpactSummary.other_cover || 0),
    };
  }, [scholarships, listImpactSummary]);

  const selectedScholarship = detail || scholarships.find((item) => item.id === selectedId) || null;

  const openCreate = () => {
    setEditingScholarship(null);
    scholarshipForm.setFieldsValue({
      homebase_id: selectedHomebaseId,
      name: '',
      code: '',
      description: '',
      is_active: true,
    });
    setFormModalOpen(true);
  };

  const openEdit = (record) => {
    setEditingScholarship(record);
    scholarshipForm.setFieldsValue({
      homebase_id: record.homebase_id || selectedHomebaseId,
      name: record.name,
      code: record.code || '',
      description: record.description || '',
      is_active: record.is_active !== false,
    });
    setFormModalOpen(true);
  };

  const handleSubmitScholarship = async (values) => {
    try {
      if (editingScholarship) {
        await updateScholarship({
          id: editingScholarship.id,
          homebase_id: selectedHomebaseId,
          ...values,
        }).unwrap();
        message.success('Beasiswa berhasil diperbarui');
      } else {
        const created = await addScholarship({
          homebase_id: selectedHomebaseId,
          ...values,
        }).unwrap();
        message.success('Beasiswa berhasil dibuat');
        if (created?.data?.id) {
          setSelectedId(created.data.id);
        }
      }
      setFormModalOpen(false);
      setEditingScholarship(null);
      scholarshipForm.resetFields();
    } catch (error) {
      message.error(error?.data?.message || 'Gagal menyimpan beasiswa');
    }
  };

  const handleDeleteScholarship = async (record) => {
    try {
      await deleteScholarship({
        id: record.id,
        homebase_id: selectedHomebaseId,
      }).unwrap();
      message.success('Beasiswa berhasil dihapus');
      if (selectedId === record.id) {
        setSelectedId(null);
      }
    } catch (error) {
      message.error(error?.data?.message || 'Gagal menghapus beasiswa');
    }
  };

  const openBenefitCreate = () => {
    if (!selectedId) {
      message.warning('Pilih beasiswa terlebih dahulu');
      return;
    }
    if (selectedScholarship?.is_active === false) {
      message.warning('Aktifkan beasiswa terlebih dahulu sebelum menambah aturan');
      return;
    }
    setEditingBenefit(null);
    benefitForm.setFieldsValue({
      benefit_target: 'spp',
      benefit_type: 'fixed',
      amount: undefined,
      component_id: undefined,
      periode_id: undefined,
      month_keys: [],
      draft_periode_id: studentFilter.periode_id,
      draft_months: [],
    });
    setBenefitModalOpen(true);
  };

  const openBenefitEdit = (record) => {
    setEditingBenefit(record);
    benefitForm.setFieldsValue({
      benefit_target: record.benefit_target,
      benefit_type: record.benefit_type,
      amount: record.amount,
      component_id: record.component_id,
      periode_id: record.periode_id,
      month_keys: (record.months || []).map((month) => monthKey(month.periode_id, month.month_num)),
      draft_periode_id: undefined,
      draft_months: [],
    });
    setBenefitModalOpen(true);
  };

  const handleSubmitBenefit = async (values) => {
    if (!selectedId) {
      return;
    }

    if (values.benefit_target === 'spp' && (!values.month_keys || values.month_keys.length === 0)) {
      message.error('Minimal satu bulan wajib dipilih');
      return;
    }

    const payload = {
      id: selectedId,
      homebase_id: selectedHomebaseId,
      benefit_target: values.benefit_target,
      benefit_type: values.benefit_type,
      amount: values.benefit_type === 'fixed' ? values.amount : null,
      component_id: values.benefit_target === 'other' ? values.component_id : null,
      periode_id: values.benefit_target === 'other' ? values.periode_id || null : null,
      months: values.benefit_target === 'spp' ? (values.month_keys || []).map(parseMonthKey) : [],
    };

    try {
      if (editingBenefit) {
        await updateBenefit({
          ...payload,
          benefitId: editingBenefit.id,
        }).unwrap();
        message.success('Aturan potongan berhasil diperbarui');
      } else {
        await addBenefit(payload).unwrap();
        message.success('Aturan potongan berhasil ditambahkan');
      }
      setBenefitModalOpen(false);
      setEditingBenefit(null);
      benefitForm.resetFields();
    } catch (error) {
      message.error(error?.data?.message || 'Gagal menyimpan aturan');
    }
  };

  const handleDeleteBenefit = async (record) => {
    try {
      await deleteBenefit({
        id: selectedId,
        benefitId: record.id,
        homebase_id: selectedHomebaseId,
      }).unwrap();
      message.success('Aturan potongan berhasil dihapus');
    } catch (error) {
      message.error(error?.data?.message || 'Gagal menghapus aturan');
    }
  };

  const handleAssignStudents = async (studentIds) => {
    if (selectedScholarship?.is_active === false) {
      message.warning('Aktifkan beasiswa terlebih dahulu sebelum menambah penerima');
      return;
    }
    await addStudents({
      id: selectedId,
      homebase_id: selectedHomebaseId,
      student_ids: studentIds,
    }).unwrap();
    message.success('Penerima berhasil ditambahkan');
  };

  const handleDeactivateStudents = async (studentIds) => {
    try {
      await removeStudents({
        id: selectedId,
        homebase_id: selectedHomebaseId,
        student_ids: studentIds,
        soft: true,
      }).unwrap();
      message.success('Penerima berhasil dinonaktifkan');
    } catch (error) {
      message.error(error?.data?.message || 'Gagal menonaktifkan penerima');
    }
  };

  const handleHardRemoveStudents = async (studentIds) => {
    try {
      await removeStudents({
        id: selectedId,
        homebase_id: selectedHomebaseId,
        student_ids: studentIds,
        soft: false,
      }).unwrap();
      message.success('Penerima berhasil dihapus permanen');
    } catch (error) {
      message.error(error?.data?.message || 'Gagal menghapus penerima');
    }
  };

  const handleReactivateStudent = async (studentId) => {
    try {
      await updateScholarshipStudent({
        id: selectedId,
        studentId,
        homebase_id: selectedHomebaseId,
        is_active: true,
      }).unwrap();
      message.success('Penerima berhasil diaktifkan kembali');
    } catch (error) {
      message.error(error?.data?.message || 'Gagal mengaktifkan penerima');
    }
  };

  const handleSync = async () => {
    if (!selectedId) {
      return;
    }
    try {
      const result = await syncScholarship({
        id: selectedId,
        homebase_id: selectedHomebaseId,
      }).unwrap();
      message.success(`Sinkronisasi selesai (${result?.data?.synced_count || 0} tagihan)`);
    } catch (error) {
      message.error(error?.data?.message || 'Gagal sinkronisasi tagihan');
    }
  };

  if (optionsQuery.isLoading && !optionsQuery.data) {
    return <LoadApp />;
  }

  const tabItems = [
    {
      key: 'list',
      label: isMobile ? 'Daftar' : 'Daftar Beasiswa',
      children: (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Flex gap={8} wrap="wrap">
            <Select
              value={statusFilter}
              style={{ width: isMobile ? '100%' : 180 }}
              onChange={setStatusFilter}
              options={[
                { value: 'all', label: 'Semua status' },
                { value: 'active', label: 'Aktif' },
                { value: 'inactive', label: 'Nonaktif' },
              ]}
            />
            <Input.Search
              allowClear
              placeholder="Cari nama / kode"
              style={{ width: isMobile ? '100%' : 260 }}
              onSearch={setSearch}
              onChange={(event) => {
                if (!event.target.value) {
                  setSearch('');
                }
              }}
            />
          </Flex>
          <ScholarshipListTable
            data={scholarships}
            loading={isLoadingList}
            selectedId={selectedId}
            onSelect={(record) => setSelectedId(record?.id || null)}
            onEdit={openEdit}
            onDelete={handleDeleteScholarship}
            onManageBenefits={(record) => {
              setSelectedId(record.id);
              setActiveTab('benefits');
            }}
            onManageStudents={(record) => {
              setSelectedId(record.id);
              setActiveTab('students');
            }}
            deleting={deleteScholarshipState.isLoading}
          />
        </Space>
      ),
    },
    {
      key: 'benefits',
      label: isMobile ? 'Aturan' : 'Aturan Potongan',
      children: (
        <ScholarshipBenefitTable
          scholarship={selectedScholarship}
          benefits={benefits}
          loading={Boolean(selectedId) && isFetchingDetail}
          onAdd={openBenefitCreate}
          onEdit={openBenefitEdit}
          onDelete={handleDeleteBenefit}
          deleting={deleteBenefitState.isLoading}
        />
      ),
    },
    {
      key: 'students',
      label: isMobile ? 'Penerima' : 'Penerima Siswa',
      children: (
        <ScholarshipStudentsPanel
          scholarship={selectedScholarship}
          students={recipients}
          loading={Boolean(selectedId) && isFetchingDetail}
          optionsStudents={studentOptions.students || []}
          optionsLoading={studentOptionsQuery.isFetching}
          periodes={studentOptions.periodes || options.periodes || []}
          grades={studentOptions.grades || options.grades || []}
          classes={studentOptions.classes || options.classes || []}
          studentFilter={studentFilter}
          onStudentFilterChange={setStudentFilter}
          onAssign={handleAssignStudents}
          onDeactivate={handleDeactivateStudents}
          onReactivate={handleReactivateStudent}
          onHardRemove={handleHardRemoveStudents}
          assigning={addStudentsState.isLoading}
          removing={removeStudentsState.isLoading}
          toggling={updateStudentState.isLoading}
        />
      ),
    },
    {
      key: 'summary',
      label: 'Ringkasan',
      children: (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Flex justify="flex-end">
            <Button
              icon={<RefreshCw size={14} />}
              loading={syncScholarshipState.isLoading}
              onClick={handleSync}
              disabled={!selectedId}>
              Sinkronkan Tagihan
            </Button>
          </Flex>
          <ScholarshipDetailSummary
            scholarship={selectedScholarship}
            benefits={benefits}
            students={recipients}
            impact={impact}
          />
        </Space>
      ),
    },
  ];

  return (
    <div>
      <MotionDiv initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <ScholarshipHeader onCreate={openCreate} />
          <ScholarshipSummaryCards summary={summary} />

          {isListError ? (
            <Alert
              type="error"
              showIcon
              message="Gagal memuat data beasiswa"
              description={listError?.data?.message || listError?.error || 'Terjadi kesalahan'}
            />
          ) : null}

          {selectedScholarship ? (
            <Card size="small" style={{ borderRadius: 16 }}>
              <Text type="secondary">Beasiswa terpilih: </Text>
              <Text strong>{selectedScholarship.name}</Text>
            </Card>
          ) : null}

          <Card style={{ ...cardStyle, overflow: 'hidden' }} styles={{ body: { padding: isMobile ? 10 : 16 } }}>
            <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} size={isMobile ? 'small' : 'middle'} />
          </Card>
        </Space>
      </MotionDiv>

      <ScholarshipFormModal
        open={formModalOpen}
        editing={editingScholarship}
        form={scholarshipForm}
        confirmLoading={addScholarshipState.isLoading || updateScholarshipState.isLoading}
        homebases={homebases}
        lockHomebase={lockHomebase}
        onCancel={() => {
          setFormModalOpen(false);
          setEditingScholarship(null);
          scholarshipForm.resetFields();
        }}
        onSubmit={handleSubmitScholarship}
      />

      <ScholarshipBenefitModal
        open={benefitModalOpen}
        editing={editingBenefit}
        form={benefitForm}
        confirmLoading={addBenefitState.isLoading || updateBenefitState.isLoading}
        periodes={options.periodes || []}
        months={options.months || []}
        otherTypes={options.other_types || []}
        onCancel={() => {
          setBenefitModalOpen(false);
          setEditingBenefit(null);
          benefitForm.resetFields();
        }}
        onSubmit={handleSubmitBenefit}
      />
    </div>
  );
};

export default Scholarship;
