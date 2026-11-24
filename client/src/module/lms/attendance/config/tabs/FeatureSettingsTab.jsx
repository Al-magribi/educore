import { Grid, Tabs } from "antd";
import { useSearchParams } from "react-router-dom";
import { CalendarClock, CalendarDays, MessageCircle } from "lucide-react";
import AttendanceFeaturePanel from "./AttendanceFeaturePanel";
import HolidayCalendarTab from "./HolidayCalendarTab";
import TelegramFeatureTab from "./TelegramFeatureTab";

const { useBreakpoint } = Grid;

const SUB_KEYS = ["attendance", "telegram", "holiday"];

const FeatureSettingsTab = ({ featureRows = [] }) => {
  const screens = useBreakpoint();
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("sub");
  const activeKey = SUB_KEYS.includes(requested) ? requested : SUB_KEYS[0];

  const handleChange = (key) => {
    const next = new URLSearchParams(searchParams);
    next.set("sub", key);
    setSearchParams(next, { replace: true });
  };

  return (
    <Tabs
      activeKey={activeKey}
      onChange={handleChange}
      size={screens.md ? "middle" : "small"}
      items={[
        {
          key: "attendance",
          icon: <CalendarClock size={16} />,
          label: "Fitur Absensi",
          children: <AttendanceFeaturePanel featureRows={featureRows} />,
        },
        {
          key: "telegram",
          icon: <MessageCircle size={16} />,
          label: "Fitur Telegram",
          children: <TelegramFeatureTab />,
        },
        {
          key: "holiday",
          icon: <CalendarDays size={16} />,
          label: "Kalender Libur",
          children: <HolidayCalendarTab />,
        },
      ]}
    />
  );
};

export default FeatureSettingsTab;
