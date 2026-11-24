import React from "react";
import { Button } from "antd";
import { museColors } from "../../../../config/theme";

const getQuestionButtonStyle = (status, isActive) => {
  if (isActive) {
    return {
      border: `1px solid ${museColors.primary}`,
      background: "rgba(37,99,235,0.1)",
      color: museColors.primary,
      boxShadow: "0 10px 18px rgba(37,99,235,0.18)",
    };
  }
  if (status === "terjawab") {
    return {
      border: `1px solid ${museColors.success}`,
      background: "rgba(34,197,94,0.12)",
      color: museColors.success,
      boxShadow: "none",
    };
  }
  if (status === "ragu") {
    return {
      border: `1px solid ${museColors.warning}`,
      background: "rgba(245,158,11,0.12)",
      color: "#92400e",
      boxShadow: "none",
    };
  }
  return {
    border: `1px solid ${museColors.muted}`,
    background: "rgba(148,163,184,0.12)",
    color: museColors.muted,
    boxShadow: "none",
  };
};

const QuestionListGrid = ({
  questionMap,
  currentIndex,
  onSelect,
  columns = 5,
}) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      gap: 8,
    }}
  >
    {questionMap.map((item, index) => {
      const isActive = index === currentIndex;
      const statusStyle = getQuestionButtonStyle(item.status, isActive);
      const groupShadow = "inset 0 -3px 0 #0ea5e9";
      return (
        <div
          key={item.id || item.number}
          style={{ position: "relative", width: "100%" }}
        >
          {isActive && (
            <span
              style={{
                position: "absolute",
                top: -2,
                right: 4,
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: museColors.primary,
                boxShadow: "0 0 0 3px rgba(37,99,235,0.15)",
              }}
            />
          )}
          <Button
            size="small"
            type={isActive ? "primary" : "default"}
            onClick={() => onSelect(index)}
            style={{
              width: "100%",
              borderRadius: 999,
              height: 32,
              paddingInline: 0,
              fontWeight: 600,
              outline: "none",
              ...statusStyle,
              boxShadow: item.groupId
                ? statusStyle.boxShadow && statusStyle.boxShadow !== "none"
                  ? `${statusStyle.boxShadow}, ${groupShadow}`
                  : groupShadow
                : statusStyle.boxShadow,
            }}
          >
            {item.number}
          </Button>
        </div>
      );
    })}
  </div>
);

export default QuestionListGrid;
