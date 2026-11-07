import { Button } from 'antd';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

import PageHeader from '../../../../../components/ui/PageHeader';

const MotionDiv = motion.div;

const OthersHeader = ({ onOpenType }) => (
  <MotionDiv initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
    <PageHeader
      title="Pengelolaan Tagihan Non-SPP"
      description="Atur jenis biaya dan pantau pembayaran di luar SPP bulanan."
      extra={
        <Button type="primary" icon={<Plus size={16} />} onClick={onOpenType}>
          Atur Jenis Biaya
        </Button>
      }
    />
  </MotionDiv>
);

export default OthersHeader;
