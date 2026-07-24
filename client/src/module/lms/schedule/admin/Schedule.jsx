import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Flex,
  Grid,
  Skeleton,
  Space,
  Tabs,
  Tag,
  Typography,
  message,
  theme,
} from "antd";
import { motion } from "framer-motion";
import {
  Activity,
  BookOpenCheck,
  CircleHelp,
  LayoutGrid,
  Settings2,
  SlidersHorizontal,
} from "lucide-react";
import {
  useActivateScheduleConfigMutation,
  useClearScheduleEntriesMutation,
  useCreateManualScheduleEntryMutation,
  useDeleteScheduleActivityMutation,
  useDeleteScheduleConfigGroupMutation,
  useDeleteScheduleConfigMutation,
  useDeleteScheduleEntryMutation,
  useGetScheduleBootstrapQuery,
  useSaveScheduleActivityMutation,
  useSaveScheduleConfigGroupMutation,
  useSaveScheduleConfigMutation,
  useUpdateScheduleEntryMutation,
} from "../../../../service/lms/ApiSchedule";
import ScheduleConfigCard from "./ScheduleConfigCard";
import ScheduleActivity from "./ScheduleActivity";
import ScheduleGuideModal from "./ScheduleGuideModal";
import ScheduleMasterCard from "./ScheduleMasterCard";
import ScheduleTimetableCard from "./ScheduleTimetableCard";
import { SCHEDULE_ICON_BOX, SCHEDULE_TAG_STYLE } from "./scheduleAdminStyles";

const { useBreakpoint } = Grid;
const { Title, Text } = Typography;
const MotionDiv = motion.div;

