import React from "react";
import {
  Typography,
} from "antd";
import { motion } from "framer-motion";

import { StatCard } from "../../../../../../components/ui/muse";
const MotionDiv = motion.div;


const TaskStats = ({ items, isMobile }) => {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile
          ? "1fr"
          : "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 16,
      }}
    >
      {items.map((item, index) => (
        <MotionDiv
          key={item.key}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 * index }}
        >
          <StatCard
            title={item.label}
            value={item.value}
            note={item.caption}
            icon={item.icon}
            tone={item.tone}
          />
        </MotionDiv>
      ))}
    </div>
  );
};

export default TaskStats;
