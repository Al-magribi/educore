import { useEffect, useMemo, useState } from "react";
import {
  ArrowRightOutlined,
  BankOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  Card,
  Col,
  Empty,
  Grid,
  Input,
  Row,
  Spin,
  Tag,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import { useGetReportHomebasesQuery } from "../../../../service/finance/ApiReport";
import { cardStyle, pageStyle } from "../constants";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" } },
};

const ReportHomebaseList = ({
  basePath = "/finance/laporan",
  getDetailPath,
  title,
  description,
}) => {
  const screens = useBreakpoint();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const resolveDetailPath = (homebaseId) =>
    typeof getDetailPath === "function"
      ? getDetailPath(homebaseId)
      : `${basePath}/${homebaseId}`;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading, isFetching } = useGetReportHomebasesQuery({
    search: debouncedSearch || undefined,
  });

  const homebases = data?.data || [];
  const locked = Boolean(data?.meta?.locked);

  useEffect(() => {
    if (!isLoading && locked && homebases.length === 1) {
      navigate(resolveDetailPath(homebases[0].id), {
        replace: true,
        state: { homebaseName: homebases[0].name },
      });
    }
  }, [basePath, getDetailPath, homebases, isLoading, locked, navigate]);

  const cols = screens.xl ? 6 : screens.lg ? 8 : screens.md ? 12 : 24;

  const titleText = useMemo(() => {
    if (title) return title;
    return locked
      ? "Laporan Keuangan Satuan"
      : "Laporan Keuangan — Pilih Satuan Pendidikan";
  }, [locked, title]);

  const descriptionText =
    description ||
    "Pilih satuan untuk melihat ringkasan pendapatan SPP dan pembayaran lainnya, breakdown, serta siswa yang belum lunas.";

  if (isLoading || (locked && homebases.length === 1)) {
    return (
      <div style={{ ...pageStyle, textAlign: "center", paddingTop: 64 }}>
        <Spin size='large' />
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
          {titleText}
        </Title>
        <Text type='secondary'>{descriptionText}</Text>
      </div>

      {!locked ? (
        <div style={{ marginBottom: 20, maxWidth: 360 }}>
          <Input
            prefix={<SearchOutlined />}
            placeholder='Cari satuan pendidikan…'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            allowClear
          />
        </div>
      ) : null}

      {isFetching && homebases.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48 }}>
          <Spin size='large' />
        </div>
      ) : homebases.length === 0 ? (
        <Empty
          description='Tidak ada satuan ditemukan'
          style={{ marginTop: 48 }}
        />
      ) : (
        <MotionDiv
          variants={containerVariants}
          initial='hidden'
          animate='show'
        >
          <Row gutter={[16, 16]}>
            {homebases.map((homebase) => (
              <Col key={homebase.id} span={cols}>
                <MotionDiv variants={itemVariants}>
                  <Card
                    hoverable
                    onClick={() =>
                      navigate(resolveDetailPath(homebase.id), {
                        state: { homebaseName: homebase.name },
                      })
                    }
                    style={{ ...cardStyle, cursor: "pointer", height: "100%" }}
                    styles={{ body: { padding: 16 } }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          background: "#e6f4ff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <BankOutlined
                          style={{ fontSize: 18, color: "#1677ff" }}
                        />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          strong
                          ellipsis
                          style={{
                            fontSize: 14,
                            display: "block",
                            marginBottom: 4,
                          }}
                        >
                          {homebase.name}
                        </Text>
                        {homebase.level ? (
                          <Tag
                            color='blue'
                            style={{ marginBottom: 0, fontSize: 11 }}
                          >
                            {homebase.level}
                          </Tag>
                        ) : null}
                      </div>

                      <ArrowRightOutlined
                        style={{ color: "#1677ff", flexShrink: 0 }}
                      />
                    </div>
                  </Card>
                </MotionDiv>
              </Col>
            ))}
          </Row>
        </MotionDiv>
      )}
    </div>
  );
};

export default ReportHomebaseList;
