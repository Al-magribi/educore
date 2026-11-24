import React from "react";
import { Flex, Progress, Typography } from "antd";
import { museColors, museOnColor, museRadius } from "../../../config/theme";

const { Text } = Typography;

/**
 * Daftar peringkat bergaya Muse: nomor urut, label, jumlah, persentase, progress tipis.
 * items: [{ key, label, value }]; total dipakai untuk menghitung persentase.
 */
const RankingList = ({ items, total, unit, icon, tone = "primary" }) => {
  const color = museColors[tone] || tone;

  return (
    <Flex vertical gap={20}>
      {items.map((item, index) => {
        const percentage = total ? Math.round((item.value / total) * 100) : 0;
        const isTop = index === 0;

        return (
          <div key={item.key} style={{ minWidth: 0 }}>
            <Flex justify="space-between" align="center" gap={12} style={{ marginBottom: 6 }}>
              <Flex align="center" gap={12} style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: museRadius.base,
                    background: isTop ? color : museColors.bgSoft,
                    color: isTop ? museOnColor[tone] || "#fff" : museColors.muted,
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 700,
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  {index + 1}
                </div>
                <Flex align="center" gap={6} style={{ minWidth: 0 }}>
                  {icon}
                  <Text strong ellipsis={{ tooltip: item.label }}>
                    {item.label}
                  </Text>
                </Flex>
              </Flex>
              <Text style={{ whiteSpace: "nowrap", fontWeight: 600 }}>
                {item.value.toLocaleString("id-ID")} {unit}
                <Text type="secondary" style={{ marginLeft: 8, fontWeight: 700 }}>
                  {percentage}%
                </Text>
              </Text>
            </Flex>
            <Progress
              percent={percentage}
              showInfo={false}
              strokeColor={color}
              size={["100%", 6]}
              style={{ margin: 0, paddingLeft: 44 }}
            />
          </div>
        );
      })}
    </Flex>
  );
};

export default RankingList;
