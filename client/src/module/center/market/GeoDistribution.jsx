import React from "react";
import { Card, Empty, Skeleton, Typography } from "antd";
import { Bar } from "@ant-design/plots";
import { useGetGeoDistributionQuery } from "../../../service/center/ApiAnalysis";

const { Title } = Typography;

const GeoDistribution = () => {
  const { data: apiData, isLoading } = useGetGeoDistributionQuery();

  // Konfigurasi Chart
  const config = {
    data: apiData?.data || [],
    xField: "student_count", // Sumbu X: Jumlah Siswa
    yField: "city_name", // Sumbu Y: Nama Kota
    seriesField: "city_name",
    legend: false,
    label: {
      position: "inside",
      style: {
        fill: "#FFFFFF",
        opacity: 0.6,
      },
    },
    xAxis: {
      label: {
        autoHide: true,
        autoRotate: false,
      },
    },
    meta: {
      city_name: { alias: "Kota/Kab" },
      student_count: { alias: "Jumlah Siswa" },
    },
    color: "#1890ff",
    barStyle: { radius: [4, 4, 0, 0] },
  };

  return (
    <Card
      title={<Title level={5}>🗺️ Sebaran Wilayah Asal Siswa</Title>}
      style={{ height: "100%" }}
    >
      {isLoading ? (
        <Skeleton active />
      ) : apiData?.data?.length > 0 ? (
        <div style={{ height: 300 }}>
          <Bar {...config} />
        </div>
      ) : (
        <Empty description="Belum ada data geografis" />
      )}
    </Card>
  );
};

export default GeoDistribution;
