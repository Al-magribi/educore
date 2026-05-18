import React from "react";
import { Button, Card, Flex, Select, Space, Tag, Typography } from "antd";
import { BookOpenCheck, CalendarDays, Filter, RefreshCcw } from "lucide-react";
import { SEMESTER_OPTIONS } from "./constants";

const { Title, Text } = Typography;

const ReportHeader = ({
  subjectName,
  className,
  selectedSemester,
  setSelectedSemester,
  semesterOptions,
  selectedMonth,
  setSelectedMonth,
  monthOptions,
  onRefresh,
}) => {
  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
      <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
        <Space align="center">
          <BookOpenCheck size={18} color="#1677ff" />
          <div>
            <Title level={5} style={{ margin: 0 }}>
              Laporan Pembelajaran Siswa
            </Title>
            <Text type="secondary">
              Filter laporan berdasarkan periode aktif, semester, dan bulan.
            </Text>
          </div>
        </Space>

        <Space wrap>
          <Tag color="blue">{subjectName || "-"}</Tag>
          <Tag color="processing">{className || "-"}</Tag>
        </Space>
      </Flex>

      <Flex wrap="wrap" gap={10} style={{ marginTop: 16 }}>
        <Select
          value={selectedSemester}
          onChange={setSelectedSemester}
          options={semesterOptions.length ? semesterOptions : SEMESTER_OPTIONS}
          style={{ minWidth: 180 }}
          placeholder="Pilih semester"
          suffixIcon={<Filter size={14} />}
        />
        <Select
          value={selectedMonth}
          onChange={setSelectedMonth}
          options={monthOptions}
          style={{ minWidth: 180 }}
          placeholder="Pilih bulan"
          suffixIcon={<CalendarDays size={14} />}
        />
        <Button icon={<RefreshCcw size={14} />} onClick={onRefresh}>
          Refresh
        </Button>
      </Flex>
    </Card>
  );
};

export default ReportHeader;
