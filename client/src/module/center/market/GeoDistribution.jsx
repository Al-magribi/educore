import React from "react";
import { Col, Empty, Grid, Progress, Row, Skeleton, Space, Tag, Typography } from "antd";
import { EnvironmentOutlined, RiseOutlined, TeamOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import { useGetGeoDistributionQuery } from "../../../service/center/ApiAnalysis";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const GeoDistribution = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { data: apiData, isLoading } = useGetGeoDistributionQuery();
  const distributionData = apiData?.data || [];
  const totalStudents = distributionData.reduce(
    (sum, item) => sum + (Number(item.student_count) || 0),
    0,
  );
  const topCity = distributionData[0];
  const averagePerCity = distributionData.length
    ? Math.round(totalStudents / distributionData.length)
    : 0;

  return (
    <MotionDiv
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      style={{
        height: "100%",
        borderRadius: 24,
        border: "1px solid rgba(148, 163, 184, 0.14)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96))",
        boxShadow: "0 20px 50px rgba(15, 23, 42, 0.06)",
        padding: isMobile ? 16 : 20,
      }}
    >
      <Space orientation="vertical" size={16} style={{ width: "100%" }}>
        <div>
          <Tag
            color="blue"
            style={{ borderRadius: 999, paddingInline: 12, margin: 0 }}
          >
            Geo Distribution
          </Tag>
          <Title
            level={4}
            style={{ margin: "10px 0 0", color: "#0f172a", fontSize: isMobile ? 20 : undefined }}
          >
            Sebaran Wilayah Asal Siswa
          </Title>
          <Text style={{ color: "#64748b", display: "block", marginTop: 6 }}>
            Lihat kota atau kabupaten dengan jumlah siswa aktif terbanyak.
          </Text>
        </div>

        {isLoading ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : distributionData.length > 0 ? (
          <Space orientation="vertical" size={16} style={{ width: "100%" }}>
            <Row gutter={[12, 12]}>
              <Col xs={24} sm={8}>
                <div
                  style={{
                    borderRadius: 18,
                    padding: 16,
                    background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
                    border: "1px solid #bfdbfe",
                    minHeight: 108,
                  }}
                >
                  <Space direction="vertical" size={6}>
                    <Tag
                      color="blue"
                      style={{ borderRadius: 999, width: "fit-content", margin: 0 }}
                    >
                      Total Wilayah
                    </Tag>
                    <Title level={3} style={{ margin: 0, color: "#1d4ed8" }}>
                      {distributionData.length}
                    </Title>
                    <Text style={{ color: "#1e3a8a" }}>
                      kota/kabupaten asal siswa aktif
                    </Text>
                  </Space>
                </div>
              </Col>
              <Col xs={24} sm={8}>
                <div
                  style={{
                    borderRadius: 18,
                    padding: 16,
                    background: "linear-gradient(135deg, #f0fdf4, #dcfce7)",
                    border: "1px solid #bbf7d0",
                    minHeight: 108,
                  }}
                >
                  <Space direction="vertical" size={6}>
                    <Tag
                      color="green"
                      style={{ borderRadius: 999, width: "fit-content", margin: 0 }}
                    >
                      Kota Dominan
                    </Tag>
                    <Text strong style={{ fontSize: 18, color: "#166534" }}>
                      {topCity?.city_name || "-"}
                    </Text>
                    <Text style={{ color: "#166534" }}>
                      {topCity?.student_count || 0} siswa
                    </Text>
                  </Space>
                </div>
              </Col>
              <Col xs={24} sm={8}>
                <div
                  style={{
                    borderRadius: 18,
                    padding: 16,
                    background: "linear-gradient(135deg, #fff7ed, #ffedd5)",
                    border: "1px solid #fdba74",
                    minHeight: 108,
                  }}
                >
                  <Space direction="vertical" size={6}>
                    <Tag
                      color="orange"
                      style={{ borderRadius: 999, width: "fit-content", margin: 0 }}
                    >
                      Rata-rata
                    </Tag>
                    <Title level={3} style={{ margin: 0, color: "#c2410c" }}>
                      {averagePerCity}
                    </Title>
                    <Text style={{ color: "#9a3412" }}>
                      siswa per wilayah
                    </Text>
                  </Space>
                </div>
              </Col>
            </Row>

            <div
              style={{
                borderRadius: 20,
                border: "1px solid #e2e8f0",
                background: "#ffffff",
                padding: 16,
              }}
            >
              <Space direction="vertical" size={14} style={{ width: "100%" }}>
                {distributionData.map((item, index) => {
                  const count = Number(item.student_count) || 0;
                  const percentage = totalStudents
                    ? Math.round((count / totalStudents) * 100)
                    : 0;

                  return (
                    <div
                      key={`${item.city_name}-${index}`}
                      style={{
                        borderRadius: 16,
                        padding: 14,
                        background: index === 0 ? "#f8fafc" : "#ffffff",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          alignItems: isMobile ? "stretch" : "flex-start",
                          flexDirection: isMobile ? "column" : "row",
                          marginBottom: 10,
                        }}
                      >
                        <Space
                          align="start"
                          size={10}
                          style={{ width: "100%", minWidth: 0 }}
                        >
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 12,
                              background:
                                index === 0
                                  ? "linear-gradient(135deg, #2563eb, #3b82f6)"
                                  : "#e2e8f0",
                              color: index === 0 ? "#fff" : "#475569",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              flexShrink: 0,
                            }}
                          >
                            {index + 1}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <Space
                              size={8}
                              align="center"
                              wrap
                              style={{ width: "100%", color: "#0f172a" }}
                            >
                              <EnvironmentOutlined style={{ color: "#2563eb" }} />
                              <Text strong style={{ color: "#0f172a", fontSize: 15 }}>
                                {item.city_name || "Wilayah tidak diketahui"}
                              </Text>
                            </Space>
                            <Text style={{ color: "#64748b" }}>
                              Kontribusi terhadap total sebaran siswa
                            </Text>
                          </div>
                        </Space>

                        <div
                          style={{
                            textAlign: isMobile ? "left" : "right",
                            flexShrink: 0,
                          }}
                        >
                          <Text strong style={{ fontSize: 16, color: "#0f172a" }}>
                            {count} siswa
                          </Text>
                          <Text
                            style={{
                              display: "block",
                              color: "#2563eb",
                              fontWeight: 600,
                            }}
                          >
                            {percentage}%
                          </Text>
                        </div>
                      </div>

                      <Progress
                        percent={percentage}
                        showInfo={false}
                        strokeColor="#2563eb"
                        trailColor="#e2e8f0"
                        strokeLinecap="round"
                      />
                    </div>
                  );
                })}
              </Space>
            </div>

            <Row gutter={[12, 12]}>
              <Col xs={24} sm={12}>
                <div
                  style={{
                    borderRadius: 18,
                    padding: 16,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    height: "100%",
                  }}
                >
                  <Space size={10} align="start" style={{ width: "100%" }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 14,
                        background: "#dbeafe",
                        color: "#2563eb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <TeamOutlined />
                    </div>
                    <div>
                      <Text strong style={{ color: "#0f172a", display: "block" }}>
                        Total siswa terpetakan
                      </Text>
                      <Text style={{ color: "#64748b", display: "block" }}>
                        {totalStudents} siswa sudah terdistribusi ke seluruh wilayah.
                      </Text>
                    </div>
                  </Space>
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <div
                  style={{
                    borderRadius: 18,
                    padding: 16,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    height: "100%",
                  }}
                >
                  <Space size={10} align="start" style={{ width: "100%" }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 14,
                        background: "#dbeafe",
                        color: "#2563eb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <RiseOutlined />
                    </div>
                    <div>
                      <Text strong style={{ color: "#0f172a", display: "block" }}>
                        Fokus akuisisi wilayah
                      </Text>
                      <Text style={{ color: "#64748b", display: "block" }}>
                        Prioritaskan wilayah dengan kontribusi tertinggi untuk strategi
                        promosi yang lebih presisi.
                      </Text>
                    </div>
                  </Space>
                </div>
              </Col>
            </Row>
          </Space>
        ) : (
          <div
            style={{
              minHeight: 320,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 18,
              background: "#f8fafc",
              border: "1px dashed #cbd5e1",
            }}
          >
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Belum ada data geografis"
            />
          </div>
        )}
      </Space>
    </MotionDiv>
  );
};

export default GeoDistribution;
