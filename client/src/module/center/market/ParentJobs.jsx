import React from "react";
import {
  Col,
  Empty,
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
      <Space orientation='vertical' size={16} style={{ width: "100%" }}>
        <div>
          <Tag
            color='gold'
            style={{ borderRadius: 999, paddingInline: 12, margin: 0 }}
          >
            Parent Jobs
          </Tag>
          <Title
            level={4}
            style={{
              margin: "10px 0 0",
              color: "#0f172a",
              fontSize: isMobile ? 20 : undefined,
            }}
          >
            Profil Pekerjaan Orang Tua
          </Title>
          <Text style={{ color: "#64748b", display: "block", marginTop: 6 }}>
            Lihat distribusi profesi orang tua untuk memahami profil keluarga
            siswa.
          </Text>
        </div>

        {isLoading ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : jobsData.length > 0 ? (
          <Space orientation='vertical' size={16} style={{ width: "100%" }}>
            <Row gutter={[12, 12]}>
              <Col xs={24} sm={8}>
                <div
                  style={{
                    borderRadius: 18,
                    padding: 16,
                    background: "linear-gradient(135deg, #fffbeb, #fef3c7)",
                    border: "1px solid #fde68a",
                    minHeight: 108,
                  }}
                >
                  <Space direction='vertical' size={6}>
                    <Tag
                      color='gold'
                      style={{
                        borderRadius: 999,
                        width: "fit-content",
                        margin: 0,
                      }}
                    >
                      Total Profesi
                    </Tag>
                    <Title level={3} style={{ margin: 0, color: "#b45309" }}>
                      {jobsData.length}
                    </Title>
                    <Text style={{ color: "#92400e" }}>
                      kategori pekerjaan orang tua
                    </Text>
                  </Space>
                </div>
              </Col>
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
                  <Space direction='vertical' size={6}>
                    <Tag
                      color='blue'
                      style={{
                        borderRadius: 999,
                        width: "fit-content",
                        margin: 0,
                      }}
                    >
                      Profesi Utama
                    </Tag>
                    <Text strong style={{ fontSize: 18, color: "#1d4ed8" }}>
                      {topJob?.job || "-"}
                    </Text>
                    <Text style={{ color: "#1e3a8a" }}>
                      {topJob?.total || 0} data orang tua
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
                  <Space direction='vertical' size={6}>
                    <Tag
                      color='green'
                      style={{
                        borderRadius: 999,
                        width: "fit-content",
                        margin: 0,
                      }}
                    >
                      Pangsa Terbesar
                    </Tag>
                    <Title level={3} style={{ margin: 0, color: "#166534" }}>
                      {topShare}%
                    </Title>
                    <Text style={{ color: "#166534" }}>
                      kontribusi profesi dominan
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
              <Space direction='vertical' size={14} style={{ width: "100%" }}>
                {jobsData.map((item, index) => {
                  const total = Number(item.total) || 0;
                  const percentage = totalParents
                    ? Math.round((total / totalParents) * 100)
                    : 0;

                  return (
                    <div
                      key={`${item.job}-${index}`}
                      style={{
                        borderRadius: 16,
                        padding: 14,
                        background: index === 0 ? "#fffaf0" : "#ffffff",
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
                          align='start'
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
                                  ? "linear-gradient(135deg, #f59e0b, #fbbf24)"
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
                              align='center'
                              wrap
                              style={{ width: "100%", color: "#0f172a" }}
                            >
                              <BankOutlined style={{ color: "#d97706" }} />
                              <Text
                                strong
                                style={{ color: "#0f172a", fontSize: 15 }}
                              >
                                {item.job || "Profesi tidak diketahui"}
                              </Text>
                            </Space>
                            <Text style={{ color: "#64748b" }}>
                              Sebaran profesi orang tua pada data siswa
                            </Text>
                          </div>
                        </Space>

                        <div
                          style={{
                            textAlign: isMobile ? "left" : "right",
                            flexShrink: 0,
                          }}
                        >
                          <Text
                            strong
                            style={{ fontSize: 16, color: "#0f172a" }}
                          >
                            {total} data
                          </Text>
                          <Text
                            style={{
                              display: "block",
                              color: "#d97706",
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
                        strokeColor='#f59e0b'
                        trailColor='#f1f5f9'
                        strokeLinecap='round'
                      />
                    </div>
                  );
                })}
              </Space>
            </div>

            <Row gutter={[12, 12]}>
              <Col xs={24}>
                <div
                  style={{
                    borderRadius: 18,
                    padding: 16,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    height: "100%",
                  }}
                >
                  <Space size={10} align='start' style={{ width: "100%" }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
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
                    <div>
                      <Text
                        strong
                        style={{ color: "#0f172a", display: "block" }}
                      >
                        Total data profesi
                      </Text>
                      <Text style={{ color: "#64748b", display: "block" }}>
                        {totalParents} orang tua sudah masuk ke pemetaan
                        profesi.
                      </Text>
                    </div>
                  </Space>
                </div>
              </Col>
              <Col xs={24}>
                <div
                  style={{
                    borderRadius: 18,
                    padding: 16,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    height: "100%",
                  }}
                >
                  <Space size={10} align='start' style={{ width: "100%" }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
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
                    <div>
                      <Text
                        strong
                        style={{ color: "#0f172a", display: "block" }}
                      >
                        Segment inti keluarga
                      </Text>
                      <Text style={{ color: "#64748b", display: "block" }}>
                        Profesi dominan bisa dipakai sebagai dasar penyusunan
                        persona wali murid.
                      </Text>
                    </div>
                  </Space>
                </div>
              </Col>
              <Col xs={24}>
                <div
                  style={{
                    borderRadius: 18,
                    padding: 16,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    height: "100%",
                  }}
                >
                  <Space size={10} align='start' style={{ width: "100%" }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
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
                    <div>
                      <Text
                        strong
                        style={{ color: "#0f172a", display: "block" }}
                      >
                        Insight distribusi
                      </Text>
                      <Text style={{ color: "#64748b", display: "block" }}>
                        Gunakan profesi dengan porsi besar untuk menyesuaikan
                        pesan promosi dan pendekatan komunikasi.
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
              description='Data pekerjaan belum tersedia'
            />
          </div>
        )}
      </Space>
    </MotionDiv>
  );
};

export default ParentJobs;
