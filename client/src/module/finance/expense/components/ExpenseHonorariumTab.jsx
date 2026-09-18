import { useState } from "react";
import { useSelector } from "react-redux";
import {
  Card,
  Empty,
  Flex,
  Grid,
  Select,
  Tabs,
  Tag,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import {
  BriefcaseBusiness,
  Coins,
  Layers3,
  UsersRound,
  WalletCards,
} from "lucide-react";

import { LoadApp } from "../../../../components";
import { useFinanceScope } from "../../../center/finance/FinanceScopeContext";
import { useGetHonorariumOptionsQuery } from "../../../../service/finance/ApiHonorarium";
import { cardStyle } from "../constants";
import HonorariumPersonnelPanel from "./HonorariumPersonnelPanel";
import HonorariumPayrollPreviewPanel from "./HonorariumPayrollPreviewPanel";
import HonorariumPositionPanel from "./HonorariumPositionPanel";
import HonorariumRatePanel from "./HonorariumRatePanel";
import HonorariumUnitPanel from "./HonorariumUnitPanel";

const { Title, Text } = Typography;
const MotionDiv = motion.div;

const ExpenseHonorariumTab = () => {
  const { user } = useSelector((state) => state.auth);
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const financeScope = useFinanceScope();
  const lockHomebase =
    Boolean(user?.homebase_id) || Boolean(financeScope?.homebaseId);

  const [setupTab, setSetupTab] = useState("unit");
  const [selectedHomebaseId, setSelectedHomebaseId] = useState(
    user?.homebase_id || financeScope?.homebaseId || undefined,
  );

  const optionsQuery = useGetHonorariumOptionsQuery(
    lockHomebase
      ? { homebase_id: user?.homebase_id || financeScope?.homebaseId }
      : selectedHomebaseId
        ? { homebase_id: selectedHomebaseId }
        : undefined,
  );

  const options = optionsQuery.data?.data || {};
  const homebases = options.homebases || [];
  const periodes = options.periodes || [];
  const effectiveHomebaseId =
    options.selected_homebase_id ||
    user?.homebase_id ||
    financeScope?.homebaseId ||
    selectedHomebaseId ||
    homebases[0]?.id ||
    undefined;

  const handleHomebaseChange = (value) => {
    if (lockHomebase) {
      return;
    }
    setSelectedHomebaseId(value);
  };

  const createSetupLabel = (label, icon, caption) => (
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
    <Flex vertical gap={isMobile ? 12 : 16}>
      <MotionDiv initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <Card
          style={{
            ...cardStyle,
            overflow: "hidden",
            position: "relative",
            background:
              "radial-gradient(circle at top left, rgba(251,146,60,0.28), transparent 28%), radial-gradient(circle at right center, rgba(255,255,255,0.12), transparent 18%), linear-gradient(135deg, #0f172a 0%, #9a3412 55%, #fb923c 100%)",
            border: "none",
            boxShadow: "0 24px 54px rgba(15, 23, 42, 0.18)",
          }}
          styles={{ body: { padding: isMobile ? 16 : 24 } }}
        >
          <Flex
            justify='space-between'
            align={isMobile ? "stretch" : "center"}
            vertical={isMobile}
            gap={16}
          >
            <Flex align='flex-start' gap={12} style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  width: isMobile ? 40 : 54,
                  height: isMobile ? 40 : 54,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: isMobile ? 14 : 18,
                  background: "rgba(255,255,255,0.14)",
                  color: "#fff",
                  flexShrink: 0,
                }}
              >
                <WalletCards size={isMobile ? 18 : 24} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <Tag
                  color='orange'
                  style={{
                    width: "fit-content",
                    marginBottom: 8,
                    borderRadius: 999,
                    paddingInline: 12,
                    fontWeight: 600,
                  }}
                >
                  Finance / Honorarium
                </Tag>
                <Title
                  level={isMobile ? 4 : 3}
                  style={{
                    color: "#fff",
                    margin: 0,
                    lineHeight: 1.25,
                    wordBreak: "break-word",
                  }}
                >
                  Pengelolaan Honorarium
                </Title>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.78)",
                    fontSize: isMobile ? 13 : undefined,
                    display: "block",
                  }}
                >
                  Setup unit section (Yayasan, Guru, Tata Usaha) dan jabatan
                  per unit. Payroll bulanan menyusul di tahap berikutnya.
                </Text>
              </div>
            </Flex>

            {!lockHomebase && homebases.length > 0 ? (
              <Select
                placeholder='Pilih satuan'
                value={effectiveHomebaseId}
                onChange={handleHomebaseChange}
                style={{
                  minWidth: isMobile ? "100%" : 240,
                  width: isMobile ? "100%" : 240,
                }}
                options={homebases.map((item) => ({
                  value: item.id,
                  label: item.name,
                }))}
              />
            ) : null}
          </Flex>
        </Card>
      </MotionDiv>

      {optionsQuery.isLoading ? (
        <LoadApp />
      ) : optionsQuery.isError ? (
        <Card style={cardStyle}>
          <Empty
            description={
              optionsQuery.error?.data?.message ||
              "Gagal memuat setup honorarium"
            }
          />
        </Card>
      ) : (
        <Card
          style={{
            ...cardStyle,
            borderRadius: isMobile ? 18 : 24,
          }}
          styles={{ body: { padding: isMobile ? 10 : 16 } }}
        >
          <Tabs
            activeKey={setupTab}
            onChange={setSetupTab}
            size={isMobile ? "small" : "middle"}
            tabBarGutter={isMobile ? 8 : 18}
            items={[
              {
                key: "unit",
                label: createSetupLabel(
                  "Unit",
                  <Layers3 size={isMobile ? 14 : 16} />,
                  "Section slip gaji",
                ),
                children: (
                  <HonorariumUnitPanel
                    homebaseId={effectiveHomebaseId}
                    homebases={homebases}
                    lockHomebase={lockHomebase}
                    onHomebaseChange={handleHomebaseChange}
                  />
                ),
              },
              {
                key: "jabatan",
                label: createSetupLabel(
                  "Jabatan",
                  <BriefcaseBusiness size={isMobile ? 14 : 16} />,
                  "Posisi & tunjangan",
                ),
                children: (
                  <HonorariumPositionPanel
                    homebaseId={effectiveHomebaseId}
                    homebases={homebases}
                    lockHomebase={lockHomebase}
                    onHomebaseChange={handleHomebaseChange}
                  />
                ),
              },
              {
                key: "rate",
                label: createSetupLabel(
                  "Item Honor",
                  <Coins size={isMobile ? 14 : 16} />,
                  "Rate & tunjangan",
                ),
                children: (
                  <HonorariumRatePanel
                    homebaseId={effectiveHomebaseId}
                    homebases={homebases}
                    lockHomebase={lockHomebase}
                    onHomebaseChange={handleHomebaseChange}
                  />
                ),
              },
              {
                key: "personel",
                label: createSetupLabel(
                  "Personel",
                  <UsersRound size={isMobile ? 14 : 16} />,
                  "Tendik & jabatan",
                ),
                children: (
                  <HonorariumPersonnelPanel
                    homebaseId={effectiveHomebaseId}
                    homebases={homebases}
                    lockHomebase={lockHomebase}
                    onHomebaseChange={handleHomebaseChange}
                  />
                ),
              },
              {
                key: "payroll",
                label: createSetupLabel(
                  "Payroll",
                  <WalletCards size={isMobile ? 14 : 16} />,
                  "Draft & edit",
                ),
                children: (
                  <HonorariumPayrollPreviewPanel
                    homebaseId={effectiveHomebaseId}
                    homebases={homebases}
                    periodes={periodes}
                    lockHomebase={lockHomebase}
                    onHomebaseChange={handleHomebaseChange}
                  />
                ),
              },
            ]}
          />
        </Card>
      )}
    </Flex>
  );
};

export default ExpenseHonorariumTab;
