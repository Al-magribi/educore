import { motion } from "framer-motion";
import { Button, Flex, Tag } from "antd";
import {
  ArrowLeft,
  Download,
  FileUp,
  Plus,
  Trash2,
  Wand2,
} from "lucide-react";
import PageHeader from "../../../../components/ui/PageHeader";

const MotionDiv = motion.div;

const QuestionHeader = ({
  bankName,
  totalCount,
  totalScore,
  onBack,
  onDownload,
  isDownloading,
  onImport,
  onAdd,
  onDeleteAll,
  onGenerateAi,
}) => {
  const isOverScore = totalScore > 100;

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
    >
      <Flex vertical gap={12}>
        <Button
          type='link'
          icon={<ArrowLeft size={16} />}
          onClick={onBack}
          style={{ width: "fit-content", paddingInline: 0 }}
        >
          Kembali
        </Button>
        <PageHeader
          title={bankName?.replaceAll("-", " ")}
          description='Susun, review, dan optimalkan pertanyaan dalam bank soal ini.'
          meta={
            <Flex gap={8} wrap='wrap' align='center'>
              <Tag>Jumlah soal: {totalCount}</Tag>
              <Tag color={isOverScore ? "red" : "blue"}>
                Bobot: {totalScore}/100
              </Tag>
              {isOverScore ? (
                <Tag color='red'>Total bobot melebihi 100 poin</Tag>
              ) : null}
            </Flex>
          }
          extra={
            <>
              <Button
                icon={<Download size={16} />}
                onClick={onDownload}
                loading={isDownloading}
                disabled={totalCount === 0}
              >
                Download Soal
              </Button>
              <Button
                danger
                icon={<Trash2 size={16} />}
                onClick={onDeleteAll}
                disabled={totalCount === 0}
              >
                Kosongkan
              </Button>
              <Button icon={<Wand2 size={16} />} onClick={onGenerateAi}>
                Generate AI
              </Button>
              <Button icon={<FileUp size={16} />} onClick={onImport}>
                Import
              </Button>
              <Button type='primary' icon={<Plus size={16} />} onClick={onAdd}>
                Tambah Soal
              </Button>
            </>
          }
        />
      </Flex>
    </MotionDiv>
  );
};

export default QuestionHeader;
