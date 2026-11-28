import { motion } from "framer-motion";

import PageHeader from "../../../../../components/ui/PageHeader";

const MotionDiv = motion.div;

const ParentTransactionHero = ({ student }) => (
  <MotionDiv initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
    <PageHeader
      title='Riwayat pembayaran sekolah'
      description={`Pantau status SPP bulanan, pembayaran lainnya, cicilan, dan invoice resmi untuk ${student?.student_name || "anak Anda"}.`}
    />
  </MotionDiv>
);

export default ParentTransactionHero;
