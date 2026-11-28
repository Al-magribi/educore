import { Flex, Grid, Tooltip } from "antd";
import { Info } from "lucide-react";

import { StatCard } from "../../../components/ui/muse";
import { museColors } from "../../../config/theme";

const { useBreakpoint } = Grid;

// Cari kunci museColors dari nilai warna (item lama menyimpan warna, bukan tone).
const toneFromColor = (color) =>
  Object.keys(museColors).find((key) => museColors[key] === color) || "primary";

const StatTitle = ({ title, note }) => (
  <Flex align='center' gap={6} component='span'>
    <span>{title}</span>
    {note ? (
      <Tooltip title={note}>
        <Info
          size={13}
          aria-label={`Keterangan ${title}`}
          color={museColors.muted}
          style={{ cursor: "help", flexShrink: 0 }}
        />
      </Tooltip>
    ) : null}
  </Flex>
);

/**
 * Grid kartu statistik keuangan (pola dashboard CLAUDE.md §4).
 * items: [{ key, title, value, note?, noteAsText?, icon?, tone?, color?, valueColor? }]
 */
const FinanceStatGrid = ({ items, minWidth = 220, compact = true }) => {
  const screens = useBreakpoint();
  const gap = screens.md ? 24 : 16;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fit, minmax(min(${minWidth}px, 100%), 1fr))`,
        gap,
      }}
    >
      {items.map((item) => (
        <StatCard
          key={item.key || item.title}
          compact={compact}
          title={
            <StatTitle title={item.title} note={item.noteAsText ? null : item.note} />
          }
          value={
            item.valueColor ? (
              <span style={{ color: item.valueColor }}>{item.value}</span>
            ) : (
              item.value
            )
          }
          note={item.noteAsText ? item.note : undefined}
          icon={item.icon}
          tone={item.tone || toneFromColor(item.color)}
        />
      ))}
    </div>
  );
};

export default FinanceStatGrid;
