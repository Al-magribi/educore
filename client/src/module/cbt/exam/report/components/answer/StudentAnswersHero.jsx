import { Button, Flex, Tag } from "antd";
import { ArrowLeft, Download } from "lucide-react";
import PageHeader from "../../../../../../components/ui/PageHeader";

const StudentAnswersHero = ({
  studentName,
  studentNis,
  studentClass,
  onBack,
  onExportPdf,
}) => (
  <Flex vertical gap={8}>
    <Button
      type='link'
      icon={<ArrowLeft size={16} />}
      onClick={onBack}
      style={{ width: "fit-content", paddingInline: 0 }}
    >
      Kembali
    </Button>
    <PageHeader
      title={studentName}
      description={`${studentNis || "-"} - ${studentClass || "-"}`}
      meta={<Tag>Review Jawaban Siswa</Tag>}
      extra={
        <Button icon={<Download size={16} />} onClick={onExportPdf}>
          Export PDF
        </Button>
      }
    />
  </Flex>
);

export default StudentAnswersHero;
