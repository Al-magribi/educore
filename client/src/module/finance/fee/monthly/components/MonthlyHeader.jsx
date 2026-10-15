import { Button } from 'antd';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

import PageHeader from '../../../../../components/ui/PageHeader';

const MotionDiv = motion.div;

const MonthlyHeader = ({ onOpenTariff }) => (
  <MotionDiv initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
    <PageHeader
      title="Pembayaran SPP Bulanan"
      description="Kelola tarif dan status pembayaran SPP bulanan siswa."
      extra={
        <Button type="primary" icon={<Plus size={16} />} onClick={onOpenTariff}>
          Tambah Tarif SPP
        </Button>
      }
    />
  </MotionDiv>
);

export default MonthlyHeader;
