import React from "react";
import { Card, Empty, Flex, List, Space, Tag, Typography } from "antd";
import { ClipboardList } from "lucide-react";
import {
  cardHeadStyles,
  cardStyle,
  examItemStyle,
} from "./studentDashStyles";

const { Text } = Typography;

const ExamListItem = ({ item, stackLayout, isXs }) => (
  <List.Item
    style={{
      ...examItemStyle,
      padding: isXs ? "12px 12px" : "14px 16px",
      marginBottom: isXs ? 10 : 12,
    }}
  >
    <div style={{ width: "100%", minWidth: 0 }}>
      <Flex
        justify='space-between'
        align='flex-start'
        gap={12}
        vertical={stackLayout}
        style={{ marginBottom: 10, minWidth: 0 }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <Text
            strong
            style={{
              color: "#0f172a",
              display: "block",
              wordBreak: "break-word",
              fontSize: isXs ? 14 : 15,
            }}
          >
            {item.name}
          </Text>
          <Text type='secondary' style={{ fontSize: isXs ? 12 : 13 }}>
            {item.subject_name || "Mata pelajaran belum tersedia"}
          </Text>
        </div>
        <Tag
          color='green'
          style={{
            borderRadius: 999,
            marginInlineEnd: 0,
            flexShrink: 0,
          }}
        >
          Aktif
        </Tag>
      </Flex>
      <Flex justify='space-between' align='center' gap={12} wrap='wrap'>
        <Text type='secondary' style={{ fontSize: isXs ? 12 : 14 }}>
          Durasi
        </Text>
        <Text strong style={{ fontSize: isXs ? 13 : 14 }}>
          {item.duration_minutes || 0} menit
        </Text>
      </Flex>
    </div>
  </List.Item>
);

const StudentExamsCard = ({ exams, isMobile, isXs }) => (
  <Card
    variant='borderless'
    style={cardStyle}
    styles={cardHeadStyles({ isMobile, isXs })}
    title={
      <Space size={8} style={{ minWidth: 0 }}>
        <ClipboardList size={18} style={{ flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: isXs ? 14 : 15 }}>
          Ujian Aktif
        </span>
      </Space>
    }
  >
    {exams.length ? (
      <List
        dataSource={exams}
        split={false}
        renderItem={(item) => (
          <ExamListItem item={item} stackLayout={isXs} isXs={isXs} />
        )}
      />
    ) : (
      <Empty description='Belum ada ujian aktif.' />
    )}
  </Card>
);

export default StudentExamsCard;
