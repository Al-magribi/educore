import React, { useMemo } from "react";
import {
  Alert,
  Button,
  Card,
  Flex,
  Grid,
  Popconfirm,
  Space,
  Tag,
  Typography,
} from "antd";
import { BadgeCheck, CircleCheck, CircleAlert, Rocket } from "lucide-react";
import {
  SCHEDULE_CARD_HEADER_STYLE,
  SCHEDULE_CARD_STYLE,
  SCHEDULE_INNER_CARD_STYLE,
  SCHEDULE_TAG_STYLE,
  getScheduleCardBody,
  getScheduleInnerCardBody,
} from "./scheduleAdminStyles";

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

const ScheduleReviewCard = ({
  canManage,
  selectedConfig,
  configGroups,
  configStats,
  allSlots,
  unmappedGroupClasses,
  activatingConfig,
  onActivate,
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isNarrow = !screens.sm;
  const isActive = selectedConfig?.is_active === true;

  const stats = useMemo(
    () =>
      (configStats || []).find(
        (item) => Number(item.config_id) === Number(selectedConfig?.id),
      ) || null,
    [configStats, selectedConfig],
  );
  const entryCount = Number(stats?.entry_count || 0);

  const groupsWithoutStructure = useMemo(() => {
    const groupIdsWithSlots = new Set(
      (allSlots || [])
        .filter((item) => item?.is_break !== true)
        .map((item) => Number(item.config_group_id)),
    );
    return (configGroups || []).filter(
      (group) => !groupIdsWithSlots.has(Number(group.id)),
    );
  }, [allSlots, configGroups]);

  const groupsWithoutClasses = useMemo(
    () =>
      (configGroups || []).filter(
        (group) => Number(group.class_count || 0) === 0,
      ),
    [configGroups],
  );

  const checks = [
    {
      key: "shift-classes",
      ok: groupsWithoutClasses.length === 0,
      okText: "Semua shift memiliki kelas aktif.",
      failText: `Shift tanpa kelas aktif: ${groupsWithoutClasses
        .map((item) => item.name)
        .join(", ")} (opsional).`,
    },
    {
      key: "class-mapping",
      ok: true,
      okText:
        (unmappedGroupClasses || []).length === 0
          ? "Semua kelas aktif sudah terpetakan ke shift."
          : `${(unmappedGroupClasses || []).length} kelas aktif belum masuk shift (boleh dibiarkan).`,
      failText: "",
    },
    {
      key: "structure",
      ok: groupsWithoutStructure.length === 0,
      okText: "Semua shift memiliki struktur waktu (hari & jam pelajaran).",
      failText: `Shift belum memiliki struktur waktu: ${groupsWithoutStructure
        .map((item) => item.name)
        .join(", ")}.`,
    },
    {
      key: "entries",
      ok: entryCount > 0,
      okText: `Jadwal final berisi ${entryCount} entri.`,
      failText:
        "Belum ada entri jadwal final pada versi ini. Susun jadwal final terlebih dahulu.",
    },
  ];

  const failedChecks = checks.filter(
    (item) => !item.ok && item.key !== "shift-classes",
  );

  if (!selectedConfig) {
    return (
      <Alert
        showIcon
        type="warning"
        message="Belum ada versi jadwal yang dipilih"
      />
    );
  }

  return (
    <Card
      style={SCHEDULE_CARD_STYLE}
      styles={{
        header: SCHEDULE_CARD_HEADER_STYLE,
        body: getScheduleCardBody(isMobile),
      }}
      title={
        <Space wrap>
          <BadgeCheck size={18} />
          <span>Review & Aktivasi</span>
        </Space>
      }
    >
      <Flex vertical gap={isMobile ? 12 : 16} style={{ width: "100%", minWidth: 0 }}>
        <Card
          size="small"
          style={SCHEDULE_INNER_CARD_STYLE}
          styles={{ body: getScheduleInnerCardBody(isMobile) }}
        >
          <Flex vertical gap={8}>
            <Space wrap>
              <Title level={5} style={{ margin: 0 }}>
                {selectedConfig.name}
              </Title>
              <Tag
                color={isActive ? "green" : "default"}
                style={SCHEDULE_TAG_STYLE}
              >
                {isActive ? "Aktif" : "Draft"}
              </Tag>
            </Space>
            <Text type="secondary">
              {selectedConfig.description || "Belum ada deskripsi versi."}
            </Text>
            <Space size={[8, 8]} wrap>
              <Tag color="cyan" style={SCHEDULE_TAG_STYLE}>
                {(configGroups || []).length} shift
              </Tag>
              <Tag color="gold" style={SCHEDULE_TAG_STYLE}>
                {entryCount} entri final
              </Tag>
            </Space>
          </Flex>
        </Card>

        <Flex vertical gap={8}>
          {checks.map((item) => (
            <Flex key={item.key} align="flex-start" gap={8}>
              <span style={{ flexShrink: 0, marginTop: 2 }}>
                {item.ok ? (
                  <CircleCheck size={16} color="#52c41a" />
                ) : (
                  <CircleAlert size={16} color="#faad14" />
                )}
              </span>
              <Text type={item.ok ? undefined : "warning"}>
                {item.ok ? item.okText : item.failText}
              </Text>
            </Flex>
          ))}
        </Flex>

        {isActive ? (
          <Alert
            showIcon
            type="success"
            message="Versi ini adalah jadwal operasional"
            description="Entri final berstatus published dan dipakai absensi RFID serta operasional sekolah. Perubahan yang Anda simpan langsung berlaku."
          />
        ) : (
          <Flex vertical gap={12}>
            <Alert
              showIcon
              type={failedChecks.length > 0 ? "warning" : "info"}
              message={
                failedChecks.length > 0
                  ? "Masih ada catatan sebelum aktivasi"
                  : "Versi ini siap diaktifkan"
              }
              description={
                failedChecks.length > 0
                  ? "Anda tetap bisa mengaktifkan versi ini, tetapi disarankan menyelesaikan catatan di atas terlebih dahulu."
                  : "Mengaktifkan versi ini akan menjadikannya jadwal operasional. Entri final versi ini menjadi published dan versi aktif sebelumnya kembali menjadi draft."
              }
            />
            {canManage ? (
              <Popconfirm
                title="Aktifkan versi jadwal ini?"
                description="Versi aktif saat ini akan berubah menjadi draft dan absensi RFID beralih memakai versi ini."
                onConfirm={onActivate}
                okText="Aktifkan"
                cancelText="Batal"
              >
                <Button
                  type="primary"
                  size={isNarrow ? "middle" : "large"}
                  icon={<Rocket size={16} />}
                  loading={activatingConfig}
                  block={isNarrow}
                  style={{ alignSelf: isNarrow ? "stretch" : "flex-start" }}
                >
                  Aktifkan Versi Ini
                </Button>
              </Popconfirm>
            ) : null}
          </Flex>
        )}
      </Flex>
    </Card>
  );
};

export default ScheduleReviewCard;
