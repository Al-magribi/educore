import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Flex,
  Form,
  Input,
  Modal,
  Select,
  Skeleton,
  Space,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import {
  Activity,
  CircleHelp,
  LayoutGrid,
  Pencil,
  Plus,
  Settings2,
  SlidersHorizontal,
  UserRoundCog,
  UsersRound,
} from "lucide-react";
import {
  useActivateScheduleConfigMutation,
  useDeleteTeachingLoadMutation,
  useDeleteScheduleActivityMutation,
  useDeleteScheduleEntryMutation,
  useDeleteUnavailabilityMutation,
  useCreateManualScheduleEntryMutation,
  useGenerateScheduleMutation,
  useGetScheduleBootstrapQuery,
  useImportTeachingLoadMutation,
  useSaveScheduleActivityMutation,
  useSaveScheduleConfigMutation,
  useSaveScheduleConfigGroupMutation,
  useSaveTeachingLoadMutation,
  useSaveUnavailabilityMutation,
  useUpdateScheduleEntryMutation,
} from "../../../../service/lms/ApiSchedule";
import ScheduleConfigCard from "./ScheduleConfigCard";
import ScheduleActivity from "./ScheduleActivity";
import ScheduleLoadCard from "./ScheduleLoadCard";
import ScheduleUnavailabilityCard from "./ScheduleUnavailabilityCard";
import ScheduleTimetableCard from "./ScheduleTimetableCard";
import ScheduleGuideModal from "./ScheduleGuideModal";

const { Text } = Typography;

