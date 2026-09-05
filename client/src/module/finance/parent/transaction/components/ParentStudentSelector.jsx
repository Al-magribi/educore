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
          borderRadius: 26,
          border: "1px solid rgba(148,163,184,0.14)",
          boxShadow: "0 20px 42px rgba(15,23,42,0.06)",
          background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
        }}
        styles={{ body: { padding: 22 } }}
      >
        <Flex align='center' justify='space-between' gap={12} wrap='wrap'>
          <Space size={10}>
            <span
              style={{
                width: 40,
                height: 40,
                borderRadius: 14,
                display: "grid",
                placeItems: "center",
                background: "linear-gradient(135deg, #dbeafe, #dcfce7)",
                color: "#0f766e",
              }}
            >
              <UsersRound size={18} />
            </span>
            <div>
              <div style={{ fontWeight: 700, color: "#0f172a" }}>
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
