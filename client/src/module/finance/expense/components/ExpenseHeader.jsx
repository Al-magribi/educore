import { Button } from "antd";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";

import PageHeader from "../../../../components/ui/PageHeader";

const MotionDiv = motion.div;

const ExpenseHeader = ({ onCreate }) => (
  <MotionDiv initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
    <PageHeader
      title='Pengelolaan Pengeluaran'
      description='Catat pengeluaran satuan, filter per periode, dan pantau total biaya.'
      extra={
        <Button type='primary' icon={<Plus size={16} />} onClick={onCreate}>
          Tambah Pengeluaran
        </Button>
      }
    />
  </MotionDiv>
);

export default ExpenseHeader;
