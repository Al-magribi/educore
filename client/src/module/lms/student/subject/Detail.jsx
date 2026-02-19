import React from "react";
import { Button, Card, Flex, Space, Tabs, Tag, Typography } from "antd";
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Building2,
  Hash,
  Layers3,
} from "lucide-react";
import LearningTab from "./components/LearningTab";
import ReportTab from "./components/ReportTab";

const { Title, Text } = Typography;

const Detail = ({ subject, classId, onBack }) => {
  const tabItems = [
    {
      key: "learning",
      label: "Materi Pembelajaran",
      icon: <BookOpen size={16} />,
      children: <LearningTab subjectId={subject.id} classId={classId} />,
    },
    {
      key: "report",
      label: "Laporan Belajar",
      icon: <BarChart3 size={16} />,
      children: <ReportTab subject={subject} classId={classId} />,
    },
  ];

  return (
    <Flex vertical gap={16}>
      <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 20 } }}>
        <Flex justify='space-between' align='center' wrap='wrap' gap={12}>
          <Space align='center' size={12}>
            <Button icon={<ArrowLeft size={16} />} onClick={onBack}>
              Kembali
            </Button>
            <div>
              <Title level={4} style={{ margin: 0 }}>
                {subject?.name}
              </Title>
              <Text type='secondary'>Detail pembelajaran mata pelajaran</Text>
            </div>
          </Space>

          <Space size={[8, 8]} wrap>
            <Tag icon={<Hash size={12} />} color='geekblue' style={{ marginRight: 0 }}>
              {subject?.code || "Tanpa Kode"}
            </Tag>
            <Tag icon={<Layers3 size={12} />} color='blue' style={{ marginRight: 0 }}>
              {subject?.category_name || "Umum"}
            </Tag>
            {subject?.branch_name ? (
              <Tag
                icon={<Building2 size={12} />}
                color='cyan'
                style={{ marginRight: 0 }}
              >
                {subject.branch_name}
              </Tag>
            ) : null}
          </Space>
        </Flex>
      </Card>

      <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 16 } }}>
        <Tabs defaultActiveKey='learning' items={tabItems} />
      </Card>
    </Flex>
  );
};

export default Detail;
