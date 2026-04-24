import { Alert, Button, Card, Flex, Space, Tag, Typography } from "antd";
import {
  DollarCircleOutlined,
  TeamOutlined,
  UserSwitchOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";

import { cardStyle } from "../constants";

const { Text, Title } = Typography;
const MotionDiv = motion.div;

const ContributionHeader = ({
  activePeriode,
  access,
  onOpenOfficerModal,
  onOpenTransactionModal,
}) => (
  <MotionDiv
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25, ease: "easeOut" }}
  >
    <Card
      variant='borderless'
      style={{
        ...cardStyle,
        overflow: "hidden",
        background:
          "radial-gradient(circle at top left, rgba(16,185,129,0.18), transparent 28%), linear-gradient(135deg, #0f172a, #166534 58%, #0f766e)",
        boxShadow: "0 24px 60px rgba(15, 23, 42, 0.2)",
      }}
      styles={{ body: { padding: 24 } }}
    >
      <Flex vertical gap={18}>
        <Flex justify='space-between' align='center' wrap='wrap' gap={16}>
          <Space orientation='vertical' size={8}>
            <Text
              style={{
                fontSize: 12,
                letterSpacing: 0.5,
                textTransform: "uppercase",
                color: "rgba(226,232,240,0.85)",
              }}
            >
              Finance / Kas Kelas
            </Text>
            <Title
              level={3}
              style={{ margin: 0, color: "#f8fafc", lineHeight: 1.15 }}
            >
              Kelola Kas Kelas dengan kontrol wali kelas
            </Title>
            <Text style={{ color: "rgba(226,232,240,0.88)", maxWidth: 760 }}>
              Tetapkan petugas kas, pantau status pembayaran siswa, dan kelola
              transaksi pemasukan maupun pengeluaran pada periode aktif.
            </Text>
            <Space wrap size={[10, 10]}>
              <Tag
                color='green'
                style={{ borderRadius: 999, paddingInline: 12 }}
              >
                {activePeriode?.name || "Periode aktif"}
              </Tag>
              <Tag
                color='blue'
                style={{ borderRadius: 999, paddingInline: 12 }}
              >
                {`Wali Kelas ${access?.homeroom_class?.name || ""}`.trim()}
              </Tag>
            </Space>
          </Space>

          <Space wrap>
            <Button
              icon={<UserSwitchOutlined />}
              onClick={onOpenOfficerModal}
              size='large'
              style={{ borderRadius: 999, fontWeight: 600 }}
            >
              Atur Petugas
            </Button>
            <Button
              type='primary'
              icon={<DollarCircleOutlined />}
              onClick={() => onOpenTransactionModal(null, "income")}
              size='large'
              style={{
                borderRadius: 999,
                fontWeight: 600,
                background: "#f8fafc",
                color: "#0f172a",
                borderColor: "#f8fafc",
              }}
            >
              Catat Transaksi
            </Button>
          </Space>
        </Flex>
      </Flex>
    </Card>
  </MotionDiv>
);

export default ContributionHeader;
