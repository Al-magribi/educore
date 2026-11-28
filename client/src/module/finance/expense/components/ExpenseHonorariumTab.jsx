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
  ClipboardList,
  Coins,
  Medal,
  Layers3,
  UsersRound,
  WalletCards,
} from "lucide-react";

import FinanceSkeleton from "../../shared/FinanceSkeleton";
import { useFinanceScope } from "../../../center/finance/FinanceScopeContext";
import { useGetHonorariumOptionsQuery } from "../../../../service/finance/ApiHonorarium";
import { cardStyle } from "../constants";
import HonorariumDutyPanel from "./HonorariumDutyPanel";
import HonorariumEskulPanel from "./HonorariumEskulPanel";
import HonorariumPersonnelPanel from "./HonorariumPersonnelPanel";
import HonorariumPayrollPreviewPanel from "./HonorariumPayrollPreviewPanel";
import HonorariumPositionPanel from "./HonorariumPositionPanel";
import HonorariumRatePanel from "./HonorariumRatePanel";
import HonorariumUnitPanel from "./HonorariumUnitPanel";
import PageHeader from "../../../../components/ui/PageHeader";

import { museRadius } from "../../../../config/theme";
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

  // Label tab: ikon 14 + teks satu baris (CLAUDE.md §4 "Tab").
  const createSetupLabel = (label, icon) => (
    <Flex align='center' gap={6} style={{ whiteSpace: "nowrap" }}>
      {icon}
      <span>{label}</span>
    </Flex>
  );

  return (
    <Flex vertical gap={isMobile ? 12 : 16}>
      <MotionDiv initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <PageHeader
          size='section'
          title='Honorarium'
          description='Setup unit section (Yayasan, Guru, Tata Usaha) dan jabatan per unit. Payroll bulanan menyusul di tahap berikutnya.'
          extra={
            !lockHomebase && homebases.length > 0 ? (
              <Select
                placeholder='Pilih satuan'
                value={effectiveHomebaseId}
                onChange={handleHomebaseChange}
                style={{ width: isMobile ? "100%" : 240 }}
                options={homebases.map((item) => ({
                  value: item.id,
                  label: item.name,
                }))}
                virtual={false}
              />
            ) : null
          }
        />
      </MotionDiv>

      {optionsQuery.isLoading ? (
        <FinanceSkeleton />
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
            borderRadius: museRadius.card,
          }}
          styles={{ body: { padding: isMobile ? 10 : 16 } }}
        >
          <Tabs
            activeKey={setupTab}
            onChange={setSetupTab}
            size={isMobile ? "small" : "middle"}
            items={[
              {
                key: "unit",
                label: createSetupLabel(
                  "Unit",
                  <Layers3 size={14} />,
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
                  <BriefcaseBusiness size={14} />,
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
                key: "tugas",
                label: createSetupLabel(
                  "Tugas Tambahan",
                  <ClipboardList size={14} />,
                  "Insentif di luar jabatan",
                ),
                children: (
                  <HonorariumDutyPanel
                    homebaseId={effectiveHomebaseId}
                    homebases={homebases}
                    lockHomebase={lockHomebase}
                    onHomebaseChange={handleHomebaseChange}
                  />
                ),
              },
              {
                key: "eskul",
                label: createSetupLabel(
                  "Eskul",
                  <Medal size={14} />,
                  "Rate & penugasan",
                ),
                children: (
                  <HonorariumEskulPanel
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
                  <Coins size={14} />,
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
                  <UsersRound size={14} />,
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
                  <WalletCards size={14} />,
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
