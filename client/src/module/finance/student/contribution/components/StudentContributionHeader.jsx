import { Button, Space, Tag } from "antd";
import { DollarCircleOutlined, WalletOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";

import PageHeader from "../../../../../components/ui/PageHeader";

const MotionDiv = motion.div;

const StudentContributionHeader = ({
  activePeriode,
  access,
  onOpenIncomeModal,
  onOpenExpenseModal,
}) => (
  <MotionDiv
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25, ease: "easeOut" }}
  >
    <PageHeader
      title='Kelola Uang Kas Kelas'
      description='Pantau status pembayaran siswa, atur pemasukan dan pengeluaran, lalu lihat saldo kas kelas pada periode aktif.'
      meta={
        <Space wrap size={[8, 8]}>
          <Tag color='green' style={{ margin: 0 }}>
            {activePeriode?.name || "Periode aktif"}
          </Tag>
          <Tag color={access?.is_officer ? "blue" : "default"} style={{ margin: 0 }}>
            {access?.is_officer ? "Petugas Kas" : "Siswa"}
          </Tag>
          <Tag style={{ margin: 0 }}>{access?.class_scope?.name || "-"}</Tag>
        </Space>
      }
      extra={
        access?.is_officer ? (
          <>
            <Button icon={<WalletOutlined />} onClick={() => onOpenExpenseModal()}>
              Catat Pengeluaran
            </Button>
            <Button
              type='primary'
              icon={<DollarCircleOutlined />}
              onClick={() => onOpenIncomeModal(null)}
            >
              Catat Pembayaran
            </Button>
          </>
        ) : null
      }
    />
  </MotionDiv>
);

export default StudentContributionHeader;
