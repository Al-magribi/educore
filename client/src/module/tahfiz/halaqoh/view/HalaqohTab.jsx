import React from "react";
import { Card, Tabs, Typography } from "antd";
import { BookUser, UserRound } from "lucide-react";
import Halaqoh from "./Halaqoh";
import Musyrif from "./Musyrif";

const { Paragraph, Title } = Typography;

const HalaqohTab = () => {
  return (
    <Card
      style={{ borderRadius: 18 }}
      styles={{ body: { padding: 20 } }}
      bordered={false}
    >
      <Title level={4} style={{ marginTop: 0, marginBottom: 6 }}>
        Halaqoh & Musyrif
      </Title>
      <Paragraph type="secondary" style={{ marginBottom: 16 }}>
        Kelola musyrif, pembagian halaqoh, dan penempatan siswa dalam satu halaman.
      </Paragraph>

      <Tabs
        defaultActiveKey="halaqoh"
        items={[
          {
            key: "halaqoh",
            label: (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <BookUser size={16} />
                Halaqoh
              </span>
            ),
            children: <Halaqoh />,
          },
          {
            key: "musyrif",
            label: (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <UserRound size={16} />
                Musyrif
              </span>
            ),
            children: <Musyrif />,
          },
        ]}
      />
    </Card>
  );
};

export default HalaqohTab;