const Schedule = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { token } = theme.useToken();
  const [guideOpen, setGuideOpen] = useState(false);
  const [selectedConfigId, setSelectedConfigId] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  const { data, isLoading, isFetching, refetch } = useGetScheduleBootstrapQuery(
    {
      configId: selectedConfigId || undefined,
      groupId: selectedGroupId || undefined,
    },
  );
  const [saveScheduleConfig, { isLoading: savingConfig }] =
    useSaveScheduleConfigMutation();
  const [activateScheduleConfig, { isLoading: activatingConfig }] =
    useActivateScheduleConfigMutation();
  const [deleteScheduleConfig, { isLoading: deletingConfig }] =
    useDeleteScheduleConfigMutation();
  const [saveScheduleConfigGroup, { isLoading: savingConfigGroup }] =
    useSaveScheduleConfigGroupMutation();
  const [deleteScheduleConfigGroup, { isLoading: deletingConfigGroup }] =
    useDeleteScheduleConfigGroupMutation();
  const [saveScheduleActivity, { isLoading: savingActivity }] =
    useSaveScheduleActivityMutation();
  const [deleteScheduleActivity, { isLoading: deletingActivity }] =
    useDeleteScheduleActivityMutation();
  const [createManualScheduleEntry, { isLoading: creatingEntry }] =
    useCreateManualScheduleEntryMutation();
  const [updateScheduleEntry, { isLoading: updatingEntry }] =
    useUpdateScheduleEntryMutation();
  const [deleteScheduleEntry, { isLoading: deletingEntry }] =
    useDeleteScheduleEntryMutation();
  const [clearScheduleEntries, { isLoading: clearingEntries }] =
    useClearScheduleEntriesMutation();

  const payload = data?.data || {};
  const canManage = Boolean(payload.can_manage);
  const scheduleConfigs = payload.configs || [];
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

    const hasSelectedConfig = scheduleConfigs.some(
      (item) => Number(item.id) === Number(selectedConfigId),
    );
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
  }, [
    activeConfigId,
    payload.selected_config_id,
    scheduleConfigs,
    selectedConfigId,
  ]);

  useEffect(() => {
    if (!configGroups.length) {
      if (selectedGroupId !== null) {
        setSelectedGroupId(null);
      }
      return;
    }

    const hasSelectedGroup = configGroups.some(
      (item) => Number(item.id) === Number(selectedGroupId),
    );
    if (!hasSelectedGroup) {
      const fallbackGroupId = Number(
        payload.selected_group_id || configGroups[0]?.id,
      );
      if (fallbackGroupId && fallbackGroupId !== Number(selectedGroupId)) {
        setSelectedGroupId(fallbackGroupId);
      }
    }
  }, [configGroups, payload.selected_group_id, selectedGroupId]);

  const configOptions = useMemo(
    () =>
      scheduleConfigs.map((item) => ({
        value: Number(item.id),
        label: item.name,
      })),
    [scheduleConfigs],
  );
  const activeClassIds = useMemo(
    () =>
      new Set(
        (payload.classes || [])
          .filter((item) => item?.is_active !== false)
          .map((item) => Number(item.id)),
      ),
    [payload.classes],
  );
  const selectedGroupClassIds = useMemo(
    () =>
      new Set(
        (payload.selected_group_classes || []).map((item) =>
          Number(item.class_id || item.id),
        ),
      ),
    [payload.selected_group_classes],
  );
  const scopedClasses = useMemo(() => {
    if (selectedGroupClassIds.size === 0) return payload.classes || [];
    return (payload.classes || []).filter((item) =>
      selectedGroupClassIds.has(Number(item.id)),
    );
  }, [payload.classes, selectedGroupClassIds]);
  const scopedTeacherAssignments = useMemo(() => {
    if (selectedGroupClassIds.size === 0)
      return payload.teacher_assignments || [];
    return (payload.teacher_assignments || []).filter((item) =>
      selectedGroupClassIds.has(Number(item.class_id)),
    );
  }, [payload.teacher_assignments, selectedGroupClassIds]);

  const scheduleCapacity = useMemo(() => {
    const totalConfiguredSlots = (payload.slots || []).filter(
      (item) => !item?.is_break,
    ).length;
    const activeClassesSource =
      selectedGroupClassIds.size > 0
        ? (payload.classes || []).filter((item) =>
            selectedGroupClassIds.has(Number(item.id)),
          )
        : payload.classes || [];
    const activeClasses = activeClassesSource.filter(
      (item) => item?.is_active !== false,
    );
    const totalActiveClasses = activeClasses.length;
    const totalAvailableSessions = totalConfiguredSlots * totalActiveClasses;
    const activityTargetsById = (payload.activity_targets || []).reduce(
      (acc, item) => {
        const key = Number(item.activity_id);
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      },
      {},
    );
    const blockedActivitySlots = new Set();

    (payload.activities || []).forEach((activity) => {
      if (activity?.is_active === false) return;

      const dayOfWeek = Number(activity.day_of_week);
      const slotIds = Array.isArray(activity.slot_ids)
        ? activity.slot_ids.map((item) => Number(item)).filter(Boolean)
        : [];

      if (!dayOfWeek || !slotIds.length) return;

      if (activity.scope_type === "all_classes") {
        activeClasses.forEach((classItem) => {
          slotIds.forEach((slotId) => {
            blockedActivitySlots.add(
              `${dayOfWeek}:${slotId}:${Number(classItem.id)}`,
            );
          });
        });
        return;
      }

      (activityTargetsById[Number(activity.id)] || []).forEach((target) => {
        const classId = Number(target.class_id);
        if (!activeClassIds.has(classId)) return;
        if (
          selectedGroupClassIds.size > 0 &&
          !selectedGroupClassIds.has(classId)
        ) {
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
        key: "configs",
        label: "Master Jadwal",
        value: scheduleConfigs.length,
        color: "blue",
      },
      {
        key: "groups",
        label: "Shift Aktif",
        value: configGroups.length,
        color: "cyan",
      },
      {
        key: "classes",
        label: "Kelas Terpetakan",
        value: scopedClasses.filter((item) => item?.is_active !== false).length,
        color: "green",
      },
      {
        key: "entries",
        label: "Entri Jadwal",
        value: (payload.entries || []).length,
        color: "gold",
      },
    ],
    [
      configGroups.length,
      payload.entries,
      scheduleConfigs.length,
      scopedClasses,
    ],
  );

  const handleConfigSave = async (body) => {
    if (!selectedConfig?.id) {
      message.warning("Buat master jadwal terlebih dahulu.");
      return false;
    }
    try {
      const response = await saveScheduleConfig({
        ...body,
        id: selectedConfig?.id,
        config_group_id: selectedGroup?.id,
        periode_id: payload.periode_id,
      }).unwrap();
      message.success(
        response?.message || "Konfigurasi jadwal tersimpan.",
      );
      return true;
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan konfigurasi.");
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
      message.success(
        values.id ? "Master jadwal diperbarui." : "Master jadwal ditambahkan.",
      );
      return true;
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan master jadwal.");
      throw error;
    }
  };

  const handleActivateConfig = async () => {
    if (!selectedConfig?.id || selectedConfig.is_active === true) return;
    try {
      await activateScheduleConfig({
        id: selectedConfig.id,
        periode_id: payload.periode_id,
      }).unwrap();
      message.success("Jadwal aktif diperbarui.");
    } catch (error) {
      message.error(error?.data?.message || "Gagal mengaktifkan jadwal.");
    }
  };

  const handleDeleteConfig = async () => {
    if (!selectedConfig?.id) return;
    try {
      await deleteScheduleConfig({
        id: selectedConfig.id,
        periode_id: payload.periode_id,
      }).unwrap();
      setSelectedConfigId(null);
      setSelectedGroupId(null);
      message.success("Master jadwal dihapus.");
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus master jadwal.");
    }
  };

  const handleGroupSave = async (body) => {
    if (!selectedConfig?.id) {
      message.warning("Pilih master jadwal terlebih dahulu.");
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
      message.success("Shift jadwal tersimpan.");
      return true;
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan shift jadwal.");
      throw error;
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!groupId) return;
    try {
      const response = await deleteScheduleConfigGroup(groupId).unwrap();
      const fallbackGroupId = Number(response?.data?.fallback_group_id || 0);
      setSelectedGroupId(fallbackGroupId || null);
      message.success("Shift jadwal dihapus.");
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus shift jadwal.");
    }
  };

  const handleActivitySave = async (body) => {
    try {
      await saveScheduleActivity(body).unwrap();
      message.success("Kegiatan tersimpan.");
      return true;
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan kegiatan.");
      throw error;
    }
  };

  const handleActivityDelete = async (id) => {
    try {
      await deleteScheduleActivity(id).unwrap();
      message.success("Kegiatan dihapus.");
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus kegiatan.");
    }
  };

  const handleUpdateEntry = async (body) => {
    try {
      await updateScheduleEntry(body).unwrap();
      message.success("Jadwal berhasil diperbarui.");
      return true;
    } catch (error) {
      message.error(error?.data?.message || "Gagal memperbarui jadwal.");
      throw error;
    }
  };

  const handleCreateManualEntry = async (body) => {
    try {
      await createManualScheduleEntry(body).unwrap();
      message.success("Jadwal manual berhasil ditambahkan.");
    } catch (error) {
      message.error(error?.data?.message || "Gagal menambahkan jadwal manual.");
      throw error;
    }
  };

  const handleDeleteEntry = async (id) => {
    try {
      await deleteScheduleEntry(id).unwrap();
      message.success("Jadwal manual berhasil dihapus.");
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus jadwal manual.");
      throw error;
    }
  };

  const handleClearEntries = async () => {
    if (!selectedConfig?.id) {
      message.warning("Pilih master jadwal terlebih dahulu.");
      return false;
    }
    try {
      const response = await clearScheduleEntries({
        periode_id: payload.periode_id,
        config_id: selectedConfig.id,
        config_group_id: selectedGroup?.id || undefined,
      }).unwrap();
      message.success(
        response?.message || "Jadwal final berhasil dikosongkan.",
      );
      return true;
    } catch (error) {
      message.error(
        error?.data?.message || "Gagal mengosongkan jadwal final.",
      );
      throw error;
    }
  };

  const createTabLabel = (label, icon, caption) => (
    <Flex align='center' gap={10}>
      <span style={SCHEDULE_ICON_BOX}>{icon}</span>
      <Flex vertical gap={0}>
        <span style={{ fontWeight: 600, lineHeight: 1.2 }}>{label}</span>
        {!isMobile ? (
          <span
            style={{
              fontSize: 12,
              color: token.colorTextSecondary,
              lineHeight: 1.2,
            }}
          >
            {caption}
          </span>
        ) : null}
      </Flex>
    </Flex>
  );

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 12 }} />;
  }

  const renderInactiveConfigAlert = () =>
    !selectedConfig ? (
      <Alert
        showIcon
        type='warning'
        title='Belum ada master jadwal'
        description='Buat dan pilih master jadwal terlebih dahulu sebelum mengelola data operasional.'
      />
    ) : !isSelectedConfigActive ? (
      <Alert
        showIcon
        type='warning'
        title='Jadwal yang dipilih masih nonaktif'
        description={`Anda sedang mengedit master nonaktif. Absensi RFID dan operasional sekolah memakai master aktif: ${
          scheduleConfigs.find((item) => Number(item.id) === activeConfigId)
            ?.name || "belum ditentukan"
        }. Aktifkan master ini jika ingin menjadikannya jadwal operasional.`}
        action={
          activeConfigId ? (
            <Button size='small' type='primary' onClick={() => setSelectedConfigId(activeConfigId)}>
              Buka jadwal aktif
            </Button>
          ) : null
        }
      />
    ) : null;

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <Flex vertical gap={"middle"}>
        <Card
          variant='borderless'
          style={{
            borderRadius: isMobile ? 22 : 28,
            overflow: "hidden",
            border: "1px solid rgba(191, 219, 254, 0.82)",
            background:
              "radial-gradient(circle at top right, rgba(125, 211, 252, 0.28), transparent 34%), linear-gradient(135deg, #0f172a 0%, #0f3d8f 45%, #0891b2 100%)",
            boxShadow: "0 24px 60px rgba(15, 23, 42, 0.18)",
          }}
          styles={{ body: { padding: isMobile ? 20 : 28 } }}
        >
          <Flex
            justify='space-between'
            align='start'
            wrap='wrap'
            gap={16}
            style={{ width: "100%", maxWidth: "100%" }}
          >
            <Space
              direction='vertical'
              size={12}
              style={{ maxWidth: 760, minWidth: 0, width: "100%" }}
            >
              <Tag
                icon={<BookOpenCheck size={14} />}
                style={{
                  ...SCHEDULE_TAG_STYLE,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(255,255,255,0.12)",
                  color: "#f8fafc",
                }}
              >
                Workspace Jadwal
              </Tag>
              <div>
                <Title
                  level={isMobile ? 4 : 2}
                  style={{ margin: 0, color: "#f8fafc", lineHeight: 1.15 }}
                >
                  Kelola master, shift, kegiatan, dan jadwal final dari satu
                  alur yang lebih rapi.
                </Title>
                <Text
                  style={{
                    display: "block",
                    marginTop: 8,
                    color: "rgba(226, 232, 240, 0.92)",
                    maxWidth: 760,
                    lineHeight: 1.7,
                  }}
                >
                  Modul ini sekarang difokuskan untuk pengaturan struktur jadwal
                  dan penyusunan final secara manual, sehingga admin bisa
                  mengontrol penempatan sesi dengan lebih jelas.
                </Text>
              </div>
              <Space size={[8, 8]} wrap>
                {summaryItems.map((item) => (
                  <Tag
                    key={item.key}
                    color={item.color}
                    style={{
                      ...SCHEDULE_TAG_STYLE,
                      background: "rgba(255,255,255,0.12)",
                      borderColor: "rgba(255,255,255,0.16)",
                      color: "#f8fafc",
                    }}
                  >
                    {item.label}: {item.value}
                  </Tag>
                ))}
              </Space>
            </Space>

            <Button
              size='large'
              icon={<CircleHelp size={16} />}
              onClick={() => setGuideOpen(true)}
              style={{
                borderRadius: 14,
                borderColor: "rgba(255,255,255,0.2)",
                background: "rgba(255,255,255,0.14)",
                color: "#fff",
              }}
            >
              Panduan Jadwal
            </Button>
          </Flex>
        </Card>

        <Card
          variant='borderless'
          style={{ width: "100%", maxWidth: "100%", overflow: "hidden" }}
          styles={{ body: { padding: isMobile ? 12 : 16 } }}
        >
          <Tabs
            defaultActiveKey='master'
            size={isMobile ? "middle" : "large"}
            tabBarGutter={12}
            tabBarStyle={{ marginBottom: 20, paddingBottom: 8 }}
            items={[
              {
                key: "master",
                label: createTabLabel(
                  "Master Jadwal",
                  <SlidersHorizontal size={16} />,
                  "Pilih versi jadwal",
                ),
                children: (
                  <ScheduleMasterCard
                    canManage={canManage}
                    scheduleConfigs={scheduleConfigs}
                    selectedConfig={selectedConfig}
                    configOptions={configOptions}
                    configGroups={configGroups}
                    unmappedGroupClasses={unmappedGroupClasses}
                    activeConfigId={activeConfigId}
                    loading={savingConfig || deletingConfig}
                    activatingConfig={activatingConfig}
                    onSelectConfig={setSelectedConfigId}
                    onSaveConfig={handleSaveConfigMeta}
                    onActivateConfig={handleActivateConfig}
                    onDeleteConfig={handleDeleteConfig}
                  />
                ),
              },
              {
                key: "config",
                label: createTabLabel(
                  "Konfigurasi Jadwal",
                  <Settings2 size={16} />,
                  "Atur hari, jam pelajaran, dan shift",
                ),
                children: selectedConfig ? (
                  <ScheduleConfigCard
                    canManage={canManage}
                    config={selectedConfig}
                    groups={configGroups}
                    selectedGroup={selectedGroup}
                    selectedGroupClasses={payload.selected_group_classes || []}
                    classes={payload.classes || []}
                    dayTemplates={payload.day_templates || []}
                    breaks={payload.breaks || []}
                    slots={payload.slots || []}
                    scheduleCapacity={scheduleCapacity}
                    hasFinalEntries={hasFinalEntries}
                    loading={
                      savingConfig ||
                      savingConfigGroup ||
                      deletingConfigGroup ||
                      activatingConfig ||
                      isFetching
                    }
                    onSelectGroup={setSelectedGroupId}
                    onSave={handleConfigSave}
                    onSaveGroup={handleGroupSave}
                    onDeleteGroup={handleDeleteGroup}
                  />
                ) : (
                  <Alert
                    showIcon
                    type='warning'
                    message='Belum ada master jadwal'
                    description='Buat master jadwal terlebih dahulu untuk mulai mengatur hari, jam pelajaran, dan istirahat.'
                  />
                ),
              },
              {
                key: "activity",
                label: createTabLabel(
                  "Kegiatan",
                  <Activity size={16} />,
                  "Blok slot untuk agenda sekolah",
                ),
                children: selectedConfig ? (
                  <Flex vertical gap={12}>
                    {renderInactiveConfigAlert()}
                    <ScheduleActivity
                      canManage={canManage}
                      activities={
                        payload.all_activities || payload.activities || []
                      }
                      activityTargets={
                        payload.all_activity_targets ||
                        payload.activity_targets ||
                        []
                      }
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
                  </Flex>
                ) : (
                  renderInactiveConfigAlert()
                ),
              },
              {
                key: "final",
                label: createTabLabel(
                  "Jadwal Final",
                  <LayoutGrid size={16} />,
                  "Review dan edit jadwal manual",
                ),
                children: selectedConfig ? (
                  <Flex vertical gap={12}>
                    {renderInactiveConfigAlert()}
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
                      loading={
                        creatingEntry ||
                        updatingEntry ||
                        deletingEntry ||
                        clearingEntries ||
                        isFetching
                      }
                    />
                  </Flex>
                ) : (
                  renderInactiveConfigAlert()
                ),
              },
            ]}
          />
        </Card>
      </Flex>

      <ScheduleGuideModal
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
      />
    </MotionDiv>
  );
};

export default Schedule;
