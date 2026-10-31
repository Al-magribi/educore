import { Button, Space, Tag } from "antd";
import { DollarCircleOutlined, UserSwitchOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";

import PageHeader from "../../../../../components/ui/PageHeader";

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
    <PageHeader
      title='Kelola Kas Kelas'
      description='Tetapkan petugas kas, pantau status pembayaran siswa, dan kelola transaksi pemasukan maupun pengeluaran pada periode aktif.'
      meta={
        <Space wrap size={[8, 8]}>
          <Tag color='green' style={{ margin: 0 }}>
            {activePeriode?.name || "Periode aktif"}
          </Tag>
          <Tag color='blue' style={{ margin: 0 }}>
            {`Wali Kelas ${access?.homeroom_class?.name || ""}`.trim()}
          </Tag>
        </Space>
      }
      extra={
        <>
          <Button icon={<UserSwitchOutlined />} onClick={onOpenOfficerModal}>
            Atur Petugas
          </Button>
          <Button
            type='primary'
            icon={<DollarCircleOutlined />}
            onClick={() => onOpenTransactionModal(null, "income")}
          >
            Catat Transaksi
          </Button>
        </>
      }
    />
  </MotionDiv>
);

export default ContributionHeader;
