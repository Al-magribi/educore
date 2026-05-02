import { Alert, Button, Card, Flex, Space, Tag, Typography } from "antd";
import {
  DollarCircleOutlined,
  FundProjectionScreenOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";

import { cardStyle } from "../constants";

const { Text, Title } = Typography;
const MotionDiv = motion.div;

const StudentContributionHeader = ({
  activePeriode,
  access,
  ownStudent,
  onOpenIncomeModal,
  onOpenExpenseModal,
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
              style={{
                margin: 0,
                color: "#f8fafc",
                lineHeight: 1.15,
              }}
            >
              Kelola Uang Kas Kelas
            </Title>
            <Text style={{ color: "rgba(226,232,240,0.88)", maxWidth: 760 }}>
              Pantau status pembayaran siswa, atur pemasukan dan pengeluaran,
              lalu lihat saldo kas kelas pada periode aktif.
            </Text>
            <Space wrap size={[10, 10]}>
              <Tag
                color='green'
                style={{ borderRadius: 999, paddingInline: 12 }}
              >
                {activePeriode?.name || "Periode aktif"}
              </Tag>
              <Tag
                color={access?.is_officer ? "blue" : "default"}
                style={{ borderRadius: 999, paddingInline: 12 }}
              >
                {access?.is_officer ? "Petugas Kas" : "Siswa"}
              </Tag>
              <Tag style={{ borderRadius: 999, paddingInline: 12 }}>
                {access?.class_scope?.name || "-"}
              </Tag>
            </Space>
          </Space>

          {access?.is_officer ? (
            <Space wrap>
              <Button
                icon={<WalletOutlined />}
                onClick={() => onOpenExpenseModal()}
                size='large'
                style={{ borderRadius: 999, fontWeight: 600 }}
              >
                Catat Pengeluaran
              </Button>
              <Button
                type='primary'
                icon={<DollarCircleOutlined />}
                onClick={() => onOpenIncomeModal(null)}
                size='large'
                style={{
                  borderRadius: 999,
                  fontWeight: 600,
                  background: "#f8fafc",
                  color: "#0f172a",
                  borderColor: "#f8fafc",
                }}
              >
                Catat Pembayaran
              </Button>
            </Space>
          ) : null}
        </Flex>

        <Alert
          showIcon
          type={access?.is_officer ? "info" : "success"}
          style={{
            borderRadius: 18,
            border: "none",
            background: "rgba(255,255,255,0.12)",
            color: "#fff",
          }}
          icon={<FundProjectionScreenOutlined />}
          title={
            access?.is_officer
              ? "Anda terdaftar sebagai petugas kas kelas pada periode aktif ini."
              : "Anda sedang melihat status kas kelas dan riwayat pembayaran periode aktif."
          }
          description={
            ownStudent?.is_paid
              ? "Status pembayaran kas Anda sudah tercatat pada periode aktif."
              : "Pembayaran kas Anda belum tercatat pada periode aktif."
          }
        />
      </Flex>
    </Card>
  </MotionDiv>
);

export default StudentContributionHeader;
