import { useMemo } from "react";
import { Button, Flex, Skeleton, Tag, Typography } from "antd";
import { CalendarClock } from "lucide-react";

import { CardTitle, MuseCard } from "../../../components/ui/muse";
import { museColors } from "../../../config/theme";
import { getScheduleDayKey } from "./useNow";

const { Text } = Typography;

const toTime = (value) => (value ? String(value).slice(0, 5) : "");

const toClock = (now) => {
  const date = new Date(now);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};

/**
 * Jadwal hari ini dari entri jadwal LMS (day_of_week, start_time, end_time).
 * Menandai sesi yang sedang berlangsung dan sesi berikutnya.
 */
const TodayScheduleCard = ({
  entries = [],
  now,
  loading = false,
  title = "Jadwal Hari Ini",
  description,
  getTitle,
  getSubtitle,
  emptyText = "Tidak ada jadwal hari ini.",
  onSeeAll,
}) => {
  const todayKey = getScheduleDayKey(now);
  const clock = toClock(now);

  const rows = useMemo(() => {
    const today = entries
      .filter((entry) => Number(entry.day_of_week) === todayKey)
      .sort((a, b) => String(a.start_time || "").localeCompare(String(b.start_time || "")));
    const mapped = today.map((entry) => {
      const start = toTime(entry.start_time);
      const end = toTime(entry.end_time);
      const status =
        start && end && start <= clock && clock < end ? "ongoing" : end && end <= clock ? "done" : "upcoming";
      return { entry, start, end, status };
    });
    const nextIndex = mapped.findIndex((row) => row.status === "upcoming");
    return mapped.map((row, index) => (index === nextIndex ? { ...row, status: "next" } : row));
  }, [entries, todayKey, clock]);

  const statusTag = {
    ongoing: <Tag color='green' style={{ margin: 0 }}>Berlangsung</Tag>,
    next: <Tag color='blue' style={{ margin: 0 }}>Berikutnya</Tag>,
    done: <Tag style={{ margin: 0 }}>Selesai</Tag>,
    upcoming: null,
  };

  return (
    <MuseCard
      flush
      title={
        <CardTitle
          icon={<CalendarClock size={16} />}
          title={title}
          description={description || new Date(now).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}
        />
      }
      extra={
        onSeeAll ? (
          <Button type='link' onClick={onSeeAll} style={{ paddingInline: 0 }}>
            Jadwal lengkap
          </Button>
        ) : null
      }
    >
      {loading ? (
        <div style={{ padding: "8px 24px 24px" }}>
          <Skeleton active title={false} paragraph={{ rows: 3 }} />
        </div>
      ) : rows.length ? (
        rows.map(({ entry, start, end, status }, index) => (
          <Flex
            key={entry.id ?? index}
            align='center'
            gap={16}
            style={{
              padding: "12px 24px 12px 21px",
              borderLeft: `3px solid ${status === "ongoing" ? museColors.primary : "transparent"}`,
              borderTop: index === 0 ? 0 : `1px solid ${museColors.divider}`,
              opacity: status === "done" ? 0.6 : 1,
              minWidth: 0,
            }}
          >
            <div style={{ width: 48, flexShrink: 0 }}>
              <Text strong style={{ display: "block", color: museColors.navy }}>
                {start || "-"}
              </Text>
              <Text type='secondary' style={{ fontSize: 12 }}>
                {end}
              </Text>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text strong ellipsis style={{ display: "block" }}>
                {getTitle(entry)}
              </Text>
              <Text type='secondary' ellipsis style={{ display: "block", fontSize: 12 }}>
                {getSubtitle(entry)}
              </Text>
            </div>
            <div style={{ flexShrink: 0 }}>{statusTag[status]}</div>
          </Flex>
        ))
      ) : (
        <Text type='secondary' style={{ display: "block", padding: "8px 24px 24px" }}>
          {emptyText}
        </Text>
      )}
    </MuseCard>
  );
};

export default TodayScheduleCard;
