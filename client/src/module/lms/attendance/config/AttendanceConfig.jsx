import { useState } from "react";
import { Button, Flex, Skeleton } from "antd";
import {
  BookOpenCheck,
  CalendarClock,
  Cpu,
  Network,
  Settings2,
} from "lucide-react";
import { useGetAttendanceConfigQuery } from "../../../../service/lms/ApiAttendance";
import FeatureSettingsTab from "./tabs/FeatureSettingsTab";
import PolicySettingsTab from "./tabs/PolicySettingsTab";
import DeviceSettingsTab from "./tabs/DeviceSettingsTab";
import AssignmentPolicyTab from "./tabs/AssignmentPolicyTab";
import AttendanceGuideModal from "./AttendanceGuideModal";
import PageHeader from "../../../../components/ui/PageHeader";
import { MuseCard, PageTabs } from "../../../../components/ui/muse";

const PAGE_TITLE = "Konfigurasi Presensi RFID";
const PAGE_DESCRIPTION =
  "Kelola fitur, policy absensi harian, dan perangkat RFID dalam satu workspace.";

const AttendanceConfig = () => {
  const [guideOpen, setGuideOpen] = useState(false);

  const {
    data: bootstrap,
    isLoading: loadingBootstrap,
    isFetching: fetchingBootstrap,
  } = useGetAttendanceConfigQuery();

  if (loadingBootstrap) {
    return (
      <Flex vertical gap={24}>
        <PageHeader title={PAGE_TITLE} description={PAGE_DESCRIPTION} />
        <MuseCard>
          <Skeleton active paragraph={{ rows: 8 }} />
        </MuseCard>
      </Flex>
    );
  }

  const featureRows = bootstrap?.data?.features || [];
  const policyRows = bootstrap?.data?.policies || [];
  const deviceRows = bootstrap?.data?.devices || [];
  const classRows = bootstrap?.data?.classes || [];

  const items = [
    {
      key: "fitur",
      label: "Fitur",
      icon: <Settings2 />,
      description: "Aktifkan fitur presensi, kalender libur, dan notifikasi Telegram.",
      render: () => <FeatureSettingsTab featureRows={featureRows} />,
    },
    {
      key: "policy",
      label: "Policy",
      icon: <CalendarClock />,
      description: "Atur jam masuk, toleransi telat, dan jam pulang per hari.",
      render: () => (
        <PolicySettingsTab
          fallbackPolicies={policyRows}
          loadingFallback={fetchingBootstrap}
        />
      ),
    },
    {
      key: "device",
      label: "Device RFID",
      icon: <Cpu />,
      description: "Daftarkan dan pantau alat RFID di gerbang atau kelas.",
      render: () => (
        <DeviceSettingsTab
          fallbackDevices={deviceRows}
          classRows={classRows}
          loadingFallback={fetchingBootstrap}
        />
      ),
    },
    {
      key: "assignment",
      label: "Assignment",
      icon: <Network />,
      description: "Petakan policy ke siswa, guru, atau tendik.",
      render: () => <AssignmentPolicyTab />,
    },
  ];

  return (
    <>
      <PageTabs
        title={PAGE_TITLE}
        description={PAGE_DESCRIPTION}
        items={items}
        extra={
          <Button
            icon={<BookOpenCheck size={16} />}
            onClick={() => setGuideOpen(true)}
          >
            Panduan Presensi
          </Button>
        }
      />
      <AttendanceGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </>
  );
};

export default AttendanceConfig;
