import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Flex, Grid, Skeleton, Space, Steps, Tag, Typography, message } from 'antd';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  CalendarClock,
  CircleHelp,
  LayoutGrid,
  UsersRound,
} from 'lucide-react';
import {
  useActivateScheduleConfigMutation,
  useClearScheduleEntriesMutation,
  useCreateManualScheduleEntryMutation,
  useDeleteScheduleActivityMutation,
  useDeleteScheduleConfigGroupMutation,
  useDeleteScheduleConfigMutation,
  useDeleteScheduleEntryMutation,
  useDuplicateScheduleConfigMutation,
  useGetScheduleBootstrapQuery,
  useSaveScheduleActivityMutation,
  useSaveScheduleConfigGroupMutation,
  useSaveScheduleConfigMutation,
  useUpdateScheduleEntryMutation,
} from '../../../../service/lms/ApiSchedule';
import ScheduleConfigCard from './ScheduleConfigCard';
import ScheduleActivity from './ScheduleActivity';
import ScheduleGuideModal from './ScheduleGuideModal';
import ScheduleMasterList from './ScheduleMasterList';
import ScheduleReviewCard from './ScheduleReviewCard';
import ScheduleTimetableCard from './ScheduleTimetableCard';
import { SCHEDULE_TAG_STYLE } from './scheduleAdminStyles';

const { useBreakpoint } = Grid;
const { Title, Text } = Typography;
const MotionDiv = motion.div;

const STEP_SHIFTS = 0;
const STEP_STRUCTURE = 1;
const STEP_ACTIVITIES = 2;
const STEP_FINAL = 3;
const STEP_REVIEW = 4;

