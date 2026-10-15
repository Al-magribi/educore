import { memo } from "react";
import { Button, Space, Tag } from "antd";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";

import PageHeader from "../../../../../components/ui/PageHeader";

const MotionDiv = motion.div;

const SavingHeader = ({ access, activePeriode, onCreate }) => (
  <MotionDiv
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25, ease: "easeOut" }}
  >
    <PageHeader
      title='Kelola tabungan siswa'
      description='Pantau saldo siswa, proses setoran dan penarikan, lalu tinjau histori transaksi tabungan lintas periode.'
      meta={
        <Space wrap size={[8, 8]}>
          <Tag color='green' style={{ margin: 0 }}>
            {activePeriode?.name || "Periode aktif"}
          </Tag>
          <Tag
            color={access?.role_scope === "teacher" ? "blue" : "purple"}
            style={{ margin: 0 }}
          >
            {access?.role_scope === "teacher"
              ? `Wali Kelas ${access?.homeroom_class?.name || ""}`.trim()
              : "Admin Keuangan"}
          </Tag>
        </Space>
      }
      extra={
        <Button
          type='primary'
          icon={<Plus size={16} />}
          onClick={() => onCreate(null, "deposit")}
        >
          Catat Tabungan
        </Button>
      }
    />
  </MotionDiv>
);

export default memo(SavingHeader);
