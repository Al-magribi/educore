import React from "react";
import { Badge, Card, Col, Row, Space, Spin, Tabs, Typography } from "antd";
import { BookOpenText, Layers2, ScrollText } from "lucide-react";
import {
  useGetJuzListQuery,
  useGetSurahListQuery,
} from "../../../../service/tahfiz/ApiAlquran";
import Surah from "./Surah";
import Juz from "./Juz";

const { Text, Title } = Typography;

const iconStyle = (color) => ({ width: 18, height: 18, color });

const Alquran = () => {
  const surahQuery = useGetSurahListQuery();
  const juzQuery = useGetJuzListQuery();

  const totalAyat =
    surahQuery.data?.reduce(
      (accumulator, surah) => accumulator + (surah.number_of_verses || 0),
      0,
    ) || 0;

  const summaryItems = [
    {
      label: "Total Surah",
      value: surahQuery.data?.length || 0,
      icon: <BookOpenText style={iconStyle("#1677ff")} />,
      color: "#e6f4ff",
    },
    {
      label: "Total Juz",
      value: juzQuery.data?.length || 0,
      icon: <Layers2 style={iconStyle("#52c41a")} />,
      color: "#f6ffed",
    },
    {
      label: "Total Ayat",
      value: totalAyat,
      icon: <ScrollText style={iconStyle("#fa8c16")} />,
      color: "#fff7e6",
    },
  ];

  return (
    <Space vertical size={16} style={{ width: "100%" }}>
      <Card
        style={{
          borderRadius: 14,
          border: "1px solid #e6f4ff",
          boxShadow: "0 10px 30px rgba(10, 37, 64, 0.08)",
          background: "linear-gradient(135deg, #e6f4ff 0%, #ffffff 65%)",
        }}
      >
        <Space vertical size={4}>
          <Title level={4} style={{ margin: 0 }}>
            Referensi Al-Qur'an
          </Title>
          <Text type="secondary">
            Jelajahi daftar Surah dan detail Juz secara cepat dan terstruktur.
          </Text>
        </Space>
      </Card>

      <Row gutter={[12, 12]}>
        {summaryItems.map((item) => (
          <Col xs={24} md={8} key={item.label}>
            <Card style={{ borderRadius: 12, background: item.color }}>
              <Space
                align="start"
                style={{ width: "100%", justifyContent: "space-between" }}
              >
                <Space vertical size={2}>
                  <Text type="secondary">{item.label}</Text>
                  <Title level={3} style={{ margin: 0 }}>
                    {item.value}
                  </Title>
                </Space>
                {item.icon}
              </Space>
            </Card>
          </Col>
        ))}
      </Row>

      <Card style={{ borderRadius: 12 }}>
        <Tabs
          size="large"
          items={[
            {
              key: "surah",
              label: (
                <Space size={6}>
                  <BookOpenText size={16} />
                  <span>Surah</span>
                  <Badge count={surahQuery.data?.length || 0} showZero />
                </Space>
              ),
              children: (
                <Surah
                  data={surahQuery.data || []}
                  isLoading={surahQuery.isLoading}
                  isFetching={surahQuery.isFetching}
                  isError={surahQuery.isError}
                  refetch={surahQuery.refetch}
                />
              ),
            },
            {
              key: "juz",
              label: (
                <Space size={6}>
                  <Layers2 size={16} />
                  <span>Juz</span>
                  <Badge count={juzQuery.data?.length || 0} showZero />
                </Space>
              ),
              children: (
                <Juz
                  data={juzQuery.data || []}
                  isLoading={juzQuery.isLoading}
                  isFetching={juzQuery.isFetching}
                  isError={juzQuery.isError}
                  refetch={juzQuery.refetch}
                />
              ),
            },
          ]}
        />
      </Card>

      {(surahQuery.isLoading || juzQuery.isLoading) &&
      !surahQuery.data?.length &&
      !juzQuery.data?.length ? (
        <Card style={{ textAlign: "center", borderRadius: 12 }}>
          <Spin />
        </Card>
      ) : null}
    </Space>
  );
};

export default Alquran;
