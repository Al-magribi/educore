import {
  Avatar,
  Button,
  Card,
  Flex,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import { CalendarRange, GraduationCap, UsersRound } from "lucide-react";
import { getPeriodeTagColor } from "../../../fee/transaction/components/transactionFormShared.jsx";

import { museColors, museRadius, museShadow } from "../../../../../config/theme";
const { Text } = Typography;
const MotionDiv = motion.div;

const ParentStudentSelector = ({
  childrenOptions,
  selectedStudentId,
  selectedPeriodeId,
  periodes,
  onStudentChange,
  onPeriodeChange,
}) => {
  const periodeOptions = (periodes || []).map((item) => ({
    value: item.id,
    label: (
      <Flex justify='space-between' align='center' gap={12}>
        <span>{item.name}</span>
        <Tag
          color={getPeriodeTagColor(item.is_active)}
          style={{ margin: 0, borderRadius: 999 }}
        >
          {item.is_active ? "Aktif" : "Tidak Aktif"}
        </Tag>
      </Flex>
    ),
    searchLabel: item.name,
  }));

  return (
    <MotionDiv initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card
        variant='borderless'
        style={{
          borderRadius: museRadius.card,
          border: `1px solid ${museColors.divider}`,
          boxShadow: museShadow.card,
          background: "#ffffff",
        }}
        styles={{ body: { padding: 22 } }}
      >
        <Flex align='center' justify='space-between' gap={12} wrap='wrap'>
          <Space size={10}>
            <span
              style={{
                width: 40,
                height: 40,
                borderRadius: museRadius.card,
                display: "grid",
                placeItems: "center",
                background: museColors.primarySoft,
                color: museColors.success,
              }}
            >
              <UsersRound size={18} />
            </span>
            <div>
              <div style={{ fontWeight: 700, color: museColors.text }}>
                Pilih Anak dan Periode
              </div>
              <Text type='secondary'>
                Semua pembayaran dan status akan difilter berdasarkan periode
                yang dipilih.
              </Text>
            </div>
          </Space>

          <Space wrap>
            <Select
              value={selectedStudentId}
              onChange={onStudentChange}
              style={{ minWidth: 240 }}
              placeholder='Pilih anak'
              options={(childrenOptions || []).map((item) => ({
                value: item.student_id,
                label: `${item.student_name}${item.nis ? ` - ${item.nis}` : ""}`,
              }))}
            />
            <Select
              value={selectedPeriodeId}
              onChange={onPeriodeChange}
              style={{ minWidth: 260 }}
              placeholder='Pilih periode'
              options={periodeOptions}
              optionFilterProp='searchLabel'
            />
          </Space>
        </Flex>
      </Card>
    </MotionDiv>
  );
};

export default ParentStudentSelector;
