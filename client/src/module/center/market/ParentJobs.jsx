import React from "react";
import {
  Col,
  Empty,
  Flex,
  Grid,
  Progress,
  Row,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import {
  BankOutlined,
  RiseOutlined,
  SafetyOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import { useGetParentJobsQuery } from "../../../service/center/ApiAnalysis";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const ParentJobs = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { data: apiData, isLoading } = useGetParentJobsQuery();
  const jobsData = apiData?.data || [];
  const totalParents = jobsData.reduce(
    (sum, item) => sum + (Number(item.total) || 0),
    0,
  );
  const topJob = jobsData[0];
  const topShare = totalParents
    ? Math.round(((Number(topJob?.total) || 0) / totalParents) * 100)
    : 0;

  return (
    <MotionDiv
      whileHover={isMobile ? undefined : { y: -3 }}
      transition={{ duration: 0.2 }}
      style={{
        height: "100%",
        width: "100%",
        minWidth: 0,
        borderRadius: isMobile ? 18 : 24,
        border: "1px solid rgba(148, 163, 184, 0.14)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96))",
        boxShadow: "0 20px 50px rgba(15, 23, 42, 0.06)",
        padding: isMobile ? 12 : 20,
        overflow: "hidden",
      }}
    >
      <Space orientation="vertical" size={isMobile ? 12 : 16} style={{ width: "100%" }}>
        <div style={{ minWidth: 0 }}>
          <Tag
            color="gold"
            style={{ borderRadius: 999, paddingInline: 12, margin: 0 }}
          >
            Parent Jobs
          </Tag>
          <Title
            level={4}
            style={{
              margin: "10px 0 0",
              color: "#0f172a",
              fontSize: isMobile ? 18 : undefined,
              wordBreak: "break-word",
            }}
          >
            Profil Pekerjaan Orang Tua
          </Title>
          {!isMobile && (
            <Text style={{ color: "#64748b", display: "block", marginTop: 6 }}>
              Lihat distribusi profesi orang tua untuk memahami profil keluarga
              siswa.
            </Text>
          )}
        </div>

        {isLoading ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : jobsData.length > 0 ? (
          <Space orientation="vertical" size={isMobile ? 12 : 16} style={{ width: "100%" }}>
            <Row gutter={[isMobile ? 8 : 12, isMobile ? 8 : 12]}>
              <Col xs={24} sm={12} lg={8}>
                <div
                  style={{
                    borderRadius: 18,
                    padding: isMobile ? 12 : 16,
                    background: "linear-gradient(135deg, #fffbeb, #fef3c7)",
                    border: "1px solid #fde68a",
                    minHeight: isMobile ? undefined : 108,
                    height: "100%",
                    minWidth: 0,
                  }}
                >
                  <Space direction="vertical" size={6} style={{ width: "100%" }}>
                    <Tag
                      color="gold"
                      style={{
                        borderRadius: 999,
                        width: "fit-content",
                        margin: 0,
                      }}
                    >
                      Total Profesi
                    </Tag>
                    <Title level={3} style={{ margin: 0, color: "#b45309", fontSize: isMobile ? 22 : undefined }}>
                      {jobsData.length}
                    </Title>
                    <Text style={{ color: "#92400e", fontSize: isMobile ? 12 : undefined }}>
                      kategori pekerjaan orang tua
                    </Text>
                  </Space>
                </div>
              </Col>
              <Col xs={24} sm={12} lg={8}>
                <div
                  style={{
                    borderRadius: 18,
                    padding: isMobile ? 12 : 16,
                    background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
                    border: "1px solid #bfdbfe",
                    minHeight: isMobile ? undefined : 108,
                    height: "100%",
                    minWidth: 0,
                  }}
                >
                  <Space direction="vertical" size={6} style={{ width: "100%" }}>
                    <Tag
                      color="blue"
                      style={{
                        borderRadius: 999,
                        width: "fit-content",
                        margin: 0,
                      }}
                    >
                      Profesi Utama
                    </Tag>
                    <Text
                      strong
                      ellipsis={{ tooltip: topJob?.job || "-" }}
                      style={{ fontSize: isMobile ? 16 : 18, color: "#1d4ed8", maxWidth: "100%" }}
                    >
                      {topJob?.job || "-"}
                    </Text>
                    <Text style={{ color: "#1e3a8a", fontSize: isMobile ? 12 : undefined }}>
                      {topJob?.total || 0} data orang tua
                    </Text>
                  </Space>
                </div>
              </Col>
              <Col xs={24} sm={24} lg={8}>
                <div
                  style={{
                    borderRadius: 18,
                    padding: isMobile ? 12 : 16,
                    background: "linear-gradient(135deg, #f0fdf4, #dcfce7)",
                    border: "1px solid #bbf7d0",
                    minHeight: isMobile ? undefined : 108,
                    height: "100%",
                    minWidth: 0,
                  }}
                >
                  <Space direction="vertical" size={6} style={{ width: "100%" }}>
                    <Tag
                      color="green"
                      style={{
                        borderRadius: 999,
                        width: "fit-content",
                        margin: 0,
                      }}
                    >
                      Pangsa Terbesar
                    </Tag>
                    <Title level={3} style={{ margin: 0, color: "#166534", fontSize: isMobile ? 22 : undefined }}>
                      {topShare}%
                    </Title>
                    <Text style={{ color: "#166534", fontSize: isMobile ? 12 : undefined }}>
                      kontribusi profesi dominan
                    </Text>
                  </Space>
                </div>
              </Col>
            </Row>

            <div
              style={{
                borderRadius: isMobile ? 16 : 20,
                border: "1px solid #e2e8f0",
                background: "#ffffff",
                padding: isMobile ? 10 : 16,
                width: "100%",
                minWidth: 0,
                overflow: "hidden",
              }}
            >
              <Space direction="vertical" size={isMobile ? 10 : 14} style={{ width: "100%" }}>
                {jobsData.map((item, index) => {
                  const total = Number(item.total) || 0;
                  const percentage = totalParents
                    ? Math.round((total / totalParents) * 100)
                    : 0;
                  const jobName = item.job || "Profesi tidak diketahui";

                  return (
                    <div
                      key={`${item.job}-${index}`}
                      style={{
                        borderRadius: 16,
                        padding: isMobile ? 10 : 14,
                        background: index === 0 ? "#fffaf0" : "#ffffff",
                        border: "1px solid #e2e8f0",
                        minWidth: 0,
                      }}
                    >
                      <Flex
                        justify="space-between"
                        align={isMobile ? "stretch" : "flex-start"}
                        vertical={isMobile}
                        gap={10}
                        style={{ marginBottom: 10, width: "100%", minWidth: 0 }}
                      >
                        <Flex align="flex-start" gap={10} style={{ width: "100%", minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              width: isMobile ? 32 : 36,
                              height: isMobile ? 32 : 36,
                              borderRadius: 12,
                              background:
                                index === 0
                                  ? "linear-gradient(135deg, #f59e0b, #fbbf24)"
                                  : "#e2e8f0",
                              color: index === 0 ? "#fff" : "#475569",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              flexShrink: 0,
                              fontSize: isMobile ? 12 : 14,
                            }}
                          >
                            {index + 1}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <Flex align="center" gap={8} wrap="wrap" style={{ width: "100%" }}>
                              <BankOutlined style={{ color: "#d97706", flexShrink: 0 }} />
                              <Text
                                strong
                                ellipsis={{ tooltip: jobName }}
                                style={{ color: "#0f172a", fontSize: isMobile ? 14 : 15, minWidth: 0, flex: 1 }}
                              >
                                {jobName}
                              </Text>
                            </Flex>
                            {!isMobile && (
                              <Text style={{ color: "#64748b" }}>
                                Sebaran profesi orang tua pada data siswa
                              </Text>
                            )}
                          </div>
                        </Flex>

                        <div
                          style={{
                            textAlign: isMobile ? "left" : "right",
                            flexShrink: 0,
                            paddingLeft: isMobile ? 42 : 0,
                          }}
                        >
                          <Text strong style={{ fontSize: isMobile ? 14 : 16, color: "#0f172a" }}>
                            {total} data
                          </Text>
                          <Text
                            style={{
                              display: "block",
                              color: "#d97706",
                              fontWeight: 600,
                              fontSize: isMobile ? 13 : undefined,
                            }}
                          >
                            {percentage}%
                          </Text>
                        </div>
                      </Flex>

                      <Progress
                        percent={percentage}
                        showInfo={false}
                        size={isMobile ? "small" : "default"}
                        strokeColor="#f59e0b"
                        trailColor="#f1f5f9"
                        strokeLinecap="round"
                      />
                    </div>
                  );
                })}
              </Space>
            </div>

            <Row gutter={[isMobile ? 8 : 12, isMobile ? 8 : 12]}>
              <Col xs={24} md={8}>
                <div
                  style={{
                    borderRadius: 18,
                    padding: isMobile ? 12 : 16,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    height: "100%",
                    minWidth: 0,
                  }}
                >
                  <Flex gap={10} align="flex-start" style={{ width: "100%", minWidth: 0 }}>
                    <div
                      style={{
                        width: isMobile ? 36 : 40,
                        height: isMobile ? 36 : 40,
                        borderRadius: 14,
                        background: "#fef3c7",
                        color: "#d97706",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <TeamOutlined />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <Text strong style={{ color: "#0f172a", display: "block", fontSize: isMobile ? 13 : undefined }}>
                        Total data profesi
                      </Text>
                      <Text style={{ color: "#64748b", display: "block", fontSize: isMobile ? 12 : undefined }}>
                        {totalParents} orang tua sudah masuk ke pemetaan
                        profesi.
                      </Text>
                    </div>
                  </Flex>
                </div>
              </Col>
              <Col xs={24} md={8}>
                <div
                  style={{
                    borderRadius: 18,
                    padding: isMobile ? 12 : 16,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    height: "100%",
                    minWidth: 0,
                  }}
                >
                  <Flex gap={10} align="flex-start" style={{ width: "100%", minWidth: 0 }}>
                    <div
                      style={{
                        width: isMobile ? 36 : 40,
                        height: isMobile ? 36 : 40,
                        borderRadius: 14,
                        background: "#fef3c7",
                        color: "#d97706",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <SafetyOutlined />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <Text strong style={{ color: "#0f172a", display: "block", fontSize: isMobile ? 13 : undefined }}>
                        Segment inti keluarga
                      </Text>
                      <Text style={{ color: "#64748b", display: "block", fontSize: isMobile ? 12 : undefined }}>
                        Profesi dominan bisa dipakai sebagai dasar penyusunan
                        persona wali murid.
                      </Text>
                    </div>
                  </Flex>
                </div>
              </Col>
              <Col xs={24} md={8}>
                <div
                  style={{
                    borderRadius: 18,
                    padding: isMobile ? 12 : 16,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    height: "100%",
                    minWidth: 0,
                  }}
                >
                  <Flex gap={10} align="flex-start" style={{ width: "100%", minWidth: 0 }}>
                    <div
                      style={{
                        width: isMobile ? 36 : 40,
                        height: isMobile ? 36 : 40,
                        borderRadius: 14,
                        background: "#fef3c7",
                        color: "#d97706",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <RiseOutlined />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <Text strong style={{ color: "#0f172a", display: "block", fontSize: isMobile ? 13 : undefined }}>
                        Insight distribusi
                      </Text>
                      <Text style={{ color: "#64748b", display: "block", fontSize: isMobile ? 12 : undefined }}>
                        Gunakan profesi dengan porsi besar untuk menyesuaikan
                        pesan promosi dan pendekatan komunikasi.
                      </Text>
                    </div>
                  </Flex>
                </div>
              </Col>
            </Row>
          </Space>
        ) : (
          <div
            style={{
              minHeight: isMobile ? 240 : 320,
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
              description="Data pekerjaan belum tersedia"
            />
          </div>
        )}
      </Space>
    </MotionDiv>
  );
};

export default ParentJobs;
