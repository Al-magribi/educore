import React from "react";
import { Card, Col, Row, Skeleton, Space } from "antd";
import {
  cardStyle,
  heroStyle,
  statCardStyle,
} from "./studentDashStyles";

const StudentDashSkeleton = ({ isMobile, isXs }) => (
  <Space direction='vertical' size={isXs ? 12 : 16} style={{ width: "100%" }}>
    <Card
      variant='borderless'
      style={{
        ...heroStyle,
        borderRadius: isXs ? 16 : isMobile ? 18 : 28,
        boxShadow: isMobile
          ? "0 12px 28px rgba(15, 23, 42, 0.14)"
          : heroStyle.boxShadow,
      }}
      styles={{ body: { padding: isXs ? 12 : isMobile ? 14 : 28 } }}
    >
      <Skeleton
        active
        avatar={{ size: isXs ? 40 : isMobile ? 48 : 76 }}
        paragraph={{ rows: isMobile ? 1 : 2 }}
        title={{ width: isMobile ? "55%" : "45%" }}
      />
    </Card>

    <Row gutter={[isXs ? 12 : 16, isXs ? 12 : 16]}>
      {[1, 2, 3].map((item) => (
        <Col key={item} xs={24} sm={12} lg={8}>
          <Card
            variant='borderless'
            style={statCardStyle}
            styles={{ body: { padding: isXs ? 12 : 16 } }}
          >
            <Skeleton active paragraph={{ rows: 1 }} />
          </Card>
        </Col>
      ))}
    </Row>

    <Row gutter={[isXs ? 12 : 16, isXs ? 12 : 16]}>
      <Col xs={24} lg={14}>
        <Card
          variant='borderless'
          style={cardStyle}
          styles={{ body: { padding: isXs ? 12 : 20 } }}
        >
          <Skeleton active paragraph={{ rows: 4 }} />
        </Card>
      </Col>
      <Col xs={24} lg={10}>
        <Card
          variant='borderless'
          style={cardStyle}
          styles={{ body: { padding: isXs ? 12 : 20 } }}
        >
          <Skeleton active paragraph={{ rows: 4 }} />
        </Card>
      </Col>
    </Row>
  </Space>
);

export default StudentDashSkeleton;
