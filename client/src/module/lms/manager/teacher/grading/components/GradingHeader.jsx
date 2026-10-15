import { Flex, Tag } from "antd";
import { CalendarCheck, Info } from "lucide-react";
import PageHeader from "../../../../../../components/ui/PageHeader";

const GradingHeader = ({ subject, unit, period, semesterLabel }) => {
  const subjectLabel = subject?.name || "Mata Pelajaran";
  const periodLabel = period?.name || "Periode";

  return (
    <PageHeader
      size='section'
      title={`Penilaian ${subjectLabel}`}
      description='Rekap sikap, formatif, sumatif, dan ujian akhir per semester.'
      meta={
        <Flex gap={8} wrap='wrap'>
          {unit?.name ? <Tag color='blue'>{unit.name}</Tag> : null}
          <Tag color={period?.isActive ? "green" : "default"} icon={<CalendarCheck size={12} />}>
            {periodLabel}
          </Tag>
          <Tag color='geekblue'>{semesterLabel}</Tag>
          {subject?.kkm ? (
            <Tag color='gold'>KKM {subject.kkm}</Tag>
          ) : (
            <Tag icon={<Info size={12} />}>KKM belum ditetapkan</Tag>
          )}
        </Flex>
      }
    />
  );
};

export default GradingHeader;
