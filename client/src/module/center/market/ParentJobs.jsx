import React from "react";
import { Card, Empty, Skeleton, Typography } from "antd";
import { Pie } from "@ant-design/plots";
import { useGetParentJobsQuery } from "../../../service/center/ApiAnalysis";

const { Title } = Typography;

const ParentJobs = () => {
  const { data: apiData, isLoading } = useGetParentJobsQuery();

  // Konfigurasi Chart
  const config = {
    padding: 10, // Menggunakan padding biasa, appendPadding terkadang tidak support
    data: apiData?.data || [],
    angleField: "total",
    colorField: "job",
    radius: 0.8, // Radius lingkaran luar
    innerRadius: 0.6, // Membuat efek Donut (0.6 = 60% bolong di tengah)
    label: {
      // PERBAIKAN UTAMA DI SINI:
      // 1. Hapus 'type: "inner"' (penyebab error)
      // 2. Gunakan 'position: "inside"'
      // 3. Gunakan 'text' untuk konten (pengganti 'content')
      position: "inside",
      text: (datum) => String(datum.total), // Callback terima object data, ambil field 'total'
      style: {
        fill: "#fff",
        fontSize: 14,
        fontWeight: "bold",
        textAlign: "center",
      },
    },
    legend: {
      color: {
        title: false,
        position: "right",
        rowPadding: 5,
      },
    },
    statistic: {
      title: false,
      content: {
        style: {
          whiteSpace: "pre-wrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          fontSize: "18px",
        },
        content: "Profesi\nOrtu",
      },
    },
    // Interaction agar tooltip aktif
    interactions: [{ type: "element-active" }],
  };

  return (
    <Card
      title={<Title level={5}>💼 Profil Pekerjaan Orang Tua</Title>}
      style={{ height: "100%" }}
    >
      {isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : apiData?.data?.length > 0 ? (
        <div style={{ height: 300 }}>
          <Pie {...config} />
        </div>
      ) : (
        <Empty description="Data pekerjaan belum tersedia" />
      )}
    </Card>
  );
};

export default ParentJobs;
