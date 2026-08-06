import { useState } from "react";
import { Card, Flex, Grid, Tabs } from "antd";
import { CalendarDays, WalletCards } from "lucide-react";

import { cardStyle } from "./constants";
import ExpenseDailyTab from "./components/ExpenseDailyTab";
import ExpenseHonorariumTab from "./components/ExpenseHonorariumTab";

const Expense = () => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const [activeTab, setActiveTab] = useState("harian");

  const createTabLabel = (label, icon, caption) => (
    <Flex align='center' gap={isMobile ? 8 : 10}>
      <span
        style={{
          width: isMobile ? 28 : 34,
          height: isMobile ? 28 : 34,
          display: "grid",
          placeItems: "center",
          borderRadius: isMobile ? 10 : 12,
          background: "linear-gradient(135deg, #ffedd5, #fff7ed)",
          color: "#c2410c",
          border: "1px solid rgba(148,163,184,0.14)",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <Flex vertical gap={0} style={{ minWidth: 0 }}>
        <span style={{ fontWeight: 600, lineHeight: 1.2 }}>{label}</span>
        {!isMobile && (
          <span
            style={{
              fontSize: 12,
              color: "rgba(100,116,139,0.9)",
              lineHeight: 1.2,
            }}
          >
            {caption}
          </span>
        )}
      </Flex>
    </Flex>
  );

  return (
    <Card
      variant='borderless'
      style={{
        ...cardStyle,
        borderRadius: isMobile ? 16 : 28,
        overflow: "hidden",
      }}
      styles={{ body: { padding: isMobile ? 10 : 16 } }}
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        size={isMobile ? "small" : "middle"}
        tabBarGutter={isMobile ? 8 : 18}
        tabBarStyle={{
          marginBottom: isMobile ? 12 : 20,
          paddingBottom: 4,
        }}
        destroyInactiveTabPane={false}
        items={[
          {
            key: "harian",
            label: createTabLabel(
              "Harian",
              <CalendarDays size={isMobile ? 14 : 16} />,
              "Pengeluaran operasional",
            ),
            children: <ExpenseDailyTab />,
          },
          {
            key: "honorarium",
            label: createTabLabel(
              "Honorarium",
              <WalletCards size={isMobile ? 14 : 16} />,
              "Pembayaran honor",
            ),
            children: <ExpenseHonorariumTab />,
          },
        ]}
      />
    </Card>
  );
};

export default Expense;