const Schedule = () => {
  const [guideOpen, setGuideOpen] = useState(false);
  const [selectedConfigId, setSelectedConfigId] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [configForm] = Form.useForm();

  const { data, isLoading, isFetching, refetch } =
    useGetScheduleBootstrapQuery({
      configId: selectedConfigId || undefined,
      groupId: selectedGroupId || undefined,
    });
  const [saveScheduleConfig, { isLoading: savingConfig }] =
    useSaveScheduleConfigMutation();
  const [activateScheduleConfig, { isLoading: activatingConfig }] =
    useActivateScheduleConfigMutation();
  const [saveScheduleConfigGroup, { isLoading: savingConfigGroup }] =
    useSaveScheduleConfigGroupMutation();
  const [saveTeachingLoad, { isLoading: savingLoad }] =
    useSaveTeachingLoadMutation();
  const [importTeachingLoad, { isLoading: importingLoad }] =
    useImportTeachingLoadMutation();
  const [deleteTeachingLoad, { isLoading: deletingLoad }] =
    useDeleteTeachingLoadMutation();
  const [saveScheduleActivity, { isLoading: savingActivity }] =
    useSaveScheduleActivityMutation();
  const [deleteScheduleActivity, { isLoading: deletingActivity }] =
    useDeleteScheduleActivityMutation();
  const [saveUnavailability, { isLoading: savingRule }] =
    useSaveUnavailabilityMutation();
  const [deleteUnavailability, { isLoading: deletingRule }] =
    useDeleteUnavailabilityMutation();
  const [generateSchedule, { isLoading: generating }] =
    useGenerateScheduleMutation();
  const [createManualScheduleEntry, { isLoading: creatingEntry }] =
    useCreateManualScheduleEntryMutation();
  const [updateScheduleEntry, { isLoading: updatingEntry }] =
    useUpdateScheduleEntryMutation();
  const [deleteScheduleEntry, { isLoading: deletingEntry }] =
    useDeleteScheduleEntryMutation();

  const payload = data?.data || {};
  const canManage = Boolean(payload.can_manage);
  const scheduleConfigs = payload.configs || [];
  const selectedConfig = payload.selected_config || payload.config || null;
  const configGroups = payload.config_groups || [];
  const selectedGroup = payload.selected_group || null;
  const activeConfigId = Number(payload.active_config_id || 0) || null;
  const isSelectedConfigActive = selectedConfig?.is_active === true;
  const isConfigOperational = Boolean(selectedConfig && isSelectedConfigActive);
  const unmappedGroupClasses = payload.unmapped_group_classes || [];

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
      const fallbackId = Number(payload.selected_config_id || scheduleConfigs[0]?.id);
      if (fallbackId && fallbackId !== Number(selectedConfigId)) {
        setSelectedConfigId(fallbackId);
      }
    }
  }, [payload.selected_config_id, scheduleConfigs, selectedConfigId]);

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
    if (selectedGroupClassIds.size === 0) return payload.teacher_assignments || [];
    return (payload.teacher_assignments || []).filter((item) =>
      selectedGroupClassIds.has(Number(item.class_id)),
    );
  }, [payload.teacher_assignments, selectedGroupClassIds]);

  const sessionShortages = useMemo(() => {
    const allocatedByAssignment = (payload.entries || []).reduce(
      (acc, item) => {
        const key = [item.teacher_id, item.subject_id, item.class_id].join(":");
        acc[key] = (acc[key] || 0) + Number(item.slot_count || 0);
        return acc;
      },
      {},
    );

    return (payload.teacher_assignments || [])
      .filter((item) => activeClassIds.has(Number(item.class_id)))
      .filter(
        (item) =>
          selectedGroupClassIds.size === 0 ||
          selectedGroupClassIds.has(Number(item.class_id)),
      )
      .map((item) => {
        const requiredSessions = Number(item.weekly_sessions || 0);
        const allocatedSessions =
          allocatedByAssignment[
            [item.teacher_id, item.subject_id, item.class_id].join(":")
          ] || 0;
        const missingSessions = Math.max(
          requiredSessions - allocatedSessions,
          0,
        );

        return {
          key: [item.teacher_id, item.subject_id, item.class_id].join(":"),
          teacher_id: item.teacher_id,
          teacher_name: item.teacher_name,
          subject_id: item.subject_id,
          subject_name: item.subject_name,
          subject_code: item.subject_code,
          class_id: item.class_id,
          class_name: item.class_name,
          grade_id: item.grade_id,
          grade_name: item.grade_name,
          teaching_load_id: item.teaching_load_id,
          required_sessions: requiredSessions,
          allocated_sessions: allocatedSessions,
          missing_sessions: missingSessions,
          is_configured: Boolean(item.teaching_load_id),
        };
      })
      .filter((item) => item.is_configured && item.missing_sessions > 0)
      .sort((left, right) => {
        const byTeacher = String(left.teacher_name || "").localeCompare(
          String(right.teacher_name || ""),
        );
        if (byTeacher !== 0) return byTeacher;
        const bySubject = String(left.subject_name || "").localeCompare(
          String(right.subject_name || ""),
        );
        if (bySubject !== 0) return bySubject;
        return String(left.class_name || "").localeCompare(
          String(right.class_name || ""),
        );
      });
  }, [
    activeClassIds,
    payload.entries,
    payload.teacher_assignments,
    selectedGroupClassIds,
  ]);

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
    const totalDistributedSessions = (payload.teacher_assignments || []).reduce(
      (acc, item) => {
        if (!item?.teaching_load_id || item?.is_active === false) return acc;
        const classId = Number(item.class_id);
        if (!activeClassIds.has(classId)) return acc;
        if (selectedGroupClassIds.size > 0 && !selectedGroupClassIds.has(classId)) {
          return acc;
        }
        return acc + Number(item.weekly_sessions || 0);
      },
      0,
    );
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
        if (selectedGroupClassIds.size > 0 && !selectedGroupClassIds.has(classId)) {
          return;
        }
        slotIds.forEach((slotId) => {
          blockedActivitySlots.add(`${dayOfWeek}:${slotId}:${classId}`);
        });
      });
    });

    const totalActivitySessions = blockedActivitySlots.size;
    const remainingAfterDistribution =
      totalAvailableSessions - totalDistributedSessions;

    return {
      total_configured_slots: totalConfiguredSlots,
      total_classes: totalActiveClasses,
      active_class_count: totalActiveClasses,
      total_available_sessions: totalAvailableSessions,
      total_distributed_sessions: totalDistributedSessions,
      total_activity_sessions: totalActivitySessions,
      remaining_after_distribution: remainingAfterDistribution,
      remaining_sessions:
        totalAvailableSessions -
        totalDistributedSessions -
        totalActivitySessions,
    };
  }, [
    activeClassIds,
    payload.activity_targets,
    payload.activities,
    payload.classes,
    payload.selected_group_classes,
    payload.slots,
    payload.teacher_assignments,
    selectedGroupClassIds,
  ]);

  const handleConfigSave = async (body) => {
    if (!selectedConfig?.id) {
      message.warning("Buat master jadwal terlebih dahulu.");
      return false;
    }
    try {
      await saveScheduleConfig({
        ...body,
        id: selectedConfig?.id,
        config_group_id: selectedGroup?.id,
        periode_id: payload.periode_id,
      }).unwrap();
      message.success("Konfigurasi jadwal tersimpan.");
      return true;
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan konfigurasi.");
      throw error;
    }
  };

  const openCreateConfig = () => {
    setEditingConfig(null);
    configForm.setFieldsValue({
      name: "",
      description: "",
      is_active: scheduleConfigs.length === 0,
    });
    setConfigModalOpen(true);
  };

  const openEditConfig = () => {
    if (!selectedConfig) return;
    setEditingConfig(selectedConfig);
    configForm.setFieldsValue({
      name: selectedConfig.name,
      description: selectedConfig.description || "",
      is_active: selectedConfig.is_active === true,
    });
    setConfigModalOpen(true);
  };

  const handleSaveConfigMeta = async () => {
    try {
      const values = await configForm.validateFields();
      const response = await saveScheduleConfig({
        id: editingConfig?.id,
        periode_id: payload.periode_id,
        name: values.name,
        description: values.description || null,
        is_active: values.is_active,
      }).unwrap();
      const nextConfigId = Number(response?.data?.id || editingConfig?.id || 0);
      if (nextConfigId) {
        setSelectedConfigId(nextConfigId);
      }
      setConfigModalOpen(false);
      setEditingConfig(null);
      message.success(
        editingConfig ? "Master jadwal diperbarui." : "Master jadwal ditambahkan.",
      );
    } catch (error) {
      if (!error?.errorFields) {
        message.error(error?.data?.message || "Gagal menyimpan master jadwal.");
      }
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
      message.success("Group jadwal tersimpan.");
      return true;
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan group jadwal.");
      throw error;
    }
  };

  const handleLoadSave = async (body) => {
    try {
      await saveTeachingLoad(body).unwrap();
      message.success("Beban ajar tersimpan.");
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan beban ajar.");
    }
  };

  const handleDeleteLoad = async (id) => {
    try {
      await deleteTeachingLoad(id).unwrap();
      message.success("Beban ajar dihapus.");
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus beban ajar.");
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

  const handleImportLoad = async (body) => {
    try {
      const response = await importTeachingLoad(body).unwrap();
      const summary = response?.data || {};
      const errorCount = summary.error_count || 0;
      if (errorCount > 0) {
        message.warning(
          `Import selesai. ${summary.updated_count || 0} baris diproses, ${errorCount} baris bermasalah.`,
        );
      } else {
        message.success(
          `Import beban ajar berhasil. ${summary.updated_count || 0} baris diproses.`,
        );
      }
      return response;
    } catch (error) {
      message.error(error?.data?.message || "Gagal import beban ajar.");
      throw error;
    }
  };

  const handleRuleSave = async (body) => {
    try {
      await saveUnavailability(body).unwrap();
      message.success("Ketentuan guru tersimpan.");
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan ketentuan guru.");
    }
  };

  const handleDeleteRule = async (id) => {
    try {
      await deleteUnavailability(id).unwrap();
      message.success("Ketentuan guru dihapus.");
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus ketentuan guru.");
    }
  };

  const handleGenerate = async (body = {}) => {
    try {
      const response = await generateSchedule(body).unwrap();
      const failedCount = response?.data?.failed_items?.length || 0;
      const generatedCount = response?.data?.generated_entries || 0;
      const operation = response?.data?.operation;

      if (operation === "preview_reset") {
        message.info(
          `Simulasi reset selesai. ${response?.data?.summary?.deleted_generated_entries || 0} jadwal otomatis akan dibersihkan.`,
        );
      } else if (operation === "reset_generated") {
        message.success(
          `Reset jadwal otomatis selesai. ${response?.data?.summary?.deleted_generated_entries || 0} entri dibersihkan.`,
        );
      } else if (response?.data?.dry_run) {
        message.info(
          failedCount > 0
            ? `Simulasi selesai. ${generatedCount} entri dapat dibuat, ${failedCount} item masih konflik.`
            : `Simulasi berhasil. ${generatedCount} entri dapat dibuat.`,
        );
      } else if (failedCount > 0) {
        message.warning(
          `Generate selesai. ${generatedCount} entri dibuat, ${failedCount} item belum bisa dijadwalkan.`,
        );
      } else {
        message.success(
          `Generate jadwal berhasil. ${generatedCount} entri dibuat.`,
        );
      }
      return response;
    } catch (error) {
      message.error(error?.data?.message || "Generate jadwal gagal.");
      throw error;
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

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 12 }} />;
  }

  const renderInactiveConfigAlert = () =>
    !selectedConfig ? (
      <Alert
        showIcon
        type="warning"
        message="Belum ada master jadwal"
        description="Buat dan pilih jadwal terlebih dahulu sebelum mengakses tab ini."
      />
    ) : !isSelectedConfigActive ? (
      <Alert
        showIcon
        type="info"
        message="Jadwal yang dipilih masih nonaktif"
        description={`Tab operasional tetap mengikuti jadwal aktif. Untuk memakai jadwal ini pada beban ajar, kegiatan, generator, dan jadwal final, aktifkan terlebih dahulu. Jadwal aktif saat ini: ${
          scheduleConfigs.find((item) => Number(item.id) === activeConfigId)?.name ||
          "belum ditentukan"
        }.`}
      />
    ) : null;

  const masterScheduleTab = (
    <Card
      style={{ borderRadius: 16 }}
      styles={{ body: { padding: 20 } }}
      title="Master Jadwal"
    >
      <Flex vertical gap={12}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
          <Space wrap>
            <Select
              style={{ minWidth: 260 }}
              placeholder="Pilih jadwal"
              options={configOptions}
              value={selectedConfig ? Number(selectedConfig.id) : undefined}
              onChange={setSelectedConfigId}
            />
            {canManage ? (
              <Button
                type="primary"
                icon={<Plus size={14} />}
                onClick={openCreateConfig}
              >
                Tambah Jadwal
              </Button>
            ) : null}
            {canManage ? (
              <Button
                icon={<Pencil size={14} />}
                disabled={!selectedConfig}
                onClick={openEditConfig}
              >
                Ubah Info
              </Button>
            ) : null}
            {canManage ? (
              <Button
                disabled={!selectedConfig || selectedConfig.is_active === true}
                loading={activatingConfig}
                onClick={handleActivateConfig}
              >
                Jadikan Aktif
              </Button>
            ) : null}
          </Space>

          {selectedConfig ? (
            <Space wrap>
              <Tag color={selectedConfig.is_active ? "green" : "default"}>
                {selectedConfig.is_active ? "Aktif" : "Nonaktif"}
              </Tag>
              <Tag color="blue">
                {selectedConfig.name || `Jadwal ${selectedConfig.id}`}
              </Tag>
            </Space>
          ) : null}
        </Flex>

        {selectedConfig ? (
          <Flex vertical gap={4}>
            <Text strong>{selectedConfig.name}</Text>
            <Text type="secondary">
              {selectedConfig.description || "Belum ada deskripsi jadwal."}
            </Text>
          </Flex>
        ) : (
          <Alert
            showIcon
            type="warning"
            message="Belum ada master jadwal"
            description="Buat minimal satu jadwal sebelum mengatur template harian."
          />
        )}

        {renderInactiveConfigAlert()}

        {selectedConfig ? (
          unmappedGroupClasses.length > 0 ? (
            <Alert
              showIcon
              type="warning"
              message="Masih ada kelas aktif yang belum masuk group jadwal"
              description={`Generator akan ditolak sampai mapping group lengkap. Kelas yang belum dipetakan: ${unmappedGroupClasses
                .map((item) => item.name)
                .join(", ")}.`}
            />
          ) : configGroups.length > 0 ? (
            <Alert
              showIcon
              type="success"
              message="Mapping group kelas lengkap"
              description="Semua kelas aktif pada satuan ini sudah memiliki group jadwal pada master yang sedang dipilih."
            />
          ) : null
        ) : null}
      </Flex>
    </Card>
  );

  return (
    <Flex vertical gap={16}>
      <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
        <Space>
          <Button
            icon={<CircleHelp size={14} />}
            onClick={() => setGuideOpen(true)}
          >
            Panduan Pembuatan Jadwal
          </Button>
        </Space>
      </Flex>

      <Tabs
        defaultActiveKey="master"
        items={[
          {
            key: "master",
            label: (
              <Space size={6}>
                <SlidersHorizontal size={14} />
                Master Jadwal
              </Space>
            ),
            children: masterScheduleTab,
          },
          {
            key: "config",
            label: (
              <Space size={6}>
                <Settings2 size={14} />
                Konfigurasi Jadwal
              </Space>
            ),
            children: (
              selectedConfig ? (
                <ScheduleConfigCard
                  canManage={canManage}
                  config={selectedConfig}
                  groups={configGroups}
                  selectedGroup={selectedGroup}
                  selectedGroupClasses={payload.selected_group_classes || []}
                  classes={payload.classes || []}
                  dayTemplates={payload.day_templates || []}
                  breaks={payload.breaks || []}
                  scheduleCapacity={scheduleCapacity}
                  sessionShortages={sessionShortages}
                  loading={
                    savingConfig ||
                    savingConfigGroup ||
                    activatingConfig ||
                    isFetching
                  }
                  onSelectGroup={setSelectedGroupId}
                  onSave={handleConfigSave}
                  onSaveGroup={handleGroupSave}
                />
              ) : (
                <Alert
                  showIcon
                  type="warning"
                  message="Belum ada master jadwal"
                  description="Buat master jadwal terlebih dahulu untuk mulai mengatur hari, jam belajar, dan durasi sesi."
                />
              )
            ),
          },
          {
            key: "load",
            label: (
              <Space size={6}>
                <UsersRound size={14} />
                Beban Ajar
              </Space>
            ),
            children: isConfigOperational ? (
              <ScheduleLoadCard
                canManage={canManage}
                classes={scopedClasses}
                grades={payload.grades || []}
                subjects={payload.subjects || []}
                teachers={payload.teachers || []}
                teacherAssignments={scopedTeacherAssignments}
                scheduleCapacity={scheduleCapacity}
                sessionShortages={sessionShortages}
                loading={
                  savingLoad || deletingLoad || importingLoad || isFetching
                }
                onSave={handleLoadSave}
                onImport={handleImportLoad}
                onDelete={handleDeleteLoad}
              />
            ) : (
              renderInactiveConfigAlert()
            ),
          },
          {
            key: "activity",
            label: (
              <Space size={6}>
                <Activity size={14} />
                Kegiatan
              </Space>
            ),
            children: isConfigOperational ? (
              <ScheduleActivity
                canManage={canManage}
                activities={payload.activities || []}
                activityTargets={payload.activity_targets || []}
                slots={payload.slots || []}
                teacherAssignments={scopedTeacherAssignments}
                scheduleCapacity={scheduleCapacity}
                selectedConfig={selectedConfig}
                selectedGroup={selectedGroup}
                groupCount={configGroups.length}
                loading={savingActivity || deletingActivity || isFetching}
                onSave={handleActivitySave}
                onDelete={handleActivityDelete}
              />
            ) : (
              renderInactiveConfigAlert()
            ),
          },
          {
            key: "unavailability",
            label: (
              <Space size={6}>
                <UserRoundCog size={14} />
                Ketentuan Guru
              </Space>
            ),
            children: isConfigOperational ? (
              <ScheduleUnavailabilityCard
                canManage={canManage}
                teachers={payload.teachers || []}
                rules={payload.unavailability || []}
                slots={payload.slots || []}
                selectedConfig={selectedConfig}
                selectedGroup={selectedGroup}
                loading={savingRule || deletingRule || isFetching}
                onSave={handleRuleSave}
                onDelete={handleDeleteRule}
              />
            ) : (
              renderInactiveConfigAlert()
            ),
          },
          {
            key: "final",
            label: (
              <Space size={6}>
                <LayoutGrid size={14} />
                Jadwal Final
              </Space>
            ),
            children: isConfigOperational ? (
              <ScheduleTimetableCard
                canManage={canManage}
                entries={payload.entries || []}
                activities={payload.activities || []}
                activityTargets={payload.activity_targets || []}
                slots={payload.slots || []}
                breaks={payload.breaks || []}
                classes={scopedClasses}
                grades={payload.grades || []}
                teacherAssignments={scopedTeacherAssignments}
                teachers={payload.teachers || []}
                sessionShortages={sessionShortages}
                selectedConfig={selectedConfig}
                selectedGroup={selectedGroup}
                groupCount={configGroups.length}
                onCreateEntry={handleCreateManualEntry}
                onGenerate={handleGenerate}
                onRefresh={refetch}
                onDeleteEntry={handleDeleteEntry}
                onUpdateEntry={handleUpdateEntry}
                loading={
                  generating ||
                  creatingEntry ||
                  updatingEntry ||
                  deletingEntry ||
                  isFetching
                }
              />
            ) : (
              renderInactiveConfigAlert()
            ),
          },
        ]}
      />

      <Modal
        open={configModalOpen}
        title={editingConfig ? "Ubah Master Jadwal" : "Tambah Master Jadwal"}
        onCancel={() => {
          setConfigModalOpen(false);
          setEditingConfig(null);
        }}
        onOk={handleSaveConfigMeta}
        okText="Simpan"
        confirmLoading={savingConfig}
      >
        <Form form={configForm} layout="vertical">
          <Form.Item
            name="name"
            label="Nama Jadwal"
            rules={[{ required: true, message: "Nama jadwal wajib diisi." }]}
          >
            <Input placeholder="Contoh: Jadwal Reguler" />
          </Form.Item>
          <Form.Item name="description" label="Deskripsi">
            <Input.TextArea
              rows={3}
              placeholder="Contoh: Jadwal operasional reguler semester genap."
            />
          </Form.Item>
          <Form.Item
            name="is_active"
            label="Status"
            rules={[{ required: true, message: "Status wajib dipilih." }]}
          >
            <Select
              options={[
                { value: true, label: "Aktif" },
                { value: false, label: "Nonaktif" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <ScheduleGuideModal
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
      />
    </Flex>
  );
};

export default Schedule;
