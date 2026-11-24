import { Card, Empty, Flex, Space, Tag, Typography } from "antd";
import { Award, Gift, Users, Wand2 } from "lucide-react";

import {
  benefitTargetLabel,
  benefitTypeLabel,
  cardStyle,
  currencyFormatter,
} from "../constants";

import { museColors, museRadius } from "../../../../config/theme";
const { Text, Title } = Typography;

const ScholarshipDetailSummary = ({
  scholarship,
  benefits = [],
  students = [],
  impact = {},
}) => {
  if (!scholarship) {
    return (
      <Empty description="Pilih beasiswa untuk melihat ringkasan" />
    );
  }

  const activeStudents = students.filter((item) => item.is_active !== false);
  const sppBenefits = benefits.filter((item) => item.benefit_target === "spp");
  const otherBenefits = benefits.filter(
    (item) => item.benefit_target === "other",
  );

  const coverCards = [
    {
      key: "total",
      label: "Total Cover",
      value: impact.total_cover || 0,
      note: `${impact.covered_item_count || 0} item · ${impact.covered_student_count || 0} siswa`,
      color: museColors.primary,
    },
    {
      key: "spp",
      label: "Cover SPP",
      value: impact.spp_cover || 0,
      note: "Potongan pada tagihan SPP",
      color: museColors.primary,
    },
    {
      key: "other",
      label: "Cover Lainnya",
      value: impact.other_cover || 0,
      note: "Potongan pembayaran lainnya",
      color: museColors.success,
    },
  ];

  return (
    <Space direction="vertical" size={14} style={{ width: "100%" }}>
      <Card style={cardStyle}>
        <Flex align="center" gap={12}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: museRadius.card,
              display: "grid",
              placeItems: "center",
              background: museColors.primarySoft,
              color: museColors.primary,
            }}
          >
            <Award size={22} />
          </div>
          <div>
            <Title level={4} style={{ margin: 0 }}>
              {scholarship.name}
            </Title>
            <Text type="secondary">
              {scholarship.code || "Tanpa kode"}
              {scholarship.description ? ` · ${scholarship.description}` : ""}
            </Text>
            <div style={{ marginTop: 6 }}>
              <Tag color={scholarship.is_active ? "green" : "default"}>
                {scholarship.is_active ? "Aktif" : "Nonaktif"}
              </Tag>
            </div>
          </div>
        </Flex>
      </Card>

      <Flex gap={12} wrap="wrap">
        {coverCards.map((item) => (
          <Card key={item.key} style={{ ...cardStyle, flex: 1, minWidth: 180 }}>
            <Flex align="center" gap={10}>
              <Gift size={18} color={item.color} />
              <div>
                <Text type="secondary">{item.label}</Text>
                <div style={{ fontSize: 20, fontWeight: 700, color: item.color }}>
                  {currencyFormatter.format(Number(item.value || 0))}
                </div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {item.note}
                </Text>
              </div>
            </Flex>
          </Card>
        ))}
      </Flex>

      <Flex gap={12} wrap="wrap">
        <Card style={{ ...cardStyle, flex: 1, minWidth: 180 }}>
          <Flex align="center" gap={10}>
            <Users size={18} color={museColors.purple} />
            <div>
              <Text type="secondary">Penerima aktif</Text>
              <div style={{ fontSize: 22, fontWeight: 700 }}>
                {activeStudents.length}
              </div>
            </div>
          </Flex>
        </Card>
        <Card style={{ ...cardStyle, flex: 1, minWidth: 180 }}>
          <Flex align="center" gap={10}>
            <Wand2 size={18} color={museColors.primary} />
            <div>
              <Text type="secondary">Aturan SPP</Text>
              <div style={{ fontSize: 22, fontWeight: 700 }}>
                {sppBenefits.length}
              </div>
            </div>
          </Flex>
        </Card>
        <Card style={{ ...cardStyle, flex: 1, minWidth: 180 }}>
          <Flex align="center" gap={10}>
            <Wand2 size={18} color={museColors.success} />
            <div>
              <Text type="secondary">Aturan Lainnya</Text>
              <div style={{ fontSize: 22, fontWeight: 700 }}>
                {otherBenefits.length}
              </div>
            </div>
          </Flex>
        </Card>
      </Flex>

      <Card title="Rincian aturan" style={cardStyle}>
        {benefits.length === 0 ? (
          <Empty description="Belum ada aturan potongan" />
        ) : (
          <Space direction="vertical" size={10} style={{ width: "100%" }}>
            {benefits.map((benefit) => (
              <Flex
                key={benefit.id}
                justify="space-between"
                gap={12}
                wrap="wrap"
                style={{
                  padding: 12,
                  borderRadius: museRadius.card,
                  background: museColors.bgLayout,
                  border: `1px solid ${museColors.divider}`,
                }}
              >
                <Space direction="vertical" size={2}>
                  <Space wrap>
                    <Tag color={benefit.benefit_target === "spp" ? "blue" : "cyan"}>
                      {benefitTargetLabel[benefit.benefit_target]}
                    </Tag>
                    <Tag>{benefitTypeLabel[benefit.benefit_type]}</Tag>
                  </Space>
                  <Text>
                    {benefit.benefit_target === "spp"
                      ? `${(benefit.months || []).length} bulan dipilih`
                      : benefit.component_name || "Jenis biaya"}
                  </Text>
                </Space>
                <Text strong>
                  {benefit.benefit_type === "full"
                    ? "Gratis penuh"
                    : currencyFormatter.format(Number(benefit.amount || 0))}
                </Text>
              </Flex>
            ))}
          </Space>
        )}
      </Card>
    </Space>
  );
};

export default ScholarshipDetailSummary;
