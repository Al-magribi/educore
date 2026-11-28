import { Button, Drawer, Flex, Grid } from "antd";
import { Eye, Pencil } from "lucide-react";

import { CardTitle } from "../../../components/ui/muse";
import { museColors } from "../../../config/theme";
import { StudentProfileSections, StudentSummaryCard } from "./StudentProfile";

const { useBreakpoint } = Grid;

/** Drawer baca-saja berisi profil lengkap satu siswa. */
const StudentDetailDrawer = ({ open, student, onClose, onEdit }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size={isMobile ? "100%" : 760}
      destroyOnHidden
      title={
        <CardTitle
          icon={<Eye size={16} />}
          title='Detail Database Siswa'
          description={isMobile ? undefined : student?.full_name}
        />
      }
      styles={{ body: { background: museColors.bgLayout, padding: isMobile ? 12 : 24 } }}
      footer={
        <Flex justify='flex-end' gap={8}>
          <Button onClick={onClose}>Tutup</Button>
          <Button type='primary' icon={<Pencil size={16} />} onClick={() => onEdit?.(student)}>
            Perbarui Data
          </Button>
        </Flex>
      }
    >
      <Flex vertical gap={isMobile ? 16 : 24}>
        <StudentSummaryCard student={student} />
        <StudentProfileSections student={student} />
      </Flex>
    </Drawer>
  );
};

export default StudentDetailDrawer;
