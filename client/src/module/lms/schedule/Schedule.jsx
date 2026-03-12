import React, { useState } from "react";
import { Alert, Button, Flex, Skeleton, Space, Tabs, message } from "antd";
import { useSelector } from "react-redux";
import {
  CircleHelp,
  LayoutGrid,
  Settings2,
  UserRoundCog,
  UsersRound,
} from "lucide-react";
import {
  useDeleteTeachingLoadMutation,
  useDeleteUnavailabilityMutation,
  useGenerateScheduleMutation,
  useGetScheduleBootstrapQuery,
  useSaveScheduleConfigMutation,
  useSaveTeachingLoadMutation,
  useSaveUnavailabilityMutation,
  useUpdateScheduleEntryMutation,
} from "../../../service/lms/ApiSchedule";
import ScheduleConfigCard from "./components/ScheduleConfigCard";
import ScheduleLoadCard from "./components/ScheduleLoadCard";
import ScheduleUnavailabilityCard from "./components/ScheduleUnavailabilityCard";
import ScheduleTimetableCard from "./components/ScheduleTimetableCard";
import ScheduleGuideModal from "./components/ScheduleGuideModal";

const Schedule = () => {
  const [guideOpen, setGuideOpen] = useState(false);
  const { user } = useSelector((state) => state.auth);
  const isManager = user?.role === "admin" && user?.level === "satuan";

  const { data, isLoading, isFetching, refetch } =
    useGetScheduleBootstrapQuery();
  const [saveScheduleConfig, { isLoading: savingConfig }] =
    useSaveScheduleConfigMutation();
  const [saveTeachingLoad, { isLoading: savingLoad }] =
    useSaveTeachingLoadMutation();
  const [deleteTeachingLoad, { isLoading: deletingLoad }] =
    useDeleteTeachingLoadMutation();
  const [saveUnavailability, { isLoading: savingRule }] =
    useSaveUnavailabilityMutation();
  const [deleteUnavailability, { isLoading: deletingRule }] =
    useDeleteUnavailabilityMutation();
  const [generateSchedule, { isLoading: generating }] =
    useGenerateScheduleMutation();
  const [updateScheduleEntry, { isLoading: updatingEntry }] =
    useUpdateScheduleEntryMutation();

  const payload = data?.data || {};

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

  const handleGenerate = async () => {
    try {
      const response = await generateSchedule({}).unwrap();
      const failedCount = response?.data?.failed_items?.length || 0;
      if (failedCount > 0) {
        message.warning(
          `Generate selesai. ${failedCount} item belum bisa dijadwalkan.`,
        );
      } else {
        message.success("Generate jadwal berhasil.");
      }
    } catch (error) {
      message.error(error?.data?.message || "Generate jadwal gagal.");
    }
  };

  const handleUpdateEntry = async (body) => {
    try {
      await updateScheduleEntry(body).unwrap();
      message.success("Jadwal berhasil diperbarui.");
    } catch (error) {
      message.error(error?.data?.message || "Gagal memperbarui jadwal.");
    }
  };

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 12 }} />;
  }

  return (
    <Flex vertical gap={16}>
      <Flex justify='space-between' align='center' wrap='wrap' gap={8}>
        <Space>
          <Button
            icon={<CircleHelp size={14} />}
            onClick={() => setGuideOpen(true)}
          >
            Panduan Pembuatan Jadwal
          </Button>
        </Space>
      </Flex>

      <Alert
        showIcon
        type={isManager ? "info" : "warning"}
        title={
          isManager
            ? "Atur slot dan generate jadwal, lalu sesuaikan manual bila perlu."
            : "Mode lihat jadwal. Perubahan hanya dapat dilakukan admin satuan."
        }
      />

      <Tabs
        defaultActiveKey='config'
        items={[
          {
            key: "config",
            label: (
              <Space size={6}>
                <Settings2 size={14} />
                Konfigurasi Slot
              </Space>
            ),
            children: (
              <ScheduleConfigCard
                canManage={isManager}
                config={payload.config}
                dayTemplates={payload.day_templates || []}
                breaks={payload.breaks || []}
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
                canManage={isManager}
                classes={payload.classes || []}
                grades={payload.grades || []}
                subjects={payload.subjects || []}
                teachers={payload.teachers || []}
                teacherAssignments={payload.teacher_assignments || []}
                loading={savingLoad || deletingLoad || isFetching}
                onSave={handleLoadSave}
                onDelete={handleDeleteLoad}
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
                canManage={isManager}
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
                canManage={isManager}
                entries={payload.entries || []}
                slots={payload.slots || []}
                onGenerate={handleGenerate}
                onRefresh={refetch}
                onUpdateEntry={handleUpdateEntry}
                loading={generating || updatingEntry || isFetching}
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
