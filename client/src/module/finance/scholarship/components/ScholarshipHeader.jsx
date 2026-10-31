import { Button } from "antd";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";

import PageHeader from "../../../../components/ui/PageHeader";

const MotionDiv = motion.div;

const ScholarshipHeader = ({ onCreate }) => (
  <MotionDiv initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
    <PageHeader
      title='Pengelolaan Beasiswa'
      description='Buat beasiswa, tentukan potongan, lalu pilih penerima siswa.'
      extra={
        <Button type='primary' icon={<Plus size={16} />} onClick={onCreate}>
          Tambah Beasiswa
        </Button>
      }
    />
  </MotionDiv>
);

export default ScholarshipHeader;
