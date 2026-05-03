import React from "react";
import { Card, Col, Flex, Space, Tag, Typography } from "antd";
import {
  BookOpen,
  Building2,
  Hash,
  Layers3,
  MoveRight,
  UserSquare2,
} from "lucide-react";

const { Text } = Typography;

const Subject = ({ subject, onClick }) => {
  return (
    <Col xs={24} sm={12} lg={8} xl={6}>
      <Card
        hoverable
        onClick={onClick}
        style={{ borderRadius: 14, height: "100%" }}
        styles={{ body: { padding: 16 } }}
      >
        <Flex vertical gap={12} style={{ height: "100%" }}>
          <Flex align='center' gap={10}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "#f6ffed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#52c41a",
              }}
            >
              <BookOpen size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Text
                strong
                style={{
                  display: "block",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={subject.name}
              >
                {subject.name}
              </Text>
              <Text type='secondary' style={{ fontSize: 12 }}>
                KKM: {subject.kkm ?? "-"}
              </Text>
            </div>
            <MoveRight size={16} color='#8c8c8c' />
          </Flex>

          <Space size={[8, 8]} wrap>
            <Tag
              icon={<Hash size={12} />}
              color='geekblue'
              style={{ marginRight: 0, borderRadius: 999 }}
            >
              {subject.code || "Tanpa Kode"}
            </Tag>
            <Tag
              icon={<Layers3 size={12} />}
              color='blue'
              style={{ marginRight: 0, borderRadius: 999 }}
            >
              {subject.category_name || "Umum"}
            </Tag>
            {subject.branch_name ? (
              <Tag
                icon={<Building2 size={12} />}
                color='cyan'
                style={{ marginRight: 0, borderRadius: 999 }}
              >
                {subject.branch_name}
              </Tag>
            ) : null}
          </Space>

          {Array.isArray(subject.teacher_names) && subject.teacher_names.length > 0 ? (
            <Text type='secondary' style={{ fontSize: 12 }}>
              <UserSquare2
                size={14}
                style={{ marginRight: 6, verticalAlign: "text-bottom" }}
              />
              {subject.teacher_names.join(", ")}
            </Text>
          ) : null}
        </Flex>
      </Card>
    </Col>
  );
};

Subject.Skeleton = function SubjectSkeleton() {
  return (
    <Col xs={24} sm={12} lg={8} xl={6}>
      <Card style={{ borderRadius: 14 }} loading />
    </Col>
  );
};

export default Subject;