const Schedule = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isNarrow = !screens.sm;
  const [guideOpen, setGuideOpen] = useState(false);
  const [selectedConfigId, setSelectedConfigId] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(STEP_SHIFTS);

  const { data, isLoading, isFetching, refetch } = useGetScheduleBootstrapQuery({
    configId: selectedConfigId || undefined,
    groupId: selectedGroupId || undefined,
  });
  const [saveScheduleConfig, { isLoading: savingConfig }] = useSaveScheduleConfigMutation();
  const [activateScheduleConfig, { isLoading: activatingConfig }] = useActivateScheduleConfigMutation();
  const [duplicateScheduleConfig, { isLoading: duplicatingConfig }] = useDuplicateScheduleConfigMutation();
  const [deleteScheduleConfig, { isLoading: deletingConfig }] = useDeleteScheduleConfigMutation();
  const [saveScheduleConfigGroup, { isLoading: savingConfigGroup }] = useSaveScheduleConfigGroupMutation();
  const [deleteScheduleConfigGroup, { isLoading: deletingConfigGroup }] = useDeleteScheduleConfigGroupMutation();
  const [saveScheduleActivity, { isLoading: savingActivity }] = useSaveScheduleActivityMutation();
  const [deleteScheduleActivity, { isLoading: deletingActivity }] = useDeleteScheduleActivityMutation();
  const [createManualScheduleEntry, { isLoading: creatingEntry }] = useCreateManualScheduleEntryMutation();
  const [updateScheduleEntry, { isLoading: updatingEntry }] = useUpdateScheduleEntryMutation();
  const [deleteScheduleEntry, { isLoading: deletingEntry }] = useDeleteScheduleEntryMutation();
  const [clearScheduleEntries, { isLoading: clearingEntries }] = useClearScheduleEntriesMutation();

  const payload = data?.data || {};
  const canManage = Boolean(payload.can_manage);
  const scheduleConfigs = payload.configs || [];
  const configStats = payload.config_stats || [];
  const selectedConfig = payload.selected_config || payload.config || null;
  const configGroups = payload.config_groups || [];
  const selectedGroup = payload.selected_group || null;
  const activeConfigId = Number(payload.active_config_id || 0) || null;
  const isSelectedConfigActive = selectedConfig?.is_active === true;
  const unmappedGroupClasses = payload.unmapped_group_classes || [];
  const hasFinalEntries = (payload.entries || []).length > 0;

  useEffect(() => {
    if (!scheduleConfigs.length) {
      if (selectedConfigId !== null) {
        setSelectedConfigId(null);
      }
      return;
    }

    const hasSelectedConfig = scheduleConfigs.some((item) => Number(item.id) === Number(selectedConfigId));
    if (!hasSelectedConfig) {
      const fallbackId = Number(
        activeConfigId ||
          payload.selected_config_id ||
          scheduleConfigs.find((item) => item.is_active === true)?.id ||
          scheduleConfigs[0]?.id,
      );
      if (fallbackId && fallbackId !== Number(selectedConfigId)) {
        setSelectedConfigId(fallbackId);
      }
    }
  }, [activeConfigId, payload.selected_config_id, scheduleConfigs, selectedConfigId]);

  useEffect(() => {
    if (!configGroups.length) {
      if (selectedGroupId !== null) {
        setSelectedGroupId(null);
      }
      return;
    }

    const hasSelectedGroup = configGroups.some((item) => Number(item.id) === Number(selectedGroupId));
    if (!hasSelectedGroup) {
      const fallbackGroupId = Number(payload.selected_group_id || configGroups[0]?.id);
      if (fallbackGroupId && fallbackGroupId !== Number(selectedGroupId)) {
        setSelectedGroupId(fallbackGroupId);
      }
    }
  }, [configGroups, payload.selected_group_id, selectedGroupId]);

  const activeClassIds = useMemo(
    () => new Set((payload.classes || []).filter((item) => item?.is_active !== false).map((item) => Number(item.id))),
    [payload.classes],
  );
  const selectedGroupClassIds = useMemo(
    () => new Set((payload.selected_group_classes || []).map((item) => Number(item.class_id || item.id))),
    [payload.selected_group_classes],
  );
  const scopedClasses = useMemo(() => {
    if (selectedGroupClassIds.size === 0) return payload.classes || [];
    return (payload.classes || []).filter((item) => selectedGroupClassIds.has(Number(item.id)));
  }, [payload.classes, selectedGroupClassIds]);
  const scopedTeacherAssignments = useMemo(() => {
    if (selectedGroupClassIds.size === 0) return payload.teacher_assignments || [];
    return (payload.teacher_assignments || []).filter((item) => selectedGroupClassIds.has(Number(item.class_id)));
  }, [payload.teacher_assignments, selectedGroupClassIds]);

  const scheduleCapacity = useMemo(() => {
    const totalConfiguredSlots = (payload.slots || []).filter((item) => !item?.is_break).length;
    const activeClassesSource =
      selectedGroupClassIds.size > 0
        ? (payload.classes || []).filter((item) => selectedGroupClassIds.has(Number(item.id)))
        : payload.classes || [];
    const activeClasses = activeClassesSource.filter((item) => item?.is_active !== false);
    const totalActiveClasses = activeClasses.length;
    const totalAvailableSessions = totalConfiguredSlots * totalActiveClasses;
    const activityTargetsById = (payload.activity_targets || []).reduce((acc, item) => {
      const key = Number(item.activity_id);
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
    const blockedActivitySlots = new Set();

    (payload.activities || []).forEach((activity) => {
      if (activity?.is_active === false) return;

      const dayOfWeek = Number(activity.day_of_week);
      const slotIds = Array.isArray(activity.slot_ids)
        ? activity.slot_ids.map((item) => Number(item)).filter(Boolean)
        : [];

      if (!dayOfWeek || !slotIds.length) return;

      if (activity.scope_type === 'all_classes') {
        activeClasses.forEach((classItem) => {
          slotIds.forEach((slotId) => {
            blockedActivitySlots.add(`${dayOfWeek}:${slotId}:${Number(classItem.id)}`);
          });
        });
        return;
      }

      (activityTargetsById[Number(activity.id)] || []).forEach((target) => {
        const classId = Number(target.class_id);
        if (!activeClassIds.has(classId)) return;
        if (selectedGroupClassIds.size > 0 && !selectedGroupClassIds.has(classId)) {
          return;
        }
        slotIds.forEach((slotId) => {
          blockedActivitySlots.add(`${dayOfWeek}:${slotId}:${classId}`);
        });
      });
    });

    const totalActivitySessions = blockedActivitySlots.size;

    return {
      total_configured_slots: totalConfiguredSlots,
      total_classes: totalActiveClasses,
      active_class_count: totalActiveClasses,
      total_available_sessions: totalAvailableSessions,
      total_activity_sessions: totalActivitySessions,
      remaining_sessions: totalAvailableSessions - totalActivitySessions,
    };
  }, [
    activeClassIds,
    payload.activity_targets,
    payload.activities,
    payload.classes,
    payload.slots,
    selectedGroupClassIds,
  ]);

  const summaryItems = useMemo(
    () => [
      {
        key: 'configs',
        label: 'Versi Jadwal',
        value: scheduleConfigs.length,
        color: 'blue',
      },
      {
        key: 'groups',
        label: 'Shift',
        value: configGroups.length,
        color: 'cyan',
      },
      {
        key: 'classes',
        label: 'Kelas Terpetakan',
        value: scopedClasses.filter((item) => item?.is_active !== false).length,
        color: 'green',
      },
      {
        key: 'entries',
        label: 'Entri Jadwal',
        value: (payload.entries || []).length,
        color: 'gold',
      },
    ],
    [configGroups.length, payload.entries, scheduleConfigs.length, scopedClasses],
  );

  const hasStructure = useMemo(() => (payload.slots || []).some((item) => item?.is_break !== true), [payload.slots]);
  const maxReachableStep = !selectedConfig
    ? STEP_SHIFTS
    : !selectedGroup
      ? STEP_SHIFTS
      : !hasStructure
        ? STEP_STRUCTURE
        : STEP_REVIEW;

  useEffect(() => {
    if (currentStep > maxReachableStep) {
      setCurrentStep(maxReachableStep);
    }
  }, [currentStep, maxReachableStep]);

  const handleOpenConfig = (configId) => {
    if (Number(configId) !== Number(selectedConfigId)) {
      setSelectedConfigId(Number(configId));
      setSelectedGroupId(null);
    }
    setCurrentStep(STEP_SHIFTS);
    setWorkspaceOpen(true);
  };

  const handleBackToList = () => {
    setWorkspaceOpen(false);
  };

  const handleConfigSave = async (body) => {
    if (!selectedConfig?.id) {
      message.warning('Buat versi jadwal terlebih dahulu.');
      return false;
    }
    try {
      const response = await saveScheduleConfig({
        ...body,
        id: selectedConfig?.id,
        config_group_id: selectedGroup?.id,
        periode_id: payload.periode_id,
      }).unwrap();
      message.success(response?.message || 'Konfigurasi jadwal tersimpan.');
      return true;
    } catch (error) {
      message.error(error?.data?.message || 'Gagal menyimpan konfigurasi.');
      throw error;
    }
  };

  const handleSaveConfigMeta = async (values) => {
    try {
      const response = await saveScheduleConfig({
        id: values.id,
        periode_id: payload.periode_id,
        name: values.name,
        description: values.description || null,
        is_active: values.is_active,
      }).unwrap();
      const nextConfigId = Number(response?.data?.id || values.id || 0);
      if (nextConfigId) {
        setSelectedConfigId(nextConfigId);
      }
      message.success(values.id ? 'Versi jadwal diperbarui.' : 'Versi jadwal ditambahkan.');
      return true;
    } catch (error) {
      message.error(error?.data?.message || 'Gagal menyimpan versi jadwal.');
      throw error;
    }
  };

  const handleActivateConfig = async (configId) => {
    const targetId = Number(configId || selectedConfig?.id || 0);
    if (!targetId) return;
    try {
      await activateScheduleConfig({
        id: targetId,
        periode_id: payload.periode_id,
      }).unwrap();
      message.success('Jadwal aktif diperbarui.');
    } catch (error) {
      message.error(error?.data?.message || 'Gagal mengaktifkan jadwal.');
    }
  };

  const handleDuplicateConfig = async (configId, name) => {
    if (!configId) return false;
    try {
      const response = await duplicateScheduleConfig({
        id: configId,
        name,
        periode_id: payload.periode_id,
      }).unwrap();
      message.success(response?.message || 'Versi jadwal berhasil diduplikat.');
      const newConfigId = Number(response?.data?.id || 0);
      if (newConfigId) {
        setSelectedConfigId(newConfigId);
        setSelectedGroupId(null);
      }
      return true;
    } catch (error) {
      message.error(error?.data?.message || 'Gagal menduplikat versi jadwal.');
      return false;
    }
  };

  const handleDeleteConfig = async (configId) => {
    const targetId = Number(configId || selectedConfig?.id || 0);
    if (!targetId) return;
    try {
      await deleteScheduleConfig({
        id: targetId,
        periode_id: payload.periode_id,
      }).unwrap();
      if (targetId === Number(selectedConfigId)) {
        setSelectedConfigId(null);
        setSelectedGroupId(null);
      }
      message.success('Versi jadwal dihapus.');
    } catch (error) {
      message.error(error?.data?.message || 'Gagal menghapus versi jadwal.');
    }
  };

  const handleGroupSave = async (body) => {
    if (!selectedConfig?.id) {
      message.warning('Pilih versi jadwal terlebih dahulu.');
      return false;
    }
    try {
      const response = await saveScheduleConfigGroup({
        ...body,
        config_id: selectedConfig.id,
        periode_id: payload.periode_id,
      }).unwrap();
      const nextGroupId = Number(response?.data?.id || 0);
      if (nextGroupId) {
        setSelectedGroupId(nextGroupId);
      }
      message.success('Shift tersimpan.');
      return true;
    } catch (error) {
      message.error(error?.data?.message || 'Gagal menyimpan shift.');
      throw error;
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!groupId) return;
    try {
      const response = await deleteScheduleConfigGroup(groupId).unwrap();
      const fallbackGroupId = Number(response?.data?.fallback_group_id || 0);
      setSelectedGroupId(fallbackGroupId || null);
      message.success('Shift dihapus.');
    } catch (error) {
      message.error(error?.data?.message || 'Gagal menghapus shift.');
    }
  };

  const handleActivitySave = async (body) => {
    try {
      await saveScheduleActivity(body).unwrap();
      message.success('Kegiatan tersimpan.');
      return true;
    } catch (error) {
      message.error(error?.data?.message || 'Gagal menyimpan kegiatan.');
      throw error;
    }
  };

  const handleActivityDelete = async (id) => {
    try {
      await deleteScheduleActivity(id).unwrap();
      message.success('Kegiatan dihapus.');
    } catch (error) {
      message.error(error?.data?.message || 'Gagal menghapus kegiatan.');
    }
  };

  const handleUpdateEntry = async (body) => {
    try {
      await updateScheduleEntry(body).unwrap();
      message.success('Jadwal berhasil diperbarui.');
      return true;
    } catch (error) {
      message.error(error?.data?.message || 'Gagal memperbarui jadwal.');
      throw error;
    }
  };

  const handleCreateManualEntry = async (body) => {
    try {
      await createManualScheduleEntry(body).unwrap();
      message.success('Jadwal manual berhasil ditambahkan.');
    } catch (error) {
      message.error(error?.data?.message || 'Gagal menambahkan jadwal manual.');
      throw error;
    }
  };

  const handleDeleteEntry = async (id) => {
    try {
      await deleteScheduleEntry(id).unwrap();
      message.success('Jadwal manual berhasil dihapus.');
    } catch (error) {
      message.error(error?.data?.message || 'Gagal menghapus jadwal manual.');
      throw error;
    }
  };

  const handleClearEntries = async () => {
    if (!selectedConfig?.id) {
      message.warning('Pilih versi jadwal terlebih dahulu.');
      return false;
    }
    try {
      const response = await clearScheduleEntries({
        periode_id: payload.periode_id,
        config_id: selectedConfig.id,
        config_group_id: selectedGroup?.id || undefined,
      }).unwrap();
      message.success(response?.message || 'Jadwal final berhasil dikosongkan.');
      return true;
    } catch (error) {
      message.error(error?.data?.message || 'Gagal mengosongkan jadwal final.');
      throw error;
    }
  };

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 12 }} />;
  }

  const stepItems = [
    {
      title: isNarrow ? 'Shift' : 'Shift & Kelas',
      description: isMobile ? undefined : 'Kelompok kelas',
      icon: <UsersRound size={isNarrow ? 14 : 18} />,
      disabled: false,
    },
    {
      title: isNarrow ? 'Waktu' : 'Struktur Waktu',
      description: isMobile ? undefined : 'Hari, jam, istirahat',
      icon: <CalendarClock size={isNarrow ? 14 : 18} />,
      disabled: maxReachableStep < STEP_STRUCTURE,
    },
    {
      title: 'Kegiatan',
      description: isMobile ? undefined : 'Blokir slot agenda',
      icon: <Activity size={isNarrow ? 14 : 18} />,
      disabled: maxReachableStep < STEP_ACTIVITIES,
    },
    {
      title: isNarrow ? 'Final' : 'Jadwal Final',
      description: isMobile ? undefined : 'Penempatan sesi',
      icon: <LayoutGrid size={isNarrow ? 14 : 18} />,
      disabled: maxReachableStep < STEP_FINAL,
    },
    {
      title: isNarrow ? 'Review' : 'Review & Aktivasi',
      description: isMobile ? undefined : 'Validasi & publish',
      icon: <BadgeCheck size={isNarrow ? 14 : 18} />,
      disabled: maxReachableStep < STEP_REVIEW,
    },
  ];

  const nextStepHint =
    currentStep === STEP_SHIFTS && !selectedGroup
      ? 'Pilih atau buat shift terlebih dahulu.'
      : currentStep === STEP_STRUCTURE && !hasStructure
        ? 'Atur minimal satu hari dengan jam pelajaran.'
        : null;

  const renderStepContent = () => {
    if (!selectedConfig) {
      return (
        <Alert
          showIcon
          type="warning"
          message="Versi jadwal tidak ditemukan"
          description="Kembali ke daftar versi dan pilih versi jadwal yang akan disusun."
        />
      );
    }

    switch (currentStep) {
      case STEP_SHIFTS:
        return (
          <ScheduleConfigCard
            canManage={canManage}
            mode="shifts"
            config={selectedConfig}
            groups={configGroups}
            selectedGroup={selectedGroup}
            selectedGroupClasses={payload.selected_group_classes || []}
            allGroupClasses={payload.all_group_classes || []}
            classes={payload.classes || []}
            dayTemplates={payload.day_templates || []}
            breaks={payload.breaks || []}
            slots={payload.slots || []}
            scheduleCapacity={scheduleCapacity}
            hasFinalEntries={hasFinalEntries}
            loading={savingConfig || savingConfigGroup || deletingConfigGroup || activatingConfig || isFetching}
            onSelectGroup={setSelectedGroupId}
            onSave={handleConfigSave}
            onSaveGroup={handleGroupSave}
            onDeleteGroup={handleDeleteGroup}
          />
        );
      case STEP_STRUCTURE:
        return (
          <ScheduleConfigCard
            canManage={canManage}
            mode="days"
            config={selectedConfig}
            groups={configGroups}
            selectedGroup={selectedGroup}
            selectedGroupClasses={payload.selected_group_classes || []}
            allGroupClasses={payload.all_group_classes || []}
            classes={payload.classes || []}
            dayTemplates={payload.day_templates || []}
            breaks={payload.breaks || []}
            slots={payload.slots || []}
            scheduleCapacity={scheduleCapacity}
            hasFinalEntries={hasFinalEntries}
            loading={savingConfig || savingConfigGroup || deletingConfigGroup || activatingConfig || isFetching}
            onSelectGroup={setSelectedGroupId}
            onSave={handleConfigSave}
            onSaveGroup={handleGroupSave}
            onDeleteGroup={handleDeleteGroup}
          />
        );
      case STEP_ACTIVITIES:
        return (
          <ScheduleActivity
            canManage={canManage}
            activities={payload.all_activities || payload.activities || []}
            activityTargets={payload.all_activity_targets || payload.activity_targets || []}
            slots={payload.slots || []}
            teacherAssignments={scopedTeacherAssignments}
            scheduleCapacity={scheduleCapacity}
            selectedConfig={selectedConfig}
            groups={configGroups}
            selectedGroup={selectedGroup}
            groupCount={configGroups.length}
            loading={savingActivity || deletingActivity || isFetching}
            onSave={handleActivitySave}
            onDelete={handleActivityDelete}
            onSelectGroup={setSelectedGroupId}
          />
        );
      case STEP_FINAL:
        return (
          <ScheduleTimetableCard
            canManage={canManage}
            configs={scheduleConfigs}
            groups={configGroups}
            entries={payload.entries || []}
            activities={payload.activities || []}
            activityTargets={payload.activity_targets || []}
            slots={payload.slots || []}
            breaks={payload.breaks || []}
            classes={scopedClasses}
            grades={payload.grades || []}
            teacherAssignments={scopedTeacherAssignments}
            selectedConfig={selectedConfig}
            selectedGroup={selectedGroup}
            activeConfigId={activeConfigId}
            groupCount={configGroups.length}
            onSelectConfig={setSelectedConfigId}
            onSelectGroup={setSelectedGroupId}
            onCreateEntry={handleCreateManualEntry}
            onRefresh={refetch}
            onDeleteEntry={handleDeleteEntry}
            onClearEntries={handleClearEntries}
            onUpdateEntry={handleUpdateEntry}
            loading={creatingEntry || updatingEntry || deletingEntry || clearingEntries || isFetching}
          />
        );
      case STEP_REVIEW:
        return (
          <ScheduleReviewCard
            canManage={canManage}
            selectedConfig={selectedConfig}
            configGroups={configGroups}
            configStats={configStats}
            allSlots={payload.all_slots || []}
            unmappedGroupClasses={unmappedGroupClasses}
            activatingConfig={activatingConfig}
            onActivate={() => handleActivateConfig(selectedConfig.id)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}>
      <Flex vertical gap={isMobile ? 12 : 'middle'} style={{ width: '100%' }}>
        <Card
          variant="borderless"
          style={{
            borderRadius: isMobile ? 18 : 28,
            overflow: 'hidden',
            border: '1px solid rgba(191, 219, 254, 0.82)',
            background:
              'radial-gradient(circle at top right, rgba(125, 211, 252, 0.28), transparent 34%), linear-gradient(135deg, #0f172a 0%, #0f3d8f 45%, #0891b2 100%)',
            boxShadow: '0 24px 60px rgba(15, 23, 42, 0.18)',
            width: '100%',
            maxWidth: '100%',
          }}
          styles={{ body: { padding: isMobile ? 16 : 28 } }}>
          <Flex justify="space-between" align="start" wrap="wrap" gap={16} style={{ width: '100%', maxWidth: '100%' }}>
            <Space direction="vertical" size={12} style={{ maxWidth: 760, minWidth: 0, flex: '1 1 240px' }}>
              <Tag
                icon={<BookOpenCheck size={14} />}
                style={{
                  ...SCHEDULE_TAG_STYLE,
                  border: '1px solid rgba(255,255,255,0.18)',
                  background: 'rgba(255,255,255,0.12)',
                  color: '#f8fafc',
                }}>
                Workspace Jadwal
              </Tag>
              <div>
                <Title level={isMobile ? 4 : 2} style={{ margin: 0, color: '#f8fafc', lineHeight: 1.15 }}>
                  {isNarrow
                    ? 'Kelola versi jadwal per periode.'
                    : 'Kelola versi jadwal per periode dengan alur penyusunan bertahap.'}
                </Title>
                {!isNarrow ? (
                  <Text
                    style={{
                      display: 'block',
                      marginTop: 8,
                      color: 'rgba(226, 232, 240, 0.92)',
                      maxWidth: 760,
                      lineHeight: 1.7,
                    }}>
                    Buat versi jadwal (misal Jadwal Reguler atau Jadwal Ramadhan), susun shift, struktur waktu,
                    kegiatan, dan jadwal final langkah demi langkah, lalu aktifkan versi yang siap dipakai operasional.
                  </Text>
                ) : null}
              </div>
              <Space size={[8, 8]} wrap>
                {summaryItems.map((item) => (
                  <Tag
                    key={item.key}
                    color={item.color}
                    style={{
                      ...SCHEDULE_TAG_STYLE,
                      background: 'rgba(255,255,255,0.12)',
                      borderColor: 'rgba(255,255,255,0.16)',
                      color: '#f8fafc',
                    }}>
                    {item.label}: {item.value}
                  </Tag>
                ))}
              </Space>
            </Space>

            <Button
              size={isMobile ? 'middle' : 'large'}
              icon={<CircleHelp size={16} />}
              onClick={() => setGuideOpen(true)}
              style={{
                borderRadius: 14,
                borderColor: 'rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.14)',
                color: '#fff',
                width: isNarrow ? '100%' : undefined,
              }}>
              Panduan Jadwal
            </Button>
          </Flex>
        </Card>

        {!workspaceOpen ? (
          <ScheduleMasterList
            canManage={canManage}
            scheduleConfigs={scheduleConfigs}
            configStats={configStats}
            activeConfigId={activeConfigId}
            loading={savingConfig || deletingConfig}
            activatingConfig={activatingConfig}
            duplicatingConfig={duplicatingConfig}
            onOpenConfig={handleOpenConfig}
            onSaveConfig={handleSaveConfigMeta}
            onActivateConfig={handleActivateConfig}
            onDuplicateConfig={handleDuplicateConfig}
            onDeleteConfig={handleDeleteConfig}
          />
        ) : (
          <Card
            variant="borderless"
            style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}
            styles={{ body: { padding: isMobile ? 12 : 16 } }}>
            <Flex vertical gap={isMobile ? 12 : 16} style={{ width: '100%' }}>
              <Flex justify="space-between" align="center" wrap="wrap" gap={12} style={{ width: '100%' }}>
                <Space wrap style={{ minWidth: 0, maxWidth: '100%' }}>
                  <Button
                    icon={<ArrowLeft size={14} />}
                    onClick={handleBackToList}
                    size={isMobile ? 'middle' : 'middle'}>
                    {isNarrow ? 'Daftar' : 'Daftar Versi'}
                  </Button>
                  <Text
                    strong
                    style={{
                      fontSize: isMobile ? 14 : 16,
                      wordBreak: 'break-word',
                    }}>
                    {selectedConfig?.name || 'Versi jadwal'}
                  </Text>
                  <Tag color={isSelectedConfigActive ? 'green' : 'default'} style={SCHEDULE_TAG_STYLE}>
                    {isSelectedConfigActive ? 'Aktif' : 'Draft'}
                  </Tag>
                  {selectedGroup ? (
                    <Tag color="cyan" style={SCHEDULE_TAG_STYLE}>
                      Shift: {selectedGroup.name}
                    </Tag>
                  ) : null}
                </Space>
              </Flex>

              {!isSelectedConfigActive && selectedConfig ? (
                <Alert
                  showIcon
                  type="info"
                  message="Anda sedang menyusun versi draft"
                  description={`Perubahan pada versi ini tidak memengaruhi jadwal operasional. Absensi RFID memakai versi aktif: ${
                    scheduleConfigs.find((item) => Number(item.id) === activeConfigId)?.name || 'belum ditentukan'
                  }.`}
                />
              ) : null}

              <div style={{ width: '100%', overflowX: 'auto' }}>
                <Steps
                  current={currentStep}
                  onChange={setCurrentStep}
                  items={stepItems}
                  size="small"
                  direction={isNarrow ? 'vertical' : 'horizontal'}
                  labelPlacement={isMobile ? 'vertical' : 'horizontal'}
                  responsive={false}
                  style={{ minWidth: isNarrow ? undefined : 560 }}
                />
              </div>

              <div style={{ width: '100%', minWidth: 0, overflowX: 'hidden' }}>{renderStepContent()}</div>

              <Flex justify="space-between" align="center" wrap="wrap" gap={12} style={{ width: '100%' }}>
                <Button
                  icon={<ArrowLeft size={14} />}
                  block={isNarrow}
                  onClick={() => (currentStep === STEP_SHIFTS ? handleBackToList() : setCurrentStep(currentStep - 1))}>
                  {currentStep === STEP_SHIFTS ? (isNarrow ? 'Daftar' : 'Daftar Versi') : 'Kembali'}
                </Button>
                {currentStep < STEP_REVIEW ? (
                  <Flex
                    vertical={isNarrow}
                    gap={8}
                    align={isNarrow ? 'stretch' : 'center'}
                    style={{
                      width: isNarrow ? '100%' : undefined,
                      flex: isNarrow ? '1 1 100%' : undefined,
                    }}>
                    {nextStepHint ? (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {nextStepHint}
                      </Text>
                    ) : null}
                    <Button
                      type="primary"
                      block={isNarrow}
                      disabled={currentStep >= maxReachableStep}
                      onClick={() => setCurrentStep(currentStep + 1)}>
                      Lanjut
                      <ArrowRight size={14} />
                    </Button>
                  </Flex>
                ) : null}
              </Flex>
            </Flex>
          </Card>
        )}
      </Flex>

      <ScheduleGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </MotionDiv>
  );
};

export default Schedule;
