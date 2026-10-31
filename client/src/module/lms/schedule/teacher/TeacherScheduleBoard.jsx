import React from "react";
import { Card, Col, Empty, Flex, Grid, Row, Tag, Tooltip } from "antd";
import {
  BORDER_COLOR,
  HEADER_BG,
  SLOT_BG,
  getSubjectColor,
} from "../admin/scheduleTimetableUtils";

const { useBreakpoint } = Grid;

const TeacherScheduleBoard = ({ days, todayKey }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isNarrow = !screens.sm;

  if (!days?.length) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description='Belum ada jadwal mengajar pada shift ini.'
        style={{ padding: 24 }}
      />
    );
  }

  return (
    <div
      style={{
        padding: isMobile ? 12 : 16,
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        boxSizing: "border-box",
      }}
    >
      <Row gutter={[12, 12]} style={{ width: "100%", margin: 0 }}>
        {days.map((day) => {
          const isToday = Number(day.value) === Number(todayKey);
          return (
            <Col xs={24} md={12} xl={8} key={day.value} style={{ minWidth: 0 }}>
              <Card
                size='small'
                title={
                  <Flex align='center' gap={8} wrap='wrap'>
                    <span style={{ fontWeight: 700 }}>{day.label}</span>
                    {isToday ? <Tag color='orange'>Hari ini</Tag> : null}
                    <Tag style={{ marginInlineEnd: 0 }}>
                      {Number(day.session_count || 0)} sesi
                    </Tag>
                  </Flex>
                }
                styles={{
                  header: {
                    background: isToday ? "#ffedd5" : HEADER_BG,
                    borderBottom: `1px solid ${BORDER_COLOR}`,
                    padding: isNarrow ? "10px 12px" : undefined,
                  },
                  body: { padding: 0, overflow: "hidden" },
                }}
                style={{
                  borderRadius: 16,
                  border: `1px solid ${BORDER_COLOR}`,
                  height: "100%",
                  overflow: "hidden",
                  width: "100%",
                  maxWidth: "100%",
                }}
              >
                {day.rows?.length ? (
                  <div style={{ width: "100%", overflowX: "auto" }}>
                    {day.rows.map((row) => {
                      if (row.is_break) {
                        return (
                          <div
                            key={row.key}
                            style={{
                              display: "grid",
                              gridTemplateColumns: isNarrow
                                ? "40px 1fr"
                                : "52px 1fr",
                              borderBottom: `1px solid ${BORDER_COLOR}`,
                              background: "#fff2a8",
                              minHeight: 40,
                              minWidth: isNarrow ? 0 : 280,
                            }}
                          >
                            <div
                              style={{
                                display: "grid",
                                placeItems: "center",
                                background: SLOT_BG,
                                borderRight: `1px solid ${BORDER_COLOR}`,
                                fontWeight: 700,
                                color: "#8a4b08",
                                fontSize: isNarrow ? 11 : 13,
                              }}
                            >
                              -
                            </div>
                            <div
                              style={{
                                padding: isNarrow ? "8px 10px" : "8px 12px",
                                fontWeight: 800,
                                color: "#8a4b08",
                                textTransform: "uppercase",
                                letterSpacing: 0.5,
                                fontSize: isNarrow ? 11 : 12,
                                lineHeight: 1.35,
                                wordBreak: "break-word",
                              }}
                            >
                              {row.break_label}
                              {isNarrow ? (
                                <div
                                  style={{
                                    fontWeight: 700,
                                    textTransform: "none",
                                    letterSpacing: 0,
                                    marginTop: 2,
                                  }}
                                >
                                  {row.time_label}
                                </div>
                              ) : (
                                ` · ${row.time_label}`
                              )}
                            </div>
                          </div>
                        );
                      }

                      const entry = row.entry;
                      const activities = row.activities || [];
                      const color = getSubjectColor(
                        entry?.subject_code || entry?.subject_name,
                      );

                      if (isNarrow) {
                        return (
                          <div
                            key={row.key}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "40px 1fr",
                              borderBottom: `1px solid ${BORDER_COLOR}`,
                              background: isToday ? "#fff7ed" : "#fffdf8",
                              minHeight: 56,
                            }}
                          >
                            <div
                              style={{
                                display: "grid",
                                placeItems: "center",
                                background: SLOT_BG,
                                borderRight: `1px solid ${BORDER_COLOR}`,
                                fontWeight: 800,
                                fontSize: 12,
                                padding: 4,
                                textAlign: "center",
                              }}
                            >
                              {row.slot_no}
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "center",
                                gap: 6,
                                padding: "8px 10px",
                                minWidth: 0,
                              }}
                            >
                              <span
                                style={{
                                  fontWeight: 700,
                                  fontSize: 12,
                                  color: "#64748b",
                                }}
                              >
                                {row.time_label}
                              </span>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  flexWrap: "wrap",
                                }}
                              >
                                {activities.map((activity) => (
                                  <span
                                    key={activity.id}
                                    style={{
                                      display: "inline-block",
                                      padding: "2px 8px",
                                      borderRadius: 6,
                                      background: "#fff2a8",
                                      border: "1px solid #eab308",
                                      color: "#8a4b08",
                                      fontWeight: 800,
                                      fontSize: 10,
                                      textTransform: "uppercase",
                                    }}
                                  >
                                    {activity.name}
                                  </span>
                                ))}
                                {entry ? (
                                  <Tooltip
                                    title={`${entry.subject_name || "-"} | ${
                                      entry.class_name || "-"
                                    } | ${entry.time_label || row.time_label}`}
                                  >
                                    <span
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 8,
                                        minWidth: 0,
                                      }}
                                    >
                                      <span
                                        style={{
                                          display: "inline-flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          minWidth: 40,
                                          padding: "2px 8px",
                                          borderRadius: 999,
                                          border: `1px solid ${color.border}`,
                                          background: color.bg,
                                          color: color.text,
                                          fontWeight: 800,
                                          fontSize: 11,
                                        }}
                                      >
                                        {entry.subject_code ||
                                          entry.subject_name ||
                                          "-"}
                                      </span>
                                      <span
                                        style={{
                                          fontWeight: 700,
                                          fontSize: 13,
                                        }}
                                      >
                                        {entry.class_name || "-"}
                                      </span>
                                    </span>
                                  </Tooltip>
                                ) : !activities.length ? (
                                  <span
                                    style={{
                                      color: "#cbd5e1",
                                      fontWeight: 600,
                                    }}
                                  >
                                    —
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={row.key}
                          style={{
                            display: "grid",
                            gridTemplateColumns: isMobile
                              ? "48px 96px 1fr"
                              : "56px 108px 1fr",
                            borderBottom: `1px solid ${BORDER_COLOR}`,
                            background: isToday ? "#fff7ed" : "#fffdf8",
                            minHeight: 52,
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              display: "grid",
                              placeItems: "center",
                              background: SLOT_BG,
                              borderRight: `1px solid ${BORDER_COLOR}`,
                              fontWeight: 800,
                              fontSize: isMobile ? 12 : 14,
                              padding: 4,
                              textAlign: "center",
                            }}
                          >
                            {row.slot_no}
                          </div>
                          <div
                            style={{
                              display: "grid",
                              placeItems: "center",
                              background: SLOT_BG,
                              borderRight: `1px solid ${BORDER_COLOR}`,
                              fontWeight: 700,
                              fontSize: isMobile ? 11 : 12,
                              textAlign: "center",
                              padding: "4px 6px",
                              lineHeight: 1.25,
                            }}
                          >
                            {row.time_label}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              padding: isMobile ? "8px 10px" : "8px 12px",
                              flexWrap: "wrap",
                              minWidth: 0,
                            }}
                          >
                            {activities.map((activity) => (
                              <span
                                key={activity.id}
                                style={{
                                  display: "inline-block",
                                  padding: "2px 8px",
                                  borderRadius: 6,
                                  background: "#fff2a8",
                                  border: "1px solid #eab308",
                                  color: "#8a4b08",
                                  fontWeight: 800,
                                  fontSize: 10,
                                  textTransform: "uppercase",
                                }}
                              >
                                {activity.name}
                              </span>
                            ))}
                            {entry ? (
                              <Tooltip
                                title={`${entry.subject_name || "-"} | ${
                                  entry.class_name || "-"
                                } | ${entry.time_label || row.time_label}`}
                              >
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 8,
                                    minWidth: 0,
                                  }}
                                >
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      minWidth: 42,
                                      padding: "2px 8px",
                                      borderRadius: 999,
                                      border: `1px solid ${color.border}`,
                                      background: color.bg,
                                      color: color.text,
                                      fontWeight: 800,
                                      fontSize: 11,
                                    }}
                                  >
                                    {entry.subject_code ||
                                      entry.subject_name ||
                                      "-"}
                                  </span>
                                  <span style={{ fontWeight: 700 }}>
                                    {entry.class_name || "-"}
                                  </span>
                                </span>
                              </Tooltip>
                            ) : !activities.length ? (
                              <span
                                style={{ color: "#cbd5e1", fontWeight: 600 }}
                              >
                                —
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description='Tidak ada jam pada hari ini.'
                    style={{ padding: 24 }}
                  />
                )}
              </Card>
            </Col>
          );
        })}
      </Row>
    </div>
  );
};

export default TeacherScheduleBoard;
