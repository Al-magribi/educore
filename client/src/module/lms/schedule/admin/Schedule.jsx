import React, { useMemo, useState } from "react";
import { Alert, Button, Flex, Skeleton, Space, Tabs, message } from "antd";
import {
  Activity,
  CircleHelp,
  LayoutGrid,
  Settings2,
  UserRoundCog,
  UsersRound,
} from "lucide-react";
import {
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

const Schedule = () => {
  const [guideOpen, setGuideOpen] = useState(false);

  const { data, isLoading, isFetching, refetch } =
    useGetScheduleBootstrapQuery();
  const [saveScheduleConfig, { isLoading: savingConfig }] =
    useSaveScheduleConfigMutation();
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
  const activeClassIds = useMemo(
    () =>
      new Set(
        (payload.classes || [])
          .filter((item) => item?.is_active !== false)
          .map((item) => Number(item.id)),
      ),
    [payload.classes],
  );

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
  }, [activeClassIds, payload.entries, payload.teacher_assignments]);

  const scheduleCapacity = useMemo(() => {
    const totalConfiguredSlots = (payload.slots || []).filter(
      (item) => !item?.is_break,
    ).length;
    const activeClasses = (payload.classes || []).filter(
      (item) => item?.is_active !== false,
    );
    const totalActiveClasses = activeClasses.length;
    const totalAvailableSessions = totalConfiguredSlots * totalActiveClasses;
    const totalDistributedSessions = (payload.teacher_assignments || []).reduce(
      (acc, item) => {
        if (!item?.teaching_load_id || item?.is_active === false) return acc;
        if (!activeClassIds.has(Number(item.class_id))) return acc;
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
    payload.slots,
    payload.teacher_assignments,
  ]);

  const handleConfigSave = async (body) => {
    try {
      await saveScheduleConfig(body).unwrap();
      message.success("Konfigurasi jadwal tersimpan.");
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan konfigurasi.");
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
        defaultActiveKey="config"
        items={[
          {
            key: "config",
            label: (
              <Space size={6}>
                <Settings2 size={14} />
                Penjadwalan
              </Space>
            ),
            children: (
              <ScheduleConfigCard
                canManage={canManage}
                config={payload.config}
                dayTemplates={payload.day_templates || []}
                breaks={payload.breaks || []}
                scheduleCapacity={scheduleCapacity}
                sessionShortages={sessionShortages}
                loading={savingConfig || isFetching}
                onSave={handleConfigSave}
              />
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
            children: (
              <ScheduleLoadCard
                canManage={canManage}
                classes={payload.classes || []}
                grades={payload.grades || []}
                subjects={payload.subjects || []}
                teachers={payload.teachers || []}
                teacherAssignments={payload.teacher_assignments || []}
                scheduleCapacity={scheduleCapacity}
                sessionShortages={sessionShortages}
                loading={
                  savingLoad || deletingLoad || importingLoad || isFetching
                }
                onSave={handleLoadSave}
                onImport={handleImportLoad}
                onDelete={handleDeleteLoad}
              />
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
            children: (
              <ScheduleActivity
                canManage={canManage}
                activities={payload.activities || []}
                activityTargets={payload.activity_targets || []}
                slots={payload.slots || []}
                teacherAssignments={payload.teacher_assignments || []}
                scheduleCapacity={scheduleCapacity}
                loading={savingActivity || deletingActivity || isFetching}
                onSave={handleActivitySave}
                onDelete={handleActivityDelete}
              />
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
            children: (
              <ScheduleUnavailabilityCard
                canManage={canManage}
                teachers={payload.teachers || []}
                rules={payload.unavailability || []}
                loading={savingRule || deletingRule || isFetching}
                onSave={handleRuleSave}
                onDelete={handleDeleteRule}
              />
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
            children: (
              <ScheduleTimetableCard
                canManage={canManage}
                entries={payload.entries || []}
                activities={payload.activities || []}
                activityTargets={payload.activity_targets || []}
                slots={payload.slots || []}
                breaks={payload.breaks || []}
                classes={payload.classes || []}
                grades={payload.grades || []}
                teacherAssignments={payload.teacher_assignments || []}
                teachers={payload.teachers || []}
                sessionShortages={sessionShortages}
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
            ),
          },
        ]}
      />

      <ScheduleGuideModal
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
      />
    </Flex>
  );
};

export default Schedule;
